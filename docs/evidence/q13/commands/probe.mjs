// Q13 probe body (arm A). Runs inside a temporary Cloud Run job on the product image, passed in an
// environment variable (never part of the image). One JSON line per step on stdout, with monotonic
// timings (performance.now). It never prints a credential: tokens, client secrets, claim proofs and
// passwords are reduced to labels or lengths.
import { readFileSync } from "node:fs";
import net from "node:net";
import tls from "node:tls";
import { generateKeyPairSync, createSign, randomBytes, randomUUID } from "node:crypto";

const mode = process.env.QRWTY_PROBE_MODE;
const t0 = performance.now();
const ms = (a) => Math.round((performance.now() - a) * 10) / 10;
const out = (step, data) => console.log(JSON.stringify({ probe: "q13", mode, step, atMs: ms(t0), ...data }));
const env = (n) => {
	const v = process.env[n];
	if (!v) throw new Error(`missing ${n}`);
	return v;
};
const redactBody = (text) =>
	text
		.replace(/"token"\s*:\s*"[^"]+"/g, '"token":"<claim proof>"')
		.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g, "<jwt>")
		.replace(/"sub"\s*:\s*"[^"]+"/g, '"sub":"<qrwtya-web client>@clients"');
async function http(step, url, init = {}, timeoutMs = 8000) {
	const s = performance.now();
	try {
		const r = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
		const text = await r.text();
		const headers = {};
		for (const h of ["content-type", "retry-after", "location", "allow", "www-authenticate"])
			if (r.headers.get(h)) headers[h] = r.headers.get(h);
		out(step, { request: { method: init.method ?? "GET", url: url.replace(/\d{12}/, "<project-number>") }, status: r.status, ms: ms(s), headers, body: redactBody(text.slice(0, 600)) });
		return { status: r.status, text };
	} catch (e) {
		out(step, { request: { method: init.method ?? "GET", url: url.replace(/\d{12}/, "<project-number>") }, error: `${e.name}: ${e.cause?.code ?? e.message}`.slice(0, 200), ms: ms(s) });
		return { status: null, text: "" };
	}
}

function rawPing(host, port) {
	return new Promise((resolve) => {
		const s = performance.now();
		const socket = net.connect({ host, port });
		let got = "";
		const done = (how) => {
			socket.destroy();
			resolve({ how, firstBytes: JSON.stringify(got.slice(0, 24)), ms: ms(s) });
		};
		socket.setTimeout(3000, () => done("timeout"));
		socket.on("connect", () => socket.write("PING\r\n"));
		socket.on("data", (d) => {
			got += d.toString("latin1");
			if (got.includes("PONG")) done("answered");
		});
		socket.on("close", () => done("closed"));
		socket.on("error", (e) => done(`error ${e.code}`));
	});
}
function tlsPing(host, port, ca) {
	return new Promise((resolve) => {
		const s = performance.now();
		const socket = tls.connect({ host, port, ca, ...(net.isIP(host) ? {} : { servername: host }) });
		let got = "";
		const finish = (r) => {
			socket.destroy();
			resolve({ ...r, ms: ms(s) });
		};
		socket.setTimeout(4000, () => finish({ how: "timeout" }));
		socket.on("secureConnect", () => {
			const cert = socket.getPeerCertificate();
			socket.write("*1\r\n$4\r\nPING\r\n");
			socket.once("data", (d) => {
				got = d.toString();
				finish({ how: "tls", authorized: socket.authorized, protocol: socket.getProtocol(), subject: cert.subject?.CN ?? null,
					subjectaltname: cert.subjectaltname ?? null, issuer: cert.issuer?.CN ?? cert.issuer?.O ?? null, reply: got.trim() });
			});
		});
		socket.on("error", (e) => finish({ how: "error", error: e.code ?? e.message }));
	});
}

const tcp = (host) => new Promise((resolve) => {
		const s = performance.now();
		const socket = net.connect({ host, port: 443, family: 4, autoSelectFamily: false });
		socket.setTimeout(3000, () => { socket.destroy(); resolve({ connected: false, how: "timeout 3 s", ms: ms(s) }); });
		socket.on("connect", () => { const a = socket.remoteAddress; socket.destroy(); resolve({ connected: true, remote: a, ms: ms(s) }); });
		socket.on("error", (e) => resolve({ connected: false, how: e.code, ms: ms(s) }));
	});
// Each host is tried every second until a connection opens or 90 s pass (the task's own uptime
// is atMs): how long after the task starts Internet egress through Cloud NAT works.
async function untilConnects(host) {
	const started = performance.now();
	let tries = 0, r;
	do {
		tries++;
		r = await tcp(host);
		if (!r.connected) await new Promise((x) => setTimeout(x, 1000));
	} while (!r.connected && performance.now() - started < 90_000);
	return { ...r, tries, sinceFirstTryMs: ms(started) };
}

const b64url = (b) => Buffer.from(b).toString("base64url");
function selfSignedJwt(claims) {
	const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
	const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT", kid: "q13-foreign" }));
	const payload = b64url(JSON.stringify(claims));
	const sig = createSign("RSA-SHA256").update(`${header}.${payload}`).sign(privateKey);
	return `${header}.${payload}.${b64url(sig)}`;
}

if (mode === "net") {
	for (const [name, t] of Object.entries(JSON.parse(env("TILE_URLS")))) {
		await http(`tile ${name} /healthz (a path Cloud Run's front end reserves)`, `${t.url}/healthz`);
		await http(`tile ${name} sign-in me, no token`, `${t.url}${t.me}`);
	}
	for (const [name, url] of Object.entries(JSON.parse(process.env.PUBLIC_URLS ?? "{}")))
		await http(`public ${name} from the VPC, no token`, `${url}/`);
	for (const c of JSON.parse(env("CACHES"))) {
		const ca = readFileSync(c.caFile, "utf8");
		out(`cache ${c.name} managed CA`, { certificates: (ca.match(/BEGIN CERTIFICATE/g) ?? []).length });
		out(`cache ${c.name} plain text PING`, await rawPing(c.host, c.port));
		out(`cache ${c.name} TLS with the managed CA`, await tlsPing(c.host, c.port, ca));
		out(`cache ${c.name} TLS with system roots only`, await tlsPing(c.host, c.port, undefined));
		if (c.otherCaFile) out(`cache ${c.name} TLS with the other instance's CA`, await tlsPing(c.host, c.port, readFileSync(c.otherCaFile, "utf8")));
	}
	const pg = (await import("pg")).default;
	for (const [label, ssl] of [["plain text", false], ["TLS without a client certificate", { rejectUnauthorized: false }]]) {
		const s = performance.now();
		const client = new pg.Client({ host: env("SQL_PRIVATE_IP"), port: 5432, user: "q13probe", database: "postgres", ssl, connectionTimeoutMillis: 5000 });
		try {
			await client.connect();
			out(`cloud sql private IP, ${label}`, { connected: true, ms: ms(s) });
			await client.end();
		} catch (e) {
			out(`cloud sql private IP, ${label}`, { connected: false, error: `${e.code ?? ""} ${e.message}`.slice(0, 200), ms: ms(s) });
		}
	}
} else if (mode === "egress") {
	// Raw TCP to Internet hosts with a 5 s timeout and IPv4 only (no happy-eyeballs 250 ms attempts).
	for (const host of JSON.parse(env("HOSTS"))) {
		const label = host.replace(/^[a-z0-9-]+\.(us\.)?auth0\.com$/, "<tenant>.auth0.com");
		out(`TCP 443 ${label} until it connects`, await untilConnects(host));
	}
	await http("GET https://api.stripe.com/ (no credential)", "https://api.stripe.com/", {}, 8000);
} else if (mode === "oidc") {
	const creds = JSON.parse(readFileSync(env("CREDS_FILE"), "utf8"));
	const me = `${env("LINK_URL")}/modules/link-api-sign-in/me`;
	// A new task's first Internet connections through Cloud NAT are dropped for some seconds.
	out("TCP 443 <tenant>.auth0.com until it connects (NAT warm-up)", await untilConnects(new URL(env("IDENTITY_URL")).hostname));
	const discovery = await http("identity URL discovery", `${env("IDENTITY_URL")}/.well-known/openid-configuration`);
	if (discovery.status === 200) {
		const d = JSON.parse(discovery.text);
		out("issuer comparison", { issuerMatchesOidcIssuer: d.issuer === env("ISSUER"), issuerEndsWithSlash: d.issuer.endsWith("/"), jwksMatches: d.jwks_uri === `${env("ISSUER")}.well-known/jwks.json` });
	}
	const s = performance.now();
	const tr = await fetch(creds.token_url, { method: "POST", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(8000),
		body: JSON.stringify({ grant_type: "client_credentials", client_id: creds.client_id, client_secret: creds.client_secret, audience: creds.audience }) });
	const tb = await tr.json();
	const token = tb.access_token;
	const claims = token ? JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()) : {};
	out("Auth0 client-credentials token", { status: tr.status, ms: ms(s), tokenType: tb.token_type, expiresIn: tb.expires_in, claims: { issMatches: claims.iss === env("ISSUER"), aud: claims.aud, gty: claims.gty, lifetimeS: claims.exp - claims.iat } });
	await http("me, no token (Optional sign-in)", me);
	await http("me, A's Auth0 token", me, { headers: { authorization: `Bearer ${token}` } });
	const [h, p, sig] = token.split(".");
	const changed = b64url(JSON.stringify({ ...claims, aud: "https://api.qrwtyb.example" }));
	await http("me, A's token with its audience changed (signature no longer matches)", me, { headers: { authorization: `Bearer ${h}.${changed}.${sig}` } });
	const now = Math.floor(Date.now() / 1000);
	await http("me, a foreign issuer's self-signed token", me, { headers: { authorization: `Bearer ${selfSignedJwt({ iss: "https://foreign-issuer.example/", aud: env("AUDIENCE"), sub: "q13", iat: now, exp: now + 300 })}` } });
	await http("me, A's issuer and audience signed by a key not in the key set", me, { headers: { authorization: `Bearer ${selfSignedJwt({ iss: env("ISSUER"), aud: env("AUDIENCE"), sub: "q13", iat: now, exp: now + 300 })}` } });
	await http("me, a malformed bearer", me, { headers: { authorization: "Bearer not-a-jwt" } });
	const wait = Math.max(0, claims.exp * 1000 - Date.now()) + 5000;
	out("waiting for A's token to expire", { waitMs: wait });
	await new Promise((r) => setTimeout(r, wait));
	await http("me, A's token after it expired", me, { headers: { authorization: `Bearer ${token}` } });
} else if (mode === "create") {
	const url = `${env("LINK_URL")}/modules/link-api-link-operations/links`;
	const scope = b64url(randomBytes(24));
	const key = `q13-${randomUUID()}`;
	const body = JSON.stringify({ destination: env("DESTINATION") });
	const headers = { "content-type": "application/json", "idempotency-key": key, "qrwty-guest-scope": scope };
	const first = await http("guest create", url, { method: "POST", headers, body });
	await http("guest create replayed with the same key", url, { method: "POST", headers, body });
	await http("same key, another destination", url, { method: "POST", headers, body: JSON.stringify({ destination: `${env("DESTINATION")}-other` }) });
	await http("no Idempotency-Key", url, { method: "POST", headers: { "content-type": "application/json", "qrwty-guest-scope": scope }, body });
	await http("a destination with credentials", url, { method: "POST", headers: { ...headers, "idempotency-key": `${key}-cred` }, body: JSON.stringify({ destination: "https://user:pw@example.com/" }) });
	await http("GET on the create route", url);
	if (first.status === 201) out("created slug", { slug: JSON.parse(first.text).slug ?? null });
} else if (mode === "threat") {
	// Web Risk's own test URLs: Link API must refuse them (422) after a real lookup.
	const url = `${env("LINK_URL")}/modules/link-api-link-operations/links`;
	for (const destination of JSON.parse(env("DESTINATIONS"))) {
		const headers = { "content-type": "application/json", "idempotency-key": `q13-${randomUUID()}`, "qrwty-guest-scope": b64url(randomBytes(24)) };
		await http(`guest create, ${destination}`, url, { method: "POST", headers, body: JSON.stringify({ destination }) });
	}
} else if (mode === "publish") {
	const { PubSub } = await import("@google-cloud/pubsub");
	const topic = new PubSub({ projectId: env("PROJECT") }).topic(env("TOPIC"));
	const n = Number(process.env.COUNT ?? "20");
	const results = [];
	for (let i = 0; i < n; i++) {
		const s = performance.now();
		try {
			const id = await topic.publishMessage({ data: Buffer.from(JSON.stringify({ q13: true, seq: i })), attributes: { "qrwty-probe": "q13", seq: String(i) } });
			results.push({ seq: i, messageId: id, ackMs: ms(s) });
		} catch (e) {
			results.push({ seq: i, error: `${e.code ?? ""} ${e.message}`.slice(0, 160), ms: ms(s) });
			if (process.env.EXPECT === "denied") break;
		}
	}
	const acks = results.filter((r) => r.messageId).map((r) => r.ackMs).sort((a, b) => a - b);
	const q = (p) => (acks.length ? acks[Math.min(acks.length - 1, Math.floor(p * acks.length))] : null);
	out("publish", { count: n, acknowledged: acks.length, p50Ms: q(0.5), p99Ms: q(0.99), maxMs: acks.at(-1) ?? null, results });
	await topic.flush?.().catch(() => {});
	process.exit(0);
} else if (mode === "sql") {
	const pg = (await import("pg")).default;
	const secret = (n) => readFileSync(`/var/run/qrwty-secrets/${n}/value`, "utf8").trim();
	const host = env("PGHOST");
	const admin = new pg.Client({ host, port: 5432, user: "postgres", database: "postgres", password: secret("postgres-admin") });
	await admin.connect();
	const q = async (c, step, sql) => {
		const s = performance.now();
		try {
			const r = await c.query(sql);
			out(step, { sql, rows: r.rows, ms: ms(s) });
			return r.rows;
		} catch (e) {
			out(step, { sql, error: `${e.code ?? ""} ${e.message}`.slice(0, 200), ms: ms(s) });
			return [];
		}
	};
	await q(admin, "server", "SELECT version() AS version, current_user, (SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()) AS backend_ssl, inet_server_addr() IS NULL AS unix_socket");
	await q(admin, "admin role", "SELECT rolname, rolsuper, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname = 'postgres'");
	await q(admin, "databases", "SELECT datname, pg_get_userbyid(datdba) AS owner, datacl::text AS acl, has_database_privilege('postgres', datname, 'CONNECT') AS admin_connect, has_database_privilege('public', datname, 'CONNECT') AS public_connect FROM pg_database WHERE NOT datistemplate ORDER BY datname");
	await q(admin, "application roles", "SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolinherit FROM pg_roles WHERE rolname ~ '^(o|r|i[ok]?)_' ORDER BY rolname");
	await admin.end();
	const link = new pg.Client({ host, port: 5432, user: "r_links__link_api", database: "d_links", password: secret("sql-links--link-api") });
	await link.connect();
	await q(link, "link-api login: CREATE on any schema", "SELECT n.nspname, has_schema_privilege(current_user, n.nspname, 'CREATE') AS can_create FROM pg_namespace n WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema' ORDER BY 1");
	await q(link, "link-api login: product migrations", "SELECT version, name FROM m_link_api_link_operations.product_migrations ORDER BY version");
	await q(link, "links in Cloud SQL", "SELECT slug, destination, state, version, owner_subject IS NULL AS guest, created_at, (SELECT count(*)::int FROM m_link_api_link_operations.link_claims c WHERE c.link_id = l.id) AS claims FROM m_link_api_link_operations.links l ORDER BY created_at");
	await q(link, "idempotency records", "SELECT count(*)::int AS records FROM m_link_api_link_operations.idempotency_records");
	await q(link, "link-api login: DELETE a link (trigger refuses)", "DELETE FROM m_link_api_link_operations.links WHERE false OR slug = (SELECT slug FROM m_link_api_link_operations.links LIMIT 1)");
	await link.end();
} else {
	out("unknown mode", {});
	process.exit(2);
}
out("done", {});

// The real route on the running local stack (Q04's test profile): two Link API copies, each in
// its own container, verify-full TLS to PostgreSQL 17, the pack's own Web Risk fixture. Supports
// the oracle's A02, A03, A09 and F07 at Link API's internal route; it never replaces them
// (Session API's /api/v1 and the Redirect service come in Q07 and Q08).
//
//   QRWTY_STACK_PROJECT=qrwtya-q06 QRWTY_STACK_LINK_API_URLS=http://127.0.0.1:47225,http://127.0.0.1:47226
//   QRWTY_PACK_ORACLE_DIR=<pack copy>/oracle QRWTY_WEB_RISK_LISTEN=172.17.0.1:47212
//   QRWTY_ORACLE_COMMANDS=<repo>/infra/local/oracle-commands.mjs pnpm test:stack
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const project = process.env.QRWTY_STACK_PROJECT ?? "";
const urls = (process.env.QRWTY_STACK_LINK_API_URLS ?? "").split(",").filter(Boolean);
const oracleDir = process.env.QRWTY_PACK_ORACLE_DIR ?? "";
const listen = process.env.QRWTY_WEB_RISK_LISTEN ?? "172.17.0.1:47212";
const commands = process.env.QRWTY_ORACLE_COMMANDS ?? "";
if (!/^qrwtya[a-z0-9-]*$/.test(project) || urls.length < 2 || !oracleDir || !commands)
	throw new Error(
		"Set QRWTY_STACK_PROJECT, QRWTY_STACK_LINK_API_URLS (two copies), QRWTY_PACK_ORACLE_DIR, QRWTY_ORACLE_COMMANDS",
	);

type WebRisk = {
	calls: { uri: string | null; threatTypes: string[]; verdict: string }[];
	close(): Promise<void>;
};
let webRisk: WebRisk;
const MODULE = "/modules/link-api-link-operations";
const sql = (query: string) =>
	execFileSync(
		"docker",
		[
			"exec",
			`${project}-local-postgres-1`,
			"psql",
			"-U",
			"postgres",
			"-d",
			"d_links",
			"-At",
			"-F",
			"\t",
			"-c",
			query,
		],
		{ encoding: "utf8" },
	).trim();
const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;
const guest = () => createHash("sha256").update(randomUUID()).digest("base64url");

type Res = {
	status: number;
	headers: Headers;
	body: Record<string, unknown> & { error?: { code: string } };
};
async function post(base: string, body: unknown, headers: Record<string, string>): Promise<Res> {
	const response = await fetch(`${base}${MODULE}/links`, {
		method: "POST",
		headers: { "content-type": "application/json", ...headers },
		body: JSON.stringify(body),
		signal: AbortSignal.timeout(10_000),
	});
	return { status: response.status, headers: response.headers, body: await response.json() };
}
const create = (
	base: string,
	destination: string,
	scope: string = guest(),
	key: string = randomUUID(),
) => post(base, { destination }, { "idempotency-key": key, "qrwty-guest-scope": scope });
const slugOf = (r: Res) => String(r.body.shortUrl).slice(-10);

async function healthy(base: string, timeoutMs = 90_000) {
	const start = performance.now();
	while (performance.now() - start < timeoutMs) {
		try {
			const r = await fetch(`${base}/healthz`, { signal: AbortSignal.timeout(2000) });
			if (r.status === 200) return;
		} catch {
			/* restarting */
		}
		await new Promise((r) => setTimeout(r, 500));
	}
	throw new Error(`${base} not healthy`);
}

beforeAll(async () => {
	const fixtures = (await import(
		pathToFileURL(resolve(oracleDir, "src/fixtures/webrisk.ts")).href
	)) as { startWebRisk(listen: string): Promise<WebRisk> };
	webRisk = await fixtures.startWebRisk(listen);
	for (const base of urls) await healthy(base);
});
afterAll(async () => {
	await webRisk?.close();
});

describe("the real route, two copies, TLS PostgreSQL", () => {
	it("creates a guest link durably, over verify-full TLS", async () => {
		const r = await create(urls[0] ?? "", `https://example.com/oracle/q06/${randomUUID()}`);
		expect(r.status).toBe(201);
		expect(r.headers.get("etag")).toBe('"1"');
		expect(r.headers.get("cache-control")).toBe("no-store");
		expect(r.body).toMatchObject({ version: 1, state: "active", owned: false });
		const ssl = sql(
			"SELECT bool_and(s.ssl), count(*) FROM pg_stat_ssl s JOIN pg_stat_activity a USING (pid) WHERE a.usename = 'r_links__link_api'",
		);
		expect(ssl).toMatch(/^t\t[1-9]/);
		const row = sql(
			`SELECT slug, state, version FROM m_link_api_link_operations.links WHERE id = ${literal(String(r.body.id))}`,
		);
		expect(row).toBe(`${slugOf(r)}\tactive\t1`);
		const call = webRisk.calls.at(-1);
		expect(call?.uri).toBe(r.body.destination);
		expect(call?.threatTypes).toEqual(["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"]);
	});
});

describe("A02 at Link API: one key, two copies, restarts", () => {
	it("one link and one body, before and after restarting every copy; 409 for a changed body", async () => {
		const scope = guest();
		const key = `a02-${randomUUID()}`;
		const destination = `https://example.com/oracle/a02/${randomUUID()}`;
		const [r1, r2] = await Promise.all(
			urls.slice(0, 2).map((u) => create(u, destination, scope, key)),
		);
		expect([r1?.status, r2?.status]).toEqual([201, 201]);
		expect(r2?.body).toEqual(r1?.body);
		expect((r1?.body.claim as { token?: string } | undefined)?.token).toMatch(
			/^[A-Za-z0-9_-]{43}$/,
		);
		expect(
			sql(
				`SELECT count(*) FROM m_link_api_link_operations.links WHERE destination = ${literal(destination)}`,
			),
		).toBe("1");
		const containers = execFileSync(
			"docker",
			[
				"ps",
				"--filter",
				`label=com.docker.compose.project=${project}`,
				"--filter",
				"label=com.docker.compose.service=app-link-api",
				"--format",
				"{{.Names}}",
			],
			{ encoding: "utf8" },
		)
			.trim()
			.split("\n");
		expect(containers).toHaveLength(2);
		for (const name of containers) execFileSync("docker", ["restart", "-t", "10", name]);
		for (const base of urls) await healthy(base);
		for (const base of urls) {
			const again = await create(base, destination, scope, key);
			expect(again.status).toBe(201);
			expect(again.body).toEqual(r1?.body);
		}
		const changed = await create(urls[1] ?? "", `${destination}/changed`, scope, key);
		expect(changed.status).toBe(409);
		expect(changed.body.error?.code).toBe("idempotency_conflict");
		const missing = await post(urls[0] ?? "", { destination }, { "qrwty-guest-scope": scope });
		expect(missing.status).toBe(400);
		expect(missing.body.error?.code).toBe("idempotency_key_required");
	});
});

describe("A03 at Link API: 200 creates, forced collision", () => {
	it("200 concurrent creates over both copies give distinct slugs routed to their own destinations", async () => {
		const run = randomUUID().slice(0, 8);
		const results = await Promise.all(
			Array.from({ length: 200 }, (_, i) =>
				create(urls[i % urls.length] ?? "", `https://example.com/oracle/a03/${run}-${i}`),
			),
		);
		expect([...new Set(results.map((r) => r.status))]).toEqual([201]);
		const slugs = results.map(slugOf);
		expect(slugs.every((s) => /^[0-9A-Za-z]{10}$/.test(s))).toBe(true);
		expect(new Set(slugs).size).toBe(200);
		// What the Redirect service will read (Q08): the published routing view.
		const routes = new Map(
			sql(
				`SELECT slug, destination FROM published.link_routes WHERE destination LIKE '%/a03/${run}-%'`,
			)
				.split("\n")
				.map((line) => line.split("\t") as [string, string]),
		);
		expect(routes.size).toBe(200);
		results.forEach((r, i) => {
			expect(routes.get(slugOf(r))).toBe(`https://example.com/oracle/a03/${run}-${i}`);
		});
	});
	it("under force-slug-collision a create succeeds with another slug; the existing one never changes", async () => {
		const existing = await create(
			urls[0] ?? "",
			`https://example.com/oracle/a03/existing-${randomUUID()}`,
		);
		const taken = slugOf(existing);
		const run = (state: string) =>
			JSON.parse(
				execFileSync("node", [commands, "faultPoint", "force-slug-collision", state, taken], {
					encoding: "utf8",
					env: { ...process.env, COMPOSE_PROJECT_NAME: project },
				}).trim(),
			);
		expect(run("on")).toMatchObject({ ok: true, replicas: 2 });
		try {
			for (const base of urls) {
				const collide = await create(
					base,
					`https://example.com/oracle/a03/collision-${randomUUID()}`,
				);
				expect(collide.status).toBe(201);
				expect(slugOf(collide)).not.toBe(taken);
			}
		} finally {
			expect(run("off")).toMatchObject({ ok: true });
		}
		expect(
			sql(`SELECT destination, version FROM published.link_routes WHERE slug = ${literal(taken)}`),
		).toBe(`${existing.body.destination}\t1`);
	});
});

describe("A09 at Link API: destinations, reputation, spoofed headers", () => {
	const LEN = "https://example.com/oracle/a09/len?p=";
	const accepted: [string, string][] = [
		["https://example.com/oracle/a09/plain", "https://example.com/oracle/a09/plain"],
		[
			"https://example.com/oracle/a09/q?b=2&a=1&A=3",
			"https://example.com/oracle/a09/q?b=2&a=1&A=3",
		],
		[
			"https://example.com/oracle/a09/esc?x=%2F%20%E2%9C%93&y=a+b",
			"https://example.com/oracle/a09/esc?x=%2F%20%E2%9C%93&y=a+b",
		],
		["https://example.com/oracle/a09/Case/Path", "https://example.com/oracle/a09/Case/Path"],
		[
			"https://example.com/oracle/a09/frag#section-2",
			"https://example.com/oracle/a09/frag#section-2",
		],
		["HTTPS://EXAMPLE.COM/oracle/a09/host-case", "https://example.com/oracle/a09/host-case"],
		[
			"https://example.com:443/oracle/a09/default-port",
			"https://example.com/oracle/a09/default-port",
		],
		[
			"https://münchen.example.com/oracle/a09/idn",
			"https://xn--mnchen-3ya.example.com/oracle/a09/idn",
		],
		["http://example.com/oracle/a09/http", "http://example.com/oracle/a09/http"],
		[LEN + "x".repeat(8192 - LEN.length), LEN + "x".repeat(8192 - LEN.length)],
	];
	it("stores every accepted corpus entry byte for byte as the route's destination", async () => {
		for (const [input, expected] of accepted) {
			const r = await create(urls[0] ?? "", input);
			expect(r.status, input.slice(0, 60)).toBe(201);
			expect(r.body.destination).toBe(expected);
			const stored = sql(
				`SELECT destination FROM published.link_routes WHERE slug = ${literal(slugOf(r))}`,
			);
			expect(stored).toBe(expected);
		}
	});
	it("refuses every rejected corpus entry with 400 invalid_destination", async () => {
		const origin = String(
			(await create(urls[1] ?? "", "https://example.com/oracle/a09/origin")).body.shortUrl,
		).slice(0, -11);
		const rejected = [
			"javascript:alert(1)",
			"data:text/html,hi",
			"ftp://example.com/x",
			"mailto:a@example.com",
			["https://user", "pass@example.com/x"].join(":"),
			"https://user@example.com/x",
			"https://example.com/oracle/a09/cr\r\nx",
			"https://example.com/oracle/a09/tab\tx",
			"https://example.com/oracle/a09/nul\u0000x",
			"https://exa mple.com/",
			"https://example.com:0/",
			"https://example.com:65536/",
			"https:///nohost",
			"/relative",
			"example.com/no-scheme",
			"http://127.0.0.1/",
			"http://10.1.2.3/",
			"http://172.16.0.1/",
			"http://192.168.1.1/",
			"http://169.254.169.254/latest",
			"http://0.0.0.0/",
			"http://2130706433/",
			"http://0x7f000001/",
			"http://[::1]/",
			"http://[fc00::1]/",
			"http://[fe80::1]/",
			"http://localhost/",
			"http://foo.localhost/",
			"http://printer.local/",
			"http://db.internal/",
			"http://intranet/",
			`${origin}/AbCdEfGhIj`,
			LEN + "x".repeat(8193 - LEN.length),
		];
		const wrong = [];
		for (const input of rejected) {
			const r = await create(urls[1] ?? "", input);
			if (r.status !== 400 || r.body.error?.code !== "invalid_destination")
				wrong.push({ input, status: r.status });
		}
		expect(wrong).toEqual([]);
	});
	it("maps the fixture's verdicts: unsafe 422, slow and error 503 with Retry-After", async () => {
		const unsafe = await create(urls[0] ?? "", "https://example.com/oracle/unsafe/page");
		expect([unsafe.status, unsafe.body.error?.code]).toEqual([422, "reputation_rejected"]);
		const started = performance.now();
		const slow = await create(urls[0] ?? "", "https://example.com/oracle/slow/page");
		const slowMs = performance.now() - started;
		expect([slow.status, slow.body.error?.code]).toEqual([503, "reputation_unavailable"]);
		expect(slow.headers.get("retry-after")).toBe("5");
		expect(slowMs).toBeLessThan(1000);
		const error = await create(urls[1] ?? "", "https://example.com/oracle/error/page");
		expect([error.status, error.body.error?.code]).toEqual([503, "reputation_unavailable"]);
		for (const r of [unsafe, slow, error])
			expect(
				sql(
					`SELECT count(*) FROM m_link_api_link_operations.links WHERE destination LIKE '%/oracle/${r === unsafe ? "unsafe" : r === slow ? "slow" : "error"}/%'`,
				),
			).toBe("0");
	});
	it("ignores spoofed x-user-id and X-Forwarded-For, and refuses a bad bearer instead of a guest create", async () => {
		const spoofed = await post(
			urls[0] ?? "",
			{ destination: `https://example.com/oracle/a09/spoof-${randomUUID()}` },
			{
				"idempotency-key": randomUUID(),
				"qrwty-guest-scope": guest(),
				"x-user-id": "oracle-bob",
				"x-forwarded-for": "10.1.2.3",
			},
		);
		expect(spoofed.status).toBe(201);
		expect(spoofed.body.owned).toBe(false);
		expect(
			sql(
				`SELECT owner_subject IS NULL FROM m_link_api_link_operations.links WHERE id = ${literal(String(spoofed.body.id))}`,
			),
		).toBe("t");
		const forged = await post(
			urls[1] ?? "",
			{ destination: "https://example.com/oracle/a09/forged" },
			{
				"idempotency-key": randomUUID(),
				"qrwty-guest-scope": guest(),
				authorization: "Bearer not.a.token",
			},
		);
		expect(forged.status).toBe(401);
	});
	it("answers 405 with Allow for another method on /links", async () => {
		const r = await fetch(`${urls[0]}${MODULE}/links`, { method: "PUT" });
		expect(r.status).toBe(405);
		expect(r.headers.get("allow")).toBe("POST");
	});
});

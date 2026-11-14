// Self-test double: a deliberately small, in-memory, table-driven fake of the external contract.
// It exists only so the self-test can prove that each oracle check passes on correct behaviour
// and FAILS on a known fault (`mode`). It is NOT a reference implementation: validation answers
// from the A09 corpus table, state lives in one process, nothing is durable. Arms must not copy it.
import {
	createHash,
	verify as cryptoVerify,
	generateKeyPairSync,
	type KeyObject,
	randomBytes,
	randomUUID,
} from "node:crypto";
import {
	createServer,
	request as httpRequest,
	type IncomingMessage,
	type Server,
	type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";
import { connect } from "node:net";
import { PubSub, type Topic } from "@google-cloud/pubsub";
import QRCode from "qrcode";
import Stripe from "stripe";
import { isBotV1 } from "../src/fixtures/clicks.ts";
import { ACCEPTED, rejected } from "../src/fixtures/destinations.ts";

export type Mode =
	| "good"
	| "a01-qr-wrong-url"
	| "a02-new-body-on-replay"
	| "a02-no-conflict"
	| "a03-overwrites-on-collision"
	| "a04-expiry-not-enforced"
	| "a05-two-winners"
	| "a05-leaks-owner"
	| "a06-foreign-200"
	| "a06-bad-cookie-guest"
	| "a06-unknown-cookie-guest"
	| "a07-no-412"
	| "a07-stale-replica"
	| "a08-serves-after-expiry"
	| "a09-altered-location"
	| "a09-status-301"
	| "a09-missing-no-store"
	| "a09-head-emits-event"
	| "a09-accepts-private-host"
	| "a09-forwards-query"
	| "a10-counts-duplicates"
	| "a10-counts-synthetic"
	| "a14-accepts-alg-none"
	| "a16-report-blocks"
	| "a16-non-operator-200"
	| "a17-no-limit"
	| "a17-per-address-not-per-64"
	| "a18-route-501"
	| "a20-accepts-bad-signature"
	| "a20-duplicate-second-effect"
	| "a24-302-before-event"
	| "a24-fail-open"
	| "f01-inprocess-stampede"
	| "f06-small-bound-unbounded-queue";

export interface DoubleOptions {
	mode: Mode;
	edgeToken: string;
	password: string;
	webhookSecret: string;
	/** Pub/Sub: publisher endpoint (through Toxiproxy) and direct endpoint (analytics consumer). */
	pubsub: {
		publishEndpoint: string;
		directEndpoint: string;
		project: string;
		topic: string;
	} | null;
	/** host:port of the billing "database" (a line-echo server, through Toxiproxy). */
	billingDb: string | null;
	webRiskUrl: string | null;
	admissionWindowMs: number;
	/**
	 * F01 cases only: host:port of the shared route cache's stand-in (a line server behind
	 * Toxiproxy). When set, redirect replicas use a per-process route cache in front of it.
	 */
	routeCache?: string | null;
	/** F06 cases only: redirect replicas use the publisher queue and admission model. */
	publisher?: boolean;
}

/** A cached route: a copy of the link and the absolute end of its validity (decisions section 3). */
interface RouteEntry {
	link: Link;
	validatedUntil: number;
}

/** The double's publish deadline: a publish not acknowledged by then is answered with 503. */
const PUBLISH_DEADLINE_MS = 2_500;
/** Memory each queued publish holds in the publisher model (stand-in for its request state). */
const QUEUE_ENTRY_BYTES = 128 * 1024;
/** Shared-cache round-trip deadline before a redirect falls back to the database. */
const ROUTE_CACHE_TIMEOUT_MS = 300;

interface Link {
	id: string;
	slug: string;
	destination: string;
	owner: string | null;
	state: "active" | "disabled" | "blocked" | "deleted";
	version: number;
	createdAt: string;
	updatedAt: string;
	expiresAt: string | null;
	claimHash: string | null;
	claimExpiresAt: number | null;
	claimed: boolean;
}

interface Session {
	id: string;
	csrf: string;
	account: string | null;
	lastSeen: number;
}

const DAY = 86_400_000;
const B62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const sha = (v: string) => createHash("sha256").update(v).digest("hex");

export class Double {
	readonly o: DoubleOptions;
	origin = "";
	readonly listeners = new Map<string, { server: Server; port: number; role: string }>();
	issuerUrl = "";
	private issuerServer: Server | null = null;
	private links = new Map<string, Link>();
	private bySlug = new Map<string, string>();
	private sessions = new Map<string, Session>();
	/** Session IDs ended by logout; only a06-unknown-cookie-guest tells them from unknown IDs. */
	private revoked = new Set<string>();
	private idem = new Map<string, { hash: string; status: number; body: unknown }>();
	private codes = new Map<string, { account: string; state: string }>();
	private admission = new Map<string, { start: number; count: number }>();
	private operatorActions: {
		actor: string;
		action: string;
		linkId: string;
		reason: string;
		at: string;
	}[] = [];
	private reports = new Map<string, number>();
	private inbox: { eventId: string }[] = [];
	private analytics = new Map<
		string,
		{
			seen: Set<string>;
			recorded: number;
			filtered: number;
			days: Map<string, { r: number; f: number }>;
		}
	>();
	private replicaCache = new Map<string, Link>();
	private forcedSlug: string | null = null;
	/** Route-cache model (F01): per-process caches by listener, the shared cache's contents. */
	private routeCaches = new Map<string, Map<string, RouteEntry>>();
	private sharedRoutes = new Map<string, string>();
	private routeReads = new Map<string, Promise<Link | undefined>>();
	private dbQueries = 0;
	/** Publisher model (F06): admitted requests and queued publishes per redirect listener. */
	private publishers = new Map<string, { admitted: number; queued: Set<Buffer> }>();
	offsetMs = 0;
	private topic: Topic | null = null;
	private pubsub: PubSub | null = null;
	private consumer: PubSub | null = null;
	private subscription: import("@google-cloud/pubsub").Subscription | null = null;
	private signingKey = generateKeyPairSync("rsa", { modulusLength: 2048 });
	private stripe = new Stripe("sk_" + "test_oracleDoubleNotARealKey00000000");

	constructor(options: DoubleOptions) {
		this.o = options;
	}

	now(): number {
		return Date.now() + this.offsetMs;
	}

	// ---------- lifecycle ----------

	async start(roles: { name: string; role: string }[]): Promise<void> {
		for (const { name, role } of roles) await this.listen(name, role, 0);
		this.origin = `http://localhost:${this.listeners.get("entry")?.port}`;
		this.issuerServer = createServer((req, res) => void this.issuer(req, res));
		await new Promise<void>((r) => this.issuerServer?.listen(0, "127.0.0.1", () => r()));
		this.issuerUrl = `http://127.0.0.1:${(this.issuerServer.address() as AddressInfo).port}`;
		if (this.o.pubsub) {
			const p = this.o.pubsub;
			const admin = new PubSub({
				projectId: p.project,
				apiEndpoint: p.directEndpoint,
				emulatorMode: true,
			});
			const [topic] = await admin.createTopic(p.topic);
			const [sub] = await topic.createSubscription(`${p.topic}-double-analytics`);
			this.consumer = admin;
			this.subscription = sub;
			sub.on("error", () => undefined);
			sub.on("message", (m) => {
				this.consume(m.data);
				m.ack();
			});
			this.pubsub = new PubSub({
				projectId: p.project,
				apiEndpoint: p.publishEndpoint,
				emulatorMode: true,
			});
			this.topic = this.pubsub.topic(p.topic, { batching: { maxMessages: 1, maxMilliseconds: 0 } });
		}
	}

	async listen(name: string, role: string, port: number): Promise<void> {
		const server = createServer((req, res) => {
			void this.handle(name, role, req, res).catch((error: Error) => {
				if (!res.headersSent)
					this.json(res, 500, {
						error: { code: "internal", message: error.message, retryable: true },
					});
			});
		});
		await new Promise<void>((r) => server.listen(port, "127.0.0.1", () => r()));
		this.listeners.set(name, { server, port: (server.address() as AddressInfo).port, role });
	}

	url(name: string): string {
		return `http://127.0.0.1:${this.listeners.get(name)?.port}`;
	}

	async kill(name: string): Promise<void> {
		const l = this.listeners.get(name);
		if (!l) throw new Error(`unknown process ${name}`);
		l.server.closeAllConnections();
		await new Promise<void>((r) => l.server.close(() => r()));
	}

	async startProcess(name: string): Promise<void> {
		const l = this.listeners.get(name);
		if (!l) throw new Error(`unknown process ${name}`);
		if (l.server.listening) return;
		await this.listen(name, l.role, l.port);
	}

	async stop(): Promise<void> {
		for (const [name, l] of this.listeners) if (l.server.listening) await this.kill(name);
		this.issuerServer?.closeAllConnections();
		await new Promise<void>((r) => (this.issuerServer ? this.issuerServer.close(() => r()) : r()));
		if (this.subscription) {
			this.subscription.removeAllListeners("message");
			await this.subscription.close().catch(() => undefined);
		}
		if (this.o.pubsub && this.consumer) {
			await this.consumer
				.subscription(`${this.o.pubsub.topic}-double-analytics`)
				.delete()
				.catch(() => undefined);
			await this.consumer
				.topic(this.o.pubsub.topic)
				.delete()
				.catch(() => undefined);
			await this.consumer.close();
		}
		await this.pubsub?.close();
	}

	reset(): void {
		this.links.clear();
		this.bySlug.clear();
		this.sessions.clear();
		this.revoked.clear();
		this.idem.clear();
		this.admission.clear();
		this.operatorActions = [];
		this.reports.clear();
		this.inbox = [];
		this.analytics.clear();
		this.replicaCache.clear();
		this.forcedSlug = null;
		this.offsetMs = 0;
		this.routeCaches.clear();
		this.sharedRoutes.clear();
	}

	/** Control actions used by the adapter commands (selftest/ctl.ts). */
	async control(action: string, args: Record<string, string>): Promise<unknown> {
		switch (action) {
			case "reset":
				this.reset();
				return { ok: true };
			case "restart":
				return { ok: true, target: args.target };
			case "kill":
				await this.kill(args.target);
				return { ok: true };
			case "start":
				await this.startProcess(args.target);
				return { ok: true };
			case "clock":
				this.offsetMs = Number(args.offsetMs);
				return { offsetMs: this.offsetMs, boundMs: 0 };
			case "faultPoint":
				if (args.name === "force-slug-collision")
					this.forcedSlug = args.state === "on" ? args.arg : null;
				if (args.name === "clear-route-caches" && args.state === "on") {
					// One replica drops its per-process route cache; the shared cache is untouched.
					if (!this.listeners.has(args.arg)) throw new Error(`unknown replica ${args.arg}`);
					this.routeCaches.get(args.arg)?.clear();
				}
				if (args.name === "corrupt-route-cache" && args.state === "on") {
					this.sharedRoutes.set(args.arg, "\u0000not-a-route{");
					for (const cache of this.routeCaches.values()) cache.delete(args.arg);
				}
				return { ok: true };
			case "rotateIdentityKey":
				return { newKid: `double-${randomUUID().slice(0, 8)}` };
			case "rogueKey": {
				const rogue = generateKeyPairSync("rsa", { modulusLength: 2048 });
				return { privateJwk: rogue.privateKey.export({ format: "jwk" }), kid: "rogue" };
			}
			case "inspect":
				return this.inspect(args.what);
			default:
				throw new Error(`unknown control ${action}`);
		}
	}

	private inspect(what: string): unknown {
		if (what === "webhookInbox") return { items: this.inbox };
		if (what === "operatorActions") return { items: this.operatorActions };
		if (what === "linkCount") return { links: this.links.size };
		if (what === "dbQueries") return { byService: { redirect: this.dbQueries } };
		if (what === "dbConnections") return { byService: { redirect: { current: 2, max: 10 } } };
		if (what === "memory") {
			const rssBytes = process.memoryUsage().rss;
			return {
				byProcess: Object.fromEntries([...this.listeners.keys()].map((n) => [n, { rssBytes }])),
			};
		}
		if (what === "publisherQueue" && this.o.publisher) {
			const limits = this.publisherLimits();
			return {
				byProcess: Object.fromEntries(
					[...this.listeners.entries()]
						.filter(([, l]) => l.role === "redirect")
						.map(([n]) => [
							n,
							{
								depth: this.publisherOf(n).queued.size,
								bound: limits.bound,
								deadlineMs: PUBLISH_DEADLINE_MS,
								admissionBound: limits.admissionBound,
							},
						]),
				),
			};
		}
		throw new Error(`unknown inspect ${what}`);
	}

	// ---------- route cache (F01) and publisher (F06) models ----------

	/**
	 * Per-process cache, then the shared cache, then the database. A database read refreshes the
	 * per-process cache; in f01-inprocess-stampede it does so only when the shared cache answered,
	 * so while the shared cache is down every request that misses goes to the database.
	 */
	private async route(listener: string, slug: string): Promise<Link | undefined> {
		const local = this.routeCaches.get(listener) ?? new Map<string, RouteEntry>();
		this.routeCaches.set(listener, local);
		const now = this.now();
		const cached = local.get(slug);
		if (cached && cached.validatedUntil > now) return cached.link;
		const shared = await this.sharedRoute("get", slug);
		if (shared.entry && shared.entry.validatedUntil > now) {
			local.set(slug, shared.entry);
			return shared.entry.link;
		}
		const key = `${listener}:${slug}`;
		const read =
			(this.o.mode === "f01-inprocess-stampede" ? undefined : this.routeReads.get(key)) ??
			Promise.resolve().then(() => {
				this.dbQueries++;
				return this.links.get(this.bySlug.get(slug) ?? "");
			});
		this.routeReads.set(key, read);
		const link = await read.finally(() => this.routeReads.delete(key));
		if (!link) return undefined;
		const entry = { link: { ...link }, validatedUntil: now + 30_000 };
		if (shared.ok) await this.sharedRoute("set", slug, entry);
		if (shared.ok || this.o.mode !== "f01-inprocess-stampede") local.set(slug, entry);
		return link;
	}

	/** One round trip to the shared cache's stand-in; the cache's contents live in sharedRoutes. */
	private async sharedRoute(
		op: "get" | "set",
		slug: string,
		entry?: RouteEntry,
	): Promise<{ ok: boolean; entry?: RouteEntry }> {
		const [host, port] = (this.o.routeCache ?? "").split(":");
		const ok = await new Promise<boolean>((resolve) => {
			const socket = connect(Number(port), host);
			const done = (answer: boolean) => {
				socket.destroy();
				resolve(answer);
			};
			socket.setTimeout(ROUTE_CACHE_TIMEOUT_MS, () => done(false));
			socket.on("error", () => done(false));
			socket.on("connect", () => socket.write(`${op.toUpperCase()} ${slug}\n`));
			socket.on("data", (d) => done(d.toString().startsWith("OK")));
		});
		if (!ok) return { ok };
		if (op === "set" && entry) {
			this.sharedRoutes.set(slug, JSON.stringify(entry));
			return { ok };
		}
		try {
			const value = JSON.parse(this.sharedRoutes.get(slug) ?? "null") as RouteEntry | null;
			return { ok, entry: value?.link?.id ? value : undefined };
		} catch {
			return { ok };
		}
	}

	/** Declared limits; f06-small-bound-unbounded-queue declares tiny ones and enforces neither. */
	private publisherLimits(): { bound: number; admissionBound: number; enforced: boolean } {
		return this.o.mode === "f06-small-bound-unbounded-queue"
			? { bound: 4, admissionBound: 16, enforced: false }
			: { bound: 50, admissionBound: 200, enforced: true };
	}

	private publisherOf(listener: string): { admitted: number; queued: Set<Buffer> } {
		const state = this.publishers.get(listener) ?? { admitted: 0, queued: new Set<Buffer>() };
		this.publishers.set(listener, state);
		return state;
	}

	/** 503 for a request refused before any publish (admission or a full queue): no event ID. */
	private unavailable(res: ServerResponse): void {
		res.writeHead(503, {
			"Content-Type": "text/html",
			"Cache-Control": "no-store",
			"Retry-After": "2",
		});
		res.end("<p>Temporarily unavailable</p>");
	}

	// ---------- helpers ----------

	private json(
		res: ServerResponse,
		status: number,
		body: unknown,
		headers: Record<string, string> = {},
	): void {
		const text = body === undefined ? "" : JSON.stringify(body);
		res.writeHead(status, {
			"Content-Type": "application/json; charset=utf-8",
			"Cache-Control": "no-store",
			...headers,
		});
		res.end(text);
	}

	private err(
		res: ServerResponse,
		status: number,
		code: string,
		extra: Record<string, unknown> = {},
		headers: Record<string, string> = {},
	): void {
		this.json(
			res,
			status,
			{
				error: {
					code,
					message: `double: ${code}`,
					retryable: status >= 500 || status === 429,
					...extra,
				},
			},
			headers,
		);
	}

	private page(
		res: ServerResponse,
		status: number,
		title: string,
		headers: Record<string, string> = {},
	): void {
		res.writeHead(status, {
			"Content-Type": "text/html; charset=utf-8",
			"Cache-Control": "no-store",
			...headers,
		});
		res.end(`<!doctype html><title>${title}</title><p>${title}</p>`);
	}

	private async body(req: IncomingMessage, limit = 1_048_576): Promise<Buffer | null> {
		const chunks: Buffer[] = [];
		let size = 0;
		for await (const chunk of req) {
			size += (chunk as Buffer).length;
			if (size > limit) return null;
			chunks.push(chunk as Buffer);
		}
		return Buffer.concat(chunks);
	}

	private cookies(req: IncomingMessage): Record<string, string> {
		const out: Record<string, string> = {};
		for (const part of (req.headers.cookie ?? "").split(";")) {
			const [k, ...v] = part.trim().split("=");
			if (k) out[k] = v.join("=");
		}
		return out;
	}

	/** Session from the cookie: undefined = none sent, null = sent but invalid. */
	private session(req: IncomingMessage): Session | null | undefined {
		const sid = this.cookies(req).qs;
		if (!sid) return undefined;
		const s = this.sessions.get(sid);
		if (!s) return null;
		if (s.account && this.now() - s.lastSeen > DAY) return null;
		s.lastSeen = this.now();
		return s;
	}

	private newSession(res: ServerResponse, account: string | null = null): Session {
		const s: Session = {
			id: randomBytes(16).toString("hex"),
			csrf: randomBytes(16).toString("hex"),
			account,
			lastSeen: this.now(),
		};
		this.sessions.set(s.id, s);
		res.setHeader("Set-Cookie", `qs=${s.id}; Path=/; HttpOnly; SameSite=Lax`);
		return s;
	}

	private clientKey(req: IncomingMessage): string {
		const trusted = req.headers["x-oracle-edge-token"] === this.o.edgeToken;
		const ip =
			(trusted ? (req.headers["x-oracle-client-ip"] as string | undefined) : undefined) ??
			req.socket.remoteAddress ??
			"unknown";
		if (ip.includes(":") && this.o.mode !== "a17-per-address-not-per-64")
			return ip.split(":").slice(0, 4).join(":");
		return ip;
	}

	private linkView(l: Link): Record<string, unknown> {
		return {
			id: l.id,
			shortUrl: `${this.origin}/${l.slug}`,
			destination: l.destination,
			version: l.version,
			state: l.state,
			createdAt: l.createdAt,
			updatedAt: l.updatedAt,
			expiresAt: l.expiresAt,
		};
	}

	private validate(input: unknown): string | null {
		if (typeof input !== "string") return null;
		const accepted = ACCEPTED.find((c) => c.input === input);
		if (accepted) {
			if (this.o.mode === "a09-altered-location" && input.includes("q?b=2&a=1&A=3"))
				return input.replace("b=2&a=1&A=3", "a=1&b=2&A=3");
			return accepted.expected;
		}
		if (this.o.mode === "a09-accepts-private-host" && input === "http://127.0.0.1/") return input;
		if (rejected(this.origin).includes(input)) return null;
		return /^https:\/\/example\.com\/oracle\/[A-Za-z0-9/_.?=&%-]+$/.test(input) &&
			input.length <= 8192
			? input
			: null;
	}

	private async reputation(destination: string): Promise<"clean" | "threat" | "unavailable"> {
		if (!this.o.webRiskUrl) return "clean";
		const url = new URL("/v1/uris:search", this.o.webRiskUrl);
		url.searchParams.set("uri", destination);
		for (const t of ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"])
			url.searchParams.append("threatTypes", t);
		try {
			const r = await fetch(url, { signal: AbortSignal.timeout(2_000) });
			if (!r.ok) return "unavailable";
			const body = (await r.json()) as { threat?: unknown };
			return body.threat ? "threat" : "clean";
		} catch {
			return "unavailable";
		}
	}

	private allocate(): string {
		if (this.forcedSlug) {
			const forced = this.forcedSlug;
			this.forcedSlug = null;
			return forced;
		}
		return Array.from(randomBytes(10), (b) => B62[b % 62]).join("");
	}

	private async publish(event: Record<string, unknown>, onSettled?: () => void): Promise<boolean> {
		if (!this.topic) {
			onSettled?.();
			return true;
		}
		const send = this.topic.publishMessage({
			data: Buffer.from(JSON.stringify(event)),
			attributes: { schemaVersion: "1" },
		});
		send.then(onSettled, onSettled).catch(() => undefined);
		const timeout = new Promise<boolean>((r) => setTimeout(() => r(false), PUBLISH_DEADLINE_MS));
		return Promise.race([
			send.then(
				() => true,
				() => false,
			),
			timeout,
		]);
	}

	private consume(data: Buffer): void {
		let e: Record<string, unknown>;
		try {
			e = JSON.parse(data.toString("utf8"));
		} catch {
			return;
		}
		const linkId = String(e.linkId ?? "");
		const a = this.analytics.get(linkId) ?? {
			seen: new Set<string>(),
			recorded: 0,
			filtered: 0,
			days: new Map(),
		};
		this.analytics.set(linkId, a);
		const id = String(e.eventId);
		if (a.seen.has(id) && this.o.mode !== "a10-counts-duplicates") return;
		a.seen.add(id);
		if (e.synthetic === true && this.o.mode !== "a10-counts-synthetic") return;
		const day = String(e.eventTime).slice(0, 10);
		const d = a.days.get(day) ?? { r: 0, f: 0 };
		a.recorded++;
		d.r++;
		if (e.deviceClass !== "bot") {
			a.filtered++;
			d.f++;
		}
		a.days.set(day, d);
	}

	private async inboxWrite(eventId: string): Promise<boolean> {
		if (!this.o.billingDb) return true;
		const [host, port] = this.o.billingDb.split(":");
		return new Promise((resolve) => {
			const socket = connect(Number(port), host);
			const done = (ok: boolean) => {
				socket.destroy();
				resolve(ok);
			};
			socket.setTimeout(1_500, () => done(false));
			socket.on("error", () => done(false));
			socket.on("connect", () => socket.write(`${eventId}\n`));
			socket.on("data", (d) => done(d.toString().startsWith("OK")));
		});
	}

	private verifyJwt(token: string): boolean {
		const [h, p, s] = token.split(".");
		if (!h || !p) return false;
		const header = JSON.parse(Buffer.from(h, "base64url").toString()) as { alg?: string };
		const claims = JSON.parse(Buffer.from(p, "base64url").toString()) as {
			iss?: string;
			aud?: string;
			exp?: number;
		};
		if (header.alg === "none") return this.o.mode === "a14-accepts-alg-none";
		if (header.alg !== "RS256" || !s) return false;
		const key: KeyObject = this.signingKey.publicKey;
		const ok = cryptoVerify("sha256", Buffer.from(`${h}.${p}`), key, Buffer.from(s, "base64url"));
		return (
			ok &&
			claims.iss === this.issuerUrl &&
			claims.aud === "qrwty-double" &&
			(claims.exp ?? 0) * 1000 > Date.now()
		);
	}

	// ---------- issuer ----------

	private async issuer(req: IncomingMessage, res: ServerResponse): Promise<void> {
		const url = new URL(req.url ?? "/", this.issuerUrl);
		if (url.pathname === "/authorize") {
			res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
			res.end(
				`<!doctype html><title>Double issuer</title><form id="kc-form-login" action="/login?state=${encodeURIComponent(url.searchParams.get("state") ?? "")}&amp;redirect_uri=${encodeURIComponent(url.searchParams.get("redirect_uri") ?? "")}" method="post"><input type="hidden" name="credentialId" value=""><label>Username <input type="text" name="username"></label><label>Password <input type="password" name="password"></label><input type="submit" value="Sign in"></form>`,
			);
			return;
		}
		if (url.pathname === "/login" && req.method === "POST") {
			const form = new URLSearchParams((await this.body(req))?.toString() ?? "");
			const user = form.get("username") ?? "";
			if (
				!["oracle-alice", "oracle-bob", "oracle-operator"].includes(user) ||
				form.get("password") !== this.o.password
			) {
				res.writeHead(200, { "Content-Type": "text/html" });
				res.end("<p>Invalid credentials</p>");
				return;
			}
			const code = randomBytes(12).toString("hex");
			const state = url.searchParams.get("state") ?? "";
			this.codes.set(code, { account: user, state });
			const to = new URL(url.searchParams.get("redirect_uri") ?? "");
			to.searchParams.set("code", code);
			to.searchParams.set("state", state);
			res.writeHead(302, { Location: to.toString() });
			res.end();
			return;
		}
		res.writeHead(404);
		res.end();
	}

	// ---------- application ----------

	private async handle(
		listener: string,
		role: string,
		req: IncomingMessage,
		res: ServerResponse,
	): Promise<void> {
		const url = new URL(req.url ?? "/", "http://double");
		const method = req.method ?? "GET";
		const path = url.pathname;
		if (path === "/healthz" || path === "/readyz") return this.json(res, 200, { ok: true });
		if (path === "/__double/ctl" && method === "POST") {
			const args = JSON.parse((await this.body(req))?.toString("utf8") || "{}") as Record<
				string,
				string
			>;
			try {
				return this.json(res, 200, await this.control(args.action, args));
			} catch (error) {
				return this.json(res, 400, { error: (error as Error).message });
			}
		}
		if (role === "edge" && /^\/[0-9A-Za-z]{10}$/.test(path)) return this.forward(req, res);
		const host = (req.headers.host ?? "").toLowerCase();
		if (host !== new URL(this.origin).host) return this.page(res, 421, "Misdirected request");
		if (path === "/internal/v1/whoami") {
			const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
			return this.verifyJwt(token)
				? this.json(res, 200, { ok: true })
				: this.err(res, 401, "unauthenticated");
		}
		if (path === "/") return this.ui(res);
		if (path.startsWith("/qr/")) return this.qr(path, res);
		if (path.startsWith("/auth/") || path.startsWith("/api/v1/"))
			return this.api(method, path, url, req, res);
		if (/^\/[0-9A-Za-z]{10}$/.test(path))
			return this.redirect(listener, method, path.slice(1), url, req, res);
		return this.page(res, 404, "Not found");
	}

	private turn = 0;

	/** The entry forwards slug requests to the redirect replicas, skipping a replica that refuses. */
	private forward(req: IncomingMessage, res: ServerResponse): void {
		const replicas = [...this.listeners.entries()].filter(([, l]) => l.role === "redirect");
		const start = this.turn++;
		const attempt = (n: number) => {
			if (n >= replicas.length) {
				if (!res.headersSent) this.page(res, 503, "No replica", { "Retry-After": "1" });
				return;
			}
			const [, target] = replicas[(start + n) % replicas.length];
			const upstream = httpRequest(
				{
					host: "127.0.0.1",
					port: target.port,
					method: req.method,
					path: req.url,
					headers: req.headers,
					agent: false,
				},
				(up) => {
					res.writeHead(up.statusCode ?? 502, up.headers);
					up.pipe(res);
					up.on("error", () => res.destroy());
				},
			);
			upstream.on("error", (error: NodeJS.ErrnoException) => {
				if (error.code === "ECONNREFUSED") attempt(n + 1);
				else if (!res.headersSent) this.page(res, 502, "Bad gateway");
				else res.destroy();
			});
			upstream.end();
		};
		attempt(0);
	}

	private async redirect(
		listener: string,
		method: string,
		slug: string,
		url: URL,
		req: IncomingMessage,
		res: ServerResponse,
	): Promise<void> {
		if (method !== "GET" && method !== "HEAD")
			return this.page(res, 405, "Method not allowed", { Allow: "GET, HEAD" });
		const publisher =
			this.o.publisher && this.listeners.get(listener)?.role === "redirect"
				? this.publisherOf(listener)
				: null;
		const limits = this.publisherLimits();
		if (publisher) {
			if (limits.enforced && publisher.admitted >= limits.admissionBound)
				return this.unavailable(res);
			publisher.admitted++;
			res.once("close", () => publisher.admitted--);
		}
		let link = this.o.routeCache
			? await this.route(listener, slug)
			: this.links.get(this.bySlug.get(slug) ?? "");
		if (this.o.mode === "a07-stale-replica" && listener === "redirect-2" && link) {
			const cached = this.replicaCache.get(slug);
			if (cached) link = cached;
			else this.replicaCache.set(slug, { ...link });
		}
		if (!link) return this.page(res, 404, "Not found");
		if (link.state === "blocked") return this.page(res, 403, "Blocked");
		const grace = this.o.mode === "a08-serves-after-expiry" ? 3_000 : 0;
		if (
			link.state !== "active" ||
			(link.expiresAt && Date.parse(link.expiresAt) + grace <= this.now())
		)
			return this.page(res, 410, "Gone");
		const status = this.o.mode === "a09-status-301" ? 301 : 302;
		let location = link.destination;
		if (this.o.mode === "a09-forwards-query" && url.search)
			location += (location.includes("?") ? "&" : "?") + url.search.slice(1);
		const headers: Record<string, string> = { Location: location };
		if (this.o.mode !== "a09-missing-no-store") headers["Cache-Control"] = "no-store";
		if (method === "HEAD" && this.o.mode !== "a09-head-emits-event") {
			res.writeHead(status, headers);
			res.end();
			return;
		}
		const trusted = req.headers["x-oracle-edge-token"] === this.o.edgeToken;
		const ua = (req.headers["user-agent"] as string | undefined) ?? "";
		const referer = req.headers.referer as string | undefined;
		const event = {
			schemaVersion: 1,
			eventId: randomUUID(),
			linkId: link.id,
			eventTime: new Date(this.now()).toISOString(),
			synthetic: trusted && !!req.headers["qrwty-synthetic"],
			deviceClass: isBotV1(ua)
				? "bot"
				: /iPad|Tablet/.test(ua)
					? "tablet"
					: /Mobile|Android|iPhone/.test(ua)
						? "mobile"
						: "desktop",
			country: trusted ? ((req.headers["x-oracle-country"] as string | undefined) ?? null) : null,
			referrerHost: referer ? new URL(referer).hostname.toLowerCase() : null,
		};
		headers["QRWTY-Click-Event"] = event.eventId;
		if (this.o.mode === "a24-302-before-event") {
			res.writeHead(status, headers);
			res.end();
			setTimeout(() => void this.publish(event), 300);
			return;
		}
		let settled: (() => void) | undefined;
		if (publisher) {
			if (limits.enforced && publisher.queued.size >= limits.bound) return this.unavailable(res);
			const entry = Buffer.alloc(QUEUE_ENTRY_BYTES, 0x5a);
			publisher.queued.add(entry);
			settled = () => publisher.queued.delete(entry);
		}
		const ok = await this.publish(event, settled);
		if (!ok && this.o.mode !== "a24-fail-open") {
			res.writeHead(503, {
				"Content-Type": "text/html",
				"Cache-Control": "no-store",
				"Retry-After": "2",
				"QRWTY-Click-Event": event.eventId,
			});
			res.end("<p>Temporarily unavailable</p>");
			return;
		}
		res.writeHead(status, headers);
		res.end(method === "HEAD" ? undefined : "");
	}

	private async api(
		method: string,
		path: string,
		url: URL,
		req: IncomingMessage,
		res: ServerResponse,
	): Promise<void> {
		if (path === "/api/v1/billing/webhook" && method === "POST") return this.webhook(req, res);
		let session = this.session(req);
		let lenient = false;
		if (session === null && this.o.mode === "a06-bad-cookie-guest") {
			session = this.newSession(res);
			lenient = true;
		}
		if (this.o.mode === "a06-unknown-cookie-guest") {
			// Refuses a revoked cookie with 401 and clears it, and refuses a cookieless mutation with
			// 401, but ignores a session ID it never issued: a garbage cookie becomes a fresh guest.
			const sid = this.cookies(req).qs;
			if (session === null && sid && this.revoked.has(sid))
				return this.err(
					res,
					401,
					"session_expired",
					{},
					{ "Set-Cookie": "qs=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax" },
				);
			if (session === null) {
				session = this.newSession(res);
				lenient = true;
			}
			if (session === undefined && method !== "GET" && method !== "HEAD")
				return this.err(res, 401, "unauthenticated");
		}
		if (session === null) return this.err(res, 401, "session_expired");
		if (path === "/api/v1/session" && method === "GET") {
			session ??= this.newSession(res);
			return this.json(res, 200, {
				authenticated: !!session.account,
				csrfToken: session.csrf,
				account: session.account ? { subject: session.account } : null,
			});
		}
		if (path === "/auth/login") {
			const returnTo = url.searchParams.get("returnTo") ?? "/";
			session ??= this.newSession(res);
			const state = `${session.id}.${Buffer.from(returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/").toString("base64url")}`;
			const to = new URL("/authorize", this.issuerUrl);
			to.searchParams.set("state", state);
			to.searchParams.set("redirect_uri", `${this.origin}/auth/callback`);
			to.searchParams.set("code_challenge_method", "S256");
			res.writeHead(302, { Location: to.toString() });
			res.end();
			return;
		}
		if (path === "/auth/callback") {
			const state = url.searchParams.get("state") ?? "";
			const returnTo = Buffer.from(state.split(".")[1] ?? "", "base64url").toString() || "/";
			const sep = returnTo.includes("?") ? "&" : "?";
			if (url.searchParams.get("error")) {
				res.writeHead(302, { Location: `${returnTo}${sep}signin=cancelled` });
				res.end();
				return;
			}
			const code = this.codes.get(url.searchParams.get("code") ?? "");
			if (!code) {
				res.writeHead(302, { Location: `${returnTo}${sep}signin=failed` });
				res.end();
				return;
			}
			this.codes.delete(url.searchParams.get("code") ?? "");
			this.newSession(res, code.account);
			res.writeHead(302, { Location: returnTo });
			res.end();
			return;
		}
		const mutating = method !== "GET" && method !== "HEAD";
		if (mutating && !lenient && (!session || req.headers["x-csrf-token"] !== session.csrf))
			return this.err(res, 403, "csrf_failed");
		if (path === "/auth/logout" && method === "POST") {
			if (session) {
				this.sessions.delete(session.id);
				this.revoked.add(session.id);
			}
			res.writeHead(204);
			res.end();
			return;
		}
		const raw = mutating ? await this.body(req) : Buffer.alloc(0);
		let body: Record<string, unknown> = {};
		if (raw && raw.length > 0) {
			try {
				body = JSON.parse(raw.toString("utf8"));
			} catch {
				return this.err(res, 400, "invalid_request");
			}
		}
		const account = session?.account ?? null;
		const scope = account ?? `guest:${session?.id ?? "none"}`;
		const key = req.headers["idempotency-key"] as string | undefined;
		const idempotent = async (run: () => Promise<{ status: number; body: unknown }>) => {
			if (!key) return this.err(res, 400, "idempotency_key_required");
			const hash = sha(`${method} ${path} ${JSON.stringify(body)}`);
			const stored = this.idem.get(`${scope}:${key}`);
			if (stored && this.o.mode !== "a02-new-body-on-replay") {
				if (stored.hash !== hash && this.o.mode !== "a02-no-conflict")
					return this.err(res, 409, "idempotency_conflict");
				if (stored.hash === hash) return this.json(res, stored.status, stored.body);
			}
			const out = await run();
			if (out.status < 500 && out.status !== 429)
				this.idem.set(`${scope}:${key}`, { hash, status: out.status, body: out.body });
			return this.json(res, out.status, out.body);
		};

		if (path === "/api/v1/links" && method === "POST") {
			const destination = this.validate(body.destination);
			if (!destination) return this.err(res, 400, "invalid_destination");
			const verdict = await this.reputation(destination);
			if (verdict === "threat") return this.err(res, 422, "reputation_rejected");
			if (verdict === "unavailable")
				return this.err(res, 503, "reputation_unavailable", {}, { "Retry-After": "5" });
			if (!account && this.o.mode !== "a17-no-limit") {
				const k = this.clientKey(req);
				const now = Date.now();
				const w = this.admission.get(k);
				if (!w || now - w.start >= this.o.admissionWindowMs)
					this.admission.set(k, { start: now, count: 1 });
				else if (w.count >= 10)
					return this.err(
						res,
						429,
						"rate_limited",
						{},
						{
							"Retry-After": String(
								Math.max(1, Math.ceil((w.start + this.o.admissionWindowMs - now) / 1000)),
							),
						},
					);
				else w.count++;
			}
			return idempotent(async () => {
				let slug = this.allocate();
				const existing = this.links.get(this.bySlug.get(slug) ?? "");
				if (existing && this.o.mode === "a03-overwrites-on-collision") {
					existing.destination = destination;
					return { status: 201, body: { ...this.linkView(existing), owned: !!account } };
				}
				let tries = 0;
				while (this.bySlug.has(slug) && tries++ < 5) slug = this.allocate();
				if (this.bySlug.has(slug))
					return {
						status: 503,
						body: { error: { code: "slug_allocation_failed", message: "double", retryable: true } },
					};
				const now = new Date(this.now()).toISOString();
				const token = account ? null : randomBytes(32).toString("base64url");
				const link: Link = {
					id: `lnk_${randomBytes(8).toString("hex")}`,
					slug,
					destination,
					owner: account,
					state: "active",
					version: 1,
					createdAt: now,
					updatedAt: now,
					expiresAt: typeof body.expiresAt === "string" ? body.expiresAt : null,
					claimHash: token ? sha(token) : null,
					claimExpiresAt: token ? this.now() + DAY : null,
					claimed: false,
				};
				this.links.set(link.id, link);
				this.bySlug.set(slug, link.id);
				const out: Record<string, unknown> = { ...this.linkView(link), owned: !!account };
				if (token)
					out.claim = { token, expiresAt: new Date(link.claimExpiresAt ?? 0).toISOString() };
				return { status: 201, body: out };
			});
		}
		if (path === "/api/v1/abuse-reports" && method === "POST") {
			if (!["phishing", "malware", "spam", "other"].includes(String(body.reason)))
				return this.err(res, 400, "invalid_request");
			const slug =
				String(body.shortUrl ?? "")
					.split("/")
					.pop() ?? "";
			const n = (this.reports.get(slug) ?? 0) + 1;
			this.reports.set(slug, n);
			const link = this.links.get(this.bySlug.get(slug) ?? "");
			if (this.o.mode === "a16-report-blocks" && link && n >= 5) link.state = "blocked";
			return this.json(res, 202, { received: true });
		}
		if (path.startsWith("/api/v1/operator/")) {
			if (account !== "oracle-operator" && this.o.mode !== "a16-non-operator-200")
				return this.err(res, 404, "not_found");
			const bySlug = /^\/api\/v1\/operator\/links\/by-slug\/([0-9A-Za-z]{10})$/.exec(path);
			if (bySlug && method === "GET") {
				const link = this.links.get(this.bySlug.get(bySlug[1]) ?? "");
				return link
					? this.json(res, 200, { ...this.linkView(link), hasOwner: !!link.owner })
					: this.err(res, 404, "not_found");
			}
			const action = /^\/api\/v1\/operator\/links\/([^/]+)\/(block|unblock)$/.exec(path);
			const link = action ? this.links.get(decodeURIComponent(action[1])) : undefined;
			if (!action || !link) return this.err(res, 404, "not_found");
			if (typeof body.reason !== "string" || !body.reason)
				return this.err(res, 400, "invalid_request");
			link.state = action[2] === "block" ? "blocked" : "active";
			link.version++;
			this.operatorActions.push({
				actor: account ?? "?",
				action: action[2],
				linkId: link.id,
				reason: body.reason,
				at: new Date().toISOString(),
			});
			return this.json(res, 200, this.linkView(link));
		}
		if (path === "/api/v1/billing/checkout" && method === "POST") {
			if (!account) return this.err(res, 401, "unauthenticated");
			return idempotent(async () =>
				body.plan === "paid-monthly"
					? { status: 200, body: { url: `${this.origin}/hosted-checkout/${randomUUID()}` } }
					: {
							status: 400,
							body: {
								error: { code: "invalid_request", message: "unknown plan", retryable: false },
							},
						},
			);
		}
		if (path === "/api/v1/billing/portal" && method === "POST")
			return account ? this.err(res, 409, "no_customer") : this.err(res, 401, "unauthenticated");
		if (path === "/api/v1/me" && method === "DELETE") {
			if (!account) return this.err(res, 401, "unauthenticated");
			return idempotent(async () => ({ status: 202, body: { deletionScheduled: true } }));
		}
		// Everything below needs a verified account.
		if (!account) return this.err(res, 401, "unauthenticated");
		if (path === "/api/v1/me/billing") {
			return this.json(res, 200, {
				tier: "free",
				policy: "free-test-v1",
				subscription: {
					status: "none",
					paidThrough: null,
					graceUntil: null,
					cancelAtPeriodEnd: false,
				},
				usage: {
					period: { start: null, end: null },
					ownedLinkCreates: { used: 0, limit: 5 },
					csvExports: { used: 0, limit: 1 },
				},
				portalAvailable: false,
				confirming: false,
			});
		}
		if (path === "/api/v1/me/links" && method === "GET") {
			const limit = Number(url.searchParams.get("limit") ?? 20);
			if (!Number.isInteger(limit) || limit < 1 || limit > 50)
				return this.err(res, 400, "invalid_request");
			const mine = [...this.links.values()]
				.filter((l) => l.owner === account && l.state !== "deleted")
				.sort((a, b) => (b.createdAt + b.id).localeCompare(a.createdAt + a.id));
			let start = 0;
			const cursor = url.searchParams.get("cursor");
			if (cursor) {
				let decoded: { o?: string; i?: number } = {};
				try {
					decoded = JSON.parse(Buffer.from(cursor, "base64url").toString());
				} catch {
					return this.err(res, 400, "invalid_cursor");
				}
				if (decoded.o !== account || typeof decoded.i !== "number")
					return this.err(res, 400, "invalid_cursor");
				start = decoded.i;
			}
			const items = mine.slice(start, start + limit).map((l) => this.linkView(l));
			const nextCursor =
				start + limit < mine.length
					? Buffer.from(JSON.stringify({ o: account, i: start + limit })).toString("base64url")
					: null;
			return this.json(res, 200, { items, nextCursor });
		}
		const m = /^\/api\/v1\/links\/([^/]+)(\/claim|\/analytics|\/analytics\.csv)?$/.exec(path);
		if (!m) return this.err(res, 404, "not_found");
		const link = this.links.get(decodeURIComponent(m[1]));
		if (m[2] === "/claim" && method === "POST") {
			if (!link || link.state === "deleted") return this.err(res, 404, "not_found");
			return idempotent(async () => {
				if (link.owner === account && link.claimed)
					return { status: 200, body: { ...this.linkView(link), owned: true } };
				if (!link.claimHash || sha(String(body.claimToken ?? "")) !== link.claimHash) {
					return link.owner
						? {
								status: 409,
								body: { error: { code: "claim_consumed", message: "double", retryable: false } },
							}
						: {
								status: 403,
								body: { error: { code: "claim_invalid", message: "double", retryable: false } },
							};
				}
				if (this.o.mode !== "a04-expiry-not-enforced" && (link.claimExpiresAt ?? 0) <= this.now())
					return {
						status: 410,
						body: { error: { code: "claim_expired", message: "double", retryable: false } },
					};
				if (this.o.mode === "a05-two-winners") await new Promise((r) => setTimeout(r, 50));
				if (link.claimed && this.o.mode !== "a05-two-winners") {
					const extra = this.o.mode === "a05-leaks-owner" ? { owner: link.owner } : {};
					return {
						status: 409,
						body: {
							error: { code: "claim_consumed", message: "double", retryable: false },
							...extra,
						},
					};
				}
				link.owner = account;
				link.claimed = true;
				return { status: 200, body: { ...this.linkView(link), owned: true } };
			});
		}
		const foreignOk = this.o.mode === "a06-foreign-200";
		if (link && link.state === "deleted" && link.owner === account && !m[2] && method === "DELETE")
			return this.json(res, 204, undefined);
		if (!link || link.state === "deleted" || (link.owner !== account && !foreignOk))
			return this.err(res, 404, "not_found");
		if (!m[2] && method === "GET")
			return this.json(res, 200, this.linkView(link), { ETag: `"${link.version}"` });
		if (!m[2] && method === "PATCH") {
			const ifMatch = req.headers["if-match"];
			if (!ifMatch && this.o.mode !== "a07-no-412")
				return this.err(res, 428, "precondition_required");
			if (ifMatch !== `"${link.version}"` && this.o.mode !== "a07-no-412")
				return this.err(res, 412, "version_conflict");
			if (body.state === "active" && link.state === "blocked")
				return this.err(res, 409, "blocked_by_operator");
			if (body.state !== undefined && body.state !== "active" && body.state !== "disabled")
				return this.err(res, 400, "invalid_request");
			if (body.destination !== undefined) {
				const d = this.validate(body.destination);
				if (!d) return this.err(res, 400, "invalid_destination");
				link.destination = d;
			}
			if (body.state !== undefined) link.state = body.state as Link["state"];
			link.version++;
			link.updatedAt = new Date(this.now()).toISOString();
			return this.json(res, 200, this.linkView(link), { ETag: `"${link.version}"` });
		}
		if (!m[2] && method === "DELETE") {
			link.state = "deleted";
			return this.json(res, 204, undefined);
		}
		if (m[2] === "/analytics.csv") {
			if (this.o.mode === "a18-route-501") return this.err(res, 501, "not_implemented");
			res.writeHead(200, { "Content-Type": "text/csv; charset=utf-8" });
			res.end("date,recorded_attempts,filtered_clicks\n");
			return;
		}
		if (m[2] === "/analytics") {
			const from = url.searchParams.get("from");
			const to = url.searchParams.get("to");
			if (from && to && from > to) return this.err(res, 400, "invalid_range");
			const a = this.analytics.get(link.id);
			const series = [...(a?.days ?? new Map()).entries()]
				.sort()
				.map(([date, d]) => ({ date, recordedAttempts: d.r, filteredClicks: d.f }));
			return this.json(res, 200, {
				linkId: link.id,
				range: {
					from: from ?? new Date(Date.now() - 6 * DAY).toISOString().slice(0, 10),
					to: to ?? new Date().toISOString().slice(0, 10),
				},
				totals: { recordedAttempts: a?.recorded ?? 0, filteredClicks: a?.filtered ?? 0 },
				series,
				breakdowns: null,
				freshness: { asOf: new Date().toISOString(), delayed: false },
				reconciliation: { status: "ok" },
				filter: { version: "filter-v1", definition: "bot = empty user agent or filter-v1 pattern" },
				lookback: { maxDays: 7, limitedByTier: false },
			});
		}
		return this.err(res, 405, "method_not_allowed");
	}

	private async webhook(req: IncomingMessage, res: ServerResponse): Promise<void> {
		const raw = await this.body(req, 256 * 1024);
		if (!raw) return this.err(res, 413, "payload_too_large");
		let event: { id?: string };
		try {
			event =
				this.o.mode === "a20-accepts-bad-signature"
					? JSON.parse(raw.toString("utf8"))
					: (this.stripe.webhooks.constructEvent(
							raw,
							String(req.headers["stripe-signature"] ?? ""),
							this.o.webhookSecret,
						) as { id?: string });
		} catch {
			return this.err(res, 400, "invalid_signature");
		}
		const id = String(event.id);
		if (this.inbox.some((i) => i.eventId === id) && this.o.mode !== "a20-duplicate-second-effect")
			return this.json(res, 200, { received: true, duplicate: true });
		if (!(await this.inboxWrite(id))) return this.err(res, 503, "inbox_unavailable");
		this.inbox.push({ eventId: id });
		return this.json(res, 200, { received: true });
	}

	private async qr(path: string, res: ServerResponse): Promise<void> {
		const m = /^\/qr\/([0-9A-Za-z]{10})\.(png|svg)$/.exec(path);
		const link = m ? this.links.get(this.bySlug.get(m[1]) ?? "") : undefined;
		if (!m || !link) return this.page(res, 404, "Not found");
		const text =
			this.o.mode === "a01-qr-wrong-url" ? link.destination : `${this.origin}/${link.slug}`;
		const disposition = {
			"Content-Disposition": `attachment; filename="qrwty-${m[1]}.${m[2]}"`,
			"Cache-Control": "no-store",
		};
		if (m[2] === "png") {
			res.writeHead(200, { "Content-Type": "image/png", ...disposition });
			res.end(await QRCode.toBuffer(text, { type: "png", margin: 4, width: 512 }));
		} else {
			res.writeHead(200, { "Content-Type": "image/svg+xml", ...disposition });
			res.end(await QRCode.toString(text, { type: "svg", margin: 4 }));
		}
	}

	private ui(res: ServerResponse): void {
		res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
		res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Double</title></head><body><main>
<label>Destination URL <input id="d" type="url"></label> <button id="c" type="button">Create link</button>
<section id="r" hidden><label>Short URL <input id="s" readonly></label>
<button id="copy" type="button">Copy link</button> <a id="open" href="#">Open link</a>
<a id="png" href="#" download>Download PNG</a> <a id="svg" href="#" download>Download SVG</a></section>
<script>
const $ = (id) => document.getElementById(id);
$("c").onclick = async () => {
  const s = await (await fetch("/api/v1/session")).json();
  const r = await fetch("/api/v1/links", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": s.csrfToken, "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ destination: $("d").value }) });
  const link = await r.json();
  const slug = link.shortUrl.split("/").pop();
  $("s").value = link.shortUrl; $("open").href = link.shortUrl; $("png").href = "/qr/" + slug + ".png"; $("svg").href = "/qr/" + slug + ".svg";
  $("r").hidden = false;
};
$("copy").onclick = () => navigator.clipboard.writeText($("s").value);
</script></main></body></html>`);
	}
}

/** The JWT signing key's public half, for the self-test's guarded-route case. */
export function signingJwk(double: Double): unknown {
	return (
		double as unknown as { signingKey: { publicKey: KeyObject } }
	).signingKey.publicKey.export({ format: "jwk" });
}

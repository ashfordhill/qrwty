// The create route's logic, offline: an in-memory stand-in for the two SQL functions (the real
// ones are tested against PostgreSQL in test/integration). No Docker, no network.
import { describe, expect, it } from "vitest";
import type { ModuleRequest } from "../../src/modules/entry.ts";
import type { Dependencies } from "../../src/modules/link-api/link-api-link-operations.slots.ts";
import { GUEST_SCOPE_HEADER } from "../../src/modules/link-api/link-operations/create.ts";
import { sha256 } from "../../src/modules/link-api/link-operations/idempotency.ts";
import { parseKeyRing } from "../../src/modules/link-api/link-operations/replay-seal.ts";
import type { Verdict } from "../../src/modules/link-api/link-operations/reputation.ts";
import { linkOperations } from "../../src/modules/link-api/link-operations/service.ts";
import { testHooks } from "../../src/modules/link-api/link-operations/test-hooks.ts";

type Rec = { request: Buffer; body: Record<string, unknown>; sealed: Buffer };

function fakeLinks() {
	const records = new Map<string, Rec>();
	const slugs = new Map<string, string>();
	const claims = new Map<string, Buffer>();
	const state = { failing: false, calls: { find: 0, create: 0 }, records, slugs, claims };
	const query = async (sql: string, values: readonly unknown[] = []) => {
		if (state.failing) throw new Error("connect ECONNREFUSED");
		const id = `${(values[0] as Buffer).toString("hex")}/${(values[1] as Buffer).toString("hex")}`;
		if (sql.includes("find_idempotent(")) {
			state.calls.find++;
			const rec = records.get(id);
			return rec
				? [{ request_sha256: rec.request, status: 201, body: rec.body, sealed: rec.sealed }]
				: [];
		}
		if (sql.includes("create_guest_link(")) {
			state.calls.create++;
			const [, , request, linkId, slug, destination, expiresAt, shortUrl, proof, sealed] =
				values as [
					Buffer,
					Buffer,
					Buffer,
					string,
					string,
					string,
					string | null,
					string,
					Buffer,
					Buffer,
				];
			const rec = records.get(id);
			if (rec)
				return rec.request.equals(request)
					? [{ outcome: "replay", status: 201, body: rec.body, sealed: rec.sealed }]
					: [{ outcome: "conflict", status: null, body: null, sealed: null }];
			if (expiresAt !== null && Date.parse(expiresAt) <= Date.now())
				return [{ outcome: "invalid-expiry", status: null, body: null, sealed: null }];
			if (slugs.has(slug))
				return [{ outcome: "collision", status: null, body: null, sealed: null }];
			const now = new Date().toISOString();
			const body = {
				id: linkId,
				shortUrl,
				destination,
				version: 1,
				state: "active",
				createdAt: now,
				updatedAt: now,
				expiresAt,
				owned: false,
				claim: { expiresAt: new Date(Date.now() + 86_400_000).toISOString() },
			};
			records.set(id, { request, body, sealed });
			slugs.set(slug, destination);
			claims.set(linkId, proof);
			return [{ outcome: "created", status: 201, body, sealed }];
		}
		throw new Error(`unexpected SQL ${sql}`);
	};
	return {
		state,
		links: {
			query: query as Dependencies["links"]["query"],
			execute: async () => ({ rowCount: 0 }),
		},
	};
}

function setup(options: { verdict?: Verdict; hooks?: string } = {}) {
	const db = fakeLinks();
	const reputationCalls: string[] = [];
	const failures: string[] = [];
	const hooks = testHooks(options.hooks);
	const handle = linkOperations({
		origin: new URL("https://qrwty.io"),
		keyRing: parseKeyRing(`k1 ${Buffer.alloc(32, 7).toString("base64url")}`),
		hooks,
		reputation: () => async (destination) => {
			reputationCalls.push(destination);
			return options.verdict ?? "clean";
		},
		onFailure: (what) => failures.push(what),
	});
	const dependencies = { links: db.links } as unknown as Dependencies;
	const call = (overrides: Partial<ModuleRequest> = {}) =>
		handle(dependencies, {
			method: "POST",
			path: "/links",
			rawPath: overrides.path ?? "/links",
			query: {},
			headers: { "idempotency-key": "key-1", [GUEST_SCOPE_HEADER]: "G".repeat(43) },
			body: { destination: "https://example.com/a" },
			caller: { signedIn: false },
			signal: new AbortController().signal,
			...overrides,
		});
	return { db, call, reputationCalls, failures, hooks, handle, dependencies };
}

const code = (r: { body?: unknown }) => (r.body as { error?: { code?: string } }).error?.code;
type Created = { id: string; shortUrl: string; claim: { token: string; expiresAt: string } };

describe("guest create", () => {
	it("answers 201 with the link, its claim proof and its ETag", async () => {
		const { call, db } = setup();
		const r = await call();
		expect(r.status).toBe(201);
		expect(r.headers?.ETag).toBe('"1"');
		const body = r.body as Created & Record<string, unknown>;
		expect(body).toMatchObject({
			destination: "https://example.com/a",
			version: 1,
			state: "active",
			owned: false,
		});
		expect(body.shortUrl).toMatch(/^https:\/\/qrwty\.io\/[0-9A-Za-z]{10}$/);
		expect(body.claim.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
		// Only the proof's hash is stored, and the replay copy is sealed.
		expect(db.state.claims.get(body.id)).toEqual(sha256(body.claim.token));
		const rec = [...db.state.records.values()][0];
		expect(rec?.sealed.includes(Buffer.from(body.claim.token))).toBe(false);
		expect(JSON.stringify(rec?.body)).not.toContain(body.claim.token);
	});
	it("replays the same key and request with the same body, proof included, before any check", async () => {
		const { call, reputationCalls } = setup();
		const first = await call();
		const again = await call();
		expect(again.status).toBe(201);
		expect(again.body).toEqual(first.body);
		expect(again.headers?.["Idempotent-Replayed"]).toBe("true");
		expect(reputationCalls).toHaveLength(1);
	});
	it("treats an equal normalized request as the same request", async () => {
		const { call } = setup();
		const first = await call();
		const again = await call({ body: { destination: "HTTPS://EXAMPLE.COM:443/a" } });
		expect(again.body).toEqual(first.body);
	});
	it("answers 409 for the same key with another request", async () => {
		const { call } = setup();
		await call();
		const other = await call({ body: { destination: "https://example.com/a/changed" } });
		expect(other.status).toBe(409);
		expect(code(other)).toBe("idempotency_conflict");
	});
	it("scopes keys: another guest's same key is a new link", async () => {
		const { call } = setup();
		const a = await call();
		const b = await call({
			headers: { "idempotency-key": "key-1", [GUEST_SCOPE_HEADER]: "H".repeat(43) },
		});
		expect(b.status).toBe(201);
		expect((b.body as Created).id).not.toBe((a.body as Created).id);
	});
	it("needs an Idempotency-Key", async () => {
		const { call } = setup();
		for (const headers of [
			{ [GUEST_SCOPE_HEADER]: "G".repeat(43) },
			{ "idempotency-key": "", [GUEST_SCOPE_HEADER]: "G".repeat(43) },
			{ "idempotency-key": ["a", "b"], [GUEST_SCOPE_HEADER]: "G".repeat(43) },
		]) {
			const r = await call({ headers });
			expect(r.status).toBe(400);
			expect(code(r)).toBe("idempotency_key_required");
		}
	});
	it("needs the guest scope from Session API", async () => {
		const { call } = setup();
		const r = await call({ headers: { "idempotency-key": "k" } });
		expect(r.status).toBe(400);
		expect(code(r)).toBe("invalid_request");
	});
	it("refuses a bad destination with 400 invalid_destination and its reason", async () => {
		const { call, db, reputationCalls } = setup();
		const r = await call({ body: { destination: "http://127.0.0.1/" } });
		expect(r.status).toBe(400);
		expect(code(r)).toBe("invalid_destination");
		expect((r.body as { error: { reason?: string } }).error.reason).toBeTruthy();
		expect(db.state.calls.find + db.state.calls.create).toBe(0);
		expect(reputationCalls).toHaveLength(0);
	});
	it("refuses other bodies with 400 invalid_request", async () => {
		const { call } = setup();
		for (const body of [
			undefined,
			"https://example.com",
			[],
			{ destination: "https://example.com", owner: "bob" },
			{ destination: "https://example.com", expiresAt: "tomorrow" },
			{ destination: "https://example.com", expiresAt: "2026-02-30T00:00:00Z" },
		]) {
			const r = await call({ body });
			expect(r.status).toBe(400);
			expect(code(r)).toBe("invalid_request");
		}
	});
	it("refuses a past expiresAt", async () => {
		const { call } = setup();
		const r = await call({
			body: { destination: "https://e.com/x", expiresAt: "2020-01-01T00:00:00Z" },
		});
		expect(r.status).toBe(400);
		expect((r.body as { error: { reason?: string } }).error.reason).toBe("expires_at");
	});
	it("ignores spoofed identity and address headers", async () => {
		const { call } = setup();
		const r = await call({
			headers: {
				"idempotency-key": "k",
				[GUEST_SCOPE_HEADER]: "G".repeat(43),
				"x-user-id": "bob",
				"x-forwarded-for": "10.0.0.1",
			},
		});
		expect(r.status).toBe(201);
		expect((r.body as { owned: boolean }).owned).toBe(false);
	});
});

describe("reputation, storage and allocation failures", () => {
	it("answers 422 for a threat and 503 with Retry-After when the check is unavailable", async () => {
		const threat = await setup({ verdict: "threat" }).call();
		expect(threat.status).toBe(422);
		expect(code(threat)).toBe("reputation_rejected");
		const down = setup({ verdict: "unavailable" });
		const r = await down.call();
		expect(r.status).toBe(503);
		expect(code(r)).toBe("reputation_unavailable");
		expect(r.headers?.["Retry-After"]).toBe("5");
		expect(down.db.state.calls.create).toBe(0);
	});
	it("never turns a database error into a success", async () => {
		const { call, db, failures } = setup();
		db.state.failing = true;
		const r = await call();
		expect(r.status).toBe(503);
		expect(code(r)).toBe("storage_unavailable");
		expect(r.headers?.["Retry-After"]).toBe("1");
		expect(failures).toHaveLength(1);
	});
	it("retries a forced collision and keeps the existing slug's link", async () => {
		const { call, db, hooks } = setup({ hooks: "on" });
		const first = (await call()).body as Created;
		const taken = first.shortUrl.slice(-10);
		hooks.handle({
			method: "POST",
			path: "/__test/fault-points",
			rawPath: "/__test/fault-points",
			query: {},
			headers: {},
			body: { name: "force-slug-collision", state: "on", arg: taken },
			caller: { signedIn: false },
			signal: new AbortController().signal,
		});
		const r = await call({
			headers: { "idempotency-key": "key-2", [GUEST_SCOPE_HEADER]: "G".repeat(43) },
			body: { destination: "https://example.com/b" },
		});
		expect(r.status).toBe(201);
		expect((r.body as Created).shortUrl.slice(-10)).not.toBe(taken);
		expect(db.state.slugs.get(taken)).toBe("https://example.com/a");
		expect(db.state.calls.create).toBe(3);
	});
	it("gives up after 5 retries with 503 slug_allocation_failed", async () => {
		const { call, db, failures } = setup();
		const realHas = db.state.slugs.has.bind(db.state.slugs);
		db.state.slugs.has = () => true;
		const r = await call();
		db.state.slugs.has = realHas;
		expect(r.status).toBe(503);
		expect(code(r)).toBe("slug_allocation_failed");
		expect(db.state.calls.create).toBe(6);
		expect(failures).toContain("create-link slug allocation");
	});
});

describe("routes and the signed-in caller", () => {
	it("answers 405 with Allow on /links, 401 on owner routes for a guest and 404 elsewhere", async () => {
		const { call } = setup();
		const get = await call({ method: "GET" });
		expect(get.status).toBe(405);
		expect(get.headers?.Allow).toBe("POST");
		expect(code(get)).toBe("method_not_allowed");
		expect((await call({ path: "/" })).status).toBe(404);
		expect(code(await call({ path: "/nope" }))).toBe("not_found");
		const claim = await call({ path: "/links/x/claim" });
		expect(claim.status).toBe(401);
		expect(code(claim)).toBe("unauthenticated");
		expect((await call({ path: "/links/x", method: "GET" })).status).toBe(401);
	});
	it("keeps the test hooks closed unless the test profile turns them on", async () => {
		const closed = setup();
		const r = await closed.call({ path: "/__test/state", method: "GET" });
		expect(r.status).toBe(404);
		expect(() => testHooks("yes")).toThrow(/QRWTY_TEST_HOOKS/);
	});
	it("creates an account's link through the owned path, not the guest one", async () => {
		const { call, db, reputationCalls } = setup();
		const r = await call({
			headers: { "idempotency-key": "k" },
			caller: { signedIn: true, principal: { subject: "alice", claims: {} } },
		});
		// The offline fake has no `idempotent`: the owned path fails closed, never a guest create.
		expect(r.status).toBe(503);
		expect(code(r)).toBe("storage_unavailable");
		expect(reputationCalls).toEqual(["https://example.com/a"]);
		expect(db.state.calls.create).toBe(0);
		expect(db.state.calls.find).toBe(0);
	});
});

// Races on real PostgreSQL through the real create route: two "replicas", each its own pool with
// the generated client's settings and its own handler instance (no shared process state but the
// database), as F07 asks of the deployed copies. The reputation check is a clean stand-in here;
// the stack test uses the pack's Web Risk fixture.
import { randomUUID } from "node:crypto";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ModuleRequest, ModuleResponse } from "../../src/modules/entry.ts";
import type { Dependencies } from "../../src/modules/link-api/link-api-link-operations.slots.ts";
import { GUEST_SCOPE_HEADER } from "../../src/modules/link-api/link-operations/create.ts";
import { sha256 } from "../../src/modules/link-api/link-operations/idempotency.ts";
import { parseKeyRing } from "../../src/modules/link-api/link-operations/replay-seal.ts";
import { linkOperations } from "../../src/modules/link-api/link-operations/service.ts";
import { testHooks } from "../../src/modules/link-api/link-operations/test-hooks.ts";
import { createTestDatabase, type TestDatabase } from "./postgres.ts";

const S = "m_link_api_link_operations";
const RING = `k1 ${Buffer.alloc(32, 9).toString("base64url")}`;
let t: TestDatabase;
let inspect: pg.Client;

type Replica = {
	call(request: Partial<ModuleRequest>): Promise<ModuleResponse>;
	hooks: ReturnType<typeof testHooks>;
	end(): Promise<void>;
};
function startReplica(options: { random?: (n: number) => Uint8Array } = {}): Replica {
	const pool = t.replica();
	const hooks = testHooks("on");
	const handle = linkOperations({
		origin: new URL("https://qrwty.io"),
		keyRing: parseKeyRing(RING),
		hooks,
		reputation: () => async () => "clean",
		onFailure: () => {},
		...(options.random ? { random: options.random } : {}),
	});
	const dependencies = { links: pool.db } as unknown as Dependencies;
	return {
		hooks,
		call: (request) =>
			handle(dependencies, {
				method: "POST",
				path: "/links",
				rawPath: request.path ?? "/links",
				query: {},
				headers: {},
				body: undefined,
				caller: { signedIn: false },
				signal: new AbortController().signal,
				...request,
			}),
		end: () => pool.end(),
	};
}
const guest = () => randomUUID().replaceAll("-", "").padEnd(43, "g");
const create = (r: Replica, scope: string, key: string, destination: string) =>
	r.call({
		headers: { "idempotency-key": key, [GUEST_SCOPE_HEADER]: scope },
		body: { destination },
	});
type Body = { id: string; shortUrl: string; destination: string; claim: { token: string } };

let a: Replica;
let b: Replica;
beforeAll(async () => {
	t = await createTestDatabase();
	await t.migrate();
	inspect = await t.client("link");
	a = startReplica();
	b = startReplica();
});
afterAll(async () => {
	await a?.end();
	await b?.end();
	await inspect?.end();
	await t?.drop();
});

describe("A03's invariants: 200 concurrent creates across two replicas", () => {
	it("give 200 distinct slugs, each stored with its own destination", async () => {
		const run = randomUUID().slice(0, 8);
		const results = await Promise.all(
			Array.from({ length: 200 }, (_, i) =>
				create(i % 2 ? a : b, guest(), `k-${i}`, `https://example.com/oracle/a03/${run}-${i}`),
			),
		);
		expect(results.map((r) => r.status)).toEqual(Array(200).fill(201));
		const bodies = results.map((r) => r.body as Body);
		const slugs = bodies.map((x) => x.shortUrl.slice(-10));
		expect(new Set(slugs).size).toBe(200);
		const rows = (
			await inspect.query(`SELECT slug, destination FROM ${S}.links WHERE destination LIKE $1`, [
				`%/a03/${run}-%`,
			])
		).rows as { slug: string; destination: string }[];
		expect(rows).toHaveLength(200);
		const bySlug = new Map(rows.map((r) => [r.slug, r.destination]));
		bodies.forEach((x, i) => {
			expect(bySlug.get(x.shortUrl.slice(-10))).toBe(`https://example.com/oracle/a03/${run}-${i}`);
		});
	});
});

describe("A02's invariants: one key, one link", () => {
	it("20 concurrent same-key requests on two replicas make one link, one body, one proof", async () => {
		const scope = guest();
		const destination = `https://example.com/oracle/a02/${randomUUID()}`;
		const results = await Promise.all(
			Array.from({ length: 20 }, (_, i) => create(i % 2 ? a : b, scope, "same-key", destination)),
		);
		expect(results.map((r) => r.status)).toEqual(Array(20).fill(201));
		const first = results[0]?.body as Body;
		for (const r of results) expect(r.body).toEqual(first);
		expect(first.claim.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
		const rows = (
			await inspect.query(`SELECT id FROM ${S}.links WHERE destination = $1`, [destination])
		).rows;
		expect(rows).toEqual([{ id: first.id }]);
		const claim = (
			await inspect.query(`SELECT proof_sha256 FROM ${S}.link_claims WHERE link_id = $1`, [
				first.id,
			])
		).rows[0];
		expect(claim.proof_sha256).toEqual(sha256(first.claim.token));
	});
	it("two bodies racing on one key: one wins everywhere, the other is 409", async () => {
		const scope = guest();
		const base = `https://example.com/oracle/a02/${randomUUID()}`;
		const results = await Promise.all(
			Array.from({ length: 20 }, (_, i) =>
				create(i % 2 ? a : b, scope, "contested", i % 4 < 2 ? `${base}/one` : `${base}/two`),
			),
		);
		const won = results.filter((r) => r.status === 201);
		const lost = results.filter((r) => r.status === 409);
		expect(won.length + lost.length).toBe(20);
		expect(new Set(won.map((r) => JSON.stringify(r.body))).size).toBe(1);
		for (const r of lost)
			expect((r.body as { error: { code: string } }).error.code).toBe("idempotency_conflict");
		const rows = (
			await inspect.query(`SELECT count(*) AS n FROM ${S}.links WHERE destination LIKE $1`, [
				`${base}/%`,
			])
		).rows[0];
		expect(Number(rows.n)).toBe(1);
	});
	it("replays the same body after every replica restarts, and 409s a changed body", async () => {
		const scope = guest();
		const destination = `https://example.com/oracle/a02/${randomUUID()}`;
		const before = await create(a, scope, "restart-key", destination);
		await a.end();
		await b.end();
		a = startReplica();
		b = startReplica();
		const after = await create(b, scope, "restart-key", destination);
		expect(after.status).toBe(201);
		expect(after.body).toEqual(before.body);
		const changed = await create(a, scope, "restart-key", `${destination}/changed`);
		expect(changed.status).toBe(409);
	});
});

describe("slug collisions", () => {
	it("a forced collision retries to a new slug and never changes the existing link", async () => {
		const existing = (
			await create(a, guest(), "existing", "https://example.com/oracle/a03/existing")
		).body as Body;
		const taken = existing.shortUrl.slice(-10);
		for (const r of [a, b])
			r.hooks.handle({
				method: "POST",
				path: "/__test/fault-points",
				rawPath: "/__test/fault-points",
				query: {},
				headers: {},
				body: { name: "force-slug-collision", state: "on", arg: taken },
				caller: { signedIn: false },
				signal: new AbortController().signal,
			});
		const collide = await create(b, guest(), "collide", "https://example.com/oracle/a03/collision");
		expect(collide.status).toBe(201);
		expect((collide.body as Body).shortUrl.slice(-10)).not.toBe(taken);
		const kept = (
			await inspect.query(`SELECT destination, version FROM ${S}.links WHERE slug = $1`, [taken])
		).rows;
		expect(kept).toEqual([{ destination: "https://example.com/oracle/a03/existing", version: 1 }]);
	});
	it("after 5 retries answers 503 slug_allocation_failed and writes nothing", async () => {
		const existing = (await create(a, guest(), "existing-2", "https://example.com/oracle/a03/e2"))
			.body as Body;
		const taken = existing.shortUrl.slice(-10);
		const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
		const bytes = [...taken].map((c) => ALPHABET.indexOf(c));
		// A CSPRNG stand-in that returns the taken slug every time, for the proof too.
		const stuck = startReplica({
			random: (n) => Uint8Array.from({ length: n }, (_, i) => bytes[i % 10] ?? 0),
		});
		const scope = guest();
		const r = await create(stuck, scope, "stuck", "https://example.com/oracle/a03/stuck");
		await stuck.end();
		expect(r.status).toBe(503);
		expect((r.body as { error: { code: string } }).error.code).toBe("slug_allocation_failed");
		expect(r.headers?.["Retry-After"]).toBe("1");
		const rows = (
			await inspect.query(`SELECT count(*) AS n FROM ${S}.links WHERE destination = $1`, [
				"https://example.com/oracle/a03/stuck",
			])
		).rows[0];
		expect(Number(rows.n)).toBe(0);
	});
});

describe("storage failure", () => {
	it("answers 503 storage_unavailable, never a success, when the database is unreachable", async () => {
		const handle = linkOperations({
			origin: new URL("https://qrwty.io"),
			keyRing: parseKeyRing(RING),
			hooks: testHooks(undefined),
			reputation: () => async () => "clean",
			onFailure: () => {},
		});
		const down = {
			query: async () => {
				throw Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:1"), {
					code: "ECONNREFUSED",
				});
			},
			execute: async () => ({ rowCount: 0 }),
		};
		const r = await handle({ links: down } as unknown as Dependencies, {
			method: "POST",
			path: "/links",
			rawPath: "/links",
			query: {},
			headers: { "idempotency-key": "k", [GUEST_SCOPE_HEADER]: guest() },
			body: { destination: "https://example.com/x" },
			caller: { signedIn: false },
			signal: new AbortController().signal,
		});
		expect(r.status).toBe(503);
		expect((r.body as { error: { code: string; retryable: boolean } }).error).toMatchObject({
			code: "storage_unavailable",
			retryable: true,
		});
	});
});

// The product SQL on real PostgreSQL 17: the migration sequence, the create function's outcomes,
// and the invariants the database enforces itself (tombstones, versions, grants).
import { randomBytes, randomUUID } from "node:crypto";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sha256 } from "../../src/modules/link-api/link-operations/idempotency.ts";
import {
	createGuestLink,
	findIdempotent,
} from "../../src/modules/link-api/link-operations/store.ts";
import { createTestDatabase, type TestDatabase } from "./postgres.ts";

let t: TestDatabase;
let link: pg.Client;
let replica: ReturnType<TestDatabase["replica"]>;
const S = "m_link_api_link_operations";

const slug = () =>
	randomBytes(10)
		.toString("base64")
		.replace(/[^0-9A-Za-z]/g, "x")
		.slice(0, 10);
const input = (overrides: Partial<Parameters<typeof createGuestLink>[1]> = {}) => {
	const s = overrides.slug ?? slug();
	return {
		scope: sha256(`scope-${randomUUID()}`),
		key: sha256(`key-${randomUUID()}`),
		request: sha256("request"),
		linkId: randomUUID(),
		slug: s,
		destination: `https://example.com/q06/${s}`,
		expiresAt: null,
		shortUrl: `https://qrwty.io/${s}`,
		proofSha256: sha256(randomUUID()),
		sealed: Buffer.from([1, 2, 3]),
		clockOffsetMs: 0,
		...overrides,
	};
};
const count = async (table: string) =>
	Number((await link.query(`SELECT count(*) AS n FROM ${S}.${table}`)).rows[0].n);

const counts = async () => {
	const out: number[] = [];
	for (const table of ["links", "link_versions", "link_claims", "idempotency_records"])
		out.push(await count(table));
	return out;
};

beforeAll(async () => {
	t = await createTestDatabase();
	await t.migrate();
	link = await t.client("link");
	replica = t.replica();
});
afterAll(async () => {
	await link?.end();
	await replica?.end();
	await t?.drop();
});

describe("migration sequence", () => {
	it("is re-runnable and applies each step once", async () => {
		await t.migrate();
		await t.migrate();
		const owner = await t.client("owner");
		const rows = (
			await owner.query(`SELECT version, name FROM ${S}.product_migrations ORDER BY version`)
		).rows;
		await owner.end();
		expect(rows).toEqual([
			{ version: 1, name: "Q06: links, versions, claim proofs, idempotency records" },
			{ version: 2, name: "A3: owner keys, account usage, account erasures" },
		]);
		expect((await link.query(`SELECT id, name FROM ${S}.domains`)).rows).toEqual([
			{ id: 1, name: "primary" },
		]);
	});
});

describe("create_guest_link", () => {
	it("writes the link, version 1, the claim proof's hash and the idempotency record together", async () => {
		const i = input({ expiresAt: new Date(Date.now() + 3_600_000).toISOString() });
		const r = await createGuestLink(replica.db, i);
		expect(r.outcome).toBe("created");
		if (r.outcome !== "created") return;
		expect(r.status).toBe(201);
		expect(r.body).toMatchObject({
			id: i.linkId,
			shortUrl: i.shortUrl,
			destination: i.destination,
			version: 1,
			state: "active",
			owned: false,
		});
		expect(r.body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
		const claimAt = Date.parse((r.body.claim as { expiresAt: string }).expiresAt);
		expect(claimAt - Date.parse(r.body.createdAt as string)).toBe(86_400_000);
		const row = (await link.query(`SELECT * FROM ${S}.links WHERE id = $1`, [i.linkId])).rows[0];
		expect(row).toMatchObject({ slug: i.slug, state: "active", version: 1, owner_subject: null });
		const version = (
			await link.query(`SELECT * FROM ${S}.link_versions WHERE link_id = $1`, [i.linkId])
		).rows;
		expect(version).toEqual([
			expect.objectContaining({ version: 1, change: "create", actor: "guest", owned: false }),
		]);
		const claim = (
			await link.query(`SELECT * FROM ${S}.link_claims WHERE link_id = $1`, [i.linkId])
		).rows[0];
		expect(claim.proof_sha256).toEqual(i.proofSha256);
		expect(claim.consumed_at).toBeNull();
		const found = await findIdempotent(replica.db, i.scope, i.key, 0);
		expect(found?.requestSha256).toEqual(i.request);
		expect(found?.body).toEqual(r.body);
		expect(found?.sealed).toEqual(i.sealed);
	});
	it("replays the same scope, key and request; refuses another request under the key", async () => {
		const i = input();
		const first = await createGuestLink(replica.db, i);
		const again = await createGuestLink(replica.db, { ...i, linkId: randomUUID(), slug: slug() });
		expect(again.outcome).toBe("replay");
		if (again.outcome === "replay" && first.outcome === "created")
			expect(again.body).toEqual(first.body);
		const other = await createGuestLink(replica.db, {
			...i,
			request: sha256("other"),
			linkId: randomUUID(),
			slug: slug(),
		});
		expect(other.outcome).toBe("conflict");
	});
	it("rolls everything back on a taken slug", async () => {
		const existing = input();
		await createGuestLink(replica.db, existing);
		const before = await counts();
		const collide = input({ slug: existing.slug, destination: "https://example.com/other" });
		expect((await createGuestLink(replica.db, collide)).outcome).toBe("collision");
		const after = await counts();
		expect(after).toEqual(before);
		expect(await findIdempotent(replica.db, collide.scope, collide.key, 0)).toBeUndefined();
		const kept = (
			await link.query(`SELECT destination FROM ${S}.links WHERE slug = $1`, [existing.slug])
		).rows;
		expect(kept).toEqual([{ destination: existing.destination }]);
	});
	it("refuses an expiry not after the database clock, writing nothing", async () => {
		const before = await count("links");
		const r = await createGuestLink(
			replica.db,
			input({ expiresAt: new Date(Date.now() - 1000).toISOString() }),
		);
		expect(r.outcome).toBe("invalid-expiry");
		expect(await count("links")).toBe(before);
	});
	it("ends a key's window after 24 hours on the database clock", async () => {
		const i = input();
		await createGuestLink(replica.db, i);
		const later = 24 * 3_600_000 + 1000;
		expect(await findIdempotent(replica.db, i.scope, i.key, later)).toBeUndefined();
		const reused = await createGuestLink(replica.db, {
			...i,
			linkId: randomUUID(),
			slug: slug(),
			request: sha256("a new request"),
			proofSha256: sha256(randomUUID()),
			clockOffsetMs: later,
		});
		expect(reused.outcome).toBe("created");
	});
	it("purges a bounded batch of expired records on each create", async () => {
		for (let n = 0; n < 20; n++) await createGuestLink(replica.db, input());
		const total = await count("idempotency_records");
		await createGuestLink(replica.db, input({ clockOffsetMs: 25 * 3_600_000 }));
		const left = await count("idempotency_records");
		expect(total + 1 - left).toBeGreaterThanOrEqual(16);
		expect(total + 1 - left).toBeLessThanOrEqual(17);
	});
});

describe("invariants the database enforces", () => {
	let id: string;
	beforeAll(async () => {
		const i = input();
		await createGuestLink(replica.db, i);
		id = i.linkId;
	});
	const fails = (sql: string, values: unknown[], code: string) =>
		expect(link.query(sql, values)).rejects.toMatchObject({ code });
	it("never deletes a link", () => fails(`DELETE FROM ${S}.links WHERE id = $1`, [id], "QRW10"));
	it("raises the version by exactly one", async () => {
		await fails(`UPDATE ${S}.links SET state = 'disabled' WHERE id = $1`, [id], "QRW14");
		await fails(`UPDATE ${S}.links SET version = version + 2 WHERE id = $1`, [id], "QRW14");
	});
	it("never changes a slug", () =>
		fails(
			`UPDATE ${S}.links SET slug = 'ZZZZZZZZZZ', version = version + 1 WHERE id = $1`,
			[id],
			"QRW12",
		));
	it("keeps a deleted link a permanent tombstone, with its history", async () => {
		await link.query("SELECT set_config('qrwty.link_change', 'delete', false)");
		await link.query(
			`UPDATE ${S}.links SET state = 'deleted', deleted_at = now(), updated_at = now(), version = version + 1 WHERE id = $1`,
			[id],
		);
		await link.query("SELECT set_config('qrwty.link_change', '', false)");
		await fails(
			`UPDATE ${S}.links SET state = 'active', deleted_at = NULL, version = version + 1 WHERE id = $1`,
			[id],
			"QRW13",
		);
		const history = (
			await link.query(
				`SELECT version, state, change FROM ${S}.link_versions WHERE link_id = $1 ORDER BY version`,
				[id],
			)
		).rows;
		expect(history).toEqual([
			{ version: 1, state: "active", change: "create" },
			{ version: 2, state: "deleted", change: "delete" },
		]);
		await fails(`UPDATE ${S}.link_versions SET state = 'active' WHERE link_id = $1`, [id], "QRW15");
		await fails(`DELETE FROM ${S}.link_versions WHERE link_id = $1`, [id], "QRW15");
	});
	it("refuses a slug that is not 10 base62 characters, and a non-http destination", async () => {
		await fails(
			`INSERT INTO ${S}.links (id, domain_id, slug, destination, state, version, created_at, updated_at) VALUES ($1, 1, $2, 'https://example.com/', 'active', 1, now(), now())`,
			[randomUUID(), "healthz"],
			"23514",
		);
		await fails(
			`INSERT INTO ${S}.links (id, domain_id, slug, destination, state, version, created_at, updated_at) VALUES ($1, 1, 'AAAAAAAAA1', 'javascript:alert(1)', 'active', 1, now(), now())`,
			[randomUUID()],
			"23514",
		);
	});
	it("gives Redirect and Account API the routing view only", async () => {
		for (const role of ["redirect", "account"] as const) {
			const c = await t.client(role);
			try {
				await expect(c.query(`SELECT * FROM ${S}.links`)).rejects.toMatchObject({ code: "42501" });
				await expect(c.query(`SELECT * FROM ${S}.link_claims`)).rejects.toMatchObject({
					code: "42501",
				});
				await expect(c.query(`SELECT * FROM ${S}.idempotency_records`)).rejects.toMatchObject({
					code: "42501",
				});
				const view = await c.query("SELECT * FROM published.link_routes WHERE link_id = $1", [id]);
				expect(Object.keys(view.rows[0] ?? {}).sort()).toEqual(
					["destination", "domain_id", "expires_at", "link_id", "slug", "state", "version"].sort(),
				);
				expect(view.rows[0]).toMatchObject({ state: "deleted", destination: null });
			} finally {
				await c.end();
			}
		}
	});
});

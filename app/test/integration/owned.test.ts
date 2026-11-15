// A3 against a real PostgreSQL 17 (infra/local/test-postgres.sh): claim, the account's list,
// edit, disable, delete, owned create with its quota, and account erasure, through Link API's and
// Account API's own routes with each tile's own login; and the Sessions SQL.
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Dependencies as AccountDependencies } from "../../src/modules/account-api/account-api-my-links.slots.ts";
import { myLinks } from "../../src/modules/account-api/my-links/routes.ts";
import type { ModuleRequest, ModuleResponse } from "../../src/modules/entry.ts";
import type { Dependencies } from "../../src/modules/link-api/link-api-link-operations.slots.ts";
import { GUEST_SCOPE_HEADER } from "../../src/modules/link-api/link-operations/create.ts";
import { parseKeyRing } from "../../src/modules/link-api/link-operations/replay-seal.ts";
import { linkOperations } from "../../src/modules/link-api/link-operations/service.ts";
import { testHooks } from "../../src/modules/link-api/link-operations/test-hooks.ts";
import { createTestDatabase, type TestDatabase, testServer } from "./postgres.ts";

const origin = new URL("https://qrwty.io");
let database: TestDatabase;
let link: ReturnType<TestDatabase["pool"]>;
let account: ReturnType<TestDatabase["pool"]>;
const hooks = testHooks("on");
const handle = linkOperations({
	origin,
	keyRing: parseKeyRing(`k1 ${Buffer.alloc(32, 7).toString("base64url")}`),
	hooks,
	reputation: () => async () => "clean",
	onFailure: (what, error) => console.error(what, error),
});

const caller = (subject?: string): ModuleRequest["caller"] =>
	subject ? { signedIn: true, principal: { subject, claims: {} } } : { signedIn: false };
const request = (
	method: string,
	path: string,
	options: Partial<ModuleRequest> & { subject?: string } = {},
): ModuleRequest => ({
	method,
	path,
	rawPath: path,
	query: {},
	headers: {},
	body: undefined,
	signal: new AbortController().signal,
	...options,
	caller: caller(options.subject),
});
const linkApi = (r: ModuleRequest) =>
	handle({ links: link.db } as unknown as Dependencies, r) as Promise<ModuleResponse>;
const accountApi = (r: ModuleRequest) =>
	myLinks(r, {
		links: account.db,
		settings: { QRWTY_PUBLIC_ORIGIN_URL: origin },
	} as AccountDependencies);
const code = (r: ModuleResponse) => (r.body as { error?: { code?: string } }).error?.code;
type Link = { id: string; version: number; state: string; claim?: { token: string } };

async function guestLink(destination = "https://example.com/a") {
	const r = await linkApi(
		request("POST", "/links", {
			headers: {
				"idempotency-key": randomBytes(8).toString("hex"),
				[GUEST_SCOPE_HEADER]: randomBytes(24).toString("base64url"),
			},
			body: { destination },
		}),
	);
	expect(r.status).toBe(201);
	return r.body as Link & { claim: { token: string } };
}
const claim = (id: string, token: string, subject: string, key = randomBytes(6).toString("hex")) =>
	linkApi(
		request("POST", `/links/${id}/claim`, {
			subject,
			headers: { "idempotency-key": key },
			body: { claimToken: token },
		}),
	);

beforeAll(async () => {
	testServer();
	database = await createTestDatabase();
	await database.migrate();
	link = database.pool("link");
	account = database.pool("account");
});
afterAll(async () => {
	await link?.end();
	await account?.end();
	await database?.drop();
});

describe("claim", () => {
	it("gives the link to the proof holder once, and nothing to anyone else", async () => {
		const created = await guestLink();
		const wrong = await claim(created.id, randomBytes(32).toString("base64url"), "auth0|bob");
		expect(wrong.status).toBe(403);
		expect(code(wrong)).toBe("claim_invalid");
		const won = await claim(created.id, created.claim.token, "auth0|alice", "k-alice");
		expect(won.status).toBe(200);
		expect(won.body).toMatchObject({ id: created.id, version: 2, owned: true });
		const replay = await claim(created.id, created.claim.token, "auth0|alice", "k-alice");
		expect(replay.status).toBe(200);
		expect(replay.headers?.["Idempotent-Replayed"]).toBe("true");
		const repeat = await claim(created.id, created.claim.token, "auth0|alice");
		expect(repeat.status).toBe(200);
		const lost = await claim(created.id, created.claim.token, "auth0|bob");
		expect(lost.status).toBe(409);
		expect(code(lost)).toBe("claim_consumed");
		expect(JSON.stringify(lost.body)).not.toContain("alice");
		const conflict = await linkApi(
			request("POST", `/links/${created.id}/claim`, {
				subject: "auth0|alice",
				headers: { "idempotency-key": "k-alice" },
				body: { claimToken: randomBytes(32).toString("base64url") },
			}),
		);
		expect(conflict.status).toBe(409);
		expect(code(conflict)).toBe("idempotency_conflict");
	});
	it("has one winner among parallel claims of two accounts", async () => {
		const created = await guestLink();
		const results = await Promise.all(
			Array.from({ length: 6 }, (_, n) =>
				claim(created.id, created.claim.token, n % 2 ? "auth0|par-a" : "auth0|par-b"),
			),
		);
		const winners = results.filter((r) => r.status === 200);
		const owners = new Set(winners.map((r) => (r.body as { id: string }).id));
		expect(owners.size).toBe(1);
		expect(results.every((r) => r.status === 200 || r.status === 409)).toBe(true);
		const listA = await accountApi(request("GET", "/links", { subject: "auth0|par-a" }));
		const listB = await accountApi(request("GET", "/links", { subject: "auth0|par-b" }));
		const counts = [listA, listB].map((r) => (r.body as { items: unknown[] }).items.length);
		expect(counts.sort()).toEqual([0, 1]);
	});
	it("refuses an expired proof with 410 and leaves the link a guest link", async () => {
		const created = await guestLink();
		hooks.handle(request("POST", "/__test/clock", { body: { offsetMs: 24 * 3_600_000 + 1000 } }));
		const r = await claim(created.id, created.claim.token, "auth0|late");
		hooks.handle(request("POST", "/__test/clock", { body: { offsetMs: 0 } }));
		expect(r.status).toBe(410);
		expect(code(r)).toBe("claim_expired");
		const ok = await claim(created.id, created.claim.token, "auth0|late");
		expect(ok.status).toBe(200);
	});
});

describe("owned links", () => {
	it("lists, reads, edits, disables and deletes only the owner's links", async () => {
		const subject = "auth0|carol";
		const ids: string[] = [];
		for (let n = 0; n < 3; n++) {
			const created = await guestLink(`https://example.com/${n}`);
			expect((await claim(created.id, created.claim.token, subject)).status).toBe(200);
			ids.push(created.id);
		}
		const page1 = await accountApi(request("GET", "/links", { subject, query: { limit: "2" } }));
		const body1 = page1.body as { items: Link[]; nextCursor: string };
		expect(body1.items.map((l) => l.id)).toEqual([ids[2], ids[1]]);
		const page2 = await accountApi(
			request("GET", "/links", { subject, query: { cursor: body1.nextCursor } }),
		);
		const body2 = page2.body as { items: Link[]; nextCursor: string | null };
		expect(body2.items.map((l) => l.id)).toEqual([ids[0]]);
		expect(body2.nextCursor).toBeNull();
		const foreign = await accountApi(
			request("GET", "/links", { subject: "auth0|dave", query: { cursor: body1.nextCursor } }),
		);
		expect(foreign.status).toBe(400);
		expect(code(foreign)).toBe("invalid_cursor");
		expect(
			(await accountApi(request("GET", "/links", { subject, query: { limit: "51" } }))).status,
		).toBe(400);

		const id = ids[0] as string;
		expect((await linkApi(request("GET", `/links/${id}`, { subject: "auth0|dave" }))).status).toBe(
			404,
		);
		const read = await linkApi(request("GET", `/links/${id}`, { subject }));
		expect(read.headers?.ETag).toBe('"2"');
		const edit = (version: string | undefined, body: unknown, who = subject) =>
			linkApi(
				request("PATCH", `/links/${id}`, {
					subject: who,
					headers: version ? { "if-match": version } : {},
					body,
				}),
			);
		expect((await edit(undefined, { destination: "https://example.org/x" })).status).toBe(428);
		expect((await edit('"1"', { destination: "https://example.org/x" })).status).toBe(412);
		expect((await edit('"2"', { destination: "https://example.org/x" }, "auth0|dave")).status).toBe(
			404,
		);
		const edited = await edit('"2"', { destination: "https://example.org/x" });
		expect(edited.status).toBe(200);
		expect(edited.body).toMatchObject({ destination: "https://example.org/x", version: 3 });
		const parallel = await Promise.all(
			Array.from({ length: 5 }, () => edit('"3"', { state: "disabled" })),
		);
		expect(parallel.filter((r) => r.status === 200)).toHaveLength(1);
		expect(parallel.filter((r) => r.status === 412)).toHaveLength(4);
		expect(
			(await linkApi(request("DELETE", `/links/${id}`, { subject: "auth0|dave" }))).status,
		).toBe(404);
		expect((await linkApi(request("DELETE", `/links/${id}`, { subject }))).status).toBe(204);
		expect((await linkApi(request("DELETE", `/links/${id}`, { subject }))).status).toBe(204);
		expect((await linkApi(request("GET", `/links/${id}`, { subject }))).status).toBe(404);
		const me = await accountApi(request("GET", "/me", { subject }));
		expect(me.body).toEqual({ ownedLinks: 2 });
	});
	it("creates owned links within the month's test allowance, then 403", async () => {
		const subject = "auth0|erin";
		const create = (n: number) =>
			linkApi(
				request("POST", "/links", {
					subject,
					headers: { "idempotency-key": `owned-${n}` },
					body: { destination: `https://example.com/owned/${n}` },
				}),
			);
		const results: ModuleResponse[] = [];
		for (let n = 0; n < 6; n++) results.push(await create(n));
		expect(results.slice(0, 5).map((r) => r.status)).toEqual([201, 201, 201, 201, 201]);
		expect(results[0]?.body).toMatchObject({ owned: true, version: 1 });
		expect((results[0]?.body as Record<string, unknown> | undefined)?.claim).toBeUndefined();
		expect(results[5]?.status).toBe(403);
		expect(results[5]?.body).toMatchObject({
			error: { code: "quota_exceeded", limit: 5, used: 5 },
		});
		const replay = await create(0);
		expect(replay.status).toBe(201);
		expect(replay.headers?.["Idempotent-Replayed"]).toBe("true");
		const created = await guestLink();
		const over = await claim(created.id, created.claim.token, subject);
		expect(over.status).toBe(403);
		expect(code(over)).toBe("quota_exceeded");
	});
	it("erases an account: its links disabled and ownerless, its list empty", async () => {
		const subject = "auth0|frank";
		const created = await guestLink();
		await claim(created.id, created.claim.token, subject);
		const erased = await linkApi(request("POST", "/account/erase", { subject }));
		expect(erased.body).toEqual({ linksDisabled: 1 });
		const list = await accountApi(request("GET", "/links", { subject }));
		expect((list.body as { items: unknown[] }).items).toHaveLength(0);
		const owner = await database.client("owner");
		try {
			const { rows } = await owner.query(
				"SELECT state, owner_subject, owner_key FROM m_link_api_link_operations.links WHERE id = $1",
				[created.id],
			);
			expect(rows[0]).toEqual({ state: "disabled", owner_subject: null, owner_key: null });
		} finally {
			await owner.end();
		}
		const again = await claim(created.id, created.claim.token, "auth0|other");
		expect(again.status).toBe(409);
		expect((await linkApi(request("POST", "/account/erase", { subject }))).body).toEqual({
			linksDisabled: 0,
		});
	});
});

describe("sessions SQL", () => {
	it("runs re-runnably and keeps attempts one-time and sessions revocable", async () => {
		const server = testServer();
		const name = `d_sessions_a3_${randomBytes(4).toString("hex")}`;
		const admin = new pg.Client({ ...server, user: "postgres", database: "postgres" });
		await admin.connect();
		await admin.query(`CREATE DATABASE ${name}`);
		await admin.end();
		const db = new pg.Client({ ...server, user: "postgres", database: name });
		await db.connect();
		try {
			const products = await import(pathToFileURL(resolve("scripts/products.mjs")).href);
			const plan = {
				database: name,
				resource: "sessions",
				modules: [
					{
						file: "infra/postgres/sessions/modules/session-api-sign-in-flow.sql",
						host: "session-api",
						module: "session-api-sign-in-flow",
						schema: "m_session_api_sign_in_flow",
					},
				],
			};
			const q = (n: string) => `"${n}"`;
			for (let run = 0; run < 2; run++) {
				await db.query("BEGIN");
				await products.applyProductSql(db, plan, q);
				await db.query("COMMIT");
			}
			const h = (s: string) => Buffer.alloc(32, s);
			const s = "m_session_api_sign_in_flow";
			await db.query(`SELECT ${s}.begin_login($1, $2, $3, $4, '/x')`, [
				h("s"),
				h("b"),
				h("n"),
				h("v"),
			]);
			const first = await db.query(`SELECT * FROM ${s}.take_login($1)`, [h("s")]);
			expect(first.rows[0]).toMatchObject({ return_to: "/x", live: true });
			expect((await db.query(`SELECT * FROM ${s}.take_login($1)`, [h("s")])).rows).toHaveLength(0);
			await db.query(
				`SELECT ${s}.create_session($1, $2, $3, now() + interval '5 minutes', 604800, NULL)`,
				[h("i"), h("k"), h("t")],
			);
			expect(
				(await db.query(`SELECT * FROM ${s}.use_session($1, 86400)`, [h("i")])).rows[0],
			).toMatchObject({
				status: "active",
			});
			expect(
				(await db.query(`SELECT ${s}.store_tokens($1, 1, $2, now()) AS ok`, [h("i"), h("u")]))
					.rows[0],
			).toEqual({ ok: true });
			expect(
				(await db.query(`SELECT ${s}.store_tokens($1, 1, $2, now()) AS ok`, [h("i"), h("w")]))
					.rows[0],
			).toEqual({ ok: false });
			await db.query(`SELECT ${s}.create_session($1, $2, $3, now(), 604800, $4)`, [
				h("j"),
				h("k"),
				h("t"),
				h("i"),
			]);
			expect(
				(await db.query(`SELECT status FROM ${s}.use_session($1, 86400)`, [h("i")])).rows[0],
			).toEqual({ status: "revoked" });
			const ended = await db.query(`SELECT * FROM ${s}.revoke_account($1)`, [h("k")]);
			expect(ended.rows).toHaveLength(1);
			expect(
				(await db.query(`SELECT status FROM ${s}.use_session($1, 86400)`, [h("j")])).rows[0],
			).toEqual({ status: "revoked" });
			expect(
				(await db.query(`SELECT status FROM ${s}.use_session($1, 86400)`, [h("z")])).rows[0],
			).toEqual({ status: "unknown" });
			const tokens = await db.query(`SELECT octet_length(tokens_sealed) AS n FROM ${s}.sessions`);
			expect(tokens.rows.every((row) => row.n === 0)).toBe(true);
		} finally {
			await db.end();
			const drop = new pg.Client({ ...server, user: "postgres", database: "postgres" });
			await drop.connect();
			await drop.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
			await drop.end();
		}
	});
});

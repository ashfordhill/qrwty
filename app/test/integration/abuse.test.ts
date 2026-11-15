// A6 (Q09) against a real PostgreSQL 17 (infra/local/test-postgres.sh): reports, operator block and
// unblock with their records, the routing view the Redirect service reads, tombstones and replays,
// through Link API's own routes and login; the product SQL applied twice.
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ModuleRequest, ModuleResponse } from "../../src/modules/entry.ts";
import { createAdmission } from "../../src/modules/link-api/abuse-and-moderation/admission.ts";
import {
	OPERATOR_HEADERS,
	operatorPayload,
	operatorSignature,
	operatorSubjects,
} from "../../src/modules/link-api/abuse-and-moderation/operator.ts";
import { moderationRoutes } from "../../src/modules/link-api/abuse-and-moderation/routes.ts";
import type { Dependencies as AbuseDependencies } from "../../src/modules/link-api/link-api-abuse-and-moderation.slots.ts";
import type { Dependencies } from "../../src/modules/link-api/link-api-link-operations.slots.ts";
import { GUEST_SCOPE_HEADER } from "../../src/modules/link-api/link-operations/create.ts";
import { parseKeyRing } from "../../src/modules/link-api/link-operations/replay-seal.ts";
import { linkOperations } from "../../src/modules/link-api/link-operations/service.ts";
import { testHooks } from "../../src/modules/link-api/link-operations/test-hooks.ts";
import { createTestDatabase, type TestDatabase, testServer } from "./postgres.ts";

const origin = new URL("https://qrwty.io");
const operatorKey = new TextEncoder().encode("o".repeat(64));
let database: TestDatabase;
let link: ReturnType<TestDatabase["pool"]>;
const values = new Map<string, string>();
const cache = {
	get: async (key: string) => values.get(key),
	set: async (key: string, value: string) => void values.set(key, value),
	delete: async (key: string) => void values.delete(key),
};
const operations = linkOperations({
	origin,
	keyRing: parseKeyRing(`k1 ${Buffer.alloc(32, 7).toString("base64url")}`),
	hooks: testHooks("on"),
	reputation: () => async () => "clean",
	onFailure: (what, error) => console.error(what, error),
});
const moderation = moderationRoutes({
	origin,
	subjects: operatorSubjects("auth0|operator"),
	operatorKey,
	admission: createAdmission(),
	onFailure: (what, error) => console.error(what, error),
});

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
	caller: options.subject
		? { signedIn: true, principal: { subject: options.subject, claims: {} } }
		: { signedIn: false },
});
const abuse = (r: ModuleRequest) =>
	moderation(r, { links: link.db, admissionCache: cache } as unknown as AbuseDependencies);
const code = (r: ModuleResponse) => (r.body as { error?: { code?: string } }).error?.code;
type Link = { id: string; shortUrl: string; version: number; state: string };

async function guestLink(): Promise<Link> {
	const r = await operations({ links: link.db } as unknown as Dependencies, {
		...request("POST", "/links"),
		headers: {
			"idempotency-key": randomBytes(8).toString("hex"),
			[GUEST_SCOPE_HEADER]: randomBytes(24).toString("base64url"),
		},
		body: { destination: "https://example.com/reported?q=1" },
	});
	expect(r.status).toBe(201);
	return r.body as Link;
}
const slugOf = (l: Link) => new URL(l.shortUrl).pathname.slice(1);
async function route(slug: string) {
	const c = await database.client("redirect");
	try {
		const { rows } = await c.query(
			"SELECT state, version, destination FROM published.link_routes WHERE domain_id = 1 AND slug = $1",
			[slug],
		);
		return rows[0] as { state: string; version: number; destination: string | null };
	} finally {
		await c.end();
	}
}
/** A request as the operator CLI signs it. */
function cli(
	method: string,
	path: string,
	reason?: string,
	nonce = randomBytes(18).toString("base64url"),
) {
	const time = String(Math.floor(Date.now() / 1000));
	const actor = "owner@example.com";
	return request(method, `/operator${path}`, {
		headers: {
			[OPERATOR_HEADERS.actor]: actor,
			[OPERATOR_HEADERS.time]: time,
			[OPERATOR_HEADERS.nonce]: nonce,
			[OPERATOR_HEADERS.signature]: operatorSignature(
				operatorKey,
				operatorPayload({ method, path, time, nonce, actor, reason: reason ?? "" }),
			),
		},
		...(reason === undefined ? {} : { body: { reason } }),
	});
}

beforeAll(async () => {
	testServer();
	database = await createTestDatabase();
	await database.migrate();
	await database.migrate();
	link = database.pool("link");
});
afterAll(async () => {
	await link?.end();
	await database?.drop();
});

describe("reports", () => {
	it("count by link, reporter and reason, never change the link, and say nothing of unknown ones", async () => {
		const created = await guestLink();
		for (const [reason, key] of [
			["phishing", "A".repeat(43)],
			["phishing", "A".repeat(43)],
			["malware", "B".repeat(43)],
		] as const) {
			const r = await abuse({
				...request("POST", "/reports"),
				headers: { "qrwty-admission-key": key },
				body: { shortUrl: created.shortUrl, reason, details: "looks like a bank" },
			});
			expect(r.status).toBe(202);
		}
		const unknown = await abuse({
			...request("POST", "/reports"),
			body: { shortUrl: "https://qrwty.io/Zz0Zz0Zz0Z", reason: "spam" },
		});
		expect(unknown.status).toBe(202);
		expect(await route(slugOf(created))).toMatchObject({ state: "active", version: 1 });
		const seen = await abuse(cli("GET", `/links/by-slug/${slugOf(created)}`));
		expect(seen.status).toBe(200);
		expect(seen.body).toMatchObject({
			id: created.id,
			state: "active",
			owned: false,
			reports: { total: 3, byReason: { phishing: 2, malware: 1 } },
			actions: [],
		});
		const owner = await database.client("owner");
		try {
			const { rows } = await owner.query(
				"SELECT count(*)::int AS rows FROM m_link_api_abuse_and_moderation.abuse_reports",
			);
			expect(rows[0]?.rows).toBe(2);
		} finally {
			await owner.end();
		}
	});
});

describe("operator block and unblock", () => {
	it("blocks (403 route, no destination), records actor and reason, and restores the state", async () => {
		const created = await guestLink();
		const slug = slugOf(created);
		const blocked = await abuse(cli("POST", `/links/${created.id}/block`, "phishing kit"));
		expect(blocked.status).toBe(200);
		expect(blocked.body).toMatchObject({ state: "blocked", version: 2, changed: true });
		expect(await route(slug)).toEqual({ state: "blocked", version: 2, destination: null });
		const again = await abuse(cli("POST", `/links/${created.id}/block`, "still bad"));
		expect(again.body).toMatchObject({ state: "blocked", version: 2, changed: false });
		const unblocked = await abuse({
			...request("POST", `/operator/links/${created.id}/unblock`, { subject: "auth0|operator" }),
			body: { reason: "false positive" },
		});
		expect(unblocked.status).toBe(200);
		expect(unblocked.body).toMatchObject({ state: "active", version: 3 });
		expect((await route(slug)).destination).toBe("https://example.com/reported?q=1");
		const seen = await abuse(cli("GET", `/links/by-slug/${slug}`));
		const actions = (seen.body as { actions: { action: string; actor: string; reason: string }[] })
			.actions;
		expect(actions.map((a) => [a.action, a.actor, a.reason])).toEqual([
			["unblock", "account:auth0|operator", "false positive"],
			["block", "cli:owner@example.com", "still bad"],
			["block", "cli:owner@example.com", "phishing kit"],
		]);
		const owner = await database.client("owner");
		try {
			const { rows } = await owner.query(
				"SELECT version, state, change, actor FROM m_link_api_link_operations.link_versions WHERE link_id = $1 ORDER BY version",
				[created.id],
			);
			expect(rows).toEqual([
				{ version: 1, state: "active", change: "create", actor: "guest" },
				{ version: 2, state: "blocked", change: "block", actor: "operator" },
				{ version: 3, state: "active", change: "unblock", actor: "operator" },
			]);
		} finally {
			await owner.end();
		}
	});

	it("refuses a replayed CLI request, a tombstone and anyone who isn't an operator", async () => {
		const created = await guestLink();
		const nonce = randomBytes(18).toString("base64url");
		expect((await abuse(cli("POST", `/links/${created.id}/block`, "x", nonce))).status).toBe(200);
		const replay = await abuse(cli("POST", `/links/${created.id}/block`, "x", nonce));
		expect(replay.status).toBe(409);
		expect(code(replay)).toBe("replayed");
		const alice = await abuse({
			...request("POST", `/operator/links/${created.id}/unblock`, { subject: "auth0|alice" }),
			body: { reason: "mine" },
		});
		expect(alice.status).toBe(404);
		expect((await abuse(request("GET", `/operator/links/by-slug/${slugOf(created)}`))).status).toBe(
			404,
		);
		const unknown = await abuse(
			cli("POST", "/links/00000000-0000-4000-8000-000000000000/block", "x"),
		);
		expect(unknown.status).toBe(404);
		const owner = await database.client("owner");
		try {
			await owner.query("SELECT set_config('qrwty.link_change', 'delete', false)");
			await owner.query(
				"UPDATE m_link_api_link_operations.links SET state = 'deleted', deleted_at = now(), version = version + 1 WHERE id = $1",
				[created.id],
			);
		} finally {
			await owner.end();
		}
		const tombstone = await abuse(cli("POST", `/links/${created.id}/unblock`, "x"));
		expect(tombstone.status).toBe(409);
		expect(code(tombstone)).toBe("link_deleted");
		expect((await route(slugOf(created))).state).toBe("deleted");
	});
});

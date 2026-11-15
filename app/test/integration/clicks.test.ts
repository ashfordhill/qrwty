// A4 against a real PostgreSQL 17 (infra/local/test-postgres.sh): a guest link claimed by an
// account, its redirect through Links' routing view with the Redirect service's own login, the
// click event it published fed to the Click aggregator on a fresh Analytics database (the module's
// product SQL, applied and granted as migrate.mjs does), and the owner's analytics and CSV through
// Account API's routes with Account API's logins.
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { analyticsRoutes } from "../../src/modules/account-api/link-analytics/routes.ts";
import { clickAggregator, SCHEMA } from "../../src/modules/analytics-worker/clicks/aggregate.ts";
import type {
	CacheClient,
	DatabaseReader,
	DatabaseReadWriter,
} from "../../src/modules/dependencies.ts";
import type { ModuleMessage, ModuleRequest, ModuleResponse } from "../../src/modules/entry.ts";
import type { Dependencies } from "../../src/modules/link-api/link-api-link-operations.slots.ts";
import { GUEST_SCOPE_HEADER } from "../../src/modules/link-api/link-operations/create.ts";
import { parseKeyRing } from "../../src/modules/link-api/link-operations/replay-seal.ts";
import { linkOperations } from "../../src/modules/link-api/link-operations/service.ts";
import { testHooks } from "../../src/modules/link-api/link-operations/test-hooks.ts";
import { redirects } from "../../src/modules/redirect-service/redirect/redirect.ts";
import { createTestDatabase, type TestDatabase, testServer } from "./postgres.ts";

const origin = new URL("https://qrwty.io");
const quote = (name: string) => {
	if (!/^[a-z][a-z0-9_]{0,62}$/.test(name)) throw new Error("bad identifier");
	return `"${name}"`;
};
type Products = {
	applyProductSql(owner: pg.Client, db: unknown, q: typeof quote): Promise<void>;
	grantProductSql(owner: pg.Client, db: unknown, runtime: unknown, q: typeof quote): Promise<void>;
};

/** A fresh Analytics database with its owner, the worker's and Account API's logins. */
async function createAnalytics() {
	const server = testServer();
	const suffix = randomBytes(4).toString("hex");
	const database = `d_analytics_a4_${suffix}`;
	const login = (role: string) => ({
		user: `${role}_${suffix}`,
		password: randomBytes(18).toString("hex"),
	});
	const logins = {
		owner: login("o_analytics"),
		worker: login("r_analytics__analytics_worker"),
		account: login("r_analytics__account_api"),
	};
	const admin = new pg.Client({ ...server, user: "postgres", database: "postgres" });
	await admin.connect();
	try {
		for (const { user, password } of Object.values(logins))
			await admin.query(`CREATE ROLE ${quote(user)} LOGIN PASSWORD '${password}'`);
		await admin.query(`CREATE DATABASE ${quote(database)} OWNER ${quote(logins.owner.user)}`);
		await admin.query(`REVOKE ALL ON DATABASE ${quote(database)} FROM PUBLIC`);
		for (const role of ["worker", "account"] as const)
			await admin.query(
				`GRANT CONNECT ON DATABASE ${quote(database)} TO ${quote(logins[role].user)}`,
			);
	} finally {
		await admin.end();
	}
	const plan = JSON.parse(readFileSync("infra/local.json", "utf8")).databases.find(
		(db: { database: string }) => db.database === "d_analytics",
	);
	const products = (await import(pathToFileURL(resolve("scripts/products.mjs")).href)) as Products;
	const owner = new pg.Client({ ...server, database, ...logins.owner });
	await owner.connect();
	try {
		await owner.query("BEGIN");
		for (const file of plan.migrations) await owner.query(readFileSync(file, "utf8"));
		const runtime = [
			{ user: logins.worker.user, host: "analytics-worker" },
			{ user: logins.account.user, host: "account-api" },
		];
		for (let run = 0; run < 2; run += 1) {
			// Twice, as every start runs it: the file must be re-runnable.
			await products.applyProductSql(owner, { ...plan, database }, quote);
			await products.grantProductSql(owner, { ...plan, database }, runtime, quote);
		}
		await owner.query("COMMIT");
	} catch (error) {
		await owner.query("ROLLBACK");
		throw error;
	} finally {
		await owner.end();
	}
	const pools: pg.Pool[] = [];
	const pool = (role: "worker" | "account" | "owner") => {
		const p = new pg.Pool({ ...server, database, ...logins[role], max: 10 });
		p.on("error", () => {});
		pools.push(p);
		return {
			query: async <R>(sql: string, values?: readonly unknown[]) =>
				(await p.query(sql, values ? [...values] : undefined)).rows as R[],
		};
	};
	return {
		pool,
		async drop() {
			await Promise.all(pools.map((p) => p.end()));
			const a = new pg.Client({ ...server, user: "postgres", database: "postgres" });
			await a.connect();
			try {
				await a.query(`DROP DATABASE IF EXISTS ${quote(database)} WITH (FORCE)`);
				for (const { user } of Object.values(logins))
					await a.query(`DROP ROLE IF EXISTS ${quote(user)}`);
			} finally {
				await a.end();
			}
		},
	};
}

let links: TestDatabase;
let analytics: Awaited<ReturnType<typeof createAnalytics>>;
let linkPool: ReturnType<TestDatabase["pool"]>;
let accountLinks: ReturnType<TestDatabase["pool"]>;
let redirectLogin: pg.Client;
const handle = linkOperations({
	origin,
	keyRing: parseKeyRing(`k1 ${Buffer.alloc(32, 7).toString("base64url")}`),
	hooks: testHooks("on"),
	reputation: () => async () => "clean",
	onFailure: (what, error) => console.error(what, error),
});
const routes = analyticsRoutes();
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
const linkApi = (r: ModuleRequest) =>
	handle({ links: linkPool.db } as unknown as Dependencies, r) as Promise<ModuleResponse>;

/** A Redirect service copy on the Redirect service's own login, with an in-memory cache. */
function redirectCopy() {
	const published: ModuleMessage[] = [];
	const cache = new Map<string, string>();
	const hotRoutes: CacheClient = {
		get: async (key) => cache.get(key),
		set: async (key, value) => {
			cache.set(key, value);
		},
		delete: async (key) => {
			cache.delete(key);
		},
	};
	const reader: DatabaseReader = {
		query: async <R>(sql: string, values?: readonly unknown[]) =>
			(await redirectLogin.query(sql, values ? [...values] : undefined)).rows as R[],
	};
	const redirect = redirects({
		links: reader,
		hotRoutes,
		clickEvents: {
			publish: async (body, options) => {
				published.push({
					body,
					...(options?.messageId ? { messageId: options.messageId } : {}),
					headers: {},
					attempt: 1,
					source: "click-events--analytics-worker--analytics-worker-click-aggregator",
				});
			},
		},
		origin,
	});
	const get = (slug: string, headers: ModuleRequest["headers"] = {}, method = "GET") =>
		redirect(
			request(method, `/${slug}`, { headers: { "x-forwarded-host": "qrwty.io", ...headers } }),
		);
	return { get, published };
}

let owned: { id: string; slug: string };

beforeAll(async () => {
	testServer();
	links = await createTestDatabase();
	await links.migrate();
	linkPool = links.pool("link");
	accountLinks = links.pool("account");
	redirectLogin = await links.client("redirect");
	analytics = await createAnalytics();
	const created = await linkApi(
		request("POST", "/links", {
			headers: {
				"idempotency-key": randomBytes(8).toString("hex"),
				[GUEST_SCOPE_HEADER]: randomBytes(24).toString("base64url"),
			},
			body: { destination: "https://example.com/landing?x=1" },
		}),
	);
	expect(created.status).toBe(201);
	const link = created.body as { id: string; shortUrl: string; claim: { token: string } };
	const claimed = await linkApi(
		request("POST", `/links/${link.id}/claim`, {
			subject: "auth0|alice",
			headers: { "idempotency-key": "k-claim" },
			body: { claimToken: link.claim.token },
		}),
	);
	expect(claimed.status).toBe(200);
	owned = { id: link.id, slug: new URL(link.shortUrl).pathname.slice(1) };
});
afterAll(async () => {
	await redirectLogin?.end();
	await linkPool?.end();
	await accountLinks?.end();
	await links?.drop();
	await analytics?.drop();
});

describe("redirect through Links' routing view", () => {
	it("302s an active link, refuses an unknown one, and the login sees only the view", async () => {
		const copy = redirectCopy();
		const found = await copy.get(owned.slug, { "user-agent": "Mozilla/5.0 (X11; Linux x86_64)" });
		expect(found.status).toBe(302);
		expect(found.headers?.Location).toBe("https://example.com/landing?x=1");
		expect(copy.published).toHaveLength(1);
		const head = await copy.get(owned.slug, {}, "HEAD");
		expect(head.status).toBe(302);
		expect(copy.published).toHaveLength(1);
		expect((await copy.get("Zz9Zz9Zz9Z")).status).toBe(404);
		await expect(
			redirectLogin.query("SELECT destination FROM m_link_api_link_operations.links"),
		).rejects.toThrow(/permission denied/);
	});

	it("410 once the owner disables the link (a fresh copy has no cached entry)", async () => {
		const read = await linkApi(request("GET", `/links/${owned.id}`, { subject: "auth0|alice" }));
		const disabled = await linkApi(
			request("PATCH", `/links/${owned.id}`, {
				subject: "auth0|alice",
				headers: { "if-match": String(read.headers?.ETag) },
				body: { state: "disabled" },
			}),
		);
		expect(disabled.status).toBe(200);
		const copy = redirectCopy();
		const gone = await copy.get(owned.slug);
		expect(gone.status).toBe(410);
		expect(gone.headers?.Location).toBeUndefined();
		expect(copy.published).toHaveLength(0);
		const again = await linkApi(request("GET", `/links/${owned.id}`, { subject: "auth0|alice" }));
		const enabled = await linkApi(
			request("PATCH", `/links/${owned.id}`, {
				subject: "auth0|alice",
				headers: { "if-match": String(again.headers?.ETag) },
				body: { state: "active" },
			}),
		);
		expect(enabled.status).toBe(200);
	});
});

describe("click aggregation and the owner's analytics", () => {
	it("counts each event ID once, bots apart, quarantines poison once, and shows the owner", async () => {
		const worker = analytics.pool("worker") as unknown as DatabaseReadWriter;
		const aggregate = clickAggregator({ db: worker });
		const copy = redirectCopy();
		expect(
			(await copy.get(owned.slug, { "user-agent": "Mozilla/5.0 (Windows NT 10.0)" })).status,
		).toBe(302);
		expect((await copy.get(owned.slug, { "user-agent": "curl/8.5.0" })).status).toBe(302);
		const [human, bot] = copy.published as [ModuleMessage, ModuleMessage];
		expect(await aggregate(human)).toBe("recorded");
		// A redelivery, and ten copies of the bot's event at once: each ID counts once.
		expect(await aggregate(human)).toBe("duplicate");
		const racing = await Promise.all(Array.from({ length: 10 }, () => aggregate(bot)));
		expect(racing.filter((outcome) => outcome === "recorded")).toHaveLength(1);
		const poison = { ...human, body: Buffer.from("{not json"), messageId: "poison-1" };
		expect(await aggregate(poison)).toBe("quarantined:malformed_json");
		expect(await aggregate(poison)).toBe("quarantined:malformed_json");
		const owner = analytics.pool("owner");
		const [kept] = await owner.query<{ n: string }>(
			`SELECT count(*)::text AS n FROM ${SCHEMA}.click_quarantine WHERE message_id = 'poison-1'`,
		);
		expect(kept?.n).toBe("1");

		const account = analytics.pool("account");
		const answer = await routes(
			request("GET", `/links/${owned.id}/analytics`, { subject: "auth0|alice" }),
			{ links: accountLinks.db, analytics: account },
		);
		expect(answer.status ?? 200).toBe(200);
		const report = answer.body as {
			totals: { recordedAttempts: number; filteredClicks: number };
			series: { date: string; recordedAttempts: number; filteredClicks: number }[];
			freshness: { asOf: string | null; delayed: boolean; lagMs: number | null };
			reconciliation: { status: string };
			breakdowns: null;
			lookback: { maxDays: number };
		};
		expect(report.totals).toEqual({ recordedAttempts: 2, filteredClicks: 1 });
		expect(report.series).toHaveLength(7);
		expect(report.series.at(-1)).toMatchObject({ recordedAttempts: 2, filteredClicks: 1 });
		expect(report.freshness.delayed).toBe(false);
		expect(report.freshness.asOf).not.toBeNull();
		expect(report.breakdowns).toBeNull();
		expect(report.lookback.maxDays).toBe(7);
		// The unattributed poison event is an open quarantine: an incident until repaired.
		expect(report.reconciliation.status).toBe("incident");
		await owner.query(`UPDATE ${SCHEMA}.click_quarantine SET repaired_at = now()`);
		const repaired = await routes(
			request("GET", `/links/${owned.id}/analytics`, { subject: "auth0|alice" }),
			{ links: accountLinks.db, analytics: account },
		);
		expect((repaired.body as typeof report).reconciliation.status).toBe("ok");

		const csv = await routes(
			request("GET", `/links/${owned.id}/analytics.csv`, { subject: "auth0|alice" }),
			{ links: accountLinks.db, analytics: account },
		);
		expect(csv.headers?.["Content-Type"]).toBe("text/csv; charset=utf-8");
		const lines = String(csv.body).trimEnd().split("\r\n");
		expect(lines[0]).toBe("date,recorded_attempts,filtered_clicks");
		expect(lines).toHaveLength(8);
		expect(lines.at(-1)).toMatch(/^\d{4}-\d{2}-\d{2},2,1$/);

		// Another account, and an unknown ID: 404 alike.
		for (const [path, subject] of [
			[`/links/${owned.id}/analytics`, "auth0|bob"],
			[`/links/${owned.id}/analytics.csv`, "auth0|bob"],
			["/links/00000000-0000-4000-8000-000000000000/analytics", "auth0|alice"],
		] as const) {
			const refused = await routes(request("GET", path, { subject }), {
				links: accountLinks.db,
				analytics: account,
			});
			expect(refused.status, path).toBe(404);
		}
		// Account API's login reads the views, never the tables.
		await expect(account.query(`SELECT * FROM ${SCHEMA}.click_receipts`)).rejects.toThrow(
			/permission denied/,
		);
	});

	it("purges receipts past the 35-day horizon in bounded batches", async () => {
		const owner = analytics.pool("owner");
		await owner.query(
			`INSERT INTO ${SCHEMA}.click_receipts (event_id, link_id, event_time, received_at)
			 SELECT gen_random_uuid(), $1::uuid, now() - interval '40 days', now() - interval '40 days'
			 FROM generate_series(1, 5)`,
			[owned.id],
		);
		const worker = analytics.pool("worker");
		const [first] = await worker.query<{ n: number }>(`SELECT ${SCHEMA}.purge_expired(3) AS n`);
		const [second] = await worker.query<{ n: number }>(`SELECT ${SCHEMA}.purge_expired(3) AS n`);
		expect([first?.n, second?.n]).toEqual([3, 2]);
		const [left] = await owner.query<{ n: string }>(
			`SELECT count(*)::text AS n FROM ${SCHEMA}.click_receipts`,
		);
		expect(left?.n).toBe("2");
	});
});

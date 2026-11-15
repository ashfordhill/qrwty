// A7 (Q10a, Q10b) against a real PostgreSQL 17 (infra/local/test-postgres.sh): the Billing product
// SQL applied twice, through Billing API's own login; a signed webhook stored once and reconciled
// from a stand-in Stripe under the lease; a late worker's fence refused; inbox retries ending in
// `failed`; two concurrent checkouts making one session; the export allowance under a race.
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { customerRoutes } from "../../src/modules/billing-api/billing/customer.ts";
import { entitlementRoutes } from "../../src/modules/billing-api/billing/entitlements.ts";
import { eventRoutes } from "../../src/modules/billing-api/billing/events.ts";
import { FIXTURE_PRICE } from "../../src/modules/billing-api/billing/policy.ts";
import {
	drainInbox,
	MAX_ATTEMPTS,
	reconcileAccount,
	SCHEMA,
} from "../../src/modules/billing-api/billing/reconcile.ts";
import { type Stripe, signStripePayload } from "../../src/modules/billing-api/billing/stripe.ts";
import type { DatabaseReadWriter, Tx } from "../../src/modules/dependencies.ts";
import type { ModuleRequest } from "../../src/modules/entry.ts";
import { ownerKey } from "../../src/modules/link-api/link-operations/view.ts";
import { storedStatus, storeResult, takeKey } from "../../src/runtime/idempotency.ts";
import { testServer } from "./postgres.ts";

const quote = (name: string) => {
	if (!/^[a-z][a-z0-9_]{0,62}$/.test(name)) throw new Error("bad identifier");
	return `"${name}"`;
};
type Products = {
	applyProductSql(owner: pg.Client, db: unknown, q: typeof quote): Promise<void>;
	grantProductSql(owner: pg.Client, db: unknown, runtime: unknown, q: typeof quote): Promise<void>;
};

const server = testServer();
const suffix = randomBytes(4).toString("hex");
const database = `d_billing_a7_${suffix}`;
const logins = {
	owner: { user: `o_billing_${suffix}`, password: randomBytes(18).toString("hex") },
	billing: { user: `r_billing__billing_api_${suffix}`, password: randomBytes(18).toString("hex") },
};
let pool: pg.Pool;
let db: DatabaseReadWriter;

/** Billing API's login as the generated client gives it: query, execute, transaction, idempotent. */
function client(p: pg.Pool): DatabaseReadWriter {
	const rows = async <Row>(run: Promise<pg.QueryResult>) => (await run).rows as Row[];
	const transaction = async <T>(fn: (tx: Tx) => Promise<T>): Promise<T> => {
		const c = await p.connect();
		try {
			await c.query("BEGIN");
			const tx: Tx = {
				query: (sql, values) => rows(c.query(sql, values ? [...values] : undefined)),
				execute: async (sql, values) => ({
					rowCount: (await c.query(sql, values ? [...values] : undefined)).rowCount ?? 0,
				}),
			};
			const value = await fn(tx);
			await c.query("COMMIT");
			return value;
		} catch (error) {
			await c.query("ROLLBACK").catch(() => {});
			throw error;
		} finally {
			c.release();
		}
	};
	const unstored = new Error("unstored");
	return {
		query: (sql, values) => rows(p.query(sql, values ? [...values] : undefined)),
		execute: async (sql, values) => ({
			rowCount: (await p.query(sql, values ? [...values] : undefined)).rowCount ?? 0,
		}),
		transaction,
		async idempotent(request, fn) {
			const record = { tile: "billing-api", ...request };
			let held: { status: number; body: unknown } | undefined;
			try {
				return await transaction(async (tx) => {
					const taken = await takeKey(tx as never, record);
					if (!taken.taken)
						return { status: taken.status, body: taken.body as never, replayed: true };
					const result = await fn(tx);
					if (!storedStatus(result.status)) {
						held = result;
						throw unstored;
					}
					await storeResult(tx as never, record, result);
					return { ...result, replayed: false };
				});
			} catch (error) {
				if (error === unstored && held)
					return { status: held.status, body: held.body as never, replayed: false };
				throw error;
			}
		},
	};
}

beforeAll(async () => {
	const admin = new pg.Client({ ...server, user: "postgres", database: "postgres" });
	await admin.connect();
	try {
		for (const { user, password } of Object.values(logins))
			await admin.query(`CREATE ROLE ${quote(user)} LOGIN PASSWORD '${password}'`);
		await admin.query(`CREATE DATABASE ${quote(database)} OWNER ${quote(logins.owner.user)}`);
		await admin.query(`REVOKE ALL ON DATABASE ${quote(database)} FROM PUBLIC`);
		await admin.query(
			`GRANT CONNECT ON DATABASE ${quote(database)} TO ${quote(logins.billing.user)}`,
		);
	} finally {
		await admin.end();
	}
	const plan = JSON.parse(readFileSync("infra/local.json", "utf8")).databases.find(
		(d: { database: string }) => d.database === "d_billing",
	);
	const products = (await import(pathToFileURL(resolve("scripts/products.mjs")).href)) as Products;
	const owner = new pg.Client({ ...server, database, ...logins.owner });
	await owner.connect();
	try {
		await owner.query("BEGIN");
		for (const file of plan.migrations) await owner.query(readFileSync(file, "utf8"));
		await owner.query(
			`GRANT USAGE ON SCHEMA jeeves TO ${quote(logins.billing.user)}; GRANT SELECT, INSERT, UPDATE, DELETE ON jeeves.idempotency_records TO ${quote(logins.billing.user)}`,
		);
		const runtime = [{ user: logins.billing.user, host: "billing-api" }];
		for (let run = 0; run < 2; run += 1) {
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
	pool = new pg.Pool({ ...server, database, ...logins.billing, max: 10 });
	pool.on("error", () => {});
	db = client(pool);
});

afterAll(async () => {
	await pool?.end();
	const admin = new pg.Client({ ...server, user: "postgres", database: "postgres" });
	await admin.connect();
	try {
		await admin.query(`DROP DATABASE IF EXISTS ${quote(database)} WITH (FORCE)`);
		for (const { user } of Object.values(logins))
			await admin.query(`DROP ROLE IF EXISTS ${quote(user)}`);
	} finally {
		await admin.end();
	}
});

const secret = "integration-signing-key";
const req = (over: Partial<ModuleRequest> & { subject?: string }): ModuleRequest => ({
	method: "GET",
	path: "/",
	rawPath: "/",
	query: {},
	headers: {},
	body: undefined,
	signal: new AbortController().signal,
	...over,
	caller: over.subject
		? { signedIn: true, principal: { subject: over.subject, claims: {} } }
		: { signedIn: false },
});
const future = Math.floor(Date.now() / 1000) + 30 * 86_400;
/** A stand-in Stripe: one customer's subscriptions, as `status` says at each read. */
function stripeWith(status: () => string, calls: string[] = []): Stripe {
	return {
		get: async <T>(path: string) => {
			calls.push(`GET ${path}`);
			return {
				data:
					status() === "none"
						? []
						: [
								{
									id: "sub_test1",
									customer: "cus_test1",
									status: status(),
									cancel_at_period_end: false,
									created: 1,
									items: { data: [{ price: { id: FIXTURE_PRICE }, current_period_end: future }] },
								},
							],
				has_more: false,
			} as T;
		},
		post: async <T>(path: string, _fields: unknown, key?: string) => {
			calls.push(`POST ${path} ${key ?? ""}`);
			await new Promise((r) => setTimeout(r, 50));
			if (path === "/v1/customers") return { id: "cus_test1" } as T;
			return {
				id: `cs_test_${calls.length}`,
				url: `https://checkout.stripe.com/c/pay/cs_test_${calls.length}`,
				expires_at: future,
				status: "open",
			} as T;
		},
		delete: async <T>(path: string) => {
			calls.push(`DELETE ${path}`);
			return {} as T;
		},
	};
}

describe("billing on PostgreSQL", () => {
	const subject = "auth0|integration";
	const key = ownerKey(subject);

	it("makes one Checkout session for two concurrent checkouts and maps the customer once", async () => {
		const calls: string[] = [];
		const routes = customerRoutes({
			billing: db,
			stripe: stripeWith(() => "none", calls),
			price: FIXTURE_PRICE,
			origin: new URL("https://qrwty.io"),
			onFailure: (what, error) => console.error(what, error),
		});
		const checkout = (k: string) =>
			routes(
				req({
					method: "POST",
					path: "/checkout",
					rawPath: "/checkout",
					subject,
					body: { plan: "paid-monthly" },
					headers: { "idempotency-key": k },
				}),
			);
		const [a, b] = await Promise.all([checkout("one"), checkout("two")]);
		expect([a.status ?? 200, b.status ?? 200]).toEqual([200, 200]);
		expect((a.body as { url: string }).url).toBe((b.body as { url: string }).url);
		expect(calls.filter((c) => c.startsWith("POST /v1/checkout/sessions"))).toHaveLength(1);
		const [row] = await db.query<{ customer_id: string; checkout_attempt: number }>(
			`SELECT customer_id, checkout_attempt FROM ${SCHEMA}.accounts WHERE account_key = $1`,
			[key],
		);
		expect(row).toEqual({ customer_id: "cus_test1", checkout_attempt: 1 });
		// The same key replays the same answer.
		expect((await checkout("one")).body).toEqual(a.body);
	});

	it("stores a signed event once, then reconciles the account from Stripe to Paid", async () => {
		let status = "active";
		const stripe = stripeWith(() => status);
		const events = eventRoutes({ billing: db, stripe, webhookSecret: secret });
		const t = Math.floor(Date.now() / 1000);
		const raw = Buffer.from(
			JSON.stringify({
				id: "evt_int_1",
				type: "checkout.session.completed",
				created: t,
				data: { object: { id: "cs_x", customer: "cus_test1" } },
			}),
		);
		const post = () =>
			events(
				req({
					method: "POST",
					path: "/webhook",
					rawPath: "/webhook",
					rawBody: raw,
					headers: { "stripe-signature": signStripePayload(raw, secret, t) },
				}),
			);
		const first = await post();
		expect(first.body).toMatchObject({ received: true, duplicate: false });
		await new Promise((r) => setTimeout(r, 300));
		expect((await post()).body).toMatchObject({ duplicate: true });
		const [item] = await db.query<{ state: string; attempts: number }>(
			`SELECT state, attempts FROM ${SCHEMA}.webhook_inbox WHERE event_id = 'evt_int_1'`,
		);
		expect(item).toEqual({ state: "done", attempts: 1 });
		const grants = entitlementRoutes({ billing: db, price: FIXTURE_PRICE, onFailure: () => {} });
		const grant = await grants(req({ path: "/grant", rawPath: "/grant", subject }));
		expect(grant.body).toMatchObject({
			policy: "paid-test-v1",
			limits: { ownedLinkCreatesPerMonth: 50 },
		});
		const [account] = await db.query<{ status: string; confirmed_by: string; revision: string }>(
			`SELECT status, confirmed_by, revision::text FROM ${SCHEMA}.accounts WHERE account_key = $1`,
			[key],
		);
		expect(account).toMatchObject({ status: "active", confirmed_by: "webhook" });
		// A cancellation read later is applied; the revision rises again.
		status = "canceled";
		expect(await reconcileAccount(db, stripe, key, "reconciliation")).toBe("applied");
		const [after] = await db.query<{ status: string; revision: string }>(
			`SELECT status, revision::text FROM ${SCHEMA}.accounts WHERE account_key = $1`,
			[key],
		);
		expect(after?.status).toBe("canceled");
		expect(Number(after?.revision)).toBeGreaterThan(Number(account?.revision));
	});

	it("refuses a late worker's result once a newer lease took the account", async () => {
		const [lease] = await db.query<{ fence: string }>(
			`SELECT * FROM ${SCHEMA}.take_lease($1, gen_random_uuid(), 1)`,
			[key],
		);
		expect(lease).toBeDefined();
		await new Promise((r) => setTimeout(r, 20));
		// The 1 ms lease expired: a new worker takes the account and applies...
		expect(
			await reconcileAccount(
				db,
				stripeWith(() => "active"),
				key,
				"reconciliation",
			),
		).toBe("applied");
		// ...and the late worker's fence is refused.
		const [late] = await db.query<{ applied: boolean }>(
			`SELECT * FROM ${SCHEMA}.apply_subscription($1, gen_random_uuid(), $2::bigint, 'canceled', NULL, NULL, NULL, false, NULL, 'webhook')`,
			[key, lease?.fence],
		);
		expect(late?.applied).toBe(false);
		const [row] = await db.query<{ status: string }>(
			`SELECT status FROM ${SCHEMA}.accounts WHERE account_key = $1`,
			[key],
		);
		expect(row?.status).toBe("active");
	});

	it("retries a failing item with backoff and keeps it failed after the last attempt", async () => {
		await db.query(
			`SELECT ${SCHEMA}.inbox_insert('evt_int_fail', 'invoice.paid', now(), 'cus_test1', '{}'::jsonb)`,
		);
		const broken: Stripe = {
			...stripeWith(() => "active"),
			get: () => Promise.reject(new Error("stripe down")),
		};
		for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
			await db.execute(
				`UPDATE ${SCHEMA}.webhook_inbox SET next_attempt_at = now() WHERE event_id = 'evt_int_fail'`,
			);
			await drainInbox(db, broken, { customer: "cus_test1" });
		}
		const [item] = await db.query<{ state: string; attempts: number; last_error: string }>(
			`SELECT state, attempts, last_error FROM ${SCHEMA}.webhook_inbox WHERE event_id = 'evt_int_fail'`,
		);
		expect(item).toEqual({ state: "failed", attempts: MAX_ATTEMPTS, last_error: "error" });
	});

	it("spends exactly the export allowance under a race, and never more", async () => {
		const other = ownerKey("auth0|exporter");
		const results = await Promise.all(
			Array.from({ length: 6 }, () =>
				db.query<{ allowed: boolean }>(`SELECT * FROM ${SCHEMA}.spend_export($1, 1)`, [other]),
			),
		);
		expect(results.filter(([r]) => r?.allowed)).toHaveLength(1);
		const [usage] = await db.query<{ used: number }>(
			`SELECT used FROM ${SCHEMA}.export_usage WHERE account_key = $1`,
			[other],
		);
		expect(usage?.used).toBe(1);
	});
});

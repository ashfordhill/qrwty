// A7 (Q10a, Q10b) offline: the tier policy and its transitions, Stripe's signature check over the
// raw bytes, the webhook's inbox-before-2xx rule, checkout's reuse and refusal rules, grants and
// the export allowance, and Link API's fallback when Billing API gives no grant. Fakes only: no
// Docker, no network, no Stripe.
import { describe, expect, it } from "vitest";
import {
	type AccountRow,
	billingStatus,
	customerRoutes,
} from "../../src/modules/billing-api/billing/customer.ts";
import { eventRoutes } from "../../src/modules/billing-api/billing/events.ts";
import { fetchGrant, spendExport } from "../../src/modules/billing-api/billing/grant-client.ts";
import {
	FIXTURE_PRICE,
	GRACE_MS,
	grantFor,
	monthPeriod,
	nextFirstFailure,
	policyFor,
	productStatus,
	RENEWAL_SLACK_MS,
	type SubscriptionState,
	validGrant,
} from "../../src/modules/billing-api/billing/policy.ts";
import { eventCustomer } from "../../src/modules/billing-api/billing/reconcile.ts";
import {
	currentSubscription,
	formBody,
	periodEnd,
	type Stripe,
	type StripeSubscription,
	signStripePayload,
	verifyStripeSignature,
} from "../../src/modules/billing-api/billing/stripe.ts";
import type { DatabaseReadWriter, HttpTarget, Tx } from "../../src/modules/dependencies.ts";
import type { ModuleRequest, ModuleResponse } from "../../src/modules/entry.ts";
import { createOwnedLink } from "../../src/modules/link-api/link-operations/owned.ts";

const DAY = 86_400_000;
const now = new Date("2026-11-15T12:00:00Z");
const price = FIXTURE_PRICE;
const state = (over: Partial<SubscriptionState> = {}): SubscriptionState => ({
	status: "active",
	paidThrough: new Date(now.getTime() + 30 * DAY),
	cancelAtPeriodEnd: false,
	firstFailureAt: null,
	allowlistedPrice: true,
	...over,
});
const request = (over: Partial<ModuleRequest> & { subject?: string } = {}): ModuleRequest => ({
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
const code = (r: ModuleResponse) => (r.body as { error?: { code?: string } }).error?.code;

describe("tier policy (decisions §4, billing contract)", () => {
	it("is Paid only for the allowlisted price while active", () => {
		expect(policyFor(state(), now)).toBe("paid-test-v1");
		expect(policyFor(state({ allowlistedPrice: false }), now)).toBe("free-test-v1");
		for (const status of ["none", "incomplete", "canceled", "expired"] as const)
			expect(policyFor(state({ status }), now)).toBe("free-test-v1");
	});
	it("keeps a cancel at period end Paid until paidThrough, then Free", () => {
		const cancel = state({ cancelAtPeriodEnd: true, paidThrough: new Date(now.getTime() + DAY) });
		expect(policyFor(cancel, now)).toBe("paid-test-v1");
		expect(policyFor(cancel, new Date(now.getTime() + DAY + 1))).toBe("free-test-v1");
	});
	it("gives a renewal a finite slack, never an indefinite extension", () => {
		const ended = state({ paidThrough: new Date(now.getTime() - 1) });
		expect(policyFor(ended, now)).toBe("paid-test-v1");
		expect(policyFor(ended, new Date(now.getTime() + RENEWAL_SLACK_MS))).toBe("free-test-v1");
		expect(policyFor(state({ paidThrough: null }), now)).toBe("free-test-v1");
	});
	it("keeps past due Paid for 7 days from the first failure; duplicates don't extend it", () => {
		const first = new Date(now.getTime() - 2 * DAY);
		const pastDue = state({ status: "past_due", firstFailureAt: first });
		expect(policyFor(pastDue, now)).toBe("paid-test-v1");
		expect(policyFor(pastDue, new Date(first.getTime() + GRACE_MS))).toBe("free-test-v1");
		// A later duplicate failure keeps the first time.
		expect(nextFirstFailure(first, "past_due", now, now)).toEqual(first);
		expect(nextFirstFailure(null, "past_due", now, first)).toEqual(first);
		expect(nextFirstFailure(null, "past_due", now, null)).toEqual(now);
		expect(nextFirstFailure(first, "active", now)).toBeNull();
		expect(policyFor(state({ status: "past_due", firstFailureAt: null }), now)).toBe(
			"free-test-v1",
		);
	});
	it("maps Stripe's statuses to the contract's", () => {
		expect(productStatus("trialing")).toBe("active");
		expect(productStatus("unpaid")).toBe("past_due");
		expect(productStatus("incomplete_expired")).toBe("expired");
		expect(productStatus("canceled")).toBe("canceled");
		expect(productStatus(undefined)).toBe("none");
	});
	it("issues grants valid for at most 60 seconds with the plan's limits", () => {
		const grant = grantFor("ab", state(), 3, now);
		expect(grant).toMatchObject({ policy: "paid-test-v1", revision: 3 });
		expect(grant.limits).toEqual({
			ownedLinkCreatesPerMonth: 50,
			lookbackDays: 90,
			breakdowns: true,
			csvExportsPerMonth: 20,
		});
		expect(Date.parse(grant.validUntil) - now.getTime()).toBe(60_000);
		expect(validGrant(grant, now.getTime())).toBe(true);
		expect(validGrant(grant, now.getTime() + 60_001)).toBe(false);
		expect(
			validGrant(
				{ ...grant, validUntil: new Date(now.getTime() + 3_600_000).toISOString() },
				now.getTime(),
			),
		).toBe(false);
		expect(grantFor("ab", state({ status: "none" }), 0, now).limits.ownedLinkCreatesPerMonth).toBe(
			5,
		);
	});
	it("counts usage per UTC calendar month", () => {
		const period = monthPeriod(new Date("2026-12-31T23:59:59Z"));
		expect(period.start.toISOString()).toBe("2026-12-01T00:00:00.000Z");
		expect(period.end.toISOString()).toBe("2027-01-01T00:00:00.000Z");
	});
});

describe("Stripe signature over the raw bytes", () => {
	const secret = "unit-test-signing-key";
	const raw = new TextEncoder().encode('{"id":"evt_1","type":"invoice.paid"}');
	const t = 1_800_000_000;
	it("accepts the exact bytes and refuses changed bytes, another secret, stale or malformed", () => {
		const header = signStripePayload(raw, secret, t);
		expect(verifyStripeSignature(raw, header, secret, t)).toBe("ok");
		const changed = new TextEncoder().encode('{"id":"evt_1","type":"invoice.paid" }');
		expect(verifyStripeSignature(changed, header, secret, t)).toBe("mismatch");
		expect(verifyStripeSignature(raw, header, "another-signing-key", t)).toBe("mismatch");
		expect(verifyStripeSignature(raw, header, secret, t + 301)).toBe("stale");
		expect(verifyStripeSignature(raw, "t=abc,v1=zz", secret, t)).toBe("malformed");
		expect(verifyStripeSignature(raw, undefined, secret, t)).toBe("missing");
		// One of several v1 signatures (a secret rolling) is enough.
		const two = `${header},v1=${"0".repeat(64)}`;
		expect(verifyStripeSignature(raw, two, secret, t)).toBe("ok");
	});
});

describe("Stripe helpers", () => {
	const sub = (status: string, created: number): StripeSubscription => ({
		id: `sub_${status}${created}`,
		customer: "cus_1",
		status,
		cancel_at_period_end: false,
		created,
		items: { data: [{ price: { id: "price_x" }, current_period_end: 1_900_000_000 }] },
	});
	it("picks the live subscription before an ended one, then the newest", () => {
		expect(currentSubscription([sub("canceled", 3), sub("active", 1)])?.status).toBe("active");
		expect(currentSubscription([sub("canceled", 1), sub("canceled", 2)])?.created).toBe(2);
		expect(currentSubscription([])).toBeUndefined();
		expect(periodEnd(sub("active", 1))?.toISOString()).toBe("2030-03-17T17:46:40.000Z");
	});
	it("form-encodes nested keys and the customer of each event kind", () => {
		expect(formBody({ "line_items[0][price]": "p", skip: undefined, n: 1 })).toBe(
			"line_items%5B0%5D%5Bprice%5D=p&n=1",
		);
		expect(eventCustomer("customer.updated", { id: "cus_2" })).toBe("cus_2");
		expect(eventCustomer("customer.subscription.updated", { id: "sub_1", customer: "cus_3" })).toBe(
			"cus_3",
		);
		expect(eventCustomer("invoice.paid", { customer: "cus_4" })).toBe("cus_4");
		expect(eventCustomer("invoice.paid", {})).toBeNull();
	});
});

type Call = { sql: string; values: readonly unknown[] };
function fakeDb(answer: (sql: string, values: readonly unknown[]) => unknown[] | Error) {
	const calls: Call[] = [];
	const run = async (sql: string, values: readonly unknown[] = []) => {
		calls.push({ sql, values });
		const result = answer(sql, values);
		if (result instanceof Error) throw result;
		return result;
	};
	const tx: Tx = {
		query: async <Row>(sql: string, values?: readonly unknown[]) =>
			(await run(sql, values)) as Row[],
		execute: async (sql, values) => ({ rowCount: (await run(sql, values)).length }),
	};
	const db = {
		...tx,
		transaction: (fn: (t: Tx) => Promise<unknown>) => fn(tx),
		idempotent: async (_r: unknown, fn: (t: Tx) => Promise<{ status: number; body: unknown }>) => ({
			...(await fn(tx)),
			replayed: false,
		}),
	} as unknown as DatabaseReadWriter;
	return { db, calls };
}
const noStripe: Stripe = {
	get: () => Promise.reject(new Error("no Stripe in this test")),
	post: () => Promise.reject(new Error("no Stripe in this test")),
	delete: () => Promise.reject(new Error("no Stripe in this test")),
};

describe("the webhook (inbox before 2xx)", () => {
	const secret = "unit-test-signing-key";
	const t = 1_800_000_000;
	const event = (id = "evt_test_1") =>
		new TextEncoder().encode(
			JSON.stringify({
				id,
				type: "invoice.paid",
				created: t,
				data: { object: { customer: "cus_9" } },
			}),
		);
	const routes = (db: DatabaseReadWriter) =>
		eventRoutes({
			billing: db,
			stripe: noStripe,
			webhookSecret: secret,
			onFailure: () => {},
			nowSeconds: () => t,
		});
	const post = (raw: Uint8Array, header: string | undefined) =>
		request({
			method: "POST",
			path: "/webhook",
			rawPath: "/webhook",
			rawBody: raw,
			body: JSON.parse(Buffer.from(raw).toString()),
			headers: header ? { "stripe-signature": header } : {},
		});
	it("refuses a forged or modified body before writing anything", async () => {
		const { db, calls } = fakeDb(() => []);
		const raw = event();
		expect((await routes(db)(post(raw, `t=${t},v1=${"a".repeat(64)}`))).status).toBe(400);
		const changed = new TextEncoder().encode(`${Buffer.from(raw).toString()} `);
		expect((await routes(db)(post(changed, signStripePayload(raw, secret, t)))).status).toBe(400);
		expect((await routes(db)(post(raw, undefined))).status).toBe(400);
		expect(calls).toHaveLength(0);
	});
	it("answers 2xx only after the inbox insert; a duplicate is 2xx; a failed insert is 503", async () => {
		const raw = event();
		const header = signStripePayload(raw, secret, t);
		let inserted = true;
		const { db, calls } = fakeDb((sql) => (sql.includes("inbox_insert") ? [{ inserted }] : []));
		const first = await routes(db)(post(raw, header));
		expect(first.status ?? 200).toBe(200);
		expect(calls[0]?.sql).toContain("inbox_insert");
		expect(calls[0]?.values.slice(0, 2)).toEqual(["evt_test_1", "invoice.paid"]);
		expect(calls[0]?.values[3]).toBe("cus_9");
		inserted = false;
		expect((await routes(db)(post(raw, header))).body).toMatchObject({
			received: true,
			duplicate: true,
		});
		const down = fakeDb((sql) => (sql.includes("inbox_insert") ? new Error("db down") : []));
		const failed = await routes(down.db)(post(raw, header));
		expect(failed.status).toBe(503);
		expect(code(failed)).toBe("inbox_unavailable");
	});
});

describe("checkout and status", () => {
	const subject = "auth0|someone";
	const row = (over: Partial<AccountRow> = {}): AccountRow => ({
		account_key: Buffer.alloc(32),
		customer_id: "cus_existing",
		status: "none",
		subscription_id: null,
		price_id: null,
		paid_through: null,
		cancel_at_period_end: false,
		first_failure_at: null,
		revision: "0",
		confirmed_by: null,
		synced_at: null,
		checkout_attempt: 0,
		checkout_session_id: null,
		checkout_url: null,
		checkout_expires_at: null,
		checkout_completed_at: null,
		checkout_returned_at: null,
		...over,
	});
	const checkout = (body: unknown, key: string | undefined = "k1") =>
		request({
			method: "POST",
			path: "/checkout",
			rawPath: "/checkout",
			body,
			subject,
			headers: key ? { "idempotency-key": key } : {},
		});
	const routesWith = (
		account: AccountRow,
		posts: { path: string; fields: Record<string, unknown>; key?: string }[],
	) => {
		const { db } = fakeDb((sql) =>
			sql.includes("FROM m_billing_api_customer_billing.accounts") ? [account] : [],
		);
		const stripe: Stripe = {
			...noStripe,
			post: async <T>(path: string, fields: Record<string, unknown>, key?: string) => {
				posts.push({ path, fields, key });
				return {
					id: "cs_test_new",
					url: "https://checkout.stripe.com/c/pay/cs_test_new",
					expires_at: 1_900_000_000,
					status: "open",
				} as T;
			},
		};
		return customerRoutes({
			billing: db,
			stripe,
			price,
			origin: new URL("https://qrwty.io"),
			onFailure: () => {},
			now: () => now,
		});
	};
	it("needs an Idempotency-Key and the one plan; never a browser price", async () => {
		const posts: never[] = [];
		const routes = routesWith(row(), posts);
		expect(code(await routes(checkout({ plan: "paid-monthly" }, "")))).toBe(
			"idempotency_key_required",
		);
		expect(code(await routes(checkout({ plan: "gold" })))).toBe("invalid_plan");
		const made: { path: string; fields: Record<string, unknown>; key?: string }[] = [];
		const ok = await routesWith(
			row(),
			made,
		)(checkout({ plan: "paid-monthly", price: "price_evil" }));
		expect(ok.body).toMatchObject({ url: "https://checkout.stripe.com/c/pay/cs_test_new" });
		expect(made[0]?.path).toBe("/v1/checkout/sessions");
		expect(made[0]?.fields["line_items[0][price]"]).toBe(price);
		expect(made[0]?.fields.success_url).toBe("https://qrwty.io/billing?checkout=success");
		expect(made[0]?.fields.cancel_url).toBe("https://qrwty.io/billing?checkout=cancelled");
		expect(made[0]?.key).toMatch(/^qrwtya-checkout-[0-9a-f]{64}-1$/);
	});
	it("reuses an open session and refuses an account that already has Paid", async () => {
		const posts: never[] = [];
		const open = row({
			checkout_session_id: "cs_test_open",
			checkout_url: "https://checkout.stripe.com/c/pay/cs_test_open",
			checkout_expires_at: new Date(now.getTime() + 3_600_000),
			checkout_attempt: 1,
		});
		const reused = await routesWith(open, posts)(checkout({ plan: "paid-monthly" }));
		expect(reused.body).toMatchObject({
			url: "https://checkout.stripe.com/c/pay/cs_test_open",
			reused: true,
		});
		expect(posts).toHaveLength(0);
		const paid = await routesWith(
			row({ status: "active", price_id: price, paid_through: new Date(now.getTime() + DAY) }),
			posts,
		)(checkout({ plan: "paid-monthly" }));
		expect(paid.status).toBe(409);
		expect(code(paid)).toBe("already_subscribed");
	});
	it("says confirming only after a checkout, and Paid only from stored state", () => {
		const returned = row({ checkout_session_id: "cs_test_x", checkout_returned_at: now });
		expect(billingStatus(returned, 0, price, now, true)).toMatchObject({
			tier: "free",
			confirming: true,
		});
		expect(billingStatus(row(), 0, price, now, true).confirming).toBe(false);
		const paid = billingStatus(
			row({
				status: "active",
				price_id: price,
				paid_through: new Date(now.getTime() + DAY),
				confirmed_by: "webhook",
			}),
			1,
			price,
			now,
			true,
		);
		expect(paid).toMatchObject({
			tier: "paid",
			policy: "paid-test-v1",
			confirming: false,
			confirmedBy: "webhook",
			portalAvailable: true,
		});
		expect(paid.usage.csvExports).toEqual({ used: 1, limit: 20 });
		expect(paid.usage.ownedLinkCreates.limit).toBe(50);
	});
});

describe("grants and exports from Link API's and Account API's side", () => {
	const target = (status: number, body: unknown): HttpTarget => ({
		request: async () => new Response(JSON.stringify(body), { status }),
	});
	it("uses a valid grant only, and nothing without the caller's bearer", async () => {
		const grant = grantFor("ab", state(), 1, new Date());
		expect(await fetchGrant(target(200, grant), "Bearer x")).toMatchObject({
			policy: "paid-test-v1",
		});
		expect(await fetchGrant(target(200, grant), undefined)).toBeUndefined();
		expect(await fetchGrant(target(503, {}), "Bearer x")).toBeUndefined();
		expect(
			await fetchGrant(target(200, { ...grant, validUntil: "2000-01-01T00:00:00Z" }), "Bearer x"),
		).toBeUndefined();
		const broken: HttpTarget = { request: () => Promise.reject(new Error("down")) };
		expect(await fetchGrant(broken, "Bearer x")).toBeUndefined();
	});
	it("spends an export, passes on a refusal, and says unavailable otherwise", async () => {
		expect(await spendExport(target(200, { used: 1, limit: 1 }), "Bearer x")).toEqual({
			kind: "spent",
			used: 1,
			limit: 1,
		});
		const refused = await spendExport(
			target(403, { error: { code: "quota_exceeded" } }),
			"Bearer x",
		);
		expect(refused.kind).toBe("refused");
		expect((await spendExport(target(503, {}), "Bearer x")).kind).toBe("unavailable");
	});
	it("turns an exhausted Free fallback into 503 billing_unavailable, a real limit into 403", async () => {
		const { db, calls } = fakeDb((sql) =>
			sql.includes("clock_now")
				? [{ now }]
				: sql.includes("spend_owned_create")
					? [{ allowed: false, used: 5, period_end: new Date("2026-12-01T00:00:00Z") }]
					: [],
		);
		const context = {
			origin: new URL("https://qrwty.io"),
			hooks: { clockOffsetMs: () => 0, forcedSlugs: () => [] },
			onFailure: () => {},
		} as never;
		const me = { subject: "auth0|a", key: Buffer.alloc(32) };
		const input = { destination: "https://example.com/", expiresAt: null };
		const random = (n: number) => new Uint8Array(n);
		const fallback = await createOwnedLink(
			context,
			{ links: db } as never,
			me,
			"k",
			input,
			random,
			{ limit: 5, policy: "free-test-v1", fallback: true },
		);
		expect(fallback.status).toBe(503);
		expect(code(fallback)).toBe("billing_unavailable");
		const paid = await createOwnedLink(context, { links: db } as never, me, "k2", input, random, {
			limit: 50,
			policy: "paid-test-v1",
			fallback: false,
		});
		expect(paid.status).toBe(403);
		expect(paid.body).toMatchObject({
			error: { code: "quota_exceeded", limit: 50, policy: "paid-test-v1" },
		});
		expect(
			calls.filter((c) => c.sql.includes("spend_owned_create")).map((c) => c.values[1]),
		).toEqual([5, 50]);
	});
});

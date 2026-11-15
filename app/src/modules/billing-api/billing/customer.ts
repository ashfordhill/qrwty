// Customer billing's routes, below /modules/billing-api-customer-billing, where Session API forwards
// the signed-in owner's billing requests with the session's bearer (Session API checks the cookie
// and CSRF). Billing API's guard verifies the bearer, and the account is the verified subject's
// owner key, never a request field. A browser never names a price, customer or account.
//   GET  /billing?checkout=success    the plan, subscription and export usage (http-contract §9)
//   POST /checkout {plan}             Idempotency-Key; a hosted Checkout session's URL
//   POST /portal                      a customer-portal session's URL
//   POST /account/erase               account deletion: cancels the subscription, forgets the customer
// Paid access never comes from the return URL: `?checkout=success` only lets a stuck checkout be
// reconciled from Stripe (after RETURN_GRACE_MS, so the webhook normally lands first).

import { IdempotencyConflict, requestHash } from "../../../runtime/idempotency.ts";
import type { DatabaseReadWriter } from "../../dependencies.ts";
import { defineRoutes, type ModuleRequest, type ModuleResponse } from "../../entry.ts";
import { problem, singleHeader, unavailable } from "../../link-api/link-operations/contract.ts";
import { validKey } from "../../link-api/link-operations/idempotency.ts";
import { ownerKey } from "../../link-api/link-operations/view.ts";
import {
	graceUntil,
	monthPeriod,
	PAID_PLAN,
	POLICIES,
	type PolicyName,
	policyFor,
	type SubscriptionState,
} from "./policy.ts";
import { drainInbox, reconcileAccount, SCHEMA } from "./reconcile.ts";
import {
	type Stripe,
	type StripeCheckoutSession,
	StripeError,
	type StripeList,
	type StripePortalSession,
	type StripeSubscription,
} from "./stripe.ts";

/** A checkout the browser says it finished is reconciled from Stripe after this long. */
export const RETURN_GRACE_MS = 8_000;
/** `confirming` lasts at most this long after a completed or returned checkout. */
export const CONFIRMING_MS = 30 * 60_000;

export type BillingContext = {
	billing: DatabaseReadWriter;
	stripe: Stripe;
	/** The allowlisted paid price (STRIPE_PRICE_PAID_MONTHLY). */
	price: string;
	portalConfiguration?: string;
	origin: URL;
	onFailure: (what: string, error: unknown) => void;
	now?: () => Date;
};

export type AccountRow = {
	account_key: Buffer;
	customer_id: string | null;
	status: SubscriptionState["status"];
	subscription_id: string | null;
	price_id: string | null;
	paid_through: Date | null;
	cancel_at_period_end: boolean;
	first_failure_at: Date | null;
	revision: string;
	confirmed_by: "webhook" | "reconciliation" | null;
	synced_at: Date | null;
	checkout_attempt: number;
	checkout_session_id: string | null;
	checkout_url: string | null;
	checkout_expires_at: Date | null;
	checkout_completed_at: Date | null;
	checkout_returned_at: Date | null;
};

export const stateOf = (row: AccountRow | undefined, price: string): SubscriptionState => ({
	status: row?.status ?? "none",
	paidThrough: row?.paid_through ?? null,
	cancelAtPeriodEnd: row?.cancel_at_period_end ?? false,
	firstFailureAt: row?.first_failure_at ?? null,
	allowlistedPrice: row?.price_id === price,
});

export async function readAccount(billing: DatabaseReadWriter, account: Buffer) {
	const [row] = await billing.query<AccountRow>(
		`SELECT * FROM ${SCHEMA}.accounts WHERE account_key = $1`,
		[account],
	);
	return row;
}

type Routed = ModuleRequest & { params: Record<string, string> };
const signInRequired = () => problem(401, "unauthenticated", "Sign in to see billing.", false);
const billingUnavailable = () =>
	unavailable("billing_unavailable", "Billing is unavailable; try again shortly.", 2);
const account = (request: ModuleRequest) =>
	request.caller.signedIn ? ownerKey(request.caller.principal.subject) : undefined;
const iso = (at: Date | null | undefined) => (at ? at.toISOString() : null);

/** The billing status's body (http-contract §9) for an account row at `now`. Owned-link usage is
 * Link API's (Session API adds `used`). */
export function billingStatus(
	row: AccountRow | undefined,
	exportsUsed: number,
	price: string,
	now: Date,
	returned: boolean,
) {
	const state = stateOf(row, price);
	const policy: PolicyName = policyFor(state, now);
	const limits = POLICIES[policy];
	const period = monthPeriod(now);
	const recent = (at: Date | null | undefined) =>
		!!at && now.getTime() - at.getTime() < CONFIRMING_MS;
	const confirming =
		policy !== "paid-test-v1" &&
		!!row?.checkout_session_id &&
		(recent(row.checkout_completed_at) || (returned && recent(row.checkout_returned_at)));
	return {
		tier: policy === "paid-test-v1" ? "paid" : "free",
		policy,
		plan: policy === "paid-test-v1" ? PAID_PLAN : null,
		subscription: {
			status: state.status,
			paidThrough: iso(state.paidThrough),
			graceUntil: iso(graceUntil(state)),
			cancelAtPeriodEnd: state.cancelAtPeriodEnd,
		},
		usage: {
			period: { start: period.start.toISOString(), end: period.end.toISOString() },
			ownedLinkCreates: { used: null as number | null, limit: limits.ownedLinkCreatesPerMonth },
			csvExports: { used: exportsUsed, limit: limits.csvExportsPerMonth },
		},
		limits: { ...limits },
		portalAvailable: !!row?.customer_id,
		confirming,
		confirmedBy: policy === "paid-test-v1" ? (row?.confirmed_by ?? null) : null,
		revision: Number(row?.revision ?? 0),
		testMode: true,
	};
}

export function customerRoutes(context: BillingContext) {
	const now = context.now ?? (() => new Date());
	const { billing, stripe } = context;

	/** The account's customer, created once by the server (Stripe idempotency key per account). */
	async function ensureCustomer(key: Buffer): Promise<string> {
		await billing.execute(
			`INSERT INTO ${SCHEMA}.accounts (account_key) VALUES ($1) ON CONFLICT (account_key) DO NOTHING`,
			[key],
		);
		const row = await readAccount(billing, key);
		if (row?.customer_id) return row.customer_id;
		const hex = key.toString("hex");
		const customer = await stripe.post<{ id: string }>(
			"/v1/customers",
			{
				description: "qrwtya account",
				"metadata[qrwty_account]": hex,
				"metadata[qrwty_arm]": "a",
			},
			`qrwtya-customer-${hex}`,
		);
		await billing.execute(
			`UPDATE ${SCHEMA}.accounts SET customer_id = $2, updated_at = clock_timestamp() WHERE account_key = $1 AND customer_id IS NULL`,
			[key, customer.id],
		);
		const stored = await readAccount(billing, key);
		if (!stored?.customer_id) throw new Error("customer mapping not stored");
		return stored.customer_id;
	}

	async function status(request: Routed): Promise<ModuleResponse> {
		const key = account(request);
		if (!key) return signInRequired();
		const returned = request.query.checkout === "success";
		try {
			let row = await readAccount(billing, key);
			if (row?.customer_id) {
				// This account's pending events first (bounded), then a stuck checkout.
				await drainInbox(billing, stripe, {
					customer: row.customer_id,
					limit: 3,
					budgetMs: 400,
					onFailure: context.onFailure,
				}).catch((error: unknown) => context.onFailure("billing status drain", error));
				const at = now();
				if (
					returned &&
					row.checkout_session_id &&
					policyFor(stateOf(row, context.price), at) !== "paid-test-v1"
				) {
					const [mark] = await billing.query<{ checkout_returned_at: Date }>(
						`UPDATE ${SCHEMA}.accounts SET checkout_returned_at = coalesce(checkout_returned_at, clock_timestamp()) WHERE account_key = $1 RETURNING checkout_returned_at`,
						[key],
					);
					const waited = mark ? at.getTime() - mark.checkout_returned_at.getTime() : 0;
					const synced = row.synced_at ? at.getTime() - row.synced_at.getTime() : Infinity;
					if (waited >= RETURN_GRACE_MS && synced >= 5_000)
						await reconcileAccount(billing, stripe, key, "reconciliation").catch((error: unknown) =>
							context.onFailure("stuck checkout reconcile", error),
						);
				}
				row = (await readAccount(billing, key)) ?? row;
			}
			const period = monthPeriod(now());
			const [usage] = await billing.query<{ used: number }>(
				`SELECT used FROM ${SCHEMA}.export_usage WHERE account_key = $1 AND period_start = $2::date`,
				[key, period.start.toISOString().slice(0, 10)],
			);
			return { body: billingStatus(row, usage?.used ?? 0, context.price, now(), returned) };
		} catch (error) {
			context.onFailure("billing status", error);
			return billingUnavailable();
		}
	}

	async function checkout(request: Routed): Promise<ModuleResponse> {
		const key = account(request);
		if (!key) return signInRequired();
		const idempotencyKey = singleHeader(request.headers, "idempotency-key");
		if (!validKey(idempotencyKey))
			return problem(
				400,
				"idempotency_key_required",
				"Send an Idempotency-Key header of 1 to 255 visible ASCII characters.",
				false,
			);
		const body = request.body as { plan?: unknown } | undefined;
		if (!body || typeof body !== "object" || body.plan !== PAID_PLAN)
			return problem(400, "invalid_plan", `The only plan is ${PAID_PLAN}.`, false, {
				reason: "plan",
			});
		const hex = key.toString("hex");
		try {
			const customer = await ensureCustomer(key);
			const result = await billing.idempotent(
				{
					scope: { kind: "account", id: hex },
					key: idempotencyKey,
					hash: requestHash({ method: "POST", route: "POST /checkout", body: { plan: PAID_PLAN } }),
				},
				async (tx) => {
					// The account's row is locked: two checkouts of one account run one after the other.
					const [row] = await tx.query<AccountRow>(
						`SELECT * FROM ${SCHEMA}.accounts WHERE account_key = $1 FOR UPDATE`,
						[key],
					);
					const at = now();
					if (row && (row.status === "active" || row.status === "past_due"))
						return problem(409, "already_subscribed", "This account already has Paid.", false) as {
							status: number;
							body: unknown;
						};
					// An open session is reused, so repeated clicks never open a second payment.
					if (
						row?.checkout_session_id &&
						row.checkout_url &&
						!row.checkout_completed_at &&
						row.checkout_expires_at &&
						row.checkout_expires_at.getTime() > at.getTime() + 5 * 60_000
					)
						return { status: 200, body: { url: row.checkout_url, reused: true } };
					const attempt = (row?.checkout_attempt ?? 0) + 1;
					const back = (outcome: string) => `${context.origin.origin}/billing?checkout=${outcome}`;
					const session = await stripe.post<StripeCheckoutSession>(
						"/v1/checkout/sessions",
						{
							mode: "subscription",
							customer,
							"line_items[0][price]": context.price,
							"line_items[0][quantity]": 1,
							success_url: back("success"),
							cancel_url: back("cancelled"),
							client_reference_id: hex,
							"metadata[qrwty_account]": hex,
							"subscription_data[metadata][qrwty_account]": hex,
						},
						`qrwtya-checkout-${hex}-${attempt}`,
					);
					if (!session.url) throw new StripeError(502, "no_url", "Checkout session has no URL");
					await tx.execute(
						`UPDATE ${SCHEMA}.accounts SET checkout_attempt = $2, checkout_session_id = $3, checkout_url = $4, checkout_expires_at = to_timestamp($5), checkout_completed_at = NULL, checkout_returned_at = NULL, updated_at = clock_timestamp() WHERE account_key = $1`,
						[key, attempt, session.id, session.url, session.expires_at],
					);
					return { status: 200, body: { url: session.url, reused: false } };
				},
			);
			return {
				status: result.status,
				headers: result.replayed ? { "Idempotent-Replayed": "true" } : {},
				body: result.body,
			};
		} catch (error) {
			if (error instanceof IdempotencyConflict)
				return problem(
					409,
					"idempotency_conflict",
					"This Idempotency-Key was used for another request.",
					false,
				);
			context.onFailure("checkout", error);
			return billingUnavailable();
		}
	}

	async function portal(request: Routed): Promise<ModuleResponse> {
		const key = account(request);
		if (!key) return signInRequired();
		try {
			const row = await readAccount(billing, key);
			if (!row?.customer_id)
				return problem(409, "no_customer", "This account has no payment details yet.", false);
			const session = await stripe.post<StripePortalSession>("/v1/billing_portal/sessions", {
				customer: row.customer_id,
				return_url: `${context.origin.origin}/billing?portal=returned`,
				...(context.portalConfiguration ? { configuration: context.portalConfiguration } : {}),
			});
			return { body: { url: session.url } };
		} catch (error) {
			context.onFailure("portal", error);
			return unavailable(
				"billing_unavailable",
				"The payment portal is unavailable; your plan has not changed.",
				5,
			);
		}
	}

	async function erase(request: Routed): Promise<ModuleResponse> {
		const key = account(request);
		if (!key) return signInRequired();
		try {
			const row = await readAccount(billing, key);
			let canceled = 0;
			if (row?.customer_id) {
				const list = await stripe.get<StripeList<StripeSubscription>>("/v1/subscriptions", {
					customer: row.customer_id,
					status: "all",
					limit: 20,
				});
				for (const subscription of list.data)
					if (!["canceled", "incomplete_expired"].includes(subscription.status)) {
						await stripe.delete(
							`/v1/subscriptions/${encodeURIComponent(subscription.id)}`,
							`qrwtya-cancel-${subscription.id}`,
						);
						canceled++;
					}
			}
			await billing.execute(`SELECT ${SCHEMA}.forget_account($1)`, [key]);
			return { body: { subscriptionsCanceled: canceled } };
		} catch (error) {
			context.onFailure("account erase", error);
			return billingUnavailable();
		}
	}

	return defineRoutes<void>({
		"GET /billing": status,
		"POST /checkout": checkout,
		"POST /portal": portal,
		"POST /account/erase": erase,
	});
}

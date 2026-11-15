// Reconciliation (billing contract): an account's subscription state is always Stripe's canonical
// state, read fresh outside any transaction under the account's lease, then applied only by the
// holder of the current fence (apply_subscription), so out-of-order events and late or expired
// workers can never regress it. The webhook inbox is drained by repeat-safe leased attempts with a
// bounded backoff; an event only says which account to reconcile, never what its state is.

import { randomUUID } from "node:crypto";
import type { DatabaseReadWriter } from "../../dependencies.ts";
import { nextFirstFailure, productStatus } from "./policy.ts";
import {
	currentSubscription,
	periodEnd,
	type Stripe,
	StripeError,
	type StripeList,
	type StripeSubscription,
} from "./stripe.ts";

export const SCHEMA = "m_billing_api_customer_billing";
/** How long one reconciliation may hold an account (a Stripe read and one statement). */
export const LEASE_MS = 15_000;
/** Inbox attempts before an item is kept `failed` for repair (backoff 2, 4, ... 256 s). */
export const MAX_ATTEMPTS = 8;
/** The events the webhook endpoint subscribes to; any other is stored and ignored. */
export const HANDLED_EVENTS = new Set([
	"checkout.session.completed",
	"checkout.session.expired",
	"customer.subscription.created",
	"customer.subscription.updated",
	"customer.subscription.deleted",
	"invoice.paid",
	"invoice.payment_failed",
]);

export type Source = "webhook" | "reconciliation";
export type ReconcileResult = "applied" | "busy" | "stale" | "no_customer";

/** Reads the account's canonical subscription from Stripe and applies it under the lease. */
export async function reconcileAccount(
	billing: DatabaseReadWriter,
	stripe: Stripe,
	account: Buffer,
	source: Source,
	options: { failedAt?: Date | null; now?: () => Date } = {},
): Promise<ReconcileResult> {
	const now = options.now ?? (() => new Date());
	const token = randomUUID();
	const [lease] = await billing.query<{
		fence: string;
		customer_id: string | null;
		first_failure_at: Date | null;
	}>(`SELECT * FROM ${SCHEMA}.take_lease($1, $2::uuid, $3)`, [account, token, LEASE_MS]);
	if (!lease) return "busy";
	const release = () =>
		billing
			.execute(`SELECT ${SCHEMA}.release_lease($1, $2::uuid)`, [account, token])
			.catch(() => undefined);
	if (!lease.customer_id) {
		await release();
		return "no_customer";
	}
	let subscription: StripeSubscription | undefined;
	try {
		const list = await stripe.get<StripeList<StripeSubscription>>("/v1/subscriptions", {
			customer: lease.customer_id,
			status: "all",
			limit: 10,
		});
		subscription = currentSubscription(list.data);
	} catch (error) {
		await release();
		throw error;
	}
	const status = productStatus(subscription?.status);
	const at = now();
	let paidThrough = subscription ? periodEnd(subscription) : null;
	const cancelAt =
		typeof subscription?.cancel_at === "number" ? new Date(subscription.cancel_at * 1000) : null;
	if (cancelAt && (!paidThrough || cancelAt < paidThrough)) paidThrough = cancelAt;
	const [result] = await billing.query<{ applied: boolean }>(
		`SELECT * FROM ${SCHEMA}.apply_subscription($1, $2::uuid, $3::bigint, $4, $5, $6, $7, $8, $9, $10)`,
		[
			account,
			token,
			lease.fence,
			status,
			subscription?.id ?? null,
			subscription?.items?.data?.[0]?.price?.id ?? null,
			paidThrough,
			Boolean(subscription?.cancel_at_period_end || cancelAt),
			nextFirstFailure(lease.first_failure_at, status, at, options.failedAt ?? null),
			source,
		],
	);
	return result?.applied ? "applied" : "stale";
}

type InboxItem = {
	event_id: string;
	event_type: string;
	event_created: Date;
	customer_id: string | null;
	attempts: number;
	payload: { data?: { object?: Record<string, unknown> } };
};

export type DrainReport = { done: number; retried: number; failed: number; ignored: number };

/** Leases and processes due inbox items (one customer's, or any), within `budgetMs`. */
export async function drainInbox(
	billing: DatabaseReadWriter,
	stripe: Stripe,
	options: {
		customer?: string | null;
		limit?: number;
		budgetMs?: number;
		onFailure?: (what: string, error: unknown) => void;
	},
): Promise<DrainReport> {
	const report: DrainReport = { done: 0, retried: 0, failed: 0, ignored: 0 };
	const token = randomUUID();
	const items = await billing.query<InboxItem>(
		`SELECT * FROM ${SCHEMA}.inbox_lease($1::uuid, $2, $3, $4)`,
		[token, LEASE_MS, options.limit ?? 5, options.customer ?? null],
	);
	const deadline = Date.now() + (options.budgetMs ?? 5_000);
	for (const item of items) {
		if (Date.now() > deadline) break; // the rest stay leased and come back when it expires
		const outcome = await processItem(billing, stripe, item).catch((error: unknown) => {
			options.onFailure?.(`inbox ${item.event_type}`, error);
			return {
				retry:
					error instanceof StripeError
						? `stripe ${error.status}${error.code ? ` ${error.code}` : ""}`
						: "error",
			};
		});
		if ("finish" in outcome) {
			await billing.query(`SELECT ${SCHEMA}.inbox_finish($1, $2::uuid, $3, $4)`, [
				item.event_id,
				token,
				outcome.finish,
				outcome.note ?? null,
			]);
			if (outcome.finish === "done") report.done++;
			else report.ignored++;
		} else {
			const [row] = await billing.query<{ state: string | null }>(
				`SELECT ${SCHEMA}.inbox_retry($1, $2::uuid, $3, $4) AS state`,
				[item.event_id, token, outcome.retry, MAX_ATTEMPTS],
			);
			if (row?.state === "failed") report.failed++;
			else report.retried++;
		}
	}
	return report;
}

type Outcome = { finish: "done" | "ignored"; note?: string } | { retry: string };

async function processItem(
	billing: DatabaseReadWriter,
	stripe: Stripe,
	item: InboxItem,
): Promise<Outcome> {
	if (!HANDLED_EVENTS.has(item.event_type)) return { finish: "ignored", note: "unhandled type" };
	if (!item.customer_id) return { finish: "ignored", note: "no customer" };
	// Only a customer this server created and mapped counts; any other is ignored (wrong customer).
	const [account] = await billing.query<{
		account_key: Buffer;
		checkout_session_id: string | null;
	}>(`SELECT account_key, checkout_session_id FROM ${SCHEMA}.accounts WHERE customer_id = $1`, [
		item.customer_id,
	]);
	if (!account) return { finish: "ignored", note: "unknown customer" };
	const object = item.payload.data?.object ?? {};
	if (
		item.event_type === "checkout.session.completed" &&
		typeof object.id === "string" &&
		object.id === account.checkout_session_id
	)
		await billing.execute(
			`UPDATE ${SCHEMA}.accounts SET checkout_completed_at = coalesce(checkout_completed_at, clock_timestamp()) WHERE account_key = $1`,
			[account.account_key],
		);
	const result = await reconcileAccount(billing, stripe, account.account_key, "webhook", {
		failedAt: item.event_type === "invoice.payment_failed" ? item.event_created : null,
	});
	if (result === "applied" || result === "no_customer") return { finish: "done" };
	return { retry: result };
}

/** The customer an event concerns: its object's `customer`, or the object itself for a customer. */
export function eventCustomer(type: string, object: Record<string, unknown> | undefined) {
	if (!object) return null;
	if (type.startsWith("customer.") && !type.startsWith("customer.subscription."))
		return typeof object.id === "string" ? object.id : null;
	return typeof object.customer === "string" ? object.customer : null;
}

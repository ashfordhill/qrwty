// Payment events' routes, below /modules/billing-api-payment-events. No session: Stripe's signature
// over the unchanged raw body is the webhook's only authorization (billing contract), checked before
// the body is parsed or anything is written. A verified event is stored in the inbox, unique by
// its ID, before the 2xx; a duplicate is 2xx with no second effect, and an inbox failure is 503 so
// Stripe retries. Then this customer's due items are processed for a short while (leased and
// repeat-safe); anything unfinished stays in the inbox for the next attempt.
//   POST /webhook          Stripe's events (Session API forwards /api/v1/billing/webhook's bytes)
//   POST /jobs/reconcile   the reconciliation job: due inbox items, accounts not synced for a day

import { createFailureLog } from "../../../runtime/tile-process.ts";
import type { DatabaseReadWriter } from "../../dependencies.ts";
import { defineRoutes, type ModuleRequest, type ModuleResponse } from "../../entry.ts";
import { problem, singleHeader, unavailable } from "../../link-api/link-operations/contract.ts";
import { drainInbox, eventCustomer, reconcileAccount, SCHEMA } from "./reconcile.ts";
import { type Stripe, verifyStripeSignature } from "./stripe.ts";

/** http-contract §9: a body over 256 KiB is 413 (the runtime's own limit, 64 KiB, comes first). */
export const MAX_WEBHOOK_BYTES = 256 * 1024;
/** How long the webhook waits for its own processing before it answers. */
export const INLINE_MS = 500;

export type EventsContext = {
	billing: DatabaseReadWriter;
	stripe: Stripe;
	webhookSecret: string;
	onFailure?: (what: string, error: unknown) => void;
	nowSeconds?: () => number;
};

type StripeEvent = {
	id: string;
	type: string;
	created: number;
	livemode?: boolean;
	data: { object: Record<string, unknown> };
};

/** The verified bytes as an event, or undefined when they aren't one. */
export function parseEvent(raw: Uint8Array): StripeEvent | undefined {
	let value: unknown;
	try {
		value = JSON.parse(Buffer.from(raw).toString("utf8"));
	} catch {
		return undefined;
	}
	const event = value as Partial<StripeEvent> | undefined;
	if (
		!event ||
		typeof event.id !== "string" ||
		!/^evt_[A-Za-z0-9_]{1,250}$/.test(event.id) ||
		typeof event.type !== "string" ||
		!/^[a-z0-9_.]{1,100}$/.test(event.type) ||
		typeof event.created !== "number" ||
		!event.data ||
		typeof event.data.object !== "object" ||
		event.data.object === null
	)
		return undefined;
	return event as StripeEvent;
}

export function eventRoutes(context: EventsContext) {
	const failure = context.onFailure ?? createFailureLog("billing-api");
	const nowSeconds = context.nowSeconds ?? (() => Math.floor(Date.now() / 1000));
	const { billing, stripe } = context;

	async function webhook(request: ModuleRequest): Promise<ModuleResponse> {
		const raw = request.rawBody;
		if (raw && raw.byteLength > MAX_WEBHOOK_BYTES)
			return problem(413, "payload_too_large", "The event is too large.", false);
		const verdict = verifyStripeSignature(
			raw,
			singleHeader(request.headers, "stripe-signature"),
			context.webhookSecret,
			nowSeconds(),
		);
		if (verdict !== "ok")
			return problem(400, "signature_invalid", "The Stripe signature does not verify.", false, {
				reason: verdict,
			});
		const event = raw ? parseEvent(raw) : undefined;
		if (!event) return problem(400, "invalid_event", "The body is not a Stripe event.", false);
		const customer = eventCustomer(event.type, event.data.object);
		let inserted: boolean;
		try {
			const [row] = await billing.query<{ inserted: boolean }>(
				`SELECT ${SCHEMA}.inbox_insert($1, $2, to_timestamp($3), $4, $5::jsonb) AS inserted`,
				[
					event.id,
					event.type,
					event.created,
					customer,
					Buffer.from(raw as Uint8Array).toString("utf8"),
				],
			);
			inserted = row?.inserted === true;
		} catch (error) {
			failure("webhook inbox", error);
			return unavailable("inbox_unavailable", "The event was not stored; retry.", 5);
		}
		// Durable now. Process this customer's due items briefly, then a few others and the purge;
		// whatever doesn't finish is leased and comes back when its lease ends.
		const work = (async () => {
			if (customer)
				await drainInbox(billing, stripe, {
					customer,
					limit: 3,
					budgetMs: 3_000,
					onFailure: failure,
				});
			await drainInbox(billing, stripe, { limit: 2, budgetMs: 2_000, onFailure: failure });
			await billing.query(`SELECT ${SCHEMA}.inbox_purge(100)`);
		})().catch((error: unknown) => failure("webhook processing", error));
		await Promise.race([work, new Promise((resolve) => setTimeout(resolve, INLINE_MS))]);
		return { body: { received: true, duplicate: !inserted } };
	}

	async function job(): Promise<ModuleResponse> {
		const report = {
			inbox: { done: 0, retried: 0, failed: 0, ignored: 0 },
			accounts: 0,
			errors: 0,
		};
		try {
			const drained = await drainInbox(billing, stripe, {
				limit: 50,
				budgetMs: 20_000,
				onFailure: failure,
			});
			report.inbox = drained;
			const stale = await billing.query<{ account_key: Buffer }>(
				`SELECT account_key FROM ${SCHEMA}.accounts WHERE customer_id IS NOT NULL AND (synced_at IS NULL OR synced_at < clock_timestamp() - interval '20 hours') ORDER BY synced_at NULLS FIRST LIMIT 20`,
			);
			for (const row of stale)
				try {
					if (
						(await reconcileAccount(billing, stripe, row.account_key, "reconciliation")) ===
						"applied"
					)
						report.accounts++;
				} catch (error) {
					report.errors++;
					failure("reconcile job", error);
				}
			await billing.query(`SELECT ${SCHEMA}.inbox_purge(1000)`);
			return { body: report };
		} catch (error) {
			failure("reconcile job", error);
			return unavailable("storage_unavailable", "Billing storage is unavailable.", 30);
		}
	}

	return defineRoutes<void>({
		"POST /webhook": (request) => webhook(request),
		"POST /jobs/reconcile": () => job(),
	});
}

// Payment events, a Custom in Billing API: No session: verifies the Stripe signature over the raw body bytes, stores the event in the inbox before 2xx, then reconciles subscriptions from Stripe under a lease.
// Write the module here. Export never overwrites your edits: export afresh and carry them over.
import type { ModuleRequest, ModuleResponse } from "../entry.ts";
import type { Dependencies } from "./billing-api-payment-events.slots.ts";
import { declareSettings } from "../../runtime/settings.ts";

/** The settings this module reads, by name: text(), integer(), url(), secret() or keyRing();
 * optional(kind) for an optional one. Values come from the process environment, secrets from
 * SECRET_DIR files. */
export const settings = declareSettings({});

/** Answers any method on /modules/billing-api-payment-events and every path below it. */
export async function billingApiPaymentEvents(dependencies: Dependencies, request: ModuleRequest): Promise<ModuleResponse> {
  throw new Error("Not implemented: Payment events");
}

// Customer billing, a Custom in Billing API: Signed-in owner only: plan status, hosted Checkout and portal sessions from allowlisted prices, allowed return URLs and idempotency keys. CSRF is checked by Session API.
// Write the module here. Export never overwrites your edits: export afresh and carry them over.
import type { ModuleRequest, ModuleResponse } from "../entry.ts";
import type { Dependencies } from "./billing-api-customer-billing.slots.ts";
import { declareSettings } from "../../runtime/settings.ts";

/** The settings this module reads, by name: text(), integer(), url(), secret() or keyRing();
 * optional(kind) for an optional one. Values come from the process environment, secrets from
 * SECRET_DIR files. */
export const settings = declareSettings({});

/** Answers any method on /modules/billing-api-customer-billing and every path below it. */
export async function billingApiCustomerBilling(dependencies: Dependencies, request: ModuleRequest): Promise<ModuleResponse> {
  throw new Error("Not implemented: Customer billing");
}

// Entitlements, a Custom in Billing API: Entitlement grants valid for at most 60 seconds, for Link API and Account API only. Fails closed for paid-gated operations when no valid grant exists.
// Write the module here. Export never overwrites your edits: export afresh and carry them over.
import type { ModuleRequest, ModuleResponse } from "../entry.ts";
import type { Dependencies } from "./billing-api-entitlements.slots.ts";

/** Answers any method on /modules/billing-api-entitlements and every path below it. */
export async function billingApiEntitlements(dependencies: Dependencies, request: ModuleRequest): Promise<ModuleResponse> {
  throw new Error("Not implemented: Entitlements");
}

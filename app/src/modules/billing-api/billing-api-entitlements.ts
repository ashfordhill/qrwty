// Entitlements, a Custom in Billing API: Entitlement grants valid for at most 60 seconds, for Link API and Account API only. Fails closed for paid-gated operations when no valid grant exists.
// Write the module here. Export never overwrites your edits: export afresh and carry them over.
import type { ModuleRequest, ModuleResponse } from "../entry.ts";
import type { Dependencies } from "./billing-api-entitlements.slots.ts";
import { declareSettings } from "../../runtime/settings.ts";
import { createFailureLog } from "../../runtime/tile-process.ts";
import { entitlementRoutes } from "./billing/entitlements.ts";
import { priceSetting } from "./billing/settings.ts";

/** The settings this module reads, by name: text(), integer(), url(), secret() or keyRing();
 * optional(kind) for an optional one. Values come from the process environment, secrets from
 * SECRET_DIR files. */
export const settings = declareSettings({
  // A7: only this price grants Paid (decisions §4).
  STRIPE_PRICE_PAID_MONTHLY: priceSetting,
});

const failure = createFailureLog("billing-api");
const built = new WeakMap<object, ReturnType<typeof entitlementRoutes>>();

/** Answers any method on /modules/billing-api-entitlements and every path below it. */
export async function billingApiEntitlements(dependencies: Dependencies, request: ModuleRequest): Promise<ModuleResponse> {
  let routes = built.get(dependencies.settings);
  if (!routes) {
    routes = entitlementRoutes({
      billing: dependencies.billing,
      price: dependencies.settings.STRIPE_PRICE_PAID_MONTHLY,
      onFailure: failure,
    });
    built.set(dependencies.settings, routes);
  }
  return routes(request);
}

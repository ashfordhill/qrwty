// Customer billing, a Custom in Billing API: Signed-in owner only: plan status, hosted Checkout and portal sessions from allowlisted prices, allowed return URLs and idempotency keys. CSRF is checked by Session API.
// Write the module here. Export never overwrites your edits: export afresh and carry them over.
import type { ModuleRequest, ModuleResponse } from "../entry.ts";
import type { Dependencies } from "./billing-api-customer-billing.slots.ts";
import { declareSettings, optional } from "../../runtime/settings.ts";
import { createFailureLog } from "../../runtime/tile-process.ts";
import { customerRoutes } from "./billing/customer.ts";
import {
  portalSetting,
  priceSetting,
  publicOriginSetting,
  stripeKeySetting,
} from "./billing/settings.ts";
import { stripeClient } from "./billing/stripe.ts";

/** The settings this module reads, by name: text(), integer(), url(), secret() or keyRing();
 * optional(kind) for an optional one. Values come from the process environment, secrets from
 * SECRET_DIR files. */
export const settings = declareSettings({
  // A7: Stripe test mode only; the key is the file `stripe-secret-key` (billing/settings.ts).
  STRIPE_SECRET_KEY: stripeKeySetting,
  // The allowlisted paid price, configuration (decisions §4).
  STRIPE_PRICE_PAID_MONTHLY: priceSetting,
  // The customer-portal configuration Manage payment opens; absent: the account's default.
  STRIPE_PORTAL_CONFIGURATION: optional(portalSetting),
  // Checkout and the portal return to <origin>/billing.
  QRWTY_PUBLIC_ORIGIN_URL: publicOriginSetting,
});

const failure = createFailureLog("billing-api");
const built = new WeakMap<object, ReturnType<typeof customerRoutes>>();

/** Answers any method on /modules/billing-api-customer-billing and every path below it. */
export async function billingApiCustomerBilling(dependencies: Dependencies, request: ModuleRequest): Promise<ModuleResponse> {
  let routes = built.get(dependencies.settings);
  if (!routes) {
    const values = dependencies.settings;
    routes = customerRoutes({
      billing: dependencies.billing,
      stripe: stripeClient(dependencies.stripeApi, values.STRIPE_SECRET_KEY),
      price: values.STRIPE_PRICE_PAID_MONTHLY,
      portalConfiguration: values.STRIPE_PORTAL_CONFIGURATION,
      origin: values.QRWTY_PUBLIC_ORIGIN_URL,
      onFailure: failure,
    });
    built.set(dependencies.settings, routes);
  }
  return routes(request);
}

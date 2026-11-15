// Payment events, a Custom in Billing API: No session: verifies the Stripe signature over the raw body bytes, stores the event in the inbox before 2xx, then reconciles subscriptions from Stripe under a lease.
// Write the module here. Export never overwrites your edits: export afresh and carry them over.
import type { ModuleRequest, ModuleResponse } from "../entry.ts";
import type { Dependencies } from "./billing-api-payment-events.slots.ts";
import { declareSettings } from "../../runtime/settings.ts";
import { createFailureLog } from "../../runtime/tile-process.ts";
import { eventRoutes } from "./billing/events.ts";
import { stripeKeySetting, webhookSecretSetting } from "./billing/settings.ts";
import { stripeClient } from "./billing/stripe.ts";

/** The settings this module reads, by name: text(), integer(), url(), secret() or keyRing();
 * optional(kind) for an optional one. Values come from the process environment, secrets from
 * SECRET_DIR files. */
export const settings = declareSettings({
  // A7: the test-mode key (file `stripe-secret-key`) and the endpoint's signing secret (file
  // `stripe-webhook-secret`), both from Secret Manager in production.
  STRIPE_SECRET_KEY: stripeKeySetting,
  STRIPE_WEBHOOK_SECRET: webhookSecretSetting,
});

const failure = createFailureLog("billing-api");
const built = new WeakMap<object, ReturnType<typeof eventRoutes>>();

/** Answers any method on /modules/billing-api-payment-events and every path below it. */
export async function billingApiPaymentEvents(dependencies: Dependencies, request: ModuleRequest): Promise<ModuleResponse> {
  let routes = built.get(dependencies.settings);
  if (!routes) {
    routes = eventRoutes({
      billing: dependencies.billing,
      stripe: stripeClient(dependencies.stripeApi, dependencies.settings.STRIPE_SECRET_KEY),
      webhookSecret: dependencies.settings.STRIPE_WEBHOOK_SECRET,
      onFailure: failure,
    });
    built.set(dependencies.settings, routes);
  }
  return routes(request);
}

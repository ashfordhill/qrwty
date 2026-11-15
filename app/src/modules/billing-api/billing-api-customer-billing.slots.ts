// Generated scaffold: Customer billing, a Custom in Billing API.
// Export rewrites this file; write the module in billing-api-customer-billing.ts.
import type { SettingsOf } from "../../runtime/settings.ts";
import type { DatabaseReadWriter, HttpTarget } from "../dependencies.ts";

/** What the module uses: one property per connected slot, and its own settings. */
export type Dependencies = {
  // uses: Billing (Database) through billing-api-billing, read & write
  billing: DatabaseReadWriter;
  // uses: Stripe API (External API) through billing-api-stripe-api, request
  stripeApi: HttpTarget;
  // settings: the values billing-api-customer-billing.ts's `settings` export declares.
  settings: SettingsOf<typeof import("./billing-api-customer-billing.ts")>;
};

/** Each connected slot: the tile or module it uses, through which link, and how. */
export const slots = [
  {"slot":"uses","property":"billing","tile":"billing","kind":"database","connection":"billing-api-billing","link":"billing-api-customer-billing-billing","use":"read-write","access":"write"},
  {"slot":"uses","property":"stripeApi","tile":"stripe-api","kind":"external-api","connection":"billing-api-stripe-api","link":"billing-api-customer-billing-stripe-api","use":"request"},
] as const;

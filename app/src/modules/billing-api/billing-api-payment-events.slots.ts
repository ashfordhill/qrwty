// Generated scaffold: Payment events, a Custom in Billing API.
// Export rewrites this file; write the module in billing-api-payment-events.ts.
import type { DatabaseReadWriter, HttpTarget } from "../dependencies.ts";

/** What the module uses: one property per connected slot. */
export type Dependencies = {
  // uses: Billing (Database) through billing-api-billing, read & write
  billing: DatabaseReadWriter;
  // uses: Stripe API (External API) through billing-api-stripe-api, request
  stripeApi: HttpTarget;
};

/** Each connected slot: the tile or module it uses, through which link, and how. */
export const slots = [
  {"slot":"uses","property":"billing","tile":"billing","kind":"database","connection":"billing-api-billing","link":"billing-api-payment-events-billing","use":"read-write","access":"write"},
  {"slot":"uses","property":"stripeApi","tile":"stripe-api","kind":"external-api","connection":"billing-api-stripe-api","link":"billing-api-payment-events-stripe-api","use":"request"},
] as const;

// Generated scaffold: API forwarding, a Custom in Session API.
// Export rewrites this file; write the module in session-api-api-forwarding.ts.
import type { DatabaseReadWriter, HttpTarget } from "../dependencies.ts";

/** What the module uses: one property per connected slot. */
export type Dependencies = {
  // uses: Sessions (Database) through session-api-sessions, read & write
  sessions: DatabaseReadWriter;
  // uses: Identity (Identity) through session-api-identity, request
  identity: HttpTarget;
  // uses: Link API (Microservice) through session-api-link-api, request
  linkApi: HttpTarget;
  // uses: Account API (Microservice) through session-api-account-api, request
  accountApi: HttpTarget;
  // uses: Billing API (Microservice) through session-api-billing-api, request
  billingApi: HttpTarget;
};

/** Each connected slot: the tile or module it uses, through which link, and how. */
export const slots = [
  {"slot":"uses","property":"sessions","tile":"sessions","kind":"database","connection":"session-api-sessions","link":"session-api-api-forwarding-sessions","use":"read-write","access":"write"},
  {"slot":"uses","property":"identity","tile":"identity","kind":"identity","connection":"session-api-identity","link":"session-api-api-forwarding-identity","use":"request"},
  {"slot":"uses","property":"linkApi","tile":"link-api","kind":"service","connection":"session-api-link-api","link":"session-api-api-forwarding-link-api","use":"request"},
  {"slot":"uses","property":"accountApi","tile":"account-api","kind":"service","connection":"session-api-account-api","link":"session-api-api-forwarding-account-api","use":"request"},
  {"slot":"uses","property":"billingApi","tile":"billing-api","kind":"service","connection":"session-api-billing-api","link":"session-api-api-forwarding-billing-api","use":"request"},
] as const;

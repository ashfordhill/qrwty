// Generated scaffold: Link analytics, a Custom in Account API.
// Export rewrites this file; write the module in account-api-link-analytics.ts.
import type { DatabaseReader, HttpTarget } from "../dependencies.ts";

/** What the module uses: one property per connected slot. */
export type Dependencies = {
  // uses: Links (Database) through account-api-links, read
  links: DatabaseReader;
  // uses: Analytics (Database) through account-api-analytics, read
  analytics: DatabaseReader;
  // uses: Billing API (Microservice) through account-api-billing-api, request
  billingApi: HttpTarget;
};

/** Each connected slot: the tile or module it uses, through which link, and how. */
export const slots = [
  {"slot":"uses","property":"links","tile":"links","kind":"database","connection":"account-api-links","link":"account-api-link-analytics-links","use":"read","access":"read"},
  {"slot":"uses","property":"analytics","tile":"analytics","kind":"database","connection":"account-api-analytics","link":"account-api-link-analytics-analytics","use":"read","access":"read"},
  {"slot":"uses","property":"billingApi","tile":"billing-api","kind":"service","connection":"account-api-billing-api","link":"account-api-link-analytics-billing-api","use":"request"},
] as const;

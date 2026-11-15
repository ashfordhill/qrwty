// Generated scaffold: Link operations, a Custom in Link API.
// Export rewrites this file; write the module in link-api-link-operations.ts.
import type { SettingsOf } from "../../runtime/settings.ts";
import type { CacheClient, DatabaseReadWriter, HttpTarget } from "../dependencies.ts";

/** What the module uses: one property per connected slot, and its own settings. */
export type Dependencies = {
  // uses: Links (Database) through link-api-links, read & write
  links: DatabaseReadWriter;
  // uses: Admission cache (Cache) through link-api-admission-cache, read & write
  admissionCache: CacheClient;
  // uses: Reputation API (External API) through link-api-reputation-api, request
  reputationApi: HttpTarget;
  // uses: Billing API (Microservice) through link-api-billing-api, request
  billingApi: HttpTarget;
  // settings: the values link-api-link-operations.ts's `settings` export declares.
  settings: SettingsOf<typeof import("./link-api-link-operations.ts")>;
};

/** Each connected slot: the tile or module it uses, through which link, and how. */
export const slots = [
  {"slot":"uses","property":"links","tile":"links","kind":"database","connection":"link-api-links","link":"link-api-link-operations-links","use":"read-write","access":"write"},
  {"slot":"uses","property":"admissionCache","tile":"admission-cache","kind":"cache","connection":"link-api-admission-cache","link":"link-api-link-operations-admission-cache","use":"read-write","access":"write"},
  {"slot":"uses","property":"reputationApi","tile":"reputation-api","kind":"external-api","connection":"link-api-reputation-api","link":"link-api-link-operations-reputation-api","use":"request"},
  {"slot":"uses","property":"billingApi","tile":"billing-api","kind":"service","connection":"link-api-billing-api","link":"link-api-link-operations-billing-api","use":"request"},
] as const;

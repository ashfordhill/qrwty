// Generated scaffold: Entitlements, a Custom in Billing API.
// Export rewrites this file; write the module in billing-api-entitlements.ts.
import type { SettingsOf } from "../../runtime/settings.ts";
import type { DatabaseReadWriter } from "../dependencies.ts";

/** What the module uses: one property per connected slot, and its own settings. */
export type Dependencies = {
  // uses: Billing (Database) through billing-api-billing, read & write
  billing: DatabaseReadWriter;
  // settings: the values billing-api-entitlements.ts's `settings` export declares.
  settings: SettingsOf<typeof import("./billing-api-entitlements.ts")>;
};

/** Each connected slot: the tile or module it uses, through which link, and how. */
export const slots = [
  {"slot":"uses","property":"billing","tile":"billing","kind":"database","connection":"billing-api-billing","link":"billing-api-entitlements-billing","use":"read-write","access":"write"},
] as const;

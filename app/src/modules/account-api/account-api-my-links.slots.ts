// Generated scaffold: My links, a Data access in Account API.
// Export rewrites this file; write the module in account-api-my-links.ts.
import type { SettingsOf } from "../../runtime/settings.ts";
import type { DatabaseReader } from "../dependencies.ts";

/** What the module uses: one property per connected slot, and its own settings. */
export type Dependencies = {
  // database: Links (Database) through account-api-links, read
  links: DatabaseReader;
  // settings: the values account-api-my-links.ts's `settings` export declares.
  settings: SettingsOf<typeof import("./account-api-my-links.ts")>;
};

/** Each connected slot: the tile or module it uses, through which link, and how. */
export const slots = [
  {"slot":"database","property":"links","tile":"links","kind":"database","connection":"account-api-links","link":"account-api-my-links-links","use":"read","access":"read"},
] as const;

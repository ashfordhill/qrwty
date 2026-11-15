// Generated scaffold: My links, a Data access in Account API.
// Export rewrites this file; write the module in account-api-my-links.ts.
import type { DatabaseReader } from "../dependencies.ts";

/** What the module uses: one property per connected slot. */
export type Dependencies = {
  // database: Links (Database) through account-api-links, read
  links: DatabaseReader;
};

/** Each connected slot: the tile or module it uses, through which link, and how. */
export const slots = [
  {"slot":"database","property":"links","tile":"links","kind":"database","connection":"account-api-links","link":"account-api-my-links-links","use":"read","access":"read"},
] as const;

// Generated scaffold: Abuse and moderation, a Custom in Link API.
// Export rewrites this file; write the module in link-api-abuse-and-moderation.ts.
import type { SettingsOf } from "../../runtime/settings.ts";
import type { CacheClient, DatabaseReadWriter } from "../dependencies.ts";

/** What the module uses: one property per connected slot, and its own settings. */
export type Dependencies = {
  // uses: Links (Database) through link-api-links, read & write
  links: DatabaseReadWriter;
  // uses: Admission cache (Cache) through link-api-admission-cache, read & write
  admissionCache: CacheClient;
  // settings: the values link-api-abuse-and-moderation.ts's `settings` export declares.
  settings: SettingsOf<typeof import("./link-api-abuse-and-moderation.ts")>;
};

/** Each connected slot: the tile or module it uses, through which link, and how. */
export const slots = [
  {"slot":"uses","property":"links","tile":"links","kind":"database","connection":"link-api-links","link":"link-api-abuse-and-moderation-links","use":"read-write","access":"write"},
  {"slot":"uses","property":"admissionCache","tile":"admission-cache","kind":"cache","connection":"link-api-admission-cache","link":"link-api-abuse-and-moderation-admission-cache","use":"read-write","access":"write"},
] as const;

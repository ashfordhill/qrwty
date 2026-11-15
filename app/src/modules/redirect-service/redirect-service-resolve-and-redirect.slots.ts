// Generated scaffold: Resolve and redirect, a Custom in Redirect service.
// Export rewrites this file; write the module in redirect-service-resolve-and-redirect.ts.
import type { SettingsOf } from "../../runtime/settings.ts";
import type { CacheClient, DatabaseReader, QueuePublisher } from "../dependencies.ts";

/** What the module uses: one property per connected slot, and its own settings. */
export type Dependencies = {
  // uses: Links (Database) through redirect-service-links, read
  links: DatabaseReader;
  // uses: Hot routes (Cache) through redirect-service-hot-routes, read & write
  hotRoutes: CacheClient;
  // uses: Click events (Message channel) through redirect-service-click-events, publish
  clickEvents: QueuePublisher;
  // settings: the values redirect-service-resolve-and-redirect.ts's `settings` export declares.
  settings: SettingsOf<typeof import("./redirect-service-resolve-and-redirect.ts")>;
};

/** Each connected slot: the tile or module it uses, through which link, and how. */
export const slots = [
  {"slot":"uses","property":"links","tile":"links","kind":"database","connection":"redirect-service-links","link":"redirect-service-resolve-and-redirect-links","use":"read","access":"read"},
  {"slot":"uses","property":"hotRoutes","tile":"hot-routes","kind":"cache","connection":"redirect-service-hot-routes","link":"redirect-service-resolve-and-redirect-hot-routes","use":"read-write","access":"write"},
  {"slot":"uses","property":"clickEvents","tile":"click-events","kind":"queue","connection":"redirect-service-click-events","link":"redirect-service-resolve-and-redirect-click-events","use":"publish"},
] as const;

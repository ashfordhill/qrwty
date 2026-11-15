// Generated scaffold: Click aggregator, a Custom in Analytics worker.
// Export rewrites this file; write the module in analytics-worker-click-aggregator.ts.
import type { SettingsOf } from "../../runtime/settings.ts";
import type { DatabaseReadWriter } from "../dependencies.ts";

/** What the module uses: one property per connected slot, and its own settings. */
export type Dependencies = {
  // uses: Click events (Message channel) through click-events-analytics-worker, consume
  // clickEvents: its loop delivers each message to the entry point.
  // uses: Analytics (Database) through analytics-worker-analytics, read & write
  analytics: DatabaseReadWriter;
  // settings: the values analytics-worker-click-aggregator.ts's `settings` export declares.
  settings: SettingsOf<typeof import("./analytics-worker-click-aggregator.ts")>;
};

/** Each connected slot: the tile or module it uses, through which link, and how. */
export const slots = [
  {"slot":"uses","property":"clickEvents","tile":"click-events","kind":"queue","connection":"click-events-analytics-worker","link":"analytics-worker-click-aggregator-click-events","use":"consume"},
  {"slot":"uses","property":"analytics","tile":"analytics","kind":"database","connection":"analytics-worker-analytics","link":"analytics-worker-click-aggregator-analytics","use":"read-write","access":"write"},
] as const;

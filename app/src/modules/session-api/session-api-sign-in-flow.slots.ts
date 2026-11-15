// Generated scaffold: Sign-in flow, a Custom in Session API.
// Export rewrites this file; write the module in session-api-sign-in-flow.ts.
import type { SettingsOf } from "../../runtime/settings.ts";
import type { DatabaseReadWriter, HttpTarget } from "../dependencies.ts";

/** What the module uses: one property per connected slot, and its own settings. */
export type Dependencies = {
  // uses: Identity (Identity) through session-api-identity, request
  identity: HttpTarget;
  // uses: Sessions (Database) through session-api-sessions, read & write
  sessions: DatabaseReadWriter;
  // settings: the values session-api-sign-in-flow.ts's `settings` export declares.
  settings: SettingsOf<typeof import("./session-api-sign-in-flow.ts")>;
};

/** Each connected slot: the tile or module it uses, through which link, and how. */
export const slots = [
  {"slot":"uses","property":"identity","tile":"identity","kind":"identity","connection":"session-api-identity","link":"session-api-sign-in-flow-identity","use":"request"},
  {"slot":"uses","property":"sessions","tile":"sessions","kind":"database","connection":"session-api-sessions","link":"session-api-sign-in-flow-sessions","use":"read-write","access":"write"},
] as const;

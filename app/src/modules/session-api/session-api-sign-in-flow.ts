// Sign-in flow, a Custom in Session API: OIDC authorization code with PKCE, state and nonce; creates, refreshes and revokes cookie sessions (Secure, HttpOnly). Keeps the guest claim proof flow in the same tab.
// Write the module here. Export never overwrites your edits: export afresh and carry them over.
import type { ModuleRequest, ModuleResponse } from "../entry.ts";
import type { Dependencies } from "./session-api-sign-in-flow.slots.ts";

/** Answers any method on /modules/session-api-sign-in-flow and every path below it. */
export async function sessionApiSignInFlow(dependencies: Dependencies, request: ModuleRequest): Promise<ModuleResponse> {
  throw new Error("Not implemented: Sign-in flow");
}

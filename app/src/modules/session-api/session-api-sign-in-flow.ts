// Sign-in flow, a Custom in Session API: OIDC authorization code with PKCE, state and nonce; creates, refreshes and revokes cookie sessions (Secure, HttpOnly). Keeps the guest claim proof flow in the same tab.
// Write the module here. Export never overwrites your edits: export afresh and carry them over.
import type { ModuleRequest, ModuleResponse } from "../entry.ts";
import type { Dependencies } from "./session-api-sign-in-flow.slots.ts";
import { declareSettings } from "../../runtime/settings.ts";
import { sessionContext } from "./session/context.ts";
import { productShape } from "./session/forward.ts";
import { sessionSettings } from "./session/settings.ts";
import { signInRoutes } from "./session/signin.ts";

/** The settings this module reads, by name: text(), integer(), url(), secret() or keyRing();
 * optional(kind) for an optional one. Values come from the process environment, secrets from
 * SECRET_DIR files. */
export const settings = declareSettings({ ...sessionSettings });

/** Answers any method on /modules/session-api-sign-in-flow and every path below it. */
export async function sessionApiSignInFlow(dependencies: Dependencies, request: ModuleRequest): Promise<ModuleResponse> {
  return productShape(await signInRoutes(request, sessionContext(dependencies)));
}

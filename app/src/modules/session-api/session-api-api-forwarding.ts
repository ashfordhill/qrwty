// API forwarding, a Custom in Session API: Checks the session cookie and CSRF on mutations, then forwards the bearer token (none on guest create) to Link, Account and Billing APIs. Refreshes tokens with Identity.
// Write the module here. Export never overwrites your edits: export afresh and carry them over.
import type { ModuleRequest, ModuleResponse } from "../entry.ts";
import type { Dependencies } from "./session-api-api-forwarding.slots.ts";
import { declareSettings } from "../../runtime/settings.ts";

/** The settings this module reads, by name: text(), integer(), url(), secret() or keyRing();
 * optional(kind) for an optional one. Values come from the process environment, secrets from
 * SECRET_DIR files. */
export const settings = declareSettings({});

/** Answers any method on /modules/session-api-api-forwarding and every path below it. */
export async function sessionApiApiForwarding(dependencies: Dependencies, request: ModuleRequest): Promise<ModuleResponse> {
  throw new Error("Not implemented: API forwarding");
}

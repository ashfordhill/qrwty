// Abuse and moderation, a Custom in Link API: Bounded public abuse reports (202, no disposition shown) and block or unblock under a separate operator permission. A report alone never disables a link.
// Write the module here. Export never overwrites your edits: export afresh and carry them over.
import type { ModuleRequest, ModuleResponse } from "../entry.ts";
import type { Dependencies } from "./link-api-abuse-and-moderation.slots.ts";

/** Answers any method on /modules/link-api-abuse-and-moderation and every path below it. */
export async function linkApiAbuseAndModeration(dependencies: Dependencies, request: ModuleRequest): Promise<ModuleResponse> {
  throw new Error("Not implemented: Abuse and moderation");
}

// Link operations, a Custom in Link API: Create (guest or owned) with CSPRNG slugs, idempotency keys and admission; claim with one-time proof; If-Match edits; tombstone deletes. Reputation check and entitlement grant first.
// Write the module here. Export never overwrites your edits: export afresh and carry them over.
import type { ModuleRequest, ModuleResponse } from "../entry.ts";
import type { Dependencies } from "./link-api-link-operations.slots.ts";

/** Answers any method on /modules/link-api-link-operations and every path below it. */
export async function linkApiLinkOperations(dependencies: Dependencies, request: ModuleRequest): Promise<ModuleResponse> {
  throw new Error("Not implemented: Link operations");
}

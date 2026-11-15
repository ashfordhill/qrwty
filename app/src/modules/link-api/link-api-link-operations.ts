// Link operations, a Custom in Link API: Create (guest or owned) with CSPRNG slugs, idempotency keys and admission; claim with one-time proof; If-Match edits; tombstone deletes. Reputation check and entitlement grant first.
// Write the module here. Export never overwrites your edits: export afresh and carry them over.
import type { ModuleRequest, ModuleResponse } from "../entry.ts";
import type { Dependencies } from "./link-api-link-operations.slots.ts";
import { linkOperationsFromEnvironment } from "./link-operations/service.ts";

// Read once as Link API's process loads: the public origin, the replay key ring and the test
// profile's hooks. A missing or invalid one fails startup, naming it.
const operations = linkOperationsFromEnvironment();

/** Answers any method on /modules/link-api-link-operations and every path below it. */
export async function linkApiLinkOperations(dependencies: Dependencies, request: ModuleRequest): Promise<ModuleResponse> {
  return operations(dependencies, request);
}

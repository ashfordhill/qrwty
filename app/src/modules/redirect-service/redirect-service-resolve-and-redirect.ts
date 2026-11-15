// Resolve and redirect, a Custom in Redirect service: Host + slug via Hot routes, else the Links public view; state and expiry; publish the click and await its ACK; recheck; then 302 with no-store. Otherwise 404/410/403, or 503 with no Location.
// Write the module here. Export never overwrites your edits: export afresh and carry them over.
import type { ModuleRequest, ModuleResponse } from "../entry.ts";
import type { Dependencies } from "./redirect-service-resolve-and-redirect.slots.ts";

/** Answers any method on /modules/redirect-service-resolve-and-redirect and every path below it. */
export async function redirectServiceResolveAndRedirect(dependencies: Dependencies, request: ModuleRequest): Promise<ModuleResponse> {
  throw new Error("Not implemented: Resolve and redirect");
}

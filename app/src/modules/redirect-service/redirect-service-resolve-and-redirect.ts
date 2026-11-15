// Resolve and redirect, a Custom in Redirect service: Host + slug via Hot routes, else the Links public view; state and expiry; publish the click and await its ACK; recheck; then 302 with no-store. Otherwise 404/410/403, or 503 with no Location.
// Write the module here. Export never overwrites your edits: export afresh and carry them over.
import type { ModuleRequest, ModuleResponse } from "../entry.ts";
import type { Dependencies } from "./redirect-service-resolve-and-redirect.slots.ts";
import { declareSettings } from "../../runtime/settings.ts";
import { createFailureLog } from "../../runtime/tile-process.ts";
import { publicOriginSetting } from "../link-api/link-operations/settings.ts";
import { redirects } from "./redirect/redirect.ts";

/** The settings this module reads, by name: text(), integer(), url(), secret() or keyRing();
 * optional(kind) for an optional one. Values come from the process environment, secrets from
 * SECRET_DIR files. */
export const settings = declareSettings({
  // The public origin (https://qrwty.io): its host is the only one that redirects (A4).
  QRWTY_PUBLIC_ORIGIN_URL: publicOriginSetting,
});

const failure = createFailureLog("redirect-service");
let handler: ((request: ModuleRequest) => Promise<ModuleResponse>) | undefined;

/** Answers any method on /modules/redirect-service-resolve-and-redirect and every path below it.
 * The behaviour, and why the publish deadline is 500 ms under the tile's 1000 ms Request timeout,
 * are in redirect/redirect.ts. */
export async function redirectServiceResolveAndRedirect(dependencies: Dependencies, request: ModuleRequest): Promise<ModuleResponse> {
  // One per process: its cache-fill coalescing and route-read admission are per process.
  handler ??= redirects({
    links: dependencies.links,
    hotRoutes: dependencies.hotRoutes,
    clickEvents: dependencies.clickEvents,
    origin: dependencies.settings.QRWTY_PUBLIC_ORIGIN_URL,
    onFailure: failure,
  });
  return handler(request);
}

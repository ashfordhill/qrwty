// My links, a Data access in Account API: Cursor pages (at most 50, by created_at and id) of the caller's own links from the Links owner view.
// Write the module here. Export never overwrites your edits: export afresh and carry them over.
import type { ModuleRequest, ModuleResponse } from "../entry.ts";
import type { Dependencies } from "./account-api-my-links.slots.ts";
import { declareSettings } from "../../runtime/settings.ts";
import { publicOriginSetting } from "../link-api/link-operations/settings.ts";
import { myLinks } from "./my-links/routes.ts";

/** The settings this module reads, by name: text(), integer(), url(), secret() or keyRing();
 * optional(kind) for an optional one. Values come from the process environment, secrets from
 * SECRET_DIR files. */
export const settings = declareSettings({
  QRWTY_PUBLIC_ORIGIN_URL: publicOriginSetting,
});

/** Answers any method on /modules/account-api-my-links and every path below it. */
export async function accountApiMyLinks(dependencies: Dependencies, request: ModuleRequest): Promise<ModuleResponse> {
  return myLinks(request, dependencies);
}

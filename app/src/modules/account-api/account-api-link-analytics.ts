// Link analytics, a Custom in Account API: Owner-only counts, ranges, freshness and bounded CSV export. Checks ownership in the Links owner view and the tier's lookback and export allowance with Billing API.
// Write the module here. Export never overwrites your edits: export afresh and carry them over.
import type { ModuleRequest, ModuleResponse } from "../entry.ts";
import type { Dependencies } from "./account-api-link-analytics.slots.ts";
import { declareSettings } from "../../runtime/settings.ts";

/** The settings this module reads, by name: text(), integer(), url(), secret() or keyRing();
 * optional(kind) for an optional one. Values come from the process environment, secrets from
 * SECRET_DIR files. */
export const settings = declareSettings({});

/** Answers any method on /modules/account-api-link-analytics and every path below it. */
export async function accountApiLinkAnalytics(dependencies: Dependencies, request: ModuleRequest): Promise<ModuleResponse> {
  throw new Error("Not implemented: Link analytics");
}

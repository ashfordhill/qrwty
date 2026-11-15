// Link operations, a Custom in Link API: Create (guest or owned) with CSPRNG slugs, idempotency keys and admission; claim with one-time proof; If-Match edits; tombstone deletes. Reputation check and entitlement grant first.
// Write the module here. Export never overwrites your edits: export afresh and carry them over.
import type { ModuleRequest, ModuleResponse } from "../entry.ts";
import type { Dependencies } from "./link-api-link-operations.slots.ts";
import { declareSettings, optional } from "../../runtime/settings.ts";
import { linkOperationsFor } from "./link-operations/service.ts";
import {
  publicOriginSetting,
  replayKeyRingSetting,
  reputationCredentialsSetting,
  testHooksSetting,
} from "./link-operations/settings.ts";

/** The settings this module reads, by name: text(), integer(), url(), secret() or keyRing();
 * optional(kind) for an optional one. Values come from the process environment, secrets from
 * SECRET_DIR files. */
export const settings = declareSettings({
  QRWTY_PUBLIC_ORIGIN_URL: publicOriginSetting,
  LINK_REPLAY_KEYS: replayKeyRingSetting,
  QRWTY_REPUTATION_CREDENTIALS: optional(reputationCredentialsSetting),
  QRWTY_TEST_HOOKS: optional(testHooksSetting),
});

/** Answers any method on /modules/link-api-link-operations and every path below it. */
export async function linkApiLinkOperations(dependencies: Dependencies, request: ModuleRequest): Promise<ModuleResponse> {
  return linkOperationsFor(dependencies.settings)(dependencies, request);
}

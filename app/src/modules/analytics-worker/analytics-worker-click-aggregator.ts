// Click aggregator, a Custom in Analytics worker: Validates and deduplicates each click event within a bounded horizon, updates aggregates and acknowledges after commit. Poison events go to quarantine, never dropped.
// Write the module here. Export never overwrites your edits: export afresh and carry them over.
import type { ModuleMessage } from "../entry.ts";
import type { Dependencies } from "./analytics-worker-click-aggregator.slots.ts";
import { declareSettings } from "../../runtime/settings.ts";

/** The settings this module reads, by name: text(), integer(), url(), secret() or keyRing();
 * optional(kind) for an optional one. Values come from the process environment, secrets from
 * SECRET_DIR files. */
export const settings = declareSettings({});

/** Handles each message from the queues it consumes. "Not implemented" sends the message to its queue's .failed; any other error is retried. */
export async function analyticsWorkerClickAggregator(dependencies: Dependencies, message: ModuleMessage): Promise<void> {
  throw new Error("Not implemented: Click aggregator");
}

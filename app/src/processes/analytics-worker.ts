// Generated scaffold: Analytics worker (Worker service) runs as app-analytics-worker, a worker process.
// Export rewrites this file. Write modules in src/modules/; .jeeves/report.json lists what runs.
import type { Dependencies as AnalyticsWorkerClickAggregatorDependencies } from "../modules/analytics-worker/analytics-worker-click-aggregator.slots.ts";
import * as AnalyticsWorkerClickAggregatorModule from "../modules/analytics-worker/analytics-worker-click-aggregator.ts";
import { analyticsWorkerClickAggregator } from "../modules/analytics-worker/analytics-worker-click-aggregator.ts";
import { readSecret } from "../runtime/local.ts";
import { checkConfiguration, createProbeLog, databaseClient, databaseEndpoint, pubsubLoop, pubsubProjectId } from "../runtime/module-clients.ts";
import { runProcess } from "../runtime/process.ts";
import { type SettingsDeclaration, declareSettings, readSettings } from "../runtime/settings.ts";
import { createLoopLog, startModuleLoop } from "../runtime/tile-loop.ts";
import { brokerState, createFailureLog } from "../runtime/tile-process.ts";

/** Compiled configuration: nothing is read from disk at runtime. */
export const config = {
  "tile": "analytics-worker",
  "kind": "worker",
  "shape": "worker",
  "loops": [
    {
      "module": "analytics-worker-click-aggregator",
      "queue": "click-events--analytics-worker--analytics-worker-click-aggregator",
      "failedQueue": "click-events--analytics-worker--analytics-worker-click-aggregator.failed",
      "retryLimit": 5,
      "concurrency": 1
    }
  ]
} as const;

await runProcess(async (scope) => {
  // A failure the process survives writes one error line, at most once a second for each.
  const failure = createFailureLog(config.tile);
  // Loops subscribe before the process is ready. "Not implemented" sends a message to its
  // queue's .failed with one log line per module and hook a second; stopping drains them.
  const loopLog = createLoopLog(config.tile);
  // Each stub's own settings: what its file's `settings` export declares (none without one).
  const declared = {
    "analytics-worker-click-aggregator": (AnalyticsWorkerClickAggregatorModule as { settings?: SettingsDeclaration }).settings ?? declareSettings({}),
  };
  // Configuration: every variable these clients, the tile's sign-in and its stubs' settings read,
  // checked before any client is built or probed; one wrong setting fails startup naming it,
  // several are named together (a stub's first).
  checkConfiguration([
    () => databaseEndpoint("analytics"),
    () => pubsubProjectId(),
    () => readSecret("sql-analytics--analytics-worker"),
    () => readSettings("analytics-worker-click-aggregator", declared["analytics-worker-click-aggregator"]),
  ]);
  // Module clients (src/runtime/module-clients.ts): one per store or channel this tile's stubs
  // use, each probed once before the process is ready; a failed probe fails startup, except
  // a cache's, which is logged.
  const probe = createProbeLog(config.tile);
  const clients = {
    "analytics": await databaseClient(scope, probe, { tile: config.tile, resource: "analytics" }),
  };
  // Each stub's dependencies: its clients, and a module link calls that module's entry point.
  const dependencies = {} as {
    "analytics-worker-click-aggregator": AnalyticsWorkerClickAggregatorDependencies;
  };
  dependencies["analytics-worker-click-aggregator"] = {
    analytics: clients["analytics"],
    settings: readSettings("analytics-worker-click-aggregator", declared["analytics-worker-click-aggregator"]) as AnalyticsWorkerClickAggregatorDependencies["settings"],
  };
  // Click aggregator: a loop on the Pub/Sub subscription click-events--analytics-worker--analytics-worker-click-aggregator.
  await startModuleLoop(scope, loopLog, config.loops[0], (message) =>
    analyticsWorkerClickAggregator(dependencies["analytics-worker-click-aggregator"], message),
    brokerState(config.tile, failure, "broker consume click-events--analytics-worker--analytics-worker-click-aggregator"),
    pubsubLoop(probe),
  );
  scope.ready();
});

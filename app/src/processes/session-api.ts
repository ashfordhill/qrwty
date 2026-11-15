// Generated scaffold: Session API (Microservice) runs as app-session-api, an HTTP process.
// Export rewrites this file. Write modules in src/modules/; .jeeves/report.json lists what runs.
import type { Dependencies as SessionApiApiForwardingDependencies } from "../modules/session-api/session-api-api-forwarding.slots.ts";
import * as SessionApiApiForwardingModule from "../modules/session-api/session-api-api-forwarding.ts";
import { sessionApiApiForwarding } from "../modules/session-api/session-api-api-forwarding.ts";
import type { Dependencies as SessionApiSignInFlowDependencies } from "../modules/session-api/session-api-sign-in-flow.slots.ts";
import * as SessionApiSignInFlowModule from "../modules/session-api/session-api-sign-in-flow.ts";
import { sessionApiSignInFlow } from "../modules/session-api/session-api-sign-in-flow.ts";
import { createHttpService } from "../runtime/http.ts";
import { readSecret } from "../runtime/local.ts";
import { checkConfiguration, createProbeLog, databaseClient, databaseEndpoint, httpTarget, identityTarget } from "../runtime/module-clients.ts";
import { runProcess } from "../runtime/process.ts";
import { type SettingsDeclaration, declareSettings, readSettings } from "../runtime/settings.ts";
import { stubRoutes } from "../runtime/tile-http.ts";
import { createFailureLog, createNotImplementedLog } from "../runtime/tile-process.ts";

/** Compiled configuration: nothing is read from disk at runtime. */
export const config = {
  "tile": "session-api",
  "kind": "service",
  "shape": "http",
  "exposure": "public",
  "settings": {
    "requestTimeoutMs": 1000,
    "concurrencyLimit": 1000
  },
  "listen": {
    "host": "0.0.0.0",
    "port": 3000
  },
  "stubs": [
    {
      "module": "session-api-sign-in-flow",
      "path": "/modules/session-api-sign-in-flow"
    },
    {
      "module": "session-api-api-forwarding",
      "path": "/modules/session-api-api-forwarding"
    }
  ]
} as const;

await runProcess(async (scope) => {
  // A failure the process survives writes one error line, at most once a second for each.
  const failure = createFailureLog(config.tile);
  // "Not implemented" answers 501 with one log line per module and hook a second.
  const log = createNotImplementedLog(config.tile);
  // Each stub's own settings: what its file's `settings` export declares (none without one).
  const declared = {
    "session-api-sign-in-flow": (SessionApiSignInFlowModule as { settings?: SettingsDeclaration }).settings ?? declareSettings({}),
    "session-api-api-forwarding": (SessionApiApiForwardingModule as { settings?: SettingsDeclaration }).settings ?? declareSettings({}),
  };
  // Configuration: every variable these clients, the tile's sign-in and its stubs' settings read,
  // checked before any client is built or probed; one wrong setting fails startup naming it,
  // several are named together (a stub's first).
  checkConfiguration([
    () => httpTarget({ tile: "account-api" }),
    () => httpTarget({ tile: "billing-api" }),
    () => identityTarget({ identity: "identity" }),
    () => httpTarget({ tile: "link-api" }),
    () => databaseEndpoint("sessions"),
    () => readSecret("sql-sessions--session-api"),
    () => readSettings("session-api-sign-in-flow", declared["session-api-sign-in-flow"]),
    () => readSettings("session-api-api-forwarding", declared["session-api-api-forwarding"]),
  ]);
  // Module clients (src/runtime/module-clients.ts): one per store or channel this tile's stubs
  // use, each probed once before the process is ready; a failed probe fails startup, except
  // a cache's, which is logged.
  const probe = createProbeLog(config.tile);
  const clients = {
    "account-api": httpTarget({ tile: "account-api" }),
    "billing-api": httpTarget({ tile: "billing-api" }),
    "identity": identityTarget({ identity: "identity" }),
    "link-api": httpTarget({ tile: "link-api" }),
    "sessions": await databaseClient(scope, probe, { tile: config.tile, resource: "sessions" }),
  };
  // Each stub's dependencies: its clients, and a module link calls that module's entry point.
  const dependencies = {} as {
    "session-api-sign-in-flow": SessionApiSignInFlowDependencies;
    "session-api-api-forwarding": SessionApiApiForwardingDependencies;
  };
  dependencies["session-api-sign-in-flow"] = {
    identity: clients["identity"],
    sessions: clients["sessions"],
    settings: readSettings("session-api-sign-in-flow", declared["session-api-sign-in-flow"]) as SessionApiSignInFlowDependencies["settings"],
  };
  dependencies["session-api-api-forwarding"] = {
    sessions: clients["sessions"],
    identity: clients["identity"],
    linkApi: clients["link-api"],
    accountApi: clients["account-api"],
    billingApi: clients["billing-api"],
    settings: readSettings("session-api-api-forwarding", declared["session-api-api-forwarding"]) as SessionApiApiForwardingDependencies["settings"],
  };
  const service = await createHttpService({
    id: config.tile,
    settings: config.settings,
    onFailure: failure,
    configure: (routes) => {
      stubRoutes(
        routes,
        log,
        "session-api-sign-in-flow",
        (request) => sessionApiSignInFlow(dependencies["session-api-sign-in-flow"], request),
        { deadlineMs: config.settings.requestTimeoutMs },
      );
      stubRoutes(
        routes,
        log,
        "session-api-api-forwarding",
        (request) => sessionApiApiForwarding(dependencies["session-api-api-forwarding"], request),
        { deadlineMs: config.settings.requestTimeoutMs },
      );
    },
    initialize: async () => {},
  });
  // Draining stops admission first, then waits for admitted requests.
  scope.own(() => service.close());
  await service.start(config.listen);
  scope.ready();
});

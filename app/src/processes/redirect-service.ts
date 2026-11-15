// Generated scaffold: Redirect service (Microservice) runs as app-redirect-service, an HTTP process.
// Export rewrites this file. Write modules in src/modules/; .jeeves/report.json lists what runs.
import type { Dependencies as RedirectServiceResolveAndRedirectDependencies } from "../modules/redirect-service/redirect-service-resolve-and-redirect.slots.ts";
import { redirectServiceResolveAndRedirect } from "../modules/redirect-service/redirect-service-resolve-and-redirect.ts";
import { createHttpService } from "../runtime/http.ts";
import { cacheClient, createProbeLog, databaseClient, pubsubPublisher } from "../runtime/module-clients.ts";
import { runProcess } from "../runtime/process.ts";
import { stubRoutes } from "../runtime/tile-http.ts";
import { createFailureLog, createNotImplementedLog } from "../runtime/tile-process.ts";

/** Compiled configuration: nothing is read from disk at runtime. */
export const config = {
  "tile": "redirect-service",
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
      "module": "redirect-service-resolve-and-redirect",
      "path": "/modules/redirect-service-resolve-and-redirect"
    }
  ]
} as const;

await runProcess(async (scope) => {
  // A failure the process survives writes one error line, at most once a second for each.
  const failure = createFailureLog(config.tile);
  // "Not implemented" answers 501 with one log line per module and hook a second.
  const log = createNotImplementedLog(config.tile);
  // Module clients (src/runtime/module-clients.ts): one per store or channel this tile's stubs
  // use, each probed once before the process is ready; a failed probe fails startup.
  const probe = createProbeLog(config.tile);
  const clients = {
    "click-events": await pubsubPublisher(scope, probe, { topic: "click-events" }),
    "hot-routes": await cacheClient(scope, probe, { cache: "hot-routes" }),
    "links": await databaseClient(scope, probe, { tile: config.tile, resource: "links" }),
  };
  // Each stub's dependencies: its clients, and a module link calls that module's entry point.
  const dependencies = {} as {
    "redirect-service-resolve-and-redirect": RedirectServiceResolveAndRedirectDependencies;
  };
  dependencies["redirect-service-resolve-and-redirect"] = {
    links: clients["links"],
    hotRoutes: clients["hot-routes"],
    clickEvents: clients["click-events"],
  };
  const service = await createHttpService({
    id: config.tile,
    settings: config.settings,
    onFailure: failure,
    configure: (routes) => {
      stubRoutes(routes, log, "redirect-service-resolve-and-redirect", (request) =>
        redirectServiceResolveAndRedirect(dependencies["redirect-service-resolve-and-redirect"], request),
      );
    },
    initialize: async () => {},
  });
  // Draining stops admission first, then waits for admitted requests.
  scope.own(() => service.close());
  await service.start(config.listen);
  scope.ready();
});

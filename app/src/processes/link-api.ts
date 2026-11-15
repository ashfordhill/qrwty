// Generated scaffold: Link API (Microservice) runs as app-link-api, an HTTP process.
// Export rewrites this file. Write modules in src/modules/; .jeeves/report.json lists what runs.
import type { Dependencies as LinkApiAbuseAndModerationDependencies } from "../modules/link-api/link-api-abuse-and-moderation.slots.ts";
import * as LinkApiAbuseAndModerationModule from "../modules/link-api/link-api-abuse-and-moderation.ts";
import { linkApiAbuseAndModeration } from "../modules/link-api/link-api-abuse-and-moderation.ts";
import type { Dependencies as LinkApiLinkOperationsDependencies } from "../modules/link-api/link-api-link-operations.slots.ts";
import * as LinkApiLinkOperationsModule from "../modules/link-api/link-api-link-operations.ts";
import { linkApiLinkOperations } from "../modules/link-api/link-api-link-operations.ts";
import { createHttpService } from "../runtime/http.ts";
import { createPrincipalVerifier } from "../runtime/identity.ts";
import { readSecret } from "../runtime/local.ts";
import { cacheClient, cacheClientEndpoint, checkConfiguration, createProbeLog, databaseClient, databaseEndpoint, externalTarget, httpTarget } from "../runtime/module-clients.ts";
import { runProcess } from "../runtime/process.ts";
import { type SettingsDeclaration, declareSettings, readSettings } from "../runtime/settings.ts";
import { createTileGuard, signInSettings } from "../runtime/tile-guard.ts";
import { stubRoutes } from "../runtime/tile-http.ts";
import { createFailureLog, createNotImplementedLog, logStarted } from "../runtime/tile-process.ts";

/** Compiled configuration: nothing is read from disk at runtime. */
export const config = {
  "tile": "link-api",
  "kind": "service",
  "shape": "http",
  "exposure": "internal",
  "settings": {
    "requestTimeoutMs": 1000,
    "concurrencyLimit": 1000
  },
  "listen": {
    "host": "0.0.0.0",
    "port": 3000
  },
  "templates": {
    "link-api-sign-in": {
      "template": "verified-identity",
      "lead": "link-api-sign-in",
      "identity": "identity",
      "signIn": "optional",
      "me": "/modules/link-api-sign-in/me"
    }
  },
  "stubs": [
    {
      "module": "link-api-link-operations",
      "path": "/modules/link-api-link-operations"
    },
    {
      "module": "link-api-abuse-and-moderation",
      "path": "/modules/link-api-abuse-and-moderation"
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
    "link-api-link-operations": (LinkApiLinkOperationsModule as { settings?: SettingsDeclaration }).settings ?? declareSettings({}),
    "link-api-abuse-and-moderation": (LinkApiAbuseAndModerationModule as { settings?: SettingsDeclaration }).settings ?? declareSettings({}),
  };
  // Configuration: every variable these clients, the tile's sign-in and its stubs' settings read,
  // checked before any client is built or probed; one wrong setting fails startup naming it,
  // several are named together (a stub's first).
  checkConfiguration([
    () => cacheClientEndpoint("admission-cache"),
    () => httpTarget({ tile: "billing-api" }),
    () => databaseEndpoint("links"),
    () => externalTarget("JEEVES_EXTERNAL_REPUTATION_API_URL"),
    () => readSecret("cache-admission-cache"),
    () => readSecret("sql-links--link-api"),
    () => signInSettings(),
    () => readSettings("link-api-link-operations", declared["link-api-link-operations"]),
    () => readSettings("link-api-abuse-and-moderation", declared["link-api-abuse-and-moderation"]),
  ]);
  // Module clients (src/runtime/module-clients.ts): one per store or channel this tile's stubs
  // use, each probed once before the process is ready; a failed probe fails startup, except
  // a cache's, which is logged.
  const probe = createProbeLog(config.tile);
  const clients = {
    "admission-cache": await cacheClient(scope, probe, { cache: "admission-cache" }),
    "billing-api": httpTarget({ tile: "billing-api" }),
    "links": await databaseClient(scope, probe, { tile: config.tile, resource: "links" }),
    "reputation-api": externalTarget("JEEVES_EXTERNAL_REPUTATION_API_URL"),
  };
  // Each stub's dependencies: its clients, and a module link calls that module's entry point.
  const dependencies = {} as {
    "link-api-link-operations": LinkApiLinkOperationsDependencies;
    "link-api-abuse-and-moderation": LinkApiAbuseAndModerationDependencies;
  };
  dependencies["link-api-link-operations"] = {
    links: clients["links"],
    admissionCache: clients["admission-cache"],
    reputationApi: clients["reputation-api"],
    billingApi: clients["billing-api"],
    settings: readSettings("link-api-link-operations", declared["link-api-link-operations"]) as LinkApiLinkOperationsDependencies["settings"],
  };
  dependencies["link-api-abuse-and-moderation"] = {
    links: clients["links"],
    admissionCache: clients["admission-cache"],
    settings: readSettings("link-api-abuse-and-moderation", declared["link-api-abuse-and-moderation"]) as LinkApiAbuseAndModerationDependencies["settings"],
  };
  // Sign-in: the tile's sign-in, Optional: a token sent with a request is verified; none is anonymous.
  const linkApiSignIn = (() => {
    const binding = config.templates["link-api-sign-in"];
    // Its audience, issuer and key set are the deployment's, checked by signInSettings (tile-guard.ts).
    const settings = signInSettings();
    return createTileGuard({
      signIn: binding.signIn,
      verify: createPrincipalVerifier({
        issuer: settings.issuer,
        audience: settings.audience,
        jwksUrl: settings.jwksUrl,
        algorithms: ["RS256"],
        jwksTimeoutMs: 3000,
      }),
    });
  })();
  const service = await createHttpService({
    id: config.tile,
    settings: config.settings,
    onFailure: failure,
    configure: (open) => {
      // Every module route checks its caller first: the tile's sign-in.
      const routes = linkApiSignIn.routes(open);
      linkApiSignIn.me(routes, "/modules/link-api-sign-in/me");
      stubRoutes(
        routes,
        log,
        "link-api-link-operations",
        (request) => linkApiLinkOperations(dependencies["link-api-link-operations"], request),
        { deadlineMs: config.settings.requestTimeoutMs },
        linkApiSignIn.caller,
      );
      stubRoutes(
        routes,
        log,
        "link-api-abuse-and-moderation",
        (request) => linkApiAbuseAndModeration(dependencies["link-api-abuse-and-moderation"], request),
        { deadlineMs: config.settings.requestTimeoutMs },
        linkApiSignIn.caller,
      );
    },
    initialize: async () => {},
  });
  // Draining stops admission first, then waits for admitted requests.
  scope.own(() => service.close());
  await service.start(config.listen);
  logStarted(config.tile, {"module":"link-api-sign-in","template":"verified-identity","wiring":"mounted","checks":["sign-in Optional on every module route"]});
  scope.ready();
});

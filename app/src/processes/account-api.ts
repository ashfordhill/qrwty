// Generated scaffold: Account API (Microservice) runs as app-account-api, an HTTP process.
// Export rewrites this file. Write modules in src/modules/; .jeeves/report.json lists what runs.
import type { Dependencies as AccountApiLinkAnalyticsDependencies } from "../modules/account-api/account-api-link-analytics.slots.ts";
import * as AccountApiLinkAnalyticsModule from "../modules/account-api/account-api-link-analytics.ts";
import { accountApiLinkAnalytics } from "../modules/account-api/account-api-link-analytics.ts";
import type { Dependencies as AccountApiMyLinksDependencies } from "../modules/account-api/account-api-my-links.slots.ts";
import * as AccountApiMyLinksModule from "../modules/account-api/account-api-my-links.ts";
import { accountApiMyLinks } from "../modules/account-api/account-api-my-links.ts";
import { createHttpService } from "../runtime/http.ts";
import { createPrincipalVerifier } from "../runtime/identity.ts";
import { readSecret } from "../runtime/local.ts";
import { checkConfiguration, createProbeLog, databaseClient, databaseEndpoint, httpTarget } from "../runtime/module-clients.ts";
import { runProcess } from "../runtime/process.ts";
import { type SettingsDeclaration, declareSettings, readSettings } from "../runtime/settings.ts";
import { createTileGuard, signInSettings } from "../runtime/tile-guard.ts";
import { stubRoutes } from "../runtime/tile-http.ts";
import { createFailureLog, createNotImplementedLog, logStarted } from "../runtime/tile-process.ts";

/** Compiled configuration: nothing is read from disk at runtime. */
export const config = {
  "tile": "account-api",
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
    "account-api-sign-in": {
      "template": "verified-identity",
      "lead": "account-api-sign-in",
      "identity": "identity",
      "signIn": "required",
      "me": "/modules/account-api-sign-in/me"
    }
  },
  "stubs": [
    {
      "module": "account-api-my-links",
      "path": "/modules/account-api-my-links"
    },
    {
      "module": "account-api-link-analytics",
      "path": "/modules/account-api-link-analytics"
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
    "account-api-my-links": (AccountApiMyLinksModule as { settings?: SettingsDeclaration }).settings ?? declareSettings({}),
    "account-api-link-analytics": (AccountApiLinkAnalyticsModule as { settings?: SettingsDeclaration }).settings ?? declareSettings({}),
  };
  // Configuration: every variable these clients, the tile's sign-in and its stubs' settings read,
  // checked before any client is built or probed; one wrong setting fails startup naming it,
  // several are named together (a stub's first).
  checkConfiguration([
    () => databaseEndpoint("analytics"),
    () => httpTarget({ tile: "billing-api" }),
    () => databaseEndpoint("links"),
    () => readSecret("sql-analytics--account-api"),
    () => readSecret("sql-links--account-api"),
    () => signInSettings(),
    () => readSettings("account-api-my-links", declared["account-api-my-links"]),
    () => readSettings("account-api-link-analytics", declared["account-api-link-analytics"]),
  ]);
  // Module clients (src/runtime/module-clients.ts): one per store or channel this tile's stubs
  // use, each probed once before the process is ready; a failed probe fails startup, except
  // a cache's, which is logged.
  const probe = createProbeLog(config.tile);
  const clients = {
    "analytics": await databaseClient(scope, probe, { tile: config.tile, resource: "analytics" }),
    "billing-api": httpTarget({ tile: "billing-api" }),
    "links": await databaseClient(scope, probe, { tile: config.tile, resource: "links" }),
  };
  // Each stub's dependencies: its clients, and a module link calls that module's entry point.
  const dependencies = {} as {
    "account-api-my-links": AccountApiMyLinksDependencies;
    "account-api-link-analytics": AccountApiLinkAnalyticsDependencies;
  };
  dependencies["account-api-my-links"] = {
    links: clients["links"],
    settings: readSettings("account-api-my-links", declared["account-api-my-links"]) as AccountApiMyLinksDependencies["settings"],
  };
  dependencies["account-api-link-analytics"] = {
    links: clients["links"],
    analytics: clients["analytics"],
    billingApi: clients["billing-api"],
    settings: readSettings("account-api-link-analytics", declared["account-api-link-analytics"]) as AccountApiLinkAnalyticsDependencies["settings"],
  };
  // Sign-in: the tile's sign-in, Required: every module route needs a valid token.
  const accountApiSignIn = (() => {
    const binding = config.templates["account-api-sign-in"];
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
      const routes = accountApiSignIn.routes(open);
      accountApiSignIn.me(routes, "/modules/account-api-sign-in/me");
      stubRoutes(
        routes,
        log,
        "account-api-my-links",
        (request) => accountApiMyLinks(dependencies["account-api-my-links"], request),
        { deadlineMs: config.settings.requestTimeoutMs },
        accountApiSignIn.caller,
      );
      stubRoutes(
        routes,
        log,
        "account-api-link-analytics",
        (request) => accountApiLinkAnalytics(dependencies["account-api-link-analytics"], request),
        { deadlineMs: config.settings.requestTimeoutMs },
        accountApiSignIn.caller,
      );
    },
    initialize: async () => {},
  });
  // Draining stops admission first, then waits for admitted requests.
  scope.own(() => service.close());
  await service.start(config.listen);
  logStarted(config.tile, {"module":"account-api-sign-in","template":"verified-identity","wiring":"mounted","checks":["sign-in Required on every module route"]});
  scope.ready();
});

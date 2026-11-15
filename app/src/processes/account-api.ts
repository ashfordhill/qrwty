// Generated scaffold: Account API (Microservice) runs as app-account-api, an HTTP process.
// Export rewrites this file. Write modules in src/modules/; .jeeves/report.json lists what runs.
import type { Dependencies as AccountApiLinkAnalyticsDependencies } from "../modules/account-api/account-api-link-analytics.slots.ts";
import { accountApiLinkAnalytics } from "../modules/account-api/account-api-link-analytics.ts";
import type { Dependencies as AccountApiMyLinksDependencies } from "../modules/account-api/account-api-my-links.slots.ts";
import { accountApiMyLinks } from "../modules/account-api/account-api-my-links.ts";
import { createHttpService } from "../runtime/http.ts";
import { createPrincipalVerifier } from "../runtime/identity.ts";
import { createProbeLog, databaseClient, httpTarget } from "../runtime/module-clients.ts";
import { runProcess } from "../runtime/process.ts";
import { createTileGuard } from "../runtime/tile-guard.ts";
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
  // Module clients (src/runtime/module-clients.ts): one per store or channel this tile's stubs
  // use, each probed once before the process is ready; a failed probe fails startup.
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
  };
  dependencies["account-api-link-analytics"] = {
    links: clients["links"],
    analytics: clients["analytics"],
    billingApi: clients["billing-api"],
  };
  // Sign-in: the tile's sign-in, Required: every module route needs a valid token.
  const accountApiSignIn = (() => {
    const binding = config.templates["account-api-sign-in"];
    // The audience its tokens carry is the deployment's; Compose sets the local client's.
    if (!process.env.OIDC_AUDIENCE) throw new Error("OIDC_AUDIENCE must name the audience of the sign-in tokens.");
    // So are its issuer and key set (Compose sets the local ones): each an absolute http: or
    // https: URL, or startup fails naming the variable, never its value. With JEEVES_REQUIRE_TLS
    // set to true (else absent), each must be https: (`Insecure endpoint <variable>`).
    const requireTls = process.env.JEEVES_REQUIRE_TLS;
    if (requireTls !== undefined && requireTls !== "true") throw new Error("Invalid endpoint JEEVES_REQUIRE_TLS");
    const signInUrl = (name: "OIDC_ISSUER" | "OIDC_JWKS_URL") => {
      const value = process.env[name] ?? "";
      const protocol = URL.parse(value)?.protocol;
      if (protocol !== "http:" && protocol !== "https:") throw new Error(`Invalid endpoint ${name}`);
      if (requireTls && protocol !== "https:") throw new Error(`Insecure endpoint ${name}`);
      return value;
    };
    return createTileGuard({
      signIn: binding.signIn,
      verify: createPrincipalVerifier({
        issuer: signInUrl("OIDC_ISSUER"),
        audience: process.env.OIDC_AUDIENCE,
        jwksUrl: signInUrl("OIDC_JWKS_URL"),
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
        accountApiSignIn.caller,
      );
      stubRoutes(
        routes,
        log,
        "account-api-link-analytics",
        (request) => accountApiLinkAnalytics(dependencies["account-api-link-analytics"], request),
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

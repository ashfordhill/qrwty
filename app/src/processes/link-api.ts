// Generated scaffold: Link API (Microservice) runs as app-link-api, an HTTP process.
// Export rewrites this file. Write modules in src/modules/; .jeeves/report.json lists what runs.
import type { Dependencies as LinkApiAbuseAndModerationDependencies } from "../modules/link-api/link-api-abuse-and-moderation.slots.ts";
import { linkApiAbuseAndModeration } from "../modules/link-api/link-api-abuse-and-moderation.ts";
import type { Dependencies as LinkApiLinkOperationsDependencies } from "../modules/link-api/link-api-link-operations.slots.ts";
import { linkApiLinkOperations } from "../modules/link-api/link-api-link-operations.ts";
import { createHttpService } from "../runtime/http.ts";
import { createPrincipalVerifier } from "../runtime/identity.ts";
import { cacheClient, createProbeLog, databaseClient, externalTarget, httpTarget } from "../runtime/module-clients.ts";
import { runProcess } from "../runtime/process.ts";
import { createTileGuard } from "../runtime/tile-guard.ts";
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
  // Module clients (src/runtime/module-clients.ts): one per store or channel this tile's stubs
  // use, each probed once before the process is ready; a failed probe fails startup.
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
  };
  dependencies["link-api-abuse-and-moderation"] = {
    links: clients["links"],
    admissionCache: clients["admission-cache"],
  };
  // Sign-in: the tile's sign-in, Optional: a token sent with a request is verified; none is anonymous.
  const linkApiSignIn = (() => {
    const binding = config.templates["link-api-sign-in"];
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
      const routes = linkApiSignIn.routes(open);
      linkApiSignIn.me(routes, "/modules/link-api-sign-in/me");
      stubRoutes(
        routes,
        log,
        "link-api-link-operations",
        (request) => linkApiLinkOperations(dependencies["link-api-link-operations"], request),
        linkApiSignIn.caller,
      );
      stubRoutes(
        routes,
        log,
        "link-api-abuse-and-moderation",
        (request) => linkApiAbuseAndModeration(dependencies["link-api-abuse-and-moderation"], request),
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

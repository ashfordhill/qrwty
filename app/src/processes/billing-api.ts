// Generated scaffold: Billing API (Microservice) runs as app-billing-api, an HTTP process.
// Export rewrites this file. Write modules in src/modules/; .jeeves/report.json lists what runs.
import type { Dependencies as BillingApiCustomerBillingDependencies } from "../modules/billing-api/billing-api-customer-billing.slots.ts";
import { billingApiCustomerBilling } from "../modules/billing-api/billing-api-customer-billing.ts";
import type { Dependencies as BillingApiEntitlementsDependencies } from "../modules/billing-api/billing-api-entitlements.slots.ts";
import { billingApiEntitlements } from "../modules/billing-api/billing-api-entitlements.ts";
import type { Dependencies as BillingApiPaymentEventsDependencies } from "../modules/billing-api/billing-api-payment-events.slots.ts";
import { billingApiPaymentEvents } from "../modules/billing-api/billing-api-payment-events.ts";
import { createHttpService } from "../runtime/http.ts";
import { createPrincipalVerifier } from "../runtime/identity.ts";
import { createProbeLog, databaseClient, externalTarget } from "../runtime/module-clients.ts";
import { runProcess } from "../runtime/process.ts";
import { createTileGuard } from "../runtime/tile-guard.ts";
import { stubRoutes } from "../runtime/tile-http.ts";
import { createFailureLog, createNotImplementedLog, logStarted } from "../runtime/tile-process.ts";

/** Compiled configuration: nothing is read from disk at runtime. */
export const config = {
  "tile": "billing-api",
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
  "templates": {
    "billing-api-sign-in": {
      "template": "verified-identity",
      "lead": "billing-api-sign-in",
      "identity": "identity",
      "signIn": "optional",
      "me": "/modules/billing-api-sign-in/me"
    }
  },
  "stubs": [
    {
      "module": "billing-api-customer-billing",
      "path": "/modules/billing-api-customer-billing"
    },
    {
      "module": "billing-api-payment-events",
      "path": "/modules/billing-api-payment-events"
    },
    {
      "module": "billing-api-entitlements",
      "path": "/modules/billing-api-entitlements"
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
    "billing": await databaseClient(scope, probe, { tile: config.tile, resource: "billing" }),
    "stripe-api": externalTarget("JEEVES_EXTERNAL_STRIPE_API_URL"),
  };
  // Each stub's dependencies: its clients, and a module link calls that module's entry point.
  const dependencies = {} as {
    "billing-api-customer-billing": BillingApiCustomerBillingDependencies;
    "billing-api-payment-events": BillingApiPaymentEventsDependencies;
    "billing-api-entitlements": BillingApiEntitlementsDependencies;
  };
  dependencies["billing-api-customer-billing"] = {
    billing: clients["billing"],
    stripeApi: clients["stripe-api"],
  };
  dependencies["billing-api-payment-events"] = {
    billing: clients["billing"],
    stripeApi: clients["stripe-api"],
  };
  dependencies["billing-api-entitlements"] = {
    billing: clients["billing"],
  };
  // Sign-in: the tile's sign-in, Optional: a token sent with a request is verified; none is anonymous.
  const billingApiSignIn = (() => {
    const binding = config.templates["billing-api-sign-in"];
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
      const routes = billingApiSignIn.routes(open);
      billingApiSignIn.me(routes, "/modules/billing-api-sign-in/me");
      stubRoutes(
        routes,
        log,
        "billing-api-customer-billing",
        (request) => billingApiCustomerBilling(dependencies["billing-api-customer-billing"], request),
        billingApiSignIn.caller,
      );
      stubRoutes(
        routes,
        log,
        "billing-api-payment-events",
        (request) => billingApiPaymentEvents(dependencies["billing-api-payment-events"], request),
        billingApiSignIn.caller,
      );
      stubRoutes(
        routes,
        log,
        "billing-api-entitlements",
        (request) => billingApiEntitlements(dependencies["billing-api-entitlements"], request),
        billingApiSignIn.caller,
      );
    },
    initialize: async () => {},
  });
  // Draining stops admission first, then waits for admitted requests.
  scope.own(() => service.close());
  await service.start(config.listen);
  logStarted(config.tile, {"module":"billing-api-sign-in","template":"verified-identity","wiring":"mounted","checks":["sign-in Optional on every module route"]});
  scope.ready();
});

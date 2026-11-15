// Generated scaffold: Billing API (Microservice) runs as app-billing-api, an HTTP process.
// Export rewrites this file. Write modules in src/modules/; .jeeves/report.json lists what runs.
import type { Dependencies as BillingApiCustomerBillingDependencies } from "../modules/billing-api/billing-api-customer-billing.slots.ts";
import * as BillingApiCustomerBillingModule from "../modules/billing-api/billing-api-customer-billing.ts";
import { billingApiCustomerBilling } from "../modules/billing-api/billing-api-customer-billing.ts";
import type { Dependencies as BillingApiEntitlementsDependencies } from "../modules/billing-api/billing-api-entitlements.slots.ts";
import * as BillingApiEntitlementsModule from "../modules/billing-api/billing-api-entitlements.ts";
import { billingApiEntitlements } from "../modules/billing-api/billing-api-entitlements.ts";
import type { Dependencies as BillingApiPaymentEventsDependencies } from "../modules/billing-api/billing-api-payment-events.slots.ts";
import * as BillingApiPaymentEventsModule from "../modules/billing-api/billing-api-payment-events.ts";
import { billingApiPaymentEvents } from "../modules/billing-api/billing-api-payment-events.ts";
import { createHttpService } from "../runtime/http.ts";
import { createPrincipalVerifier } from "../runtime/identity.ts";
import { readSecret } from "../runtime/local.ts";
import { checkConfiguration, createProbeLog, databaseClient, databaseEndpoint, externalTarget } from "../runtime/module-clients.ts";
import { runProcess } from "../runtime/process.ts";
import { type SettingsDeclaration, declareSettings, readSettings } from "../runtime/settings.ts";
import { createTileGuard, signInSettings } from "../runtime/tile-guard.ts";
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
  // Each stub's own settings: what its file's `settings` export declares (none without one).
  const declared = {
    "billing-api-customer-billing": (BillingApiCustomerBillingModule as { settings?: SettingsDeclaration }).settings ?? declareSettings({}),
    "billing-api-payment-events": (BillingApiPaymentEventsModule as { settings?: SettingsDeclaration }).settings ?? declareSettings({}),
    "billing-api-entitlements": (BillingApiEntitlementsModule as { settings?: SettingsDeclaration }).settings ?? declareSettings({}),
  };
  // Configuration: every variable these clients, the tile's sign-in and its stubs' settings read,
  // checked before any client is built or probed; one wrong setting fails startup naming it,
  // several are named together (a stub's first).
  checkConfiguration([
    () => databaseEndpoint("billing"),
    () => externalTarget("JEEVES_EXTERNAL_STRIPE_API_URL"),
    () => readSecret("sql-billing--billing-api"),
    () => signInSettings(),
    () => readSettings("billing-api-customer-billing", declared["billing-api-customer-billing"]),
    () => readSettings("billing-api-payment-events", declared["billing-api-payment-events"]),
    () => readSettings("billing-api-entitlements", declared["billing-api-entitlements"]),
  ]);
  // Module clients (src/runtime/module-clients.ts): one per store or channel this tile's stubs
  // use, each probed once before the process is ready; a failed probe fails startup, except
  // a cache's, which is logged.
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
    settings: readSettings("billing-api-customer-billing", declared["billing-api-customer-billing"]) as BillingApiCustomerBillingDependencies["settings"],
  };
  dependencies["billing-api-payment-events"] = {
    billing: clients["billing"],
    stripeApi: clients["stripe-api"],
    settings: readSettings("billing-api-payment-events", declared["billing-api-payment-events"]) as BillingApiPaymentEventsDependencies["settings"],
  };
  dependencies["billing-api-entitlements"] = {
    billing: clients["billing"],
    settings: readSettings("billing-api-entitlements", declared["billing-api-entitlements"]) as BillingApiEntitlementsDependencies["settings"],
  };
  // Sign-in: the tile's sign-in, Optional: a token sent with a request is verified; none is anonymous.
  const billingApiSignIn = (() => {
    const binding = config.templates["billing-api-sign-in"];
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
      const routes = billingApiSignIn.routes(open);
      billingApiSignIn.me(routes, "/modules/billing-api-sign-in/me");
      stubRoutes(
        routes,
        log,
        "billing-api-customer-billing",
        (request) => billingApiCustomerBilling(dependencies["billing-api-customer-billing"], request),
        { deadlineMs: config.settings.requestTimeoutMs },
        billingApiSignIn.caller,
      );
      stubRoutes(
        routes,
        log,
        "billing-api-payment-events",
        (request) => billingApiPaymentEvents(dependencies["billing-api-payment-events"], request),
        { deadlineMs: config.settings.requestTimeoutMs },
        billingApiSignIn.caller,
      );
      stubRoutes(
        routes,
        log,
        "billing-api-entitlements",
        (request) => billingApiEntitlements(dependencies["billing-api-entitlements"], request),
        { deadlineMs: config.settings.requestTimeoutMs },
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

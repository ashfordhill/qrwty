# A-found gaps from A7 (Jeeves 0aea8e7)

A7 wrote billing, entitlements and the plan limits in the application-owned stub bodies and product
SQL of Billing API, Link API, Account API, Session API and the Click aggregator
([handoff](../../handoff.md)). No generated file was edited: `infra/local/verify-generated.py app`
reports 71 generated files unchanged. Each gap has a workaround in application files; as the owner
decided on 2026-11-15, gaps are recorded, not fixed.

| ID | Severity | Gap | Where | Workaround in A |
| --- | --- | --- | --- | --- |
| AG-33 | Medium | No scheduled job: a stub route can't be called on a timer (no cron or timer tile, no scheduler in the export's infrastructure), so the billing contract's nightly reconciliation has no caller | the export's process kinds (`src/processes/*.ts`, `.jeeves/report.json`) | Billing API reconciles on every webhook, on each status read of an account with pending events, and on a stuck checkout (8 s after the browser returns); `POST /modules/billing-api-payment-events/jobs/reconcile` exists for a scheduler, unscheduled (A7b) |
| AG-34 | Low | The raw body a stub can verify is capped at 64 KiB by the generated HTTP server (`bodyLimit: 65536`), below http-contract §9's 256 KiB for the webhook | `src/runtime/http.ts` | None needed for this run: Stripe's events are a few KiB; a larger one would be refused 413 by Session API before Billing API sees it |
| AG-35 | Low | A tile's modules can't share product tables: each module's SQL gets its own schema, so one store with one logical writer across three Billing modules has no declared home | `infra/postgres/<db>/modules/<module>.sql` (schema `m_<module>`) | Every billing table and function is in `billing-api-customer-billing.sql` (`m_billing_api_customer_billing`); Payment events and Entitlements use them by qualified name through Billing API's login; their own SQL files hold a note only |

AG-14 (a tile call carries no workload ID token, Q13) applies again: Billing API's internal
Entitlements can't tell Link API or Account API from another internal caller. Grants and export
spending are keyed to the subject of the caller's own forwarded bearer, which Billing API's guard
verifies, so a caller can only ever read or spend its own account's; Session API forwards no path
to Entitlements, and Billing API's ingress is internal.

## AG-33: no scheduled job

The billing contract asks for reconciliation "nightly and on stuck checkout". A Jeeves export has HTTP
processes, queue and topic loops, and a migration job, but nothing that runs a stub on a schedule;
Cloud Run's services here scale to zero, so an in-process timer would not run either. Reproduce: search
`.jeeves/report.json` `processes.tiles[]` for any trigger other than routes and loops; there is none.
A generic fix: a schedule on a route stub (or a Scheduler tile) that the export turns into a Compose
service locally and a Cloud Scheduler job (OIDC to the service) in a deployment.

## AG-34: a 64 KiB raw body

`createHttpService` registers its JSON and text parsers with `bodyLimit: 65536`, which is not a
setting. Reproduce: post 70 KiB of JSON to any stub route: 413 from Fastify. A generic fix: a
per-route (or per-module) body limit next to the raw-body capability.

## AG-35: one store across a tile's modules

`scripts/products.mjs` runs each module's SQL in `m_<module>` and grants the tile's login every
module schema of that tile, so sharing works, but only by convention: nothing declares which module
owns a shared table, and a second module's file can't depend on the first's having run. A generic fix:
a tile-level product SQL file, or an explicit order and ownership for module files.

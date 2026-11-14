# Q03 capability audit: what Jeeves generates for QRWTY, and what it lacks

Run `qrwty-r1-20261114`, arm A, unit Q03, attempt 1 (ledger `a-0278`). QRWTY starting commit
`e1474dc`; Jeeves `59bfbc6` ("SO08"), registry `08e0c945…d322d` (the same as Q01/Q02), runtime
`local-runtime` 0.1.0 `71dcdadd…5eaec`, generator `jeeves-v2` 0.1.0-experimental.1. Started
2026-11-14T07:58Z. No Jeeves file or project changed; the only Jeeves command that wrote anything
was `export:v2` into a scratch directory.

**What this is.** The capability contract that [architecture.md](../../plans/production-build/architecture.md#required-capability-audit--potential-gaps)
asks for: for G01–G13 and Q01/Q02's findings F1–F15 (and the new F16–F26), what the inspected
code does, the smallest reproduction, the existing seam, the remedy and its owner, and a decision.
The generator gaps are written as ready-to-run unit briefs QG01–QG16 in
[jeeves-gaps.md](../../plans/production-build/jeeves-gaps.md). **Nothing here is implemented**;
"needed" means a later, separately assigned Jeeves unit must land before the QRWTY unit that
depends on it.

**How it was probed.** One minimal design (the [probe fixture](fixtures/probe-design.json), built
in memory through the studio's own command path) holds what QRWTY uses: a public Service with an
Optional sign-in, a Custom stub on a Database, a Cache, a Queue (publish), an External API and the
Identity, a second Custom stub, and a Worker whose stub consumes the queue into its own Database.
It was exported with Jeeves's CLI, given [application-owned probe bodies and product
SQL](fixtures/app-code/) (stub files and product SQL only, never a generated file), built, and run
under its own Compose project. Further probes ran the built runtime offline, the generated
migration script against two disposable PostgreSQL 17.11 containers, and the pinned Pub/Sub SDK
against the pinned emulator. [Commands as run](commands/README.md); outputs in [probes/](probes/).

## 1. What already works (do not duplicate)

| Mechanism | Evidence | Landed in |
| --- | --- | --- |
| A route stub's status and headers: `302` with `Location` byte for byte, a custom header (`QRWTY-Click-Event`), `405` with `Allow`; `HEAD` answers the same headers | [http-edge.txt](probes/http-edge.txt) (redirect, method) | Tile processes contract §3 |
| Sign-in Optional: no `Authorization` is anonymous, a bad bearer is 401 before the stub | [http-edge.txt](probes/http-edge.txt) (caller ×2) | `verified-identity` 0.1.0 |
| Issuer and JWKS URL come from the environment (`OIDC_ISSUER`, `OIDC_JWKS_URL`); RS256, `exp` and `sub` required; wrong audience or issuer refused | [g03-identity.json](probes/g03-identity.json) | `verified-identity` |
| Confirmed AMQP publish; a lost broker answers at once and reconnects within 5 s with no restart; the same message ID is taken once by a deduplicating consumer | [g04-publish.txt](probes/g04-publish.txt) | BR01/BR02, V3-18 |
| An unreachable store waits 5 s and keeps the attempt; an outside `fetch` keeps the normal retries | Jeeves SO01–SO05, SO08 evidence (`docs/plans/store-outage/`) | SO01, SO04 |
| Template cache (`createValkeyCache`): optional at startup, 150 ms deadline, generation reconnect every 5 s, queue bound 32 | Jeeves `templates/local-v2/assets/src/runtime/valkey.ts.template` | PF07 |
| Product SQL per writing module, re-run at every start inside the owner's transaction; `published` views; least-privilege runtime logins; setup-only owners; immutable migration history checked by SHA-256; a per-database advisory lock | [g06-migrations.txt](probes/g06-migrations.txt) (repeat run, `local_migrations`) | v3 contract §1 |
| A single-statement product SQL function is atomic through the stub's `execute` (two inserts and a raise leave 0 rows; without the raise 2) | [g02-transactions.txt](probes/g02-transactions.txt) (`/fn`) | PostgreSQL semantics, product SQL seam |
| Migration endpoint from the environment (`PGHOST`, `PGPORT` in `scripts/migrate.mjs`); every credential read from files under `SECRET_DIR` | [g06-migrations.txt](probes/g06-migrations.txt), `src/runtime/local.ts` | Local foundation |
| Drain order on SIGTERM (admission, loops, publishers, pools); `/healthz` 200 once ready and 503 while draining, independent of dependencies after start | `src/runtime/process.ts`, `http.ts` | Tile processes |
| A Worker process has no listener (only Docker's resolver socket) and reports readiness through a file marker | [g04-startup-coupling.txt](probes/g04-startup-coupling.txt) | Tile processes |
| Docker Compose merges an application-owned `compose.override.yaml` into the generated scripts' calls (none passes `-f`) | [compose-override-merge.txt](probes/compose-override-merge.txt); `/env` in [http-edge.txt](probes/http-edge.txt) | Docker Compose default, not a documented Jeeves seam (F26) |

## 2. G01–G13

Each row: the inspected code at Jeeves `59bfbc6`, the smallest reproduction, the seam that exists,
the deficiency, the remedy split into **Jeeves** (generic mechanism), **QRWTY** (hooks, stub
bodies, product SQL) and **deployment** (outside Jeeves), and the decision.

### G01 — managed endpoints, CA verification, secrets and credentials

- **Inspected.** `module-clients.ts` (`hostname: "local-postgres"`, `port: 5432`; broker
  `local-broker:5672`; cache `` `cache-${id}` ``:6379; `httpTarget("http://app-<id>:3000")`),
  `service-resources.ts` (the same literals for templates), `postgres.ts` (no `ssl` option),
  `amqp.ts` (plain AMQP), the stub cache client (no TLS).
- **Reproduction.** [g01-endpoints.txt](probes/g01-endpoints.txt): both processes started on the
  host with `PGHOST=127.0.0.1`, `PGSSLMODE=verify-full`, `REDIS_URL`, `AMQP_URL`, `OIDC_*` fail
  their first probe on the compiled names: `getaddrinfo ENOTFOUND local-broker` (Front) and
  `ENOTFOUND local-postgres` (Tally). `pg` reads `PGSSLMODE` only because `ssl` is undefined
  (`connection-parameters.js:85`), so database TLS is reachable by accident and nothing else is.
- **Seam that exists.** Credentials are files (`SECRET_DIR`), which a mounted secret can supply;
  `OIDC_ISSUER`/`OIDC_JWKS_URL` and the migration's `PGHOST`/`PGPORT` are environment values.
- **Deficiency.** Endpoints are compiled, so the same image cannot reach Cloud SQL, Memorystore,
  Toxiproxy (the oracle's fault proxy, needed locally for F01–F03) or another Cloud Run URL; no
  TLS verification options; no refusal of plain-text endpoints in production (R01).
- **Remedy.** Jeeves: endpoints from the environment with no compiled default (**QG06**), then
  verified TLS options and a generic insecure-endpoint refusal (**QG10**). Deployment: the values,
  Secret Manager mounts, IAM, private networking (Q04 drafts, Q12a/Q13 prove). Jeeves's
  production-foundations plan lists "host names from the environment" as deployment (D1); QG06
  needs the Jeeves owner to accept that reading the values is the generic mechanism while the
  values stay deployment.
- **Decision.** Implemented-needed for the local build: QG06, and QG10 (its refusal is R01's
  local check; its TLS effect is in cloud).

### G02 — atomic create, idempotency, claim, mutation with outbox

- **Inspected.** `DatabaseReadWriter` = `query`/`execute` over `pg.Pool.query`; no transaction
  or reserved connection.
- **Reproduction.** [g02-transactions.txt](probes/g02-transactions.txt), three runs: after
  `execute("BEGIN")`, three parallel queries land on three backends and exactly one reports an
  open transaction; the pool keeps that connection `idle in transaction` for the next caller.
  A product SQL function called with one `execute` is atomic (`/fn`).
- **Seam that exists.** Product SQL files (`CREATE OR REPLACE FUNCTION`, re-run every start) and
  single-statement calls; the writer's login has DML on its module schema and EXECUTE by
  PostgreSQL's default.
- **Remedy.** QRWTY: each multi-row invariant (create + idempotency + quota, claim, inbox +
  lease, aggregate + dedup) is one statement or one PL/pgSQL function, with row locks or
  `ON CONFLICT` for concurrency; never `BEGIN`/`COMMIT` through `execute`. Jeeves: a scoped
  transaction for stubs would remove that product SQL (**QG13**, deferred).
- **Decision.** Not needed for the local build (product SQL suffices); QG13 deferred.

### G03 — managed OIDC tokens: issuer, audience, JWKS

- **Inspected.** `http-wiring.ts:335–337` emits `issuer: process.env.OIDC_ISSUER`,
  `audience: \`${binding.identity}-web\``, `jwksUrl: process.env.OIDC_JWKS_URL`; `setup.mjs`
  adds an audience mapper so Keycloak's access token carries `identity-web`.
- **Reproduction.** [g03-identity.json](probes/g03-identity.json) on the built
  `dist/runtime/identity.js`: the Keycloak shape passes; a managed-API audience is refused
  (`unexpected "aud"`) even with `OIDC_ISSUER` set to the managed issuer, because the audience is
  compiled; missing environment fails construction (`Invalid URL`); a plain-`http` JWKS URL is
  accepted.
- **Remedy.** Jeeves: `OIDC_AUDIENCE` from the environment, required (**QG11**); plain-http
  refusal under QG10's production flag. QRWTY: the Session API's code + PKCE client and cookie
  sessions are Custom (Q07), configured through QG02's file locally and the environment in cloud.
  Coordinator: the managed issuer amendment after the first live identity probe.
- **Decision.** Implemented-needed for cloud (QG11); the local issuer already works.

### G04 — redirect awaits durable ACK; publisher faults; recovery

- **Inspected.** `queuePublisher` (confirm channel, 5 s confirm deadline), `createAdmission`
  (Request timeout 1000 ms default, a normal tile control), startup probes.
- **Reproduction.** [g04-publish.txt](probes/g04-publish.txt): confirmed publish 202 in 1–2 ms;
  broker paused → the admission answers `503 DEADLINE` at 1.11 s (no `Retry-After`, no event
  header), and both "failed" messages were later delivered and counted (an ambiguous publish can
  be stored, as durable-clicks.md expects); broker stopped → `Broker unavailable` at once, the
  stub's 503 with `Retry-After`; restarted → 202 again 4 s later; no restart, same container IDs.
  [g04-startup-coupling.txt](probes/g04-startup-coupling.txt): a running Front keeps redirecting
  and publishing with its cache stopped, but a Front restarted while the cache is down fails
  startup (`Probe deadline (5 s)`), exits 1 and stays down (no restart policy; edge 503); a Tally
  restarted with the broker down exits the same way.
- **Seam that exists.** Await inside the handler; a module's `messageId`; reconnect.
- **Deficiency.** No Pub/Sub publisher (G12); startup is coupled to every dependency.
- **Remedy.** Jeeves: the Pub/Sub publisher with a bounded deadline and a bounded outstanding
  count (**QG07**), consumers (**QG08**), system tests (**QG09**); a cache that is down at start no
  longer stops a process (**QG04**, PF07's rule); startup with a lost publisher and an overall
  drain bound (**QG16**, deferred, Jeeves owner decision as BR's "Not in this plan" recorded).
  QRWTY: an own publish deadline shorter than the Redirect service's Request timeout (raise the
  tile's Request timeout), the same event ID on retry, `503` + `Retry-After` + `QRWTY-Click-Event`
  and no `Location` on every failure path (F23). Redirect has no identity dependency (Q01).
- **Decision.** Implemented-needed (QG07–QG09, QG04) for the local build; QG16 deferred.

### G05 — cache expiry, stale fill, maximum age, recovery after a cache timeout

- **Inspected.** Stub `cacheClient`: `createClient` with `disableOfflineQueue`, reconnect, no
  command deadline, no queue bound, startup probe fatal. The template reader's
  `createValkeyCache` has all three (PF07).
- **Reproduction.** [g05-cache.txt](probes/g05-cache.txt): Valkey paused → a stub `get` hangs
  until the admission's 1.11 s `503 DEADLINE`; a product race answers at 100 ms but leaves the
  command pending; stopped → `The client is offline` at once; restarted → served again after
  ~1 s. [g09-drain.txt](probes/g09-drain.txt): the pending command kept the drain open until
  `SIGKILL` (exit 137).
- **Remedy.** Jeeves: back the stub cache client with `createValkeyCache` (**QG04**). QRWTY:
  entries with version, state, expiry and an absolute `validatedUntil` set by the writer,
  conditional fills, no cached misses (Q08). The positive cache read stays unused (F8).
- **Decision.** Implemented-needed for the local build (QG04).

### G06 — repeat-safe migrations against managed PostgreSQL without a superuser

- **Inspected.** `scripts/migrate.mjs`: admin `postgres` creates roles and `CREATE DATABASE …
  OWNER o_<db>` outside any lock; each database's owner applies versioned files under
  `pg_advisory_xact_lock`.
- **Reproduction.** [g06-migrations.txt](probes/g06-migrations.txt): with `postgres` as a
  CREATEDB CREATEROLE non-superuser (as a managed service gives it; PostgreSQL 16+ semantics,
  `createrole_self_grant` empty): `must be able to SET ROLE "o_store"` (42501) after the roles were
  created. After `GRANT o_store, o_tally_db, io_identity TO postgres WITH INHERIT FALSE, SET TRUE`
  the run passes and a repeat passes. Two concurrent first runs on a fresh superuser instance: one
  fails `duplicate key … pg_authid_rolname_index`, the other passes, a third passes (fails closed).
- **Remedy.** Jeeves: the admin grants itself SET on each owner role it creates and holds a
  cluster-level advisory lock for roles and databases (**QG12**). QRWTY: expand/contract product
  SQL; migration as an explicit release job (Q04 draft, R05). Deployment: the release job's
  identity and its admin credential.
- **Decision.** Implemented-needed for cloud (QG12). The live Cloud SQL role model is a Q12a check.

### G07 — bounded aggregate storage, dedup, replay, poison events, batches

- **Inspected.** Loop stubs take one `ModuleMessage` per call at the Worker's Concurrency;
  `event-counter` keeps one receipt per event for ever (Jeeves known limit, open).
- **Remedy.** QRWTY: the Click aggregator stub with product SQL: time-partitioned dedup receipts
  dropped by partition after 35 days, aggregates, quarantine and replay (Q10). Jeeves: batch
  delivery and counter retention only if L1-scale measurement asks for them (deferred, no brief).
- **Decision.** Not needed for the local build; deferred to the capacity work (Q15).

### G08 — internal routes protected, public paths mapped safely

- **Reproduction.** [http-edge.txt](probes/http-edge.txt): the "internal" route of a public tile
  answers at the public edge (`/api/front/modules/front-internal-grant/entitlements` 200), as Q02
  saw for Billing API's Entitlements; the generated edge sends `Host: app-front:3000` and passes
  a client's `X-Forwarded-For` unchanged; short links live only under
  `/api/<tile>/modules/<module>/…` (F11).
- **Remedy.** QRWTY: Entitlements moves to an internal tile that reads Billing's published view
  (Q05 resave), or its handler requires an allowlisted workload caller; product code never trusts
  forwarded headers from the generated edge; the trusted edge and the `/<slug>` route map are
  QRWTY's (a local test edge, a Cloudflare Worker and load balancer URL map in `infra/`).
  Deployment: Cloud Run ingress and invoker IAM. Jeeves: per-route exposure (**QG15**, deferred).
- **Decision.** Not needed from Jeeves for the local build; QG15 deferred.

### G09 — non-root container, drain, liveness versus readiness, rotation

- **Reproduction.** `/env` answers `"uid": 0`; the Dockerfile has no `USER` (also PF review
  follow-up 11). [g09-drain.txt](probes/g09-drain.txt): `docker stop -t 10` with one in-flight
  request on a paused cache took 14.0 s and ended with exit 137; Compose's own stop grace is 6 min.
  One `/healthz` serves start and liveness and does not depend on dependencies after start.
  Credentials are read once when a client is built (rotation is a rolling restart).
- **Remedy.** Jeeves: `USER node` (**QG05**); the drain hang's cause (**QG04**); an overall drain
  bound (**QG16**, deferred). Deployment: restart policy, probe settings, rotation by new revision.
- **Decision.** Implemented-needed for the local build (QG05, QG04); QG16 deferred.

### G10 — external clients and cookie/session integration from stubs

- **Reproduction.** [http-edge.txt](probes/http-edge.txt): a stub's External API and Identity
  dependencies answer `501 … isn't provisioned`; [g13-g10-http-offline.json](probes/g13-g10-http-offline.json):
  two `Set-Cookie` values reach the client at run time, but `ModuleResponse.headers` is
  `Record<string, string>` ([TS2322](probes/g10-set-cookie-type.txt)). The export's
  `package.json` and `pnpm-lock.yaml` are `generated-scaffold` with a fixed dependency set, so the
  official Stripe SDK the billing contract names cannot be added without editing them (F16).
  Product configuration reaches a process only through an undocumented `compose.override.yaml`
  (F26).
- **Remedy.** Jeeves: repeated headers (**QG01**), the override file as a documented seam
  (**QG02**), application-owned dependency manifests (**QG03**, Jeeves owner decision). QRWTY:
  bounded product adapters for Web Risk (fetch), Stripe (SDK), OIDC (fetch + `jose`), cookies and
  CSRF in stub bodies (Q06–Q10a).
- **Decision.** Implemented-needed for the local build (QG01, QG02, QG03).

### G11 — publisher start/stop/drain; scheduled cleanup and reconciliation

- **Inspected.** Publishers drain after admission on SIGTERM (`process.ts`); `periodic` exists in
  the runtime but no stub can use it; the catalog has no scheduled module kind.
- **Remedy.** QRWTY: authenticated scheduled owner calls on the owning service (a scheduler
  service in the app's `compose.override.yaml` locally, Cloud Scheduler with an OIDC token in
  cloud), each job repeat-safe with database leases and fencing. Jeeves: a scheduled trigger for
  Worker stubs (**QG14**, deferred).
- **Decision.** Deferred (QG14); not needed for the local build.

### G12 — native Pub/Sub: ACK, IAM, endpoint, subscriptions, redelivery, worker hosting

- **Reproduction.** [fixture commands](fixtures/probe-design.commands.json): `provider:
  "google-cloud"` and `mode: "topic"` on a queue are refused ("no installed, useful editable
  consumer"). With the pinned SDK 6.3.2 and emulator 591.0.0:
  [setup](probes/g12-pubsub-setup.json) — a resent payload gets a new server ID (dedup must use an
  attribute), `deliveryAttempt` is 0 without a dead-letter policy and counts with one, a nack
  redelivers at once, the default subscription retention is 7 days;
  [stopped](probes/g12-pubsub-stopped.json) — a default publish is still pending after 20 s, one
  with `gaxOpts.timeout: 1500` rejects at 1.94 s; [restarted](probes/g12-pubsub-restarted.json) —
  the emulator loses its topics (`NOT_FOUND`). Worker hosting: no listener, file readiness
  ([g04-startup-coupling.txt](probes/g04-startup-coupling.txt)); HTTP processes listen on a fixed
  `0.0.0.0:3000`, which Cloud Run's container port setting accepts (deployment).
- **Remedy.** Jeeves: **QG07** (provider, emulator, setup, publisher), **QG08** (consumer loops),
  **QG09** (system tests). Deployment: topics, subscriptions, dead-letter topics, retention,
  disabled expiry, IAM and the archive subscription in `infra/` (Q04), live proof in Q12a.
- **Decision.** Implemented-needed for the local build.

### G13 — exact raw webhook bytes; signed public provider events

- **Reproduction.** [http-edge.txt](probes/http-edge.txt) and
  [g13-g10-http-offline.json](probes/g13-g10-http-offline.json): a 57-byte JSON body reaches the
  stub as an object whose re-serialization is 48 bytes, so an HMAC over it differs; the request has
  no raw field (`body, caller, headers, method, path, query`); form and octet-stream bodies are
  415, over 64 KiB 413, invalid JSON 400. Optional sign-in lets an unsigned-in provider request
  through and still refuses a bad bearer.
- **Remedy.** Jeeves: `ModuleRequest.rawBody` with the exact bytes (**QG01**). QRWTY: verify with
  the Stripe SDK in Payment events (needs QG03), inbox before 2xx (Q10a).
- **Decision.** Implemented-needed for the local build (QG01).

## 3. Findings F1–F26

Class: **J** generic Jeeves mechanism, **Q** QRWTY policy (hooks, stubs, product SQL, its own
edge), **D** deployment (outside Jeeves), **N** notation or readiness only.

| # | Finding (short) | Evidence | Class | Decision | Where |
| --- | --- | --- | --- | --- | --- |
| F1 | No GCP Pub/Sub channel | Q01 §6; [commands log](fixtures/probe-design.commands.json) | J, D | Implemented-needed (local) | QG07–QG09; Q04, Q12a |
| F2 | No raw request body | Q01; [http-edge](probes/http-edge.txt) | J | Implemented-needed (local) | QG01 |
| F3 | A public tile is public as a whole | Q02 §6; [http-edge](probes/http-edge.txt) | Q, D | Not needed from Jeeves; per-route exposure deferred | G08; QG15 |
| F4 | Stubs can't compose single-slot kinds | Q01 §4 | N | Not needed: one Custom module with many slots is the seam | — |
| F5 | No topic/work-queue control | Q01 §6 | J | Not needed separately: QG07 maps a channel to a topic with one subscription per consuming tile; the archive subscription is D | QG07 |
| F6 | Session API gets no OIDC configuration | Q01; Q02 compose | Q, J | Implemented-needed: configuration seam (local), audience (cloud) | QG02, QG11; Q07 |
| F7 | No scheduled trigger | Q01 | Q, J | Deferred; authenticated scheduled owner calls meanwhile | QG14; G11 |
| F8 | Event counter unbounded; positive cache read unsuitable | Q01 §4 | Q | Not needed: product implementations; counter retention stays a Jeeves known limit | G05, G07; Q08, Q10 |
| F9 | One action per lane, one entry per tile | Q01 | N | Not needed | — |
| F10 | Ownership readiness findings | Q01 | N | Not needed (grants in the export are right) | — |
| F11 | Short link only under `/api/<tile>/modules/<module>/` | Q02 | Q, D | Not needed from Jeeves: QRWTY's edge route map | G08 |
| F12 | External APIs and Identity `unavailable` to stubs | Q02; [http-edge](probes/http-edge.txt) | Q, J | Implemented-needed: config seam and dependency ownership; adapters are product code | QG02, QG03; Q06–Q10a |
| F13 | Compiled hosts, no TLS, no endpoint injection | Q02; [g01](probes/g01-endpoints.txt) | J, D | Implemented-needed (local): endpoints, then TLS and the insecure-endpoint refusal R01 checks | QG06, QG10 |
| F14 | Container runs as root | Q02; `/env` uid 0 | J | Implemented-needed (local) | QG05 |
| F15 | Unused generated material (FFmpeg stages, four unimported dependencies, two unreached files) | Q02 scope inventory | J | Deferred: no correctness effect; Q05's scope review reports it as unused | — |
| F16 | No application dependency seam: `package.json`/`pnpm-lock.yaml` are generated, so the Stripe SDK can't be added | export manifest ([summary](fixtures/probe-export-summary.json)) | J | Implemented-needed (local), Jeeves owner decision. If the coordinator amends the billing contract to a documented `node:crypto` verifier and `fetch`, it becomes deferred | QG03; Q10a |
| F17 | `ModuleResponse.headers` can't type two `Set-Cookie` values | [TS2322](probes/g10-set-cookie-type.txt) | J | Implemented-needed (local) | QG01; Q07 |
| F18 | A dependency down at process start fails startup; the process stays exited | [startup coupling](probes/g04-startup-coupling.txt) | J, D | Cache part implemented-needed (local); broker/publisher part deferred | QG04; QG16 |
| F19 | Drain has no bound; a stalled cache call held it until SIGKILL | [g09-drain](probes/g09-drain.txt) | J | Cause implemented-needed (local); overall bound deferred | QG04; QG16 |
| F20 | Stub cache client: no command deadline, no queue bound | [g05-cache](probes/g05-cache.txt) | J | Implemented-needed (local) | QG04 |
| F21 | Migrations need a superuser admin; concurrent first runs race on `CREATE ROLE` | [g06-migrations](probes/g06-migrations.txt) | J | Implemented-needed (cloud) | QG12 |
| F22 | The generated edge rewrites `Host` and passes a client's `X-Forwarded-For` | [http-edge](probes/http-edge.txt) | Q | Not needed: product never trusts forwarded headers from it; QRWTY's trusted edge sets them | G08 |
| F23 | The admission's own `503 DEADLINE` has no `Retry-After` and pre-empts a stub's error | [g04-publish](probes/g04-publish.txt) | Q | Not needed: product deadline below the tile's Request timeout | G04; Q08 |
| F24 | Every answer gets `Cache-Control: no-store`; a stub's own value is replaced | [http-edge](probes/http-edge.txt) (redirect) | J | Not needed for QRWTY (no-store is its contract); recorded for Jeeves | — |
| F25 | Pub/Sub SDK and emulator behaviour an adapter must handle (unbounded default publish, new server IDs on resend, emulator state lost on restart, retention default 7 days) | [g12 probes](probes/) | J, D | Implemented-needed: invariants of QG07–QG09; live behaviour Q12a | QG07–QG09 |
| F26 | `compose.override.yaml` works only as Docker's default, undocumented and unguarded | [compose-override-merge](probes/compose-override-merge.txt) | J | Implemented-needed (local) | QG02 |

## 4. Decision table

| ID | Decision | Generic Jeeves unit(s) | QRWTY policy (unit) | Deployment |
| --- | --- | --- | --- | --- |
| G01 | Implemented-needed | QG06, QG10 (both local) | binding inventory, production validator (Q04) | values, Secret Manager, IAM, networking (Q04 draft, Q12a/Q13) |
| G02 | Not needed (local); QG13 deferred | QG13 | one-statement product SQL functions (Q06, Q07, Q10, Q10a, Q10b) | — |
| G03 | Implemented-needed (cloud) | QG11 | Session API OIDC client (Q07) | managed issuer (Q12a amendment) |
| G04 | Implemented-needed | QG07, QG08, QG09, QG04; QG16 deferred | publish deadline, 503 shape, same event ID (Q08) | Pub/Sub resources (Q04, Q12a) |
| G05 | Implemented-needed | QG04 | `validatedUntil` entries (Q08) | Memorystore choice (Q12a) |
| G06 | Implemented-needed (cloud) | QG12 | expand/contract SQL, release job (Q04, Q06) | release job identity |
| G07 | Not needed (local); deferred to Q15 | — | Click aggregator with partitioned dedup (Q10) | — |
| G08 | Not needed from Jeeves; QG15 deferred | QG15 | internal Entitlements tile or workload check (Q05/Q10b), trusted edge, route map (Q04, Q12) | Cloudflare/LB, ingress, invoker IAM |
| G09 | Implemented-needed | QG05, QG04; QG16 deferred | — | restart policy, probes, rotation |
| G10 | Implemented-needed | QG01, QG02, QG03 | adapters for Web Risk, Stripe, OIDC, cookies (Q06–Q10a) | provider credentials |
| G11 | Deferred | QG14 | scheduled owner calls with leases (Q07, Q10, Q10a) | Cloud Scheduler |
| G12 | Implemented-needed | QG07, QG08, QG09 | event codec, dedup (Q08, Q10) | topics, subscriptions, DLQ, archive, IAM (Q04, Q12a) |
| G13 | Implemented-needed | QG01 (+ QG03 for the SDK) | Stripe verification, inbox (Q10a) | webhook endpoint secret |

F1–F26: the decision column of section 3.

## 5. Dependencies

- **Before Q04** (local bindings): QG04, QG05, QG06, QG07, QG08, QG09, QG10. Q04 verifies QG11
  and QG12 locally if they have landed, else lists them as pending bindings for Q12a.
- **Before Q05** (baseline freeze): every "local" QG (QG01–QG10). QG11 and QG12 are needed only
  for cloud, but landing them before Q05 avoids regenerating the frozen baseline later; if they
  land after, the update is charged to A as a later template change.
- **Product units:** Q06 needs QG02 (and QG01's types); Q07 QG01 (cookies), QG02; Q08 QG04, QG07;
  Q10 QG08; Q10a QG01, QG03; Q12 (R01 rehearsal) QG10; Q12a/Q13 QG11, QG12.
- **Jeeves owner decisions** before assignment: QG03 (who owns the dependency manifests), QG06
  (D1's "host names from the environment"), QG16 (startup with a lost broker, deferred).
- All QG work is charged to A's template-development ledger, as units.md says.

## 6. Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Each finding has code or command evidence | Pass: every G row and every F row names a probe output, an export file or a Q01/Q02 record | sections 2–3 |
| No manual patch to a generated file | Pass: only `generated-extension` paths (checked against the manifest) and a file outside the manifest were written, in a scratch copy; the untouched export stayed in `fx/export` | [commands](commands/README.md) step 3 |
| All dependencies named | Pass: section 5 and each brief's "Depends" line | [jeeves-gaps.md](../../plans/production-build/jeeves-gaps.md) |
| Each brief is self-contained | Pass by construction: goal, files, invariants, emitted changes, offline tests, regressions, regeneration proof, commit; read once more against the store-outage plan's shape | [jeeves-gaps.md](../../plans/production-build/jeeves-gaps.md) |
| Docker resources removed | Pass: images, volumes, networks and containers equal the before lists | [logs](logs/) |
| No Jeeves file or project changed | Pass: Jeeves `git status` unchanged; no studio call | [commands](commands/README.md) |
| No secret in the evidence | Pass: no generated credential value and no credential-shaped string found in `docs/evidence/q03/` | — |
| `sha256sum -c SHA256SUMS` | Pass | [SHA256SUMS](SHA256SUMS) |

## Not run

No Jeeves suite (no Jeeves file changed). No valid-token request against Keycloak, no multi-copy
run (Jeeves B02 covers copies), no Toxiproxy fault, no live cloud, Stripe, Web Risk or paid call.
Pub/Sub behaviour is the emulator's, not the managed service's durability or IAM (Q12a). The
non-superuser migration probe imitates a managed admin's privileges; it is not Cloud SQL.

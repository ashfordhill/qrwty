# Q04: A-found Jeeves gaps

Found by arm A's Q04 on the frozen generator, Jeeves `4e87f97`, exporting revision 83 with Click
events on Google Cloud. No generated file was edited: each gap is worked around in the
application overlay or the IaC, or left open, as stated. The coordinator decides whether a
post-freeze Jeeves fix is taken (owner decisions §10: A takes a later Jeeves change only to fix a
gap A itself finds).

| ID | Severity | Gap | Template | Workaround in Q04 |
| --- | --- | --- | --- | --- |
| AG-01 | Low | Configuration is validated lazily, one client at a time, between probes | `module-clients.ts.template`, the process files' `clients` order (`client-wiring.ts`) | The overlay's preflight checks the whole environment first |
| AG-02 | Medium | `JEEVES_REQUIRE_TLS=true` accepts `NODE_TLS_REJECT_UNAUTHORIZED=0`, which turns off verification for the fetch- and https-based clients | `module-clients.ts.template` (`requireTls`), `http-wiring.ts` (the guard's setup) | The preflight refuses it |
| AG-03 | Medium | Credentials are read only from one directory, `SECRET_DIR/<name>`; Cloud Run mounts each secret at its own path | `src/runtime/local.ts` (`readSecret`), `scripts/common.mjs` (`secret`) | The preflight links each mounted secret into one directory, then the shell execs the process |
| AG-04 | Medium | The cache client sends a static password read once, so Memorystore's IAM authentication can't be used | `valkey.ts.template` (`createValkeyCache`) | Memorystore with `AUTH_DISABLED`, PSC only, TLS on |
| AG-05 | Low | Pub/Sub topic and subscription names are compiled from the tile ID, with no environment binding | `client-wiring.ts`, `loop-wiring.ts`, `local-contract.ts` (`pubsubSubscription`) | The three names keep no `qrwtya-` prefix in the IaC |
| AG-06 | Low | `migrate.mjs` always provisions the local Keycloak's database and logins, also with a managed issuer | `local-contract.ts` (`providerLogins`), `migrate.mjs` | Two unused secrets and an unused database on Cloud SQL |
| AG-07 | Low (docs) | The generator README's endpoint table says a stub's Identity client reads `OIDC_ISSUER` | `jeeves-generator/README.md` ("Endpoints from the environment") | None needed: the code reads `JEEVES_IDENTITY_<ID>_URL` |

## AG-01: configuration is validated between probes

**Found.** Each client reads and validates its own variables when it is built, and the clients are
built in the sorted order of the `clients` object, each probed before the next is built. With the
production environment and one wrong setting, the generated runtime alone named the wrong setting
in only 15 of 96 starts ([R01 matrix, generated mode](records/r01-matrix-generated.jsonl)). In
Redirect service, `click-events` (Pub/Sub) comes first, so a `JEEVES_DATABASE_LINKS_TLS=disable` or
a missing `JEEVES_DATABASE_LINKS_HOST` is reported only as `Startup probe failed: queue
click-events` whenever Pub/Sub is unreachable. Analytics worker, whose database client comes first,
names the same settings.
**Effect.** Every misconfiguration is still refused eventually, one at a time, but a deployer sees
the first failing probe, not the configuration error; there is no validate-only start.
**Remedy (generic).** Validate every client's endpoint, transport and the guard's variables before
the first probe (one pass, all errors), then probe.

## AG-02: the TLS switch doesn't refuse Node's verification override

**Found.** [Experiment](records/node-tls-override.json): with `NODE_TLS_REJECT_UNAUTHORIZED=0`, a
`fetch` to a server whose certificate the client cannot verify connects (200), while `pg` with a
wrong CA is still refused (its explicit `rejectUnauthorized: true` wins). Session, Link, Account
and Billing API start and become ready with it set under `JEEVES_REQUIRE_TLS=true`
([R01 generated mode](records/r01-matrix-generated.jsonl), setting `node-tls-reject-off`).
**Effect.** The generated `externalTarget`, `identityTarget`, `httpTarget` and the sign-in's key
set (`jose`'s remote key set) would accept any certificate: a key set fetched over an unverified
connection can be replaced.
**Remedy.** Under `JEEVES_REQUIRE_TLS=true`, refuse `NODE_TLS_REJECT_UNAUTHORIZED` set to anything
but `1` (`Insecure endpoint NODE_TLS_REJECT_UNAUTHORIZED`), where the switch is read.

## AG-03: one credential directory

**Found.** `readSecret(name)` reads `${SECRET_DIR ?? "/run/secrets"}/${name}`, and so does
`migrate.mjs` through `common.mjs`. Cloud Run's documentation: "Cloud Run doesn't allow you to
mount multiple secrets at the same path because two volume mounts can't be mounted at the same
location" (`docs.cloud.google.com/run/docs/configuring/services/secrets`, read 2026-11-15). Redirect
service, Link API and Account API read two credentials each, and the migration job fourteen.
**Workaround.** Each secret is mounted at `<QRWTY_SECRET_MOUNT_DIR>/<name>/value`; the preflight
links them into `/tmp/qrwty-secrets` and the container command runs `SECRET_DIR=/tmp/qrwty-secrets
exec node …`. Proven by every profile-mode start ([R01](records/r01-matrix-profile.jsonl)).
**Remedy.** A per-credential file variable (for example `JEEVES_SECRET_<NAME>_FILE`), or reading
`<SECRET_DIR>/<name>/<file>` when the path is a directory.

## AG-04: the cache can't use IAM authentication

**Found.** `createValkeyCache` reads its password once (`readSecret`) and every new connection
sends it. Memorystore for Valkey's IAM authentication needs an access token that "expires one hour
after it's retrieved" (`docs.cloud.google.com/memorystore/docs/valkey/about-iam-auth`). Provider
8.8.1 also lists `TOKEN_AUTH`, whose behaviour Q04 could not confirm.
**Workaround.** `authorization_mode = AUTH_DISABLED`, reachable only through PSC, with in-transit
encryption. Locally, against a TLS Valkey with no password, the generated client works with an
empty credential and also with a password ([record](records/cache-auth-disabled.json)); the
preflight gives an empty credential file when `QRWTY_CACHE_AUTH_DISABLED=true`.
**Remedy.** A credentials provider in the cache client that fetches a fresh token per connection
(node-redis's `credentialsProvider`), selected by a variable.

## AG-05: Pub/Sub names can't be namespaced

**Found.** The topic is the tile ID (`click-events`), the subscription `<topic>--<tile>` and the
dead letter `<subscription>.failed`, compiled into the process files (`pubsubPublisher(scope, probe,
{ topic: "click-events" })`, the loop rows) and the setup plan. Arm B shares the project, and the
run names A's resources `qrwtya-`.
**Effect.** Two deployments of one design can't share a project, and the IaC's three Pub/Sub names
are the only ones without the prefix (`lint_iac.py` exempts exactly these).
**Remedy.** `JEEVES_PUBSUB_<ID>_TOPIC` and `_SUBSCRIPTION` variables (required, Compose sets the
local names), or a deployment prefix variable.

## AG-06: the local issuer's database in every migration

**Found.** `infra/local.json`'s `providerLogins` and databases include Keycloak's `i_identity`,
`io_identity` and `ik_identity`, so `migrate.mjs` creates them and needs `identity-owner-identity`
and `identity-identity`, even where the issuer is Auth0 ([managed run](records/managed-migrate.jsonl)
lists `i_identity`).
**Effect.** An unused database and two extra secrets on Cloud SQL.
**Remedy.** Provision a provider's database only where the provider runs (a deployment switch).

## AG-07: README row for the Identity client

The jeeves-generator README at `4e87f97`, table "Endpoints from the environment", says the Identity
client a stub calls reads `OIDC_ISSUER`; the code, the Provisioning table and QGR2 say
`JEEVES_IDENTITY_<ID>_URL`. Docs only.

## Noticed, not Jeeves gaps

- The Compose image ID changes with which service built it last (the `com.docker.compose.service`
  label); the layers are identical. R05 should compare layer digests or push one digest (P02).
- A process listens on 3000 (compiled); Cloud Run's `container_port` handles it.
- The bare export stops a process after a 6-minute grace; Cloud Run gives 10 s. Measured drains
  took 0.8–1.5 s.
- A publish abandoned by the request deadline can still land (QGR2 finding 2), and a held Pub/Sub
  message can be redelivered (QGR2 finding 3): already recorded by Jeeves, not new.

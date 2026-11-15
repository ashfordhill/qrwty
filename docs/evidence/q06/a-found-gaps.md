# Q06: A-found Jeeves gaps

Found by arm A's Q06 while writing Link API's first product code on the frozen generator, Jeeves
`4e87f97` (baseline `33d50e9`). No generated file was edited: each gap has a workaround in
application-owned files, stated below. Q04's AG-01 to AG-07 and Q05's AG-08 and AG-09 are
unchanged. The coordinator decides whether a post-freeze Jeeves fix is taken (owner decisions §10).

Known and not new, so not recorded again: no transaction API for stubs (Q03 G02, Jeeves QG13
deferred; every multi-row write here is one PL/pgSQL function call); credentials from one
`SECRET_DIR` only (AG-03); no lint or test runner in the export (Q05 review F7).

| ID | Severity | Gap | Template | Workaround in Q06 |
| --- | --- | --- | --- | --- |
| AG-10 | Medium | A stub has no startup step or declared configuration: its own settings and credentials are read at module import, outside the generated startup, and are absent from the report's environment, the Compose secrets and the README's variable list | `tile-process.ts` / `process.ts` (`runProcess`), the process files, `module-clients.ts`, `report.json` `processes.tiles[].environment` | Link API's stub reads `QRWTY_PUBLIC_ORIGIN_URL` and the `link-replay-keys` credential when its module loads; `compose.override.yaml` adds both; the production profile lists both, so the preflight refuses a start without them |
| AG-11 | Low | Product SQL has no versioned steps: the module file re-runs whole at every start, so a table change can only be a hand-guarded idempotent block | `products.mjs` (`applyProductSql`), the module SQL file's header | `product_migrations` and numbered `DO` steps in `link-api-link-operations.sql`, applied once each; functions, triggers and views are replaced every run |
| AG-12 | Low | The module schema's grant is fixed at SELECT, INSERT, UPDATE and DELETE on every table, re-granted after the module file runs, so an append-only or never-delete table can't be expressed as a privilege | `products.mjs` (`grantProductSql`) | Triggers: `links` refuses DELETE and TRUNCATE (tombstones), `link_versions` refuses UPDATE, DELETE and TRUNCATE (append-only) |

## AG-10: no startup step for a stub's own configuration

**Found.** A module stub is called per request; the export gives it its generated clients and
nothing else. Link API's link operations need two things of their own: the public origin (short
URLs, loop rejection) and a key ring to seal the claim proof in the idempotency record (product
contract). There is no hook in which a stub reads and validates such settings while the process
starts, and no way to declare them, so the report's `processes.tiles[].environment`, the README's
per-process variable list and `compose.yaml`'s secrets don't mention them.
**Reproduction.** In the built export, `node dist/processes/link-api.js` without
`QRWTY_PUBLIC_ORIGIN_URL` exits 1 with an uncaught `Error: Invalid QRWTY_PUBLIC_ORIGIN_URL …` and
a stack trace ([record](records/import-time-failure.txt)), not the generated
`{"event":"startup-failed"}` line that `runProcess` writes for its own failures, so tooling that
reads that line (R01's `profile-check.mjs` in `generated` mode) doesn't see a named reason.
**Workaround.** The stub's module evaluates `linkOperationsFromEnvironment()` at import, so a
missing or invalid value still stops the process before it is ready, naming the variable and
never its value. `compose.override.yaml` sets the origin, mounts `link-replay-keys` from
`QRWTY_LOCAL_APP_SECRET_DIR` (`infra/local/app-secrets.sh`), and turns the test hooks on; the
production profile adds both to Link API's required variables and secrets, so the preflight
refuses a production start without them first. The IaC (`infra/gcp`, not this unit's to edit)
does not create the `link-replay-keys` secret yet: Q12a/Q13 add it.
**Remedy (generic).** A stub-level `configure(env, secrets)` step that `runProcess` calls before
the probes, with declared variables and credentials that the report, README, Compose secrets and
`JEEVES_REQUIRE_TLS`-style checks include.

## AG-11: no versioned product migrations

**Found.** `applyProductSql` runs each module's SQL file in full at every `first-run` and
`start`, in the owner's transaction, and the file's header asks for `IF NOT EXISTS` / `CREATE OR
REPLACE`. That suits functions and views, not tables: an `ALTER` or a backfill must guard itself,
and nothing records which change ran (the template's own migrations are recorded in
`public.local_migrations`, by file hash; product files are not).
**Workaround.** The file keeps its own sequence: `product_migrations(version, name, applied_at)`
and one `DO` block per numbered step that returns at once when its version is recorded. Steps are
append-only (expand first, contract in a later release); code that holds no data is replaced every
run. Proven re-runnable (three runs, one recorded step; [integration test](../../../app/test/integration/schema.test.ts)).
**Remedy.** Versioned product migration files per module (`modules/<module>/NNN-*.sql`), applied
once in order and recorded with their hashes, like the template's own.

## AG-12: no per-table privileges in a module schema

**Found.** `grantProductSql` revokes everything from the module host's login, then grants
`SELECT, INSERT, UPDATE, DELETE ON ALL TABLES` in the module schema, after the module file has run.
A `REVOKE DELETE` in the module file is undone at once, so "a link is never deleted" and "history
is append-only" can't be privileges.
**Workaround.** Triggers owned by the setup owner: `links_guard` refuses DELETE (`QRW10`), an id,
domain, slug or creation-time change (`QRW12`), any change to a deleted link (`QRW13`) and a version
step other than +1 (`QRW14`); `refuse_change` makes `link_versions` append-only and refuses
TRUNCATE on both (`QRW15`). The runtime login can't drop them (it owns nothing). Tested on
PostgreSQL 17 as the runtime login.
**Remedy.** Per-table privilege declarations for a module's tables (for example a `-- grants:`
header or a small manifest beside the SQL file) that `grantProductSql` applies instead of the
blanket grant.

## Noticed, not Jeeves gaps

- The generated error body is `{"error": CODE, "message"}`, and the runtime's own 400 (bad JSON),
  413, 415 and 503 (`DEADLINE`, `OVERLOADED`, `UNAVAILABLE`) use it; the product contract's is
  `{"error": {code, message, retryable}}`. Link API's own answers use the product shape; Session
  API (Q07) maps the runtime's at the public edge. A product contract is the product's.
- The tests and their configuration (`app/test/`, `vitest.config.ts`, `biome.json`) land in the
  LOC summary's support category `other`, because source-loc-v2 marks every path outside `src/`
  `outside-src` before it looks for tests. Backend R, C, D and B are unaffected; a `tests` category
  for `test/` paths in `tools/loc/summary.mts` is a small follow-up for the measurement owner.
- Containers can't reach the host's loopback, so the oracle's Web Risk fixture listens on the
  Docker bridge's host address (`172.17.0.1:47212`, not reachable from outside this machine).

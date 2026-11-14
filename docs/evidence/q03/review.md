# Q03 review: audit of the generation capability report

Run `qrwty-r1-20261114`, arm A, unit Q03-review, attempt 1. Reviewed Q03's commit `5740e6e` from
QRWTY `e88dcb8` and Jeeves `59bfbc6` (SO08) by an agent that did not implement Q03. Read:
[capabilities.md](capabilities.md), every probe output and log under `evidence/q03/`, the
fixture and its probe bodies, [jeeves-gaps.md](../../plans/production-build/jeeves-gaps.md), the
Q03 assignment packet, `architecture.md`, `acceptance.md`, the Q04–Q10b sections of `units.md`,
`durable-clicks.md`, `billing-contract.md`, `local-to-cloud.md`, the neutral oracle spec, and in
Jeeves the templates Q03 cites (`module-clients`, `http`, `tile-http`, `entry`, `valkey`,
`postgres`, `process`, `transaction`, `admission`, `tile-loop`, `migrate.mjs`, `Dockerfile`),
`local.ts`, `client-wiring.ts`, `http-wiring.ts`, the resolver, `docs/template-gaps.md`, the BR,
GS and SO plans and reviews, and the production-foundations decisions and review follow-ups.
Probes re-run in scratch only (section 2); no Jeeves file or project changed; Docker inventory
equal before and after.

## Verdict

**Passed with findings.** Q03 did what the unit asked: every G01–G13 decision rests on a probe of
real generated code or on a code reading that I confirmed; the F1–F26 classification is right in
all but three places; no landed Jeeves fix is duplicated; the sixteen briefs are exact enough for
a fresh agent; the four marked owner decisions are owner decisions (one is settled by
precedent). Two briefs need an amendment before assignment (QG12 would silently leave databases
open to PUBLIC in cloud; QG06 would make QG04's stub cache refuse an IP endpoint), and one generic
gap that local acceptance needs is missing: a **stalled** PostgreSQL holds a stub's query and the
process's drain until SIGKILL, and the product has no seam to bound it. Four units are proposed.

## 1. Code citations checked

Every Jeeves line Q03 cites is as described at `59bfbc6`:

| Claim | Where | Seen |
| --- | --- | --- |
| Compiled `local-postgres:5432`, `local-broker:5672`, `` `cache-${id}` ``:6379, `http://app-<id>:3000` | `module-clients.ts.template` 94–95, 121–122, 105–106; `client-wiring.ts` 159; `service-resources.ts.template` 54–55, 69–70 | Yes |
| Stub cache: raw `createClient`, `disableOfflineQueue`, no command deadline or queue bound, fatal probe | `module-clients.ts.template` 166–183 | Yes |
| `createValkeyCache`: 150 ms command bound, 500 ms connect, queue 32, 5 s regeneration | `valkey.ts.template` 21–25, 91, 108 | Yes |
| No `rawBody`; `ModuleResponse.headers: Record<string, string>`; `body: request.body` | `entry.ts.template` 11–27; `tile-http.ts.template` 49, 70 | Yes |
| Compiled audience `` `${binding.identity}-web` `` | `http-wiring.ts` 336 | Yes |
| `createPostgres` passes no `ssl`; `statement_timeout` 2000 server-side, no client-side query bound | `postgres.ts.template` 15–24 | Yes |
| `migrate.mjs`: roles and `CREATE DATABASE … OWNER` as admin outside any lock; per-database `pg_advisory_xact_lock` only | `migrate.mjs` 24–40, 50 | Yes |
| Dockerfile has no `USER` | `Dockerfile` | Yes |
| `runProcess` drains in reverse with no bound; `periodic` exists and no stub reaches it | `process.ts.template` 29–43, 90 | Yes |
| `stop_grace_period` 6 m (21 m media); no restart policy | `local.ts` 904, 1120 | Yes |
| A stub's queue with a provider other than unspecified/self-hosted is a required `unsupported` gap | `local-contract.ts` 93–94, 148 | Yes |
| `edit <queue> {provider: "google-cloud"}` refused "no installed, useful editable consumer" | `supported-authoring.ts` 136; fixture commands log | Yes |
| The Queue settings schema already has `provider … google-cloud` (QG07 makes it a normal control) | `docs/studio-settings.md` Resources table | Yes |
| The generated edge sets no `Host` or `X-Forwarded-*` headers | emitted `infra/edge/nginx.conf`: `location /api/front/ { set $backend app-front:3000; rewrite …; proxy_pass http://$backend; }` | Yes |
| `.jeeves/overrides.json` is the installed way to keep a generated file, and "either way the edit is a template gap" | `jeeves-generator/README.md` "Updating an existing export" | Yes |
| PF "Not in this plan": host names from the environment are deployment (D1); PF review follow-up 11: `USER`; BR "Not in this plan": startup while the broker is down is a later owner decision | PF `units.md` 53, PF `review.md` 103, BR `units.md` 31 | Yes |

## 2. Probes re-run

Scratch: the fixture (`probe-design.json`, SHA-256 `a3b6204f…0505`) exported with
`export:v2` (57 files, 0 findings, 3 required gaps, 0.5 s), `pnpm install --offline`, `pnpm build`;
one disposable `postgres:17.11-alpine3.23@sha256:bc2701f9…b61f` container `q03r-pg` on
127.0.0.1:47951, removed with its anonymous volume by name; Docker containers, images, volumes and
networks equal before and after. The probe script imported the export's **built**
`dist/runtime/postgres.js` and reproduced `databaseClient`'s pool options and `query`/`execute`
wrappers verbatim (credential and endpoint supplied directly). Node 24.21.0.

| Probe | Q03's result | Re-run |
| --- | --- | --- |
| **G02** `/tx`: `execute("BEGIN")`, three parallel queries | one of three in an open transaction; one `idle in transaction` session; 0 after ten `ROLLBACK`s | Same, three runs: `inOpenTx [true,false,false]`, `idleInTransaction 1`, `afterRollbacks 0` |
| **G02** `/fn`: `two_rows(a, b, fail)` in one `execute` | raise leaves 0 rows; without the raise 2 | Same: `afterFailing 0`, `afterSucceeding 2` |
| **G07** | no probe; inspection ("one `ModuleMessage` per call", receipts for ever) | Confirmed by code: `startModuleLoop`/`moduleHandler` take `entry: (message: ModuleMessage) => Promise<void>` (`tile-loop.ts.template` 112, 162); the counter limit is Jeeves's own known limit. The decision (product implementation; batches only if L1 asks) does not need a run |
| **G08** | internal route 200 at the public edge; `Host: app-front:3000`; client's `X-Forwarded-For` passed through | Confirmed from the emitted `nginx.conf` (above): one `location /api/<tile>/` per public process proxies every module path, no `proxy_set_header`, so nginx's default `$proxy_host` becomes `Host` and client headers pass unchanged |
| **G11** | no probe; inspection (`periodic` unreachable from stubs; no scheduled kind) | Confirmed by code: `periodic` is exported from `process.ts` and emitted only by template wiring; `jeeves/CATALOG.md` and `docs/studio.md` have no scheduled kind or trigger |
| **New: stalled PostgreSQL** (not run by Q03) | — | On the generated pool options with one warm connection, `docker pause`: `SELECT 1` **still pending after 12,000 ms** (`statement_timeout` is server-side, the server is frozen); `pool.end()` **still pending after 5,000 ms**; both settle only after `unpause` (17.1 s). The same with pg's `query_timeout: 2500`: rejects `Query read timeout` at **2,501 ms**, the pool drops the connection (`totalCount 0`), `pool.end()` resolves at once |
| **New: QG12's non-superuser path** | "the run passes and a repeat passes" after `GRANT … WITH INHERIT FALSE, SET TRUE` | As `admin2` (CREATEDB CREATEROLE, not superuser): `CREATE DATABASE x OWNER o_x` fails `must be able to SET ROLE "o_x"` (Q03's finding); after the grant it passes; then `REVOKE ALL ON DATABASE x FROM PUBLIC` → **`WARNING: no privileges could be revoked for "x"`** and `GRANT CONNECT ON DATABASE x TO r_x` → **`WARNING: no privileges were granted`**; `datacl` stays `{=Tc/o_x,o_x=CTc/o_x}` and `has_database_privilege('admin2','x','CONNECT')` is `t` through PUBLIC. After `SET ROLE o_x` both statements take effect: `datacl {o_x=CTc/o_x,r_x=c/o_x}`, PUBLIC's CONNECT gone |

Surprising conclusions re-examined without a run: Q03's Pub/Sub probes (default publish pending
after 20 s with the service down, new server IDs on resend, emulator state lost on restart) are
consistent with the SDK's gax defaults and the documented emulator limits; QG07 fixes a gax
timeout either way, so nothing in the briefs depends on the exact number. The redis 6.3.0
per-command `timeout` remark in QG04 was not verified; QG04 uses `createValkeyCache`'s race, so
it isn't load-bearing.

## 3. Answers to the review questions

### 3.1 Probes

Eleven of thirteen G decisions rest on a probe that exercised real generated code (host runs of
the built processes, the Compose stack with `docker pause`/`stop`, `migrate.mjs` against
PostgreSQL 17.11, the identity verifier offline, the pinned SDK against the pinned emulator, the
studio's own command path for the refusals). G07 and G11 rest on code reading; both readings are
correct and neither decision would change with a run. The one probe that reached a wrong
conclusion is G06's non-superuser repeat (section 2): it checked exit codes and `local_migrations`,
not the database ACLs. Q03 also did not probe a **stalled** PostgreSQL, though it probed a stalled
cache and a stalled broker; the oracle's F02 says "Postgres refused and **stalled**".

### 3.2 Classification

F1–F26 are classified correctly except:

- **F12/G10 (External API and Identity `unavailable` to stubs): a generic gap pushed onto the
  product.** Q03's remedy is a product `fetch` adapter reading its own configuration through QG02's
  override, leaving the diagram's External API link decorative. The generic mechanism is small and
  already exists for application tiles: `httpTarget(base)` with the base from the environment
  (QG06's convention). An External API target must not carry SO04's internal-call mark (an outside
  call keeps the normal retries); an Identity target should (Keycloak is a provisioned service the
  owner chose to wait out). GS09's review already lists "there is no installed external-API client"
  as an open gap. Proposed unit QG20 (needs the owner).
- **F22 (the generated edge rewrites `Host` and passes a client's `X-Forwarded-For`): J, not Q.**
  The product cannot change the emitted `nginx.conf`; it can only bypass the edge, which is what
  Q03's remedy does (the oracle's trusted edge and the production edge reach `app-<id>:3000`
  directly). "Not needed for the local build" stands; the record should name it a Jeeves limit so
  a future app that needs the client's host or address behind the generated edge (the
  `rate-limiter` stub, for one) finds it. No unit now.
- **F19 (drain has no bound): the cause is wider than QG04.** `admission.drain()` awaits every
  pending handler and `pool.end()` awaits every checked-out client, so **any** stalled dependency
  call holds the drain, not only the cache. Section 2 shows PostgreSQL does. QG04 fixes the cache;
  the database needs its own bound (QG17), and the product has no seam for it (`createPostgres`
  is generated). "Overall drain bound deferred (QG16)" is still reasonable as defence in depth.

No policy was moved into a template to inflate the generated share: QG07/QG08 carry only what the
RabbitMQ transport already has (`.failed`, retry limit, per-tile subscriptions, reconnect), and
Q03 kept the event codec, dedup horizon, `validatedUntil`, bot filtering, entitlements and the
route map as product work. QG02 is documentation and a guard; QG03 is ownership metadata.

### 3.3 Existing fixes

Nothing already landed is proposed again: QG04 reuses PF07's `createValkeyCache`; QG12 extends the
existing per-database lock; QG01 adds only the type and the raw bytes (Fastify already sends a
header array, as Q03's offline probe shows); QG13 names `runtime/transaction.ts` for reuse; QG16
is attributed to BR's open startup decision. Three Jeeves records Q03 did not cite but that bear
on its findings: GS09 review's open gap "no installed external-API client" (F12), SO03 review's
open item 3 "a stalled (not stopped) database … from the code, not run" (now run, section 2), and
PF review follow-up 10 (`pnpm start` after a fault returns the stack to one copy, relevant to the
oracle's two-copy local scope: the oracle adapter must not use `pnpm start` to recover a copy).

### 3.4 Brief quality

Each of QG01–QG12 names its files, invariants, emitted output, pins, offline tests, regressions,
regeneration proof and commit, in the store-outage plan's shape; the shared regeneration proof
(two fixtures, `diff -rq`, exact path list, offline install and build) is a good stop condition.
Hedged file names ("`local.test.ts` or `assemble.test.ts`") are findable by grep and acceptable.
Dependencies and order are right, with three amendments:

1. **QG12 step 3 is wrong for its own goal** (section 2). With a non-superuser admin, the
   database-level `REVOKE ALL … FROM PUBLIC` and `GRANT CONNECT` are warnings, not errors, so the
   script exits 0 and prints "Migrations current" while PUBLIC keeps CONNECT on every database.
   Add a step: run `REVOKE ALL ON DATABASE … FROM PUBLIC` and each `GRANT CONNECT` as the owner
   (`SET ROLE <owner>` … `RESET ROLE` on the admin connection, or on the owner's own connection
   that the script already opens), and an invariant: after a non-superuser run,
   `has_database_privilege(<admin>, <db>, 'CONNECT')` is false and `pg_database.datacl` holds no
   `=…` (PUBLIC) entry. The Docker proof should assert the ACL, not only the exit codes.
2. **QG06 and QG04 together refuse a cache IP.** `createValkeyCache` validates the host with
   `/^[a-z][a-z0-9.-]{0,254}$/` (a leading lowercase letter), which QG06 says "stays". Once QG04
   moves the stub cache onto it, a Memorystore endpoint such as `10.1.2.3` fails `Invalid cache
   endpoint` at startup (checked: `10.1.2.3` false, `Redis.Internal` false, `cache-hot` true).
   QG06 must relax that check to its own rule (`[A-Za-z0-9.-]{1,253}`), or QG04 must pass a
   pre-validated binding. Cloud-only in effect, but it is QG06's text that is wrong.
3. **QG10 depends on QG04 too**, else its `socket.tls` lands in two cache clients; and its "Not in
   this plan" should say RabbitMQ TLS is out of scope (QRWTY has no broker after QG07).

Smaller points: QG07 is the largest unit (resolver in `packages/spec`, export plumbing, a new
setup script, the asset lockfile, the publisher runtime, docs, a mouse check and `eval:chat`);
splitting it into the control and export plumbing (QG07a) and the publisher runtime (QG07b)
would fit "one fresh agent" better. QG07's fixed bounds (2,000 ms, 1,000 outstanding) are
template policy in the style of the cache's 150 ms; Q15 may need to revisit the outstanding bound
at L1. QG09 blocks Q04 in section 5 of the audit; Q04 could start once QG08 lands, with QG09
required before Q05's freeze.

### 3.5 Owner decisions

| Marked | Really an owner decision? |
| --- | --- |
| QG03 (who owns `package.json`/`pnpm-lock.yaml`) | Yes: the generator README says an override "is a template gap", and AGENTS.md's ownership sentence would change. Not blocking: `.jeeves/overrides.json` works today for Q10a, recorded as a gap |
| QG04 (a stub's cache down at startup no longer stops the process) | Yes: BR left startup to a later owner decision; PF07 decided it for the cache read only; the tile-processes contract still says a failed probe fails startup |
| QG06 (endpoints from the environment) | Yes: PF's "Not in this plan" row puts "host names from the environment" under D1, and `template-gaps.md` says "deployment is outside Jeeves". Reading values is a mechanism and the values stay deployment, as Q03 argues, but only the owner can say so |
| QG07 (the Pub/Sub SDK and emulator pins enter every export) | Settled by precedent: every provider SDK already ships in every export's lock (`hls.js`, the AWS SDK, OpenSearch, F15), and the pin convention (exact, two weeks old) is in AGENTS.md. Information for the owner, not a decision |

### 3.6 Local acceptance

Everything Q03 marks cloud-only or deferred is indeed not needed by `acceptance.md` and the
oracle's local scope: the local Keycloak carries `identity-web` (QG11), local setup runs as
superuser once (QG12), one-statement product SQL functions are atomic (QG13), scheduled owner
calls and the internal-tile move are product (QG14, QG15), and the oracle's F rows fault
mid-traffic, not at startup (QG16's startup half). One local need is **missing**: F02 ("Postgres
refused and stalled … 503 with `Retry-After` … recovers without restart"), F05 ("drain completes
or times out within the configured bound") and F01's "no connection leak" meet a stalled database
that the generated pool never bounds (section 2) and that the product cannot bound (no seam).
That is QG17, with a side effect on SO01's classifier (QG18) and on the admission's 503 shape
(QG19). The generated edge's headers (F22) are not needed locally because the oracle's trusted
edge bypasses it.

## 4. Findings

Severity: **high** blocks a brief or an acceptance row as written; **medium** is wrong or missing
and must be fixed before assignment; **low** is a record or a wording.

| # | Severity | Finding | Evidence | Recommended fix |
| --- | --- | --- | --- | --- |
| R1 | **Medium** | QG12 as written leaves PUBLIC's CONNECT on every database and exits 0, in the very case it exists for (non-superuser admin) | Section 2, QG12 probe: two `WARNING`s, `datacl {=Tc/o_x,…}`, `admin2_connect t`; as the owner the ACL is right | Amend QG12 (3.4 item 1): database-level REVOKE/GRANT as the owner; ACL invariant and Docker assertion |
| R2 | **Medium** | A stalled PostgreSQL holds a stub's query and the process's drain with no bound; the product has no seam | Section 2: pending after 12 s and 5 s on the generated options; 2.5 s with pg `query_timeout`; F02/F05/F01 local rows | New unit QG17 (ready) |
| R3 | **Medium** | QG06 keeps `createValkeyCache`'s leading-letter host check while QG04 routes stub caches through it: a cache IP is refused at startup | `valkey.ts.template` 17; regex test; QG06 "Validation" paragraph | Amend QG06 (3.4 item 2) |
| R4 | Low | F12/G10's remedy pushes a small generic mechanism (an environment-configured HTTP client for External API and Identity tiles) onto product `fetch` adapters | `client-wiring.ts` 160–183 (`unavailable` for both kinds; `httpTarget` for application tiles); GS09 review's open gap | New unit QG20 (needs the owner) |
| R5 | Low | `Query read timeout` is not in SO01's unreachable list: with QG17 a worker's stalled-database query would spend an attempt instead of waiting | SO units.md Decision list; SO03 open item 3 | New unit QG18 (needs the owner: it adds to the Decision) |
| R6 | Low | The admission's own `503 DEADLINE`/`OVERLOADED`/`UNAVAILABLE` carry no `Retry-After`; durable-clicks requires one on "exhausted capacity", which the product cannot shape | `admission.ts.template` 49–51, 62–68; Q03 F23 | New unit QG19 (ready) |
| R7 | Low | F22 classified Q; the product can only bypass the generated edge | Emitted `nginx.conf` | Record as J (Jeeves limit) when the briefs are copied; no unit |
| R8 | Low | QG10 should depend on QG04 and exclude broker TLS explicitly | QG10 Depends line; `valkey.ts.template` vs `module-clients.ts.template` | Amend QG10 |
| R9 | Low | QG07's owner decision 4 is settled by precedent; QG07 is large for one agent | F15; QG07 Files list | Mark as information; consider QG07a/QG07b |
| R10 | Low | G07 and G11 decisions rest on inspection, not a probe; both confirmed | Section 2 | None |
| R11 | Low | Three bearing Jeeves records not cited (GS09 external-API gap, SO03 item 3, PF follow-up 10) | 3.3 | Cite when copying; the oracle adapter must not recover a copy with `pnpm start` |

## 5. Is each QG safe to assign now?

| Unit | Assign now? | Condition |
| --- | --- | --- |
| QG01 | Yes | — |
| QG02 | Yes | — |
| QG03 | After owner decision 1 | Not on the critical path: `.jeeves/overrides.json` serves Q10a meanwhile |
| QG04 | After owner decision 3 (either answer) | Drop invariant 2 if the answer is no; the rest is sound |
| QG05 | Yes | — |
| QG06 | After owner decision 2 **and** amendment R3 | — |
| QG07 | After QG06 | Decision 4 is information; optional split |
| QG08 | After QG07 | — |
| QG09 | After QG08 | Required before Q05, not before Q04's start |
| QG10 | After QG06, QG07 **and QG04**, with R8 | — |
| QG11 | Yes (cloud) | — |
| QG12 | **Not as written**: after amendment R1 | Then yes (cloud) |
| QG13–QG16 | No (deferred) | As Q03 says |
| QG17 | Yes (new, ready) | Should land before Q04 with QG04 |
| QG18 | After the owner's answer (new) | — |
| QG19 | Yes (new, ready) | — |
| QG20 | After the owner's answer (new) | Before Q07/Q09 if yes |

## 6. Proposed units

Numbers continue Q03's. Each follows jeeves-gaps.md's shared Rules and Regeneration proof.

### Q03b — Apply the review's amendments to the QG briefs (ready)

**Goal:** `docs/plans/production-build/jeeves-gaps.md` carries R1, R3, R8, R9 and the four new
units before any brief is copied into Jeeves. **Files:** that file only (and `docs/handoff.md`).
**Steps:** 1. QG12: after step 2 add step 3 "Run `REVOKE ALL ON DATABASE … FROM PUBLIC` and each
`GRANT CONNECT ON DATABASE … TO <login>` as the owner: on the admin connection `SET ROLE <owner>`
before them and `RESET ROLE` after (quoted with `quote`), so a non-superuser admin's statements
are not warnings"; renumber the old step 3; add the invariant "after a non-superuser run,
`has_database_privilege(current_user, <db>, 'CONNECT')` is false and `pg_database.datacl` has no
PUBLIC (`=`) entry"; the Docker proof asserts that ACL; the offline test asserts the `SET ROLE`
lines. 2. QG06: replace "(the cache read's stricter existing check in `createValkeyCache` stays)"
with "(`createValkeyCache`'s check becomes this same rule, since QG04 routes stub caches through
it)" and add `valkey.ts.template` to Files. 3. QG10: Depends becomes "QG04, QG06, QG07"; "Not in
this plan" gains "RabbitMQ TLS". 4. QG07: decision 4 becomes a note ("pins follow the existing
convention; every provider SDK already ships in each export"). 5. Append QG17–QG20 below as
written here; add them to the Order table (QG17 local, before Q04; QG18 local after the owner;
QG19 local; QG20 local after the owner, before Q07). 6. F22's class in `capabilities.md` is Q03's
record and is not edited; the handoff notes R7. **Checks:** links resolve; the Order table and
section 5 of capabilities.md agree (handoff says where they differ).
**Commit:** `Q03b: amend the QG briefs from the review`.

### QG17 — Database calls settle while PostgreSQL stalls (ready; local, before Q04)

**Goal:** a stub's or template's query on a connection whose server has stopped answering
rejects within a fixed bound, the pool discards that connection, and a drain no longer waits on
it. **Found (review).** With `docker pause` on PostgreSQL and one warm pooled connection,
`SELECT 1` on the generated options is still pending after 12 s and `pool.end()` after 5 s;
`statement_timeout` is enforced by the server, which is frozen. With pg's `query_timeout: 2500`
the query rejects `Query read timeout` at 2.5 s, pg-pool removes the client (`_release` with an
error → `_remove`), and `pool.end()` resolves at once.
**Files.** `templates/local-v2/assets/src/runtime/postgres.ts.template` (one option);
`src/v2/module-clients.test.ts` or the test that asserts `createPostgres`'s options (if none
reads the emitted file, add one as SO01's `composition.test.ts` test does); `jeeves-generator/README.md`
(the sentence on a stub's database client's deadlines); `docs/studio.md` if it names the
statement timeout; `docs/template-gaps.md` Known limits: SO03's "a stalled (not stopped)
database" item becomes a row "Fixed in QG17" (add the row if the review's item was never copied).
**Invariants.** 1. `createPostgres` passes `query_timeout: options.statementTimeoutMs + 500` to
`pg.Pool`, so a healthy server's `statement_timeout` (SQLSTATE `57014`) still wins and the client
bound fires only when no reply comes. 2. Nothing else about the pool changes (`max`,
`connectionTimeoutMillis`, `statement_timeout`, the `error` listener callers add). 3. Both
callers (`databaseClient` in `module-clients.ts.template`, `pool()` in
`service-resources.ts.template`) get it through `createPostgres`; neither is edited.
4. `migrate.mjs` and the setup scripts are unchanged (long migrations are legitimate).
**Emitted output.** `src/runtime/postgres.ts` (pinned: frozen-v2, v2-module-design) and
`.jeeves/manifest.json`; any other: stop.
**Offline tests.** The emitted `postgres.ts` passes `query_timeout` equal to the statement timeout
plus 500 (fails before); with a fake `pg.Pool` constructor the option value is 2500 for
`statementTimeoutMs: 2000`.
**Required regressions:** check, e2e, build; Docker phase `--suite=core`, `--suite=faults`
(SO02's database row must still pass: a **stopped** server reports `57P01`/`ECONNRESET`, which is
unchanged). **Docker proof:** the probe export built; a scratch PostgreSQL 17.11 (pinned digest);
`node` script on the built `dist/runtime/postgres.js` as this review's: warm one connection,
`docker pause`, a query rejects `Query read timeout` within 3 s, `pool.totalCount` is 0,
`pool.end()` resolves within 1 s; `docker unpause`; remove the container by name. **Limit to
record:** pg destroys the stalled socket only in pipeline mode; otherwise the discarded client's
socket closes when the network recovers (FIN) or TCP gives up, so sockets can accumulate during a
long stall and return to baseline after it.
**Commit:** `QG17: database calls settle while PostgreSQL stalls`.

### QG18 — A client-side query timeout counts as unreachable (needs the owner)

**Why the owner:** it adds to the store-outage Decision's list, as SO05 said of SO06. **Goal:**
`unreachable()` in `delivery.ts.template` answers true for an error whose message is exactly
`Query read timeout` (pg's client-side timeout, QG17), so a worker whose database stalls waits 5 s
and keeps the attempt instead of spending its retries. **The catch for the owner:** a stall that
never ends then cycles for ever, as any outage does under the Decision; a query that is merely
slow (over 2.5 s but under the server's `statement_timeout`) is not affected because the server's
`57014` comes first. **Files:** `delivery.ts.template`; `src/v2/primitives.test.ts` (true for
`new Error("Query read timeout")`, false for `new Error("Query read timeout exceeded")` and for a
`NonRetryable` wrapping it); pins `.jeeves/manifest.json`, `src/runtime/delivery.ts`;
`docs/plans/store-outage/units.md` Decision (one bullet, in the owner's words);
`jeeves-generator/README.md`'s list of what counts as unreachable. **Checks:** check, e2e, build;
`--suite=faults`. **Commit:** `QG18: a client-side query timeout counts as unreachable`.

### QG19 — The admission's 503 answers carry `Retry-After` (ready; local)

**Goal:** the three 503s the generated runtime answers on its own (`UNAVAILABLE` while not
accepting, `OVERLOADED` at the concurrency limit, `DEADLINE` at the request timeout) carry
`Retry-After: 1`, so a client's bounded retry needs no product code; a stub's own 503 keeps its
own value. **Found (Q03 F23, review R6).** `createAdmission` throws `HttpError`s and
`createHttpService`'s error handler sends `{ error, message }` with no header; durable-clicks
requires a bounded `Retry-After` on every failure path including "exhausted capacity", which a
stub cannot shape. **Files.** `templates/local-v2/assets/src/runtime/http.ts.template`
(`setErrorHandler`: when `error instanceof HttpError && error.statusCode === 503`, set
`Retry-After` to `"1"` unless the reply already has one); tests in `src/v2/tile-processes.test.ts`
(the block that loads the emitted `http.ts`): a handler that never resolves → 503 `DEADLINE` with
`retry-after: 1`; a route called while not accepting → 503 `UNAVAILABLE` with it; a 503 thrown by
a handler as `HttpError(503, …)` also gets it; a 404 and a 400 do not. Docs:
`jeeves-generator/README.md` where the three codes are listed. **Invariants.** Status codes,
bodies and the `Cache-Control: no-store` hook are unchanged; the value is fixed (one second).
**Emitted output.** `src/runtime/http.ts` (pinned) and `.jeeves/manifest.json`.
**Required regressions:** check, e2e, build; `--suite=wiring`. **Commit:** `QG19: the admission's
503 answers carry Retry-After`.

### QG20 — External API and Identity tiles give stubs a configured HTTP client (needs the owner)

**Why the owner:** today an External API or Identity link gives a stub an `unavailable` proxy by
design ("isn't provisioned locally", "an Identity isn't provisioned for stubs"); this makes both
real clients, with the base URL from the environment. Confirm, or keep product `fetch` adapters
(Q03's remedy; nothing then changes). **Goal:** for a stub's link to an External API tile,
`dependencies[...].<slot>` is `httpTarget`-like with base `JEEVES_EXTERNAL_<ID>_URL` (required,
validated as QG06 validates a URL; QG10's `https:` refusal applies), **without** the internal-call
mark (an outside call keeps the normal retries, SO04); for a link to the Identity tile, base
`OIDC_ISSUER` (already in the guarded tile's environment; QG06 adds it to a stub tile that links
the Identity) **with** the mark (a provisioned service is waited out). **Depends:** QG06.
**Files.** `module-clients.ts.template` (an `externalTarget(base)` beside `httpTarget`, no mark;
`httpTarget` unchanged), `src/v2/client-wiring.ts` (the `identity` and `external-api` branches:
emit the targets instead of `unavailable`; the Identity branch keeps `unavailable` only when the
design has no Identity binding), `src/v2/local.ts` (Compose `environment`: nothing for an External
API locally — the value is the application's, through `compose.override.yaml`, so startup fails
`Invalid endpoint JEEVES_EXTERNAL_<ID>_URL` until it is set; `OIDC_ISSUER` for a stub tile linking
the Identity), `tile-processes.ts` (report: `stores[].provisioned` text for both),
tests `client-wiring.test.ts`, `module-clients.test.ts`, docs (`jeeves-generator/README.md`
Provisioning for stubs table; `docs/studio.md`; `docs/template-gaps.md`: GS09's "no installed
external-API client" row, if present, becomes Fixed). **Invariants.** A stub with no such link is
unchanged; the `unavailable` proxy stays for CDN tiles and for an application tile that runs no
process; `request(path, init)` passes `init` through so a stub can bound a call with
`AbortSignal.timeout`; no credential is read by the client (the stub adds its own header from a
`SECRET_DIR` file). **Emitted output.** `src/runtime/module-clients.ts`, the linking process files,
`compose.yaml`, `README.md`, `.jeeves/report.json`; pinned paths: none expected (processes off);
if `processes-off.test.ts` fails, Rule 7. **Offline tests.** The probe fixture's `front.ts` has
`externalTarget(...)` for `provider` and the marked target for `identity` instead of
`unavailable`; `externalTarget` does not set the mark on a rejected `fetch`; startup with the
variable unset fails naming it. **Required regressions:** check, e2e, build; `--suite=wiring`.
**Regeneration proof:** shared; in `after-probe`, `…/front-probe/provider` with
`JEEVES_EXTERNAL_PROVIDER_URL` pointing at a loopback server answers that server's status instead
of 501. **Commit:** `QG20: External API and Identity tiles give stubs a configured HTTP client`.

## 7. Checks

| Check | Result |
| --- | --- |
| Both HEADs as expected | qrwty `e88dcb8`, jeeves `59bfbc6` |
| No Jeeves file written | `git status` in Jeeves lists only the owner's two mode changes, `.jeeves-feedback/` and `Zone.Identifier` paths before and after |
| Probes in scratch only | `/tmp/claude-1000/…/scratchpad/q03r/` (export, probe script, inventories), outside both repositories; the export and the password file deleted before the commit; the probe outputs are quoted in section 2 |
| Docker | one container `q03r-pg` created and removed with `-v` by name; containers, images, volumes and networks equal before and after; no pull (the pinned digest was cached); `jeeves-postgres-1` untouched |
| No credential-shaped string | the probe password was generated at run time, kept in a mode-600 scratch file, never printed, deleted |
| Writes | this file and one handoff entry only |

## Not run

The full Compose stack (Q03's steps 7–16): G08 was confirmed from the emitted edge configuration
and Q03's recorded HTTP probe rather than a second stack run; the broker, cache and drain probes
were not repeated (their outputs are consistent with the code and with BR/PF07's recorded
behaviour). Pub/Sub probes were not repeated. No Jeeves suite (no Jeeves change).

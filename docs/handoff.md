# QRWTY handoff

Append new entries; do not rewrite earlier work or its evidence.

## 2026-11-13 — Plan: production QRWTY and a controlled Jeeves comparison

**Changed.** Added a phased plan with 19 assisted units (Q00–Q18), 14 independent baseline units
(B00–B13), product/API/data invariants, installed-generation audit, 11 capability probes, cloud
strategy, traffic/SLO/recovery gates, a Liquid Glass UI brief and a source/effort comparison
protocol. Added QRWTY agent instructions, four editable Excalidraw explanations with SVG/PNG,
pending metric status and the requested diagram/count-table section in the root README. The
owner's existing README text and research are preserved. No app, saved Jeeves project, baseline
repo, cloud resource or deployment was created.

**Checks.** Four native scenes rendered, reopened and dragged by mouse in Excalidraw at 1600×1200;
no page errors. All four renders visually inspected, with the cloud arrow layout corrected.
JSON/SVG parsing, local-link targets, owner README byte-prefix preservation, artifact hashes and
Git whitespace checks passed. [Verification](evidence/planning/checks.md) and
[diagram hashes](evidence/planning/diagram-validation.json). Application suites do not exist in
QRWTY yet; no Jeeves code changed, so its concurrent regression suites were not taken over.

**Findings.** Jeeves stubs already support status/headers for a 302. Stub DB clients expose pooled
query/execute without a transaction seam; local provider bindings and fixed identity audience
need cloud probes. Current documented counter receipt retention and local throughput evidence do
not prove large-service analytics. Redirect is deliberately independent of broker/identity;
lossless analytics versus available redirects is an owner decision. Precise planner model/token
usage was unavailable and is recorded as missing rather than invented.

**Next.** Review the six owner questions in the plan, assign Q00, then Q01 after the current
Jeeves units permit a safe authoring window. The saved Jeeves diagram is explicitly still pending.
Keep actual template availability, product completion and cloud reliability evidence separate.
All changes belong to QRWTY; the concurrent Jeeves working tree and QRWTY `.docs/` were untouched.

## 2026-11-13 — Plan revision 2: GCP, durable clicks and individual billing

**Decisions.** Incorporated the owner's follow-up: GCP preferred, no residency restriction,
indefinite guest links, every click durably recorded, individual free/paid accounts, no custom
domains, controlled same-stack/model comparison. Budget, exact model/configuration and paid
price/limits are still open. Revision 1's optional capture and deferred billing are superseded;
its evidence and this earlier handoff remain historical records.

**Changed.** Updated both build plans, product/acceptance/UI contracts, root README and agent
guidance. Added detailed durable-click and billing contracts, GCP deployment strategy and sourced
budget options/rate formulas. Added Q10a/Q10b and B07a/B07b: now 21 A units and 16 B units. G12
probes native Pub/Sub and worker hosting; G13 probes original raw webhook bytes. Reworked the
overview/failure/cloud drawings, confirmed guest permanence and added billing lifecycle: five
editable Excalidraw scenes, each with SVG/PNG. App LOC and model usage remain unmeasured/null.

**Consequences.** An eligible GET waits for durable publication before 302; unknown/unavailable
ACK means 503 without Location. Identity/Stripe and downstream analytics remain separate
dependencies. Recorded attempts are not proof of client/destination delivery. Archive, replay,
retention alarms and recovery are mandatory; a missing accepted event is an incident. Regional
multi-zone durability is distinct from zero-loss whole-region disaster protection. Raw retention
is proposed at 31 days; Q00 must freeze it. Thirty-five days of per-event dedup at L1 is about
12.1 billion rows, so the small launch database is not claimed sufficient for that tier.

**Cost finding.** Representative always-on Fargate compute is cheaper than Cloud Run HTTP
instance billing at the cited rates; Cloud Run worker-pool rates match that Fargate example.
No total-cost AWS advantage was demonstrated. Recommend GCP and staged spending: private
development $100–$250/month; low-traffic regional HA launch $600–$1,500; warm second region
$1,500–$3,500. These are single-environment engineering allowances, not vendor quotes, capacity
proof or authorization. Billion-scale traffic and both arms' live hours are priced separately.

**Checks.** Five scenes rendered and visually inspected; archive-label/cloud-arrow issues fixed.
All five reopened and dragged by mouse at 1600×1200 without page errors. Markdown targets/anchors,
JSON/Excalidraw/SVG parsing, 15 artifact hashes, 21/16 unique unit sequences, 62 acceptance IDs,
historical evidence preservation and original owner README prefix checked. Decimal rate results
match the cost tables; `git diff --check` passed. [Verification](evidence/plan-revision-2/checks.md),
[document results](evidence/plan-revision-2/document-validation.json),
[diagram results](evidence/plan-revision-2/diagram-validation.json). No application suites exist;
no Jeeves code changed. Temporary renderer stopped after checks.

**Next.** Q00 can freeze the remaining neutral contract choices; Q01 follows in a safe Jeeves
authoring window. No generated app, saved Jeeves project, independent repo or cloud resources
were created in this unit. Do not re-ask the confirmed decisions. Actual cloud/model spending
still needs its concrete capped plan; paid-tier limits and live price IDs must be explicit before
activation. Preserve `.docs/` and all concurrent Jeeves work.

## 2026-11-13 — Plan revision 3: local build with cloud deployment prepared

**Decision.** Owner does not want to spend money on this yet, but wants a project that can later
deploy/scale through cloud configuration. Current additional cloud/service budget is $0. Do not
ask for a hosting cap now or provision trials/free-tier resources on an assumed exception.

**Changed.** Added the local-to-cloud contract: production containers and real GCP adapters now,
validated environment/secret bindings, external state and multi-copy correctness, offline IaC,
migrations, release/rollback tooling and a same-artifact local deployment rehearsal. Updated both
plans so Q04/B02 are local preparation; new Q12a/B08a defer real managed-service probes until
cloud activation. Q05/local product/UI work no longer depends on paid proof. Added R01–R06 shared
preparation gates, updated README/agent guidance/status/cost references and preserved real cloud
release criteria. There are now 22 assisted units, 17 baseline units and 68 acceptance IDs.

**Boundary.** A locally passing Pub/Sub emulator or signed provider fixture cannot prove real
managed durability/IAM/archive/failover. Those checks remain not run; missing cloud access is not
a reason to block local implementation. Production adapters must be implemented and production
configuration must reject fake/emulator/insecure settings. Later source fixes are recorded and
charged honestly, not called configuration or moved into the original baseline. Billion-scale
analytics may require measured architecture work beyond replica settings.

**Checks.** Local links/anchors, JSON/Excalidraw/SVG parsing, 15 unchanged diagram hashes, ordered
22/17 unit inventories, 68 acceptance IDs, original README prefix, previous handoff/evidence
preservation, $0/pending measurement status and `git diff --check` passed.
[Verification](evidence/plan-revision-3/checks.md) and
[results](evidence/plan-revision-3/document-validation.json). Diagram assets were unchanged, so
their earlier browser/mouse evidence remains applicable. No app/Jeeves code changed; no runtime
suite, local release rehearsal, provider probe or cloud apply was claimed to run in this unit.

**Next.** Q00 freezes remaining neutral execution/local-policy inputs, then Q01 saves the actual
Jeeves design in a safe authoring window. Both apps and their deployment packs can be built
locally under the plan before cloud activation. No new app/cloud resources or charges in this
planning unit. Owner `.docs/`, old handoffs/evidence and concurrent Jeeves work are preserved.

## 2026-11-13 — Sequential coordinator prompt and readiness check

**Request and result.** Owner asked for a detailed prompt for the agent that will execute the
build through fresh sequential subagents, conditional on readiness. Saved the
[coordinator prompt](plans/production-build/coordinator-prompt.md) and
[readiness check](plans/production-build/readiness.md), linked from the plan and root README.
The prompt is prepared for a later owner launch; no coordinator/subagent/build unit was started.

**Readiness.** Q00 and neutral/local preparation can start. During inspection Jeeves advanced
from `29458cf` to `c51e1a1` (new UF01–UF06 planning commit), while AGENTS/PLAN still named SO01–SO03
and runtime/template/test paths were dirty. A stable committed authoring/export window remains
required before Q01/Q02. The prompt requires reinspection, preserves other coordinators' work and
allows eligible independent B work after Q00. G01–G13 still require an actual capability audit;
the later Q11 visual selection and $0 cloud boundary remain real gates.

**Prompt controls.** One fresh child at a time with no inherited conversation; scoped task/return
packets; no recursive delegation; matched review/repair rules; neutral-pack isolation for B;
resumable coordinator state; all-attempt prompt/model/usage accounting; immutable generated
baseline and separate backend/UI/support counts. Local default fixtures can be recorded without
inventing live prices or a known model identity. The local milestone is separate from the final
deployment/maintenance comparison. Required template fixes remain separately assigned Jeeves
units after the active work releases the checkout.

**Checks.** Local Markdown targets/anchors, JSON/scene/SVG parsing, 15 unchanged diagram hashes,
22/17 unit sequences, 68 acceptance IDs, ten coordinator sections, original README prefix,
append-only handoff and historical evidence preservation, seven unchanged core unit/product
contracts and `git diff --check` passed. [Evidence](evidence/coordinator-prompt/checks.md) and
[results](evidence/coordinator-prompt/document-validation.json). No application/Jeeves test suite
was run for this documentation-only unit; no Jeeves source or diagram asset changed.

**Next.** Give the saved prompt to the execution coordinator. It starts Q00 and proceeds through
eligible local work; it must not copy its whole A/Jeeves-aware context to baseline workers.
No cloud spending, app creation or measurement result was implied by preparing this prompt.

## 2026-11-13 — Coordinator: owner decisions before Q00

**What changed.** Before the run began, the owner gave the coordinator decisions that amend the
plan. They are recorded in [owner-decisions-2026-11-13.md](plans/production-build/owner-decisions-2026-11-13.md):
cloud within the GCP free trial (project, billing and gcloud credentials checked), Cloudflare free
plan on `qrwty.io` (token verified, zone active), Stripe test mode (`livemode=false` checked),
secrets only in `~/.config/qrwty/`, both UI directions built as switchable skins with a labelled
reviewer default, Fable xhigh reviews that may add units, and the coordinator pushing accepted
units. `AGENTS.md`, `units.md`, `baseline-units.md` and `coordinator-prompt.md` point at the file;
their earlier text is kept.
**Checks.** None (docs only). No secret value was printed or written.
**Next.** Q00 freezes the experiment, including this file in the neutral pack.

## 2026-11-14 (UTC) — Q00: freeze the QRWTY experiment contract

**Changed.** [Neutral pack v1](benchmarks/neutral-pack/v1/README.md): 37 files, manifest SHA-256
`834ff75206531b1742a0677f2b8aadfa7848a4aedada6c354bdbbe4e04765736`. It holds copies of the eight
shared contracts, the owner decisions, B's unit plan and the five diagrams, byte-identical to
`0e2e1f2`, plus new frozen documents: [decisions](benchmarks/neutral-pack/v1/frozen/decisions.md)
(test assumptions, quota and price fixtures marked not approved pricing, us-central1 and
providers, toolchain pins, model and review policy, sign-off points, release labels, and a
register of sentences the owner decisions superseded), the external HTTP/event contract, a
black-box acceptance specification per ID with the test control interface each arm provides,
the oracle plan (proposed shared unit N01), the source-count method and the B execution brief.
[Run ledger](benchmarks/runs/qrwty-r1-20261114/README.md): schema, `ledger.py` (validate,
self-test, start-attempt, update, import-usage), a seeded shared ledger and an empty A ledger;
B's ledger is created by B00 inside `qrwty-baseline`. Also updated: `status.json`, the root
README status lines and five false sentences in the plan README (status line, cloud paragraph,
D12, D13, steering).

**Checks.** `bash docs/evidence/q00/run_checks.sh`: 11 of 11 pass (pack hashes and allowlist,
26 copies equal to Git origin, `sha256sum -c`, tamper tests, ledger validation, 28 self-test
rejections, end-to-end workflow through `transcript-usage.py`, JSON, links, whitespace, no runtime
change). [Evidence](evidence/q00/checks.md).

**Notes.** Toolchain compatibility with the current Jeeves generator is unverified (Q00 may read
one Jeeves file): the pins match earlier generated QRWTY output, and Q01/Q02 must record the
generator's emitted pins; if they differ, the coordinator issues pack v1.1 before B02. Q00 chose
Web Risk for reputation, the API details (error codes, headers, routes such as `DELETE
/api/v1/me` and operator routes, the `QRWTY-Click-Event` header), session lifetime, abuse and
billing retention, `filter-v1`, and Q11 design assets as shared cost. Open before B08a: B's cloud
project or prefix, and B's hostname under `qrwty.io`. Known asymmetry: `comparison.md`, which
holds the withheld maintenance challenge, is readable in A's repository. Q00 usage is pending
the coordinator's extraction (ledger `shared-0007`); `commits.after` is the coordinator's to fill.

**Next.** Q01 when a safe Jeeves window exists, otherwise B00. Queue N01 (neutral oracle) before
any acceptance row is reported passed.

## 2026-11-14 (UTC) — Q01: save the QRWTY Jeeves architecture

**Changed.** New studio project **QRWTY · production candidate v1**
(`d1e59607-0616-418d-83d5-4cfe5bcb4b11`, revision 83) in the owner's `jeeves` database, created by
mouse; tiles, links and modules sent through the canvas's command path (`buildSupportedAuthoringCommand`
→ `POST /operations`); Sign-in settings, Runnable processes, line labels and every export by
mouse. Two actions (Open link; Create, manage & pay), 16 tiles, 27 links, 14 modules, as in
architecture.md's inventory. No Jeeves file changed; no other project changed. Evidence:
[q01 checks](evidence/q01/checks.md), artifacts and provenance in `evidence/q01/jeeves/`.

**Generation.** 3 Generated (Sign-in, `verified-identity`: Link API Optional, Account API Required,
Billing API Optional), 0 Building block, 11 You write it (10 Custom, 1 Data access), 0 Refused.
Preview: experimental-partial, 0 findings, 11 required custom gaps, six runnable processes; public
edge = Session API, Billing API, Redirect service. Redirect service has no identity link and its
handler holds Links (read), Hot routes and Click events (publish).

**Checks.** Studio loads; the owner's TinyURL study project renders (11 tiles, 11 lines); the
project reloads; all 18 tiles/actions' Connections and all 27 lines checked by mouse (0 failures);
14 module pages; source JSON = `GET /design` = preview source (canonical SHA-256 `a3c978d1…753b`);
re-export after reload byte-identical; `sha256sum -c SHA256SUMS` passes.

**Differences.** One action per lane and one entry per tile, so Session API's single entry is in
the upload lane; multi-dependency handlers are Custom (a stub only gets its own slots' clients);
Click events stays a RabbitMQ work queue (mode and provider have no control); artifacts live in
`evidence/q01/jeeves/` under Jeeves's file names, not `docs/architecture/jeeves/`; blueprint v2
refuses the design, v3 is saved.

**For Q03.** F1–F10 in the checks: Pub/Sub absent (G12), no raw request body (G13), whole public
tiles incl. Billing API's internal Entitlements (G08), no in-tile composition of stubs (G04/G10),
no topic mode control, Session API gets no OIDC config (G03/G10), no scheduled trigger (G11),
event counter and positive cache read unsuitable (G07/G05).

**Toolchain.** The generator emits Node **24.21.0** (`engines`, `node:24.21.0-bookworm-slim`),
pnpm 12.16.1, TypeScript 7.0.2, `@types/node` 24.19.2, and no Vitest, Biome or Playwright. Pack v1
pins Node 24.22.2 on Alpine: the coordinator decides pack v1.1 before B02. The pack is unchanged.
`ledger.py validate` reports one error outside this unit: `shared-0006` evidence hash mismatch for
the coordinator's `docs/coordinator/state.md`.

**Next.** Q02 (freeze the as-found export and publish the saved diagram).

## 2026-11-14 (UTC) — Q02: freeze the as-found QRWTY export

**Changed.** [Q02 evidence](evidence/q02/checks.md): the untouched studio export of **QRWTY ·
production candidate v1** (revision 83) as a content-addressed ZIP
(`artifact/sha256-dcaff3aa…a3cd14.zip`, 84 files, manifest `c1868eab…b9632`), a per-file
[payload manifest](evidence/q02/payload-manifest.json), the commands as run, logs, records and a
[scope inventory](evidence/q02/scope-inventory.md). Root README: the actual Simple Jeeves image
and links to its source, report, provenance and the export; the Excalidraw overview is labelled
explanatory. No Jeeves file or project changed; no stub, hook or SQL was written.

**Checks.** M01 at the as-found scope: pass (design `a3c978d1…`, registry, runtime, templates and
manifest equal Q01 and the preview; 163 generator sources equal Jeeves HEAD `59bfbc6`). Studio
(by mouse) and CLI payloads: identical, 84 paths, 3,805,071 bytes. Build of both copies outside
Jeeves: `pnpm install --frozen-lockfile --ignore-scripts --offline` (0 downloaded) and `pnpm build`
pass, identical `dist/`. Round trip: reopened by mouse; source JSON, Detailed and Simple PNGs,
preview body and ZIP byte-identical to Q01's. `sha256sum -c SHA256SUMS` passes.

**Classification.** Runtime (generated): six processes, edge, Postgres/Valkey/RabbitMQ/Keycloak,
setup, store clients, Sign-in ×3. `first-run` (own Compose project, removed after) started all 12
services healthy; every stub route answered 501 and the worker dead-lettered a probe message:
healthy but incomplete. You write it: 11 stub bodies and 8 product SQL files, 0 hook files.

**For Q03.** F1–F10 confirmed where the export shows them; new F11 short-link path only under
`/api/redirect-service/modules/…` (G08), F12 Stripe/Reputation/Identity are `unavailable` to
stubs (G10/G03), F13 fixed local hosts, no TLS/IAM (G01), F14 root container (G09), F15 unused
ffmpeg/media stages, four unimported dependencies and two unreached `src/features` files.

**Notes.** A byte-equal CLI export needs the canonical source bytes; the pretty "Download source
JSON" changes `.jeeves/inputs/design.json` and the manifest's input hash. BuildKit cache layers
from the image build remain (no prune). Not run: valid-token request, drain, faults. Ledger
attempt `a-0154` started; usage and `commits.after` are the coordinator's.

**Next.** Q03 (audit generic gaps and commission exact fixes).

## 2026-11-14 (UTC) — N01: build the neutral acceptance oracle (pack v1.1)

Shared ledger, attempt 1 (`shared-0081`), implementer with no arm context. Read only the v1 pack, the
run ledger README, `AGENTS.md` and public documentation and registries.

- **Pack v1.1** at `docs/benchmarks/neutral-pack/v1.1/`: a copy of v1 (34 files byte-identical) plus
  `oracle/` and `evidence/n01/`; 151 files. **Manifest SHA-256
  `5ffae9f2627b61db5445859cbc97c491c3bf83e165029e97f8c26139f53edf6a`** (v1 stays
  `834ff752…5736`, unchanged). Three files amended: `frozen/decisions.md` (the coordinator's Node
  amendment: 24.21.0 and `node:24.21.0-bookworm-slim`, digest `sha256:d6aa754f…7b20`, new §11),
  `README.md` (v1.1) and `verify_pack.py` (ignores an installed `oracle/node_modules/`; anchor
  checks for every `authored-*` file). `status.json` pack fields now name v1.1.
- **Oracle**: TypeScript on Node 24.21.0, run without a build step. Components: byte-exact HTTP
  client (no redirect following, OIDC form sign-in, CSRF and idempotency helpers), capture proxy,
  Pub/Sub capture (`@google-cloud/pubsub` 6.3.2), Toxiproxy 2.13.0 driver (own code), stateful
  Stripe fixture (works with the official SDK) and webhook signer, Web Risk fixture, Playwright
  browser driver (destinations never fetched) with jsQR 1.4.0 / pngjs 7.0.0, clock and command
  runner, result writer. 47 row modules (A01–A24, F01–F10, R01–R06, U02–U08), the adapter schema,
  the UI-name schema, and `oracle/README.md` (adapter fields, command and `inspect` contracts,
  result format, contract readings).
- **Checks**: `pnpm check` exit 0 (Biome, tsc, 39 unit tests); integration tests 3/3 against the
  pinned emulator, Toxiproxy and Chromium; full self-test 48/48 cases matched, **31/31 deliberate
  faults reported failed**; fresh-copy install with `--frozen-lockfile` and `pnpm check` pass;
  `verify_pack.py` OK (also `--against-git .`, 26 copies), `sha256sum -c SHA256SUMS` OK, v1 verify OK
  and untouched; all 219 locked packages are at least 14 days old (newest 2026-10-29). Evidence:
  `docs/benchmarks/neutral-pack/v1.1/evidence/n01/`. Docker: `n01-selftest-pubsub` and
  `n01-selftest-toxiproxy` (host network) and their two images were removed by name.
- **Live-arm rows** (implemented, not self-tested): A11–A13, A15, A19, A21–A23, F01, F02, F04–F10,
  R01–R06, U02–U08. A01's flow and U02–U08 stay `blocked` until the Q11 amendment freezes the
  accessible-name list (`--ui-names`).
- **For the coordinator** (`oracle/README.md`, "Contract readings"): the oracle accepts 404,
  403 or 409 for A06's foreign claim; a 503 for an uncertain publish must carry
  `QRWTY-Click-Event` to pass A24; free/paid is read from `policy`; F01 uses an extra fault point
  `corrupt-route-cache`; the edge credential header is `X-Oracle-Edge-Token`; `issueToken`,
  `subscriptionCheck`, `replayQuarantine` and `ordinaryBuildAndTest` are adapter commands the plan's
  list did not name. Any of these can change in a later pack version.
- **Next**: each arm adopts v1.1 (copy, verify, record the hash) before reporting an A, F, R or U row.

## 2026-11-14 (UTC) — Q03: audit generic gaps and commission exact fixes

Arm A, attempt 1 (ledger `a-0278`), from QRWTY `e1474dc` and Jeeves `59bfbc6`. No Jeeves file or
project changed.

**Changed.** [Capability audit](evidence/q03/capabilities.md): G01–G13 each with the inspected
code, the smallest reproduction, the existing seam, the remedy split into Jeeves / QRWTY /
deployment, and a decision; F1–F15 plus new F16–F26 classified; a decision table and the
dependency map. [jeeves-gaps.md](plans/production-build/jeeves-gaps.md): 16 ready-to-run Jeeves
unit briefs QG01–QG16 (goal, files, invariants, emitted output, offline tests, regressions,
regeneration proof, commit), in the store-outage plan's shape. Evidence (fixture design, its
application-owned probe bodies, commands as run, probe outputs, logs) in `evidence/q03/`.

**How.** A minimal probe design built in memory through the studio's command path, exported with
`export:v2`, given stub bodies and product SQL only, built and run under its own Compose project;
offline probes of the built runtime; `migrate.mjs` against two disposable PostgreSQL 17.11
containers; the pinned Pub/Sub SDK 6.3.2 against the pinned emulator 591.0.0.

**Key results.** Works already: 302/`Location`/custom headers, Optional sign-in, broker
reconnect, confirmed publish with dedup by message ID, product SQL functions atomic in one
`execute`. Gaps: no raw body (57 bytes in, 48 re-serialized); `BEGIN` through `execute` leaks an
`idle in transaction` connection; compiled endpoints (env ignored, `ENOTFOUND local-broker`); the
audience is compiled (`identity-web`); a non-superuser admin fails `must be able to SET ROLE`;
concurrent first migrations race on `CREATE ROLE`; a stalled cache holds a stub call to the 1.1 s
deadline and a drain to SIGKILL (exit 137); a dependency down at start fails startup for good;
root container; no Pub/Sub (default SDK publish still pending after 20 s with the service down);
External API/Identity `unavailable`; no way to add an npm package (Stripe SDK) without editing a
generated file; `Set-Cookie` arrays untyped.

**Decisions.** Local build needs QG01–QG10 (raw body and repeated headers; the Compose override as
a documented seam; application-owned dependency manifests; bounded stub cache; non-root image;
endpoints from the environment; Pub/Sub publisher, consumer and system tests; TLS and an
insecure-endpoint refusal for R01). Cloud only: QG11 (audience), QG12 (migration admin). Deferred:
QG13 transactions (product SQL functions suffice), QG14 scheduled trigger (authenticated scheduled
owner calls), QG15 per-route exposure (internal tile plus QRWTY's edge), QG16 startup with a lost
broker and a drain bound. Jeeves owner decisions needed first: QG03 (manifest ownership), QG06
(production-foundations D1), and minor ones for QG04 and QG07.

**Checks.** Every finding has a probe output or code reference; only `generated-extension` paths
and an un-manifested override file were written, in a scratch copy; Docker images, volumes,
networks and containers equal the before lists (the two probe PostgreSQL containers' anonymous
volumes and the emulator image removed by exact name); Jeeves `git status` unchanged; no secret
or credential-shaped string in the evidence; links resolve; `sha256sum -c SHA256SUMS` in
`evidence/q03/` passes.

**Notes.** The non-superuser migration probe imitates managed privileges; it is not Cloud SQL.
Emulator behaviour is not managed Pub/Sub durability or IAM (Q12a). If the coordinator amends the
billing contract to Stripe's documented `node:crypto` verifier and `fetch`, QG03 becomes
deferred. The Q01 inventory's Billing API Entitlements should move to an internal tile when Q05
resaves the diagram (G08). BuildKit cache layers from the probe image remain (no prune). Scratch
directory deleted. Ledger `a-0278` started; usage, end time and `commits.after` are the
coordinator's.

**Next.** The coordinator obtains the Jeeves owner's decisions and assigns QG units in Jeeves
(QG01–QG06 and QG12 are independent; QG06 → QG07 → QG08 → QG09 → QG10 is the critical path).
Q04 waits for QG04–QG10; no QRWTY unit is eligible until then except independent neutral work.

## 2026-11-14 (UTC) — Q03 review: audit of the generation capability report

Arm A, Q03-review, attempt 1, from QRWTY `e88dcb8` and Jeeves `59bfbc6`, by an agent that did not
implement Q03. **Passed with findings**; report in [evidence/q03/review.md](evidence/q03/review.md).

**Checked.** Every Jeeves line Q03 cites, against the source; re-ran G02 (`/tx`, `/fn`) on the
export's built `createPostgres` against a disposable PostgreSQL 17.11 (same results); confirmed
G07, G08 and G11 from the emitted code and edge configuration; ran two probes Q03 did not: a
**stalled** PostgreSQL (a query on the generated pool options is still pending after 12 s and
`pool.end()` after 5 s; pg's `query_timeout` bounds both at 2.5 s) and QG12's non-superuser path
(`REVOKE ALL ON DATABASE … FROM PUBLIC` and `GRANT CONNECT` are only warnings for a non-owner
admin, so PUBLIC keeps CONNECT; as the owner they take effect).

**Findings.** Medium: QG12 as written leaves databases open to PUBLIC in cloud (amend: run the
database-level grants as the owner); a stalled database has no bound and no product seam (new unit
QG17); QG06 keeps `createValkeyCache`'s leading-letter host check, which QG04's stub cache would
then apply to a cache IP (amend QG06). Low: F12's remedy pushes a small generic client seam onto
product `fetch` adapters (QG20, owner); `Query read timeout` is not in SO01's unreachable list
(QG18, owner); the admission's 503s carry no `Retry-After` (QG19); F22 is a Jeeves limit, not
product policy; QG10 should depend on QG04; QG07's pins decision is settled by precedent. Owner
decisions QG03, QG04 and QG06 are real. Safe to assign now: QG01, QG02, QG05, QG11; QG12 only after
its amendment; the rest in Q03's order after their decisions.

**Proposed units.** Q03b (apply the amendments to jeeves-gaps.md, ready), QG17 (ready), QG18
(owner), QG19 (ready), QG20 (owner); exact briefs in the report.

**Evidence and cleanup.** Scratch only; container `q03r-pg` removed by name with its volume;
Docker inventory equal before and after; no Jeeves file or project changed; no secret printed.
Writes: the report and this entry.

## 2026-11-14 (UTC) — Q03b: apply the capability review's amendments to the Jeeves gap briefs

Arm A, Q03b, attempt 1 (ledger `a-0447`, role repair), from QRWTY `c2a2339`. Jeeves `59bfbc6` was
read only, to confirm `migrate.mjs` lines 41 and 46, `valkey.ts.template` line 17 and the pins of
`src/runtime/valkey.ts`. No Jeeves file or project changed.

**Changed.** [jeeves-gaps.md](plans/production-build/jeeves-gaps.md) only. **R1**, QG12: a new
step 3 runs the database-level `REVOKE … FROM PUBLIC` and `GRANT CONNECT` as the owner (`SET ROLE`
… `RESET ROLE`), old step 3 is now 4, plus the ACL invariant, the offline test of the `SET ROLE`
lines and the Docker proof's ACL assertion. **R3**, QG06: `createValkeyCache`'s check becomes QG06's
host rule; `valkey.ts.template` added to Files, and `src/runtime/valkey.ts` to Emitted output (it
is pinned in frozen-v2 and v2-module-design). **R8**, QG10: Depends is QG04, QG06, QG07; the shared
"Not in this plan" table gains RabbitMQ TLS. **R9**, decision 4 (QG07's pins) is a note; QG07 is
not split (the review calls the split optional). QG17–QG20 appended byte for byte from review §6;
QG18 and QG20 are owner decisions 6 and 7. The Order table gains the four rows and an "Assign
now?" column from review §5. The readings this needed are in the file's "Q03b notes".

**Checks.** Briefs that the review doesn't name (QG01–QG05, QG08, QG09, QG11, QG13–QG16) and QG07's
brief are byte-identical to `c2a2339` (a per-section comparison of HEAD and the working tree);
QG17–QG20 equal review lines 252–357; `git diff --check` clean; the file's six links resolve;
ledger `validate` OK.

**Notes.** R7: F22 (the generated edge rewrites `Host` and passes `X-Forwarded-For`) is a Jeeves
limit (J), not product policy; `capabilities.md` keeps Q03's Q, and the coordinator should record it
as J when copying the briefs (with R11's citations). Where the Order table and `capabilities.md` §5
now differ: §5 puts QG09 before Q04, but the table puts it before Q05 and not before Q04's start
(review §3.4, §5); §5 has no QG17–QG20, but the table puts QG17 before Q04 and QG20 before Q07/Q09
if confirmed; §5's owner decisions are QG03, QG06 and QG16, but the table also marks QG14, QG15,
QG18 and QG20, QG04 as minor, and QG07 no longer. Two differences predate Q03b: §5 says Q06 needs
QG01's types, and Q13 needs QG11, but the table lists neither. The packet's commit name replaces
the review's suggested `Q03b: amend the QG briefs from the review`.

**Next.** The coordinator asks the Jeeves owner for decisions 1–3, 6 and 7. QG01, QG02, QG05,
QG11, QG12, QG17 and QG19 can be assigned now.

## N02: ledger evidence may cite a committed version (pack v1.2), 2026-11-14

- **Changed.** Ledger rule R12 (`ledger.py`): a recorded `{path, sha256}` now passes when the
  working-tree file **or** any committed version of that path in `HEAD`'s Git history has the hash
  (`git log --format=%H -- <path>`, then `git show <commit>:./<path>`; read only on a working-tree
  mismatch and cached per path for one validation run). A hash that no version has is still an
  error, a missing file is still a warning, and outside a Git checkout only the working-tree file
  counts. `validate` lists each record accepted through a committed version. Reason: living
  evidence such as `docs/handoff.md` failed R12 on the next append, and the writers then refused
  every new line. Pack **v1.2** (`docs/benchmarks/neutral-pack/v1.2/`, manifest SHA-256
  `5414d6ef8bbb43834c4f1ff45e8cff0f2903ccf284aaf6098fa4af820f26054b`) is v1.1 with only
  `ledger/ledger.py`, `ledger/README.md` (new "Rule changes" section), `frozen/decisions.md` (§11
  v1.2 row) and the pack README changed. This run's `ledger.py` and `README.md` are the v1.2
  copies, `status.json` points at v1.2, and both arms received the same files.
- **Checked.** `ledger.py self-test`: the base ledger and all 28 existing rejection cases keep
  their results; four new R12 cases pass (living file appended after recording accepted, forged
  hash rejected, missing file warns, same appended file outside a Git checkout rejected). With the
  history lookup disabled, the living-file case fails, so the case really exercises the new path.
  `ledger.py validate` passes on this run. `verify_pack.py` passes for v1.2 (also with
  `--against-git .`: 26 copies), v1 and v1.1 are unchanged and still verify. `git diff --check`
  is clean.
- **Next.** The oracle is byte-identical, so its results still report pack `v1.1` (decisions
  §11 explains this). The v1.2 manifest was built by a v1.2 adaptation of N01's
  `build_manifest.py` (same algorithm with v1.1 as the base; it refuses new files and changes
  outside those four files). The adaptation is not part of the pack: `verify_pack.py` is the check.
  The ledger now needs the `git` CLI for R12's history check. `commits.after` of `shared-0248` is
  left to the coordinator.

## 2026-11-14 — Coordinator: history rewrite to clear GitHub push protection

The owner chose to rewrite the 31 unpushed commits. Five made-up Stripe-key-shaped test literals
in four oracle files of packs v1.1 and v1.2 are now string concatenations (same runtime values).
The old-to-new commit map, the reason and the consequences are in
[docs/coordinator/history-rewrite-2026-11-14.md](coordinator/history-rewrite-2026-11-14.md). Those
four files no longer match the v1.1/v1.2 manifests; pack v1.3 (N03) supersedes both. The
pre-rewrite history is kept locally at `refs/backup/pre-rewrite-20261114`.
**Checks.** A scan of every commit being pushed found no credential-shaped string; ledger validate OK.

## N03: pack v1.3 (clean oracle literals, A06 cookie fix), 2026-11-14

- **Changed.** Pack **v1.3** (`docs/benchmarks/neutral-pack/v1.3/`, manifest SHA-256
  `81f04065337a5eb964010c1f6fc3f1cec124ddbca9ab2b7a91ceefb985fb7401`, 163 files) is a
  self-contained copy of v1.2 with two changes. (a) The four oracle files that the history rewrite
  changed (`oracle/selftest/double.ts`, `oracle/src/fixtures/stripe-signer.ts`,
  `oracle/test/stripe.test.ts`, `oracle/test/observe.test.ts`) are carried as v1.2's working tree
  has them, and the regenerated manifest verifies every file. (b) A06's check "invalid session
  cookie on create" now sends a present but invalid cookie. The bug: the revoked-session actor got
  the original jar by reference (`stale.client.jar = revokedJar`) and the garbage actor read its
  cookie names from that jar afterwards, so an arm that clears the revoked cookie in its 401 left
  the garbage create cookieless (`cookieNames: []`). Now the names are read once after sign-in, the
  revoked actor gets `revokedJar.clone()`, the garbage actor has its own jar with every name set to
  `oracle-invalid-session-value` and gets the CSRF token directly (its only request), and the check
  fails when no name was sent. New self-test case `A06-unknown-cookie` (double mode
  `a06-unknown-cookie-guest`: refuses and clears a revoked cookie, answers a cookieless mutation
  401, turns a never-issued session ID into a guest 201) must be `failed`. The oracle build is
  `1.3.0` and results report pack `v1.3` (v1.2's rule: the label names the oracle build).
  `frozen/decisions.md` §11 has the v1.3 row; the pack README's "Changes from v1.2" table says
  v1.1 and v1.2 are superseded because these four files no longer verify; `evidence/n03/` holds the
  proof, the check outputs, the credential scan and `build_manifest.py`. `status.json` points at
  v1.3. qrwty-baseline `6e349f4` adds `docs/neutral-pack/v1.3/` (no `node_modules`). The ledger
  tools are byte-identical to v1.2, so neither arm's run copy changes.
- **Checked.** Proof of the fix: with v1.2's `A06.ts` in a scratch copy of the v1.3 oracle,
  `A06-unknown-cookie` is reported `passed` (MISMATCH, `cookieNames: []`, 401 `unauthenticated`);
  with v1.3's it is `failed` (`cookieNames: ["qs"]`, guest 201), and A06-good, A06-foreign and
  A06-guest keep their results both times. Full self-test (Pub/Sub emulator, Toxiproxy, Chromium):
  49/49 cases matched, 32/32 faults detected; the 48 v1.2 cases keep their expected results.
  `pnpm check` (Biome, TypeScript, 39 unit tests) and `pnpm test:integration` (3) pass, also
  `pnpm install --frozen-lockfile` and `pnpm check` in a fresh copy without `node_modules`.
  `verify_pack.py` passes for v1.3 here (also `--against-git .`: 26 copies), in a fresh copy and in
  qrwty-baseline. v1, v1.1 and v1.2 are unchanged against `HEAD` (v1 verifies; v1.1 and v1.2
  report the same eight errors on the four rewritten files as before). A credential-shape scan of
  v1.3 (the ledger's R15 patterns plus Stripe test publishable keys, GitHub fine-grained, AWS, npm
  and JWT shapes) finds nothing; `git diff --check` is clean in both repositories.
- **Next.** An arm that recorded A06 with the v1.1 oracle reruns it from its v1.3 copy: those
  results never sent the garbage cookie. `commits.after` of `shared-0312` and both arms' adoption
  records are left to the coordinator. Read for this unit: packs v1 to v1.2, the rewrite note, the
  ledger README, `AGENTS.md`, this file's N02 entry and the coordinator entry after it (for the
  format), and the N01/N02 ledger records; no arm source, evidence, review or handoff and no Jeeves
  file. The session started with foreign Jeeves context (`AGENTS.md`, Git status, a memory index);
  it was ignored.

## N04: pack v1.4 (F01 clears per-process route caches, F06 fixed burst, monotonic timing), 2026-11-14

- **Changed.** Pack **v1.4** (`docs/benchmarks/neutral-pack/v1.4/`, manifest SHA-256
  `bdcb503c4ec8da066075b0bcd069695abcfc9437e33fa35330ad59ad19371495`, 178 files) is a
  self-contained copy of v1.3 with three oracle changes, recorded in `frozen/decisions.md` §11
  (v1.4 row and note) and the pack README's "Changes from v1.3".
  (a) **F01.** New fault point `clear-route-caches`, declared in the adapter's new optional
  `faultPoints` list (schema, `frozen/acceptance-oracle.md` §2, oracle README): with `state` `on`
  the replica named by `arg` drops every per-process route-cache entry, leaves the shared cache
  and the database alone, and a replica without one is a no-op success. F01 runs it on every
  replica of every service right after injecting each Valkey fault and before that fault's hot
  redirects; without the declaration F01 is `blocked` with "adapter has no clear-route-caches fault
  point". "No stampede" now allows at most max(2 × redirect replicas, 0.1 × hot requests) database
  queries per fault: v1.3's 2 per request grew with the traffic and passed the one-query-per-request
  fallback the new case models, so the bound had to change for that case to fail. (b) **F06.** The
  burst is max(2,000, declared queue bound + declared admission bound + 1) concurrent GETs; the
  admission bound is a new `admissionBound` field of `inspect publisherQueue` (`0` = no admission
  stage; F06 is `blocked` without it). Memory growth is measured above a baseline taken with the
  same number of connections held open and idle (the GETs are then sent on those connections),
  sampled during and after the burst; the limit stays 128 MiB (no frozen document states another);
  a 503 without `Location` passes from admission or the queue. (c) Self-test cases
  `F01-inprocess-stampede` and `F06-small-bound-unbounded-queue` (expected `failed`); the double's
  route-cache and publisher models are switched on only for F01 and F06 cases. (d) Every oracle
  duration and deadline uses `performance.now()`: `poll`, `watchSlug`/`lateOld`, adapter command
  `durationMs`, Stripe fixture `atMono`, rows A01, A07, A11, A13, A15, A16, A23, F01, F02, F03, F06,
  and the self-test's case durations; the list and what stays on the wall clock (arm-enforced
  times, recorded timestamps) are in `evidence/n04/README.md`. New unit test
  `oracle/test/timing.test.ts`. Oracle build `1.4.0`, results report pack `v1.4`. `status.json`
  points at v1.4; `.gitignore` gains `.scratch/`.
- **Checked.** Proof of the fixes: with v1.3's `F01.ts` and `F06.ts` in a scratch copy of
  the v1.4 oracle, both new cases are reported `passed` (MISMATCH: the warm per-process cache left
  0 stampede queries in every phase; the 12-GET burst grew memory by 131,072 bytes). With v1.4's
  code both are `failed`: one database query per hot request in all three Valkey phases, and
  253,149,184 bytes of growth against the 134,217,728 limit. Scratch controls (not pack cases):
  the double's `good` mode passes both rows (2 queries per phase; 3,530,752 bytes), and F01 against
  an adapter without the declaration is `blocked` with the frozen reason. Full self-test (Pub/Sub
  emulator, Toxiproxy, Chromium): 51/51 cases matched, 34/34 faults detected; the 49 v1.3 cases keep
  their expected results. `pnpm check` (Biome, TypeScript, 43 unit tests) and `pnpm
  test:integration` (3) pass, also `pnpm install --frozen-lockfile` and `pnpm check` in a fresh
  copy. The new timing test passes on v1.4, and its three cases fail against v1.3's wall-clock
  code. `verify_pack.py` passes for v1.4 here (also `--against-git .`: 26 copies) and in a fresh
  copy; `verify_pack.py` itself is byte-identical to v1.3's. v1 to v1.3 are unchanged against
  `HEAD` (v1 and v1.3 verify; v1.1 and v1.2 report the same eight errors as before). A
  credential-shape scan of the finished v1.4 (180 files, the ledger's R15 patterns plus five more)
  finds nothing; `git diff --check` is clean. Containers `n04-selftest-pubsub` and
  `n04-selftest-toxiproxy` were removed by name.
- **Next.** Each arm adds `"clear-route-caches"` to its adapter's `faultPoints`, implements it in
  its `faultPoint` command (`{arg}` = a replica name from `services`; drop that replica's
  per-process route cache, or do nothing, and print `{"ok": true}`), reports `admissionBound` per
  process in `inspect publisherQueue`, then reruns F01 and F06 from its v1.4 copy (earlier F01/F06
  results are superseded). Installing v1.4 in qrwty-baseline, both arms' adoption records and
  `commits.after` of `shared-0409` are left to the coordinator. The coordinator may want to
  confirm the tightened F01 stampede bound, which goes beyond the packet's wording but is needed for
  `F01-inprocess-stampede` to fail. Main advanced by three commits during the unit: `f436cfe` and
  `87243f5` (A ledger and prompts) and `074d9e8`, which adds owner decisions §9 to
  `docs/plans/production-build/owner-decisions-2026-11-13.md` (not read here). v1.4 carries v1.3's
  copy of that file (origin `0e2e1f2`); whether a later pack carries §9 is the coordinator's call.
  The pack's source commit stays `02a70a4`. Read for
  this unit: pack v1.3, the ledger README, the N04 packet and this file's N03 entry (for the
  format); no arm source, evidence, review or handoff and no Jeeves file. The session started with
  foreign Jeeves context (`AGENTS.md`, Git status, a memory index); it was ignored.

## S01: qrwty.io placeholder on Cloudflare, 2026-11-14

- **Changed.** New `deploy/cloudflare/`: Worker `qrwty-edge` in TypeScript (`src/router.ts`, a
  pure router; `src/index.ts`, the entry), `wrangler.toml` (Custom Domains `qrwty.io` and
  `www.qrwty.io`; workers.dev and preview URLs off), `package.json` with exact pins (`wrangler`
  4.156.0, published 2026-10-29; Biome 2.6.4, TypeScript 7.0.2, vitest 5.0.0), its own
  `pnpm-lock.yaml` and `pnpm-workspace.yaml` (14-day minimum release age), router unit tests,
  `deploy.sh`, `check-live.sh`, `scripts/scrub.mjs`, `scripts/check-health.mjs` and `README.md`.
  The page shows `QRWTY`, the packet's line and a build line (short commit, UTC time), with inline
  CSS and light and dark themes. `/healthz` returns `{"ok":true,"commit","builtAt"}`; `/build.json`
  returns the build object `{"commit","builtAt"}` (`/healthz` is that object plus `ok`). Other
  paths get a small HTML 404, `HEAD` is answered like `GET`, and other methods get 405.
  `www.qrwty.io` answers 301 to the apex with the same path and query. Every response carries the
  packet's four headers, no HSTS, and `no-transform` in `Cache-Control` (see findings).
  `deploy.sh` writes `.build/build.json` (gitignored). It refuses a dirty tree (tracked changes
  anywhere, or untracked files under `deploy/cloudflare`) unless given `--allow-dirty`, which
  deploys the commit as `<sha>-dirty`. It then installs from the lockfile, runs `wrangler deploy
  --var BUILD_COMMIT:… --var BUILT_AT:…` and polls `/healthz` until both values match. The root
  README gains one line. Evidence is in `docs/evidence/s01/`.
- **Cloudflare state.** `qrwty.io` was already a Workers Custom Domain of Worker `qrwty-platform`,
  an earlier landing page titled "Qrwty | Beautiful, Ownable QR Infrastructure". The zone held only
  that domain's managed `AAAA 100::` record, with no MX, TXT or CAA records. The packet authorizes
  replacing a blocking apex record, so the first deploy moved the hostname to `qrwty-edge`:
  `wrangler deploy` overrides without asking when there is no TTY. It also added `www.qrwty.io`.
  Cloudflare manages both `AAAA 100::` records and issued a certificate for both names. Neither the
  `qrwty-platform` Worker nor any zone setting changed. `docs/evidence/s01/rollback.md` restores
  the old state (not executed).
- **Checked.** `pnpm check`: Biome, TypeScript and 14/14 vitest tests pass, also in a fresh copy
  after `pnpm install --frozen-lockfile`. There were six deploys from the dirty tree; runs 2–3 and
  6 redeployed unchanged code. Around run 6 the DNS records, Custom Domains, routes and zone
  settings were identical before and after. A run without `--allow-dirty` refused before
  deploying. `check-live.sh` passed every check against run 6:
  - `/` returns 200 with the page and headers;
  - `/healthz` and `/build.json` report `0ace46d…-dirty` with the run's build time;
  - `/x` returns a 404;
  - `www.qrwty.io/x` returns 301 to `https://qrwty.io/x`, and the query is kept;
  - `openssl` verifies the certificate (Google Trust Services WE1) for both names.
  In headless Chromium, the light and dark pages each make one request and log nothing to the
  console. `git diff --check` is clean. A by-value secret scan and a credential-shape scan come up
  clean.
- **Findings.**
  1. **Web Analytics beacon.** For browser-like requests, Cloudflare's automatic Web Analytics
     injected a `static.cloudflareinsights.com` beacon `<script>` into the HTML. The CSP blocked
     it, and plain curl missed it. `no-transform` on every response stops the injection without
     any zone change, and `check-live.sh` now fetches HTML with browser headers.
  2. **Edge headers.** Cloudflare adds `nel`/`report-to` itself.
  3. **Plain HTTP.** `http://qrwty.io/` answers 200, because Always Use HTTPS is off; this
     belongs to Q13.
  4. **Local resolver.** This machine's WSL resolver cached `www`'s old NXDOMAIN, so
     `check-live.sh` falls back to DNS-over-HTTPS with `--resolve`, and says so.
  5. **Wrangler's debug log.** It wrote the account ID (in API URLs) to
     `~/.config/.wrangler/logs/` during runs 1–2. Those two files were scrubbed in place, and
     `deploy.sh` now keeps only a scrubbed log in `deploy/cloudflare/.wrangler/logs/`. The token
     was never written anywhere.
- **Differences from the packet.**
  1. **Ledger phase.** The packet's phase `deployment` isn't in the schema's enum, so the attempt
     (`shared-0538`) is recorded as `cloud`.
  2. **Dirty deploys.** These report `<sha>-dirty` rather than a bare SHA.
  3. **Additions.** `check-live.sh`, `HEAD`/405 handling and `no-transform` were added.
- **Next.** After this commit the worker ran `deploy.sh` from the clean tree, so that `/healthz`
  shows the S01 commit. That result is in the attempt's return and ledger update, because a
  commit can't hold its own hash.
  - **Later units:** commit, then run `deploy/cloudflare/deploy.sh`, then
    `deploy/cloudflare/check-live.sh <sha>`. A's Q12a/Q13 extend `src/router.ts` and this Worker.
    `deploy.sh` needs Node 22+ (it falls back to nvm's 24.21.0) and pnpm 12.16.1.
  - **Owner choices:** keep or turn off the zone's Web Analytics site; Always Use HTTPS and HSTS
    at Q13; keep or delete the now-unrouted `qrwty-platform` Worker.
  - **Read for this unit:** the packet, `AGENTS.md`, owner decisions §1, §2 and §10, the ledger
    README and this file's N04 entry. No arm source, nothing in qrwty-baseline and no Jeeves file
    was read.
  - **Foreign context:** the session started with foreign Jeeves context (`AGENTS.md`, Git
    status, a memory index); it was ignored.

## Q11: QRWTY visual direction, 2026-11-14

- **Scope.** The coordinator relayed the owner's scope change mid-unit: one direction instead of
  two. It is picked to fit the owner's own style; there is no skin switch, competitor review,
  Excalidraw flow sheet, reviewer's-default step or "three choices", and the commit is named
  `Q11: select QRWTY visual direction`. No second direction was started, so nothing was deleted.
  No web research was done.
- **Changed.** New `docs/design/`:
  - `README.md`: the review record. It has the rationale paragraph citing the style sources, the
    states, the decisions Q12/B08 should keep, the accessibility treatment and the limitations.
  - `prototype/`: the clickable static prototype.
    - `tokens.css` is the token sheet: one set of names, light and dark values, no glass.
    - `app.css` and `app.js` hold the screens and all 69 states of the brief's flows.
    - `qr.js` is a QR encoder (byte mode, level M).
    - The prototype bar has Screen, State and Theme selectors.
  - `accessible-names.json` (schema-valid, 29 oracle keys plus 36 more) and `accessible-names.md`.
  - `qr-export/qrwty-7Hq2xP9kLm.png` and `.svg`.

  New `docs/evidence/q11/`: `checks.md`, `contrast.md`, `results/*.json`, 67 screenshots and the
  check scripts.
- **Direction: "Steel and Ice".** It is automation-pitch's palette and outline style with the
  Jeeves refresh's icon and dark-ramp rules:
  - an icy page and a steel top bar with a cyan rule, ink outlines and hard offset shadows;
  - Nunito, with one yellow action per view and pastel status families;
  - solid dark shades and no glass;
  - a monospace short link and a white QR sticker in both themes.
- **Checked.** Details are in `docs/evidence/q11/checks.md`.
  - Mouse-only walkthrough: 4 of 4 runs pass (light/dark x desktop/mobile), covering create, copy
    (clipboard verified), PNG and SVG download (decoded), save through the sign-in stand-in, My
    links, edit, disable, analytics, CSV export and upgrade to confirmed Paid. No keyboard events.
  - Names: all 65 found, 264 lookups.
  - Overflow: 0 px at 360, 320, 768, landscape, 720 (200% zoom), 1440 and 2560, in all 69 states.
  - Reduced motion: no infinite animations or transitions.
  - Contrast: 49 token pairs pass in both themes (text at least 5.97:1); the scan of all rendered
    text found its lowest at 5.63:1, with 0 failures.
  - Other: no target under 24 px, outlines at every focus stop, 0 external requests, 0 console
    errors.
  - QR: the encoder decodes 220 of 220 samples; the export sample decodes at 120–1184 px.
  - `git diff --check` is clean and the ledger validates.
- **Artifact.** One private artifact of the prototype: https://claude.ai/artifact/TwiVwazQku5Js9LfmgsW4q.
  `scripts/artifact-page.mjs` derives it from `prototype/index.html`. It adds one Google Fonts
  stylesheet so the owner sees Nunito. Inside the artifact, downloads show the file in a dialog,
  because the host blocks saving.
- **Differences from the packet.**
  1. **Ledger phase.** The schema has no `design` phase, so the attempt (`shared-0645`) is
     recorded as `ui`.
  2. **Jeeves files read.** The coordinator's scope change allowed reading two style sources,
     which overrides the packet's "don't read Jeeves" for those files only. I read
     `jeeves/docs/plans/ui-refresh/preview.md` and its images `icons-light`, `icons-dark`,
     `top-bar-light`, `top-bar-dark`, `settings-light`, `settings-dark` and `dark-ramp`. I also
     read automation-pitch's `index.html`, `src/app/styles/tokens.css` (parts),
     `src/app/components/StatusBar.css` and `src/board/tiles/robot-figure.svg`. Nothing else
     in either repository was read.
  3. **No direct sign-in page.** Save to my links and Sign in go straight to the provider,
     because the oracle's U02 expects the issuer page right after `result.save`.
  4. **Additions.** There are 36 accessible names beyond the oracle's keys, for brief states
     the arms' own tests will need.
- **Next.**
  - The pack amendment copies `docs/design/accessible-names.json` (version `q11-2026-11-14.1`).
  - Q12 and B08 build this one skin.
  - Self-host Nunito (SIL OFL); the prototype has no font file.
  - U06 real-phone and printed-code scans are still human steps.
  - The prototype's sign-in and payment pages are stand-ins, not designs for those providers.
- **Read for this unit.** The packet, the coordinator's scope message, `AGENTS.md`, the design
  brief, Q11 in `units.md`, owner decisions §5, §10 and §11 (§11 was committed as `3f9e0d3`
  during the unit; it matches the scope message), the product and billing contracts, the
  acceptance UI rows, and the neutral pack v1.4 frozen decisions §4, HTTP contract §7 and §9, and
  acceptance-oracle §6. I also read the oracle's `ui-names.schema.json`,
  `src/browser/{names,driver,qr}.ts`, `src/rows/lib/ui.ts` and rows A01, U02–U07, the ledger
  README and this file's S01 entry. I read nothing in qrwty-baseline and no arm source.
- **Foreign context.** The session started with foreign Jeeves context (`AGENTS.md`, Git status,
  a memory index). I ignored it, apart from the two style sources the coordinator allowed.

## N05: pack v1.5 (frozen UI names and design assets, one skin), 2026-11-15

- **Changed.** Pack **v1.5** (`docs/benchmarks/neutral-pack/v1.5/`, manifest SHA-256
  `b76a0dd51923888fa9e203f0b7948a68807fe427dd39f02f6e9910b0ab3ac800`, 201 files) is a
  self-contained copy of v1.4. It is recorded in `frozen/decisions.md` §11 (the v1.5 row and its
  note) and in the pack README's "Changes from v1.4".
  - **(a) Frozen name list.** Q11's `docs/design/accessible-names.json` (`q11-2026-11-14.1`) is
    copied byte for byte to `files/docs/design/accessible-names.json`, the only copy in the pack.
    - `oracle/src/runner.ts` loads it from that fixed path (`FROZEN_UI_NAMES_PATH`, resolved from
      the oracle's own folder), validates it against `ui-names.schema.json`, and passes it to every
      browser row (A01, A04's browser step, U02–U08) as `ctx.uiNames`.
    - Each result records `environment.uiNames` (version, SHA-256).
    - `oracle/src/cli.ts` refuses `--ui-names` (exit 2), so no arm supplies its own list. Only the
      self-test keeps its double-only list (`uiNamesPath`).
    - New unit test `oracle/test/ui-names.test.ts` (5 tests).
  - **(b) Design assets.** Q11's design README, `accessible-names.md`, `prototype/` (with
    `tokens.css`) and `qr-export/` are byte copies under `files/docs/design/`, with origin
    `d67f5fe`. Q11's 81 evidence files (67 screenshots) are excluded, and the README's two links
    to them are declared outside the pack.
  - **(c) One skin.** Decisions §2 quotes owner decisions §11, which replaces §5 of the pack's
    copy (that copy still holds §§1–8, origin `0e2e1f2`). Every place below now says one skin ×
    light/dark × desktop/mobile:
    - acceptance-oracle §6;
    - decisions §1, §2 (rows for U01, design brief, architecture flow sheet, B08) and §7–§10;
    - the B brief (§1, B08);
    - the U rows' scope labels;
    - the schema description and the oracle README.
  - **Unchanged checks.** No row's checks changed: the U rows still run each skin the adapter
    lists in `ui.skins`, and the adapter lists one. `selectSkin` is still required by the schema.
  - **Records.** Oracle build `1.5.0`; results report pack `v1.5`. `status.json` points at v1.5.
- **Checked.**
  - **Name list.** It validates against the schema with the oracle's own validator and with an
    independent stdlib check: 0 errors, 65 names, all 29 logical keys.
  - **Self-test.** The full self-test (`n05-selftest-pubsub` and `n05-selftest-toxiproxy`, then
    Chromium) matched 51/51 cases and detected 34/34 faults. Every case's expected and observed
    status equals v1.4's run.
  - **Oracle tests.** `pnpm check` (Biome, TypeScript, 48 unit tests) passes in place and in a
    fresh copy after `pnpm install --frozen-lockfile`; `pnpm test:integration` passes 3/3.
  - **Pack.** `verify_pack.py` for v1.5 passes in place, with `--against-git .` (36 copies: v1.4's
    26 plus Q11's 10) and in a fresh copy. `verify_pack.py` is byte-identical to v1.4's.
  - **Old packs.** v1 to v1.4 are unchanged against `HEAD`; v1, v1.3 and v1.4 still verify.
  - **Hygiene.** A credential-shape scan of the finished v1.5 (203 files, R15 plus five patterns)
    finds nothing. `git diff --check` is clean. Both containers were removed by name.
  - **Records.** The evidence is in `evidence/n05/`, with Node 24.21.0 and pnpm 12.16.1.
- **Next.**
  - **Coordinator: install.** Install v1.5 in qrwty-baseline, record each arm's adoption, and
    fill `commits.after` of `shared-0745`.
  - **Each arm.** List the one skin in the adapter's `ui.skins`, build the UI from
    `files/docs/design/` with exactly those roles and names, and run the browser rows from its
    v1.5 copy without `--ui-names`.
  - **For the coordinator to decide:**
    - Decisions §9 used to say "Prototype or UI source is never shared". v1.5 ships Q11's
      prototype as requested and now says it is Q11's shared design deliverable, not either arm's
      UI source, with B08's source rules unchanged. Whether an arm may copy prototype code
      verbatim is not settled here.
    - The pack's owner-decisions copy is still the v1 copy; refreshing it would also bring in
      sections 9 and 10.
    - The adapter schema still allows several skins and still requires `selectSkin`.
  - **What was read.** Pack v1.4, the ledger README, `docs/design/`, owner decisions §11, the N05
    packet and this file's N04 entry (for the format). A `diff` of the owner decisions against the
    pack's copy also showed §9 and §10; only §11 was used. No arm source, evidence, review or
    handoff, and no Jeeves file, was read.
  - **Foreign context.** The session started with foreign Jeeves context (`AGENTS.md`, a memory
    index, Git status); it was ignored.

## N06: pack v1.6 (per-account sign-in identifiers, one login attempt), 2026-11-15

- **Changed.** Pack **v1.6** (`docs/benchmarks/neutral-pack/v1.6/`, manifest SHA-256
  `1250b85420ec9d7f5f016ebdc7174fccda4b591634333fc27daa5bd4a2bfc579`, 219 files) is a self-contained copy of v1.5 for a managed issuer (owner
  decisions §12: Auth0 free tier, one shared email-only connection). It is recorded in
  `frozen/decisions.md` §11 (the v1.6 row and its note), acceptance-oracle §2 (Identity) and the
  pack README's "Changes from v1.5".
  - **(a) Per-account login identifiers.** `identity.accounts` maps `alice`, `bob` and
    `operator` to login identifiers (optional; without it the fixed `oracle-*` names, so local
    adapters are unchanged). Exactly one of `passwordEnv` and the new `passwordCommand`
    (`{account}`), which prints that account's password once. New `oracle/src/identity.ts` reads
    each password at most once per run, registers it as a secret and never records it. An
    unmapped account, or an unreadable password, gives a `blocked` check `account <key>`, never
    `failed`. Schema, `types.ts`, `adapter.ts` (exactly one source, no two accounts alike),
    `fixtures/accounts.ts` (`DEFAULT_LOGINS`, `loginFor`; `ACCOUNTS` gone), `context.ts`
    (`ctx.login`, `ctx.credentials`, `ctx.signIn`; `ctx.password` gone), `runner.ts`, and every
    row that named an account: A04, A05 (leak check), A06, A09 (spoofed `x-user-id`), A14 (also
    `issueToken`'s `{account}`), A15, F04, U02, U05, U08 and `lib/ui.ts`.
  - **(b) At most one login post.** `Api.signIn` posts once at most and returns `posts`,
    `refused` and `reason`; a non-redirect answer to the post (or after it) is a refusal ("…;
    posted once, not posted again"). Only network errors before the post are retried (twice).
    `ctx.signIn` also remembers a refusal for the rest of the run, so a wrong password costs one
    post per account per run, not one per row (A15's post-deletion and F04's outage sign-ins are
    exempt).
  - **(c) Self-test.** New cases `signin-lockout` (A14, stale password, issuer re-renders the
    form and locks after 3 refused posts; expected `failed` with at most one post, no lock and the
    reason) and `signin-mapped-identifier` (A06, email-only issuer, mapped emails and per-account
    passwords via `selftest/password.ts`; expected `passed`, no refusal). The self-test now also
    checks the issuer double's counts for these cases. New `test/signin.test.ts` (7 tests) and one
    adapter test.
  - **(d) Records.** Oracle build `1.6.0`; results report pack `v1.6`. `status.json` points at
    v1.6.
- **Checked.**
  - **Self-test.** The full self-test (`n06-selftest-pubsub`, `n06-selftest-toxiproxy`,
    Chromium) matched 53/53 cases and detected 35/35 faults; the 51 v1.5 cases keep
    v1.5's expected and observed statuses.
  - **v1.5 proofs.** With v1.5's `session.ts` alone, `signin-lockout` posts 11 times and locks
    `oracle-alice` (MISMATCH). With v1.5's whole `src/` and schema, both new cases MISMATCH: the
    lockout as above, and the email-only case fails with `oracle-bob` posted 11 times and locked.
    v1.5's schema refuses the staging adapter, and `signin.test.ts` fails 4/7 on v1.5's driver
    (33 posts across three rows with a wrong password).
  - **Oracle tests.** `pnpm check` (Biome, TypeScript, 56 unit tests) passes in place and in a
    fresh copy after `pnpm install --frozen-lockfile`; `pnpm test:integration` passes 3/3.
  - **Pack.** `verify_pack.py` for v1.6 passes in place, with `--against-git .` (36
    copies) and in a fresh copy. `verify_pack.py` is byte-identical to v1.5's.
  - **Old packs.** v1 to v1.5 are unchanged against `HEAD`; v1, v1.3, v1.4 and v1.5 still verify
    (v1.1 and v1.2 stay superseded, as before).
  - **Hygiene.** A credential-shape scan of the finished v1.6 (215 files, 16 patterns,
    including password literals and the self-test's runtime password shape) finds nothing.
    `git diff --check` is clean. Both containers were removed by name.
  - **Records.** The evidence is in `evidence/n06/`, with Node 24.21.0 and pnpm 12.16.1.
- **Next.**
  - **Coordinator: install.** Install v1.6 in qrwty-baseline, record each arm's adoption, and
    fill `commits.after` of `shared-0848`.
  - **Each arm, staging adapter.** `identity.issuerUrl` = the tenant's `iss` (with the trailing
    slash), `identity.audience` = the arm's own API audience, `identity.accounts` = the arm's own
    `alice` and `bob` email users in the shared connection (`operator` only if it has one), and a
    `passwordCommand` that prints the given account's password once from its secret file by
    name, replacing `passwordEnv`. Local adapters need no change.
  - **For the coordinator to decide:**
    - Without an operator user on staging, A07 (a staging-subset row) ends `blocked` at its
      operator-block step, as do A08, A16 and A18.
    - The run-level refusal memory goes beyond "once per call"; it exists so a wrong password
      cannot reach Auth0's 10 across rows (A06, A07, A14 and F09 sign alice in up to 8 times).
    - Browser sign-ins (U02, U05, U08) submit once per call and honour earlier refusals, but
      cannot detect a refusal themselves; the U rows are not in the staging subset.
    - Decisions §5's Identity row still names GCP Identity Platform as the candidate; the v1.6
      row of §11 records Auth0 (owner decisions §12). The pack's owner-decisions copy still holds
      §§1–8, and `reset`'s documented "accounts recreated" is unchanged.
  - **What was read.** Pack v1.5, the ledger README, owner decisions §12, the N06 packet and this
    file's N05 entry (for the format). No arm source, evidence, review or handoff, and no Jeeves
    file, was read.
  - **Foreign context.** The session started with foreign Jeeves context (`AGENTS.md`, a memory
    index, Git status); it was ignored.

## Q04: prepare QRWTY cloud bindings without provisioning, 2026-11-15

Arm A, attempt 1 (ledger `a-3332`, role implementer, phase cloud), from QRWTY `086a599`; main moved
to `511bd54` during the unit (the coordinator's commit, which also carried this attempt's start
record). Generator: Jeeves **`4e87f97`** only, from `git archive` into `.scratch/Q04/jeeves` with its
own offline install; nothing in the Jeeves checkout was run or written. Pack v1.6 from a scratch
copy (`verify_pack.py` OK). No cloud, Auth0, Cloudflare or billing call. Status: **locally
verified; cloud activation pending.** Full record: [Q04 checks](evidence/q04/checks.md).

- **Changed.**
  - `infra/app-overlay/`: the application's own files for the export (no generated file):
    `compose.override.yaml` (local test profile: `qrwty.arm=a` labels, two copies of every process
    on loopback test ports, `verify-full` TLS to PostgreSQL and both caches with a throwaway CA, the
    External API fixture URLs), `scripts/qrwty-production-profile.mjs` (the production preflight)
    and `infra/qrwty/production-profile.json`.
  - `infra/local/`: `tls-certs.sh`, `install-overlay.py` (refuses generated paths),
    `verify-generated.py`, `profile-check.mjs` (R01's production start), `oracle-commands.mjs` and
    `ordinary-build.sh` (oracle adapter commands).
  - `infra/gcp/`: the OpenTofu draft (32 resources: VPC, PSA, PSC policy, Cloud SQL by socket,
    two Memorystore for Valkey instances, Pub/Sub topic, subscription, dead letter, Cloud Storage
    archive, seven service accounts and least-privilege IAM, 15 secrets with no credential values,
    Artifact Registry, five Cloud Run services, the worker pool and the migration job),
    `lint_iac.py`, `lint_selftest.sh`, `validate.sh`, `terraform.tfvars.example`.
  - `infra/q12a/`: the probe manifest (P01–P12), its schema and validator. `infra/README.md`.
  - `docs/evidence/q04/`: checks, binding inventory, limitations, A-found gaps, commands, records,
    the oracle adapter and results, and the probe bodies used only in the scratch export.
- **Bindings proven locally** (on the scratch export, Click events on Google Cloud): endpoints from
  the environment; `verify-full` TLS to PostgreSQL (TLSv1.3 per request; plain text rejected by the
  server; wrong CA refused) and to Valkey; `JEEVES_REQUIRE_TLS`; the sign-in's issuer and audience
  (Auth0-shaped issuer with A's audience accepted, `identity-web`, the slashless issuer and another
  issuer 401); `JEEVES_IDENTITY_IDENTITY_URL` (Keycloak realm 200); `JEEVES_EXTERNAL_*_URL`
  (validation only); Pub/Sub on the emulator (awaited publish, messageId, dedup by ID, dead letter
  with `x-terminal-code`, subscription settings); migrations with a CREATEDB CREATEROLE
  non-superuser admin, twice at once and again (no PUBLIC CONNECT, no CREATE for runtime logins);
  a cache without AUTH; the Cloud Run secret layout. Production profile: Session, Account, Billing
  and Link API start ready; Redirect and Analytics stop at Pub/Sub credentials (expected).
- **Checks.** Oracle v1.6: R01 **passed**, R02 **passed**, R03 **failed** 41/42 (only "session
  shared through external state": the product session route is 404 until Q07). R01 matrix: 96/96
  refused with a named reason by the production profile; the generated runtime alone 59/96, named
  15/96. Drain under load: 12,117 requests all 202 while a copy drained (1.1 s, exit 0);
  connections ≤ 20 for two copies. `lint_iac.py` 0 errors, its self-test 8/8 faults detected;
  **`tofu validate` not run** (OpenTofu not installed; the download was refused by the session's
  permission policy): `validate.sh` reports `blocked`. Probe manifest valid, 6/6 faults rejected.
  `verify-generated.py`: no generated file changed. Secret scan clean. `git diff --check` clean
  (trailing spaces stripped from two captured logs and one record first).
  Ledger validates.
- **A-found gaps** ([details](evidence/q04/a-found-gaps.md)): AG-01 (low) configuration validated
  between probes; AG-02 (medium) `JEEVES_REQUIRE_TLS` doesn't refuse
  `NODE_TLS_REJECT_UNAUTHORIZED=0`, which unverifies the fetch-based clients and the key set; AG-03
  (medium) one `SECRET_DIR` while Cloud Run mounts one secret per path; AG-04 (medium) the cache
  client can't use Memorystore IAM auth; AG-05 (low) Pub/Sub names compiled, not namespaceable;
  AG-06 (low) migrations always provision the local Keycloak database; AG-07 (docs) README row for
  the Identity client. Each has a workaround in the overlay or IaC, or none needed.
- **Q12a backlog**: the probe manifest's P01–P12 (budget read, image push, `tofu validate` and
  apply, secret bootstrap, migration job, managed stores and probes, Pub/Sub ACK/IAM/archive, Auth0
  issuer and audience, ingress and internal calls, drain on Cloud Run, a live profile refusal,
  providers at no charge), each with expected results, cost inputs (prices null until requoted)
  and teardown.
- **Q04b** (the one check not run): install OpenTofu 1.13.2 and a google 8.8.1 provider mirror,
  run `infra/gcp/validate.sh` to exit 0, and fix any schema error in `infra/gcp/*.tf` (the draft
  targets provider 8.x arguments read from its 8.8.1 documentation, never validated). Needs the
  owner's permission to download the binary and provider. Q12a's P03 starts with it otherwise.
- **For Q05.** Q05 saves the real revision with Click events on Google Cloud, and adds
  `infra/app-overlay/` into `app/` after the untouched baseline commit (they are application files,
  not baseline). Session API's stub needs the browser-facing issuer from an override variable (QGR2
  "For Q05"). R03's session check passes only once Q07 exists.
- **Docker.** Project `qrwtya-q04` (24 containers), the rehearsal network, one-off `qrwtya-q04-*`
  containers and the image `qrwtya-q04-app` were removed by exact name; no prune; arm B's and Jeeves's
  containers untouched. Inventory of `qrwtya`/`qrwty.arm=a` resources empty before and after.
- **Read.** The packet, `AGENTS.md`, this file (Q00–Q03b, N01–N06, S01, Q11), the plan's
  `units.md` (Q04, Q05, Q12a, Q13), `local-to-cloud.md`, `architecture.md`, `durable-clicks.md`,
  `jeeves-gaps.md`, owner decisions §1–§12, `docs/evidence/q01`–`q03` through their handoff entries
  and Q01's design JSON (Q03's `capabilities.md` was not read in full), pack v1.6's acceptance spec, R rows,
  adapter schema and README; Jeeves at `4e87f97` only: `jeeves-generator/README.md`,
  `review-batch2.md` and the export's own files. `docs/plans/qrwty-lessons/` was deleted unread from
  the scratch copy. Public docs: Cloud Run secrets, Memorystore IAM auth, Pub/Sub retention, and the
  google provider 8.8.1 resource pages. Nothing in qrwty-baseline; `~/.config/qrwty/` not read.
- **Elapsed.** About 60 minutes to the commit, on a monotonic clock (`/proc/uptime`).
- **Foreign context.** The session started with foreign Jeeves context (`AGENTS.md`, Git status, a
  memory index); it was ignored.

## Q05: freeze QRWTY's generated baseline, 2026-11-15

Arm A, attempt 1 (ledger `a-3636`, role implementer, phase generation-baseline), from QRWTY
`e17df9c`. Generator: Jeeves **`4e87f97`** only, from `git archive` into `.scratch/Q05/jeeves` with
its own offline install (`docs/plans/qrwty-lessons/` deleted unread); the Jeeves checkout was only
read through Git. Pack v1.6. No cloud, Auth0, Cloudflare or Stripe call. Full record:
[Q05 checks](evidence/q05/checks.md).

- **Commits.** Baseline **`33d50e9c693b4d8d60d723e0de75b79f3570da64`** (`Q05: freeze QRWTY
  generated baseline`: `app/`, root wiring, `tools/`, evidence, README). The follow-up commit with
  this entry adds the LOC report run on it (`evidence/q05/loc/`) and
  [baseline.json](evidence/q05/baseline.json).
- **Revision 84.** One change, saved through Q01's path (`buildSupportedAuthoringCommand` →
  `POST /operations`, 200): Click events' **Provider Unspecified → Google Cloud**. Source
  `4fbcd311…024d`. No other change: all 15 normal controls were listed before and after, and the
  Provider is the only one a QG fix added. Not changed (for a later revision): Click events'
  description still says "pending G12"; Billing API's Entitlements stays (QG15 deferred); Redirect's
  1000 ms request timeout is under the publisher's 2000 ms bound (Q08). Detailed and Simple PNGs by
  mouse are byte-identical to r83's (the provider isn't drawn, AG-08). No other project changed;
  the server wasn't restarted.
- **Export.** The frozen CLI wrote `app/` from the canonical r84 bytes: 87 files, manifest
  `c4c33e26…7daff`, Click events a Pub/Sub topic, no broker. A second run refuses (`app/` exists;
  the CLI also refuses with `EEXIST`). Two more fresh exports are identical. **M01 passes** (input =
  `GET /design`, every manifest hash, 165 generator sources = `4e87f97` blobs, studio same paths,
  input and templates). Nothing in `app/` is edited; no product code, product SQL, hooks or UI.
- **Studio vs CLI.** The studio runs Jeeves `79ecb96` plus **uncommitted** generator changes in
  the checkout (an in-progress Jeeves unit). 14 of 87 files differ, each explained by re-exporting
  in a scratch copy commit by commit: `39a20be` QG21 (`http.ts`), `1d42570` QG22 (`bootstrap.mjs`,
  `setup.mjs`), `efbff72` QG23 (README), `79ecb96` QG25 (`nginx.conf`), uncommitted (six process
  files, `module-clients.ts`, README), plus manifest and report. The frozen output is the baseline.
- **LOC** (backend only, UI excluded; `tools/loc/`, source-loc-v2 at Jeeves `4e87f97`, Rolldown
  1.2.15): **G0 2,926** in 45 files = scaffolding **2,871** (34) + stub bodies **55** (11);
  **first template share 100.00%** (baseline against itself; R + C = B and G0 − R = D hold). Command:
  `bash tools/loc/source-loc.sh .scratch/Q05/jeeves 33d50e9… 33d50e9… docs/evidence/q05/loc`. It
  reads Git objects only: a dirty, edited and partly deleted worktree gave byte-identical output;
  a committed one-line stub edit gave R 2,925, C 1. Support for `app/` (scripts 716, product SQL
  125, deployment config 343, …) and UI 0 are in the summary (M03 passes at the baseline).
- **Root commands.** Root `package.json` (no dependencies; `app/` stays its own pnpm project) and
  pnpm's root lock of itself: `app:install`, `build`, `typecheck`, `check` (typecheck, generated
  files unchanged, open work), `loc:setup`, `loc`, `ledger:validate`. Build and typecheck exit 0, no
  diagnostics. **Hook inventory: empty** (no hooks file, every process `hooks: []`). No lint or test
  runner yet: product units add them.
- **Smoke.** Scratch copy with a smoke-only override (labels; the two External API URLs Billing and
  Link API need): `first-run` 152 s, 12 services healthy. The 10 route stubs answer their named
  501s (Account API's two with a client-credentials token from the scratch Keycloak; without one,
  401 first), the worker dead-letters a Pub/Sub message with `NOT_IMPLEMENTED`, nothing else
  fails. Torn down by exact name; no `qrwtya-q05` resource left; no prune.
- **Checks.** M01, M03, determinism, smoke, build and typecheck, Git-object proof, secret scan
  (151 files, nothing), `git diff --check` clean outside `app/` (inside, two generated files end
  with a blank line: AG-09, left as generated), ledger validates.
- **A-found gaps.** AG-08 (low, notation): a queue's provider isn't drawn. AG-09 (low, cosmetic):
  two generated files end with a blank line. No generated file needed an edit.
- **For Q06.** Q04's `infra/app-overlay/` was **not** copied into `app/`: its override needs
  `QRWTY_LOCAL_TLS_DIR` for every start and doubles each process; install it with
  `infra/local/install-overlay.py app infra/app-overlay` when product code first runs. New
  directories under `app/src/` must go in `tools/loc/backend-scope.json`. Set up a runner with
  `pnpm loc:setup /home/ash/github/jeeves <dir>`. The README's status and measurement table
  outside the diagram section still say "not generated" (not this unit's to edit).
- **Q05b.** None: the unit is complete.
- **Read.** The packet, `AGENTS.md`, this file (Q00–Q04, N01–N06), `units.md` (Q05),
  `comparison.md`, owner decisions §10–§12, `evidence/q01`, `q02`, `q04` checks and commands,
  pack v1.6's M rows and loc-method, the ledger README; Jeeves at `4e87f97`: `source-loc.md`, the
  generator README (parts), `review-batch2.md` (header, For Q05, Runs), `source-loc.ts`, the spec's
  authoring command and the server's routes. Nothing in qrwty-baseline; `~/.config/qrwty/` not read.
- **Elapsed.** 26 minutes to the baseline commit (07:45:57Z to 08:12:05Z, wall clock) and about
  30 to the follow-up.
- **Foreign context.** The session started with foreign Jeeves context (`AGENTS.md`, Git status, a
  memory index); it was ignored.

## Q05 review: the generated baseline, 2026-11-15

Arm A, `Q05-review`, attempt 1 (ledger `a-4020`, role reviewer, phase review, requested Fable
xhigh), from QRWTY `f7f333d`. Reviewer only; Q05 (`33d50e9`, `7b432f7`) was not mine. Jeeves read
only at `4e87f97` (`git archive` without `docs/`, `git show`) into `.scratch/Q05-review/`; nothing
written or run in the Jeeves checkout; no later commit, no `qrwty-lessons`. Studio API: `GET
/projects` and the QRWTY project's `GET /design` only. Arm B not read. No cloud, Auth0, Cloudflare,
Stripe or `~/.config/qrwty/`. Full review: [Q05 review](reviews/Q05-review.md).

- **Verdict: passed with findings.** Everything re-runnable reproduced byte for byte.
- **Re-ran.** Frozen copy at `4e87f97` (pins verified); live `GET /design` canonicalised by the
  frozen generator = `4fbcd311…024d` = `33d50e9:app/.jeeves/inputs/design.json`; two fresh
  `export:v2` runs identical to each other and to `git archive 33d50e9 app` (87 files, manifest
  `c4c33e26…7daff`); r83 → r84 source diff = provider + revision only; blueprint diff = 4 fields as
  claimed; own M01 (11/11, 165 sources = `4e87f97` blobs, studio records consistent); LOC runner
  rebuilt with `tools/loc/setup.sh` and run on `33d50e9`: report and summary byte-identical to
  `evidence/q05/loc/` (G0 2,926 = 2,871 + 55; identities hold; UI 0); Git-object proof in a scratch
  clone (five worktree corruptions change nothing; a committed code line gives C 1); Node-18
  refusal; root `app:install`/`build`/`check` exit 0 with `git status app/` clean; smoke of the
  committed baseline as project `qrwtya-q05r` (ports 47251–47253): 12 healthy, the same 25 probe
  answers as Q05 (10 named 501s, 401 before the Required guard, 501s with a token, dead letter
  `NOT_IMPLEMENTED`), logs with 11 `not-implemented` and no error; torn down by exact name, nothing
  left; `SHA256SUMS` 58/58 and complete; PNGs equal r83's; Q01/Q02 evidence untouched; ledger valid.
- **Findings.** F1 (low) `tools/loc/setup.sh` under another Node builds a runner that verifies but
  whose Rolldown binding is missing (optional dep skipped by `engines`); F2 (low, process) Q05 read
  Jeeves's later commits and uncommitted tree for the attribution (disclosed; nothing entered
  `app/`); F3 (low, docs) root README status and table still say "not generated", two skins, pack
  v1; F4 (low, ledger) all 24 coordinator imports record `agentToolTotals` 0/0/0 with the real
  totals only in notes; F5–F7 info (stale Click events description, AG-08/09 not in run-status,
  no lint/unit tests in root `check` yet).
- **Proposed units.** Q05c runner setup fix (ready); Q05d README status/table (ready); N07 pack
  v1.7 ledger `update` with agent totals + correction pass (needs the owner); rule on reading
  Jeeves's working tree from arm A (needs the owner); next revision folds the description (needs
  the owner); coordinator status update (ready).
- **Readiness.** Sound baseline for Q12a/Q13 and Q06–Q10b. AG-01–09 recorded honestly; none
  blocks. Q13's apply still waits on Q04b (OpenTofu download permission), from Q04.
- **Not re-run.** Exports at later Jeeves commits (forbidden here; attribution verified from the
  records and diff content); the studio's mouse steps (renders verified by hash); Q05's `m01.py`
  as written (needs the studio ZIP directory; replaced by equivalent checks).
- **Writes.** `docs/reviews/Q05-review.md`, this entry, and my ledger records in
  `docs/benchmarks/runs/qrwty-r1-20261114/a/events.jsonl` (`a-4020` start, one evidence update).
  No repair. Scratch: `.scratch/Q05-review/` only.
- **Elapsed.** 08:15:58Z to 08:37Z, about 21 minutes wall clock (the smoke stack's `first-run`
  2 min 43 s of it).
- **Foreign context.** The session started with foreign Jeeves context (`AGENTS.md`, the Jeeves
  Git status naming later commits, a memory index); it was ignored and not used.

## Q06: durable guest link creation, 2026-11-15

Arm A, attempt 1 (ledger `a-4056`, role implementer, phase backend), from QRWTY `8c8edd4`; main
moved to `678c199` during the unit (the coordinator's commits `5065dde`, which also carried this
attempt's start record, `5a5bb23` and `678c199`). Generator: Jeeves **`4e87f97`** only (`git
show`, and `git archive` through `tools/loc/setup.sh`); nothing in the Jeeves checkout was written
or run. Pack v1.6 from a verified scratch copy. No cloud, Auth0, Cloudflare or Stripe call. A
usage limit paused the session after the reading phase, before anything ran; it resumed with
nothing lost and no `qrwtya*` resource present. Full record: [Q06 checks](evidence/q06/checks.md).

- **Step 0.** **Q05c:** `tools/loc/setup.sh` refuses any Node but 24.21.0 before installing (Node
  18: refused, nothing created); `verify-runner.sh` adds a one-line `codeLines` smoke (a copy
  without Rolldown's binding: refused, "Cannot find native binding"); the new runner reproduces
  `evidence/q05/loc/` byte for byte. **Q05d:** root README status (baseline `33d50e9`, r84,
  Jeeves `4e87f97`, pack v1.6, not deployed), live sites (qrwty.io placeholder, `b.qrwty.io` live
  for B), one skin (§11), the measured table (G0 2,926 = 2,871 + 55, UI 0, and Q06's values); the
  diagram section is as Q05 left it.
- **Changed.**
  - `app/src/modules/link-api/link-api-link-operations.ts` (stub body) and
    `app/src/modules/link-api/link-operations/` (destination, slug, idempotency, replay seal,
    Web Risk adapter, store, create route, test hooks, service): `POST
    /modules/link-api-link-operations/links`, the internal route Session API forwards
    `POST /api/v1/links` to. Destination validation and the contract's normalization only;
    replay or 409 before any other work; Web Risk (422 / 503 with `Retry-After: 5`, 500 ms);
    CSPRNG slugs, 1 + 5 attempts then 503 `slug_allocation_failed`; a database error is 503
    `storage_unavailable`, never a success; owned create 503 `entitlement_unavailable` until
    Q10b. Guest scope: header `QRWTY-Guest-Scope` (an opaque handle Session API derives from the
    guest session, Q07). Claim proof: 32 random bytes, only its SHA-256 stored, 24 h; the replay
    copy sealed AES-256-GCM with the `link-replay-keys` ring, bound to the link.
  - `app/infra/postgres/links/modules/link-api-link-operations.sql`: migration sequence
    (`product_migrations`, step 1), `links`, `link_versions`, `link_claims`,
    `idempotency_records`, tombstone/version/append-only triggers, `create_guest_link` (one call,
    one transaction; same-key racers wait and replay), `find_idempotent`, bounded purge, and
    `published.link_routes` (routing fields only) for Q08.
  - Overlay installed into `app/` with `install-overlay.py`; `infra/app-overlay/` (its source)
    adds Link API's origin, replay key ring and test hooks; the production profile requires the
    origin and the key ring. `infra/local/`: `app-secrets.sh`, `test-postgres.sh`, the `faultPoint`
    command and adapter fields in `oracle-commands.mjs`, Link API's settings and `test-hooks` in
    `profile-check.mjs`, lint and unit tests in `ordinary-build.sh`.
  - Tests and tools in `app/`: Vitest 5.0.0 and Biome 2.6.4 (dev), `vitest.config.ts`
    (`unit`, `integration`, `stack`), `biome.json` (new files only), `tsconfig.test.json`,
    `app/test/`.
  - State diagram: `docs/architecture/link-states.excalidraw`, `.png`, `.svg`.
- **Checks.** Unit **118** passed (offline); integration on PostgreSQL 17.11 **20** passed (200
  concurrent creates on two pools: 200 distinct slugs; 20 same-key requests: one link, one body;
  two bodies on one key: one winner, the rest 409; restart replay; collisions; triggers; grants);
  stack (two copies, own containers, verify-full TLS, the pack's Web Risk fixture) **9** passed
  (A02, A03 and A09 at Link API's route, restarts, the adapter's `force-slug-collision`; final run
  on a second, fresh stack). R01's ordinary build now runs Biome and the unit tests. Root
  `build`, `typecheck`, `check`; app build, test typecheck, Biome: exit 0. `verify-generated`: 64
  generated files unchanged. Production profile: Link, Session, Account and Billing API start
  ready; `QRWTY_TEST_HOOKS` refused.
- **Oracle v1.6** (first run and final rerun alike): **A02** failed → reported **blocked** (Q07:
  `/api/v1/session` and `/api/v1/links` are 404 on Session API); **A03** blocked (no trusted edge
  token; also Q07 and Q08); **A09** failed → **blocked** (Q07 creates, Q08 Location/HEAD/405/Host);
  **F07** blocked (no identity, no Stripe: Q07, Q10a/b); **R01 passed**, **R02 passed**, **R03**
  failed 41/42, unchanged since Q04 (the session check needs Q07). `clear-route-caches` and
  `admissionBound` not added (no row run needs them).
- **LOC** (source-loc-v2, backend only, UI 0; [summary](evidence/q06/loc/summary.json), counted
  before the commit on a scratch commit of the same `app/` and `tools/`): G0 2,926; R **2,925**, C
  **720**, D **1** (the stub's `throw`), B **3,645**; template share **80.25%**; R + C = B and
  G0 − R = D hold. Product SQL 411 lines (support). The tests (1,675 TS lines) land in the support
  category `other`, because source-loc-v2 marks every path outside `src/` first (noted in the gaps
  file). The same count on the unit commit itself is in the final report.
- **A-found gaps** ([details](evidence/q06/a-found-gaps.md)): AG-10 (medium) a stub has no
  startup step or declared configuration (settings and credentials read at import, outside the
  report and Compose); AG-11 (low) product SQL has no versioned steps; AG-12 (low) the module
  schema's grant can't express append-only or never-delete tables. Each worked around in
  application files; no generated file edited.
- **Next: the live deploy (Q12a+Q13).** The owner decisions of 2026-11-15 (committed during this
  unit, `5a5bb23`) stop A after Q06 and one live deploy: Q07–Q10b won't run, so A02, A03, A09 and
  F07 stay blocked and R03's session check stays failed. For the deploy: add the
  `link-replay-keys` secret (one line `<kid> <32 bytes base64url>`; a kid not starting `dev`,
  `local`, `test`, `fixture` or `oracle`, which the preflight refuses) to `infra/gcp` and mount it
  for Link API; set `QRWTY_PUBLIC_ORIGIN_URL` (`https://qrwty.io`); Link API sends Web Risk no
  credential yet, so live creation answers 503 `reputation_unavailable` until one is added (API key
  or the service account); Link API stays internal, and with no Session API facade the public
  `/api/v1/links` is 404 (only Link API's own route, reached inside the deployment, creates).
- **If Q07 ever runs.** Session API forwards `POST /api/v1/links` to Link API's `/links` with the
  caller's bearer (none for a guest), the `Idempotency-Key` and `QRWTY-Guest-Scope` derived from
  the guest session (strip any client-sent copy; never the cookie value), and maps the runtime's
  `{error: CODE}` answers to the product shape. Claim reads `link_claims` (hash, expiry,
  `consumed_*`) in one function; `qrwty.link_change`/`qrwty.link_actor` name each change for
  `link_versions`; account deletion must also clear `link_versions`' private data; Link API has
  `/__test/clock`, the oracle's `clock` command is not written. Q08 would read
  `published.link_routes`.
- **Q06b.** None: the unit is complete; the oracle rows it can't pass need Q07, Q08 and Q10a/b.
- **Docker.** `qrwtya-q06` (18 containers, network, volumes), `qrwtya-q06-rehearsal`,
  `qrwtya-q06-testpg` and the image `qrwtya-q06-app` removed by exact name; no prune; nothing of
  arm B's or Jeeves's touched.
- **Read.** The packet, `AGENTS.md`, this file (Q04, Q05, Q05 review), the Q05 review,
  `evidence/q04` (a-found gaps, limitations, adapter, commands), `evidence/q05` (checks, loc),
  `units.md` (contract, Q06–Q09), pack v1.6's `decisions.md`, `http-contract.md`,
  `acceptance-oracle.md`, `product-contract.md`, the oracle README, rows A02, A03, A09, F07 and
  their helpers, the Web Risk fixture; Q03's `capabilities.md` (G02, G08, G10 and the gap table);
  `app/README.md`, `report.json`, the generated runtime, scripts and product SQL headers; Jeeves at
  `4e87f97`: `source-loc.ts` (exports, exclusions); the owner decisions of 2026-11-15, committed
  mid-unit. Nothing in qrwty-baseline; `~/.config/qrwty/` not read.
- **Checks of the finish.** Secret scan (credential shapes, and this run's credential values
  from the second stack's runtime, the TLS keys, the replay key ring and the test database
  password) over the 80 unit files: no credential; the only shape hits are the pack's own A09
  input (a URL with a user and password, which must be refused), echoed in the oracle's two
  `results.jsonl` (my sources build it at run time). `git diff --check` clean. Ledger validates.
- **Elapsed.** Started 08:38:56Z (wall clock). A usage limit paused the session after the
  reading phase (the pause's start isn't recorded); from the resume to the commit took about 48
  minutes on `/proc/uptime`. The whole span is about 2 h 47 min on `/proc/uptime` and about 3 h
  7 min on this host's wall clock, which jumps.
- **Foreign context.** The session started with foreign Jeeves context (`AGENTS.md`, Git status, a
  memory index); it was ignored.

## Q13: arm A's one live deploy, recorded and torn down, 2026-11-15

Arm A, Q13 attempt 1 (Q12a and Q13 combined; ledger `a-4542`, role implementer, phase cloud), from
QRWTY `1d79868`. Generator: Jeeves `4e87f97`, only through the frozen export in `app/` (no Jeeves
file read or run). OpenTofu 1.13.2 and the google 8.8.1 mirror the coordinator installed; nothing
downloaded but the image's own build inputs. Status: **done, except free network leftovers
(Q13b).** Record: [demo/index.html](evidence/q13/demo/index.html) (offline, sanitized); full
account: [Q13 checks](evidence/q13/checks.md).

- **Q04b.** `infra/gcp/validate.sh` exits 0: `tofu validate` passed at once, only `fmt` failed
  (`locals.tf`). Re-run after every change; lint self-test 8/8.
- **Requote.** Cloud Billing Catalog list prices, smallest tiers (db-f1-micro, 2 × shared-core-nano,
  1 vCPU / 512 MiB): about USD 0.18 an hour, USD 131.74 a 730-hour month
  ([cost-quote.json](evidence/q13/cost-quote.json)). The project's one budget (USD 50, alerts
  USD 10/25/50) was reused; none created.
- **Applied** with eleven saved plans: VPC, Cloud NAT, PSA, PSC policy, Cloud SQL by socket,
  two Valkey instances (TLS, `AUTH_DISABLED`), Pub/Sub with dead letter and archive, seven service
  accounts and IAM, 17 secrets (`link-replay-keys` added), Artifact Registry, five services, the
  worker pool and the migration job, `QRWTY_PUBLIC_ORIGIN_URL` set. Two digests: Q06's app
  (`a99d60c7…`) and the same with the AG-13 fix (`fa158f69…`). Auth0: `qrwtya-api` and an M2M
  `qrwtya-web` for the probe.
- **Probes.** P01, P02, P04, P06, P07, P08, P09, P11 passed; P03 and P05 passed after IaC fixes;
  P10 and P12 partial. Valkey and Cloud SQL TLS: plain text refused, verify-full +PONG with each
  instance's own CA, the other CA refused, Cloud SQL refuses TLS without a client certificate.
  Migrations: two at once (one waits on the lock), a third with no template migration; no PUBLIC
  or admin CONNECT, no runtime CREATE. Pub/Sub: 20 ACKed publishes (p50 44.6 ms) dead-lettered by
  the worker stub with `NOT_IMPLEMENTED`, all 20 in the Avro archive, another account
  PERMISSION_DENIED. Auth0: A's token accepted; changed audience, foreign issuer, unknown key,
  malformed and expired tokens 401 (a validly signed other-audience token not run). Ingress:
  internal services closed to the Internet, public origins IAM-protected (403), run.app closed or
  protected. Rollout of image 2 under 1,501 requests: none failed; worker pool 1 → 2 → 1. P11's
  revision refused naming `PUBSUB_EMULATOR_HOST`. Guest create from inside: 503
  `reputation_unavailable` with Q06's code, then 201 with the fix and the link in Cloud SQL; Web
  Risk's test URLs 422. Not run: Stripe test mode (Q10a), old instances' exit codes (AG-17),
  D03 rollback and rotation.
- **A-found gaps (cloud)** ([details](evidence/q13/a-found-gaps.md)): AG-13 (medium) no workload
  identity for an External API; AG-14 (medium) tile calls send no ID token, so Cloud Run IAM can't
  protect a called service; AG-15 (medium) `/healthz` is reserved by Cloud Run's front end; AG-16
  (medium) no regional Pub/Sub endpoint under in-transit region enforcement; AG-17 (low) no drain
  or exit log line. AG-03, AG-04, AG-05 and AG-06 held as Q04 predicted.
- **IaC findings, fixed in `infra/gcp/`** (I-1 to I-10 in [gaps.json](evidence/q13/records/gaps.json)):
  fmt; CLUSTER_DISABLED Valkey has no discovery endpoints (the first apply failed late); one CA per
  instance; the job needed VPC egress; Cloud NAT (a fresh task's first connection through it failed
  for 12–48 s); the archive's 300 s ack deadline; volume order; a declared `traffic` block (a manual
  pin had survived the apply); Billing API internal and public origins IAM-protected.
- **Application change (AG-13).** `app/src/modules/link-api/link-operations/google-credentials.ts`
  (new), `reputation.ts`, `service.ts`, a unit test file and the production profile (overlay
  source and installed copy): `QRWTY_REPUTATION_CREDENTIALS=metadata` sends Web Risk Link API's
  service-account token; the preflight requires it. Under Node 24.21.0: build, test typecheck,
  Biome and 127 unit tests (9 new) pass; `verify-generated.py app`: 64 generated files unchanged.
- **qrwty.io route.** Not added: the Worker has no proxy code and A's public origins need an
  ID token (AG-14). No Cloudflare call.
- **Teardown.** Probe jobs, probe secret and service account by `gcloud`; archive objects; saved
  plans for protection off and destroy (`prevent_destroy` dropped only in a scratch copy of
  `pubsub.tf`); Auth0 `qrwtya-web` (and grant) and `qrwtya-api` deleted; local images removed by
  name. Nothing billable is left; budget kept; no image kept. **Spend:** about **USD 0.23**,
  computed from each resource's cloud lifetime at list prices ([spend.json](evidence/q13/records/spend.json));
  not a billing figure (billing reports lag; no export).
- **Q13b (free, USD 0 an hour).** Left: VPC `qrwtya-vpc`, subnet `qrwtya-run`, PSA range
  `qrwtya-psa` and its `servicenetworking-googleapis-com` peering, and two Cloud Run-managed
  `serverless-ipv4-cloudrun-*` reservations on the subnet. The subnet waits for Cloud Run to release
  those reservations; the PSA connection was refused three times (its producer, Cloud SQL, still
  held it). Teardown, once they release: `.scratch/Q13/tf.sh plan -destroy -out=plans/q13b.tfplan`
  then `.scratch/Q13/tf.sh apply plans/q13b.tfplan` (state in `.scratch/Q13/tf/`), or by name:
  `gcloud compute networks peerings delete servicenetworking-googleapis-com --network=qrwtya-vpc`,
  `gcloud compute addresses delete qrwtya-psa --global`, `gcloud compute networks subnets delete
  qrwtya-run --region=us-central1`, `gcloud compute networks delete qrwtya-vpc`; then
  `docs/evidence/q13/commands/inventory.sh` must list nothing.
- **Checks.** `validate.sh` exit 0; the probes above; the record renders offline in headless
  Chromium with every host unresolvable (desktop and 390 px) and its CSP allows no request; a
  by-value secret scan of the evidence and the unit's files is clean (below); teardown verified by
  inventory; ledger validates; `git diff --check` clean.
- **Read.** The packet, `AGENTS.md`, this file (S01, Q04, Q05 and its review, Q06), owner
  decisions §1–§4, §10–§12 and 2026-11-15, `units.md` (contract, Q12a, Q13), pack v1.6's D, G and
  R rows, `evidence/q04` (a-found gaps, probe manifest, records), `evidence/q06` a-found gaps,
  `infra/`, the app's runtime and Link API stub, `deploy/cloudflare/src/router.ts` and
  `wrangler.toml`. Nothing in qrwty-baseline; in `~/.config/qrwty/` only `auth0.env` (loaded with
  `set -a`, never printed). Arm B's resources were only listed by name in the inventory.
- **Elapsed.** About 90 minutes on `/proc/uptime` to the commit; the host clock shows 11:44Z to
  about 13:30Z (it runs ahead of uptime on this host).
- **Foreign context.** The session started with foreign Jeeves context (`AGENTS.md`, Git status, a
  memory index); it was ignored.

## S02: versions on qrwty.io and the results in the README, 2026-11-15

Shared unit, attempt 1 (ledger `shared-1025`, role implementer, phase `cloud`, since the schema
has no `report`), from QRWTY `814f6f9`. During the unit the coordinator committed `dd594d0` (QGR3)
and `364f283` (cloud leftovers removed). Arm B was read at `f2fb3ce` and never written. Full record:
[S02 checks](evidence/s02/checks.md).

- **Changed.**
  - `deploy/cloudflare/` serves `public/` as Workers static assets through the Worker (`ASSETS`,
    `run_worker_first`):
    - `/versions/`: the timeline and a "what each version could do" table;
    - `/versions/design/`: Q11's prototype;
    - `/versions/a/`: a new page with r83/r84 Detailed PNGs, the generated parts, Q06's slice and
      AG-01 to AG-17 with their fixes;
    - `/versions/a/deploy/`: Q13's record;
    - `/versions/b/`: B-final's record;
    - `/versions/original/`: a static copy of `qrwty-platform`'s page, fetched once from its
      workers.dev address. The Google Fonts links and the live-API script are left out.
  - The home page links to `/versions/`. A new Custom Domain, `b.qrwty.io`, answers `301` to
    `/versions/b/`.
  - CSP: S01's everywhere. Only `/versions/design/` (own scripts and styles, `data:`/`blob:`
    images) and `/versions/original/` (own stylesheet, `form-action 'none'`) widen it, and only to
    their own origin.
  - Root `README.md`: a Results section near the top (one table and short notes, then the
    limitations and the links), the status and live-sites lines, and the measurement tables' stale
    cells.
- **Checks.**
  - `pnpm check` in `deploy/cloudflare`: Biome, TypeScript, vitest 26/26.
  - The dirty deploy (`364f283…-dirty`): `check-live.sh` passed; every new path answered with the
    expected headers; `b.qrwty.io` gave `301` and its TLS verified.
  - Headless Chromium on the live site: 8 pages × 390/1440 px × light/dark, 32 loads, **0 external
    requests**, 0 broken images. The prototype's scripts ran. The only overflow is the original
    page's own 30 px.
  - A shape secret scan of all published files and the evidence found no credential. The
    workers.dev subdomain appears nowhere. Byte copies match their sources.
  - Cloudflare before/after: the only change is the `b.qrwty.io` Custom Domain and its managed
    record.
- **Numbers.**
  - A, from the committed runner: Q06 (G0 2,926 = 2,871 + 55; R 2,925, C 720, B 3,645, 80.25%) and
    A's last commit `a6f982b` (C 770, B 3,695, 79.16%).
  - B, with S02's counter on the runner's own parser and eligibility: 9,361 backend lines (77
    files), tests 11,058, SQL 476, infrastructure 13,193. source-loc-v2 drops B's
    `src/platform/config/` (1,752 lines).
  - Like for like: A 720 + 286 SQL = 1,006; B03 608 + 59 SQL = 667, plus 398 lines of facade.
  - Effort from the ledgers: A 5,203 requests (3,822 of them Jeeves template work), 29.5
    agent-hours, est. $453–513; B 3,064 requests, 21.7 h, est. $336–371; list prices, not a bill.
- **Findings.**
  - Through the binding, a folder path without its slash was served as is, which breaks relative
    links, so the Worker now answers `301`.
  - JSON Lines files carry no type, so they are served as text.
  - The packet's "F3" is QG09's fold F3 (QL01's reconnect bound, from B's B05 review F1).
  - `docs/benchmarks/status.json` is stale and outside this unit's writes.
- **Next.** After this commit, the worker redeploys from the clean tree and runs `check-live.sh
  <sha>`; the result is in the unit's report. The coordinator pushes.
  - `qrwty-platform` keeps workers.dev on; turning it off or deleting the Worker is the owner's
    call (S01's open choice).
  - Refresh a `/versions/` copy from its source, never by hand.
- **Read.** The packet, `AGENTS.md`, this file (S01, Q06, Q13), owner decisions 2026-11-15,
  run-status, the ledgers and their README, and the evidence of Q01, Q05, Q06 and Q13. Also B's
  B-final README and record, B's commit history and B05 review F3/F1, and Jeeves's committed QG
  plan, review-batch3 and QL README/owner summary/QL01. `~/.config/qrwty/`: only `cloudflare.env`,
  loaded with `set -a` and never printed.
- **Elapsed.** Started 13:28:44Z. A usage limit paused the session from about 13:45Z to 15:51Z, and
  it resumed with nothing running. The commit came about 16:10Z (host clock).
- **Foreign context.** The session started with foreign Jeeves context (`AGENTS.md`, Git status, a
  memory index); it was ignored. One `git log` and `ls` were run, read-only, in the Jeeves checkout
  at the start (see the checks, §6).

## A1: arm A regenerated from Jeeves 0aea8e7, 2026-11-15

Arm A, A1 attempt 1 (role implementer), from QRWTY `2956716`. Generator: Jeeves **`0aea8e7`**,
from `git archive` (without `docs/`) into `.scratch/A1/jeeves` with its own offline install. In the
Jeeves checkout only read-only Git ran (`rev-parse`, `show`, `archive`). Light checks, as the owner
decided: no oracle, no review, no cloud. Full record: [A1 checks](evidence/a1/checks.md).

- **Update.** `update:v2` from revision 84's canonical bytes (`4fbcd311…024d`) into `app/`.
  - The plan: **create 7, replace 37, unchanged 35, keep 3, keep-changed 11 (shadows), override,
    remove and orphan 0, refused 0**.
  - Manifest: 93 files (86 before), `f0eb002f…e024`.
  - Created: four `050-jeeves-idempotency.sql` files, and `runtime/{idempotency,settings,transaction}.ts`.
  - `package.json`, `pnpm-lock.yaml` and Link operations' SQL were `keep`: the new export's bytes
    equal the old export's. So **no package shadow arose**, and nothing in them needed merging.
  - A fresh export of the same input matches the updated `app/`, except the four application files.
- **Shadows merged** (all 11 stubs gain `export const settings = declareSettings({})`).
  - The 10 untouched stubs took the new text byte for byte.
  - Link operations was merged by hand (`records/link-operations-merge.diff`).
  - Then `.jeeves/generated/` was deleted (copy in `.scratch/A1/shadows/`).
- **Stub changes.** Link API's settings moved into `declareSettings` (QL05):
  - `QRWTY_PUBLIC_ORIGIN_URL`, `LINK_REPLAY_KEYS` (the file `link-replay-keys`, Q06's line format),
    `QRWTY_REPUTATION_CREDENTIALS` and `QRWTY_TEST_HOOKS`;
  - each kind carries Q06's own check (new `link-operations/settings.ts`);
  - `service.ts` builds the operations from `dependencies.settings` once per process
    (`linkOperationsFor`).

  A bad value now fails startup as `Invalid setting <NAME>`. Tests: the configuration tests use
  `readSettings`, the request literals gain QL02's `rawPath`/`signal`, and the integration harness's
  database gains rejecting `transaction`/`idempotent`. `transaction`, `idempotent` and
  `defineRoutes` were not adopted, since none would remove code (AG-18).
- **Contracts followed.**
  - **QG29:**
    - the overlay's setup-migrate uses `JEEVES_MIGRATE_TLS=verify-full` with
      `JEEVES_MIGRATE_CA_FILE`, in place of `PGSSLMODE`/`NODE_EXTRA_CA_CERTS`;
    - the preflight requires `JEEVES_MIGRATE_TLS` (`disable` only on a socket), in place of the
      `PGSSLMODE` rule;
    - the GCP migration job sets `disable` (socket).
  - **QG34:**
    - the preflight no longer links secret volumes. Each credential's `JEEVES_SECRET_<NAME>_FILE`
      must name its own volume (`/dev/null` for an `AUTH_DISABLED` cache), and a stray file
      variable is refused;
    - the commands drop `SECRET_DIR=/tmp/qrwty-secrets`;
    - `infra/gcp/locals.tf` (`secret_files`) and `profile-check.mjs` set the variables.
  - **QG28:** `infra/gcp/locals.tf` names the subscription
    `click-events--analytics-worker--analytics-worker-click-aggregator` (and `.failed`).

  The overlay was installed into `app/`, and `infra/README.md` updated.
- **Checks.**
  - `app/`: build, `typecheck:test`, Biome and **129 unit tests** pass.
  - Root: `build`, `typecheck` and `check` pass; `verify-generated`: **71 generated files
    unchanged**.
  - `infra/gcp/validate.sh` ok (`tofu console` confirmed the variable names).
  - Preflight, offline: 12/12 cases.
  - **`first-run`** (`qrwtya-a1`, two copies, verify-full TLS) exit 0 in 117 s, 18 containers
    healthy.
  - **Smoke 6/6.** Guest create **201** on copy 1, replayed on copy 2, 409 for another body, 422 for
    a Web Risk threat, 400 without a key; the link is in PostgreSQL.
  - An invalid `QRWTY_PUBLIC_ORIGIN_URL` fails Link API's startup, naming it.
  - The production profile with per-secret files starts Link API ready.
  - Secret scan: no credential.
- **New gaps** ([details](evidence/a1/a-found-gaps.md)):
  - AG-18 (medium): `idempotent()` stores the answer in plaintext, so it can't replay a one-time
    claim proof;
  - AG-19 (low): setting kinds have no enumeration or custom check;
  - AG-20 (low, tooling): `update:v2` lists no create/replace paths;
  - AG-21 (low, docs): the stub's settings comment omits `JEEVES_SECRET_<NAME>_FILE`.

  QG34 closed AG-03, AG-09 is gone, and QL05 closed AG-10. AG-04 and AG-05 still hold. The README
  shows no fix for AG-13–AG-16.
- **Docker.** `qrwtya-a1` (stack, volumes, network), `qrwtya-a1-rehearsal` and the image
  `qrwtya-a1-app` were removed by exact name, with no prune. The Web Risk fixture was stopped, and
  nothing is left running.
- **Not done here.**
  - LOC: `tools/loc/pins.json` stays on `4e87f97` for the recorded A/B numbers.
  - No ledger record, which the packet didn't ask for.
  - `infra/q12a/probe-manifest.json` keeps Q13's old names, as a record.
- **Next: A2** (deploy skeleton on qrwty.io). The IaC already follows QG28/QG29/QG34; its first
  apply will show whether `/dev/null` works as the empty cache credential on Cloud Run. Session API
  still has no `/api/v1/links` facade (Q07's work).
- **Read.** The packet, `AGENTS.md`, this file (Q05, Q05 review, Q06, Q13, S02), owner decisions
  2026-11-15, the generated README and runtime, `update.ts`/`update-cli.ts` at `0aea8e7`, the
  overlay, `infra/gcp`, `infra/local`, the pack's Web Risk fixture. `~/.config/qrwty/` was not read.
- **Elapsed.** 18:05:51Z to about 18:30Z on the host clock (about 25 minutes), a clock earlier units
  found to jump.
- **Foreign context.** The session started with foreign Jeeves context (`AGENTS.md`, Git status, a
  memory index); it was ignored.

## A2: arm A's stack live behind qrwty.io, 2026-11-15

Arm A, A2 attempt 1 (role implementer, phase cloud), from QRWTY `a0ddd52`. During the unit the
coordinator committed `834a6bf` (queue A8). That commit also took this unit's staged rename
`infra/gcp/terraform.tfvars.example` → `qrwtya.tfvars`, without its content; this commit carries
the content. OpenTofu 1.13.2 and the google 8.8.1 mirror from `.scratch/tools/`. Light checks, as
the owner decided. Status: **done. Everything below keeps running on the trial credit.**

- **Live.**
  - `https://qrwty.io/healthz` →
    `200 {"service":"session-api","application":"ready","probe":"GET /modules/session-api-sign-in-flow","probeStatus":501}`.
  - `https://qrwty.io/api/*` and `/auth/*`, any method → Session API's API forwarding and sign-in
    stubs. Both still answer `501 NOT_IMPLEMENTED`: `POST /api/v1/links` and `GET /auth/login`.
  - `/`, `/build.json`, `/versions/`, `www` and `b.qrwty.io` are unchanged.
  - Session API's origin is `https://qrwtya-session-api-523800841789.us-central1.run.app`.
- **Deployed** (`us-central1`).
  - **Cloud Run services:** five, minimum 0 and maximum 3 instances.
    - `qrwtya-session-api` is public and open: unauthenticated invocation, because the Worker
      can't send an ID token (AG-14).
    - `qrwtya-redirect-service` has public ingress but is IAM-protected (403) until A4. Its minimum
      went from 1 to 0.
    - Link, Account and Billing API are internal; the Internet gets Google's 404.
  - **Worker pool:** `qrwtya-analytics-worker` at **0** instances.
  - **Migration job:** `qrwtya-migrate`. Three executions, all exit 0.
  - **Stores and messaging:** Cloud SQL `qrwtya-pg` (db-f1-micro), two Valkey shared-core-nano
    instances, Pub/Sub `click-events` (3 subscriptions, 2 topics) and the archive bucket.
  - **Credentials and identity:** 17 secrets and 7 service accounts.
  - **Network:** VPC, Cloud NAT, PSA, and the PSC policy with 4 endpoints.
  - **Image:** in Artifact Registry `qrwtya-images` (the packet's "`qrwtya`"),
    `app@sha256:e3d066ce…00a8`, tagged `app-6320d63342a1` and `834a6bff22d2`. It is `app/` as A1
    left it.
  - **State:** `gs://qrwtya-tfstate-523800841789/infra/gcp`, a new versioned bucket created by
    hand (`versions.tf` now has `backend "gcs" {}`).
  - **Auth0:** API `qrwtya-api` (`https://api.qrwtya.qrwty.io`, RS256, 300 s tokens, offline
    access allowed), created because none existed. Nothing else was created; A3 adds the web
    application and users.
- **How it was applied.**
  1. Saved plan 01 (95 resources): `-exclude` left out the three Cloud Run resources, so a
     digest-shaped placeholder image was enough. Applied in about 13 minutes.
  2. `bootstrap-secrets.py`: 15 versions piped to Secret Manager, and the `postgres` password set
     through the SQL Admin API.
  3. `redeploy.sh` run 1: job plan (1 add) and an execution, then the stack plan (6 add). The
     smoke failed on `/healthz` (below).
  4. Run 2: a rebuilt digest, 1 + 6 changes. Smoke 4/4.
  5. Run 3: image reused, both plans "No changes". Smoke 4/4.

  Q13's I-1 to I-10 fixes were already in the IaC, and nothing broke this time.
- **IaC** (application-owned):
  - `locals.tf`: `open = ["session-api"]`, and the Redirect service at minimum 0.
  - `run.tf`: `invoker_iam_disabled` also for `local.open`.
  - `versions.tf`: the GCS backend.
  - `qrwtya.tfvars` (committed; no credential): `reputation_credentials = "metadata"` (the
    profile requires it) and `analytics_workers = 0`.
  - New `infra/gcp/scripts/`: `tf.sh`, `bootstrap-secrets.py` and `redeploy.sh`.
    - `tf.sh` copies the `.tf` files into a working directory and reads only `AUTH0_DOMAIN`
      from `auth0.env`, in a subshell. `TF_VAR_image` defaults to the job's image.
      `QRWTY_TF_TEARDOWN=1` drops the `prevent_destroy` guards in the working copy.
    - `bootstrap-secrets.py` is Q13's, adapted.
- **Worker** (`deploy/cloudflare/`, the `qrwty-edge` code and vars only; no DNS, zone or route
  change).
  - `SESSION_API_ORIGIN` is in `wrangler.toml` `[vars]`, and `deploy.sh`'s `--var` values merge
    with it.
  - `/api*` and `/auth*` go to `/modules/session-api-api-forwarding<path>` and
    `/modules/session-api-sign-in-flow<path>`, so **each stub sees the public path**
    (`/api/v1/links`, `/auth/login`).
  - The method, body, cookies and every `Set-Cookie` pass through, with `redirect: manual`.
    `X-Forwarded-For` is `CF-Connecting-IP`; `X-Forwarded-Host` and `-Proto` are set; `cf-*` and
    hop-by-hop headers are dropped. The answer gets the security headers and `no-transform`.
    Unreachable gives 503 JSON.
  - `deploy.sh` and `check-health.mjs` now poll `/build.json`, since `/healthz` is A's. `check-live.sh`
    expects A's `/healthz`.
  - **Edge header: none.** A's code checks none, so Session API's run.app URL is reachable from
    the Internet without Cloudflare. A3 can add a shared-secret header check in its stub if
    wanted.
- **`/healthz` and AG-15** (more evidence, not a new gap).
  - `run.app` answered Google's HTML 404 to `/healthz`, `/health%7A`, `/health%7a`,
    `/healthz?x=1`, `//healthz` and `/healthz;`. The front end decodes and keeps them.
  - `/healthz/` and `/HEALTHZ` reach the process but miss the route (Fastify 404).
  - So the Worker asks `GET /modules/session-api-sign-in-flow`. The generated admission admits a
    stub request only once the process is ready (otherwise `503 UNAVAILABLE`), so any answer
    below 500, or 501, counts as ready. The answer names the probe and its status.
- **`/dev/null` works** as the empty cache credential on Cloud Run.
  - Link API's `JEEVES_SECRET_CACHE_ADMISSION_CACHE_FILE` and the Redirect service's
    `…HOT_ROUTES_FILE` are `/dev/null`.
  - At startup both logged cache `PING ok` over verify-full TLS, alongside `profile-ok`, the
    `SELECT 1` probes, the topic probe and `Application ready` in every service.
- **Redeploy:** `infra/gcp/scripts/redeploy.sh <release> [--allow-dirty]`, for example `HEAD`.
  Documented in [infra/README.md](../infra/README.md#redeploy).
  1. The image, tagged `app-<12 of app/'s git tree hash>`. An existing tag is reused, because a
     rebuild of the same files got a new digest (`1b328df…` vs `e3d066ce…`, from the build-time
     attestation). The unused digest was deleted.
  2. The job plan, applied, then the job executed with `--wait`.
  3. The stack plan, refused if it would delete or replace anything, then applied.
  4. `deploy.sh` for the Worker.
  5. The smoke: `/healthz` ready, `/versions/` 200, and JSON from Session API on `/api` and
     `/auth`.

  About 3 minutes; the migration job takes 2.5 of them. Set `QRWTY_REDEPLOY_DIR` to the unit's
  scratch.
- **Credit (trial credit, no charge).** Idle, at Q13's list prices: about **USD 0.124 an hour, USD
  3.0 a day** (about USD 90 for 30 days).

  | Item | USD a day |
  | --- | --- |
  | Valkey, 2 nodes | 1.53 |
  | 4 PSC endpoints | 0.96 |
  | Cloud SQL and disk | 0.31 |
  | Cloud NAT and IP | 0.15 |
  | Secrets | 0.03 |

  Cloud Run, the worker pool, the images and the state bucket come to about 0 while idle; requests
  add request-based CPU. The budget's USD 10, 25 and 50 alerts come after about 3, 8 and 17 days.
- **Checks.**
  - `infra/gcp/validate.sh` ok (lint 0 errors; fmt, init and validate 0), and the lint self-test
    8/8.
  - `deploy/cloudflare`: `pnpm check` passes (Biome, tsc, vitest **30/30**, 4 of them new).
  - Root `pnpm check` exit 0, with 71 generated files unchanged.
  - Redeploy smoke 4/4 on runs 2 and 3, and `check-live.sh` all passed.
  - Ingress as above.
  - A read-only `plan -destroy` with the teardown switch gives 102 to destroy (not saved). A plain
    plan gives "No changes".
  - The secret scan (shapes, plus the Auth0 and Cloudflare values matched without printing) is
    clean, and `git diff --check` is clean.
- **Running; teardown.** Everything above. Exact commands are in
  [infra/README.md](../infra/README.md#teardown):
  1. Set protection off with a saved plan (`-var=deletion_protection=false`).
  2. Run `QRWTY_TF_TEARDOWN=1 tf.sh plan -destroy … -out` and apply it.
  3. Run Q13's `auth0.py delete`.
  4. `gcloud storage rm -r gs://qrwtya-tfstate-523800841789`.
  5. Run `inventory.sh`.
- **Template gaps:** none new. AG-15 has the evidence above, and AG-14 is why Session API is open.
- **Next: A3** (sessions). Session API's stubs receive `/api/…` and `/auth/…` as their `path`.
  The Auth0 callback would be `https://qrwty.io/auth/…`.
- **Read.**
  - The packet, `AGENTS.md`, this file (Q13, S02, A1), and the owner decisions of 2026-11-15.
  - Q13's checks, gaps and commands, `infra/` and `deploy/cloudflare/`.
  - The app's `http.ts`, `tile-http.ts`, `admission.ts`, Session API's process and stubs, and the
    production profile.
  - `~/.config/qrwty/`: `auth0.env` and `cloudflare.env` only, loaded with `set -a` and never
    printed.
- **Elapsed.** 18:30:33Z to about 19:15Z on the host clock (about 45 minutes).
- **Foreign context.** The session started with foreign Jeeves context (`AGENTS.md`, Git status, a
  memory index); it was ignored.

## A3: sign-in, sessions and my links on qrwty.io, 2026-11-15

Arm A, A3 attempt 1 (role implementer), from QRWTY `0994ede`. Q07 of `units.md`, written in the
application-owned stub bodies and product SQL of Session API, Link API and Account API, against pack
v1.6's `decisions.md`, `http-contract.md` and `product-contract.md`. Light checks, as the owner
decided: no oracle, no review, no records. Status: **done**: sign-in, sessions, my links and
account deletion work live; two small follow-ups are named as **A3b** below.

- **Live on `https://qrwty.io`** (smoke, headless Chromium through Auth0 Universal Login, 18/18):
  1. guest create: `GET /api/v1/session` issues a guest cookie and CSRF token; `POST /api/v1/links`
     answers 201 with a claim proof (Web Risk checked the destination);
  2. sign-in as the test user: `/auth/login?returnTo=…` → Universal Login → `/auth/callback` →
     back to `returnTo`; the cookie is `__Host-qrwty`, `Secure`, `HttpOnly`, `SameSite=Lax`, and
     `/api/v1/session` says `authenticated: true` with the account's email; the guest's CSRF token
     is refused (403);
  3. claim: 200, version 2, `owned: true`; the same key replays (`Idempotent-Replayed`);
  4. my links: `GET /api/v1/me/links` lists it; `GET /api/v1/me` counts it;
  5. edit: `PATCH` with a stale `If-Match` is 412; with `"2"` it is 200 and `ETag: "3"`; a read
     gives version 3;
  6. sign-out: `POST /auth/logout` 204;
  7. the old cookie is refused: 401 `session_expired` on my links, and 401 (not a guest 201) on
     create; the browser is a guest again; a never-issued cookie is 401.

  A second smoke (8/8) deleted the test account: `DELETE /api/v1/me` without `Idempotency-Key` is
  400; with one it is 202 `{deletionScheduled: true}`; the old cookie is 401; signing in again
  (silently, through the issuer's own session) gives an empty list, the links no longer owned. A
  signed-in create is 201 `owned: true` with no claim proof. A third smoke (5/5) signed in, waited
  250 s (the 300 s access token then has under 60 s left, so the next request refreshes it with the
  rotating refresh token): my links 200, then three parallel requests 200, then sign-out 204.
- **How the owner signs in.** Open `https://qrwty.io/auth/login` (optionally `?returnTo=/path`),
  then sign up or sign in with an email and password, or "Continue with Google" (Auth0's
  development keys). It returns to `/`, still the Worker's placeholder page until A5's UI.
  `https://qrwty.io/api/v1/session` and `/api/v1/me/links` show the session and the links in the
  address bar; mutations need the UI (the Worker's CSP blocks console `fetch`). Sign-out is
  `POST /auth/logout` with the CSRF token; `GET /auth/logout` ends the issuer's own session too.
- **Auth0** (`infra/gcp/scripts/auth0.py`, Management API from `auth0.env`; qrwtya- only, plus the
  two connections enabled for qrwtya-web):
  - Regular Web Application `qrwtya-web`: code and refresh-token grants, callback
    `https://qrwty.io/auth/callback` and logout `https://qrwty.io/` only, rotating refresh tokens
    (7 days, 24 hours idle, 30 s reuse leeway), ID tokens 300 s, `client_secret_post`;
  - its user grant to `qrwtya-api`;
  - `Username-Password-Authentication` (sign-ups allowed) and `google-oauth2` enabled for it;
  - one test user, `qrwtya-test-<6 hex>@qrwty.io`, password generated in the script.

  Its `{client_id, client_secret}` and the test user's `{username, password}` went straight to
  Secret Manager (`qrwtya-signin-client`, `qrwtya-auth0-test-user`, stdin only). The test user
  deleted its own account in the second smoke; the Auth0 user still exists (below).
- **Session API** (`src/modules/session-api/session/`, both stubs, and the Sessions SQL in the
  sign-in flow's module file, which API forwarding calls by its schema):
  - code + PKCE S256, `state` and `nonce`: each attempt is a row for 10 minutes (state, nonce and
    browser-binding hashes; the verifier sealed), taken once by the callback, which also checks a
    `__Host-qrwty-signin` binding cookie; cancel and failure return with `signin=cancelled|failed`;
    `returnTo` must be a same-origin relative path;
  - ID token and access token verified with the generated `createPrincipalVerifier` (issuer,
    audience, expiry, RS256, the tenant's key set, one shared `createRemoteJWKSet`), nonce by hash,
    the same subject in both;
  - sessions: a guest is a stateless MAC'd cookie (never an identity); an account session is a row
    named by the SHA-256 of its cookie token, with the access and refresh tokens and the profile
    sealed (AES-256-GCM, `SESSION_KEYS`); 7 days absolute, 24 hours idle, revocation empties the
    sealed tokens; a sign-in never continues an earlier cookie;
  - CSRF: `X-CSRF-Token` must be the MAC of the session cookie, on every mutation and on
    `POST /auth/logout`;
  - the access token (300 s) is refreshed 60 s before it expires; a lost refresh race uses the
    winner's stored tokens; an issuer refusal revokes the session (401);
  - forwarding: only `Idempotency-Key`, `If-Match`, the JSON body and the session's bearer (or, for
    a guest, an opaque `QRWTY-Guest-Scope`) go downstream; a browser-sent `Authorization` is 401;
    runtime-shaped downstream errors are mapped to the product shape;
  - routes: `/api/v1/session`, `/api/v1/links` (create), `/api/v1/links/:id` (GET, PATCH, DELETE),
    `/api/v1/links/:id/claim`, `/api/v1/me/links`, `/api/v1/me` (GET, DELETE) and `/auth/login`,
    `/auth/callback`, `/auth/logout` (POST, and GET for the issuer's sign-out).
- **Link API** (`link-operations/owned.ts`, `view.ts`, `service.ts` now a `defineRoutes` table):
  read, edit (destination, state, expiry; `If-Match`, 428/412, 409 `blocked_by_operator`, Web Risk
  on a new destination), disable, enable, delete (repeat-safe tombstone), claim and account erasure,
  each scoped by the owner key of the verified subject; another account's link and an unknown ID are
  404. Claim runs `claim_link` inside the generated `idempotent` (the answer holds no secret);
  edit and delete use the generated `transaction`; owned create (signed in) uses `idempotent` and
  spends the month's allowance. Product SQL step 2: `owner_key`, `account_usage` (owned-link
  creations per account and UTC month, `free-test-v1`'s 5 until A7's entitlements), and
  `account_erasures`; `claim_link`, `spend_owned_create`, `erase_account` and the owner view
  `published.owned_links`. `links_guard` now lets an erasure clear a tombstone's owner and refuses
  a change of owner.
- **Account API** (`my-links/routes.ts`): `GET /links` (newest first by `(created_at, id)`, limit
  1–50, default 20; the cursor carries the owner's tag, so another account's is 400
  `invalid_cursor`) and `GET /me`, from `published.owned_links` by owner key.
- **Account deletion** (decisions §3): Link API's `erase_account` disables every active owned link
  (410 once A4 serves redirects), removes its owner (and from tombstones), forgets the claim proofs
  it consumed, removes its create replays and usage, and logs the erasure by key; then every session
  of the account is revoked and its refresh tokens revoked at the issuer. Not yet: the Auth0 user
  itself (A3b), the subscription's cancellation (A7), and `link_versions`' destination history.
- **Infrastructure.**
  - `infra/gcp/locals.tf`: Session API's `SIGNIN_ISSUER_URL`, `SIGNIN_AUDIENCE`,
    `QRWTY_PUBLIC_ORIGIN_URL` and its secrets `signin-client` and `session-keys`; Account API's
    `QRWTY_PUBLIC_ORIGIN_URL`; the secret `auth0-test-user` (mounted by nothing).
  - The new secrets and readers were applied with a targeted plan (5 added) before the redeploy;
    `bootstrap-secrets.py` generates `session-keys` (the generated `keyRing()` JSON) and leaves the
    two Auth0 secrets to `auth0.py`.
  - The production profile (overlay, installed into `app/`) lists the new settings and secrets.
  - `infra/README.md`: the sign-in setup and its teardown (`auth0.py delete`).
- **Deploy.** `QRWTY_REDEPLOY_DIR=.scratch/A3/redeploy infra/gcp/scripts/redeploy.sh HEAD` at
  `23c8be6` (this unit's code, committed before the deploy, as `redeploy.sh` builds a commit):
  image `app-2ebc21736f83` (`sha256:39c54dfb…0864663`), the migration job changed and executed
  (step 2 and the Sessions SQL applied), 6 stack changes, the Worker redeployed, its smoke 4/4
  (cookieless create 401, `/auth/login` 302); the three smokes above ran on it. After a one-line
  test lint fix and these docs were folded into the commit, it ran again at `d145e32`: image
  `app-18b2fca2fafa` (`sha256:3be2cb4c…b993ad`), 1 + 6 changes, smoke 4/4, and the main smoke again
  18/18. The unit commit itself (docs only beyond `d145e32`) is redeployed last, so `/build.json`
  names it.
- **Checks.**
  - `app/`: build, `typecheck:test` and Biome pass; **141 unit tests** (12 new in
    `test/unit/session.test.ts`, the create tests updated).
  - **Integration on PostgreSQL 17.11** (`infra/local/test-postgres.sh`, removed afterwards):
    **27 passed**, 7 new in `test/integration/owned.test.ts`: two accounts and the proof holder;
    six parallel claims by two accounts, one winner; an expired proof 410 then claimable; list,
    cursor pages, another account's cursor 400, limit 51 400; 404 for another account on read, edit
    and delete; 428 and 412; five parallel edits with one `If-Match`, one 200 and four 412; delete
    twice 204; five owned creates then 403 `quota_exceeded`, and the claim over the limit 403;
    erasure; the Sessions SQL applied twice, one-time attempts, the refresh race and revocations.
  - Root `pnpm check`: exit 0, 71 generated files unchanged.
  - `infra/gcp/validate.sh` (pinned OpenTofu and mirror): lint ok, fmt, init and validate 0.
  - Secret scan of the staged diff: no `auth0.env` value, no credential shape.
- **Template gaps** ([details](evidence/a3/a-found-gaps.md)): AG-22 (medium) no browser-session
  template, so the whole BFF is application code; AG-23 (low) `defineRoutes`'s own 404/405/400 have
  a fixed shape; AG-24 (low) a `published` view is readable by every login on the database; AG-25
  (low) settings are per stub, so Session API declares them twice.
- **Known limits.**
  - Session API's request timeout is the diagram's 1,000 ms. It bounds the token exchange, a
    refresh and the downstream call. A downstream service at minimum 0 that starts cold could take
    longer, and the browser would get 503; the smoke saw none (each call took one attempt).
  - The local Compose profile doesn't set Session API's new settings, and the issuer paths are
    Auth0's (`/authorize`, `/oauth/token`, `/oauth/revoke`, `/v2/logout`), not Keycloak's, so
    `pnpm first-run` won't start Session API locally. The live stack is the test bed now.
  - The allowance is the test fixture `free-test-v1` (5 a month) for every account until A7.
- **A3b** (small, not blocking A4):
  1. Account deletion also deletes the Auth0 user: an M2M application `qrwtya-account-erasure`
     with only `delete:users` on the Management API, its credential in Secret Manager, called after
     the Links erasure (today the user stays at the issuer, so signing in again starts an empty
     account with the same subject).
  2. The local Compose profile for Session API: its settings and secrets in
     `infra/app-overlay/compose.override.yaml` and `infra/local/app-secrets.sh`, and the issuer's
     endpoint paths from its discovery document, so Keycloak works locally as Auth0 does live.
- **Next: A4** (redirect and analytics). Redirects can read `published.link_routes`; a disabled or
  erased link is already `disabled` there.
- **Read.** The packet, `AGENTS.md`, this file (Q06, A1, A2), the owner decisions of 2026-11-15,
  `units.md` (Q06, Q07), pack v1.6's `decisions.md`, `http-contract.md`, `product-contract.md` and
  the acceptance rows A04–A08, A14 and A15; `architecture.md`; the generated README, runtime,
  process files and stubs; Q06's Link operations; Q13's `auth0.py`; `infra/` and the Worker's
  router. `~/.config/qrwty/`: `auth0.env` only (for `tf.sh` and `auth0.py`, loaded with `set -a`,
  never printed); `cloudflare.env` only through `deploy.sh`.
- **Running.** Nothing locally: the test PostgreSQL was removed by name. Live: everything A2 left,
  plus the Auth0 objects and three secrets above.
- **Elapsed.** 19:10:44Z to about 20:00Z on the host clock (about 50 minutes), a clock earlier
  units found to jump.
- **Foreign context.** The session started with foreign Jeeves context (`AGENTS.md`, Git status, a
  memory index); it was ignored.

## A4: short links redirect and clicks are counted on qrwty.io, 2026-11-15

Arm A, A4 attempt 1 (role implementer), from QRWTY `3bdc60c`. Q08 and Q10 of `units.md`, written in
the application-owned stub bodies and product SQL of the Redirect service, the Analytics worker,
Account API and Session API, against pack v1.6's `decisions.md`, `http-contract.md`,
`product-contract.md` and `durable-clicks.md`. Light checks, as the owner decided: no oracle, no
review, no records. Status: **done**; no A4b is needed (known limits below).

- **Live on `https://qrwty.io`** (`.scratch/A4/smoke.mjs`, headless Chromium through Auth0
  Universal Login, 10/10):
  1. guest create: 201, `https://qrwty.io/My94GqMtq4`;
  2. `GET /My94GqMtq4` (a browser's user agent): 302, `Location` equal to the destination, a
     `QRWTY-Click-Event` UUID, `Cache-Control: no-store, no-transform`, 408 ms from this machine
     (110 ms at the service, the Pub/Sub ACK included); a second GET with `curl/8.5.0`: 302;
  3. `HEAD`: 302 with the same `Location`, no `QRWTY-Click-Event`, no event;
  4. sign-in as A3's test user, then the claim: 200, `owned: true`;
  5. `GET /api/v1/links/<id>/analytics` showed `{recordedAttempts: 2, filteredClicks: 1}` (the curl
     GET is a bot, HEAD none) **3 s after the click**, `freshness {delayed: false, lagMs: 1070}`,
     `reconciliation ok`, 7 days, `breakdowns: null`; `.../analytics.csv`: 200 `text/csv`, the
     header line and 7 rows, the last `2026-11-15,2,1`; an unknown link's analytics 404;
  6. an unknown slug, `/Zz0Zz0Zz0Z`: the Redirect service's 404 page, no `Location`.

  The services logged no error; the HEAD was served from Hot routes in 3 ms at the service.
- **Routing on qrwty.io** (`deploy/cloudflare/`, the `qrwty-edge` Worker):
  - `GET` and `HEAD /<slug>`, a single path segment of exactly 10 base62 characters, go to the
    Redirect service, `/modules/redirect-service-resolve-and-redirect/<slug>`
    (`REDIRECT_SERVICE_ORIGIN` in `wrangler.toml`). The query, cookies, `Authorization` and the
    browser's address stay behind; `User-Agent` and `Referer` pass; `X-Forwarded-Host: qrwty.io`.
  - Another method on a slug path gets the Worker's 405 `Allow: GET, HEAD`. Unreachable: 503 with
    `Retry-After: 1`, no `Location`.
  - No reserved path has that shape: `/`, `/versions/`, `/api/`, `/auth/`, `/healthz`,
    `/build.json`, `/app/`, `/assets/` keep their answers (unit-tested); `www` still 301s.
  - `qrwtya-redirect-service` allows unauthenticated invocation (`local.open`, as A2 did for
    Session API; AG-14). `deploy.sh` loads `~/.config/qrwty/cloudflare.env` as before.
- **Redirect service** (`src/modules/redirect-service/redirect/`, the stub body):
  - the host must be the public origin's (`QRWTY_PUBLIC_ORIGIN_URL`, now a declared setting of the
    stub, set in `infra/gcp/locals.tf`, the production profile and the local override), else 404;
    the slug must be 10 base62 characters, else 404; GET and HEAD only, else 405;
  - the route: Hot routes when the entry is still valid, else `published.link_routes` (domain 1,
    with the Redirect service's own login). Each entry carries an absolute `validatedUntil`, its
    read + 30 s, checked on every hit and never extended; no negative caching. Misses for one slug
    share one read per process (coalescing), with at most 16 reads in flight (else 503). A cache
    failure falls back to the database; both down is 503;
  - states: unknown 404, disabled, deleted or expired 410, blocked 403 (a safety page with no
    destination); all error pages are short HTML with `no-store` (the generated service sets it);
  - GET: a click event v1 (http-contract §6) with a server-made UUID, published with
    `messageId = eventId` and awaited. Only coarse fields: device class (filter-v1's bot rule), the
    referrer's host (never a path, query or IP), `country: null` and `synthetic: false` (both need
    an authenticated edge, which doesn't exist yet). A rejected or late publish is 503,
    `Retry-After: 2`, no `Location`, with the event ID (it may be stored). After the ACK, expiry and
    the entry's deadline are checked again (410 or 503 with the event ID); only then 302;
  - **the diagram's setting:** the Redirect service's Request timeout stays 1000 ms. The generated
    publisher's 2000 ms (and the database client's 2000 ms) are longer, so the stub bounds the
    publish at **500 ms**, the route read at 400 ms and the whole answer at 850 ms; the stub, not
    the admission's 503 `DEADLINE`, answers (AG-26).
- **Analytics worker** (`src/modules/analytics-worker/clicks/`, the stub body, and the module's
  product SQL, step 1): it consumes `click-events--analytics-worker--analytics-worker-click-aggregator`.
  - Each valid event within the replay horizon (31 days back, 5 minutes ahead) is one call of
    `record_click`: the receipt (`click_receipts`, keyed by event ID) and the daily aggregate
    (`click_daily`: recorded attempts with bots, filtered clicks without, synthetic apart) commit in
    one statement, and the generated loop acknowledges only after it returns. A duplicate counts
    nothing; ten simultaneous copies of one event count once (integration test).
  - Anything else (malformed, another schema, a `messageId` that isn't the event ID, outside the
    horizon) goes to `click_quarantine` with its bytes (64 KiB at most) and a reason, once per
    message and reason, and is acknowledged; a database failure throws, so the loop keeps the
    message.
  - Retention: `purge_expired` deletes at most 1,000 receipts past 35 days and aggregate rows past
    13 months, oldest first, at most once a minute as messages arrive (AG-29). Storage: one receipt
    (about 80 bytes with its index) per event for 35 days, one aggregate row per link and day.
  - No row holds an IP address, user agent, referrer path or query, destination or cookie.
  - The archive subscription and the analytics subscription are unchanged from Q04/Q13 (31 days, no
    expiry, dead letters after 100 attempts).
  - The worker pool runs **1** instance (`analytics_workers = 1`).
- **Owner analytics** (`src/modules/account-api/link-analytics/routes.ts`, a `defineRoutes`
  table; Session API forwards `GET /api/v1/links/:id/analytics` and `.../analytics.csv` with only
  `from` and `to`, and relays the CSV text and its file name):
  - ownership from `published.owned_links` by the verified subject's owner key: another account's
    link and an unknown ID are 404;
  - the range: inclusive UTC dates, default the last 7 days; a bad date 400 `invalid_request`,
    `from` after `to` or over 366 days 400 `invalid_range`, before the tier's lookback 403
    `tier_restricted`;
  - the answer has http-contract §7's fields: `totals`, a `series` with every day, `breakdowns:
    null`, `freshness {asOf, delayed, lagMs}` (the last commit, and that event's lag; delayed above
    60 s), `reconciliation` (`incident` while the link, or an event with no valid link, has an open
    quarantine; else `delayed` or `ok`), `filter` (`filter-v1` with its definition) and
    `lookback {maxDays: 7, limitedByTier}`;
  - the CSV: `date,recorded_attempts,filtered_clicks`, spreadsheet-safe cells, CRLF lines,
    `Content-Disposition: attachment`.
- **Jeeves helpers.** Used: the generated Pub/Sub publisher and loop, `defineRoutes`,
  `declareSettings`. Not used: `transaction` (each change is one SQL function call, so it would
  only add round trips), `idempotent` (it keeps 24-hour HTTP answers, not 35-day event receipts;
  AG-30) and `signal` (the publisher and the database client take none; AG-26).
- **Deploy.** `QRWTY_REDEPLOY_DIR=.scratch/A4/redeploy infra/gcp/scripts/redeploy.sh HEAD` at
  `8c65c6e` (this unit's code, committed first because `redeploy.sh` builds a commit; this commit
  amends it with these docs, then the same command ran again so `/build.json` names it): image
  `app-466d66adef65` (`sha256:4ee32a3d…f95b`); the migration job changed and executed (Analytics
  step 1 applied); 6 stack changes (5 services and the worker pool); the Worker redeployed; the
  redeploy smoke **5/5**, which now includes the unknown slug's 404 from the Redirect service.
- **Checks.**
  - `app/`: build, `typecheck:test` and Biome pass; **160 unit tests** (19 new:
    `test/unit/redirect.test.ts`, `test/unit/clicks.test.ts`).
  - **Integration on PostgreSQL 17.11** (`infra/local/test-postgres.sh`, removed afterwards):
    **31 passed**, 4 new in `test/integration/clicks.test.ts`: a claimed link's redirect through
    `published.link_routes` with the Redirect service's login (which can't read the tables), HEAD
    without an event, 410 once disabled; the events fed to the aggregator on a fresh Analytics
    database (product SQL applied twice and granted as `migrate.mjs` does): one recorded, a
    redelivery a duplicate, ten simultaneous copies counted once, poison quarantined once; the
    owner's report (2 recorded, 1 filtered, `incident` then `ok` once repaired) and CSV; another
    account and an unknown ID 404; Account API's login can't read the tables; the purge in bounded
    batches (3, then 2).
  - `deploy/cloudflare`: `pnpm check` passes (Biome, tsc, vitest **33/33**, 3 new).
  - Root `pnpm check`: exit 0, 71 generated files unchanged.
  - `infra/gcp/validate.sh` (pinned OpenTofu and mirror): lint ok, fmt, init and validate 0.
  - Secret scan of the staged diff (credential shapes): none. `git diff --check` clean.
- **Template gaps** ([details](evidence/a4/a-found-gaps.md)): AG-26 (medium) the generated
  publisher's and database client's bounds exceed the tile's Request timeout, and take no deadline
  or signal; AG-27 (low) the publisher sets no attribute but `messageId`, so §6's `schemaVersion`
  attribute is missing; AG-28 (low) the cache has no conditional write; AG-29 (medium) no timer for
  a worker stub and no backlog signal for freshness; AG-30 (low) no consumer dedup helper.
- **Known limits** (none blocks the owner's use; none is an A4b):
  - the CSV export allowance (free 1 a month) isn't metered, and every account gets free-test-v1's
    7-day lookback without breakdowns, until A7's entitlements (Billing API);
  - no authenticated edge yet, so `country` is null and `QRWTY-Synthetic` is ignored; the
    Redirect service's run.app URL is reachable without Cloudflare and answers the same redirects;
  - a stopped worker shows as an old `freshness.asOf`, not as `delayed` (AG-29); the quarantine has
    no repair-and-replay command yet (an operator can read it, and mark `repaired_at`);
  - Q08's fault runs (multi-replica races, stalled sockets, publisher faults at startup) and Q10's
    archive replay and retention-alarm tests were not run (light checks); the integration test
    covers dedup, concurrency and purge on a real database.
- **Credit.** The worker pool's always-on instance adds about USD 1.0 a day at Q13's list prices
  (USD 0.043 an hour), so idle is about **USD 4.0 a day** of trial credit; requests add Cloud Run's
  request CPU and Pub/Sub's throughput charge (not quoted here).
- **Running.** Nothing locally: the test PostgreSQL was removed by name. Live: everything A3 left,
  the worker pool at 1, and the redirect route.
- **Next: A5** (the UI). The browser reads analytics at `/api/v1/links/{id}/analytics` and
  downloads `/api/v1/links/{id}/analytics.csv`; a short link's error pages are the Redirect
  service's HTML.
- **Read.** The packet, `AGENTS.md`, this file (Q06, Q13, S02, A1, A2, A3), `units.md` (Q08, Q10),
  pack v1.6's `decisions.md`, `http-contract.md`, `product-contract.md` and `durable-clicks.md`; the
  generated README, `dependencies.ts`, `entry.ts`, `http.ts`, `tile-http.ts`, `admission.ts`,
  `module-clients.ts` (publisher, loop, cache), `tile-loop.ts`, the Redirect, Analytics and Account
  processes, `products.mjs` and `infra/local.json`; A3's Link operations views, My links and
  forwarding; `infra/gcp` and the Worker. `~/.config/qrwty/`: `cloudflare.env` only through
  `deploy.sh`, `auth0.env` only through `tf.sh` (never printed); the test user's credentials from
  Secret Manager into the smoke's memory only.
- **Elapsed.** 20:01:07Z to about 20:35Z on the host clock (about 35 minutes), a clock earlier units
  found to jump.
- **Foreign context.** The session started with foreign Jeeves context (`AGENTS.md`, Git status, a
  memory index); it was ignored.

## A5: the QRWTY app on qrwty.io, 2026-11-15

Arm A, A5 attempt 1 (role implementer), from QRWTY `ac18bbf`. Q12 of `units.md` in one skin, Q11's
"Steel and Ice" (`docs/design/`), wired to A3's and A4's live API. Light checks, as the owner
decided: the build, the Worker's unit tests and the live smoke; no oracle, review or records.
Status: **done**; no A5b is needed (known limits below).

- **What the owner can do at `https://qrwty.io`:**
  1. paste a long link and press **Shorten** (no account needed);
  2. on the result: **Copy short link**, **Open short link**, the QR code with **Download PNG**
     (1184 px) and **Download SVG**;
  3. **Save to my links**: straight to Auth0's sign-in page (sign up with an email and password,
     or "Continue with Google"); back on `/`, the link is claimed and shows "Saved to My links";
  4. **My links** (newest first, 20 at a time, "Show more links"): **Copy link**, **Manage**;
  5. on a link: **Change destination** (a stale edit says "This link changed somewhere else" and
     offers to save again), **Disable link** and **Turn link back on**, **Delete link**, its QR
     code, the last 7 days' clicks, **Open short link**;
  6. **Click analytics**: filtered clicks, recorded visits and the difference, each defined, the
     daily chart and its table, **Refresh counts**, **Export CSV**;
  7. **Plans and billing**: Free is the current plan (Paid is shown, not offered, until A7), the
     account's email and link count, and **Delete my account**;
  8. **Sign in** and **Sign out** in the top bar (a bottom tab bar below 720 px); sign-out also
     ends the Auth0 session. The footer links **Versions: what happened** (`/versions/`) and names
     the build.
- **Live smoke** (`.scratch/A5/smoke.mjs`, headless Chromium, by mouse, A3's test user through
  Auth0 Universal Login; **24/24** on `cd21ce4`, and 24/24 on `91f6429` before it), at 1440×900
  in light and 360×800 in dark, each:
  1. create: a `https://qrwty.io/<10 base62>` short link; Nunito loaded (self-hosted);
  2. copy: the clipboard holds exactly the short link;
  3. download: the PNG (1184×1184) and the SVG (rendered) both decode with jsQR to the short link;
  4. sign in from **Save to my links** through Auth0, back on `/`;
  5. "Saved to My links" (the claim), and the link is the newest row of My links;
  6. edit the destination; at 1440 also the stale edit: a second tab saves first, this tab's
     `If-Match` is refused (412), the alert shows the newer destination, "Save my destination
     again" saves;
  7. **Open short link** lands on the new destination; **Click analytics** shows 1 filtered and 1
     recorded on the first read; **Export CSV**: the header and 7 days, the last `…,1,1`;
  8. sign out: back on `/` as a guest with "Signed out".

  Both themes screenshotted at both sizes (the page ground is `#e8f4fa` light, `#0f1d26` dark);
  **0 px** horizontal overflow on every screen at both sizes; **0 console errors** on qrwty.io
  pages (the stale edit's intended 412 is the one network error, logged apart). The 360 run then
  signs in from the top bar and deletes the test account from Plans and billing (202, signed out,
  "Your account was deleted"), which also resets its monthly allowance for the next run.
  `.scratch/A5/manage.mjs` (7/7 on `cd21ce4`): sign-in returns to the page it left; a signed-in
  create is saved at once; **Disable link** (dialog) makes the short link 410; **Turn link back
  on** makes it 302 again after 33 s; **Delete link** (dialog) returns to My links and the link is
  410 after 33 s; **Delete my account**. `.scratch/A5/errors.mjs`: a `.local` destination shows the
  server's reason under the field (400 `invalid_destination`), Web Risk's malware test page shows
  "This destination was refused" (422). Too many new links (429), the monthly limit (403) and the
  safety check unavailable (503) were checked against mocked answers only: no rate limiter exists
  yet.
- **Where the UI lives: `web/`** ([README](../web/README.md)): `index.html` and `assets/`:
  - `tokens.css`, `app.css` and `qr.js` are Q11's prototype files, copied unchanged;
  - `app.js` is the app, from the prototype's markup, icons and copy; the control names are the
    frozen ones (`accessible-names.json`);
  - `site.css` holds a few additions; `fonts.css` and `fonts/` are Nunito, self-hosted
    (`@fontsource-variable/nunito` 5.3.0's latin and latin-ext files, unchanged, with `OFL.txt`);
  - no framework, no build step, no dependency and no request to another origin. About 1,370
    lines of script and 60 of new CSS (outside the backend LOC scope, which is `app/` only).

  Paths: `/` (create and result), `/app/links`, `/app/links/<id>`, `/app/links/<id>/clicks`,
  `/app/plans`. The guest's result and claim proof stay in `sessionStorage`, so **Save to my
  links** survives the trip to Auth0 (`/auth/login?returnTo=/`) and works from that tab for 24
  hours. Create and claim send an `Idempotency-Key`; mutations send the session's CSRF token (a
  refused token is fetched again once); reads and keyed writes are retried on 503.
- **Serving** (`deploy/cloudflare/`, the `qrwty-edge` Worker):
  - `/`, `/app` and `/app/…` answer the app's page (staged as `/app/index.html`), `/assets/…` its
    files (scripts and stylesheets `no-cache`, fonts an hour); `/versions/`, `/api`, `/auth`, short
    links, `www` and `b` are unchanged. Without the assets binding, `/` is still the placeholder
    (unit tests).
  - The app's CSP adds `script-src 'self'`, `style-src 'self'`, `font-src 'self'` and
    `connect-src 'self'` to S01's (`default-src 'none'`, `img-src 'self'`, `base-uri 'none'`,
    `frame-ancestors 'none'`, inline style kept); S01's other headers unchanged, no HSTS.
  - `scripts/stage-assets.mjs` (run by `deploy.sh` and `pnpm check`) stages `public/` and `web/`
    into `.build/site`, `wrangler.toml`'s assets directory, and refuses an inline script or
    handler, an external reference, a missing asset or a script that doesn't parse.
  - `check-live.sh` checks the app instead of the placeholder; `redeploy.sh`'s smoke adds
    `GET /` is the app (6 checks).
- **Deploy.** `QRWTY_REDEPLOY_DIR=.scratch/A5/redeploy infra/gcp/scripts/redeploy.sh HEAD` at
  `91f6429` (this unit's code, committed first because `redeploy.sh` builds a commit): image
  `app-466d66adef65` reused (no `app/` change), both plans "No changes", the migration job found
  nothing, the Worker deployed, the smoke **6/6**. Again (`redeploy2`) at `cd21ce4` (the 30-second
  wording below), 6/6, and the smokes above ran on it. This commit (docs only beyond `cd21ce4`) is
  redeployed last, so `/build.json` names it. During development the Worker alone was deployed
  dirty three times (`deploy.sh --allow-dirty`).
- **Checks.**
  - `deploy/cloudflare`: `pnpm check` passes (Biome, tsc, vitest **37/37**, 4 new: the app's page
    on every app path, its CSP, `/assets/` caching and 404, the API paths left alone), then the
    asset staging (37 files).
  - `web/assets/app.js`: Biome lint with no error (one style warning, `"use strict"`).
  - A local render check against mocked answers (`.scratch/A5/local.mjs`), both sizes, 0 errors.
  - `check-live.sh`: all passed. Secret scan of the staged diff: no Cloudflare value, no
    credential shape. `git diff --check` clean. `app/` unchanged, so the root `pnpm check` was not
    rerun.
- **Template gaps:** none; AG-31 is unused. The UI isn't a Jeeves gap.
- **Known limits** (none blocks playing with it):
  - **Cold starts.** Twice on the first runs, Session API answered 503 after its 1,000 ms
    (`POST /api/v1/links` at 20:51:31Z, `GET /api/v1/me/links` at 20:53:14Z) while Link API or
    Account API started from 0 instances: A3's known limit. The app now retries reads and keyed
    writes up to 4 times, so the owner sees a delay, not an error. An unkeyed edit (`PATCH`,
    `DELETE`) isn't retried; it shows "Change not saved" with nothing changed.
  - **30 seconds.** A new destination, a disable or a delete reaches the short link within 30 s:
    the Redirect service keeps each route it read for 30 s (A4). The messages say so.
  - Paid, upgrade, the usage meter and analytics breakdowns wait for A7's billing and entitlements;
    the CSV export allowance isn't metered (A4).
  - My links shows when each link was made, not its clicks (no list-level counts in the API), and
    has no search or filter. "Show more links" follows `nextCursor` but wasn't driven live: the
    test account never held more than 2 links (5 a month).
  - The short links' error pages (404, 410, 403, 503) are still the Redirect service's own HTML,
    not Q11's public error page.
  - No theme switch: the app follows the system's light or dark setting.
  - The test account was deleted at the end of each smoke; its Auth0 user remains (A3b), and
    signing in again starts an empty account.
- **Next: A6** (abuse), then A7 (billing); A7's checkout returns to `/billing?checkout=…`, which
  the Worker doesn't route to the app yet.
- **Read.** The packet, `AGENTS.md`, this file (A2, A3, A4), the owner decisions of 2026-11-15,
  `units.md` (Q11, Q12), `docs/design/README.md`, `accessible-names.md`, the prototype
  (`index.html`, `app.js`, `qr.js`, `tokens.css`, parts of `app.css`), pack v1.6's
  `http-contract.md`; Session API's `forward.ts` and `signin.ts`, Link API's `create.ts`,
  `owned.ts`, `view.ts` and `destination.ts`, Account API's `my-links` and `link-analytics`
  routes; the Worker, `redeploy.sh`, A4's smoke. `~/.config/qrwty/cloudflare.env` only through
  `deploy.sh` and to match the staged diff (never printed); the test user's credentials from
  Secret Manager into the smokes' memory only.
- **Running.** Nothing locally. Live: everything A4 left, unchanged; the Worker now serves the
  app. No new cloud resource or cost (the Worker's static assets are free).
- **Elapsed.** 20:34:23Z to about 21:12Z on the host clock (about 38 minutes).
- **Foreign context.** The session started with foreign Jeeves context (`AGENTS.md`, Git status, a
  memory index); it was ignored.

## A6: abuse controls on qrwty.io, 2026-11-15

Arm A, A6 attempt 1 (role implementer), from QRWTY `a1071f0`. Q09 of `units.md`, and A3b, written in
the application-owned stub bodies and product SQL of Link API and Session API, against pack v1.6's
`decisions.md` (§3, §4), `http-contract.md` (§2, §4, §8) and `product-contract.md`. Light checks, as
the owner decided: no oracle, no review, no records. Status: **done**; no A6b is needed (the optional
local Compose profile was not attempted, below).

- **Live smoke on `https://qrwty.io`** (`.scratch/A6/smoke.mjs`, 22/22):
  1. **admission** (3/3): eleven quick guest creates from this machine's address: ten 201, the
     eleventh 429 `rate_limited`, `Retry-After: 59`; then the app by mouse (same address) shows "Too
     many new links … Try again in 58 seconds. Nothing was created." (screenshot
     `.scratch/A6/rate-limited.png`);
  2. **safety** (6/6): Web Risk's malware test page is 422 `reputation_rejected`; a report of a
     fresh link is 202 `{received: true}`, of an unknown link 202; `GET /api/v1/operator/...` is 404
     with a guest cookie and with none, a forged CLI signature 404; the reported link still 302s;
  3. **block** (8/8): the CLI blocks a link Hot routes held: 200, version 2; `HEAD` answers **403
     after 30 s** (deadline 60 s), the GET is the HTML safety page without `Location`; `show` lists
     the action (`cli:<gcloud account>`, the reason, the time, active → blocked); the CLI unblocks:
     200, active, version 3, and 302 again after 30 s;
  4. **erasure** (5/5): a disposable `qrwtya-test-erase-…@qrwty.io` user (made through the
     Management API, password in the smoke's memory only) signs in through Universal Login,
     **Delete my account** (dialog) → "Your account was deleted"; the Auth0 user is then **404**
     (`DELETE /api/v1/me` 202 in 477 ms, one attempt, the Management API token included).
- **Client address (decided here).** The Worker sends Session API `QRWTY-Client-Address` (Cloudflare's
  `CF-Connecting-IP`) and `QRWTY-Client-Signature: v1.<unix seconds>.<base64url HMAC-SHA-256(key,
  "qrwty-client-v1\n" + seconds + "\n" + address)>`, and drops any `QRWTY-Client-*` header a browser
  sent. The key is Secret Manager's `qrwtya-client-address-key`, also the Worker secret
  `CLIENT_ADDRESS_KEY` (`deploy.sh` pipes it from gcloud to `wrangler secret put` when the Worker
  lacks it). Session API (`session/client-address.ts`) accepts a signature within 60 s, reduces the
  address to its network (IPv4 /32, IPv6 /64, IPv4-mapped as IPv4) and sends Link API only
  `QRWTY-Admission-Key`, an HMAC of the network with a key derived from the same secret. No address
  is stored or logged; anything unsigned (a direct `run.app` call, a spoofed `X-Forwarded-For`)
  shares one key, `unverified`.
- **Guest admission** (`link-api/abuse-and-moderation/admission.ts`, Valkey `qrwtya-admission-cache`):
  `guest-admission-test-v1`, 10 guest creates per 60 s per admission key, checked after an
  idempotent replay and before Web Risk and any write, so a refused create stores nothing; 429
  `rate_limited` with `Retry-After` and a message that offers sign-in. Signed-in creates have the
  exact monthly allowance instead (A3's `spend_owned_create`, transactional), so people behind one
  shared address can sign in. The generated cache client has no atomic counter (AG-31): each copy
  counts its own admissions exactly in memory and is the only writer of its count key; a request
  writes its intent, then reads the other copies' counts through a per-key directory. Copies that
  know each other hold the limit; the worst case (copies starting on a key at once, or the cache
  away) is copies × limit (Link API's maximum is 3). Values expire with their window (≤ 62 s).
- **Reports** (`POST /api/v1/abuse-reports`, session and CSRF like every mutation): `reason`
  phishing, malware, spam or other, `details` ≤ 1,000 characters; 5 per 10 minutes per admission
  key (`abuse-report-v1`), then 429; always 202, stored only for a live link's slug; one row per
  link, reporter (SHA-256 of the admission key) and reason, at most 200 rows a link, plus a total.
  A report never changes a link.
- **Moderation** (Link API's `/operator/...`, forwarded from `/api/v1/operator/...`): `GET
  links/by-slug/:slug` (the link, owned or not, report totals by reason, last 10 actions), `POST
  links/:id/block` and `/unblock` `{reason}`. One SQL call each (`moderate_link`): state, version
  and version row (actor `operator`) with the operator action (actor, reason, time, from and to
  state, the CLI's nonce, unique). Unblock restores the state before the block (disabled if the
  owner was erased meanwhile); a deleted link is 409 `link_deleted` (tombstones never change); a
  replayed nonce 409 `replayed`. An operator is a verified account in `OPERATOR_SUBJECTS` (unset:
  nobody) or the CLI's signed request (`operator.ts`); everyone else gets 404, from Session API or
  Link API. Reports and actions: Link API's login only, kept 13 months, purged in bounded batches.
  Propagation: the Redirect service's 30 s route entries (A4).
- **Operator CLI** (`infra/gcp/scripts/operator.mjs`; [infra/README.md](../infra/README.md#abuse-controls-and-account-erasure-a6-once)):
  `node infra/gcp/scripts/operator.mjs show|block|unblock <slug or short URL> [--reason "<why>"]
  [--actor <name>] [--origin <url>]`. It reads `qrwtya-operator-key` with gcloud into memory and
  signs method, path, time (120 s), a nonce, the actor (default the gcloud account) and the reason.
- **Account deletion (A3b).** `DELETE /api/v1/me` now: Links erasure, then the Auth0 user (Management
  API `DELETE /api/v2/users/{subject}` as `qrwtya-account-erasure`, a Machine to Machine application
  with only `delete:users`; its token fetched while Link API erases and cached until a minute before
  expiry; `{client_id, client_secret}` in `qrwtya-account-erasure-client`), then the sessions. If the
  issuer fails, 503 and the session stays, so the browser's keyed retry finishes the job.
- **Billing return.** The Worker serves the app at `/billing` (any query, so
  `/billing?checkout=success|cancelled`); the app shows Plans and billing there. A7 reads `checkout`.
- **Cloud and Auth0** (trial credit; no new billable resource beyond three secrets, about USD 0.006 a
  day): secrets `qrwtya-client-address-key`, `qrwtya-operator-key` (32 random bytes in hex,
  `bootstrap-secrets.py`) and `qrwtya-account-erasure-client` (`auth0.py erasure-client`) with their
  three readers, applied with a targeted plan (6 added) before the redeploy; the Worker secret; the
  production profile (overlay and `app/`) lists the new secrets. Web Risk: 13 lookups.
- **Deploy.** `QRWTY_REDEPLOY_DIR=.scratch/A6/redeploy infra/gcp/scripts/redeploy.sh HEAD` at
  `2606eed` (this unit's code, committed first because `redeploy.sh` builds a commit): image
  `app-55d3fb99399a` (`sha256:148f8dad…6042d`), the migration job changed and executed (the abuse
  module's step 1), 6 stack changes; the Worker step refused the tree (the README edit), so
  `deploy.sh --allow-dirty` deployed it (`2606eed-dirty`) and put `CLIENT_ADDRESS_KEY`; the smokes
  above ran on that. This commit (docs beyond `2606eed`) is redeployed last, so `/build.json` names it.
- **Checks.**
  - `app/`: build, `typecheck:test`, Biome; **178 unit tests** (18 new, `test/unit/abuse.test.ts`:
    admission per window, across copies, in bursts, with the cache down, corrupt values; networks and
    signatures; operators; reports and routes; a guest create's 429 before Web Risk with nothing
    stored; the Auth0 deletion's order and its 503).
  - **Integration on PostgreSQL 17.11** (`infra/local/test-postgres.sh`, removed afterwards): **34
    passed**, 3 new in `test/integration/abuse.test.ts` (product SQL applied twice; reports counted
    by link, reporter and reason with the link unchanged; block → `link_routes` blocked without a
    destination, the version rows `block`/`unblock` by `operator`, the actions with both actors;
    replayed nonce, non-operators, unknown ID, tombstone 409).
  - `deploy/cloudflare`: `pnpm check` (Biome, tsc, vitest **38/38**, 1 new plus `/billing` paths).
  - Root `pnpm check`: exit 0, 71 generated files unchanged. `infra/gcp/validate.sh` (pinned
    OpenTofu and mirror): lint ok, fmt, init and validate 0.
  - Secret scan of the staged diff: no `auth0.env` or `cloudflare.env` value, no credential shape;
    `git diff --check` clean.
- **Template gaps** ([details](evidence/a6/a-found-gaps.md)): AG-31 (medium) no atomic counter on
  the cache client, so admission is approximate (worst case copies × limit); AG-32 (medium) a full
  cache command queue (32) is treated as a lost connection, so a burst takes the cache away for 5 s.
- **Known limits.**
  - The app has no report form (none in Q11's design); reports are API-only for now.
  - The CSV export allowance is still unmetered: Account API reads Links and Analytics only (A7).
  - Not done (optional, A3b item 2): Session API's settings in the local Compose profile.
  - Requests that bypass the Worker share the `unverified` admission key.
- **Next: A7** (billing). Checkout returns to `/billing?checkout=…`, which now opens Plans and
  billing.
- **Read.** The packet, `AGENTS.md`, this file (A2–A5), `units.md` (Q09), pack v1.6's
  `decisions.md`, `http-contract.md`, the acceptance rows A09, A16 and A17; `product-contract.md`;
  Link API's and Session API's stubs and modules, the generated `dependencies.ts`, `valkey.ts`,
  `module-clients.ts` (cache), `settings.ts`, `entry.ts`, `products.mjs`; the Worker, `deploy.sh`,
  `redeploy.sh`, `tf.sh`, `auth0.py`, `bootstrap-secrets.py`, `locals.tf`, the production profile;
  `web/assets/app.js` (routing, the create alerts). `~/.config/qrwty/`: `auth0.env` (for `tf.sh`,
  `auth0.py` and the smoke's disposable user, loaded with `set -a`, never printed) and
  `cloudflare.env` only through `deploy.sh`.
- **Running.** Nothing locally: the test PostgreSQL was removed by name. Live: everything A5 left,
  plus the three secrets, the Worker secret and `qrwtya-account-erasure`. The smoke's disposable
  Auth0 user is deleted; its test links stay (guest links, as in earlier smokes).
- **Elapsed.** 21:10:26Z to about 21:50Z on the host clock (about 40 minutes).
- **Foreign context.** The session started with foreign Jeeves context (`AGENTS.md`, Git status, a
  memory index); it was ignored.

## A7: upgrade to Paid with Stripe test mode on qrwty.io, 2026-11-15

Arm A, A7 attempt 1 (role implementer), from QRWTY `bc4cdf6`. Q10a and Q10b of `units.md`, in the
application-owned stub bodies and product SQL of Billing API, Link API, Account API, Session API and
the Click aggregator, plus the UI in `web/`, against `billing-contract.md` and pack v1.6's
`decisions.md` (§3, §4), `http-contract.md` (§7, §9) and `product-contract.md`. **Stripe test mode
only**: no real card, no real charge. Light checks, as the owner decided: no oracle, review or
records. Status: **done**; A7b (below) names three follow-ups.

- **Live smoke on `https://qrwty.io`** (`.scratch/A7/smoke.mjs`, headless Chromium at 1440×900, by
  mouse, A3's test user through Auth0 Universal Login; **14/15**, the one miss explained in 3):
  1. **Free**: Plans and billing shows Upgrade to Paid and the meters "of 5" and "of 1"; a 30-day
     analytics range is 403 `tier_restricted`;
  2. **Upgrade to Paid** opens Stripe Checkout (`checkout.stripe.com`, "Sandbox"); email, Card,
     `4242 4242 4242 4242`, 12/34, CVC 123, ZIP 10001, **Subscribe**;
  3. back on `/billing?checkout=success` 9 s after paying: **Paid is on** ("Renews on 15 Dec 2026 for
     USD 5.00 (test price)"), `confirmedBy: "webhook"`, `paid-test-v1`, meters "1 of 50" and "0 of
     20"; the 30-day range is 200 with `maxDays` 90 and breakdowns; Click analytics shows 90 days and
     the three breakdown tables by mouse. **Confirming your subscription was not seen live**: Stripe
     delivered the webhooks (three, all 200 in ≤ 0.32 s, 22:28:21–22Z) while its success page was
     still showing, so the first status read after the return was already Paid. The state is shown
     by the local render check below (a delayed confirmation, then Paid is on);
  4. **Manage payment** opens Stripe's customer portal (`billing.stripe.com`); **Cancel
     subscription**, confirm, back to `/billing?portal=returned`;
  5. **Cancellation scheduled** ("Paid ends on 15 Dec 2026. After that you're on Free…") 5 s after
     cancelling: `tier: paid`, `status: active`, `cancelAtPeriodEnd: true`, `paidThrough`
     2026-12-15T22:28:18Z, as the contract says (Paid to the period end, then Free).

  0 px horizontal overflow, **0 console errors** on qrwty.io pages (the deliberate 403 kept apart).
  Request logs: the very first checkout (a new Stripe customer, then the session, at 22:24:10Z)
  passed Session API's 1,000 ms deadline once (503); the app's keyed retry 2 s later got the same
  session (200, 0.04 s). Two earlier runs stopped at my own Checkout selectors (the form is Stripe's
  Payment Element in a frame); their open session was reused, so the account paid once.
- **The webhook route (decided here):** `https://qrwty.io/api/v1/billing/webhook`, the contract's
  path. The Worker already sends `/api/*` to Session API with the body as bytes; Session API's new
  route takes no session and no CSRF and passes only the unchanged bytes and `Stripe-Signature` to
  Billing API `POST /modules/billing-api-payment-events/webhook`. Billing API stays internal (AG-14):
  the simplest route A's ingress allows. Unsigned, stale and wrong signatures are 400 live.
- **Stripe test objects** (`infra/gcp/scripts/stripe-test.py setup`, idempotent: a second run
  changed nothing; refuses any key that isn't `sk_test_`): product `qrwtya_paid_monthly` "QRWTY Paid
  (test, not approved pricing)"; price `price_1UcBddBCgK4pyiZ2kwUtHsWD` (lookup key
  `qrwty-a-test-paid-monthly`, USD 5.00 a month); webhook endpoint `we_1UcBdeBCgK4pyiZ2wRGo23AW`
  (7 events, API version `2025-09-30.clover`, metadata `qrwtya`); portal configuration
  `bpc_1UcBdfBCgK4pyiZ2Q5yV7mpo` (card update, invoices, cancel at period end). The signing secret
  and the key went straight into Secret Manager's `qrwtya-stripe-webhook-secret` and
  `qrwtya-stripe-secret-key` (piped, never printed); the price and portal IDs are in `qrwtya.tfvars`.
- **Billing API** (`app/src/modules/billing-api/billing/`, schema `m_billing_api_customer_billing`):
  - **Checkout**: an Idempotency-Key and `{plan: "paid-monthly"}` only (no browser price); the
    customer is created once per account (Stripe idempotency key `qrwtya-customer-<account>`) and
    mapped server-side; under the account's row lock an open session is reused, else one is created
    (key `qrwtya-checkout-<account>-<attempt>`), returning to `/billing?checkout=success|cancelled`;
    an active or past-due account is 409 `already_subscribed`.
  - **Webhook**: HMAC-SHA-256 over the exact bytes, 300 s tolerance, constant-time, before parsing;
    the event is inserted (unique by ID) before the 200; a duplicate is 200 with no effect; an
    insert failure is 503. Then this customer's due items are processed for up to 0.5 s; the rest
    stay leased.
  - **Reconciliation**: an event only names the account. Under the account's lease (15 s, a fence
    that rises with each lease) Billing API reads the canonical subscriptions from Stripe, outside
    any transaction, and `apply_subscription` applies them only for the current fence before the
    lease ends, so late or expired workers and out-of-order events can't regress state. Inbox items
    retry after 2, 4, … 256 s and stay `failed` after 8 attempts. A stuck checkout is reconciled 8 s
    after the browser returns; the return URL never grants anything.
  - **Transitions** (`policy.ts`): Paid only from the allowlisted price; active to `paidThrough` (a
    cancel at period end stops there; otherwise 2 days' renewal slack); past due for 7 days from the
    first failure, which duplicates never move; incomplete, canceled and expired are Free.
  - **Grants** (`GET /modules/billing-api-entitlements/grant`, 60 s, versioned by `revision`) and
    **exports** (`POST …/exports`, spent atomically per UTC month), both for the forwarded bearer's
    own account; **portal** sessions for Manage payment; **account deletion** now cancels the
    subscriptions and forgets the customer first (Session API calls it before Links' erasure).
- **Link API** spends owned creates and claims in the Links transaction with the grant's limit (5 or
  50); without a grant it uses Free's and answers 503 `billing_unavailable` rather than a wrong 403.
  **Account API**: lookback 7 or 90 days and breakdowns from the grant; each CSV export spends one
  with Billing API first (403 `quota_exceeded`, 503 when unknown); `GET /me` adds the month's
  creations from Links' new `published.account_usage`. **Click aggregator**: `record_click_v2`
  counts device class, country and referrer host per day in the same transaction (Analytics step 2,
  `click_breakdowns`, kept 13 months); breakdowns count clicks since this deploy.
  **Session API**: `GET /api/v1/me/billing` (Billing API's status plus Account API's usage),
  `POST /api/v1/billing/checkout`, `/portal` and `/webhook`.
- **UI** (`web/assets/app.js`): Plans and billing reads `GET /api/v1/me/billing`: Upgrade to Paid →
  Checkout; Confirming your subscription while polling after `?checkout=success` (1 s rising to 5 s,
  2 minutes, then "Check again"); Paid is on; This month's meters; Manage payment → portal;
  Payment failed (Update card); Cancellation scheduled; You are on Free again; Checkout cancelled;
  Payment portal unavailable; the top bar says Paid plan. Click analytics shows 90 days and the
  breakdown tables on Paid. Frozen accessible names kept.
- **Deploy.** `QRWTY_REDEPLOY_DIR=.scratch/A7/redeploy infra/gcp/scripts/redeploy.sh HEAD` at
  `fe4205d` (the unit's code; image `app-9efb55122d77`, `sha256:229221f7…68eec`): the migration job
  changed and ran (Billing step 1, Analytics step 2, the new views), 6 stack changes (the new image,
  and Billing API's settings and two secrets), the Worker, smoke 6/6. Before it: a targeted plan of the two secrets and
  their readers (4 added). This commit (docs only beyond `fe4205d`) is redeployed last, so
  `/build.json` names it.
- **Checks.**
  - `app/`: build, `typecheck:test`, Biome; **196 unit tests** (18 new, `test/unit/billing.test.ts`:
    every tier transition, the signature over changed bytes, wrong secret and stale times, the inbox
    before the 2xx and 503 on its failure, checkout's key, plan, reuse and 409, grants and exports,
    Link API's 503 fallback; existing unit and integration tests updated for the new fields and order).
  - **Integration on PostgreSQL 17.11** (`infra/local/test-postgres.sh`, removed afterwards): **39
    passed**, 5 new in `test/integration/billing.test.ts` (Billing SQL applied twice; two concurrent
    checkouts make one session; a signed event stored once and reconciled to Paid, then canceled; a
    late worker's fence refused; 8 failing attempts end `failed`; six racing exports spend one).
  - Local render check (`.scratch/A7/local.mjs`, mocked API): **26/26** at 1440 light and 360 dark,
    every billing state, Confirming then Paid is on, 0 console errors.
  - `deploy/cloudflare` `pnpm check` (38/38, staging 37 files); root `pnpm check`: exit 0, 71
    generated files unchanged; `infra/gcp/validate.sh` (pinned OpenTofu and mirror): lint, fmt, init
    and validate 0. Staged diff: no Stripe, Cloudflare or Auth0 value, no credential shape;
    `git diff --check` clean.
- **Template gaps** ([details](evidence/a7/a-found-gaps.md)): AG-33 (medium) no scheduled job, so
  nightly reconciliation has no caller; AG-34 (low) the raw body is capped at 64 KiB, below the
  contract's 256 KiB; AG-35 (low) a tile's modules can't declare shared tables. AG-14 applies to
  Entitlements (grants are keyed to the forwarded bearer's own subject).
- **A7b** (not done here):
  1. a schedule for `POST /modules/billing-api-payment-events/jobs/reconcile` (Cloud Scheduler with
     an ID token to the internal Billing API, or another caller inside the VPC), AG-33;
  2. live proof of a payment failure and its grace (a test clock, or the card `4000 0000 0000 0341`),
     and of "Confirming your subscription" with a late webhook; both are unit- and render-tested only;
  3. Billing API's settings and secrets in the local Compose override, and the billing-lifecycle
     drawing updated from this behavior.
- **Known limits.** The first checkout of an account makes two Stripe calls in Billing API and can
  pass the 1,000 ms request deadline (the tile's Request timeout, a diagram setting): 503, then the
  app's keyed retry gets the same session. Breakdowns count clicks from this deploy on. A3's test
  user is now Paid with a cancellation scheduled for 15 Dec 2026 (test mode); deleting the account
  would cancel at once. Requests that bypass the Worker can't reach Billing API (internal).
- **Read.** The packet, `AGENTS.md`, this file (A5, A6), `units.md` (Q10a, Q10b),
  `billing-contract.md`, pack v1.6's `decisions.md` §3–§4 and `http-contract.md`; the generated
  Billing API process, slots, `entry.ts`, `http.ts`, `tile-http.ts`, `module-clients.ts`
  (`externalTarget`); Link API's `create.ts`, `owned.ts`, `service.ts`; Account API's routes; the
  aggregator; Session API's `forward.ts`; the Worker; `redeploy.sh`, `tf.sh`, `locals.tf`,
  `secrets.tf`, the production profile and preflight; `web/assets/app.js` and the Q11 prototype's
  billing states; `accessible-names.json`. `~/.config/qrwty/stripe.env` loaded with `set -a` for
  `stripe-test.py` only (never printed); `auth0.env` and `cloudflare.env` only through `tf.sh` and
  `deploy.sh`; the test user's credentials from Secret Manager into the smoke's memory only.
- **Running.** Nothing locally: the test PostgreSQL was removed by name. Live: everything A6 left,
  Billing API now configured, two new secrets (about USD 0.004 a day). In Stripe test mode: the four
  objects above, one test customer and its subscription (canceling 15 Dec 2026). No real charge.
- **Elapsed.** 21:49:53Z to about 22:40Z on the host clock (about 50 minutes).
- **Foreign context.** The session started with foreign Jeeves context (`AGENTS.md`, Git status, a
  memory index); it was ignored.

## A8: README tables for the finished arm A, 2026-11-15

Reporting unit, A8 attempt 1, from QRWTY `74139d3` (A7 is `0647e4a`). No test or oracle was rerun,
no cloud was used, and `~/.config/qrwty/` was not read. B's repository was only read. Full record:
[A8 checks](evidence/a8/checks.md).

- **Changed.**
  - Root `README.md`: a new section, **Results after finishing A (2026-11-15)**, above the
    unchanged Results section, with a TOC entry. It holds two tables:
    - A now vs B, by backend area;
    - A v1 vs A now.
  - The status and live-sites lines now say A is live at qrwty.io with a UI and B is torn down.
  - New `docs/evidence/a8/`: the runner's output, the area grouping (`areas.py`, `areas.json`)
    and S02's counter rows for `0647e4a` and `a0ddd52`.
- **Runner.** The committed `tools/loc` runner (source-loc-v2, Jeeves `4e87f97`), rebuilt in
  `.scratch/A8/` under Node 24.21.0 and verified. Its pinned files are byte-identical at `0aea8e7`,
  so the fallback copy would be the same runner, and none was built.
  - With `3179494` as the baseline, the runner refuses: the baseline doesn't match its manifest,
    because Q06's merged stub and its `link-operations/` files are already in A1's commit.
  - The baseline used instead is A1's fresh `0aea8e7` export of revision 84. Its manifest is
    identical to `3179494`'s, and all 93 files match it by SHA-256. It was committed in a scratch
    clone, which holds the `app/` tree `dc6f559e…980f`.
- **Numbers.**
  - A now (`0647e4a`): G0 3,572 = 3,495 + 77, R 3,548, C 4,998, D 24, B 8,546, **41.52%**, with all
    11 stubs written. C by area:
    - sessions and accounts 1,385, links 1,286, billing 1,129, abuse 494, analytics 380, redirect 324;
    - platform and process entry points 0.
  - Tests 5,058; SQL 1,497 (1,342 written); infrastructure 3,086. The Worker's source is 418 lines
    (217 before A2), outside `app/` and not counted.
  - A1 alone (`3179494`): C 761, B 4,330, 82.42%.
  - B: S02's numbers, unchanged.
- **Findings.**
  - The runner can't take an update commit as its baseline once stub bodies are written. A later
    regeneration needs the clean export committed (or kept) for counting.
  - source-loc-v2's `settings` name rule drops A's `settings.ts` files: 141 generated lines and 93
    written ones. This is the same rule that drops B's `config/`.
  - The README's "Source and effort measurement" tables still describe the run at its wind-down
    (no `web/`, A at `a6f982b`), and `docs/benchmarks/status.json` is still stale. Neither was in
    this unit's scope.
- **Read.**
  - The packet, `AGENTS.md`, and this file (S02, A1–A7).
  - The README, `tools/loc/`, and the S02 and A1 evidence.
  - Jeeves `git log` and `git show` (read-only).
  - In B: the backend files that correspond to A's helpers, at `f2fb3ce`.
- **Elapsed.** 22:35:29Z to 22:47Z on the host clock (about 12 minutes).
- **Foreign context.** The session started with foreign Jeeves context (`AGENTS.md`, Git status and
  a memory index); it was ignored.

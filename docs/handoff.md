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

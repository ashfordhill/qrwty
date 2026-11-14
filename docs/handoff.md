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

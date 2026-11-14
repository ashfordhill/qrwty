# Sequential Jeeves-assisted execution units

> **Amended by the [owner decisions of 2026-11-13](owner-decisions-2026-11-13.md)** (cloud within the GCP
> trial and Cloudflare free plan, Stripe test mode, both UI skins, Fable reviews, coordinator push).
> Where they conflict with this file, the decisions win.

Status: proposed. Execute one assigned unit, commit it and stop. No application unit has run.
The owner/coordinator selects the next eligible unit. Read QRWTY `AGENTS.md`, latest handoff,
plan decisions, product/acceptance contracts and your unit. Recheck actual HEAD/status first.
Never infer completion from a plan's filename or a previous agent's intended next step.

## Common completion contract

For every unit:

1. Record starting commit, assigned scope, model/tool identity and available usage telemetry.
   Preserve all earlier evidence and unrelated dirty files. Start an attempt record before work.
2. Implement only the unit's responsibility. Keep generated ownership intact. An unresolved
   correctness/generation/provider gap blocks dependent work, not permission to weaken it.
3. Run the named acceptance IDs and relevant regressions. Record command, exit, duration and
   expected/observed result. A screenshot alone cannot prove a transaction or cloud failover.
4. Update changed behavior in the contract/diagrams only when authorized; record deviations.
   Preserve failures, then link any corrected rerun. Classify every new source file.
5. Append `docs/handoff.md`: what changed; checks; evidence; deviations; blockers; next eligible
   unit. Stage exact unit paths; local commit; no push. Report commit and remaining issues.

Proposed command contract, created in Q05/Q06 rather than claimed to exist now:

- Root `pnpm check`: lint, types, network-free unit tests across app/UI/tooling.
- `pnpm test:integration`: disposable local real stores, no owner database, deterministic fixtures.
- `pnpm test:e2e`: isolated browser application with scripted identity where appropriate; real
  identity compatibility is separate.
- `pnpm build`: backend and UI production builds without mutating generated source.
- `pnpm evidence:validate`: evidence links/hashes, status and source classification; it does not
  certify software behavior.
- Cloud/fault/load commands are opt-in, environment-specific and budget-bounded, never hidden
  inside unit tests or `pnpm check`.

A unit touching Jeeves must be separately assigned there and run its own `pnpm check`,
`pnpm test:e2e` (Docker fallback if needed), `pnpm --filter @jeeves/web build`, plus the required
mouse check for visible changes and relevant generated-system suites. QRWTY checks don't replace
those gates. Do not run a competing suite on another agent's reserved ports/resources.

## Q00 — Freeze the product and experiment

**Goal:** remove requirements ambiguity before two builds start.
**Input:** this plan and owner answers. **Writes:** docs/benchmarks and agreed contracts only.

- Preserve confirmed owner answers through revision 3; resolve only remaining model/local-policy
  choices. Record $0 additional cloud/service spending now; defer future cloud/load caps without
  blocking local build. Freeze provisional region, local tier fixtures, retention/deletion/grace
  and experiment inputs. Production price IDs and real provider proof remain activation gates.
  Include local-to-cloud.md, durable-clicks.md and billing-contract.md in the neutral input pack; do not freeze a
  lossy analytics contract or defer billing. Prices/limits cannot be inferred from test fixtures.
- Pin a common runtime/language, execution model/settings and review protocol; record unknown
  provider usage capabilities and how they will be captured before any implementation call.
- Create a neutral pack manifest with SHA-256 for product, API/SLO, design and black-box test
  specifications. Freeze the visible task prompts and a neutral test-oracle implementation plan.
- Start separate A/B/shared cost ledgers. Set run IDs; do not turn the plan's null counts into zero.
- Define owner sign-off points: visual direction, priced cloud apply and public DNS cutover.
  Existing session authorization and approved spend continue to apply; avoid repeated approvals.

**Checks:** pack hashes and ledger field validation; no runtime changes. **Done:** decisions and
input hash recorded. **Stop:** budget/model unknown does not prevent neutral specs, but no paid
execution until the needed choice is made. **Commit:** `Q00: freeze QRWTY experiment contract`.

## Q01 — Build the backend diagram in Jeeves

**Depends:** Q00; active Jeeves units complete or a coordinator grants a safe authoring window.
**Goal:** draw the architecture through supported studio commands/mouse paths and save it.
**Writes:** a new named studio project plus QRWTY architecture evidence; no template source.

- Re-read latest Jeeves handoff/catalog/playbook. Record commit and registry identity, installed
  templates and observed pending plans. Don't borrow an uncommitted generator change.
- Create **QRWTY · production candidate v1**, preserving existing projects. Follow the tile/link
  and lane inventory in architecture.md, including Session/Sessions and Billing API/Billing/Stripe.
- Add modules and ownership through ordinary supported actions. Link API sign-in Optional;
  Account API Required; Billing API has explicit customer versus signed-webhook authorization.
  Redirect has a required click channel and no identity dependency. Use installed channel choices
  for the diagnostic export; record Pub/Sub support pending G12 rather than inventing a provider.
- Turn Runnable processes on. Save/reopen, check all connections by mouse and inspect the
  generation report. Record each module as Template/Part/Stub/refused with its reason.
- Export original design, derived blueprint and simple/detailed images with provenance. Keep
  diagram readable at normal fit; do not represent replica counts or cloud regions in Jeeves.

**Checks:** app loads; TinyURL still renders; new project reloads; connections/settings accessible
by mouse; no catalog refusal suppressed. **Done:** real saved project and artifact hashes.
**Stop:** unsupported required capability is a Q03 finding, never an invented tile/template.
**Commit:** `Q01: save QRWTY Jeeves architecture`.

## Q02 — Freeze the as-found export and publish the saved diagram

**Depends:** Q01. **Goal:** record what the installed library actually generates today.
**Writes:** diagnostic export artifact and docs; do not complete its stubs.

- Export via studio and CLI to separate new scratch directories. Compare extracted payload
  files/hashes and build outside the Jeeves checkout. Save exact commands and versions.
- Classify supported runtime, custom hooks and unsupported cloud bindings. A healthy process
  with 501 routes is incomplete; retain the report rather than hiding gaps.
- Preserve untouched bytes in a content-addressed artifact or `evidence/q02/` with manifest;
  ensure secrets/runtime files are absent. Record backend/UI scope inventory without a final share.
- Add the actual simple Jeeves image and source links to QRWTY root README. Keep the Excalidraw
  overview labeled explanatory, with the historical owner prose intact.

**Checks:** M01 at the as-found scope, payload equality, clean standalone build or recorded precise
failure; diagram round trip. **Done:** reproducible diagnostic baseline, not production approval.
**Commit:** `Q02: freeze initial QRWTY export evidence`.

## Q03 — Audit generic gaps and commission exact fixes

**Depends:** Q02. **Goal:** a bounded generation/runtime compatibility contract.
**Writes:** capability report and proposed Jeeves gap units only in this assignment.

- Exercise G01–G13 in minimal disposable generated fixtures. Confirm HTTP status/headers already
  work; don't duplicate an installed seam. Probe transaction, auth audience, TLS/endpoints,
  migration, bounded durable publishing, recovery and startup coupling with actual code paths.
  Probe native Pub/Sub semantics/worker hosting and unchanged raw webhook body access explicitly.
- For each deficiency distinguish generic reusable mechanism from QRWTY policy and deployment.
  Record the smallest failing test and proposed file/interface owner. Check completed BR/GS
  evidence; don't reimplement another agent's fix from an outdated snapshot.
- Produce separate, narrow Jeeves unit briefs for actual generator gaps: goal, files/seam,
  invariants, emitted-output changes, offline tests, required regressions and regeneration proof.
- Wait for those units to be assigned/completed before depending on them. Continue independent
  neutral tests/docs where useful. Charge their real work to A's template-development ledger.

**Checks:** each finding has code/command evidence; no manual generated patches; all dependencies
named. **Done:** implemented-needed/deferred/not-needed decisions and linked assigned fixes.
**Commit:** `Q03: record QRWTY generation capability audit`.

## Q04 — Prepare and verify cloud bindings locally

**Depends:** Q03 remedies needed for local verification. **Goal:** deployment preparation without
paid resources. **Writes:** local container/config harness, binding inventory, draft IaC/probe code.

- Follow local-to-cloud.md. Use real Postgres/cache containers and the real Pub/Sub SDK against
  its emulator; exercise the production adapters through bounded fixtures where no service runs
  locally. No account billing, paid request, cloud apply or trial. Document emulator limitations.
- Implement validated runtime bindings for endpoint/TLS/credentials, issuer/audience, deadlines,
  pools and process lifecycle through proper template seams. Keep local test injection explicit;
  production rejects emulator/fake/insecure/missing-required configuration.
- Build exported production HTTP/worker images, run startup/drain/restart locally and verify
  restricted DB roles/migrations. Draft Cloud Run/worker/Cloud SQL/PubSub/archive/IAM resources,
  environment examples and a secret inventory; statically validate without authenticated refresh.
- Create a concrete live-provider probe script/manifest for Q12a, with expected assertions,
  candidate region/version, teardown and future cost inputs. Separate locally passed checks from
  real IAM, managed OIDC, archive, TLS/network and worker-placement checks that remain not run.
- Record every production binding and unproven assumption. A missing implemented provider adapter
  or required local correctness failure blocks Q05; deferred live service access alone does not.

**Checks:** R01–R03, local portions of G01/G03/G04/G06/G09/G10/G12; no cloud correctness claim.
**Done:** implemented bindings and a reproducible local proof plus named Q12a backlog.
**Commit:** `Q04: prepare QRWTY cloud bindings without provisioning`.

## Q05 — Freeze the reusable generation baseline in QRWTY

**Depends:** Q04 local gates and needed Jeeves fixes; Q12a live evidence is explicitly deferred. **Goal:** immutable before-product measurement point.
**Writes:** new `app/` untouched export, measurement tool wrapper, docs and root command wiring.

- If generic fixes change supported provider/module choices, update and resave the real diagram
  through supported paths, keep the Q02 as-found artifacts, and record new provenance. Regenerate
  using the pinned clean registry; compare studio/CLI outputs.
  Export to new `app/`, refusing an existing app rather than overwriting it.
- Ensure no product behavior, product SQL or UI is present in this baseline. Commit the exact
  payload/manifest. Record baseline full commit hash in a subsequent evidence reference; never
  invent a self-referential commit hash inside its own payload.
- Establish the reviewed backend scope and pinned external-repo LOC runner described in
  comparison.md. Verify it reads QRWTY Git objects and manifest, not dirty worktree source.
- Wire root commands without modifying generated package files; product scripts may wrap them.
  Capture generated build/typecheck results and empty hook inventory.

**Checks:** M01/M03 baseline; deterministic fresh generation; expected named 501s only in
diagnostic smoke, with no product-completion claim. **Commit:** `Q05: freeze QRWTY generated baseline`.

## Q06 — Link persistence and anonymous creation

**Depends:** Q05. **Goal:** correct durable create, not yet the finished UI.
**Writes:** product SQL, Link API stub bodies/contracts and their tests; no generated-owned file.

- Implement link schema/constraints, reserved slugs, CSPRNG allocation, bounded collision retry,
  destination validation and explicit error contract. Keep tombstones and versions from day one.
- Implement scoped create idempotency and 24-hour claim proof handling, including encrypted
  replay response where needed. Atomic persistence must survive replica/process races.
- Build neutral controlled-destination fixtures and create a product schema migration sequence.
  Product SQL uses the supported migration path; no direct manual schema changes in cloud.
- Capture active/disabled/blocked/deleted state diagram in Excalidraw. Do not implement account
  UI, analytics or custom domains. Every temporary scanner substitute is visibly test-only.

**Checks:** A02/A03/A09/F07; offline unit + real isolated Postgres concurrency/integration; build.
**Done:** durable creation through the real route and schema, deterministic errors. **Commit:**
`Q06: implement durable guest link creation`.

## Q07 — Sessions, ownership and account operations

**Depends:** Q06. **Goal:** authenticated control without requiring sign-in to create.
**Writes:** Session/Link/Account product stubs, session SQL and auth integration tests.

- Implement code+PKCE/state/nonce login and same-origin Secure/HttpOnly cookie sessions, CSRF,
  expiry/revocation and encrypted token storage. Forward a valid bearer to downstream guards.
- Preserve anonymous create with no token; supplied invalid token is never downgraded. Guard
  owner routes explicitly inside Optional Link API. Account API remains Required.
- Implement atomic claim and owned list/update/disable/delete with version preconditions and
  safe cursor paging. Scoping derives from verified identity; never from request owner fields.
- Test two accounts, expired/replayed proofs, parallel claims and session interruption. Capture
  account deletion policy in data-flow docs. UI work is only a minimal disposable test client.

**Checks:** A04–A08/A14/F07 locally; no private fields in views/logs. Managed identity compatibility
remains Q12a; no-charge existing sandbox evidence may supplement the local issuer tests.
**Commit:** `Q07: enforce QRWTY sessions and ownership`.

## Q08 — Redirect correctness and cache failure

**Depends:** Q07 and G12 client/binding behavior verified locally in Q04. **Goal:** safe routing with a durable click before each 302.
**Writes:** Redirect modules, awaited publisher/event schema, cache hooks, edge mapping and tests.

- Implement host+slug lookup using least-privilege route view, 302/no-store, HEAD, 404/403/410/503
  semantics. Validate response headers; reserve routes and reject spoofed forwarded identity/host.
- Apply absolute validation deadline/version/expiry on every hit. Add bounded cache calls,
  miss coalescing and DB admission. Prove stale fill cannot overwrite newer state.
- Keep identity and payment dependencies out of Redirect. Publish sanitized event with stable ID
  and await durable ACK before 302, including cache hits. Bound queue/batch/retries/deadline; reuse
  ID on retry. No ACK/unknown ACK/overflow means 503 without Location. Recheck expiry/freshness
  after waiting. HEAD does not emit. Follow durable-clicks.md; no after-response buffer fallback.
- Fault publication at startup and mid-request; reconcile captured successful GET responses to
  durable events. Liveness must recover without crash loops. Record committed-attempt/response
  ambiguity honestly; no exactly-once browser visit claim. Q10 adds consumers and archive gates.
- Run multi-replica update/disable/block races and cache/DB faults, including stalled sockets.
  Update redirect-failure diagram from observations if the contract-approved design changed.

**Checks:** A07–A09/A24 publisher subset, F01–F06 applicable publisher cases; local p99 labeled.
**Commit:**
`Q08: implement resilient public redirects`.

## Q09 — Abuse controls and operational moderation

**Depends:** Q08. **Goal:** public anonymous creation can be operated safely.
**Writes:** product admission/reputation/report/moderation adapters and tests/runbook.

- Implement distributed bounded guest admission plus hard transactional account limits where
  defined. Distinguish approximate edge counters from exact durable quotas. Rate-limit allocation
  before expensive work; include shared-NAT and IPv6 rotation cases.
- Integrate real bounded reputation adapter, normalize destinations and prohibit unsafe fetch
  behavior. Creation fails safely on scanner outage; redirects continue for existing safe links.
- Implement reports and privileged block/unblock, recording actor/reason without leaking secrets.
  A small operator workflow/CLI is sufficient; no speculative enterprise admin suite.
- Test moderation propagation through cache, retained tombstones and operator auth. Prepare
  rate-limit/abuse incident instructions and retained-data access rules.

**Checks:** A09/A16/A17, F01 creation behavior, security review of parser/adapter boundaries.
**Commit:** `Q09: add QRWTY abuse protection`.

## Q10 — Bounded click ingestion and account analytics

**Depends:** Q09. **Goal:** reconcile durably accepted events into bounded account analytics.
**Writes:** consumer/analytics modules, archive configuration, SQL, read routes and lifecycle diagram.

- Extend Q08's versioned event schema without breaking deployed readers; preserve IDs/timestamps.
  Record bot GETs durably, then derive filtered counts; no raw IP/full URL/cookies/authorization.
- Implement consumer ACK only after atomic dedup/aggregate commit. Configure and exercise the
  independent archive subscription configuration, durable quarantine, replay and deletion/retention
  behavior locally using explicit fixtures. Real archive delivery/IAM remains Q12a/Q13 evidence.
  Explicitly disable subscription inactivity expiry and check required subscriptions/permissions.
- Choose and document dedup/replay/retention mechanism against the tier's event volume. Prove
  bounded growth before enabling an existing event-counter template. Distinguish ordered batch
  identities, event identities and database transaction scope; never claim exactly-once delivery.
- Implement time-bucket aggregates, owner-authorized queries, freshness/delay and bounded CSV.
  Retention jobs run under the store owner; test missed cleanup/recovery, archive lag, backlog
  age, safety gates and emergency preservation before expiry. Stopping new traffic cannot save
  an already old backlog. Missing accepted events are an incident, not an acceptable gap.
- Save event lifecycle Excalidraw, storage-growth calculation and query/ingest sample. If the L1
  candidate needs an analytical store/stream, commission a specific measured unit before claiming L1.

**Checks:** A06/A10–A13/A15/A24, F03/F06/F08/F09; kill after commit before ACK; known-stream reconciliation.
**Commit:** `Q10: implement bounded click analytics`.

## Q10a — Subscription provider and durable webhook inbox

**Depends:** Q10, G13 and Q00's billing scope. **Goal:** implemented Checkout/portal integration and
reliable subscription state, verified locally. **Writes:** Billing API hooks, SQL, adapter and tests.

- Follow billing-contract.md. Implement server-owned customer/price mapping, idempotent Checkout
  creation and portal sessions with verified subject, CSRF and allowed return URLs. Concurrent
  requests must not create duplicate active subscriptions. Use sandbox IDs only in test fixtures.
- Verify Stripe signature over exact raw bytes before parsing. Store inbox durably before 2xx;
  duplicate provider IDs are harmless, DB failure is retryable. Test wrong signature, changed
  bytes, wrong customer and lost webhook acknowledgment. Never require OIDC for the signed webhook.
- Implement repeat-safe inbox/reconciliation jobs with bounded retries, lease fencing and current
  provider-state retrieval. Prove out-of-order events and expired workers cannot regress state.
  Reconcile nightly and on stuck checkout; no paid access based on browser return parameters.
- Capture local/sandbox lifecycle evidence with scope labels and update billing-lifecycle Excalidraw. No real charge,
  live email or secret committed; generic seam issues return to separately assigned Jeeves units.

**Checks:** A19/A20/A21, G13, F10 provider/inbox cases locally; use an existing no-charge sandbox
only within local-to-cloud.md. Otherwise keep real Stripe compatibility pending Q12a.
**Commit:** `Q10a: implement reliable subscription billing`.

## Q10b — Entitlements, quotas and subscription transitions

**Depends:** Q10a. **Goal:** enforce free/paid policy correctly across replicas and outages.
**Writes:** product tier policy, Billing/Link/Account hooks, usage SQL and lifecycle tests.

- Freeze local test-tier limits with Q00; label provisional prices/limits and require real production
  values before activation. Keep price IDs/config out of diagrams and generated files.
  Issue versioned, bounded entitlement grants; internal calls require workload authorization.
- Enforce owned-create/claim usage with idempotency in the Links transaction. Race grants, plan
  changes and requests across replicas. Upgrades/downgrades cannot reset usage or refund creation
  allowance through deletion. Enforce gated analytics/export at the server, not only in the UI.
- Implement paid-through/cancel/past-due/grace/free transitions, finite stale-state rules, failure
  explanations and deletion/cancellation retries. Never disable existing links or relax durable
  clicks because payment failed. Redirect must work when the billing service/provider is down.
- Record the concrete entitlement matrix and subscription runbook. Keep invoice/tax/payment
  records and retention separate from click analytics; prepare live configuration for Q18 review.

**Checks:** A06/A22/A23, F07/F10; multi-replica quota/claim races and cancellation/deletion recovery.
**Commit:** `Q10b: enforce individual free and paid tiers`.

## Q11 — Owner-reviewable visual design

**Depends:** stable public API from Q07–Q10b; may explore after Q00 without final integration.
**Goal:** settle the visual direction before implementing every screen.
**Writes:** `docs/design/` sketches, local prototypes, tokens and review record; no production UI.

- Follow design-brief.md. Study current selected competitors by task, date and concrete weakness;
  don't clone their layouts or reuse a generic component theme as the whole design.
- Present two coherent directions with real-length content: create/result/library/analytics,
  pricing/upgrade/billing, desktop/mobile/light/dark and core error states. Add an Excalidraw flow sheet.
- Include reduced-motion/solid-surface treatment and a practical QR export sample. Measure the
  proposed glass rendering cost in the prototype on the agreed mobile profile.
- Save the owner's choice and specific corrections. When feedback images arrive, preserve them
  with Problem/Decision/Resolution entries. Do independent backend/docs work while awaiting review.

**Checks:** U01 and prototype U04/U06; meaningful mouse walkthrough. **Done:** selected direction
and implementable tokens, not “owner probably likes this.” **Commit:** `Q11: select QRWTY visual direction`.

## Q12 — Complete the UI

**Depends:** Q11 selection and Q10b. **Goal:** complete the designed user journeys.
**Writes:** `web/`, required product BFF integration, browser tests/screenshots and completed deployment-preparation pack.

- Implement create/result/copy/QR without login; sign-in-and-claim; owned library/edit/status;
  analytics/export; pricing/upgrade/confirming/portal/cancellation/downgrade; public error pages.
  Include every state in design-brief.md. Guest copy/QR never waits for an upgrade.
- Keep browser source excluded from backend scope; separately count UI TS/JS/CSS/markup.
  Code splitting isolates dashboard/analytics; redirects never require the dashboard bundle.
- Run mouse/touch, keyboard/screen-reader and responsive/light/dark/low-motion checks. Decode
  exports and record real-device screen/print scans. Avoid capture of real accounts or secrets.
- Save performance profile and owner review evidence. Resolve visible issues before handoff.
- Complete Q04's infrastructure definitions/config/examples with the finished service inventory.
  Freeze image/UI hashes, migration/release/rollback commands and rehearse from a fresh local
  checkout without source edits. Record R01–R06; no cloud apply. Label this milestone locally
  verified, cloud activation pending; keep live-provider and capacity rows explicitly not run.

**Checks:** A01/A04/A14/A19–A23/U02–U08 at local scope, R01–R06, complete local e2e + build. **Commit:** `Q12: complete QRWTY product UI`.

## Q12a — Verify managed services when cloud activation is requested

**Deferred under the owner's current $0 cloud/service budget.**
**Depends:** Q12 and a later owner instruction with a concrete approved probe cap.
**Goal:** verify prepared adapters/containers on real GCP before staging.
**Writes:** executed Q04 probe, sanitized evidence, updated configuration and exact findings.

- Requote the prepared resources/duration and inspect current provider limits before apply. Use
  the approved cap, separate synthetic data and scoped credentials; no production DNS or charges
  to a customer. Existing approval need not be requested again within its scope.
- Test Cloud SQL/Memorystore TLS, IAM, restricted migrations, actual Pub/Sub publisher ACK,
  subscription/archive behavior and managed OIDC issuer/audience/rotation with the saved images.
- Prove Cloud Run ingress/port/startup/drain and worker hosting/replicas; verify origin restriction,
  default-hostname bypass prevention and workload identity. Run remaining no-charge payment and
  reputation-provider compatibility tests with real adapters; no live payment or unsolicited send.
- Change environment/IaC inputs to promote. If a source change is required, record it as a defect
  or missing capability, fix in the owning scope, regenerate when needed and preserve the frozen
  baseline. Charge late template/product work to A. Rebuild/reverify any changed artifact.
- Capture actual inventory/cost and teardown temporary resources. No emulator result substitutes
  for real managed durability, IAM or regional resilience. Q14/Q15 still own failover/load proof.

**Checks:** live portions of G01/G03/G04/G06/G09/G10/G12, D02 subset and provider tests deferred
from Q07/Q09/Q10/Q10a. **Done:** real compatibility evidence or exact blocking findings.
**Commit:** `Q12a: verify QRWTY managed-service compatibility`.

## Q13 — Reproducible cloud staging

**Depends:** Q12a and approved concrete cloud plan; deferred while cloud spending is $0. **Goal:** an actual staging deployment.
**Writes:** `infra/`, delivery scripts, dashboards/runbooks and evidence, no public DNS cutover.

- Apply the prepared Q04/Q12 IaC using Q12a's verified GCP bindings: protected ingress/Cloud Run/worker hosting/Cloud SQL/
  Memorystore/PubSub/archive, restricted roles,
  secret injection, backups, logs, budgets and certificates. Save plan before apply.
- Set independent instance limits, regional redundancy, health/readiness, drain and image-digest
  rollback. Migrations are a controlled job, never every request pod racing at startup.
- Protect origin, expose only intended routes, use separate arm/staging credentials and data.
  CI uses federated credentials; no long-lived keys in repo or build arguments.
- Apply within authorization, run a cloud product smoke, demonstrate release rollback and
  rotation. Record inventory, exact costs and teardown/restore instructions.

**Checks:** D01–D03/D10, cloud A01/A06/A07/A14/A24 and sandbox billing smoke.
**Commit:** `Q13: deploy reproducible QRWTY staging`.

## Q14 — Failure, restore and security gates

**Depends:** Q13. **Goal:** establish recovery behavior before expensive scale tests.
**Writes:** fault harness/runbooks, security findings, sanitized evidence and necessary scoped fixes.

- Run F01–F10 with multiple copies and real managed providers. Save fault start/stop, observed service
  health, identity/queue/DB outcomes and independent state reconciliation.
- Restore a backup/PITR into isolated infrastructure; verify claims/tombstones and deletion replay.
  Force supported database/cache failovers and inject application/network faults. Measure actual
  regional service behavior; identify provider-managed zonal failure modes that cannot be forced
  in the account rather than claiming an entire Cloud Run or Pub/Sub zone was killed.
- Run auth/isolation/parser/SSRF/origin/credential/dependency/image review; fix exploitable high
  or critical issues. A generator issue returns to an assigned Jeeves unit, not a local patch.
- Exercise configured owner alert route with authorized notifications; finish runbooks and privacy
  behavior review. Costs and failed attempts stay in ledger.

**Checks:** D02–D05/D07–D09 and F01–F10. **Commit:** `Q14: verify QRWTY failure and restore behavior`.

## Q15 — Capacity, cost and regional recovery

**Depends:** Q14 and approved load cap. **Goal:** quantify which deployment tier is proven.
**Writes:** load/seed scripts, capacity/cost report, recovery diagram/evidence.

- Price and bound L0/L1 workloads first; verify provider quotas and load-generator capacity.
  Run approved tiers, mixes and pathological cases exactly as cloud-strategy.md defines.
- Save offered/completed/failed throughput, histograms, cache/DB/queue/resource metrics and
  generated dataset characteristics. Reconcile clicks and storage growth after replay/soak.
- State bottlenecks and cheapest tested topology meeting each tier. Profile before adding edge
  caching, partitions, more services or an analytical database. New architecture needs its own
  assigned corrective unit and refreshed diagram/provenance.
- Prepare/execute regional recovery if included in approved scope. Fence the old writer and
  verify correct promotion and tombstones. Otherwise mark D06 unproven and limit release claims.

**Checks:** L01–L05 as authorized, D06 if authorized; unsupported tier remains not run/failed.
**Commit:** `Q15: measure QRWTY capacity and operating cost`.

## Q16 — Execute the independent baseline arm

**Depends:** Q00 neutral pack; can be scheduled earlier in a separate fresh context once frozen.
**Goal:** same product without Jeeves. **Writes:** baseline repo and its evidence only.

Assign [baseline-units.md](baseline-units.md) sequentially to fresh execution contexts with the
pinned configuration. Do not ask A's agent to copy its app and delete the manifest. No A source,
hooks, generated tests, IaC or postmortem fixes enter the baseline context. Neutral requirement
amendments go to both arms with actual rework charged. Both deployment environments remain separate.

**Checks:** local milestones may be reported while B08a/B09–B11/B13 cloud execution is deferred.
Final deployment comparison requires B00–B13 including B07a/B07b/B08a, equivalent tier and missing usage
disclosed. **Commit here:** evidence references only, after baseline commits exist.

## Q17 — Maintenance trial and final comparison

**Depends:** both arms meet the agreed same tier, or report explicitly that one failed.
**Goal:** an honest measured verdict. **Writes:** immutable reports and root README result tables.

- Freeze/execute the identical bounded maintenance request from comparison.md in each arm, with
  same tests and fresh contexts. Record failures, regeneration, custom preservation and total cost.
- Run pinned backend reports from real commits; independently inventory UI/support source.
  Validate source scope, retained/new/removed identities and generated provenance.
- Reconcile usage/cost/request ledgers; report coverage gaps, all template development, human time,
  per-phase totals, runtime costs and failure/security results. Link raw sanitized artifacts.
- Update README with actual counts, status and limitations. No favorable percentage selection,
  post-hoc baseline move or claim that two observations establish universal productivity.

**Checks:** M02–M05 and all cited artifacts accessible. **Commit:** `Q17: publish measured Jeeves comparison`.

## Q18 — Production cutover and observation

**Depends:** selected arm's release pack and owner's existing or final concrete authorization.
**Goal:** safely put the chosen deployment behind `qrwty.io` and observe it.
**Writes:** approved deployment/DNS change, release evidence and operations record.

- Present exact images/infra delta, tier, cost, unresolved findings, rollback and backup restore
  evidence. Do all preparation before requesting any missing final cutover decision.
- Include real billing price IDs, merchant setup, policy/limits, webhook secret/endpoint, sandbox
  lifecycle results and live-mode smoke procedure. Do not place a real charge merely to test.
- Apply gradual traffic where supported, run external anonymous/account/QR probes and rollback
  on agreed error-budget/latency/security thresholds. Keep baseline comparison hostname isolated.
- Check real cost/traffic/abuse behavior, run retention/backup schedules and monitor SLOs. Record
  the actual observation period; leave the 30-day target pending until it has elapsed.
- Update diagrams, README and handoff with what is actually deployed. Calendar waiting is an
  operations follow-up, not permission to fabricate a completed observation.

**Checks:** full selected release gate and external probes; observation results over time.
**Commit:** `Q18: release and record QRWTY production deployment`.

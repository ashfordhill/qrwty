# Independent build without Jeeves

This is the second execution plan, not an instruction to copy the assisted app. The owner assigns
one B unit at a time in a fresh baseline context using the frozen neutral experiment pack. Follow
comparison.md for isolation, equal model/tool budgets, all-attempt usage and evidence. No unit has
run and no baseline repo has been created yet.

The baseline agent receives the agreed product/cloud/UI/acceptance contracts and these B unit
briefs, stripped of A implementation history. It must not read A source, generated artifacts,
Jeeves internals, A's tests/IaC or postmortems. Ordinary libraries, official docs and its own tests
are allowed and recorded. All product/backend/UI/deployment code is independently authored.

Every unit records starting/ending commit, attempts, usage coverage, human intervention and
checks, appends its own handoff, stages exact paths and creates a local commit. A reference to
an acceptance ID means execute the same frozen external test, not write a weaker B-only test.
The command contract and release criteria match A. Model changes or missing data are disclosed.

## B00 — Establish the empty baseline and experiment controls

**Goal:** a clean independently runnable repo, no hidden source reuse.
**Writes:** new owner-approved baseline repo, instructions, neutral pack and ledger.

Create `qrwty-baseline` only when the destination is absent; preserve any existing repo and report
the conflict. Pin neutral input hashes, model/settings/tool access and toolchain. Record allowed
libraries/starter provenance and dependency versions. Use `app/`, `web/`, `infra/` layout and a
source classification file. No generated Jeeves manifest or fake generated baseline. Commit the
empty starting state and begin usage collection before implementation.

**Checks:** clean source inventory, no A files/references imported, null metrics stay null.
**Commit:** `B00: freeze independent QRWTY baseline`.

## B01 — Design and save the independent architecture

**Goal:** implementable service and data boundaries under the common topology contract.
**Writes:** original Excalidraw diagrams, ADRs, interface/schema specs; no application bodies.

Draw public redirect versus guest/account paths, store owners, session/identity boundary,
durable publication before 302, independent consumers/archive, billing and GCP placement. Specify
transactions/idempotency, cache freshness, signed webhooks, entitlements, replay and failure behavior.
Use the same names/contracts as the neutral pack;
do not import A's diagrams as an implementation recipe. High-level shared design inputs are
disclosed as shared preparation. Record dependency/library choices and alternatives.

**Checks:** each API/data ownership/SLO maps to a named component; no loop or double writer
unexplained; editable drawings open/render. **Commit:** `B01: design independent QRWTY architecture`.

## B02 — Build the runtime and cloud bindings locally

**Goal:** independent production-shaped runtime and deployment preparation with $0 cloud spending.
**Writes:** runtime source, local container/config harness, draft IaC/live-probe scripts and tests.

Follow local-to-cloud.md under the same restrictions as A. Implement strict config validation,
HTTP admission/timeouts/errors, redacted logs, graceful drain, health/readiness, bounded pools,
verified TLS, a scoped transaction API and unchanged raw-body access. Use real local Postgres/cache,
local OIDC and the real Pub/Sub client against its emulator. Use controlled provider fixtures for
faults; keep production validation strict and reject test endpoints/credentials in production.

Prepare independent Cloud Run/worker/Cloud SQL/PubSub/archive/IAM infrastructure and environment
bindings now. Build the production images; test lifecycle and restricted migrations locally.
Record the production binding/secret inventory and executable live-probe plan; no paid resource,
trial, cloud apply or new paid API call. Live IAM/TLS/managed identity/archive proof is B08a.
Missing cloud access does not block B03; a missing adapter or local correctness failure does.

**Checks:** R01–R03, independent local unit/integration/container tests; managed-service evidence
explicitly not run. **Commit:** `B02: prepare independent runtime and cloud bindings locally`.

## B03 — Durable anonymous links

**Goal:** independent implementation of create/URL/idempotency/claim-proof persistence.
**Writes:** Links schema/migrations, route handlers and tests.

Implement exact destination validation, reserved paths, random slug + unique constraint,
bounded collision handling, atomic idempotent creation, claim verifier and encrypted replay data.
Use database constraints/transactions across replicas, no process-local correctness lock. Seed
only controlled destinations. Save link-state diagram and errors. No account UI or analytics.

**Checks:** A02/A03/A09/F07; restart and two-replica races. **Commit:** `B03: implement guest links`.

## B04 — Sessions and ownership

**Goal:** browser sessions and object authorization without blocking guest creation.
**Writes:** OIDC/session/BFF, claim, list/update/disable/delete handlers and tests.

Implement code+PKCE/state/nonce, Secure/HttpOnly cookies, CSRF, encrypted token storage and
rotation/expiry. Verify audience/issuer/algorithm/subject. Implement one-time atomic claiming,
owner-scoped reads/writes, optimistic version preconditions and cursor bounds. Preserve invalid
credential errors rather than anonymous fallback. Handle account deletion under frozen policy.

**Checks:** A04–A08/A14/A15/F07 locally with two accounts; live managed identity proof deferred to B08a.
**Commit:** `B04: implement accounts and ownership`.

## B05 — Redirect path and cache

**Goal:** identical routing contract with mandatory durable event before 302, no identity/payment dependency.
**Writes:** lookup/cache/publisher/responder and edge route map with tests.

Implement 302/no-store, exact destinations, HEAD/405 and status semantics. Enforce authoritative
version, absolute validation deadline and expiry on every cache hit. Bound cache calls, fallback
admission and coalescing; guard stale-fill races. Publish stable-ID sanitized events and wait for
durable ACK; retry same ID within bounds. Missing/unknown ACK or full publisher returns 503 without
Location. Recheck policy/expiry after waiting. No after-response capture, bot sampling or sign-in
dependency. Follow durable-clicks.md and reconcile every successful GET against retained events.

**Checks:** A07–A09/A24 publisher subset, F01–F06 publisher cases; same freshness bound across replicas.
**Commit:** `B05: implement independent redirect service`.

## B06 — Abuse and moderation

**Goal:** same anonymous-use abuse controls and operator response.
**Writes:** admission/reputation/report/privileged moderation code, tests and runbook.

Implement distributed abuse limits and transactionally exact quotas as specified; validate
origin/proxy headers. Use the selected reputation service with deadlines and safe errors, never
an unrestricted URL fetcher. Reports are bounded and don't automatically block. Test privileged
block/unblock plus cache propagation, shared-NAT users and outage behavior.

**Checks:** A09/A16/A17 and same threat review as A. **Commit:** `B06: implement abuse controls`.

## B07 — Analytics pipeline

**Goal:** same durable-capture, count, archive, replay and retention contracts.
**Writes:** independent consumer/archive/aggregate/query implementation.

Use B05's confirmed event path, then independent archive delivery and atomic dedup/aggregate
commit before consumer ACK. Disable subscription expiry; implement bounded retention/replay,
durable quarantine, archive lag/backlog gates and preservation before expiry. Size for the same
tier. Expose owned aggregates/export/freshness/delay. Prove correctness after duplicate, late,
poison and replayed events and kill between commit and ACK. Lost accepted records are incidents.

**Checks:** A06/A10–A13/A15/A24/F03/F06/F08/F09, reconciliation and storage-growth proof.
**Commit:** `B07: implement independent analytics`.

## B07a — Independently implement subscription billing

**Goal:** implemented Checkout/portal integration, signed durable inbox and reliable state verified locally.
**Writes:** Billing API/schema/provider adapters/jobs and tests; no A implementation access.

Follow billing-contract.md. Map verified accounts to server-owned customers/prices, enforce CSRF
and return-URL allowlist, and prevent duplicate active subscriptions under concurrent checkout.
Verify raw bytes/signature before parsing; inbox commit before 2xx, duplicate IDs idempotent.
Implement fenced/leased reconciliation against canonical provider state with bounded retries,
nightly repair and no browser-return authority. Test forged/changed requests, wrong customer,
lost acknowledgment, stale worker, provider outage and out-of-order delivery. Use sandbox only.

**Checks:** A19–A21/F10 locally; existing no-charge sandbox only within local-to-cloud.md.
Otherwise defer live compatibility to B08a. Preserve failures.
**Commit:** `B07a: implement independent subscription billing`.

## B07b — Independently enforce free and paid tiers

**Goal:** same entitlement matrix, exact quotas and subscription lifecycle as A.
**Writes:** independently authored policy/grants/usage SQL and account/deletion handlers.

Use frozen local price/limit fixtures, requiring real production values before activation.
Authorize workload entitlement calls, bound grants by
revision/deadline, enforce usage with create/claim/idempotency in one Links transaction. Preserve
usage across plan changes and deletion. Apply server-side export/lookback restrictions. Implement
paid-through, grace, canceled/free and deletion retries; no unlimited outage extension. Published
links and durable click recording survive downgrade and payment-provider outage. Record a runbook.

**Checks:** A06/A22/A23/F07/F10; race requests/claims/upgrades across replicas and test grace expiry.
**Commit:** `B07b: enforce independent account tiers`.

## B08 — Independently implement the approved UI

**Goal:** same approved product design with independently authored source.
**Writes:** `web/`, required BFF adaptation, UI tests/screenshots and independent deployment-preparation pack.

Use the common selected visual direction/tokens/assets and UX contract. Implement create/result,
copy/QR, sign-in/claim, library/edit/disable, analytics/export and pricing/upgrade/portal/cancel,
with every design-brief state. B07a/B07b must pass before final integration. No copied
A components, client code or screenshot-driven source extraction. Count all UI work separately.
Verify accessibility, responsive/dark/solid/reduced-motion variants, QR scans and mobile performance.
Complete independent infrastructure/configuration, image/UI hashes and migration/deploy/rollback
commands. Rehearse a fresh local launch and configuration-only promotion under R01–R06, with real
cloud/provider checks explicitly pending. No A IaC, release scripts or implementation reuse.

**Checks:** A01/A04/A14/A19–A23/U02–U08 locally, R01–R06; same owner review rubric as A.
**Commit:** `B08: implement independent QRWTY UI`.

## B08a — Verify independent managed-service compatibility

**Deferred under the current $0 cloud/service budget.**
**Depends:** B08 and later owner activation with a concrete approved probe cap.
**Goal:** verify the prepared independent runtime on the same real services as A.
**Writes:** independent live-probe execution, configuration and sanitized evidence.

Use the same neutral Q12a requirements and topology, but B's own source/IaC/scripts. Test real
IAM/TLS/networking, managed identity, Pub/Sub ACK/replay/archive, runtime/drain/worker hosting,
restricted migrations and remaining provider integration. Promote the saved artifacts through
configuration; disclose and charge any required source changes, never import A fixes. Capture
actual costs and verify temporary-resource teardown. Real failover/load remains B10/B11.

**Checks:** D02 subset and the same deferred live-provider assertions as A. No live payments or
customer notifications. **Commit:** `B08a: verify independent managed-service compatibility`.

## B09 — Independently deploy equivalent staging

**Depends:** B08a and later authorized staging cap; deferred while cloud spending is $0.
**Goal:** same cloud topology and operational requirements with independent IaC.
**Writes:** `infra/`, release/secret/backup/telemetry configuration and evidence.

Use the already prepared IaC, requote a concrete plan, obtain any missing activation approval and
use dedicated environment/credentials.
Deploy the same GCP services with private stores, protected ingress, regional redundancy,
Pub/Sub/archive policy, digest-pinned images and controlled
migrations. Demonstrate release rollback and credential rotation. Record fixed/variable cost,
quotas, inventory and teardown. Do not reuse A IaC or mutate `qrwty.io`.

**Checks:** D01–D03/D10, cloud A01/A06/A07/A14. **Commit:** `B09: deploy independent staging`.

## B10 — Fault, restore and security review

**Goal:** meet the same resilience/security gate, including actual failures.
**Writes:** independent fault harness/runbooks, findings/fixes and evidence.

Run F01–F10 on multiple replicas with the same fault schedule and data. Force failover, restore
isolated PITR, reconcile committed records and deletion/tombstone behavior. Exercise authorized
alerts and review auth, isolation, URL handling, origin restrictions, dependencies and images.
Fix issues within the unit or commission a bounded corrective unit; keep failed evidence.

**Checks:** D02–D05/D07–D09, all F rows. **Commit:** `B10: verify independent recovery and security`.

## B11 — Equivalent capacity and cost proof

**Goal:** the same tested tier with transparent resource cost.
**Writes:** load/seed code, capacity/cost report and recovery evidence.

Use the neutral workload, dataset, probe locations and approved spend. Measure offered/completed
RPS, distributions, misses/hot keys/cold cache, storage and backlog. Match provisioned resources
for the controlled run, then find the lowest tested passing configuration separately. Record
regional recovery if authorized; otherwise the same global-resilience limitation applies.

**Checks:** L01–L05 and D06 at the same authorized scope as A. **Commit:**
`B11: measure independent capacity and cost`.

## B12 — Maintenance challenge and measurement

**Goal:** independent response to the frozen change request, then final evidence.
**Writes:** required feature change, tests, neutral source inventories and usage report.

Receive the same challenge brief at the same maturity point as A. Implement without A's solution,
record all retries/effort and rerun shared regression gates. Inventory backend/UI/SQL/IaC/tests,
with explicit dependency reuse. Reconcile request-level tokens/costs and missing coverage. Publish
the final commit, deployment digests, tier and limitations to the comparison reviewer.

**Checks:** M03–M05 equivalents, full relevant product/cloud regressions. No generated share is
claimed. **Commit:** `B12: record independent maintenance and final metrics`.

## B13 — Release candidate or selected production operation

**Goal:** preserve a complete deployable comparison arm, without claiming two apps own one domain.
**Writes:** release pack and, if selected, approved cutover/observation evidence.

Produce the same priced release/rollback pack as A. If B is selected for `qrwty.io`, follow Q18's
neutral release and live-billing requirements. Otherwise retain its isolated reference deployment for the agreed
comparison period, then destroy costly resources only under the accepted retention plan while
preserving source and sanitized evidence. Record actual 30-day observations only after collected.

**Checks:** same selected release gate and external probes. **Commit:**
`B13: record independent release readiness`.

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
telemetry/queue isolation and cloud placement. Specify transaction/idempotency, cache freshness,
event version/replay and failure behavior. Use the same names/contracts as the neutral pack;
do not import A's diagrams as an implementation recipe. High-level shared design inputs are
disclosed as shared preparation. Record dependency/library choices and alternatives.

**Checks:** each API/data ownership/SLO maps to a named component; no loop or double writer
unexplained; editable drawings open/render. **Commit:** `B01: design independent QRWTY architecture`.

## B02 — Build the runtime and prove cloud compatibility

**Goal:** independent process lifecycle, clients and real-provider fit.
**Writes:** runtime source, disposable provider probe, root scripts and tests.

Implement strict config validation, HTTP admission/timeouts/errors, structured redacted logs,
graceful shutdown, health/readiness, bounded connection pools, TLS verification and secret injection.
Use established clients; do not invent cryptography or database protocols. Implement a scoped
transaction API with rollback. Test real managed DB/cache/broker/OIDC against the same selected
services, under the same bounded probe budget as A. Record migrations and least-privilege grants.
Teardown disposable resources. Runtime failures must not leak secrets or kill unrelated paths.

**Checks:** independent unit/integration tests; G-equivalent cloud requirements from neutral pack;
D02 subset; clean build. **Commit:** `B02: implement and verify independent runtime`.

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

**Checks:** A04–A08/A14/A15/F07 with two accounts and real provider compatibility.
**Commit:** `B04: implement accounts and ownership`.

## B05 — Redirect path and cache

**Goal:** identical public routing contract and independence from broker/identity.
**Writes:** lookup/cache/responder and edge route map with their tests.

Implement 302/no-store, exact destinations, HEAD/405 and status semantics. Enforce authoritative
version, absolute validation deadline and expiry on every cache hit. Bound cache calls, fallback
admission and coalescing; guard stale-fill races. No broker or identity startup dependency.
Add optional bounded telemetry sender interface, then fault it. Store public routing views only.

**Checks:** A07–A09/F01/F02/F04/F05; same freshness bound across replicas.
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

**Goal:** same count definitions, privacy/retention and loss boundary.
**Writes:** independent intake/publisher/consumer/aggregate/query implementation.

Build bounded buffer/batches, authenticated intake, confirmation semantics and versioned events.
Implement explicit dedup/replay horizon and bounded retention; size it for the agreed tier.
Expose owner-scoped aggregates/export/freshness/coverage. Prove correctness after duplicate,
late, poison and replayed events, including kill between commit and ACK. Do not use A code.

**Checks:** A06/A10–A13/A15/F03/F06/F08, known-stream reconciliation and storage-growth proof.
**Commit:** `B07: implement independent analytics`.

## B08 — Independently implement the approved UI

**Goal:** same approved product design with independently authored source.
**Writes:** `web/`, required BFF adaptation, UI tests and screenshots.

Use the common selected visual direction/tokens/assets and UX contract. Implement create/result,
copy/QR, sign-in/claim, library/edit/disable and analytics/export, with every error state. No copied
A components, client code or screenshot-driven source extraction. Count all UI work separately.
Verify accessibility, responsive/dark/solid/reduced-motion variants, QR scans and mobile performance.

**Checks:** A01/A04/A14/U02–U08; owner review uses the same rubric as A.
**Commit:** `B08: implement independent QRWTY UI`.

## B09 — Independently deploy equivalent staging

**Goal:** same cloud topology and operational requirements with independent IaC.
**Writes:** `infra/`, release/secret/backup/telemetry configuration and evidence.

Prepare priced plan, obtain any missing approval and use dedicated environment/credentials.
Deploy private stores, protected ingress, multi-AZ tasks, digest-pinned images and controlled
migrations. Demonstrate release rollback and credential rotation. Record fixed/variable cost,
quotas, inventory and teardown. Do not reuse A IaC or mutate `qrwty.io`.

**Checks:** D01–D03/D10, cloud A01/A06/A07/A14. **Commit:** `B09: deploy independent staging`.

## B10 — Fault, restore and security review

**Goal:** meet the same resilience/security gate, including actual failures.
**Writes:** independent fault harness/runbooks, findings/fixes and evidence.

Run F01–F08 on multiple replicas with the same fault schedule and data. Force failover, restore
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
neutral release requirements. Otherwise retain its isolated reference deployment for the agreed
comparison period, then destroy costly resources only under the accepted retention plan while
preserving source and sanitized evidence. Record actual 30-day observations only after collected.

**Checks:** same selected release gate and external probes. **Commit:**
`B13: record independent release readiness`.

# QRWTY sequential build coordinator prompt

> **Amended by the [owner decisions of 2026-11-13](owner-decisions-2026-11-13.md)** (cloud within the GCP
> trial and Cloudflare free plan, Stripe test mode, both UI skins, Fable reviews, coordinator push).
> Where they conflict with this file, the decisions win.

Give this document to the execution coordinator when starting the build. Preparing this prompt
does not start the build. Read [readiness](readiness.md) for the inspected starting conditions;
the coordinator must recheck them because other agents are working in Jeeves.

---

You are coordinating the QRWTY build. **Execute the local build through fresh subagents, one at
a time.** Do not stop after producing another plan. Use the existing unit plans and contracts;
continue through eligible work until both local applications and their deployment-preparation
packs are complete, or until a concrete external dependency/required owner decision prevents
further useful work. Never report planned work as completed.

## 1. Objective and authority

Build two independently implemented versions of the same product:

- **A:** Jeeves-assisted QRWTY in `/home/ash/github/qrwty`. Save the actual Jeeves design first,
  freeze an untouched generated backend baseline, then complete the product hooks/SQL and UI.
- **B:** independent QRWTY in `/home/ash/github/qrwty-baseline`, without Jeeves-generated code or
  A's implementation. Create this local repo only if absent; preserve any existing destination.
- **Jeeves:** `/home/ash/github/jeeves`, for supported diagram authoring and separately assigned
  necessary generic template fixes. It is not the generated app's repository.

I authorize you, as coordinator, to assign fresh subagents **sequentially** for the local units,
bounded reviews/repairs and required QRWTY generic gap work once the Jeeves checkout is available.
This does not authorize taking over other coordinators' active units or running parallel workers.
Implementers and reviewers may not spawn agents themselves. Follow each repo's AGENTS.md. Work on
`main` in the primary checkouts; no branches, worktrees, stash, destructive resets or remote push.
Local unit commits are authorized. Do not ask for permission for each routine local unit.

Current additional cloud/service budget is **$0**. No cloud provisioning, trials, billing
activation, paid provider calls/load tests, live payments, DNS cutover or purchase of model/API
capacity. Use the currently available execution tools; record their usage/cost coverage honestly.
No-charge provider sandboxes are optional only if already accessible and permitted by the
local-to-cloud contract. Never send real email/SMS/chat or customer notifications as a test.

Do not edit Jeeves's root README. QRWTY README updates with actual diagrams/results are requested;
preserve its original owner prose, research, `.docs/`, and unrelated changes in every checkout.

## 2. Read the governing documents before dispatch

Read QRWTY `AGENTS.md`, latest `docs/handoff.md`, and these files under
`/home/ash/github/qrwty/docs/plans/production-build/`:

1. `README.md`, `readiness.md`, `local-to-cloud.md`.
2. `product-contract.md`, `durable-clicks.md`, `billing-contract.md`, `acceptance.md`.
3. `comparison.md`, `architecture.md`, `snapshot-and-sources.md`.
4. `design-brief.md`, `cloud-strategy.md`, `units.md`, `baseline-units.md`.

You may read all unit plans to schedule work. A worker receives only its assigned unit, required
shared contracts and relevant same-arm handoffs. The baseline isolation rules below override
any temptation to pass your entire conversation or A's repository context to B.
Set each tool command's working directory explicitly to the assigned repo; the parent session's
default directory may still be Jeeves. B00 may create its absent destination without inspecting
unrelated sibling repos.

The current scope is the local milestone in revision 3. Older handoffs describe earlier decisions:
do not revive AWS as default, optional/lossy click capture, deferred billing or paid early probes.
If a real contract conflict remains, record the exact clauses and resolve only the affected work.

## 3. Non-negotiable product and deployment behavior

- Anonymous quick-link and QR creation requires no sign-in or card. Guest links have no automatic
  expiry. Claiming requires a verified account plus the unexpired one-time proof, not a public slug.
- Individual free/paid accounts, owned saved links, edits, analytics, subscription management and
  server-enforced entitlements are in scope. No teams, custom domains or enterprise SSO.
- Every eligible successful GET redirect has a durably acknowledged event first. No/unknown ACK
  means bounded failure, normally 503 without Location. No after-response buffer, event sampling
  or payment dependency in that path. HEAD is not a click. Recorded attempts do not prove the
  destination loaded. Keep retry IDs, dedup, retention and replay semantics from the contract.
- Correctness must survive multiple application copies. No process-local ownership, session,
  quota or idempotency authority; no local disk as durable business state; no sticky-session
  correctness requirement. Preserve scoped authorization, SQL transactions and cache deadlines.
- Verify payment signatures over original bytes; durable inbox before webhook success; reconcile
  unordered/duplicate events. Browser Checkout return parameters never grant paid access.
  Downgrading cannot break existing permitted links or weaken click recording.
- Build real provider adapters, production containers, external configuration/secrets, migrations,
  IaC, deployment/rollback scripts and observability during local work. Production rejects fake
  providers, emulator bindings, development secrets and disabled TLS verification. Promote the
  same image/UI artifacts; do not plan a later rewrite to make them cloud-compatible.
- Local Pub/Sub emulator/fixtures test wiring and application ordering, not managed durability,
  IAM, archive delivery or regional failure. Cloud scale/failover remains unproven until real tests.
- Use the specific Liquid Glass design brief. Create/result/library/analytics/billing must work
  by mouse/touch and meet accessibility/performance gates. No generic template appearance or
  fabricated marketing evidence. Owner review selects the visual direction before full UI work.
- Never hand-edit generated-owned files. A missing mechanism is a recorded template gap and a
  separate Jeeves assignment. App policy belongs in hooks/stubs/product SQL; UI and deployment
  remain outside Jeeves. Never add scaffolding or move policy into templates to inflate LOC share.

## 4. Start with preflight and Q00; do not wait for a hosting budget

Record actual Git HEADs, branches, dirty-path inventories, app/baseline path existence and any
active reservations. Read Jeeves's latest handoff, AGENTS.md and active plans before using its
studio, source or shared test ports. Do not clean up another agent's work.

At prompt preparation, Jeeves had an active SO01–SO03 store-outage plan, dirty runtime/template
files and a newly committed UF01–UF06 plan. That is a snapshot, not permanent status. A passing
old test or a new planning commit does not establish completion of those units. For Q01/Q02,
require a stable committed generator/studio revision and a safe authoring/test window. Do not
freeze bytes from mixed committed/uncommitted source. Do not take over SO/UF units, kill their
processes, overwrite their projects, or invent an exclusive lease because Git looks clean.

Start Q00 in a fresh worker now if its inputs remain valid. Keep useful neutral/baseline work
moving while the Jeeves window is unavailable. Resolve routine local choices without repeatedly
asking the owner:

- Use the proposed product defaults as **local test assumptions** and record them: 24-hour
  claim/idempotency window; 31-day raw/replay policy, 35-day dedup, 13-month aggregates, 14-day
  operational logs; seven-day proposed payment grace; account deletion disables owned links.
  These are not approved live legal/commercial policies.
- Freeze explicit small free/paid quota fixtures and test-only price identifiers. Exercise limit
  boundaries, upgrades and downgrades; do not invent a live selling price. Production must require
  real configuration before activation.
- Use one consistent already-available execution model/configuration for corresponding A/B work
  and a matched review policy. Capture requested labels/settings separately from actual reported
  model identity. Do not silently switch model/effort between arms. If exact IDs or usage are not
  exposed, mark them unknown and disclose the comparison limitation; do not claim a known match.
- Freeze toolchain/dependency versions under repo rules, common functional requirements,
  neutral test fixtures/oracle specifications and the LOC scope before either implementation.
  Paid capacity or missing usage telemetry is not permission to buy access.

Q00 must leave a versioned, hashed neutral pack and a usable recording workflow, not just prose
saying that metrics will be collected later. It must distinguish what is recorded automatically,
what the coordinator can count directly, and what remains unavailable.

## 5. Schedule the two arms explicitly

The default logical sequence is below. Only one child is active at a time, including reviews.
You may switch to another eligible unit when a dependency is blocked; record the actual order.

| Work | Order and gates |
| --- | --- |
| Shared setup | Q00 first; establish contracts, neutral pack, run IDs and telemetry before diagram/build calls |
| A architecture and baseline | Q01 → Q02 → Q03 → necessary separately assigned generic gap units/reviews → Q04 local checks → Q05 untouched baseline |
| A backend | Q06 → Q07 → Q08 → Q09 → Q10 → Q10a → Q10b |
| A design/UI | Q11 reviewable directions → actual owner selection → Q12 product UI and deployment pack |
| B local build | B00 → B01 → B02 → B03 → B04 → B05 → B06 → B07 → B07a → B07b → B08 |
| B UI gate | B08 also requires the same owner-approved design assets/UX contract, with independently authored components |
| Current finish | Both local packs, independent final reviews, measured local report and visible deferred cloud checklist |

B00–B07b can run before A finishes when the neutral pack is frozen and resources are available.
Do not stall all work on a Jeeves reservation or the Q11 visual decision. Q16 is the umbrella for
the independent arm and can be scheduled early; it does not require a completed cloud deployment
before starting B00. Do not mark Q16's full deployment comparison done when only local work passed.

Q12a, Q13–Q15, Q18, B08a, B09–B11 and B13's cloud operation are **deferred**. Prepare their inputs
without executing them. Q17/B12's final deployment comparison/maintenance gates are not implicitly
complete: publish a preliminary local report, keeping M05 and remaining live gates pending. Do
not add the maintenance challenge feature to the initial product unnoticed.

If a unit is too large for a fresh context, define narrow numbered subunits before dispatch, with
explicit file/interface boundaries and cumulative exit gates. Preserve parent dependencies and
baseline timing. A split is not permission to discard a requirement or compress everything into
a single agent's unreviewed implementation.

## 6. Fresh-agent dispatch and acceptance loop

For each work item:

1. Verify dependencies against actual commits/artifacts, not completion prose alone. Snapshot
   the target repo's current HEAD/dirty paths and check shared ports/container ownership.
2. Save the exact assignment prompt, run/attempt ID and input hashes **before dispatch**.
3. Spawn a new child with no inherited conversation (`fork_turns="none"` where supported). Do
   not reuse a previous worker for another unit or simulate freshness with “forget the above.”
   If fresh isolation is unavailable, report that constraint rather than claim the experiment
   followed this workflow. Workers get no authority to delegate or start the next unit.
4. Wait for the worker to finish. Keep the owner updated with findings/blockers, not repeated
   permission questions. Do not launch a second writer/reviewer during the first child's work.
   Finish/stop the current child and close it if the tool supports that; never give its idle
   context a different unit. Use only agent-management operations actually available.
5. Inspect the reported commit, changed paths, evidence and test results. Check that generated
   ownership, budget boundaries, intended behavior and scope were respected. A worker's
   “passed” statement without a run/artifact is not enough. Do not repeat whole suites merely
   for reassurance when current evidence already satisfies the gate.
6. Use a **fresh review child** after security/correctness boundaries and final local packs:
   at least Q03/Q05 for A's generation boundary; Q07/Q08/Q10/Q10a/Q10b/Q12 and corresponding
   B04/B05/B07/B07a/B07b/B08 for product behavior. Freeze this review policy in Q00. A-only
   generation review is part of A's cost. The reviewer examines implementation/evidence, not
   just summaries, and must not see the other arm's implementation.
7. Reviewers may write only a named review report and their handoff entry, then commit those
   paths. They do not repair source during review. For a finding, assign a new fresh bounded
   repair worker, preserve the failed evidence, and review the changed behavior again. Stop
   retrying the same failed approach without diagnosis; split/re-audit the issue when needed.
8. Accept the unit only after required checks/review pass. Record actual commit hashes and next
   eligible work. Continue automatically. Do not end the coordinator run after every child.

Coordinator state/usage/checkpoint files are coordinator-owned; workers never stage them by
accident. At idle boundaries, preserve these as separate documentation checkpoints with a handoff.
Never amend, squash or rewrite implementation commits to hide failed attempts or retroactively
change the frozen generated baseline. Hash references are recorded after commits exist.

If a worker stops with uncommitted changes, retain a path/diff-hash inventory and explicitly
transfer only its owned work to the next repair worker. Do not treat those paths as abandoned,
stage unrelated edits, or restart the same unit over them without examining the checkpoint.

## 7. Supply this complete assignment packet to every child

Replace every placeholder before spawning. Copy the full assigned unit text into the packet or
provide an exact heading/extraction plus its hash; do not say only “do Q08.”

```text
Role: implementer / reviewer / bounded repair
Run ID / arm / unit / attempt:
Working repository and branch:
Expected starting HEAD; known unrelated dirty paths and reserved resources:
Objective and explicit acceptance conditions:

Authority: one assigned item only. No subagents, next unit, branches/worktrees/stash,
remote push, cloud provisioning, new paid calls or unsolicited messages.
Report missing owner decisions to the coordinator; do not start a separate approval conversation.

Required reads: this repo's AGENTS.md, latest relevant same-arm handoff entries,
listed common contracts, assigned unit text and dependency evidence at these exact paths.
Allowed reads/writes: enumerate files/directories and any permitted external checkout.
Forbidden reads/writes: enumerate; baseline workers cannot inspect Jeeves or A source/history.

Full unit specification:
Interface/schema inputs and expected outputs:
Dependencies already accepted, with commit/artifact hashes:
Product invariants and test IDs that this item must preserve:
Exact checks to run, or command-discovery step if the repo has no scripts yet:
Evidence paths and required result fields:
Usage/prompt artifact ownership and how to report unavailable fields:

Known limits/blockers; independent work allowed if a dependency is unavailable:
Stop conditions: missing required capability, unsafe scope conflict, unavailable owner
decision or failed required checks. Preserve progress; no invented success or weakened gate.

Finish: append a short handoff, stage only your unit's files, create one local unit commit
when its checks pass, report results, then stop. For a blocked item, report exact remaining
work and preserve changes without presenting an incomplete unit as passed.

Return:
- Unit/attempt and status: passed / failed / blocked / needs-owner-review.
- Starting and resulting commit hashes; any uncommitted owned changes.
- What changed and why; generated vs product vs UI/support ownership.
- Commands/checks, exit status, tested source/image, evidence paths and observed outcomes.
- Remaining defects, unrun checks and exact blocking input if any.
- Usage/model data with source and coverage, prompt artifact references, elapsed time.
- Suggested next eligible unit only; do not execute it.
```

For Jeeves gap units, include the failing reproduction, smallest generic interface change,
template/canvas/catalog/schema impact, generated-payload effects, tests and regeneration proof.
After the existing active plan releases the checkout, assign such fixes as their own Jeeves
units. Do not silently append them to a QRWTY product unit or rewrite the active plan to obtain
permission. If another coordinator still owns that scope, hold the dependent work and continue
eligible independent units.

## 8. Protect the comparison from source leakage

Q00 prepares `docs/benchmarks/neutral-pack/<version>/` with a manifest and explicit allowlist:
product/API/data rules, cloud/local contract, accepted high-level topology, design assets,
external test specifications and B-specific execution briefs. Exclude A source, generated
payloads/tests, generator internals, A handoffs, A IaC and A incident/repair histories. This is a
controlled shared-design comparison; disclose shared preparation rather than claim independent
architecture discovery.

B00 may read only that allowlisted pack from A's repository to bootstrap B, then stores its own
copy and instructions. Thereafter give B agents only B's repo, pack and B history. **Do not pass
this entire coordinator prompt/history to a B worker**: extract its scoped packet and neutral
rules. The coordinator must not turn lessons from A into implementation hints for B. A genuine
shared requirement correction is a versioned amendment sent to both, with rework charged to each.

Fresh context is not a filesystem security boundary. Use read allowlists, record actual tool
access where exposed, and disclose any violation. If implementation leakage occurs, pause that
comparison claim and record the contamination; do not quietly delete the evidence. No source
copying between arms, even to save time or make a test pass. Approved visual assets/specifications
may be shared; UI source and IaC may not.

If executable neutral acceptance tooling is still needed, assign it as an explicit shared task
from Q00's frozen oracle specification, before either arm uses it. Its fresh author receives no
A/B implementation. Charge it once as shared preparation; arm-specific integration harnesses
remain independently authored. Do not promote A-generated tests into the neutral pack.

## 9. Capture evidence and measure honestly

Initialize the run ledger before Q01 or B implementation, following comparison.md. Keep append-only
attempt records and sanitized prompt/result artifacts. Capture coordinator, worker, reviewer,
repair, template-development and human-review effort. Preserve failures, cancelled work, retries
and compactions when telemetry exposes them. Never record hidden reasoning or secrets.

Record actual provider model IDs and usage when available. Otherwise use null plus an explanation;
never equate subscription access with zero cost or fabricate token totals. Count known owner
instructions and submitted child assignments directly; distinguish them from model requests,
tool calls and tokenizer estimates. Reconcile provider counters without double-counting cached
or reasoning tokens. Missing token coverage limits the token comparison, not the ability to
report verified source counts and product results.

For A, preserve Q02's diagnostic export and Q05's untouched baseline/manifest/provenance. Freeze
before product hooks or SQL are completed. Count backend source with the pinned source-loc-v2
method from Git objects. Report G0, retained R, added/replaced C, removed D and final B, checking
R+C=B and G0−R=D. Backend template share is R/B, undefined for empty backend. UI is separate;
SQL/IaC/scripts/tests/docs are separate support counts. No invented baseline for B and no claimed
generated share for it. Include all QRWTY-driven template work in A's first-application cost.
M02's deliberate generated-edit refusal check operates only in a disposable test copy; canonical
generated-owned files remain untouched by hand.

Persist a coordinator state file with run IDs, pinned pack/tool/model settings, accepted unit and
review commits, active attempt, blockers, owner decisions, deferred cloud tests, next eligible
work and usage coverage. After context loss, verify it against Git/evidence and resume the next
eligible task. Do not rerun completed units blindly, spawn a duplicate worker, or replace actual
results with an old planning snapshot.
Check any recorded child ID's actual status before resuming an interrupted attempt; a tool call
or worker may still be running. Do not launch its replacement concurrently.

## 10. Verification and real stopping points

Use the exact repo checks and meaningful acceptance/failure cases for each item. Discover scripts
before calling them; planned `pnpm` commands do not yet exist in QRWTY. Tests use isolated local
data/stores and controlled destinations. Reserve ports and scoped container labels, clean up only
your own resources, and never run a broad Docker prune. Local host listeners stay loopback.

Every separately assigned Jeeves implementation unit follows its AGENTS.md and applicable plan:
`pnpm check`, `pnpm test:e2e` or its supported Docker fallback, `pnpm --filter @jeeves/web build`,
required generated-system checks, and mouse verification for visible changes including TinyURL.
Do not run competing suites against another agent's ports/database. Never weaken checks to make
an existing template look production-ready.

For the product, exercise real local DB concurrency, click ACK failure/ambiguity, consumer replay,
cross-account authorization, raw signed webhooks, duplicate/late billing events, quota races,
cache deadlines, retention recovery and graceful restart to each unit's local scope. Treat real
cloud-only assertions separately. R01–R06 must demonstrate deployment preparation, including a
fresh-checkout rehearsal and production rejection of local test configuration.

At Q11, produce the two concrete visual directions and ask the owner to choose using the saved
prototype/screens. Do not fabricate that approval or let a timeout count as approval. Continue
eligible backend/B work while waiting. Likewise preserve a required owner decision if a new
product tradeoff cannot be resolved by the frozen contract. Explain the precise blocker once
with useful artifacts, rather than asking again about already settled requirements.

Finish this authorized run with:

- Both local apps runnable independently with complete required flows and their local checks.
- Saved/reopenable actual Jeeves design, blueprint/images, generation report and provenance in A;
  updated explanatory Excalidraw sources/renders and README links.
- Production-built images/UI hashes, environment examples, real provider adapters, IaC,
  migrations, bootstrap/deploy/rollback instructions and local rehearsal evidence for each arm.
- Matched local acceptance/review results, truthful backend/UI/support inventories and all-effort
  ledgers with missing telemetry clearly labeled; preliminary comparison, not a productivity claim
  unsupported by evidence.
- Remaining live-provider/security/failure/load/maintenance/observation work visibly pending;
  status **locally verified; cloud activation pending**, never “production deployed” or “TinyURL
  scale proven.” No required production path hidden behind a TODO, fake adapter or 501.
- Commits, exact local run instructions, remaining owner decisions and a clear next-step handoff.

If you reach a genuine block before that milestone, preserve accepted work and report which
independent units were completed, which units are blocked, and the exact condition needed to
continue. Do not claim either app or the comparison complete merely because you have written
plans, exhausted a context, or reached an unresolved cloud/UI gate.

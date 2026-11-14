# Frozen experiment decisions (neutral pack v1)

Frozen by unit Q00 of run `qrwty-r1-20261114` on 2026-11-14 (UTC). These are the shared inputs
both arms build against: A (Jeeves-assisted, repository `qrwty`) and B (independent, repository
`qrwty-baseline`). A value marked **test assumption** or **not approved pricing** is a local
fixture, not an approved legal, commercial or live policy.

## 1. Precedence

1. [Owner decisions of 2026-11-13](../files/docs/plans/production-build/owner-decisions-2026-11-13.md).
   Where they conflict with anything else, they win.
2. The `frozen/` documents of this pack: this file, the [HTTP and event contract](http-contract.md),
   the [black-box acceptance specification](acceptance-oracle.md), the
   [oracle tooling plan](oracle-tooling-plan.md) and the [source-count method](loc-method.md).
3. The copied contracts under `files/`. They are byte-identical to the planning commit
   `0e2e1f2717b8a823ff501dbec95aebc9dc675d4b`; section 2 lists the sentences in them that the owner
   decisions made false.

A requirement change after this freeze is a new pack version (`v1.1`, `v2`, ...), sent to both
arms by the coordinator, with each arm's rework charged to its own ledger. Neither arm changes a
shared requirement on its own, and neither arm edits a pack file.

## 2. Statements in the copied contracts that the owner decisions superseded

The copied files keep their original words so their hashes match the planning commit. Read them
with these replacements.

| File and place | Original statement | Read instead |
| --- | --- | --- |
| `local-to-cloud.md`, opening line and "Current execution boundary" | No new cloud or paid-service spending; no cloud resources, billing, trial or live payments; Q00 records a $0 budget; Q12a/Q13–Q15/Q18 wait for a later owner instruction | Cloud work is activated **within the GCP free-trial credit only** (owner decisions §1). After each arm's local pack passes: A runs Q04's probes, Q12a and Q13; B runs B08a and B09. Q14/Q15 and B10/B11 failover, load and regional tests stay deferred. No live payments (Stripe test mode only) |
| `cloud-strategy.md`, opening paragraph | "Current cloud/service budget: $0 … do not provision even a trial/free-tier project now"; "No cloud account … created" | The trial project, billing link and gcloud credentials exist (owner decisions §1). The first cloud unit creates a budget with $10, $25 and $50 monthly alerts before any other resource. Resources are still to be created |
| `cloud-strategy.md`, reference topology, DNS/TLS row | Cloudflare plan "quote actual plan" | Cloudflare **Free** plan only: DNS, proxy/TLS, free WAF rules, Workers and static hosting within free limits (owner decisions §2) |
| `cloud-strategy.md`, "Deployment progression and cost" | Cloud work deferred; a paid apply needs a reviewed plan and an authorized cap | Activated within the trial credit for staging and probes. Each resource's hourly price and teardown command are recorded before apply. Spend beyond the credit stays an owner decision |
| `billing-contract.md`, first paragraph | "Stripe is a recommended provider, not an already connected account" | A Stripe **test-mode** account exists (owner decisions §3). Test-mode calls are the no-charge sandbox; live keys are never used or requested |
| `acceptance.md`, row U01 | Owner visual review; decision recorded before full UI build | Q11 publishes both directions as reviewable artifacts; both are built as switchable skins; a fresh Fable reviewer records a **reviewer's default** ("the owner may override"). No owner selection gates Q12 or B08 (owner decisions §5) |
| `design-brief.md`, second paragraph and last section | The owner judges the design and selects a direction; the owner's acceptance is Q12's entry condition | Same as U01 above. The brief's evaluation criteria are what the reviewer applies to pick the default |
| `baseline-units.md`, B02/B08a/B09 | "$0 cloud spending"; "Deferred under the current $0 cloud/service budget" | B08a and B09 run within the trial credit after B's local pack passes; B10/B11 stay deferred |
| `baseline-units.md`, B08 | "the common selected visual direction" | Both skins from the same frozen design assets as A (owner decisions §5) |
| `durable-clicks.md`, `local-to-cloud.md` (evidence boundary) | Live durability proof waits for "cloud activation" | Still true: local emulator evidence never proves managed durability. Activation now happens after the local build, within the trial |

Settled by this freeze rather than superseded: `product-contract.md`'s open choice on account
deletion (owned links are **disabled**, section 3).

## 3. Local test assumptions

All times are UTC. These are **test assumptions**, not approved live legal or commercial policy.

| Item | Frozen value | Source |
| --- | --- | --- |
| Guest claim proof lifetime | 24 hours from creation; one-time | product contract |
| Idempotency window (create, claim, checkout, account deletion) | 24 hours; scoped to the verified account or the server-issued guest session | product contract |
| Slug | 10 base62 characters from a CSPRNG (about 60 bits); unique `(domain_id, slug)`; at most 5 collision retries, then 503 `slug_allocation_failed` | product contract |
| Destination length | At most 8,192 bytes of UTF-8 | product contract |
| Pub/Sub topic and analytics subscription retention | 31 days; subscription inactivity expiry disabled | durable clicks |
| Raw sanitized archive (Cloud Storage export) | 31 days | durable clicks |
| Automatic same-stream replay | Up to 31 days from original event time; older events are quarantined for an isolated rebuild | durable clicks |
| Deduplication horizon | 35 days | durable clicks |
| Aggregate analytics | 13 months | product contract |
| Operational (technical) logs | 14 days | product contract |
| Abuse data | Admission counters expire within 24 hours and key on a keyed hash of the client address (IPv4 /32, IPv6 /64), never the raw address; abuse reports and operator actions kept 13 months, restricted to operators | Q00 test assumption |
| Billing records | Webhook inbox events kept 35 days after successful processing; failed items kept until repaired; customer mapping removed with the account except provider-held records | Q00 test assumption; live retention is an owner decision before live billing |
| Route cache | Entries carry an absolute `validatedUntil` at most 30 seconds after the authoritative read; copying never extends it; no negative caching | cloud strategy |
| Edit, disable, delete and block propagation | No redirect with the old allowed state 60 seconds after the durable commit | cloud strategy |
| Link expiry | Enforced on every hit, rechecked after the durable-ACK wait; recorded clock bound at most 1 second | cloud strategy |
| Entitlement grant validity | At most 60 seconds | billing contract |
| Payment grace | 7 days from the first unresolved payment failure; duplicate events do not extend it; cancel-at-period-end keeps paid access to `paidThrough`, then free | billing contract |
| Account deletion | Owned links become **disabled** (redirect 410) within 60 seconds, lose their owner and cannot be re-enabled; slugs are never reassigned; sessions are revoked; the subscription is scheduled for cancellation; private data is removed and the deletion is reapplied after any restore | product contract default, frozen |
| Browser session | Absolute lifetime 7 days, idle timeout 24 hours, server-side revocation | Q00 test assumption |
| Owned-link list page | Default 20, maximum 50, stable `(created_at, id)` order, newest first | product contract |
| Pipeline alerts | Archive lag warning above 5 minutes, urgent above 30; analytics lag degraded above 60 seconds; oldest backlog urgent above 1 day | durable clicks |
| Click filter | `filter-v1`: an event is a bot when its device class is `bot` (empty user agent, or one matching `bot|crawl|spider|slurp|preview|facebookexternalhit|curl|wget|python-requests|httpclient`, case-insensitive) | Q00 test assumption |

## 4. Tier and quota fixtures — not approved pricing

**Not approved pricing.** These fixtures exist so both arms test the same boundaries. No live
price, currency, or limit may be inferred from them. Production configuration must refuse to
start without explicit live values, and none are configured in this run.

| Policy revision | Owned-link creations per UTC calendar month | Analytics lookback | Breakdowns (device, country, referrer host) | CSV exports per month |
| --- | ---: | ---: | --- | ---: |
| `free-test-v1` | 5 | 7 days | No | 1 |
| `paid-test-v1` | 50 | 90 days | Yes | 20 |

- Guest creation is not an account allowance. It is limited by the admission fixture
  `guest-admission-test-v1`: 10 creations per 60 seconds per admission key, then 429 with
  `Retry-After`. It is approximate and distributed; exact limits apply only to accounts.
- A claim consumes one owned-link creation. Deleting a link never refunds one. Usage survives
  upgrades and downgrades within the period. A downgrade never disables a link.
- One paid plan, logical key `paid-monthly`. Its **test-only** Stripe price is created in the
  Stripe test-mode account by each arm's billing unit (Q10a, B07a), separately per arm:
  lookup keys `qrwty-a-test-paid-monthly` and `qrwty-b-test-paid-monthly`, product name
  `QRWTY Paid (test, not approved pricing)`, **USD 5.00 per month, test fixture**. The resulting
  `price_…` ID is configuration (`STRIPE_PRICE_PAID_MONTHLY`), never source or a diagram.
- Offline tests use the fixture ID `price_TEST_qrwty_paid_monthly_v1`, which production
  configuration rejects. Each arm uses its own webhook endpoint and signing secret.
- The pricing page and billing pages say plainly that payments are in test mode and prices are
  not real (owner decisions §2).

## 5. Region, providers and environments

| Concern | Frozen choice |
| --- | --- |
| Cloud | GCP, region `us-central1` (owner decisions §1); spend only from the free-trial credit |
| Edge, DNS | Cloudflare Free plan on `qrwty.io` |
| Payments | Stripe Checkout, Billing and Customer Portal in **test mode**; Connect not used |
| Click transport | GCP Pub/Sub via its official client; locally the Pub/Sub emulator |
| Destination reputation | Google Cloud **Web Risk** Lookup API (`uris.search`, threat types `MALWARE`, `SOCIAL_ENGINEERING`, `UNWANTED_SOFTWARE`), behind a bounded adapter. Locally a fixture server (oracle plan). Its price is recorded before the first live call; live calls only within the trial credit |
| Identity | Local tests: a Keycloak issuer (exact tag pinned and recorded by each arm). Managed issuer: GCP Identity Platform is the candidate; the first live identity probe (Q12a or B08a, whichever runs first) records compatibility, and the coordinator then sends the chosen issuer to both arms as an amendment |
| Stores | PostgreSQL major version 17 (Cloud SQL target); Valkey 8.0 (Memorystore for Valkey target). Each arm pins exact local image tags and records them |
| Containers | One production image per process kind; HTTP services and pull workers separate |

If generator-emitted local service versions in A differ from these targets, A records the
difference at Q02 and does not hand-edit generated files; the coordinator decides on an
amendment for both arms.

**Per-arm isolation.** Separate databases, topics, subscriptions, service accounts, webhook
endpoints, secrets, hostnames and data for A and B. Containers carry the label `qrwty.arm=a` or
`qrwty.arm=b`; B's local host ports are in 47100–47199 on loopback. Secrets are read from
`~/.config/qrwty/*.env` (later GCP Secret Manager) and referenced by variable name only.

**Open, decided before B08a (not blocking any local unit):** whether B's cloud resources live in
a separate project under the same trial billing account or in the trial project with `qrwtyb-`
prefixed resources and separate service accounts; and which hostnames the arms use under
`qrwty.io` (proposal: the A preview at the apex, B at a dedicated subdomain such as
`b.qrwty.io`; `baseline-units.md` B09 forbids B mutating `qrwty.io`, so a B subdomain record
needs the coordinator's confirmation).

## 6. Toolchain

Pinned exactly in both arms. Each version was published at least two weeks before this freeze
(checked against the npm registry and `nodejs.org/dist/index.json` on 2026-11-14).

| Tool | Version | Published | Notes |
| --- | --- | --- | --- |
| Node.js | **24.21.0** (LTS "Krypton") | 2026-09-07 | Runtime for every process, test and build. Containers `FROM node:24.21.0-bookworm-slim`; that tag's index digest on 2026-11-14 was `sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20` (last pushed 2026-10-06). Each arm records the digest it built with. Amended in v1.1 ([section 11](#11-amendments)) |
| pnpm | **12.16.1** | 2026-10-27 | Root `packageManager: "pnpm@12.16.1"`; lockfile committed |
| TypeScript | **7.0.2** | 2026-07-08 | `strict: true`, ESM only (`"type": "module"`), relative imports with extensions |
| `@types/node` | **24.19.2** | 2026-10-09 | |
| Vitest | **5.0.0** | 2026-09-03 | Unit and integration tests |
| Playwright (`@playwright/test`) | **1.63.0** | 2026-09-04 | Browser tests and the oracle's browser rows |
| Biome | **2.6.4** | 2026-10-28 | Lint and format; formatter defaults except `lineWidth: 100` |
| Python | 3.12 (standard library only) | — | Pack and ledger tooling only, never product code |

Rules:

- Dependencies are pinned to exact versions, at least two weeks old when added, and disclosed
  with their purpose. No `@jeeves/*` package or vendored Jeeves runtime in B.
- **Formatting and line counts.** Files an arm writes are formatted with Biome 2.6.4 at line
  width 100. Files emitted by the Jeeves generator, including hook and stub files A later fills,
  are never bulk-reformatted; new lines follow the surrounding style. Reformatting to change a
  line count is forbidden.
- **Host note.** On this machine the default `node` on `PATH` is 18.19.1; nvm holds the pinned
  24.21.0 (`$HOME/.nvm/versions/node/v24.21.0/bin`). Each arm puts it first on `PATH` (or obtains
  it another way) and records how.
- **Compatibility with the Jeeves generator was not verified here.** Q00 may read only one Jeeves
  file. These pins match the toolchain earlier Jeeves-generated QRWTY output used (pnpm 12.16.1,
  Node 24.22.2 image, TypeScript 7.0.2, Vitest 5.0.0) and the machine's pnpm. Q01/Q02 record the
  current generator's emitted pins; if they differ, the coordinator issues pack v1.1 to both arms
  before B02. A never edits generated files to match.

## 7. Execution model, settings and review policy

The same policy applies to A and B (owner decisions §6).

| Role | Requested setting | Actual identity |
| --- | --- | --- |
| Builders and repairs | Claude Code Agent tool, `subagent_type` `general-purpose`, model and effort **inherited** from the coordinator (Opus) | Read from each worker transcript's `message.model`, never assumed |
| Reviewers | Agent tool, `general-purpose`, model **`fable`**, effort **`xhigh`** | Read from the transcript (`claude-fable-5-1` was observed on 2026-11-13; that observation is not a pin) |
| Coordinator | One Claude Code session (Opus) | Its own transcript |

- **Fresh contexts.** Every attempt is a new child with no inherited conversation, one child at a
  time across both repositories. Workers and reviewers never spawn agents.
- **Tool access.** The general-purpose agent tool set: shell, file read/edit/write, search, web
  fetch and search for public documentation. No messaging, mail, calendar, document or drive
  connectors. Read limits are instructions, not a sandbox; any breach is recorded.
- **A later switch of builders to Fable** (if Opus usage runs low) is recorded in the ledger and
  applied to matched A/B pairs: the corresponding units of both arms run on the same builder
  model. No silent model or effort change between arms.
- **Review points.** A fresh Fable reviewer runs after:
  - A's generation boundary: **Q03** and **Q05** (A only; charged to A);
  - product behaviour, matched pairs: **Q07↔B04, Q08↔B05, Q10↔B07, Q10a↔B07a, Q10b↔B07b, Q12↔B08**;
  - each arm's **final local pack**;
  - the Q11 default-skin choice (shared, owner decisions §5).
- **What a reviewer does.** Examines the implementation and evidence, not summaries; writes only
  a review report (`docs/reviews/<UNIT>-review-<n>.md` in that arm's repository) and its handoff
  entry, and commits those. It does not repair source. It may propose new units; the coordinator
  queues and runs them as fresh repairs, then reviews the changed behaviour again. A reviewer
  never sees the other arm's implementation.
- **Records.** Each attempt, including failed, cancelled and repeated ones, has a ledger record
  (see the ledger README in `ledger/`). Model IDs and usage come from transcripts; missing data
  stays null.

## 8. Owner sign-off points

| Point | Status under the owner decisions |
| --- | --- |
| Visual direction | **Not a gate.** Both skins are built; the reviewer's default is labelled as such. The owner may choose later; a cleanup unit then removes the other skin |
| Cloud apply | **Activated within the GCP trial credit** for Q04 probes, Q12a, Q13 (A) and B08a, B09 (B), after each local pack passes. Never upgrade the trial, attach another billing account, buy commitments or support |
| Public DNS on `qrwty.io` | **Authorized** for the test-mode preview. Every DNS record created is recorded. No paid Cloudflare feature |
| Spend beyond the trial credit; Q14/Q15 and B10/B11 failover, load and regional tests | Still needs an owner decision |
| Live payments, live Stripe keys, real prices and limits, merchant setup | Still needs an owner decision; not part of this run |
| Inviting real customers, a production release (Q18/B13) or legal/commercial retention approval | Still needs an owner decision |
| Alert tests that notify a person | Need the owner's chosen destination at that unit |

## 9. Visible task prompts and ledger allocation

- **A's assignment packets** follow the coordinator prompt's §7 template and are saved in
  `qrwty/docs/coordinator/prompts/<unit>-a<n>.md` before dispatch.
- **B's assignment packets** follow the template in the [B execution brief](../b/execution-brief.md)
  and are saved in `qrwty-baseline/docs/prompts/<unit>-a<n>.md` before dispatch, so B's ledger can
  hash them inside B's own repository. They contain no A context.
- **The maintenance challenge (M05)** is withheld from both arms' build packets until both reach
  the agreed maturity point, then given to each in a fresh context with its tests frozen first.
  Known asymmetry: the challenge text is in `comparison.md`, which A's repository holds and this
  pack excludes. A workers are not pointed at it; any exposure is recorded.
- **Ledger allocation:** Q00, the neutral oracle unit, the Q11 design assets and default-skin
  review, coordinator work and shared amendments' drafting go to the **shared** ledger, once.
  Jeeves template work, Q01–Q05 and A's reviews and repairs go to **A**. B00–B13 and B's reviews
  and repairs go to **B**. Each arm's rework after an amendment goes to that arm.
- **Design assets for B08:** Q11's frozen token sets, screens, review package and flow sheet are
  delivered to both arms as a pack amendment. Prototype or UI source is never shared.

## 10. Release labels and blockers for this run

| Label | Required evidence |
| --- | --- |
| **Locally verified; cloud activation pending** | A01–A24 and F01–F10 at local scope through the neutral oracle (F09 local portion), U02–U08 in every skin × light/dark × desktop/mobile, R01–R06, and the arm's M rows (A: M01, M03, M04; B: M03, M04 equivalents) |
| **Staging preview (test-mode payments, trial database)** | The above, plus D01–D03, D09 and D10 at staging, and the cloud subsets of A01, A06, A07, A14, A19, A20 and A24. This is not a production candidate |
| Production candidate, public beta, production observed, regional recovery verified | As in `acceptance.md`; they need the deferred D04–D07, L01–L05 and owner decisions. Not reachable in this run |

On the Cloud SQL trial instance (no backups, no SLA), D05 and every backup/restore or SLA row are
**not run**, never passed. Implementation-specific tests support but never replace an oracle row.

## 11. Amendments

| Version | Date (UTC) | Change | Reason | Decided by |
| --- | --- | --- | --- | --- |
| v1.1 | 2026-11-14 | Node.js pin 24.22.2 → **24.21.0** (published 2026-09-07); container base `node:24.22.2-alpine` → **`node:24.21.0-bookworm-slim`**. pnpm 12.16.1, TypeScript 7.0.2 and `@types/node` 24.19.2 stay (they match the generator); Vitest 5.0.0, Playwright 1.63.0 and Biome 2.6.4 stay (pack choices) | The Jeeves generator that arm A must use emits Node 24.21.0 (`engines`) and the image `node:24.21.0-bookworm-slim`. A never edits generated files (section 6), and the arms must share one runtime | Coordinator, for both arms |
| v1.1 | 2026-11-14 | Adds `oracle/`, the executable neutral oracle of the [tooling plan](oracle-tooling-plan.md), and its build evidence in `evidence/n01/` | The plan's deliverable (unit N01) | N01, as planned |
| v1.2 | 2026-11-14 | Ledger rule R12 in `ledger/ledger.py`: a recorded artifact hash passes when the working-tree file **or** any committed version of that path in the repository's Git history has it. A hash that no version has is still an error; a missing file is still a warning; outside a Git checkout only the working-tree file counts. `ledger.py` now calls the `git` CLI for this check, and its self-test gains four R12 cases. `ledger/README.md` documents the change ([rule changes](../ledger/README.md#rule-changes)) | Living evidence files that later units append to, such as `docs/handoff.md`, failed R12 on the next append, and the ledger writers then refused every new record. The recorded version stays provable from Git, so the rule keeps its strength | Coordinator, for both arms (unit N02) |

Read with this amendment: the Node 24.22.2 mentions in the [oracle tooling plan](oracle-tooling-plan.md)
(the deliverable tree) and in the [B execution brief](../b/execution-brief.md) (§7, step 5) mean
24.21.0. Those files, like every other v1 file except this one, the pack README and
`verify_pack.py` (which now ignores an installed `oracle/node_modules/`), are copied byte for byte
from v1.

v1.2 is a self-contained copy of v1.1 in which only `ledger/ledger.py`, `ledger/README.md`, this
file and the pack README differ; every other file, including `oracle/`, `evidence/n01/` and
`ledger/events.schema.json`, is byte-identical to v1.1. The ledger schema and every other rule are
unchanged, so existing ledgers need no migration. The oracle is unchanged, so its results keep
reporting pack `v1.1`: that label names the oracle build, which v1.2 carries as is.

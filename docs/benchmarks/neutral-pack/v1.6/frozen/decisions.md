# Frozen experiment decisions (neutral pack v1)

Frozen by unit Q00 of run `qrwty-r1-20261114` on 2026-11-14 (UTC). These are the shared inputs
both arms build against: A (Jeeves-assisted, repository `qrwty`) and B (independent, repository
`qrwty-baseline`). A value marked **test assumption** or **not approved pricing** is a local
fixture, not an approved legal, commercial or live policy.

## 1. Precedence

1. [Owner decisions of 2026-11-13](../files/docs/plans/production-build/owner-decisions-2026-11-13.md).
   Where they conflict with anything else, they win. Their section 11 (2026-11-14 night), which
   this pack's copy predates, is quoted in [section 2](#owner-decisions-section-11) and wins over
   section 5 of the copy (pack v1.5).
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
| `owner-decisions-2026-11-13.md` (this pack's copy holds sections 1–8), §5 | Both visual directions are built as switchable skins; a reviewer picks a default skin; every UI check runs in each skin × light/dark × desktop/mobile | Owner decisions **§11** replaces §5: **one** direction in the owner's style, one skin, no reviewer pick. U02–U08 run in one skin × light/dark × desktop/mobile ([quoted below](#owner-decisions-section-11)) |
| `acceptance.md`, row U01 | Owner visual review; decision recorded before full UI build | Q11 chose **one** direction that fits the owner's own style and delivered it in `files/docs/design/` (pack v1.5). There is no second skin, no reviewer's default and no owner selection, so no choice gates Q12 or B08 (owner decisions §11) |
| `design-brief.md`, second paragraph and last section | The owner judges the design and selects one of two directions; the review package covers two directions, a competitor review and Excalidraw flow sketches; the owner's acceptance is Q12's entry condition | Same as U01 above: one direction, chosen by Q11 within this brief's constraints. No second direction, competitor review or Excalidraw flow sheet (owner decisions §11). The brief's states, accessibility, performance and QR rules still apply |
| `architecture.md`, diagram table, "Q11 UI flow sheet" | A Q11 UI flow sheet for U01–U08 | There is no flow sheet (owner decisions §11). The states are in the "Screens and states" table of the [design README](../files/docs/design/README.md) and in the prototype |
| `baseline-units.md`, B02/B08a/B09 | "$0 cloud spending"; "Deferred under the current $0 cloud/service budget" | B08a and B09 run within the trial credit after B's local pack passes; B10/B11 stay deferred |
| `baseline-units.md`, B08 and the note at the top | "the common selected visual direction"; "both UI skins" | The one skin, from the same frozen design assets as A in `files/docs/design/` (pack v1.5; owner decisions §11) |
| `durable-clicks.md`, `local-to-cloud.md` (evidence boundary) | Live durability proof waits for "cloud activation" | Still true: local emulator evidence never proves managed durability. Activation now happens after the local build, within the trial |

Settled by this freeze rather than superseded: `product-contract.md`'s open choice on account
deletion (owned links are **disabled**, section 3).

<a id="owner-decisions-section-11"></a>**Owner decisions §11** (amendment of 2026-11-14 night,
QRWTY commit `3f9e0d3`, later than this pack's copy of the owner decisions) replaces section 5.
Its decisions read:

> - **One direction.** Q11 builds it, choosing what fits the owner's own style: the accepted Jeeves
>   studio refresh (ink outline, one accent fill, one light fill, soft pastels, solid dark shades)
>   and their automation-pitch app, within `design-brief.md`'s constraints.
> - **No second skin, no reviewer pick, no competitor review, no Excalidraw flow sheet.**
> - **Q12 and B08 build that one skin.** The UI rows (U02–U08) run in one skin × light/dark ×
>   desktop/mobile.
> - **Kept lean.** UI work does what the product contract and the UI rows need, and nothing more.
>   The run's attention stays on the backend and on Jeeves.

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
  - each arm's **final local pack**.

  Q11 has no default-skin review: owner decisions §11 removed the reviewer pick.
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
| Visual direction | **Not a gate.** Q11 chose one direction in the owner's style, and Q12 and B08 build it as the only skin. There is no reviewer's default and no second skin (owner decisions §11) |
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
- **Ledger allocation:** Q00, the neutral oracle unit, the Q11 design assets, coordinator work
  and shared amendments' drafting go to the **shared** ledger, once.
  Jeeves template work, Q01–Q05 and A's reviews and repairs go to **A**. B00–B13 and B's reviews
  and repairs go to **B**. Each arm's rework after an amendment goes to that arm.
- **Design assets for Q12 and B08:** pack v1.5 delivers Q11's deliverables to both arms in
  [`files/docs/design/`](../files/docs/design/README.md), byte copies from QRWTY commit `d67f5fe`:
  - the design README;
  - the token sheet (`prototype/tokens.css`);
  - the clickable prototype (`prototype/`);
  - the frozen accessible names (`accessible-names.md` and `accessible-names.json`);
  - the QR export sample (`qr-export/`).

  Both arms build from that frozen copy. Q11's screenshots and evidence are not in the pack, and
  there is no review package or flow sheet (owner decisions §11). The prototype is Q11's shared
  design deliverable, not either arm's UI source. B08's source rules are unchanged
  (`baseline-units.md` B08).

## 10. Release labels and blockers for this run

| Label | Required evidence |
| --- | --- |
| **Locally verified; cloud activation pending** | A01–A24 and F01–F10 at local scope through the neutral oracle (F09 local portion), U02–U08 in one skin × light/dark × desktop/mobile, R01–R06, and the arm's M rows (A: M01, M03, M04; B: M03, M04 equivalents) |
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
| v1.3 | 2026-11-14 | (a) The four oracle files changed by the 2026-11-14 history rewrite (`oracle/selftest/double.ts`, `oracle/src/fixtures/stripe-signer.ts`, `oracle/test/stripe.test.ts`, `oracle/test/observe.test.ts`) are carried as rewritten: five Stripe-key-shaped test literals are string concatenations with the same runtime values, and the manifest is regenerated so every file verifies. (b) A06's check "invalid session cookie on create" now sends a present but invalid cookie. The session's cookie names are read once, right after sign-in; the revoked-session create uses a copy of that jar; the garbage create uses its own jar holding each of those names with a value the arm never issued, and gets the CSRF token directly, so it is that actor's only request. The check fails when no cookie name was sent. A new self-test case, `A06-unknown-cookie` (double mode `a06-unknown-cookie-guest`: a revoked cookie is refused with 401 and cleared, a cookieless mutation is 401, a session ID the double never issued becomes a fresh guest), must be reported `failed`. The oracle build is now `1.3.0` and its results report pack `v1.3` | (a) GitHub push protection rejected the key-shaped literals, so the owner had the unpushed history rewritten; the v1.1 and v1.2 copies of those four files no longer match their manifests, so both versions are superseded. (b) A06 gave the revoked-session actor the original jar by reference and read the cookie names from it afterwards. An arm that clears the revoked cookie in its 401 emptied that jar, so the garbage create carried no cookie (`cookieNames: []`) and the check proved nothing; a correct arm still passed | Coordinator, for both arms (unit N03) |
| v1.4 | 2026-11-14 | (a) **F01.** A new fault point, `clear-route-caches`, declared in the adapter's new `faultPoints` list ([acceptance-oracle §2](acceptance-oracle.md#2-test-control-interface-each-arm-provides)): the named replica drops every entry of its per-process route cache; the shared cache and the database are not touched; a replica without a per-process route cache does nothing and reports success. F01 runs it on every replica of every service right after injecting each Valkey fault (refused, stalled, broken) and before that fault's hot redirects. Without the declaration F01 is `blocked` with "adapter has no clear-route-caches fault point". "No stampede" passes when the database queries during the fault (`dbQueries`, all services) are at most max(2 × the redirect replicas, 0.1 × the hot requests sent). (b) **F06.** "Traffic beyond the publisher queue bound" sends a pack-fixed burst of max(2,000, the declared publisher queue bound + the declared admission bound + 1) concurrent GETs to one redirect replica while publishes are delayed to 3 × the deadline. Both bounds come from `inspect publisherQueue` (the largest over processes); its `admissionBound` field is new (`0` when there is no admission stage), and F06 is `blocked` until it is reported. Memory growth is measured above a baseline taken with the same number of connections held open and idle, and the GETs are then sent on those connections; RSS is sampled while the GETs wait and after they end; the limit stays 128 MiB (134,217,728 bytes; no frozen document states another). A 503 without `Location` passes whether admission or the publisher queue refused it. (c) Two new self-test cases must be reported `failed`: `F01-inprocess-stampede` (a per-process cache hiding a database fallback that makes one query per request once the cache is cleared) and `F06-small-bound-unbounded-queue` (declares a queue bound of 4 and an admission bound of 16 but queues without limit). Every other case keeps its expected result. (d) Every duration and deadline the oracle measures uses the monotonic clock (`performance.now()`); wall-clock time stays only for recorded timestamps and for comparisons with times the arm enforces. The oracle build is now `1.4.0` and its results report pack `v1.4` | (a) An arm's review found that a per-process route cache in each replica served the hot slug through the whole Valkey fault, so the database fallback and the stampede bound were never exercised. v1.3's bound, 2 queries per request, also grew with the traffic, so a fallback that makes one query per hot request passed it even when exercised. A stampede is database work that grows with the traffic: refilling the route from one database read (valid for at most 30 s, section 3) keeps it constant, and 0.1 per request is the share F01's "cache use resumes" check already allows. (b) The v1.3 burst was 3 × the arm's own declared bound, so a small declared bound made a small burst and was rewarded, and the growth it measured was mostly the cost of accepted sockets. A fixed floor of 2,000 is the same for both arms; adding both declared bounds plus one means at least one GET is beyond everything the arm declared it would hold; the held-open idle baseline puts the sockets' own cost in the baseline. (c) Each fix proves itself: with v1.3's F01 and F06 code the two cases are reported `passed`. (d) This host's wall clock (WSL2) jumps forward about 3.6 s every 36 s, and one jump inside a measured interval inflated any duration taken with `Date.now()` | Coordinator, for both arms (unit N04) |
| v1.5 | 2026-11-15 | (a) **Frozen UI names.** Q11's `docs/design/accessible-names.json` (version `q11-2026-11-14.1`, QRWTY commit `d67f5fe`) is copied byte for byte to `files/docs/design/accessible-names.json`. Before any row runs, the oracle loads that file (`FROZEN_UI_NAMES_PATH` in `oracle/src/runner.ts`) and validates it against `oracle/ui-names.schema.json`. Its browser rows (A01, A04's browser step, U02–U08) use it, and each result records its version and SHA-256 in `environment.uiNames`. The CLI refuses `--ui-names`, so no arm supplies its own list; only the self-test keeps its double-only list. (b) **Design assets.** Q11's design README, token sheet, prototype, `accessible-names.md` and QR export sample are copied byte for byte to `files/docs/design/` ([section 9](#9-visible-task-prompts-and-ledger-allocation)); Q11's screenshots and evidence are not. (c) **One skin.** Owner decisions §11 is quoted in [section 2](#owner-decisions-section-11) and replaces section 5 of the pack's copy. [Acceptance-oracle §6](acceptance-oracle.md#6-ui-rows), sections 1, 2 and 7–10 of this file, the [B execution brief](../b/execution-brief.md) and the oracle's U-row scope labels now say one skin × light/dark × desktop/mobile. No row's checks change: the U rows run each skin the adapter lists in `ui.skins`, and the adapter lists one. The oracle build is now `1.5.0` and its results report pack `v1.5` | (a, b) Acceptance-oracle §6 freezes the name list "in the pack amendment that carries Q11's design assets", and both arms must build from the same frozen copy. Until v1.5 the browser rows were `blocked` unless the arm passed a list of its own with `--ui-names`. (c) The owner replaced the two skins with one (owner decisions §11, 2026-11-14 night) | Coordinator, for both arms (unit N05) |
| v1.6 | 2026-11-15 | (a) **Per-account login identifiers.** The adapter's `identity.accounts` maps each oracle account (`alice`, `bob`, `operator`) to its own login identifier. Without the map the oracle signs in as `oracle-alice`, `oracle-bob` and `oracle-operator`, as before; with it, an account the map leaves out is not mapped. The password comes from exactly one source: `passwordEnv` (one variable for every account, as before) or the new `passwordCommand`, run without a shell with `{account}` replaced by the account key, which prints that account's password once on stdout. The oracle reads each password at most once per run, registers it as a secret, and never logs or stores it. A check that needs an account the adapter does not map, or whose password cannot be read, is `blocked` with the reason (check `account <key>`), never `failed`. The schema, `fixtures/accounts.ts`, the row context and every row that named an account (A04, A05, A06, A09, A14, A15, F04, U02, U05, U08) use the mapped identifiers. (b) **At most one login post.** `Api.signIn` posts the issuer's login form at most once per call. When the issuer answers that post, or a page after it, with anything but a redirect, the sign-in fails with its reason ("…; posted once, not posted again") and the form is not posted again. The run remembers the refusal: later sign-ins of that account fail at once, without a post (A15's sign-in after deleting the account is exempt, because a refusal is a valid outcome there). Only network errors before the post are retried, at most twice. (c) Two new self-test cases. `signin-lockout` runs A14 with a stale adapter password against an issuer that answers a refused login with its form again and locks the identifier after 3 refused posts: it must be reported `failed`, with the refusal as the reason, at most one post per identifier and no lock. `signin-mapped-identifier` runs A06 against an issuer that accepts email addresses only, with mapped email identifiers and per-account passwords from a `passwordCommand`: it must be reported `passed`, with no refused post. Every other case keeps its expected result. (d) The oracle build is now `1.6.0` and its results report pack `v1.6` | Owner decisions §12 (2026-11-14 night) chose Auth0's free tier as the managed issuer for both arms' staging: one tenant, separate applications and API audiences per arm, and test users in one shared, email-only Username-Password connection. Auth0 blocks an account after 10 refused attempts. Against such a staging deployment v1.5 failed in two ways the pack caused, alike for both arms. It could sign in only as the literal names `oracle-alice`, `oracle-bob` and `oracle-operator` (fixed by the schema's `const`, `fixtures/accounts.ts` and direct calls in A04, A06 and A14): an email-only connection refuses them, one shared connection cannot hold one `oracle-alice` per arm, and staging has no operator account. And after a refused login its driver posted the form again, up to 10 times, which is Auth0's threshold, so the accounts were blocked. Each fix proves itself: with v1.5's driver the lockout case posts 11 times and locks the account; with v1.5's fixed names the email-only case fails | Coordinator, for both arms (unit N06) |

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

v1.3 is a self-contained copy of v1.2 in which only this file, the pack README, the four rewritten
oracle files and the A06 fix differ (`oracle/src/rows/A06.ts`, the new self-test case in
`oracle/selftest/cases.ts` and its mode in `oracle/selftest/double.ts`, the build label in
`oracle/src/runner.ts`, `oracle/package.json` and `oracle/README.md`); `evidence/n03/` is new.
Every other file, including `ledger/` and `evidence/n01/`, is byte-identical to v1.2, so existing
ledgers need no migration. The oracle build changed, so its results report pack `v1.3` and
version `1.3.0`; a result that reports pack `v1.1` came from the unfixed A06.

v1.4 is a self-contained copy of v1.3 in which only this file, the pack README,
[acceptance-oracle §2](acceptance-oracle.md#2-test-control-interface-each-arm-provides) (the new
fault point and the admission bound) and the oracle files listed in the pack README's "Changes
from v1.3" differ; `evidence/n04/` is new. Every other file, including `ledger/`,
`verify_pack.py`, `evidence/n01/` and `evidence/n03/`, is byte-identical to v1.3, so existing
ledgers need no migration. Results report pack `v1.4` and version `1.4.0`. An F01 or F06 result
from an earlier build is superseded: each arm declares `clear-route-caches` in its adapter's
`faultPoints`, implements it in its `faultPoint` command, reports `admissionBound` in
`inspect publisherQueue`, and reruns F01 and F06 from its v1.4 copy. A duration or deadline
measured by an earlier build may include one wall-clock jump.

v1.5 is a self-contained copy of v1.4 in which only this file, the pack README,
[acceptance-oracle §6](acceptance-oracle.md#6-ui-rows), the [B execution brief](../b/execution-brief.md)
(§1 and the B08 row) and the oracle files listed in the pack README's "Changes from v1.4" differ.
`files/docs/design/` (Q11's deliverables), `oracle/test/ui-names.test.ts` and `evidence/n05/` are
new. Every other file, including `ledger/`, `verify_pack.py`, every other copied contract and
`evidence/n01/` to `evidence/n04/`, is byte-identical to v1.4, so existing ledgers need no
migration. Results report pack `v1.5` and version `1.5.0`. No row module's checks changed; the
browser rows now take their names from the frozen list. A browser-row result from an earlier
build was `blocked` or used a list the arm supplied. Each arm lists its one skin in its adapter's
`ui.skins` and runs its browser rows from its v1.5 copy, without `--ui-names`.

v1.6 is a self-contained copy of v1.5 in which only this file, the pack README,
[acceptance-oracle §2](acceptance-oracle.md#2-test-control-interface-each-arm-provides) (the
Identity row) and the oracle files listed in the pack README's "Changes from v1.5" differ.
`oracle/src/identity.ts`, `oracle/selftest/password.ts`, `oracle/test/signin.test.ts` and
`evidence/n06/` are new. Every other file, including `ledger/`, `verify_pack.py`, every copied
contract, `files/docs/design/` and `evidence/n01/` to `evidence/n05/`, is byte-identical to v1.5,
so existing ledgers need no migration. Results report pack `v1.6` and version `1.6.0`. A local
adapter written for v1.5 still validates and signs in as before: the fixed names are the defaults
and `passwordEnv` stays. A staging adapter maps each account it has to its login identifier and
names a `passwordCommand`; a sign-in row result from an earlier build against a managed issuer is
superseded.

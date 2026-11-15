# Assignment packet: QGR2, attempt 1 (Fable, xhigh)

You are the agent for unit **QGR2 — Review batch 2** of the Jeeves plan `docs/plans/qrwty-gaps/units.md`
(its "Batch 2" section). Work in `/home/ash/github/jeeves`, on `main`, in that primary checkout. You did not
implement any batch-2 unit. Do only QGR2, commit it, and stop.

This is QRWTY run `qrwty-r1-20261114`, arm A, template-development review. The coordinator records your
usage. **Your commit becomes QRWTY arm A's frozen generation baseline** (owner decisions §10): Q05
generates A's export from it. So defects you fix here reach A, and anything you defer doesn't.

## Read

- `AGENTS.md`.
- The QRWTY gaps plan, `docs/plans/qrwty-gaps/units.md`:
  - the batch-1 and batch-2 headers;
  - Rules;
  - Regeneration proof;
  - the briefs of the batch-2 units: QG03, QG04, QG06, QG07, QG08, QG09 (with its "Folded into QG09"
    section), QG10, QG18 and QG20;
  - QG24's brief in `docs/plans/qrwty-gaps/review-batch1.md` §Proposed units.
- `docs/plans/qrwty-gaps/review-batch1.md` (QGR1), for format and continuity.
- Every batch-2 handoff entry in `docs/handoff.md`.
- The diff, `git diff b55644a..HEAD`, and `git log --oneline b55644a..HEAD`.
  - **Not units:**
    - the docs commits `d469660`, `a7c4b0d`, `423acbd` and `b4003fc`;
    - the owner's commits `abe2d8d`, `fe27ab6`, `efca408`, `516c142`, `c6797ca` and `fefc74f`, which are
      README and `.docs` only.
  - **The exception:** the owner's `6a21cfc` ("add 11/14 update") carries QG07's source, tests, pins
    and lock. Review those paths as part of QG07, together with `2625d96`.

## Do the QGR2 section's work, as QGR1 did

- **Check each unit against its brief:** its invariants, pins and emitted-output changes.
- **Check the regeneration proofs.** Run one shared proof across the whole batch: the export at
  `b55644a` against HEAD, for both fixtures. The changed paths must be exactly the union of the units'
  Emitted output lists, plus manifest and report.
- **Check the interactions between units.** Several units touch the same runtime files:
  `module-clients.ts`, `tile-loop.ts`, `postgres.ts`, `valkey.ts`, `http-wiring.ts` and `compose.yaml`.
- **Re-run:**
  - `pnpm check`, `pnpm test:e2e` and the web build;
  - `pnpm test:generated --suite=all`;
  - at least one Docker proof of your own choice, for example QG10's hostssl proof or QG09's P6.

## Points the units raised, to verify rather than trust

- **QG03:**
  - YouTube v4's override is now inert.
  - The owner may want "and its package manifests" in `AGENTS.md`.
  - Pin changes now land in `.jeeves/generated/`.
- **QG04:**
  - The comment in stub process files still says a failed cache probe fails startup. So does
    `docs/plans/tile-processes/contract.md` §6.
  - Compose `depends_on` still waits for the cache.
- **QG06:**
  - `loop-wiring.ts` changed outside the brief's Files.
  - `positive-cache-bindings.ts` keeps compiled values.
  - Object storage and search endpoints are still compiled.
- **QG24:**
  - The audience error comes first.
  - A trailing newline passes the URL check.
  - The guard runs after the module probes.
- **QG07:**
  - 20 pre-existing lock entries younger than 14 days were exempted.
  - Two studio changes the brief didn't name: select options, and "Provisioned as" in Preview.
  - Delivery is at-least-once under the 1000 ms request timeout.
- **QG08:**
  - Loop stubs of one tile share one subscription.
  - Pub/Sub counts every redelivery as an attempt.
  - The drain doesn't use `WaitForProcessing`.
  - Compose environment changed for Pub/Sub consumers outside the listed outputs.
- **QG09:**
  - A held message can be redelivered after a store outage; `minAckDeadline` is unset.
  - F3 changed `scripts/pubsub-init.mjs`, which is outside its list.
  - `pnpm-workspace.yaml` is application-owned.
  - P6 shows recovery but doesn't exercise the reconnect bound.
- **QG10:**
  - Broker, object storage and search stay plain text under `JEEVES_REQUIRE_TLS`.
  - A cache with a bad certificate starts unavailable instead of failing.
  - Node can't match Cloud SQL's `project:instance` server name.
  - `migrate.mjs` follows `PGSSLMODE`.
- **QG18:** the brief's NonRetryable test was read through the delivery runner. A stall that never
  ends retries for ever.
- **QG20:**
  - **Locally, a stub can't reach the Identity at `OIDC_ISSUER`** (the browser address). This affects
    QRWTY r83's Session API. Decide whether to fix it now, before the freeze, and prove it.
  - The harness gained an `override` attachment role outside the brief's Files.
  - The report's environment list omits `JEEVES_EXTERNAL_<ID>_URL`.
  - `delivery.ts`'s comments are stale.
- **Disclosure, not a defect:** the reconnect backoff in F3 came from QRWTY arm B's review. The owner
  approved folding it in. Record it in the review.
- **Known flakes:**
  - e2e "Project: menu not visible" under load from arm B;
  - B10 and its clock;
  - B09 media case 3.

## Rules

- **Fixing defects.** Fix a defect only with a test that fails before the fix and passes after. No
  renames or refactors, and never hand-edit generated output. Take pins by Rule 7. Because this commit
  is A's baseline, fix what matters for a production deployment of a QRWTY-like app now. Propose the
  rest.
- **Recording.** Write the findings to `docs/plans/qrwty-gaps/review-batch2.md`. List proposed units
  under **Proposed units**, each marked "ready" or "needs the owner".
  - QG21, QG22, QG23 and QG25 come next, so fold related findings into them where they fit, and say so.
  - The QRWTY lessons plan (`docs/plans/qrwty-lessons/`) follows them. Note any finding that changes
    one of its units.
- **Docker.** Use only resources scoped to your run, with the prefix `qgr2-`, and remove them by exact
  name. Never prune. Never touch `jeeves-postgres-1`, any `qrwtyb` container or any cloud resource.
- **Don't touch:**
  - the owner's dev servers on 4300 and 4310, and the `jeeves` database;
  - `~/.jeeves`, `~/.codex` and `~/.config/qrwty`.
- **Credentials.** Never write a credential-shaped string.
- **Node.** `export PATH=$HOME/.nvm/versions/node/v24.21.0/bin:$PATH`.
- **The owner's dirty paths stay untouched and unstaged:** `.jeeves-feedback/`, the `Zone.Identifier`
  files, and three mode changes, on `e2e-docker.sh`, `f3-catch.sh` and `fake-codex.mjs`.
- **The owner sometimes commits in this checkout.** Commit your paths promptly, and never amend the
  owner's commits.
- **Housekeeping.** Stage by path. No subagents, no push, nothing left running, and no
  `pgrep -f 'playwright test'` wait loops.

## Finish

Append a handoff entry, then make one local commit named `QGR2: review QRWTY gap batch 2`. Report.

## Return

- status and commit;
- the checks, before and after;
- the defects you fixed, each with its test;
- the findings, with severity;
- the proposed units, each marked ready or needs the owner, with where each folds in;
- anything Q05 must know about the frozen baseline;
- the elapsed time.

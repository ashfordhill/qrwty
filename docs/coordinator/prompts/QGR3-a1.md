# Assignment packet: QGR3, attempt 1 (Fable, xhigh). Review batch 3

You are the agent for unit **QGR3 — Review batch 3** of the Jeeves plan `docs/plans/qrwty-gaps/units.md`.
Its brief is in the Batch 3 section.
- **Where:** `/home/ash/github/jeeves`, on `main`, in the primary checkout.
- **Your role:** you implemented none of the batch-3 units.
- **Scope:** do only QGR3, commit it, and stop.
- **Run:** QRWTY run `qrwty-r1-20261114`, arm A, template-development review. The coordinator records
  your usage.
- **Freeze:** arm A's export stays frozen at `4e87f97`, so nothing here reaches it unless arm A regenerates.

## Read

- `AGENTS.md`.
- The Batch 3 section: its header, its rules, every brief (QG30, QG31, QG29, QG28, QG32, QG33, QG34),
  its decisions, and the QGR3 brief.
- Every batch-3 handoff entry.
- The diff `git diff e1b4130..HEAD` and the log `git log --oneline e1b4130..HEAD`. Docs-only
  coordinator commits are not units.
- `docs/plans/qrwty-gaps/review-batch2.md`, for format.
- **Batch 3's rule:** never read `docs/plans/qrwty-lessons/` or anything of QRWTY arm B.
- **Arm A evidence:** you may read the A evidence the briefs cite under
  `/home/ash/github/qrwty/docs/evidence/` (q04, q05, q06). Read nothing else in qrwty.

## Do the QGR3 brief's work

- Check each unit against its brief: invariants, pins, emitted output, and the interactions between
  units. QG30, QG31 and QG34 all touch startup configuration and `module-clients.ts`. QG28 and QG29
  touch generated Compose and scripts.
- Check two owner-decided interpretations against what the owner said:
  - **QG28:** "each loop stub gets its own subscription, so every module sees every message."
  - **QG29:** "verifies TLS with the same CA-file setting the app's connections use since QG10."
- Record the findings in `docs/plans/qrwty-gaps/review-batch3.md`. Put new units under **Proposed units**,
  each marked "ready" or "needs the owner".

## Verification

The owner deprioritized testing on 2026-11-15. Re-run only:
- `pnpm check`;
- the web build;
- **one** Docker proof of your choice, and only if you doubt a unit's claim.

Don't run e2e or the full suites. Fix a defect only with a test that fails before the fix and passes
after. No renames or refactors, and never hand-edit generated output.

## Rules

- **Docker:** use the prefix `qgr3-`, and remove your resources by exact name. Never prune. Never
  touch `jeeves-postgres-1`, any `qrwtya`/`qrwtyb` container, or any cloud resource.
- **Hands off:**
  - the owner's dev servers (4300/4310) and the `jeeves` database;
  - `~/.jeeves`, `~/.codex` and `~/.config/qrwty`;
  - the owner's dirty paths, which stay untouched and unstaged.
- **Credentials:** never write a credential-shaped string.
- **Commits:**
  - Commit promptly, and never amend the owner's commits.
  - Stage by path.
  - No subagents and no push.
  - Leave nothing running.

## Finish

1. Append a handoff entry.
2. Make one local commit, `QGR3: review QRWTY gap batch 3`.
3. Report.

## Return

- status and commit;
- checks run;
- defects fixed, each with its test;
- findings with severity;
- proposed units, each marked ready or needs the owner;
- whether the QL plan can start;
- elapsed time.

# Assignment packet: QGB3, attempt 1: exact briefs for arm A's found gaps (docs only)

You are the agent for a **planning unit** in the Jeeves plan `docs/plans/qrwty-gaps/units.md`. Work
in `/home/ash/github/jeeves`, on `main`, in the primary checkout. **Write docs only**: no
templates, generator source, tests or pins. Do only this unit, commit it, and stop. This is QRWTY run
`qrwty-r1-20261114`, arm A, template development; the coordinator records your usage.

## Why

QRWTY's arm A builds on the export frozen at Jeeves `4e87f97`. Its units Q04 and Q05 found nine gaps
in Jeeves's templates, AG-01 to AG-09. Each has evidence and a remedy:

- Q04's gaps: `/home/ash/github/qrwty/docs/evidence/q04/a-found-gaps.md` (AG-01 to AG-07).
- Q05's gaps: `/home/ash/github/qrwty/docs/evidence/q05/checks.md` (AG-08 and AG-09).
- The Q05 review's view of all nine: `/home/ash/github/qrwty/docs/reviews/Q05-review.md`.

Two QGR2 proposals still need the owner: **QG28** and **QG29**, in
`docs/plans/qrwty-gaps/review-batch2.md` §Proposed units.

These units come **before** the QRWTY lessons (QL) plan. They come from arm A's own findings, so A
may take them later by regenerating. The QL plan draws on arm B and must not reach A.

## Objective

Add a section **"Batch 3: arm A's found gaps (QG30–QG3n)"** to `docs/plans/qrwty-gaps/units.md`,
after batch 2's text and before the QG01 briefs, with one exact brief per gap that should become a
unit.

- **Format:** write each brief in the same shape as the existing briefs. That means Status and
  Depends, Goal, Found (citing the A evidence file and line), exact Files, Invariants, Emitted output
  with pins under Rule 7, offline tests, Docker proof, required regressions, and the Commit name.
  Modest executors run these one fresh agent per unit, so leave no design choice open inside a brief.
- **Decisions:** where a gap needs an owner decision, add it to a "Batch 3 decisions" list with your
  recommendation, and mark the unit "needs the owner".
- **Not every gap needs a unit.** A gap with no unit gets one line saying why: a docs row, a known
  limit, or "not a Jeeves gap".
- **Docs-only gaps:** AG-07 (the README's endpoint table) was fixed in QG26 (`51f6639`). Check it and
  say so.

Then give the run order for batch 3 and the gap-to-unit mapping. Treat QG28 and QG29 as part of this
batch; their briefs are in `review-batch2.md`. Then add one line to `docs/plans/qrwty-lessons/README.md`:
the QL units start after batch 3.

## Read

1. `AGENTS.md`.
2. The last eight entries of `docs/handoff.md`.
3. In `docs/plans/qrwty-gaps/units.md`: the batch-1 and batch-2 headers, then Rules for every unit,
   Regeneration proof, and two existing briefs for format, such as QG10 and QG20.
4. `docs/plans/qrwty-gaps/review-batch1.md` and `docs/plans/qrwty-gaps/review-batch2.md`.
5. The three QRWTY files above. Reading them is allowed: they are arm A's evidence. Read nothing else
   in qrwty, and nothing at all in qrwty-baseline.
6. The template and generator files each gap names, so the Files and Invariants are exact.

## Rules

- **Writes:** docs only. Don't run tests, Docker or the generator. Reading code is enough.
- **Leave alone:** the owner's dirty paths, which stay untouched and unstaged (`.jeeves-feedback/`,
  `Zone.Identifier` files, the three mode changes); the owner's dev servers (4300/4310); the `jeeves`
  database; any container.
- **Commits:** the owner sometimes commits in this checkout. Commit promptly, and never amend the
  owner's commits. Stage by path.
- **No subagents, no push.**

## Finish

Append a handoff entry titled `QGB3: briefs for arm A's found gaps`, then make one local commit,
`QGB3: briefs for arm A's found gaps (QG30–QG3n)`.

## Return

Reply briefly with:
- the commit;
- the gap-to-unit mapping;
- the batch-3 run order;
- the decisions with recommendations, including QG28 and QG29;
- anything the owner must know.

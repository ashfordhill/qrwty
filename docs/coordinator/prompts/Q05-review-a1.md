# Assignment packet: Q05 review, attempt 1 (Fable, xhigh)

**Role:** reviewer. You did not implement Q05.
**Run ID / arm / unit / attempt:** `qrwty-r1-20261114` / A / Q05-review / 1.

**Repository:** `/home/ash/github/qrwty`, `main`, at the commit that adds this packet. You read
everything and write only your review. You may run A's commands, the LOC runner and the oracle
against A's own local stack.
- **Owner's paths:** `.docs/` belongs to the owner.
- **Scratch:** only `.scratch/Q05-review/`.
- **Other lanes:** other lanes run at the same time. Never touch their containers or files.

**Foreign context:** ignore any Jeeves `AGENTS.md`, Git status or memory index you start with, and
record that you saw it.

**Jeeves (arm A's rules):**
- Read Jeeves only as it is at `4e87f97` (`git show` or `git archive` into your scratch folder).
- Never read `docs/plans/qrwty-lessons/` or any later commit.
- Never write, run anything in, branch or worktree the Jeeves checkout.
- The owner's studio API at `http://127.0.0.1:4310` is read-only for you: GET the QRWTY project
  (`d1e59607-0616-418d-83d5-4cfe5bcb4b11`) and its revisions only.
- Never read `/home/ash/github/qrwty-baseline` (arm B).

## Objective

Review Q05, "Freeze the reusable generation baseline in QRWTY": commits `33d50e9` and `7b432f7`.
Check it against `units.md` Q05, `comparison.md` and owner decisions §10. Examine the evidence in
`docs/evidence/q05/`, not only the summary.

Answer each question with evidence:

1. **Revision 84.** Is the only change the Click events provider? Is it saved through the supported
   path? Was the right choice left alone for anything else a QG fix newly allowed? Check Q05's three
   "not changed" items as well.
2. **Frozen export.**
   - Is `app/` byte-for-byte what the frozen CLI at `4e87f97` produces from revision 84? Regenerate it
     yourself in scratch and compare.
   - Is it untouched, with no product behaviour, product SQL or UI?
   - Does the studio/CLI difference table hold, commit by commit?
3. **LOC runner.**
   - Does it run Jeeves's unchanged `source-loc-v2`, pinned, on Git objects only?
   - Are G0 (2,926: 2,871 scaffolding and 55 stub bodies), the identities and the backend/UI scope
     right?
   - Does the scope follow `comparison.md` and `source-loc.md`?
   - Rerun it yourself.
4. **Wiring and smoke.**
   - Do the root commands wrap the generated packages without editing them?
   - Is the diagnostic smoke honest: named 501s only, and no product claim?
5. **Records.** Check provenance, hashes, README (Detailed view embedded) and the ledger entries
   (`a-3636`, `a-3835`).
6. **Fitness for what follows.**
   - Is this baseline a sound start for Q12a/Q13 (live deploy behind qrwty.io) and Q06–Q10b?
   - Are Q04's A-found gaps (AG-01 to AG-07) and Q05's (AG-08, AG-09) recorded honestly?
   - Does any of them block a later unit?

Run M01 and M03 from pack v1.6 yourself.

## Rules

- **Writes.** Write only `docs/reviews/Q05-review.md` (create `docs/reviews/` if it doesn't exist)
  and one handoff entry. Commit only those. Don't repair anything.
- **Findings.** Give each finding a severity, its evidence and the fix you recommend.
- **Proposed units.** List them under "Proposed units", one exact unit per item, each marked "ready"
  or "needs the owner".
- **Docker.** Use only `qrwtya*` resources and remove them by exact name. Never prune.
- **Credentials.** Never write a credential-shaped string.
- **Not allowed:** subagents, the next unit, branches, worktrees or stash, push, cloud, Auth0,
  Cloudflare, `~/.config/qrwty/`, and messages to anyone.
- **Usage.** Start an attempt record with `ledger.py`: role reviewer, phase review, requested model
  fable, effort xhigh.

## Finish

Write the handoff entry, commit "Q05 review: generated baseline", report, and stop.

## Return

- status: passed, passed-with-findings, or failed;
- commit;
- findings with their severity;
- proposed units, each marked ready or needs the owner;
- elapsed time.

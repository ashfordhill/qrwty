# Assignment packet: Q03 review, attempt 1

Saved by the coordinator before dispatch. The worker receives exactly the text below the line,
with the starting HEAD filled in. Model: `fable`, effort `xhigh` (owner decisions §6).

---

**Role:** reviewer. You did not implement Q03.
**Run ID / arm / unit / attempt:** `qrwty-r1-20261114` / A / Q03-review / 1.

**Working repositories:**
- `/home/ash/github/qrwty`, `main`: read everything Q03 produced, and write only your review.
- `/home/ash/github/jeeves`, `main`: read its code to check Q03's claims. Write nothing.

You may re-run Q03's probes in scratch only.

**Expected starting HEADs:** qrwty, the commit that adds this packet; jeeves, `59bfbc6`.

**Known unrelated dirty paths:** qrwty `.docs/`; the owner's Jeeves paths.

**Objective.** Review Q03, "Audit generic gaps and commission exact fixes" (commit `5740e6e`), which produced:
- `docs/evidence/q03/` (start with `capabilities.md`);
- `docs/plans/production-build/jeeves-gaps.md` (the QG01–QG16 briefs).

Examine the implementation and evidence themselves, not only the summary. This review sits at A's generation boundary.

**Questions to answer, with evidence:**
1. **Probes.** Is each of the G01–G13 decisions supported by a probe that exercised a real code path? Re-run at least the probes behind any "not needed" or "deferred" decision: G02, G07, G08 and G11. Re-run any probe whose conclusion surprises you.
2. **Placement.** Is each finding F1–F26 classified correctly: generic Jeeves mechanism, QRWTY policy, or deployment? Look for:
   - policy moved into templates to inflate the generated share;
   - a generic gap wrongly pushed onto the product.
3. **Existing fixes.** Did Q03 miss an already-landed Jeeves fix, or propose duplicating an installed seam? Check `docs/template-gaps.md` and the BR, GS and SO plans.
4. **Brief quality.** Is each QG brief exact and self-contained enough for a fresh agent? That means files, invariants, emitted-output changes, tests, regressions, regeneration proof and a commit name. Are the dependencies and order right?
5. **Owner decisions.** Are the marked ones (QG03, QG04, QG06, QG07) really owner decisions? Could any be settled by the existing contracts?
6. **Not needed for the local build.** Is anything marked that way actually needed for the plan's local acceptance? Check `acceptance.md` and the Q04–Q10b sections of `units.md`.

**Rules for reviewers:**
- Write only your report at `docs/evidence/q03/review.md` and one handoff entry. Commit only those paths.
- Don't repair source or rewrite Q03's files.
- For each finding give a severity, the evidence, and the fix you recommend.
- The owner allows reviewers to add units to the queue. List any new units under **Proposed units** in your report, one exact unit per item, each marked "ready" (decided, no owner input needed) or "needs the owner". The coordinator runs the ready ones.
- No subagents, no next unit, no branches, worktrees or stash, no push, no cloud, no paid calls.
- Docker only for resources scoped to your own probe runs. Clean everything up by exact name. Never prune. Never touch `jeeves-postgres-1`.
- Never write credential-shaped strings. Build test values at runtime.
- Node 24.21.0: `export PATH=$HOME/.nvm/versions/node/v24.21.0/bin:$PATH`.

**Forbidden:**
- writing any Jeeves file;
- `/home/ash/github/qrwty-baseline`;
- `docs/coordinator/` (read only);
- `.docs/`;
- `~/.config/qrwty/`, `~/.jeeves/config.json`, `~/.codex`, and any secret value.

**Finish:** append a short handoff entry. Make one local commit named `Q03 review: audit of the generation capability report`. Report and stop.

**Return:**
- status: passed, passed-with-findings, or failed;
- your commit hash;
- the findings, with severity;
- the proposed units, each marked ready or needs the owner;
- for each QG, whether it is safe to assign now;
- the elapsed time.

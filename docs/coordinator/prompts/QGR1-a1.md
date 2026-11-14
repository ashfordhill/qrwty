# Assignment packet: QGR1, attempt 1 (Fable, xhigh)

You are the agent for unit **QGR1 — Review batch 1** of the Jeeves plan `docs/plans/qrwty-gaps/units.md`
(see its "Batch 1" section). Work in `/home/ash/github/jeeves`, on `main`, in that primary checkout. You did
not implement any batch-1 unit. Do only QGR1, commit it, and stop. This is QRWTY run `qrwty-r1-20261114`,
arm A, template-development review; the coordinator records your usage.

**Read:**
- `AGENTS.md`.
- The QRWTY gaps plan: the batch-1 and batch-2 headers, Rules, Regeneration proof, and the briefs of
  QG01, QG02, QG05, QG17, QG19, QG12 and QG11.
- Every batch-1 handoff entry, including QG01's blocked first attempt and the coordinator's fixture fix.
- The diff, `git diff c2c8127..HEAD`, and `git log --oneline c2c8127..HEAD`. Commits `3a0cee3` (batch 2
  plan) and `84a766a` (playbook) are docs, not units.

**Do the QGR1 section's work:**
- Check each unit's invariants, pins and emitted-output changes against its brief, the regeneration
  proofs, and the interactions between units. They all touch the generated runtime, Dockerfile and
  migrations.
- Re-run `pnpm check`, `pnpm test:e2e`, the web build and `pnpm test:generated --suite=core`, plus
  whichever suites a unit named that you doubt.
- Re-run at least one Docker proof yourself: QG12's ACL proof or QG17's stall proof.

**Points the units raised, to verify rather than trust:**
- QG01 borrows `jeeves/apps/server`'s Fastify in generator tests.
- QG01 gives an empty `text/plain` body an empty `rawBody`.
- QG02: `pnpm start` doesn't start services that exist only in the override.
- QG05: stubs must write to `/tmp`, and secrets are mode 644.
- QG17: a stalled database now spends a worker attempt. QG18, in batch 2, makes it count as
  unreachable.
- QG17: pg-pool discards a connection after any query error.
- QG19: the fallback 503, `/healthz`'s 503 and the edge's 503 still have no `Retry-After`.
- QG12: CREATEROLE self-grant on PostgreSQL 16+, ADMIN OPTION on a foreign owner, and a cluster lock
  with no time limit.
- QG11: a `node:crypto` stand-in for jose in offline tests. An unset `OIDC_ISSUER` or `OIDC_JWKS_URL`
  gives a generic error.
- QG11: the faults suite failed twice on B09 media's case-3 precondition, which is store-outage review
  open item 6, before passing.
- The B10 test is known to flake on this host's clock.
- QG11 repaired the checkout's `node_modules` shims after scratch copies wrote through them. Confirm
  the checkout is clean.

**Rules:**
- **Fixing defects.** Fix a defect only with a test that fails before the fix and passes after. No
  renames, no refactors. Never hand-edit generated output. Take pins by Rule 7.
- **Recording findings.** Record findings in `docs/plans/qrwty-gaps/review-batch1.md`. List new units
  under **Proposed units**, each marked "ready" or "needs the owner". The owner allows reviewer-added
  units.
- **Docker.** Use only resources scoped to your run, and remove them by exact name. Never prune. Never
  touch `jeeves-postgres-1` or any `qrwtyb` containers: arm B runs in parallel in another repository.
- **Stay out of:** the owner's dev servers (4300 and 4310) and the `jeeves` database; `~/.jeeves`,
  `~/.codex` and `~/.config/qrwty`. Don't write credential-shaped strings.
- **Node.** `export PATH=$HOME/.nvm/versions/node/v24.21.0/bin:$PATH`.
- **Other people's work.** Leave the owner's dirty paths untouched (`.jeeves-feedback/`,
  `Zone.Identifier` files, two mode changes). Stage by path. No subagents, no push.

**Finish:**
- Append a handoff entry.
- Make one local commit named `QGR1: review QRWTY gap batch 1`.
- Report.

**Return:**
- status and commit;
- checks before and after;
- the defects you fixed, each with its test;
- findings with severity;
- proposed units, each marked ready or needs the owner;
- elapsed time.

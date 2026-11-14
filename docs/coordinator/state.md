# QRWTY coordinator state

Coordinator-owned (workers never stage this file). Updated by the execution coordinator at each
accepted unit or blocker. Verify against Git and evidence after any context loss.

## Run

- **Run ID:** `qrwty-r1-20261114`
- **Coordinator:** Claude Code session `25a62ed6-cc60-4bd9-b2cf-35664f59d9c5`, model
  `claude-opus-5-5` (from the session's status line). It also coordinates Jeeves units in
  `/home/ash/github/jeeves`, one agent at a time across both repositories.
- **Started:** 2026-11-13 evening (America/Chicago). Q00 dispatched after the Jeeves queue
  (UF01–UF06, SO04–SO05) finished.
- **Governing documents:** `docs/plans/production-build/coordinator-prompt.md`, amended by
  `docs/plans/production-build/owner-decisions-2026-11-13.md` (commit `9c19c1e`).

## Pinned settings (frozen by Q00; listed here as requested)

| Role | Requested | Actual model ID source |
| --- | --- | --- |
| Builders and repairs (A and B) | Claude Code Agent tool, `general-purpose`, model inherited (Opus) | each worker transcript's `message.model` (e.g. `claude-opus-5-5`) |
| Reviewers (A and B) | Agent tool, `general-purpose`, model `fable`, effort `xhigh` | transcript `message.model` (observed `claude-fable-5-1` on 2026-11-13) |

**Usage source:** each worker's Claude Code transcript (JSONL) carries one record per model
request, with `message.id`, `message.model` and `message.usage` (`input_tokens`,
`cache_creation_input_tokens`, `cache_read_input_tokens`, `output_tokens`). Deduplicate by
`message.id`. There is no cost field and no separate reasoning counter (reasoning is inside
`output_tokens`). The Agent tool's completion notice also gives a total-token figure, tool-call
count and duration per worker. The coordinator's own requests come from its own transcript.
Plan-level limits (5-hour and 7-day percentages) come from the status line.

## Accepted units

| Unit | Attempt | Commit | Review | Notes |
| --- | --- | --- | --- | --- |
| (owner decisions) | — | `9c19c1e` | — | pushed |

## Active attempt

None yet.

## Queue (next eligible first)

1. Q00 — freeze the product and experiment (shared).
2. Then, per the coordinator prompt's §5, with the owner decisions: A's Q01→Q02→Q03 (needs the
   Jeeves checkout free) and B's B00→… interleaved, one worker at a time.

## Owner decisions and pending owner input

- See `owner-decisions-2026-11-13.md`. Nothing pending from the owner at dispatch of Q00.

## Deferred / not run

- Q14/Q15 failover, load and regional tests (need a spend decision beyond staging).
- Backup/restore and SLA rows on the Cloud SQL trial instance (no backups on a trial instance).

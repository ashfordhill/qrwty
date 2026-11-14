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
| Q00 | 1 | `37f9ff0` | not a review point | passed 11/11 checks; pack v1 `MANIFEST.json` sha256 `834ff752…5736`; usage imported (71 requests, `claude-opus-5-5`, coverage reported) |

## Active attempt

None (Q00 accepted 2026-11-14 ~06:00Z).

## Queue (next eligible first)

1. Q01 — build the backend diagram in Jeeves (A). The Jeeves checkout is free (no active plan).
2. B00 — create `qrwty-baseline` from the frozen pack (B).
3. N01 — shared neutral oracle tooling as pack v1.1 (proposed by Q00); before any acceptance row
   is reported as passed and before either arm uses it.
4. Then A: Q02 → Q03 (Fable review) → gap units → Q04 → Q05 (Fable review) …; B: B01 → … interleaved.

## Owner decisions and pending owner input

- See `owner-decisions-2026-11-13.md`.
- Q00's choices the owner may want to confirm (not blocking): Web Risk as reputation provider;
  HTTP contract details; `QRWTY-Click-Event` header; quota numbers (free 5 links/7 days/1 export,
  paid 50/90/20, guest 10/min); 7-day session with 24-hour idle; Q11 assets charged to shared.
- Coordinator decisions (owner may override): B's staging host will be `b.qrwty.io` (A at the
  apex), within the owner's qrwty.io DNS authorization; B's GCP resources are `qrwtyb-`-prefixed in
  the same trial project unless the owner creates a second project. Decide finally at B08a.
- Toolchain: Q00 pinned Node 24.22.2 (machine default is 18.19.1; Jeeves uses 24.21.0). Q01/Q02
  record the generator's actual pins; if they differ, issue pack v1.1 before B02.

## Deferred / not run

- Q14/Q15 failover, load and regional tests (need a spend decision beyond staging).
- Backup/restore and SLA rows on the Cloud SQL trial instance (no backups on a trial instance).

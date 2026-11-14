# QRWTY coordinator state (live)

`state.md` beside this file is frozen at its `0e2e1f2` content: the ledger's coordinator attempt
(`shared-0006`) cites it by hash. This file is the living state.

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
| Q01 | 1 | `30d018a` | not a review point | passed; Jeeves project `d1e59607-0616-418d-83d5-4cfe5bcb4b11` "QRWTY · production candidate v1" rev 83; 16 tiles, 27 links, 14 modules: 3 Generated (verified-identity), 11 You write it; gaps F1–F10 for Q03; usage imported (151 requests) |

| Q02 | 1 | `dae40da` | not a review point | passed; studio and CLI exports byte-identical (84 paths); offline tsc build clean; first-run 12 services healthy; stubs 501; new gaps F11–F15; usage imported (122 requests) |

| N01 | 1 | `9f1d9d4` | not a review point | passed; pack v1.1 manifest `5ffae9f2…df6a`; Node pin 24.21.0 bookworm-slim; 47 row modules; self-test 48/48 cases, 31/31 faults detected; usage imported (164 requests) |

| Q03 | 1 | `5740e6e` | `47ae6d5` passed-with-findings (Fable, `claude-fable-5-1`): R1 QG12 leaves PUBLIC CONNECT, R2 stalled PostgreSQL unbounded → QG17, R3 QG06/QG04 host check conflict; proposed Q03b, QG17, QG19 ready; QG18, QG20 need the owner | passed; G-decision table; QG01–QG16 briefs in `docs/plans/production-build/jeeves-gaps.md` (QG01–QG10 local, QG11–QG12 cloud, QG13–QG16 deferred); new F16–F26; usage imported |

| Q03b | 1 | `ccaca7d` | repair of the Q03 review's findings | passed; R1/R3/R8/R9 applied; QG17–QG20 appended; assignable now: QG01, QG02, QG05, QG11, QG12, QG17, QG19 |

| B00 | 1 | baseline `34bcf82` | not a review point | passed; `qrwty-baseline` created (local, no remote), pack v1.1 verified (`5ffae9f2…`), toolchain pinned (Node 24.21.0); usage imported into B's ledger (`6fb78a4`). **Environmental exposure:** every subagent starts in the coordinator's working directory (`/home/ash/github/jeeves`), so its starting context includes Jeeves `AGENTS.md`, Jeeves git status/log subjects and the coordinator's memory index; no A source, tests, IaC, evidence or prompts. The Agent tool offers no working-directory option; disclosed in B's handoff and to be listed as a comparison limitation. |

| QG01 | 2 (a1 blocked by the coordinator's fixture lint, fixed in Jeeves `8f46066`) | Jeeves `64d0d3b` | batch review QGR1 later | passed; `rawBody` on route stubs, array header values; 916 tests, e2e 74, wiring and identity suites pass; pins http.ts + manifest only |

| N02 | 1 | `66cc867` (B `7bb9246`) | not a review point | passed; ledger R12 accepts a hash matching any committed version; pack v1.2 manifest `5414d6ef…054b`; installed in both arms |

| B01 | 1+2 | baseline `e3be001` | B04/B05 reviews later | passed; 13 ADRs, 12 specs, 7 Excalidraw drawings rendered; a1 stopped on the R12 flaw, a2 finished after N02; usage imported (`caa61c2`) |

| QG02 | 1 | Jeeves `954e8c4` | QGR1 later | passed; README documents `compose.override.yaml`; Docker proof: override env reaches app-front, survives stop/start; note: `pnpm start` doesn't start override-only services |

| B02 | 1 | baseline `10d9d08` | not a review point | passed with R03 pending (needs B03/B04's public entry and routes; re-run after B04); R01 3/3, R02 2/2; 202 unit, 25 integration, 9 container tests; OpenTofu staging stack written, not applied |

## Active attempt

QG05 next.

## Queue (next eligible first)

1. Jeeves QG batch, no owner decision needed: QG01, QG02, QG05, QG11, QG12 (amended), QG17, QG19,
   each a fresh agent in Jeeves (plan `docs/plans/qrwty-gaps/units.md`, Jeeves `c2c8127`), then QGR1 (Fable review).
2. B03 — durable anonymous links (B), interleaved; then B04 († review), re-run R03. Pending owner decisions: QG03 (app owns package.json /
   lockfile, or amend billing to node:crypto + fetch), QG06 (endpoints from environment, D1),
   QG04 (stub cache down at startup no longer stops the process), QG07 (Pub/Sub pins; the review says precedent settles it), QG18 (`Query read timeout` as unreachable), QG20 (env-configured HTTP client for External API/Identity tiles).
3. Each arm adopts pack v1.1 (copy, verify, record the hash) before reporting any A/F/R/U row.
4. Then A: Q02 → Q03 (Fable review) → gap units → Q04 → Q05 (Fable review) …; B: B01 → … interleaved.

## Owner decisions and pending owner input

- See `owner-decisions-2026-11-13.md`.
- Q00's choices the owner may want to confirm (not blocking): Web Risk as reputation provider;
  HTTP contract details; `QRWTY-Click-Event` header; quota numbers (free 5 links/7 days/1 export,
  paid 50/90/20, guest 10/min); 7-day session with 24-hour idle; Q11 assets charged to shared.
- Coordinator decisions (owner may override): B's staging host will be `b.qrwty.io` (A at the
  apex), within the owner's qrwty.io DNS authorization; B's GCP resources are `qrwtyb-`-prefixed in
  the same trial project unless the owner creates a second project. Decide finally at B08a.
- Toolchain: Q00 pinned Node 24.22.2; Q01 found the generator emits Node 24.21.0
  (bookworm-slim); pnpm 12.16.1, TS 7.0.2, @types/node 24.19.2 match. Coordinator decision: pack
  v1.1 (N01) pins Node 24.21.0 for both arms, before B00.

## Deferred / not run

- Q14/Q15 failover, load and regional tests (need a spend decision beyond staging).
- Backup/restore and SLA rows on the Cloud SQL trial instance (no backups on a trial instance).

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

| QG05 | 1 | Jeeves `181bb97` | QGR1 later | passed; `USER node` in app and media stages; uid 1000 proven; suite all 13/14 (B10 failed on the known WSL2 clock jump; regeneration rerun 1/1) |

| B03 | 1 | baseline `4961ac2` | not a review point | passed; A02 7/7, R03 42/42 (B02's pending row now passes); A03/A09 blocked by B05/B06, F07 by B04/B07a/B07b; two-replica races and SIGKILL retries pass |

| QG17 | 1 | Jeeves `fd1ea77` | QGR1 later | passed; pg `query_timeout` = statement timeout + 500 ms; stalled DB rejects at 2.5 s and `pool.end()` resolves; core 4/4, faults 5/5. Side effect: a stall now spends a worker attempt (QG18, owner decision 6, would count it as unreachable) |

| B04 | 1 | baseline `14c773a` | `d2f9c27` passed-with-findings (Fable): F1 medium (revoked sessions keep profile after deletion), F2–F6 low; proposed B04c (ready), scheduler + manifest freshness into B04b (ready), oracle A06 jar fix (shared pack) | passed (core); A05 7/7, A06 18/18, A14 6/6, A02/R03 still pass; A04 browser step, A07/A08, A15/F07 blocked by later units; remainder B04b (backup/restore commands, reapply-erasures job, restore gate) |

| QG19 | 1 | Jeeves `d02ae85` | QGR1 later | passed; `Retry-After: 1` on HttpError 503s (admission UNAVAILABLE/OVERLOADED/DEADLINE); wiring 2/2; other 503s (fallback, healthz, edge) still without it, recorded |

## Active attempt

QG12 running; then QG11, QGR1, B04c, B04b, N03, batch 2 (QG03, QG04, QG06–QG10, QG18, QG20, QGR2), Q04, Q05.

## Queue (next eligible first)

1. Jeeves QG batch, no owner decision needed: QG01, QG02, QG05, QG11, QG12 (amended), QG17, QG19,
   each a fresh agent in Jeeves (plan `docs/plans/qrwty-gaps/units.md`, Jeeves `c2c8127`), then QGR1 (Fable review).
2. B04c — deletion hardening (F1–F3 of the B04 review). 3. B04b — backup/restore commands, reapply-erasures job, restore gate, local scheduler for jobs, adapter manifest refreshed on `up`. 4. N03 — shared pack v1.3: fix oracle A06's cookie-jar reuse (F5), both arms adopt. 5. QG12, QG11, then QGR1. 6. B05 (redirect path; Fable review after). Pending owner decisions: QG03 (app owns package.json /
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

## Owner decisions, 2026-11-14 morning

- History rewrite to clear push protection (done, `docs/coordinator/history-rewrite-2026-11-14.md`).
- QG03, QG06, QG04, QG18, QG20: all yes (Jeeves plan batch 2, `3a0cee3`).
- **Two lanes (owner, 2026-11-14 ~11:30 CST):** lane 1 = Jeeves QG units then A (qrwty); lane 2 = B (qrwty-baseline). One agent per repository at a time; N03 and Q11 slot into whichever lane is free. Overlapping work is recorded with wall time and agent time separately (comparison.md). This overrides the coordinator prompt's 'one child at a time'.
- **README diagrams (owner, 2026-11-14):** embed the Detailed view; Simple only as a link. Q05 and the final report follow this.
- **Pack v1.3 (N03, af06312; B adopted 6e349f4), 2026-11-14 19:15Z:** manifest `81f04065…7401`. Supersedes v1.1/v1.2. Both arms use v1.3 from their next oracle run and rerun A06 (the old A06 never sent the garbage cookie).
- **Isolation note (B05, 2026-11-14 ~20:00Z):** a B worker listed the shared session scratchpad once and saw other units' folder names (q01, qg01…, ui01…); it opened none. Recorded in B's ledger (b-1015 update). From B05-review on, B workers use `qrwty-baseline/.scratch/<unit>/` and never list the shared scratchpad. Comparison limitation for the final report.
- **Owner questions open (2026-11-14 ~21:05Z):** (1) QG25, the Jeeves edge's 502/503/504 carry `Retry-After: 1` (coordinator recommends yes). (2) The B05 review's shared-pack item: strengthen F01 (clear in-process cache tiers / more slugs, so a per-replica cache can't hide database load) and revisit F06's memory threshold; would be pack v1.4 (N04) for both arms (coordinator recommends yes, run before the final oracle runs).
- **For B08:** the Worker must follow B05b's edge rule (HTML no-store error pages on non-API paths; attempt-level timeout covering lookup and connect), written in B's edge spec.
- **Owner decisions, 2026-11-14 ~21:20Z:** (1) **QG25 yes**: the Jeeves edge's 502/503/504 carry `Retry-After: 1`; added to batch 2 after QG23 (plan edit lands when QG06 is out of the Jeeves checkout). (2) **N04 yes**: pack v1.4 strengthens F01 (a neutral `clear-route-caches` test-control fault point, called before each fault phase) and F06 (a pack-fixed burst, not derived from the arm's bound); both arms adopt it before their final oracle runs. N04 runs in whichever lane is free first; the coordinator installs v1.4 in B between B units.
- **N04 scope (coordinator, 2026-11-14 22:15Z):** adds (c2) monotonic timing for every oracle duration check, after B05b measured the host's wall-clock jumps (~3.6 s every ~36 s). Neutral; both arms equally.
- **Scope cut (owner, 2026-11-14 ~22:45Z):** see owner decisions §9. Remaining queue. Lane 1: QG07 (running), QG08, QG09, QG20, QGR2 (Fable), Q04, Q05, Q06, Q07 + review, Q08 + review, Q09, Q10, Q10a+b (one unit), A backend review, then the final report + its review. Lane 2: N04 (running), B06, B07, B07a+b (one unit), B backend review. Out: Q11, Q12, Q12a, Q13, B08, B08a, B09, the per-unit reviews of Q05, Q10, Q10a, Q10b, B07, B07a, B07b, and QG10, QG18, QG21–QG23, QG25 (Jeeves backlog).
- **Jeeves improvement planning (owner, same time):** a Fable xhigh planner analyses QRWTY (both arms' designs, decisions and code, the reviews) and Jeeves, and drafts a Jeeves build plan outside every repository; the coordinator commits it to Jeeves when the checkout is free. Jeeves template changes from it start only after Q05 freezes A's generation baseline. Reading B's code for that plan is a disclosed comparison limitation: nothing flows back into either arm, and A's later units don't read the plan.
- **Cut withdrawn; deploy early (owner, 2026-11-14 ~22:55Z):** owner decisions §10 replaces §9. Three lanes:
  - **Jeeves:** QG07 (running), QG08, QG09, QG10, QG18, QG20, QGR2 (Fable) [A's freeze point], QG21, QG22, QG23, QG25, then the JP00 plan's QL units after the owner's decisions.
  - **A (qrwty):** S01 qrwty.io placeholder (shared) → Q11 (both design directions) → after QGR2: Q04 → Q05 (+ review) → Q12a → Q13 (walking skeleton on qrwty.io) → Q06 → Q07 (+ review) → Q08 (+ review) → Q09 → Q10 (+ review) → Q10a (+ review) → Q10b (+ review) → Q12 (+ review) → final review. Every unit after Q13 redeploys and smoke-tests.
  - **B (qrwty-baseline):** B06 (adopts pack v1.4 first) → B08a → B09 (b.qrwty.io) → B07 (+ review) → B07a (+ review) → B07b (+ review) → B08 (+ review, after Q11) → final review. Every unit after B09 redeploys.
- **Pack v1.4 (N04, d24fc37; B install 82dd32e):** manifest `bdcb503c…1495`. Each arm adds the `clear-route-caches` fault point and `admissionBound`, then reruns F01/F06; earlier F01/F06 results are superseded. N04 also tightened F01's stampede bound (accepted).
- **Owner decisions, 2026-11-14 ~23:40Z:**
  - **QL plan decisions D1–D6: yes.**
  - **Clarification 7: yes.** QL01 is folded in before A's freeze. QG08 had already started, so the reconnect backoff options go into QG09. **Disclosure:** that backoff setting was found by arm B's B05 review, so A's frozen baseline contains one B-derived setting. The final report must say so.
  - **QG16 (clarification 8):** the owner delegated it to the planner (Fable); its answer is the decision.
  - **qrwty.io:** keep the new placeholder. The old `qrwty-platform` Worker stays in place, unrouted.
  - **QG07 follow-ups: yes.** In QG09: a generated `pnpm-workspace.yaml` with `allowBuilds: { protobufjs: false }`, and `METADATA_SERVER_DETECTION=none` in the local environment of every process using Pub/Sub. QG07 found the metadata lookup independently.
- **One UI (owner, 2026-11-14 ~01:20Z):** owner decisions §11. Q11 builds one direction in the owner's style, and Q12 and B08 build that one skin. No reviewer pick, no competitor review.
- **Pack v1.5 (N05, 1e54d03):** manifest `b76a0dd5…c800`. It freezes the UI names and design assets, and the UI rows use one skin. Coordinator decision: both arms may reuse the prototype's tokens, markup and CSS verbatim, as shared UI input that the LOC measure excludes. B installs v1.5 after B08a.
- **Issuer (owner, 2026-11-15 ~02:50Z):** Auth0 free tier for staging sign-in, per owner decisions §12. Identity Platform is left as is. Waiting on the owner's Auth0 signup and `~/.config/qrwty/auth0.env`.
- **Auth0 ready (2026-11-15 ~03:05Z):** the coordinator verified `~/.config/qrwty/auth0.env`. A client-credentials token works, and all 13 needed Management API scopes are granted. The tenant has Default App, qrwty-coordinator, and the connections google-oauth2 and Username-Password-Authentication. No arm apps exist yet.
- **A's frozen generation baseline (2026-11-15 ~06:10Z): Jeeves `4e87f97`** (QGR2). Q05 generates from that commit. Next in the Jeeves lane: QG21 (with QGR2's folded tests), QG22, QG23 (with two folded sentences), QG25, QG26, QG27, then QG28 and QG29 once the owner decides, then QL.
- **Pack v1.6 (N06, 2d61a26):** manifest `1250b854…c579`. Per-account sign-in identifiers, at most one login post, refused logins remembered. Staging adapters map alice and bob to their own Auth0 emails and use a passwordCommand. B installs it after B07.
- **Q04 (5b927f1):** bindings proven locally on a scratch export at Jeeves 4e87f97 with Events on Google Cloud; R01 and R02 pass, R03 41/42 (session sharing waits for Q07). Q04b, `tofu validate`, needs the owner's OK to download OpenTofu. A-found gaps AG-01 to AG-07 (docs/evidence/q04/a-found-gaps.md) become Jeeves units QG30+ after QG27.

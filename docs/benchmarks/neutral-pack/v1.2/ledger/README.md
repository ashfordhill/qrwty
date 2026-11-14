# Run ledger: `qrwty-r1-20261114`

Append-only effort records for the first QRWTY build run, following the ledger section of the
comparison protocol. Frozen by Q00 on 2026-11-14 (UTC), schema version 1. Usage that a tool did
not report stays `null`, never `0`. Rule R12 was amended in neutral pack v1.2 on 2026-11-14
([rule changes](#rule-changes)); the schema and every other rule are unchanged.

## Where each ledger lives

| Ledger | File | Who writes |
| --- | --- | --- |
| Shared (Q00, the neutral oracle, shared reviews, coordinator, planning) | `shared/events.jsonl` in this repository | Workers start their own attempt; the coordinator adds usage |
| A, Jeeves-assisted (Q01–Q18, A reviews/repairs, QRWTY-driven Jeeves template work) | `a/events.jsonl` in this repository | Same |
| B, independent (B00–B13, B reviews/repairs) | `docs/benchmarks/runs/qrwty-r1-20261114/b/events.jsonl` in `qrwty-baseline`, created by B00 from the neutral pack's copy of these tools | Same, inside B's repository only |

B's ledger stays in B's repository so B workers never read A's ledger (it names A's units, gaps
and commits). The comparison reviewer reads both at the end. No ledger is ever copied into the
other arm's repository.

## Files

| File | Purpose |
| --- | --- |
| `events.schema.json` | JSON Schema of the four record kinds. Unknown keys are rejected |
| `ledger.py` | Validator and the append helpers below. Python 3.10+, standard library only, plus the `git` CLI for R12's history check |
| `<ledger>/events.jsonl` | One JSON object per line, in append order |
| `usage/<ledger>/<unit>-<role>-a<n>.records.jsonl` | Saved output of `transcript-usage.py --records` for one attempt (derived numbers only) |

## Record kinds

- **`attempt`** — one worker attempt: unit, attempt number, role (`implementer`, `reviewer`,
  `repair`, `coordinator`, `planner`, `template-development`, `shared-tooling`), phase,
  repository, status, start/end time, commits before/after, the hashed assignment packet,
  requested model settings, actual model IDs, usage totals, Agent-tool totals, cost, human
  minutes, evidence and notes. Written by the worker when it starts (status `started`).
- **`attempt-update`** — an append-only change to an earlier attempt: status, end time, commits,
  model, usage, Agent-tool totals, cost, human minutes, evidence or notes, with a reason. The
  current view of an attempt is the attempt plus its updates in file order.
- **`request`** — one provider model request: request ID (`message.id`), timestamp, provider,
  model (`message.model`) and the raw counters, plus the source artifact path and SHA-256.
- **`human`** — owner or other human effort: instructions, steering, reviews, debugging help,
  operations or decisions, with message count and minutes when known.

Event IDs are `<ledger>-NNNN`, increasing in file order. Paths are repository-root relative.

## What the counters mean

The source is each worker's Claude Code transcript (JSONL). Every model request carries
`message.id`, `message.model` and `message.usage`. `docs/coordinator/tools/transcript-usage.py
--records` deduplicates by `message.id` and prints, per request: `requestId`, `timestamp`,
`model` and the numeric `usage` fields.

| Counter | Provider meaning | Normalization |
| --- | --- | --- |
| `input_tokens` | Uncached input tokens: neither read from nor written to the prompt cache | Total input-side tokens = `input_tokens + cache_creation_input_tokens + cache_read_input_tokens` |
| `cache_creation_input_tokens` | Input tokens written to the prompt cache | Part of that total; not added again |
| `cache_read_input_tokens` | Input tokens read from the prompt cache | Part of that total; not added again |
| `output_tokens` | Generated tokens, **including reasoning** | There is no separate reasoning counter; never add one |

Other numeric usage fields are kept unchanged under `extraCounters`. The Agent tool's completion
notice (total tokens, tool-call count, duration) goes in `agentToolTotals`. It is a whole-worker
figure with its own definition and is never added to the request sums.

**Cost.** The transcript has no cost field, so `cost.reportedUsd` is `null`. An estimate may be
added only as `cost.estimate` with `label: "estimate"`, a dated price source and the method; it is
never presented as provider-reported. A subscription is not evidence of zero marginal cost.

## Coverage

| Value | Meaning |
| --- | --- |
| `reported` | Every request of the attempt was imported with all four counters and a model ID |
| `partial` | Some requests or counters are missing; `coverageReason` says which |
| `unavailable` | No counters; `coverageReason` says why. Counters stay `null` |

`pending: true` marks usage the coordinator has not extracted yet. It is only allowed with
`unavailable` or `partial`, and `validate` lists every pending attempt.

## Recorded automatically, counted directly, unavailable

| Measure | How it is obtained |
| --- | --- |
| Per-request model ID and the four counters | Automatically, in the worker transcript; imported by the coordinator |
| Worker total tokens, tool calls, duration | Automatically, in the Agent tool completion notice; copied by the coordinator |
| Plan-level 5-hour and 7-day usage percentages | Coordinator status line; recorded in `notes` when relevant, never as tokens |
| Owner instructions/steering messages, assigned task prompts, retries, failed attempts | Counted directly by the coordinator (`human` records, one `attempt` per packet, attempt numbers) |
| Human minutes | Recorded when the owner or coordinator states them; otherwise `null` |
| Provider cost in USD, a separate reasoning counter, hidden reasoning text | **Unavailable.** Never invented; hidden reasoning is never recorded |
| Usage of the planning units before this run | **Unavailable** (seeded as such) |

## Workflow

Run every command from the repository root. `--dry-run` prints the records without appending.

1. **Before work starts**, the worker (or the coordinator at dispatch) appends its attempt:

   ```sh
   python3 docs/benchmarks/runs/qrwty-r1-20261114/ledger.py start-attempt \
     --ledger a --unit Q01 --attempt 1 --role implementer --phase architecture \
     --repository qrwty --recorded-by worker:Q01-a1 \
     --assignment docs/coordinator/prompts/Q01-a1.md \
     --requested-model "inherited (Opus)" --requested-effort inherited
   ```

2. **When the worker finishes**, the coordinator saves its derived usage records and imports them,
   with the Agent tool totals from the completion notice:

   ```sh
   python3 docs/coordinator/tools/transcript-usage.py <worker-transcript.jsonl> --records \
     > docs/benchmarks/runs/qrwty-r1-20261114/usage/a/Q01-implementer-a1.records.jsonl
   python3 docs/benchmarks/runs/qrwty-r1-20261114/ledger.py import-usage \
     --ledger a --attempt-event a-0001 --recorded-by coordinator \
     --records docs/benchmarks/runs/qrwty-r1-20261114/usage/a/Q01-implementer-a1.records.jsonl \
     --agent-total-tokens <n> --agent-tool-uses <n> --agent-duration-ms <n> \
     --status passed --commit-after <sha>
   ```

   The import refuses request IDs that are already in the ledger, so it cannot double count.
   If the transcript is lost, append an `update` that keeps coverage `unavailable` with the reason.

3. **Status, end time, commits or evidence** change through `update`:

   ```sh
   python3 docs/benchmarks/runs/qrwty-r1-20261114/ledger.py update --ledger shared \
     --attempt-event shared-0007 --recorded-by coordinator --reason "accepted" \
     --commit-after <sha> --ended-at 2026-11-14T06:30:00Z
   ```

4. **Validate** before every ledger commit: `python3 docs/benchmarks/runs/qrwty-r1-20261114/ledger.py validate`
   (exit 0 means valid). `ledger.py self-test` shows the validator rejecting known-bad records.

A unit's own commit cannot contain its own hash, so `commits.after` is filled by the coordinator
in a later update. Transcripts are never copied into Git: they can hold tool output and secrets.

## Validation rules

`validate` applies the schema, then these rules to each ledger file:

| Rule | Check |
| --- | --- |
| R0 | No blank lines; the file ends with a newline |
| R1 | Event ID prefix is the ledger name; numbers strictly increase in file order |
| R2 | `runId` is this directory's name; `ledger` is the parent directory name (`a`, `b`, `shared`) |
| R3 | `recordedAt` never decreases (append-only order) |
| R4 | One attempt record per unit, role and attempt number |
| R5 | An update names an earlier attempt and changes at least one field |
| R6 | A request names an earlier attempt; request IDs are unique |
| R7 | Coverage matches the counters: reported means all four plus count and source; unavailable means all null with a reason |
| R8–R10 | Actual model IDs, Agent-tool totals and reported cost each need a source |
| R11 | Assignment path and hash go together; a present file must match its hash |
| R12 | Any referenced artifact with a hash must match the working-tree file **or** a version of that path committed in the repository's Git history; a hash that no version has is an error; a missing file is a warning. Outside a Git checkout only the working-tree file counts |
| R13 | An attempt does not end before it starts |
| R14 | Reported totals equal the sum of the attempt's request records; models match |
| R15 | No value that looks like a secret (Stripe, Google, GitHub, Slack keys, private keys, bearer tokens) |
| R16 | Valid JSON without duplicate keys |
| R17 | Timestamps are real dates |

## Rule changes

| Date (UTC) | Pack | Rule | Change | Reason |
| --- | --- | --- | --- | --- |
| 2026-11-14 | v1.2 (unit N02) | R12 | A recorded `{path, sha256}` passes when the working-tree file has that hash, or when any committed version of the path in the history of `HEAD` has it (`git log --format=%H -- <path>`, then `git show <commit>:./<path>` for each commit). A hash that matches neither is still an error, and a missing file is still a warning. Outside a Git checkout, or without `git`, only the working-tree check applies. Each path's history is read at most once per validation run, and only when the working-tree hash differs | Some evidence is a living file that later units append to, such as `docs/handoff.md`. Under the old rule the next append broke validation, and the writers (which validate the whole ledger first) then refused every new line, so that unit could neither record its evidence nor finish. The recorded version stays provable from Git; a hash no version ever had is still rejected |

`validate` lists each artifact accepted through a committed version (`matches a committed version
(R12)`, or `committedVersionMatches` with `--json`). `self-test` covers the change: a living file
appended after recording passes, a forged hash that no version has fails, a missing file warns,
and the same appended file outside a Git checkout fails.

## Seeded records

| Event | Record |
| --- | --- |
| `shared-0001`–`0004` | The four planning units (plan, revisions 2 and 3, coordinator prompt): usage **unavailable**, as in `docs/benchmarks/status.json` |
| `shared-0005` | The owner's decisions of 2026-11-13, given in conversation; messages and minutes not recorded |
| `shared-0006` | The coordinator's own attempt; usage pending extraction from its session transcript |
| `shared-0007` | This Q00 attempt; usage pending, filled by the coordinator after the worker finishes |

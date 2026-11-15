# B execution brief: the independent QRWTY build

For every B worker, from B00 on. Frozen in neutral pack v1 (run `qrwty-r1-20261114`). It is
written from the shared contracts only and contains no A implementation detail.

## 1. What B is

B builds the **same product** as the Jeeves-assisted arm A, **without Jeeves**, so the two can
be compared: a public short-link and QR service with anonymous quick links, individual free and
paid accounts, owned-link management, durable click recording before every redirect, bounded
analytics, Stripe test-mode subscriptions, one UI skin in light and dark (owner decisions §11,
quoted in [decisions §2](../frozen/decisions.md#owner-decisions-section-11)), production containers,
GCP infrastructure as code, and later a staging deployment within the GCP trial credit.

The requirements are this pack: the copied contracts in `files/` and the `frozen/` documents.
The high-level architecture (service names, store ownership, durable publication before 302) is
shared on purpose; this is a controlled shared-design comparison, not an architecture-discovery
contest. All of B's code, tests, IaC and UI source are written independently.

## 2. Where

| Item | Value |
| --- | --- |
| Repository | `/home/ash/github/qrwty-baseline`, branch `main`, local only (no remote, never pushed) |
| Created by | B00, only if the path is absent; an existing path is reported, never replaced |
| Layout | `app/` backend (production code under `app/src/`, product SQL outside `src/`), `web/` UI, `infra/` IaC, `docs/` handoff, evidence, prompts, reviews and ledger, `docs/neutral-pack/v1/` this pack, `source-scope.json` the reviewed scope |
| Ledger | `docs/benchmarks/runs/qrwty-r1-20261114/b/events.jsonl`, using this pack's `ledger/` tools (copied beside it) |
| Assignment packets | `docs/prompts/<unit>-a<n>.md`, saved by the coordinator before dispatch |
| Local resources | Loopback only; host ports 47100–47199; containers labelled `qrwty.arm=b`, Compose project names starting `qrwtyb` |
| Secrets | `~/.config/qrwty/*.env`, referenced by variable name only, never printed or committed |

## 3. Isolation rules

B workers **never**:

1. read, run or query anything under `/home/ash/github/jeeves`: files, Git history, a running
   studio, its database or its packages; and never install an `@jeeves/*` package;
2. read `/home/ash/github/qrwty` except `docs/benchmarks/neutral-pack/v1/`, and only during B00
   to copy it; afterwards they use B's own copy;
3. read QRWTY's Git history or any other branch, commit or log of that repository, including the
   earlier QRWTY application removed from it in November 2026;
4. read A's handoffs, evidence, reviews, ledgers, coordinator state or prompts, or ask the
   coordinator how A solved something;
5. inspect A's running processes, containers, images, ports or databases, or A's cloud resources
   and DNS records (beyond avoiding a name collision, through the coordinator);
6. copy source, tests, configuration, IaC, scripts or UI code from A, Jeeves or any generated
   output.

If any of this happens, even by accident, stop, record it in B's handoff as a contamination
incident with what was seen, and report it. Do not delete the evidence. Instructions are not a
sandbox; honest disclosure is the control.

B workers **may** use public documentation, public packages (pinned, disclosed), the shared GCP
project, Cloudflare zone and Stripe test-mode account under the owner decisions, and B's own
repository and history.

## 4. How to read the pack

| Document | Use in B |
| --- | --- |
| `frozen/decisions.md` | Binding: precedence, superseded statements, test assumptions, fixtures, toolchain, model and review policy, sign-off points, release labels |
| `frozen/http-contract.md`, `frozen/acceptance-oracle.md` | Binding external behaviour and the shared acceptance checks; B implements the test control interface of `acceptance-oracle.md` §2 in its own harness |
| `frozen/loc-method.md` | Binding counting rules; B does not read the Jeeves file it names |
| `files/.../owner-decisions-2026-11-13.md` | Binding, and wins over everything else |
| `files/.../product-contract.md`, `durable-clicks.md`, `billing-contract.md`, `local-to-cloud.md`, `cloud-strategy.md`, `design-brief.md`, `acceptance.md` | Binding shared contracts, read with decisions §2 |
| `files/.../architecture.md` | Binding: "Proposed logical services" and the store-ownership rules. The Jeeves-specific sections (lane checklist for Q01, installed mechanisms, the G01–G13 capability audit, artifacts to save from Jeeves) are A-only context and impose nothing on B |
| `files/.../baseline-units.md` | B's unit plan (B00–B13). Where it says to follow `comparison.md`, use `frozen/decisions.md`, `frozen/loc-method.md` and `ledger/README.md`, which restate the protocol rules B needs |
| `files/docs/diagrams/` | Shared explanatory drawings; not an implementation recipe |
| `ledger/` | Ledger schema, validator and helpers |

## 5. Unit sequence

One unit per fresh worker, in order; each appends a handoff entry, stages only its own paths and
makes one local commit. Units marked † get a fresh Fable review afterwards (matched with A).

| Unit | Scope now |
| --- | --- |
| B00 | Create the repository, copy and verify this pack, pin the toolchain, start the ledger; commit the empty starting state |
| B01 | Independent architecture drawings, ADRs, interface and schema specs under the shared topology |
| B02 | Runtime, configuration validation, production containers and GCP bindings, verified locally (no cloud) |
| B03 | Durable anonymous links |
| B04 † | Sessions and ownership |
| B05 † | Redirect path, cache and durable click publication |
| B06 | Abuse controls and moderation |
| B07 † | Analytics pipeline |
| B07a † | Subscription billing (Stripe test mode and fixtures) |
| B07b † | Free and paid tiers |
| B08 † | The one UI skin from the shared frozen design assets ([`files/docs/design/`](../files/docs/design/README.md), pack v1.5) and the local deployment-preparation pack; then a final local-pack review † |
| B08a, B09 | After B's local pack passes: managed-service checks and staging within the GCP trial credit (owner decisions §1) |
| B10, B11 | Deferred: need a spend decision |
| B12, B13 | Maintenance challenge (given at the agreed maturity point) and release readiness |

## 6. Settings, records and finishing

- Same execution settings as A (decisions §7): builders and repairs on the inherited Opus model,
  reviewers on `fable` at `xhigh`; model IDs come from transcripts.
- Start your attempt record before work (`ledger.py start-attempt`); the coordinator adds usage.
- Run the checks your unit names; a passed acceptance row needs the neutral oracle once it exists.
- Workers do not push, branch, create worktrees, stash or spawn agents. Stage exact paths; never
  `git add -A` or `git add .`.

## 7. B00 checklist

1. Confirm `/home/ash/github/qrwty-baseline` is absent; otherwise stop and report.
2. Copy `docs/benchmarks/neutral-pack/v1/` from the QRWTY checkout to
   `qrwty-baseline/docs/neutral-pack/v1/`, reading nothing else there.
3. Run `python3 docs/neutral-pack/v1/verify_pack.py` in the new repository; it must pass.
4. Create the layout of section 2, `AGENTS.md` (these rules), `docs/handoff.md`, the ledger
   directory with copies of `ledger/ledger.py`, `ledger/events.schema.json` and
   `ledger/README.md`, and an empty `b/events.jsonl`; start B00's attempt record.
5. Pin the toolchain of decisions §6 in a root `package.json` and record how Node 24.22.2 is
   obtained. Write the empty `source-scope.json`. No product code.
6. Validate the ledger, record the pack manifest hash, commit `B00: freeze independent QRWTY baseline`.

## 8. B assignment packet template

The coordinator fills this for every B unit, saves it in B's `docs/prompts/` and gives it to a
fresh worker. It never includes A context or this repository's other documents.

```text
Role: implementer / reviewer / bounded repair
Run ID / arm / unit / attempt: qrwty-r1-20261114 / B / <unit> / <n>
Working repository and branch: /home/ash/github/qrwty-baseline, main
Expected starting HEAD; known dirty paths; reserved ports and containers:
Objective and acceptance conditions (full unit text from baseline-units.md, read with decisions §2):
Authority: this unit only; no subagents, next unit, branches/worktrees/stash, push, cloud spend
  beyond the owner decisions, or messages to anyone.
Required reads: AGENTS.md, latest docs/handoff.md entries, this brief, the named pack documents.
Allowed writes: <paths>. Forbidden: everything in brief §3.
Checks: <commands or discovery step>. Evidence paths and result fields: <paths>.
Usage: start an attempt record; the coordinator fills usage from the transcript.
Stop conditions: missing capability, unsafe conflict, missing owner decision, failed checks.
Finish: handoff entry, stage exact paths, one local commit, report, stop.
Return: status, commits, changes, checks with exit codes and evidence, remaining defects,
  elapsed time, next eligible unit only.
```

## 9. Amendments

A shared requirement correction arrives as a new pack version from the coordinator, sent to both
arms. B copies it next to v1, verifies it, records the adoption in its handoff and ledger, and
charges its rework to B. B never changes a shared requirement itself.

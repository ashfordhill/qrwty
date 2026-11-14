# QRWTY neutral experiment pack, v1.2

The shared, frozen inputs for both arms of run `qrwty-r1-20261114`: A builds QRWTY with Jeeves in
`qrwty`, B builds it without Jeeves in `qrwty-baseline`. v1 was frozen by unit Q00 on 2026-11-14
(UTC) from QRWTY commit `0e2e1f2717b8a823ff501dbec95aebc9dc675d4b`. v1.1 was built by unit N01
on 2026-11-14 from QRWTY commit `c657f2d`: a self-contained copy of v1 plus the executable neutral
oracle (`oracle/`), with one amendment (the Node.js pin). **v1.2** was built by unit N02 on
2026-11-14 from QRWTY commit `7db0e33`: a self-contained copy of v1.1 whose only functional change
is the ledger tool's rule R12, which now accepts a committed version of a living evidence file
([decisions §11](frozen/decisions.md#11-amendments)).

## Changes from v1.1

| Path | Change |
| --- | --- |
| `ledger/ledger.py` | Rule R12: a recorded hash matches the working-tree file or any committed version of that path in Git history; four new self-test cases |
| `ledger/README.md` | Documents the R12 change ([rule changes](ledger/README.md#rule-changes)) |
| `frozen/decisions.md` | Amended: the v1.2 row of §11 |
| `README.md` | This file |
| everything else | Byte-identical to v1.1 (`fromV1.1: identical` in the manifest), including `oracle/` and `evidence/n01/` |

v1.1's changes from v1 still apply: it added `oracle/` and `evidence/n01/`, amended
`frozen/decisions.md` (Node.js 24.21.0 and `node:24.21.0-bookworm-slim`, §6 and §11) and made
`verify_pack.py` ignore an installed `oracle/node_modules/` and check anchors in every
`authored-*` file.

The pack's identity is the SHA-256 of its `MANIFEST.json`. It cannot be written inside the pack
itself; for v1.2 it is recorded in `docs/benchmarks/status.json` and the N02 handoff entry, and
each arm records it when it adopts v1.2.

## Precedence

1. `files/docs/plans/production-build/owner-decisions-2026-11-13.md` wins over everything.
2. The `frozen/` documents.
3. The copied contracts under `files/`, read with [decisions §2](frozen/decisions.md#2-statements-in-the-copied-contracts-that-the-owner-decisions-superseded).

## Contents (the allowlist)

`MANIFEST.json` lists every file with its size, SHA-256 and origin; `SHA256SUMS` repeats the
hashes in `sha256sum -c` format. Nothing else belongs to the pack.

| Path | What it is |
| --- | --- |
| [frozen/decisions.md](frozen/decisions.md) | Precedence, superseded statements, test assumptions, quota and price fixtures (not approved pricing), region and providers, toolchain, model and review policy, owner sign-off points, release labels |
| [frozen/http-contract.md](frozen/http-contract.md) | The external HTTP and Pub/Sub event surface both arms implement |
| [frozen/acceptance-oracle.md](frozen/acceptance-oracle.md) | Black-box checks for every acceptance ID and the test control interface each arm provides |
| [frozen/oracle-tooling-plan.md](frozen/oracle-tooling-plan.md) | Plan for the shared executable oracle (built by unit N01 as `oracle/`) |
| [frozen/loc-method.md](frozen/loc-method.md) | Backend (source-loc-v2), UI and support counting rules; G0, R, C, D, B |
| [b/execution-brief.md](b/execution-brief.md) | What B builds, where, its isolation rules, units and packet template |
| `ledger/` | Ledger schema, documentation and `ledger.py` (validator and append helpers; R12 amended in v1.2) |
| `files/docs/plans/production-build/` | Copies of the product, durable-click, billing, acceptance, local-to-cloud, cloud-strategy, design-brief and architecture contracts, the owner decisions and B's unit plan |
| `files/docs/diagrams/` | The five shared explanatory drawings (Excalidraw source, SVG, PNG) and their conventions; the system overview and cloud deployment drawings are the high-level topology |
| `verify_pack.py` | Recomputes every hash and checks the allowlist and links |
| [oracle/](oracle/README.md) | The executable oracle: adapter schema, rows A01–A24, F01–F10, R01–R06, U02–U08, fixtures, fault driver, capture tools, self-test |
| `evidence/n01/` | How v1.1 was built and checked: unit tests, integration tests, self-test results, pin dates |

## Excluded

None of these exist in QRWTY at the freeze commit, except where noted, and none may enter a
pack: A source (`app/`, `web/`, `infra/`), generated payloads, generated tests and generation
reports, Jeeves generator internals (the Jeeves repository and `snapshot-and-sources.md`, which
describes generator files; that file exists and is excluded), A handoffs and evidence, A IaC,
A repair or incident history, and QRWTY's Git history (including an earlier application removed
in November 2026). Also excluded: A's unit plan, the coordinator prompt, readiness notes and
plan index (orchestration, not requirements), `comparison.md` (its rules for B are restated in
`frozen/`; it also holds the withheld maintenance challenge), `budget-options.md` (future cost
reference), the business research, the root README and the owner's `.docs/`. The manifest lists
each exclusion and the two links in copied files that point outside the pack.

## Verify

```sh
python3 docs/benchmarks/neutral-pack/v1.2/verify_pack.py        # anywhere the pack is copied
python3 docs/benchmarks/neutral-pack/v1.2/verify_pack.py --against-git .   # QRWTY side only
```

The second form also proves each copy is byte-identical to its origin commit. B never runs it:
it reads QRWTY's Git history. Installing the oracle's dependencies (`oracle/node_modules/`) does
not change the pack; `verify_pack.py` ignores that folder.

## Rules

The pack is immutable. A shared correction is a new version (`v1.3`, `v2`, ...) sent to both
arms; an oracle defect is fixed the same way and rerun in both arms. Each arm copies this
directory next to its earlier copies, verifies it, and runs the oracle from its own copy without
editing it ([oracle/README.md](oracle/README.md)). Each arm's run copy of the ledger tools
(`ledger.py`, `README.md`) is replaced by this version's `ledger/` files.

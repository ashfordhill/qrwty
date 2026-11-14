# QRWTY neutral experiment pack, v1.1

The shared, frozen inputs for both arms of run `qrwty-r1-20261114`: A builds QRWTY with Jeeves in
`qrwty`, B builds it without Jeeves in `qrwty-baseline`. v1 was frozen by unit Q00 on 2026-11-14
(UTC) from QRWTY commit `0e2e1f2717b8a823ff501dbec95aebc9dc675d4b`. **v1.1** was built by unit N01
on 2026-11-14 from QRWTY commit `c657f2d`: a self-contained copy of v1 plus the executable neutral
oracle (`oracle/`), with one amendment (the Node.js pin, [decisions §11](frozen/decisions.md#11-amendments)).

## Changes from v1

| Path | Change |
| --- | --- |
| `oracle/` | New: the neutral acceptance oracle of the [tooling plan](frozen/oracle-tooling-plan.md); start with [oracle/README.md](oracle/README.md) |
| `evidence/n01/` | New: N01's test and self-test outputs and the pin-date table |
| `frozen/decisions.md` | Amended: Node.js 24.21.0 and `node:24.21.0-bookworm-slim` (§6), the host note (§6) and the new §11 |
| `verify_pack.py` | Ignores an installed `oracle/node_modules/`; checks anchors in every `authored-*` file |
| `README.md` | This file |
| everything else | Byte-identical to v1 (`fromV1: identical` in the manifest) |

The pack's identity is the SHA-256 of its `MANIFEST.json`. It cannot be written inside the pack
itself; for v1.1 it is recorded in `docs/benchmarks/status.json` and the N01 handoff entry, and
each arm records it when it adopts v1.1.

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
| `ledger/` | Ledger schema, documentation and `ledger.py` (validator and append helpers) |
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
python3 docs/benchmarks/neutral-pack/v1.1/verify_pack.py        # anywhere the pack is copied
python3 docs/benchmarks/neutral-pack/v1.1/verify_pack.py --against-git .   # QRWTY side only
```

The second form also proves each copy is byte-identical to its origin commit. B never runs it:
it reads QRWTY's Git history. Installing the oracle's dependencies (`oracle/node_modules/`) does
not change the pack; `verify_pack.py` ignores that folder.

## Rules

The pack is immutable. A shared correction is a new version (`v1.2`, `v2`, ...) sent to both
arms; an oracle defect is fixed the same way and rerun in both arms. Each arm copies this
directory next to its v1 copy, verifies it, and runs the oracle from its own copy without editing
it ([oracle/README.md](oracle/README.md)).

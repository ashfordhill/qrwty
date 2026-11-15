# QRWTY neutral experiment pack, v1.5

The shared, frozen inputs for both arms of run `qrwty-r1-20261114`: A builds QRWTY with Jeeves in
`qrwty`, B builds it without Jeeves in `qrwty-baseline`. v1 was frozen by unit Q00 on 2026-11-14
(UTC) from QRWTY commit `0e2e1f2717b8a823ff501dbec95aebc9dc675d4b`. v1.1 was built by unit N01
on 2026-11-14 from QRWTY commit `c657f2d`: a self-contained copy of v1 plus the executable neutral
oracle (`oracle/`), with one amendment (the Node.js pin). v1.2 was built by unit N02 on
2026-11-14 from QRWTY commit `7db0e33`: a copy of v1.1 whose only functional change is the ledger
tool's rule R12. v1.3 was built by unit N03 on 2026-11-14 from QRWTY commit `128246a`: a
self-contained copy of v1.2 with the four oracle files as the 2026-11-14 history rewrite left them
and a fix to A06's invalid-cookie check. v1.4 was built by unit N04 on 2026-11-14 from QRWTY
commit `02a70a4`: a self-contained copy of v1.3 with three oracle changes (F01's per-process
route caches, F06's fixed burst, monotonic timing). **v1.5** was built by unit N05 on 2026-11-15
(UTC) from QRWTY commit `1144ac0`: a self-contained copy of v1.4 that carries Q11's design assets
(`files/docs/design/`). The oracle's browser rows always use Q11's frozen accessible-name list
from there, and the UI rows run in one skin × light/dark × desktop/mobile
([decisions §11](frozen/decisions.md#11-amendments), owner decisions §11).

## Changes from v1.4

| Path | Change |
| --- | --- |
| `files/docs/design/` (new) | Q11's deliverables, byte copies from QRWTY commit `d67f5fe`: `README.md` (the design README), `accessible-names.md`, `accessible-names.json` (the frozen name list, version `q11-2026-11-14.1`), `prototype/` (`index.html`, `tokens.css`, `app.css`, `app.js`, `qr.js`) and the QR export sample `qr-export/qrwty-7Hq2xP9kLm.png` and `.svg`. Q11's screenshots and evidence (`docs/evidence/q11/`) are not copied; the README's two links to them are declared outside the pack |
| `oracle/src/runner.ts` | `FROZEN_UI_NAMES_PATH` is the pack's `files/docs/design/accessible-names.json`. `run` loads and validates it before any row and gives it to every browser row, and each result records its `version` and SHA-256 in `environment.uiNames`. Only the self-test passes a list of its own. Oracle build `1.5.0`; results report pack `v1.5` |
| `oracle/src/cli.ts` | `--ui-names` is refused ("--ui-names was removed in pack v1.5 …"), so no arm supplies its own list |
| `oracle/test/ui-names.test.ts` (new) | Five unit tests. The frozen list is loaded by default, has Q11's version and SHA-256, validates against `ui-names.schema.json` and names all 29 logical keys. A list that breaks the schema is refused, and so is the CLI's `--ui-names` |
| `oracle/src/rows/U02.ts`–`U08.ts` | The scope label says "One skin × …" (was "Each skin × …"). Checks unchanged |
| `oracle/src/browser/names.ts`, `oracle/ui-names.schema.json` | The comment and the schema's `description` name the frozen file; the schema's rules are unchanged |
| `oracle/package.json`, `oracle/README.md` | Version `1.5.0`. The README documents the frozen list ([UI names](oracle/README.md#ui-names-pack-v15)), drops `--ui-names`, adds `environment.uiNames` to the result format and says `ui.skins` lists the one skin |
| `frozen/acceptance-oracle.md` | §6: one skin × light/dark × desktop/mobile (owner decisions §11); the name list is the pack's `files/docs/design/accessible-names.json`, always loaded by the oracle |
| `frozen/decisions.md` | §1 and §2: owner decisions §11 quoted, replacing §5 of the pack's copy; §2 rows for U01, the design brief, the architecture flow sheet and B08. §7–§10: no default-skin review, one skin, the design assets in `files/docs/design/`. §11: the v1.5 row and its note |
| `b/execution-brief.md` | §1 and the B08 row: one UI skin from `files/docs/design/` |
| `evidence/n05/` (new) | How v1.5 was built and checked |
| `README.md` | This file |
| everything else | Byte-identical to v1.4 (`fromV1.4: identical` in the manifest), including `ledger/`, `verify_pack.py`, every other copied contract (the owner decisions copy still holds sections 1–8) and `evidence/n01/`–`evidence/n04/` |

**What each arm does for v1.5:**
- It lists its one skin in its adapter's `ui.skins`, as a one-item list. `selectSkin` stays
  required, and a one-skin UI may ignore it.
- It builds its UI from `files/docs/design/` with exactly the roles and names of
  `accessible-names.json`.
- It runs its browser rows (A01, A04, U02–U08) from its v1.5 copy without `--ui-names`.

## Changes from v1.3 to v1.4

| Path | Change |
| --- | --- |
| `oracle/src/rows/F01.ts` | After injecting each Valkey fault, runs the new fault point `clear-route-caches` on every replica of every service, then sends that fault's hot redirects. Requires the adapter to declare it (otherwise `blocked`: "adapter has no clear-route-caches fault point"). "No stampede" passes at most max(2 × redirect replicas, 0.1 × hot requests) database queries per fault; v1.3 allowed 2 per request |
| `oracle/src/rows/F06.ts` | "Beyond the queue bound" sends max(2,000, declared queue bound + declared admission bound + 1) concurrent GETs, on connections held open and idle for the memory baseline; RSS growth above that baseline (sampled during and after) must stay within 128 MiB; a 503 without `Location` passes whether admission or the publisher queue refused it. Blocked until `inspect publisherQueue` reports `admissionBound` |
| `oracle/adapter.schema.json`, `oracle/src/types.ts`, `oracle/src/adapter.ts` | New optional adapter field `faultPoints` (the fault points the `faultPoint` command implements) and the capability check F01 uses |
| `oracle/src/client/raw.ts`, `oracle/src/client/client.ts`, `oracle/src/rows/lib/flows.ts` | Idle held-open connections (`openConnection`, `holdConnections`, request option `held`) for F06 |
| `oracle/src/rows/lib/flows.ts`, `oracle/src/faults/commands.ts`, `oracle/src/fixtures/stripe.ts`, `oracle/src/rows/A01.ts`, `A07.ts`, `A11.ts`, `A13.ts`, `A15.ts`, `A16.ts`, `A23.ts`, `F01.ts`, `F02.ts`, `F03.ts`, `F06.ts`, `oracle/selftest/run.ts` | Monotonic timing: every duration and deadline uses `performance.now()` ([evidence/n04](evidence/n04/README.md#monotonic-timing) lists each check). Wall-clock time stays for recorded timestamps and for comparisons with times the arm enforces |
| `oracle/selftest/cases.ts`, `oracle/selftest/double.ts`, `oracle/selftest/run.ts` | New self-test cases `F01-inprocess-stampede` and `F06-small-bound-unbounded-queue`, both expected `failed`. The double gains a route-cache model and a publisher model, switched on only for those rows' cases; every other case keeps its expected result |
| `oracle/test/timing.test.ts` (new), `oracle/test/rows.test.ts`, `oracle/test/fixtures.test.ts` | A unit test that fakes a 3.6 s wall-clock jump inside measured intervals and shows the durations are unaffected; the other two tests follow the monotonic fields |
| `oracle/src/runner.ts`, `oracle/package.json`, `oracle/README.md` | Oracle build `1.4.0`: results report pack `v1.4`. The README documents `faultPoints`, `clear-route-caches`, `admissionBound` and the F01, F06 and timing readings |
| `frozen/acceptance-oracle.md` | §2: the new fault point and the admission bound in the test control interface |
| `frozen/decisions.md` | Amended: the v1.4 row of §11 and its note |
| `evidence/n04/` | New: how v1.4 was built and checked, including the proof that v1.3's F01 and F06 miss the new cases |
| `README.md` | This file |
| everything else | Byte-identical to v1.3 (`fromV1.3: identical` in the manifest), including `ledger/`, `verify_pack.py`, `evidence/n01/` and `evidence/n03/` |

**What each arm adds to its adapter for v1.4:** `"faultPoints": [..., "clear-route-caches"]`, that
fault point in its `faultPoint` command (with `{arg}` a replica name: that replica drops its
per-process route cache, or does nothing when it has none, and prints `{"ok": true}`), and
`admissionBound` for each process in `inspect publisherQueue` (`0` when there is no admission
stage). Then it reruns F01 and F06 from its v1.4 copy.

## Changes from v1.2 to v1.3

| Path | Change |
| --- | --- |
| `oracle/selftest/double.ts`, `oracle/src/fixtures/stripe-signer.ts`, `oracle/test/stripe.test.ts`, `oracle/test/observe.test.ts` | Carried as the 2026-11-14 history rewrite left them: five Stripe-key-shaped test literals are now string concatenations, with the same runtime values. **v1.1 and v1.2 are superseded**: after the rewrite these four files no longer match their v1.1 and v1.2 manifests, so those versions no longer verify. Use v1.3 |
| `oracle/src/rows/A06.ts` | Fix: the check "invalid session cookie on create" sends a present but invalid cookie. Its actor has its own jar, filled from the cookie names read right after sign-in; the revoked-session actor gets a copy of the jar, never the jar itself; the check fails when no cookie was sent |
| `oracle/selftest/cases.ts`, `oracle/selftest/double.ts` | New self-test case `A06-unknown-cookie` (double mode `a06-unknown-cookie-guest`: refuses and clears a revoked cookie, but makes a garbage cookie a guest), expected `failed`. Every other case keeps its expected result |
| `oracle/src/runner.ts`, `oracle/package.json`, `oracle/README.md` | Oracle build `1.3.0`: results report pack `v1.3` |
| `frozen/decisions.md` | Amended: the v1.3 row of §11 and its note |
| `evidence/n03/` | New: how v1.3 was built and checked, including the proof that the old A06 misses the new case |
| `README.md` | This file |
| everything else | Byte-identical to v1.2 (`fromV1.2: identical` in the manifest), including `ledger/` and `evidence/n01/` |

v1.2's change from v1.1 (ledger rule R12, [rule changes](ledger/README.md#rule-changes)) and
v1.1's changes from v1 still apply: v1.1 added `oracle/` and `evidence/n01/`, amended
`frozen/decisions.md` (Node.js 24.21.0 and `node:24.21.0-bookworm-slim`, §6 and §11) and made
`verify_pack.py` ignore an installed `oracle/node_modules/` and check anchors in every
`authored-*` file.

The pack's identity is the SHA-256 of its `MANIFEST.json`. It cannot be written inside the pack
itself; for v1.5 it is recorded in `docs/benchmarks/status.json` and the N05 handoff entry, and
each arm records it when it adopts v1.5.

## Precedence

1. `files/docs/plans/production-build/owner-decisions-2026-11-13.md` wins over everything. Its
   later section 11 (one skin), which this copy predates, is quoted in
   [decisions §2](frozen/decisions.md#owner-decisions-section-11) and replaces its section 5.
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
| [files/docs/design/](files/docs/design/README.md) | Q11's design deliverables (v1.5): the design README, the token sheet and clickable prototype (`prototype/`), the frozen accessible names (`accessible-names.md`, and `accessible-names.json`, which the oracle's browser rows read) and the QR export sample (`qr-export/`) |
| `verify_pack.py` | Recomputes every hash and checks the allowlist and links |
| [oracle/](oracle/README.md) | The executable oracle: adapter schema, rows A01–A24, F01–F10, R01–R06, U02–U08, fixtures, fault driver, capture tools, self-test |
| `evidence/n01/` | How v1.1 was built and checked: unit tests, integration tests, self-test results, pin dates |
| [evidence/n03/](evidence/n03/README.md) | How v1.3 was built and checked: the A06 proof, unit and integration tests, the full self-test, the credential-shape scan, the manifest builder |
| [evidence/n04/](evidence/n04/README.md) | How v1.4 was built and checked: the F01 and F06 proofs, the monotonic-timing list and test, unit and integration tests, the full self-test, the credential-shape scan, the manifest builder |
| [evidence/n05/](evidence/n05/README.md) | How v1.5 was built and checked: the copies of Q11's files, the name-list validation, unit and integration tests, the full self-test, the credential-shape scan, the manifest builder |

## Excluded

None of these exist in QRWTY at the freeze commit, except where noted, and none may enter a
pack: A source (`app/`, `web/`, `infra/`), generated payloads, generated tests and generation
reports, Jeeves generator internals (the Jeeves repository and `snapshot-and-sources.md`, which
describes generator files; that file exists and is excluded), A handoffs and evidence, A IaC,
A repair or incident history, and QRWTY's Git history (including an earlier application removed
in November 2026). Also excluded: A's unit plan, the coordinator prompt, readiness notes and
plan index (orchestration, not requirements), `comparison.md` (its rules for B are restated in
`frozen/`; it also holds the withheld maintenance challenge), `budget-options.md` (future cost
reference), the business research, the root README and the owner's `.docs/`. From v1.5 also
Q11's screenshots and evidence (`docs/evidence/q11/`): only its design deliverables are copied.
The manifest lists each exclusion and each link in a copied file that points outside the pack.

## Verify

```sh
python3 docs/benchmarks/neutral-pack/v1.5/verify_pack.py        # anywhere the pack is copied
python3 docs/benchmarks/neutral-pack/v1.5/verify_pack.py --against-git .   # QRWTY side only
```

The second form also proves each copy is byte-identical to its origin commit. B never runs it:
it reads QRWTY's Git history. Installing the oracle's dependencies (`oracle/node_modules/`) does
not change the pack; `verify_pack.py` ignores that folder.

## Rules

The pack is immutable. A shared correction is a new version (`v1.6`, `v2`, ...) sent to both
arms; an oracle defect is fixed the same way and rerun in both arms. Each arm copies this
directory next to its earlier copies, verifies it, and runs the oracle from its own copy without
editing it ([oracle/README.md](oracle/README.md)). Each arm's run copy of the ledger tools
(`ledger.py`, `README.md`) is replaced by this version's `ledger/` files.

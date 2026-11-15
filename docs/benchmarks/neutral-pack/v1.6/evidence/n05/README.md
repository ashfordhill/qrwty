# N05 evidence: building and checking pack v1.5

Unit N05, attempt 1, run `qrwty-r1-20261114`, shared ledger. Built on 2026-11-15 (UTC) in
`/home/ash/github/qrwty` from commit `1144ac0`, with Node.js 24.21.0 and pnpm 12.16.1.

Sources read:
- pack v1.4 and the run ledger README;
- Q11's `docs/design/`, and owner decisions §11;
- the N05 assignment packet, and this repository's N04 handoff entry (for the format).

No arm source, test, IaC, review, handoff or evidence was read, and no Jeeves file.

v1.5 is v1.4 with three changes ([decisions §11](../../frozen/decisions.md#11-amendments)):

1. **The frozen name list.** Q11's `docs/design/accessible-names.json` (version
   `q11-2026-11-14.1`) is the pack's `files/docs/design/accessible-names.json`.
   - Before any row runs, `run` loads it from that fixed path (`FROZEN_UI_NAMES_PATH` in
     `oracle/src/runner.ts`) and validates it against `oracle/ui-names.schema.json`.
   - The browser rows (A01, A04's browser step, U02–U08) use it, and each result records its
     version and SHA-256 in `environment.uiNames`.
   - The CLI refuses `--ui-names`, so no arm supplies its own list. Only the self-test gives its
     double a list of its own.
2. **The design assets.** Q11's design README, `accessible-names.md`, token sheet, prototype and
   QR export sample are byte copies under `files/docs/design/`. Q11's screenshots and evidence are
   not copied.
3. **One skin.** These now say one skin × light/dark × desktop/mobile, citing owner decisions
   §11, which decisions §2 quotes:
   - acceptance-oracle §6;
   - decisions §1, §2 and §7–§10;
   - the B execution brief;
   - the U rows' scope labels.

   No row's checks change.

| File | What it holds |
| --- | --- |
| [design-copies.txt](design-copies.txt) | Each of the 10 copied files with its size and SHA-256, compared with `git show d67f5fe:docs/design/<file>`; Q11's 81 evidence files (67 screenshots) are not in the pack |
| [names-validation.txt](names-validation.txt) | The frozen list loaded by the oracle's own `loadUiNames()` and validated with its schema validator (0 errors, all 29 logical keys, 36 further states), and an independent stdlib Python check of the same rules |
| [cli.txt](cli.txt) | `run … --ui-names my-names.json` refused (exit 2), and `list` showing the U rows' "One skin × …" scopes |
| [check.txt](check.txt) | `pnpm check` in `oracle/`: Biome, TypeScript and the unit tests; also in a fresh copy after `pnpm install --frozen-lockfile` |
| [integration.txt](integration.txt) | `pnpm test:integration` against the pinned emulator and Toxiproxy |
| [selftest/selftest-summary.md](selftest/selftest-summary.md) | The full self-test with the v1.5 oracle |
| `selftest/selftest-results.json`, `selftest/results.jsonl`, `selftest/run.log` | The same run in machine form. The scratch directory is written `<scratch>`; the run's artifacts were not kept, and their hashes are in the lines |
| [credential-scan.txt](credential-scan.txt) | Credential-shape scan of every v1.5 file |
| `build_manifest.py` | The script that produced this version's `MANIFEST.json` and `SHA256SUMS` (run from the repository root with `python3 -I`) |

## Where the name list lives, and how the rows read it

- **Location.** The list is `files/docs/design/accessible-names.json`, beside Q11's
  `accessible-names.md`, which explains it and links to it. It is the only copy in the pack.
- **Origin.** The manifest records it as a copy of `docs/design/accessible-names.json` at
  `d67f5fe52fddaf7fca5cf086556b888556502886`, so `verify_pack.py --against-git` proves the bytes.
- **Loading.** `FROZEN_UI_NAMES_PATH` resolves it from the oracle's own folder (`ORACLE_ROOT/..`),
  never from the working directory. This works in any copy of the whole pack, which is what each
  arm installs.
- **Use.** `runRows` loads it once per run, before the fixtures start; an invalid list stops the run
  before any row. It goes to every row as `ctx.uiNames`. `byName` then finds each control with
  `getByRole(role, { name, exact: true })`, as in v1.4.
- **Blocking.** The rows' "frozen UI names" check still reports `blocked` when a key is missing,
  and with the frozen list none is.
- **Self-test.** It passes `uiNamesPath` (`selftest/ui-names.selftest.json`), so its double and its
  expected results are as in v1.4. In particular A04-good stays `blocked`, because the double's list
  lacks A04's browser keys.

## Self-test environment

| Dependency | Container (removed after the run) |
| --- | --- |
| Pub/Sub emulator | `n05-selftest-pubsub`: `gcr.io/google.com/cloudsdktool/google-cloud-cli:591.0.0-emulators@sha256:112c21f8f6e04b03b393b3c34fb943a1f443e839f18c6492c364ac2e6c3ff935`, host network, `127.0.0.1:47585` |
| Toxiproxy | `n05-selftest-toxiproxy`: `ghcr.io/shopify/toxiproxy:2.13.0@sha256:5d3dae09bc185dcc5ff6cf43abf6062a4a720aff0c4306a471e773acdcd107aa`, host network, API `127.0.0.1:47574` |
| Chromium | Playwright 1.63.0's Chrome for Testing (revision 1243), already in `~/.cache/ms-playwright` |

Full self-test: started 2026-11-15T01:46:30Z, ended 01:52:39Z. 51 cases, all matched; 34 of 34
deliberate faults reported `failed`. Every case has the same expected and observed status as in
v1.4's run (`evidence/n04/selftest/`); `cases.ts` is unchanged. Every result reports pack `v1.5`,
version `1.5.0` and the self-test's own list in `environment.uiNames`
(`selftest-double-only`). Unit tests: 48, which is v1.4's 43 plus the five of
`test/ui-names.test.ts`. Integration tests: 3.

```sh
node selftest/run.ts --out <scratch> --pubsub-emulator 127.0.0.1:47585 --toxiproxy http://127.0.0.1:47574
```

## What this shows, and what it does not

It shows these things:
- the pack carries Q11's ten design files byte for byte, and none of its evidence;
- the frozen list is valid against the schema and names every key the browser rows drive;
- the oracle always loads it and refuses another;
- no self-test case changed its result.

It does not run either arm's UI: U02–U08 stay live-arm rows, and A01's browser step runs against
the double with the self-test's own names. Whether an arm's UI exposes the frozen names is decided
when that arm runs its browser rows from its v1.5 copy.

The pack's copy of the owner decisions still holds sections 1–8 (origin `0e2e1f2`). Section 11 is
quoted in decisions §2 rather than copied, because the current file also carries other sections
added since that copy, which this unit was not asked to bring into the pack. The pack manifest and its verification cannot be
inside the pack they hash; they are recorded in the N05 handoff entry and
`docs/benchmarks/status.json`.

# N01 evidence: building and checking pack v1.1

Unit N01, attempt 1, run `qrwty-r1-20261114`, shared ledger. Built on 2026-11-14 (UTC) in
`/home/ash/github/qrwty` from commit `c657f2d`, with Node.js 24.21.0 and pnpm 12.16.1. Sources read:
this pack (v1), the run ledger README, `AGENTS.md`, and public documentation and registries
(npm, nodejs.org, GitHub releases, Docker Hub, gcr.io, the Stripe, Pub/Sub, Web Risk and Toxiproxy
API documentation). No arm source, test, IaC, handoff or evidence, and no Jeeves file, was read.

| File | What it holds |
| --- | --- |
| [check.txt](check.txt) | `pnpm check` in `oracle/`: Biome (99 files), TypeScript 7.0.2, 39 unit tests, exit 0 |
| [integration.txt](integration.txt) | `pnpm test:integration`: Pub/Sub capture against the pinned emulator, the Toxiproxy driver against the pinned server, the browser driver and SVG decoding in Chromium; 3 tests, exit 0 |
| [selftest/selftest-summary.md](selftest/selftest-summary.md) | The full self-test: 48 cases, all matched; 31 of 31 deliberate faults reported `failed` |
| `selftest/selftest-results.json`, `selftest/results.jsonl`, `selftest/run.log` | The same run in machine form: per case, and each row's `results.jsonl` line. The run's artifacts (captures, about 11 MB) were not kept; their hashes are in the lines |
| [fresh-copy.txt](fresh-copy.txt) | A copy of the pack without `node_modules`: `pnpm install --frozen-lockfile`, `pnpm check`, 47 rows listed, three self-test cases from the copy |
| `pins.json` | Publish date of every pin: runtime, images, and all 219 packages in `oracle/pnpm-lock.yaml` (none younger than 14 days; newest 2026-10-29) |
| `pin_dates.py`, `build_manifest.py` | The scripts that produced `pins.json` and this version's `MANIFEST.json` / `SHA256SUMS` (run from outside the pack with `python3 -I`) |

## Self-test environment

| Dependency | Container (removed after the run) |
| --- | --- |
| Pub/Sub emulator | `n01-selftest-pubsub`: `gcr.io/google.com/cloudsdktool/google-cloud-cli:591.0.0-emulators@sha256:112c21f8f6e04b03b393b3c34fb943a1f443e839f18c6492c364ac2e6c3ff935`, host network, `127.0.0.1:47285` |
| Toxiproxy | `n01-selftest-toxiproxy`: `ghcr.io/shopify/toxiproxy:2.13.0@sha256:5d3dae09bc185dcc5ff6cf43abf6062a4a720aff0c4306a471e773acdcd107aa`, host network, API `127.0.0.1:47274` |
| Chromium | Playwright 1.63.0's Chrome for Testing 153.0.8010.12 (revision 1243), already in `~/.cache/ms-playwright` |

Full self-test: started 2026-11-14T07:46:39Z, ended 07:51:48Z.

```sh
node selftest/run.ts --out <scratch> --pubsub-emulator 127.0.0.1:47285 --toxiproxy http://127.0.0.1:47274
```

The double runs entirely in the oracle's process; each case gets its own topic and Toxiproxy
proxies, deleted afterwards. Timing parameters were shortened for the self-test only
(`selftest/cases.ts`, `OVERRIDES`), and each result records them in `observed.params`.

## What the self-test shows, and what it does not

It shows that each self-tested check passes against correct behaviour and fails against the
named fault, through the real components (raw HTTP client, capture proxy, Pub/Sub capture,
Toxiproxy driver, Stripe fixture and signer, Web Risk fixture, browser driver, clock and command
runner). Three correct cases are `blocked` by design: A04's browser step and A18's
placeholder-credential start check wait for inputs the double does not have (the frozen UI names,
a production profile), and F03's consume side needs a separate consume proxy.

It does not show that the live-arm rows (A11–A13, A15, A19, A21–A23, F01, F02, F04–F10, R01–R06,
U02–U08) pass or fail correctly against a real arm: those need real replicas, stores, workers and
UI, and their first runs are the arms' first oracle runs. Their helpers are unit-tested.

The pack manifest and its verification cannot be inside the pack they hash; they are recorded in
the N01 handoff entry and `docs/benchmarks/status.json`.

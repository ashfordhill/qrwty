# N04 evidence: building and checking pack v1.4

Unit N04, attempt 1, run `qrwty-r1-20261114`, shared ledger. Built on 2026-11-14 (UTC) in
`/home/ash/github/qrwty` from commit `02a70a4`, with Node.js 24.21.0 and pnpm 12.16.1. Sources read:
pack v1.3, the run ledger README and the N04 assignment packet. No arm source, test, IaC, review,
handoff or evidence (including B's test routes), and no Jeeves file, was read.

v1.4 is v1.3 with three oracle changes ([decisions §11](../../frozen/decisions.md#11-amendments)):

1. **F01 clears per-process route caches.** A new fault point, `clear-route-caches`, declared in
   the adapter's new `faultPoints` list: the named replica drops every entry of its per-process
   route cache; the shared cache and the database are not touched; a replica without one does
   nothing and reports success. F01 runs it on every replica of every service right after
   injecting each Valkey fault (refused, stalled, broken) and before that fault's hot redirects.
   Without the declaration F01 is `blocked` with "adapter has no clear-route-caches fault point".
   "No stampede" passes when the fault's database queries are at most max(2 × the redirect
   replicas, 0.1 × the hot requests): v1.3's 2 per request grew with the traffic and passed a
   fallback that makes one query per request.
2. **F06 uses a pack-fixed burst and an idle-connection baseline.** The burst is
   max(2,000, declared queue bound + declared admission bound + 1) concurrent GETs to one
   redirect replica (`admissionBound` is a new field of `inspect publisherQueue`; F06 is `blocked`
   without it). The oracle opens that many connections, holds them idle, takes the memory
   baseline, then sends one GET on each; RSS is sampled while they wait and after they end; the
   limit stays 128 MiB. A 503 without `Location` passes whether admission or the publisher queue
   refused it.
3. **Monotonic timing.** Every duration and deadline the oracle measures uses `performance.now()`
   ([list below](#monotonic-timing)).

| File | What it holds |
| --- | --- |
| [proof/old-summary.md](proof/old-summary.md) | The two new cases with v1.3's `F01.ts` (SHA-256 `1c022736…a0ace`) and `F06.ts` (`5af884e4…2c867f`) dropped into a scratch copy of the v1.4 oracle: both reported `passed` (MISMATCH), so the old checks miss both faults |
| [proof/new-summary.md](proof/new-summary.md) | The same two cases with v1.4's code, taken from the full self-test: both `failed`, on the checks that target the faults |
| [proof/control-summary.md](proof/control-summary.md) | Scratch controls, not pack cases: v1.4's F01 and F06 against the double in `good` mode both pass, and F01 against an adapter that does not declare `clear-route-caches` is `blocked` (check "adapter capability": "adapter has no clear-route-caches fault point") |
| `proof/checks.jsonl` | Every check of F01 and F06 in those runs, per case and code version |
| [timing-test.txt](timing-test.txt) | `oracle/test/timing.test.ts` against v1.4 (3 passed) and against v1.3's wall-clock `poll`, `watchSlug` loop and `commands.ts` in a scratch copy (3 failed) |
| [selftest/selftest-summary.md](selftest/selftest-summary.md) | The full self-test with the v1.4 oracle |
| `selftest/selftest-results.json`, `selftest/results.jsonl`, `selftest/run.log` | The same run in machine form. The scratch directory is written `<scratch>`; the run's artifacts were not kept, their hashes are in the lines |
| [check.txt](check.txt) | `pnpm check` in `oracle/`: Biome, TypeScript, unit tests; also in a fresh copy after `pnpm install --frozen-lockfile` |
| [integration.txt](integration.txt) | `pnpm test:integration` against the pinned emulator and Toxiproxy |
| [credential-scan.txt](credential-scan.txt) | Credential-shape scan of every v1.4 file |
| `build_manifest.py` | The script that produced this version's `MANIFEST.json` and `SHA256SUMS` (run from outside the pack with `python3 -I`) |

## The new self-test cases

**`F01-inprocess-stampede`** runs F01 against double mode `f01-inprocess-stampede`. For F01 cases
the double puts a per-process route cache in each replica in front of a shared-cache stand-in (a
line server behind its own Toxiproxy proxy, declared as `valkey`), counts every authoritative
route read in `inspect dbQueries`, and implements `clear-route-caches` and `corrupt-route-cache`.
In `good` mode a database read refreshes the per-process cache (valid for 30 s), so a cleared
cache costs one query per replica. The fault: a database read refreshes the per-process cache only
when the shared cache answered, so while the shared cache is down every request that misses goes
to the database. With v1.3's F01 the warm per-process cache serves the hot slug through every
fault (0 queries in each phase) and nothing is detected. With v1.4's F01 the cleared cache exposes
one query per request (refused: 4,008 queries for 4,008 requests, allowed 400.8; stalled: 10 for
10, allowed 4; broken: 2,889 for 2,889, allowed 288.9), and all three "no stampede" checks fail.
In the `good` control the same phases cost 2 queries each.

**`F06-small-bound-unbounded-queue`** runs F06 against double mode
`f06-small-bound-unbounded-queue`. For F06 cases the double's redirect replicas get a publisher
model: a publish deadline of 2.5 s, an admission bound and a queue bound, refused requests
answered 503 without `Location`, and each queued publish holding 128 KiB until the Pub/Sub client
settles it. In `good` mode it declares and enforces a queue bound of 50 and an admission bound of
200. The fault: it declares 4 and 16 and enforces neither. v1.3's burst was 3 × 4 = 12 GETs, so its
growth stayed small (131,072 bytes) and nothing was detected. v1.4 sends 2,000, every one is
queued, and "memory bounded" fails (253,149,184 bytes above the idle baseline; the limit is
134,217,728). Every GET was still 503 without `Location`, so only the memory check sees this
fault. In the `good` control the growth was 3,530,752 bytes.

Both models are switched on only for the cases of their rows, so every other case runs the double
as in v1.3. The double still lives in the same process as the oracle, so its memory answer is
that process's RSS; the idle-connection baseline cancels both ends of the 2,000 sockets.

## Monotonic timing

Changed to `performance.now()` (each is a duration, a loop length or a deadline the oracle
measures between two of its own instants):

| File | Check or measure |
| --- | --- |
| `src/rows/lib/flows.ts` `poll()` | Each poll's timeout and `elapsedMs`. A15 "links 410 within 60 s" and A22 "new limits apply within 60 s" compare that `elapsedMs`; every other row that polls (A02, A10, A12, A13, A16, A19, A21, A23, F02–F05, F09, F10, R03) gets the right timeout |
| `src/rows/lib/flows.ts` `watchSlug()`, `lateOld()` | The watch loop's length; each observation also records `sentMono`, and `lateOld` compares it with a monotonic deadline |
| `src/rows/A01.ts` | The 15 s wait for the opened navigation |
| `src/rows/A07.ts` | The commit instants of edit, disable, delete and block, so "no old result after 60 s" is measured from them |
| `src/rows/A11.ts` | The analytics wait loop |
| `src/rows/A13.ts` | The worker-outage loop and the "delayed after" instant |
| `src/rows/A15.ts` | The recorded `elapsedMs` of "links 410 within 60 s" |
| `src/rows/A16.ts` | "Block reaches every replica within 60 s" |
| `src/rows/A23.ts`, `src/fixtures/stripe.ts` | "No new charge call" after the deletion: each Stripe fixture call also records `atMono` |
| `src/rows/F01.ts` | The length of each hot-redirect phase |
| `src/rows/F02.ts` | The last authoritative read, the observation loop, each send instant (`sentMono`, was `at`) and response latency: "cache only until validatedUntil", "503 with Retry-After afterwards", "bounded latency" |
| `src/rows/F03.ts` | The length of each publisher-fault phase |
| `src/rows/F06.ts` | "503 within deadline + margin" |
| `src/faults/commands.ts` | Every adapter command's `durationMs` (R01 and R05 record it) |
| `selftest/run.ts` | Each case's `durationMs` |
| `test/fixtures.test.ts` | The Web Risk fixture's slow-response latency |

Kept on the wall clock, because the time is recorded or compared with a clock the arm (or the
emulator) keeps: the runner's `runId`, `startedAt` and `endedAt`; the Toxiproxy, clock, Web Risk,
Stripe and browser logs' `at`; the self-test summary's `at`; the capture subscription's name; A08's
`expiresAt` and the send times compared with it; F06's "no 302 after expiry"; A04 and A23 clock
moves to claim expiry, grace and `paidThrough`; `Clock.now()`; cookie `Expires`; JWT `iat`/`exp`
(A14, `jwt.ts`); Stripe event and signature timestamps (A20, `stripe-signer.ts`, `stripe.ts`); Web
Risk `expireTime`; click `eventTime` (`clicks.ts`, A12, `pubsub-capture.ts`); A22's date range; and
the A24/F03 comparison of Pub/Sub `publishTime` with the response head (`headWallMs`). The double
is the arm here, so its own clock is unchanged.

`oracle/test/timing.test.ts` fakes only `Date` (Vitest fake timers with `toFake: ["Date"]`, real
timers), jumps it forward 3.6 s inside a `poll`, an adapter command and a `watchSlug` loop, and
shows each measured duration and the `lateOld` deadline check unchanged. Against v1.3's wall-clock
code the same three tests fail ([timing-test.txt](timing-test.txt)).

## Self-test environment

| Dependency | Container (removed after the run) |
| --- | --- |
| Pub/Sub emulator | `n04-selftest-pubsub`: `gcr.io/google.com/cloudsdktool/google-cloud-cli:591.0.0-emulators@sha256:112c21f8f6e04b03b393b3c34fb943a1f443e839f18c6492c364ac2e6c3ff935`, host network, `127.0.0.1:47485` |
| Toxiproxy | `n04-selftest-toxiproxy`: `ghcr.io/shopify/toxiproxy:2.13.0@sha256:5d3dae09bc185dcc5ff6cf43abf6062a4a720aff0c4306a471e773acdcd107aa`, host network, API `127.0.0.1:47474` |
| Chromium | Playwright 1.63.0's Chrome for Testing (revision 1243), already in `~/.cache/ms-playwright` |

Full self-test: started 2026-11-14T22:34:59Z, ended 22:40:58Z. 51 cases, all matched; 34 of 34
deliberate faults reported `failed`. The 49 cases v1.3 had keep their expected results (`cases.ts`
only adds the two new ones). Unit tests: 43 (v1.3: 39, plus the three timing tests and one adapter
test for `faultPoints`); integration tests: 3.

```sh
node selftest/run.ts --out <scratch> --pubsub-emulator 127.0.0.1:47485 --toxiproxy http://127.0.0.1:47474
node selftest/run.ts --out <scratch> --pubsub-emulator 127.0.0.1:47485 --toxiproxy http://127.0.0.1:47474 \
  --cases F01-inprocess-stampede,F06-small-bound-unbounded-queue   # old-code proof, scratch copy
```

## What this shows, and what it does not

It shows that v1.4's F01 exercises the database fallback once the per-process caches are cleared
and fails a fallback that grows with the traffic, that v1.4's F06 sends a burst a small declared
bound cannot shrink and measures memory above the sockets' own cost, that v1.3's code misses both
new cases, that a correct double passes both rows (scratch controls), and that every other
self-test case keeps its result. It does not run either arm: F01 and F06 stay live-arm rows, and
each arm reruns them from its v1.4 copy after adding `clear-route-caches` to its adapter
(`faultPoints` and its `faultPoint` command) and `admissionBound` to `inspect publisherQueue`. The
pack manifest and its verification cannot be inside the pack they hash; they are recorded in the
N04 handoff entry and `docs/benchmarks/status.json`.

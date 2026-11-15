# N03 evidence: building and checking pack v1.3

Unit N03, attempt 1, run `qrwty-r1-20261114`, shared ledger. Built on 2026-11-14 (UTC) in
`/home/ash/github/qrwty` from commit `128246a`, with Node.js 24.21.0 and pnpm 12.16.1. Sources read:
packs v1, v1.1 and v1.2, the run ledger README and the coordinator's note on the 2026-11-14 history
rewrite. No arm source, test, IaC, review, handoff or evidence, and no Jeeves file, was read.

v1.3 is v1.2 with two changes ([decisions §11](../../frozen/decisions.md#11-amendments)):

1. **Clean literals.** `oracle/selftest/double.ts`, `oracle/src/fixtures/stripe-signer.ts`,
   `oracle/test/stripe.test.ts` and `oracle/test/observe.test.ts` are taken from v1.2's working
   tree as the rewrite left them (five Stripe-key-shaped test literals written as string
   concatenations, same runtime values). The three files that the A06 fix does not touch are
   byte-identical to v1.2's working tree; `build_manifest.py` refuses otherwise.
2. **A06 fix.** In v1.2 the revoked-session actor was given the original cookie jar by reference
   (`stale.client.jar = revokedJar`), and the garbage actor's cookie names were read from that jar
   afterwards. An arm that clears the revoked cookie in its 401 (`Set-Cookie` with `Max-Age=0`)
   emptied the jar, so the garbage create carried no cookie at all and recorded
   `cookieNames: []`. Now the names are read once, right after sign-in; the revoked-session actor
   gets a copy; the garbage actor has its own jar with each name set to a value the arm never
   issued, and gets the CSRF token directly so the create is its only request; and the check fails
   when no cookie name was sent.

| File | What it holds |
| --- | --- |
| [a06-proof/old-A06-summary.md](a06-proof/old-A06-summary.md) | The four A06 cases with v1.2's `A06.ts` (SHA-256 `45bb0200…f4f8a1`) dropped into a scratch copy of the v1.3 oracle: `A06-unknown-cookie` is reported `passed` (MISMATCH), so the old check misses the fault; the other three match |
| [a06-proof/new-A06-summary.md](a06-proof/new-A06-summary.md) | The same four cases with v1.3's `A06.ts` (SHA-256 `4eb4cb08…c21de5`): all four match; `A06-unknown-cookie` is `failed` on the check "invalid session cookie on create" |
| `a06-proof/checks.jsonl` | Both runs' "invalid session cookie on create" check, per case. Old code on the new case: `cookieNames: []`, 401 `unauthenticated` (no cookie was sent). Fixed code: `cookieNames: ["qs"]`, the double answers a guest 201 |
| [selftest/selftest-summary.md](selftest/selftest-summary.md) | The full self-test with the fixed oracle: 49 cases, all matched; 32 of 32 deliberate faults reported `failed`. The 48 cases that v1.2 had keep their expected results |
| `selftest/selftest-results.json`, `selftest/results.jsonl`, `selftest/run.log` | The same run in machine form. The scratch directory is written `<scratch>`; the run's artifacts were not kept, their hashes are in the lines |
| [check.txt](check.txt) | `pnpm check` in `oracle/`: Biome (99 files), TypeScript, 39 unit tests, exit 0 |
| [integration.txt](integration.txt) | `pnpm test:integration` against the pinned emulator and Toxiproxy: 3 tests, exit 0 |
| [credential-scan.txt](credential-scan.txt) | Credential-shape scan of every v1.3 file: no hits |
| `build_manifest.py` | The script that produced this version's `MANIFEST.json` and `SHA256SUMS` (run from outside the pack with `python3 -I`) |

## The new self-test case

`A06-unknown-cookie` runs A06 against double mode `a06-unknown-cookie-guest`. That double
refuses a revoked session cookie with 401 and clears it, and answers a cookieless mutation with
401, like a careful arm. Its fault is that it ignores a session ID it never issued, so a garbage
cookie becomes a fresh guest and the create returns 201. Only the garbage-cookie check can see
this, and only when the garbage cookie is really sent: the revoked-session check passes, and with
v1.2's code the cleared jar left the garbage create cookieless, so it got the 401 a cookieless
request gets. The double keeps logged-out session IDs in a set (cleared on reset) to tell revoked
from unknown; no other mode reads it.

## Self-test environment

| Dependency | Container (removed after the run) |
| --- | --- |
| Pub/Sub emulator | `n03-selftest-pubsub`: `gcr.io/google.com/cloudsdktool/google-cloud-cli:591.0.0-emulators@sha256:112c21f8f6e04b03b393b3c34fb943a1f443e839f18c6492c364ac2e6c3ff935`, host network, `127.0.0.1:47385` |
| Toxiproxy | `n03-selftest-toxiproxy`: `ghcr.io/shopify/toxiproxy:2.13.0@sha256:5d3dae09bc185dcc5ff6cf43abf6062a4a720aff0c4306a471e773acdcd107aa`, host network, API `127.0.0.1:47374` |
| Chromium | Playwright 1.63.0's Chrome for Testing (revision 1243), already in `~/.cache/ms-playwright` |

Full self-test: started 2026-11-14T19:04:53Z, ended 19:10:10Z.

```sh
node selftest/run.ts --out <scratch> --pubsub-emulator 127.0.0.1:47385 --toxiproxy http://127.0.0.1:47374
node selftest/run.ts --out <scratch> --cases A06-good,A06-foreign,A06-guest,A06-unknown-cookie
```

## What this shows, and what it does not

It shows that the fixed A06 sends a present but invalid cookie and reports a server that turns
it into a guest, that v1.2's A06 does not, and that every other self-test case keeps its result.
It does not rerun any arm: an arm that recorded A06 with the v1.1 oracle reruns it from its v1.3
copy. The pack manifest and its verification cannot be inside the pack they hash; they are
recorded in the N03 handoff entry and `docs/benchmarks/status.json`.

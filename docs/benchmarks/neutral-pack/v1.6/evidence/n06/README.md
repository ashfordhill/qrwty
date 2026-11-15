# N06 evidence: building and checking pack v1.6

Unit N06, attempt 1, run `qrwty-r1-20261114`, shared ledger. Built on 2026-11-15 (UTC) in
`/home/ash/github/qrwty` from commit `a52fe84`, with Node.js 24.21.0 and pnpm 12.16.1.

Sources read:
- pack v1.5 and the run ledger README;
- owner decisions §12, and the N06 assignment packet;
- this repository's N05 handoff entry (for the format).

No arm source, test, IaC, review, handoff or evidence was read, and no Jeeves file.

v1.6 is v1.5 with four changes ([decisions §11](../../frozen/decisions.md#11-amendments)):

1. **Per-account login identifiers.** `identity.accounts` maps each oracle account to its own
   login identifier, and the password comes from `passwordEnv` or the new `passwordCommand`
   ([oracle README](../../oracle/README.md#identity-pack-v16)). Without the map the oracle signs in
   as `oracle-alice`, `oracle-bob` and `oracle-operator`, so local adapters need no change. A check
   that needs an unmapped account is `blocked`, never `failed`.
2. **At most one login post.** `Api.signIn` posts the login form once at most. A refused login
   fails with its reason and is never posted again in the run. Only network errors before the
   post are retried.
3. **Two self-test cases**, `signin-lockout` and `signin-mapped-identifier`. Every other case keeps
   its expected result.
4. **Records.** Decisions §11, acceptance-oracle §2 (Identity), oracle build `1.6.0`, pack
   `v1.6`, the pack README's "Changes from v1.5".

| File | What it holds |
| --- | --- |
| [proof/old-driver-summary.md](proof/old-driver-summary.md) | `signin-lockout` with v1.5's `oracle/src/client/session.ts` (SHA-256 `520b5362…443bab`) dropped into a scratch copy of the v1.6 oracle |
| [proof/old-oracle-summary.md](proof/old-oracle-summary.md) | Both new cases with v1.5's whole `oracle/src/` and `adapter.schema.json` in a scratch copy, under v1.6's self-test harness and double |
| [proof/new-summary.md](proof/new-summary.md) | The same two cases with v1.6's code, taken from the full self-test |
| [proof/old-driver-unit.txt](proof/old-driver-unit.txt) | `oracle/test/signin.test.ts` against v1.5's driver |
| `proof/checks.jsonl` | Each proof run's checks and what the issuer double saw, per case and code version |
| [identity-shape.txt](identity-shape.txt) | `validate-adapter` with v1.6 on a v1.5-shaped local adapter, a staging adapter and two refused ones; with v1.5 on the first two |
| [check.txt](check.txt) | `pnpm check` in `oracle/`: Biome, TypeScript and the unit tests; also in a fresh copy after `pnpm install --frozen-lockfile --offline` |
| [integration.txt](integration.txt) | `pnpm test:integration` against the pinned emulator and Toxiproxy |
| [selftest/selftest-summary.md](selftest/selftest-summary.md) | The full self-test with the v1.6 oracle |
| `selftest/selftest-results.json`, `selftest/results.jsonl`, `selftest/run.log` | The same run in machine form. The scratch directory is written `<scratch>` and the oracle directory `<oracle>`; the run's artifacts were not kept, and their hashes are in the lines |
| [credential-scan.txt](credential-scan.txt) | Credential-shape scan of every v1.6 file |
| `build_manifest.py` | The script that produced this version's `MANIFEST.json` and `SHA256SUMS` (run from the repository root with `python3 -I`) |

## The identity section

```json
"identity": {
  "issuerUrl": "https://<tenant domain>/",
  "audience": "<the arm's API audience>",
  "accounts": { "alice": "<alice's email>", "bob": "<bob's email>" },
  "passwordCommand": { "argv": ["./oracle/password.sh", "{account}"], "timeoutMs": 10000 }
}
```

- `accounts` is optional. Without it the oracle uses `oracle-alice`, `oracle-bob` and
  `oracle-operator`, so a v1.5 local adapter validates and signs in unchanged
  ([identity-shape.txt](identity-shape.txt)). With it, each value is a login identifier (no
  whitespace, at most 254 characters, no two alike), and an account it leaves out is not mapped:
  here `operator`.
- Exactly one of `passwordEnv` (one variable for every account, as before) and `passwordCommand`.
  The command runs without a shell, with `{account}` replaced by `alice`, `bob` or `operator`, and
  prints that account's password once: one line, exit 0. The oracle runs it at most once per
  account and run, registers the value as a secret before composing any message, and never puts
  its stdout in a result or in `commands.json`. A failing command, empty output, several lines or
  a password shorter than 4 characters blocks that account, with the exit code and a redacted
  stderr tail.
- A check that needs an unmapped account, or one whose password cannot be read, ends its row with
  a `blocked` check `account <key>` and the reason. Checks already run keep their results.
- `Api.signIn` posts the form at most once. Its result gives `posts` (0 or 1), `refused` and
  `reason`. A post, or a page after it, answered with anything but a redirect is a refused login:
  "the issuer refused the login: the login post answered 400 with the login form again; posted
  once, not posted again". `ctx.signIn` remembers a refused login for the rest of the run, and
  later sign-ins of that account return at once without a post. A15's sign-in after deleting the
  account, and F04's while the issuer is down, are not remembered. Only network errors before
  the post are retried, at most twice (after 250 ms and 1 s).

## The proofs

The two new cases run the double's issuer like a managed one: a refused login gets the login form
again (400), and an identifier is locked after 3 refused posts. The self-test checks the row's
status and also what the issuer saw: for `signin-lockout` at most one post and one refusal per
identifier, no lock, and the reason "posted once, not posted again" in a failed check; for
`signin-mapped-identifier` no refused post and no lock.

| Code | `signin-lockout` (expected `failed`) | `signin-mapped-identifier` (expected `passed`) |
| --- | --- | --- |
| v1.5's driver (`session.ts` only) in v1.6 | `failed`, but `oracle-alice` posted **11** times (3 refused as wrong, then 8 refused as blocked), **locked**, and no refusal reason: MISMATCH | not run (the driver does not choose names) |
| v1.5's `oracle/src/` and schema | the same: 11 posts, locked: MISMATCH | `failed`: `oracle-bob` posted 11 times ("this issuer accepts email addresses only" 3 times, then blocked), locked: MISMATCH |
| v1.6 | `failed` on "row completed": "sign-in as alice failed: the issuer refused the login: the login post answered 400 with the login form again; posted once, not posted again"; 1 post, 1 refusal, no lock: matched | `passed`; bob's email posted once and alice's twice (A06 signs alice in again for the revoked-session case), none refused: matched |

v1.5's schema also refuses the staging adapter outright: the accounts must equal the fixed names,
`operator` and `passwordEnv` are required, and `passwordCommand` is an unknown key
([identity-shape.txt](identity-shape.txt)). With v1.5's driver, `oracle/test/signin.test.ts`
fails 4 of its 7 tests ([proof/old-driver-unit.txt](proof/old-driver-unit.txt)): one refused
sign-in posts 11 times, three rows that sign in with a refused password post 33 times, and a
dropped connection before the post is not retried.

## Self-test environment

| Dependency | Container (removed after the run) |
| --- | --- |
| Pub/Sub emulator | `n06-selftest-pubsub`: `gcr.io/google.com/cloudsdktool/google-cloud-cli:591.0.0-emulators@sha256:112c21f8f6e04b03b393b3c34fb943a1f443e839f18c6492c364ac2e6c3ff935`, host network, `127.0.0.1:47685` |
| Toxiproxy | `n06-selftest-toxiproxy`: `ghcr.io/shopify/toxiproxy:2.13.0@sha256:5d3dae09bc185dcc5ff6cf43abf6062a4a720aff0c4306a471e773acdcd107aa`, host network, API `127.0.0.1:47674` |
| Chromium | Playwright 1.63.0's Chrome for Testing (revision 1243), already in `~/.cache/ms-playwright` |

Full self-test: started 2026-11-15T06:24:53Z, ended 06:30:59Z. 53 cases, all matched; 35 of 35
deliberate faults reported `failed`. The 51 cases v1.5 had keep the expected and observed status
of v1.5's run (`evidence/n05/selftest/`); `cases.ts` only adds the two new ones. Every result
reports pack `v1.6` and version `1.6.0`. Unit tests: 56, which is v1.5's 48 plus one adapter test
and the seven of `test/signin.test.ts`. Integration tests: 3.

```sh
node selftest/run.ts --out <scratch> --pubsub-emulator 127.0.0.1:47685 --toxiproxy http://127.0.0.1:47674
node selftest/run.ts --out <scratch> --cases signin-lockout,signin-mapped-identifier   # proofs, scratch copies
```

The proof copies (scratch, not kept) hold the final v1.6 oracle with v1.5's files dropped in:
`v15-driver` replaces only `src/client/session.ts`; `v15-oracle` replaces `src/` and
`adapter.schema.json` and changes one line of its `selftest/run.ts` (above). Both link the v1.6
install's `node_modules/` and hold a copy of the frozen name list so the runner loads.

## What this shows, and what it does not

It shows these things:
- a v1.5 local adapter still validates and signs in with the fixed names;
- a staging-shaped adapter validates with mapped email identifiers and a password command, and an
  account it leaves out is `blocked`, not `failed`;
- the driver posts a login form once at most, gives the refusal as its reason, retries only
  before the post, and the run does not post a refused account again;
- v1.5's driver posts a refused login 11 times and locks the account, and v1.5's fixed names fail
  on an email-only issuer;
- no other self-test case changed its result, and no password appears in any output.

It does not sign in on Auth0: the issuer is the double, and its lock after 3 refused posts stands
in for Auth0's 10. It does not drive a browser sign-in: U02, U05 and U08 stay live-arm rows, and
their sign-in submits once per call and checks the run's refusals first, but cannot itself tell a
refused browser login from a slow one. The pack manifest and its verification cannot be inside
the pack they hash; they are recorded in the N06 handoff entry and `docs/benchmarks/status.json`.

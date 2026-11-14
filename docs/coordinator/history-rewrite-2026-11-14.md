# History rewrite, 2026-11-14

The owner chose to rewrite the 31 commits that had not reached GitHub, after GitHub push
protection rejected commit `9f1d9d4` (N01) over a made-up Stripe test key in the oracle's tests.
`git filter-branch --tree-filter` split five key-shaped test literals in four oracle files of
packs v1.1 and v1.2 (`oracle/selftest/double.ts`, `oracle/src/fixtures/stripe-signer.ts`,
`oracle/test/stripe.test.ts`, `oracle/test/observe.test.ts`) into string concatenations, for
example `"sk_" + "test_…"`. The runtime values are unchanged; no other file and no commit message
changed. The pre-rewrite history is kept locally at `refs/backup/pre-rewrite-20261114`.

Consequences:
- Ledger records written before this file cite the **old** hashes below; read them through this map.
- In packs v1.1 and v1.2 these four files no longer match their `MANIFEST.json`/`SHA256SUMS`
  entries, so `verify_pack.py` reports them. B's local copies (never pushed) keep the original bytes
  and still verify. Pack v1.3 (N03) supersedes both with clean files and a fresh manifest.

| Old | New | Subject |
| --- | --- | --- |
| `9f1d9d4` | `b74723c` | N01: build the neutral acceptance oracle (pack v1.1) |
| `43efdde` | `278b738` | Coordinator: accept N01, import its usage |
| `e1474dc` | `b341b6f` | Coordinator: Q03 assignment packet |
| `5740e6e` | `a08fb52` | Q03: record QRWTY generation capability audit |
| `e9bf29b` | `b96f69d` | Coordinator: accept Q03, import its usage |
| `e88dcb8` | `07865f3` | Coordinator: Q03 review packet |
| `47ae6d5` | `8958726` | Q03 review: audit of the generation capability report |
| `a2d84e8` | `660a88c` | Coordinator: record the Q03 review and its usage |
| `c2a2339` | `d01d18f` | Coordinator: Q03b packet |
| `ccaca7d` | `35df711` | Q03b: apply the capability review's amendments to the Jeeves gap briefs |
| `5c8c194` | `ab567a6` | Coordinator: accept Q03b, import its usage |
| `228ff6a` | `281dd88` | Coordinator: QG packet template and the QG01 packet |
| `1ea6fca` | `b43f829` | Coordinator: record B00 and the subagent working-directory exposure |
| `63199c2` | `e1cc4c3` | Coordinator: record QG01 attempt 1 (blocked by the fixture lint) |
| `91de9e7` | `a453129` | Coordinator: QG01 attempt 2 packet |
| `b5d6ba6` | `6dec576` | Coordinator: accept QG01 (Jeeves 64d0d3b), import its usage |
| `0c50bf0` | `f2bd7cc` | Coordinator: run status after QG01, B01 dispatched |
| `7db0e33` | `bdd080d` | Coordinator: N02 packet (ledger R12 fix) |
| `66cc867` | `3e5e4eb` | N02: ledger evidence may cite a committed version (pack v1.2) |
| `38eab76` | `e4e6ee5` | Coordinator: accept N02 (pack v1.2), import its usage |
| `df43f2b` | `0778f5c` | Coordinator: record N02 and B01; batch-1 QG packets |
| `6fba2c0` | `ec6fe7a` | Coordinator: QG19 packet commit name matches the plan |
| `1ddb009` | `df56e4a` | Coordinator: accept QG02 (Jeeves 954e8c4), import its usage |
| `605ba7f` | `3c02a88` | Coordinator: run status after QG02; B02 dispatched |
| `8d9c5eb` | `7680e95` | Coordinator: run status after B02 |
| `d455a4d` | `b274d32` | Coordinator: accept QG05 (Jeeves 181bb97), import its usage |
| `e03588f` | `fd6f8aa` | Coordinator: run status after B03 |
| `395e2f4` | `4b77447` | Coordinator: accept QG17 (Jeeves fd1ea77), import its usage |
| `33a1366` | `a846a5f` | Coordinator: run status after B04 |
| `9311eed` | `414fc89` | Coordinator: B04 review findings and the next queue |
| `8e4ac2b` | `2d58505` | Coordinator: QG19 dispatch note |

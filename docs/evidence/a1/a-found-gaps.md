# A-found gaps from A1 (Jeeves 0aea8e7)

A1 regenerated arm A's export from Jeeves `0aea8e7` and adapted Q06's code to the new contracts
([checks](checks.md)). No generated file was edited: `infra/local/verify-generated.py app` reports
71 generated files unchanged. Each gap below has a workaround in application files. Following the
owner's decision of 2026-11-15 evening, these gaps are recorded, not fixed.

| ID | Severity | Gap | Where | Workaround in A |
| --- | --- | --- | --- | --- |
| AG-18 | Medium | `idempotent()` stores the 2xx answer as plain JSON, so a create whose replay must return a one-time secret can't use it | `src/runtime/idempotency.ts`, `050-jeeves-idempotency.sql` (`response jsonb`) | Q06's own idempotency in product SQL, unchanged: only the claim proof's hash, with the replay copy sealed (`replay-seal.ts`) |
| AG-19 | Low | Setting kinds have no enumeration or application check | `src/runtime/settings.ts` | `link-operations/settings.ts` `checked()`: a generated kind with the application's check added to its `parse` |
| AG-20 | Low (tooling) | `update:v2` names no path it creates, replaces, keeps or leaves unchanged; it gives only their counts | `jeeves-generator/src/v2/update-cli.ts`, `src/update.ts` | `commands/plan-actions.mts` calls `planUpdate` with the same inputs |
| AG-21 | Low (docs) | The stub template's settings comment says secrets come "from SECRET_DIR files" and doesn't mention `JEEVES_SECRET_<NAME>_FILE` | every stub's `settings` comment | None needed; `settings.ts` and the README are right |

## AG-18: `idempotent()` can't hold a secret

QL04's `idempotent({ scope, key, hash }, fn)` stores fn's 200–299 answer, `{ status, body }`, in
`jeeves.idempotency_records.response` (`jsonb`) for 24 hours and replays it. QRWTY's guest create
answers with a one-time claim proof. The product contract says a replay returns that proof, and the
database never holds it in plaintext. With the helper, the proof would sit in clear in the table for
a day. So Link operations keeps Q06's own record. It stores only the proof's SHA-256, plus a replay
copy sealed with AES-256-GCM under the `link-replay-keys` ring and bound to the link. It also keeps
its single-call SQL function (`create_guest_link`). A1 adopted neither `transaction` nor
`idempotent`: neither would remove code. Any create that returns a one-time secret (an API key, a
claim or invite token) hits the same limit.

Fix idea: let a stub seal what is stored and open what is replayed (a `seal`/`open` pair, or a
`keyRing()` setting the helper uses itself). Or store a stub-chosen replay body that differs from
the answer, with the secret re-derived from sealed data.

## AG-19: no enumeration or application check for a setting

QL05's kinds are `text()`, `integer()`, `url()`, `secret()` and `keyRing()`, each with `optional()`.
Link operations needs four checks that the configuration pass must run, so that a bad value fails
startup:

- `QRWTY_TEST_HOOKS` is `on` or unset;
- `QRWTY_REPUTATION_CREDENTIALS` is `metadata` or unset;
- `QRWTY_PUBLIC_ORIGIN_URL` is an origin only (`url()` accepts a path, and parses away a trailing
  `/`);
- `link-replay-keys` is Q06's `<kid> <32 bytes>` line format. `keyRing()` is JSON and allows longer
  keys, while AES-256 needs exactly 32 bytes.

The workaround is `checked(kind, check)`, which returns `{ ...kind, parse: raw => check(kind.parse(raw)) }`.
It works because `readSettings` calls `parse` and replaces any error with `Invalid setting <NAME>`.
But it builds a `Setting` by hand from the exported type, which the generated code doesn't describe.
Fix idea: a documented `oneOf("a", "b")` and `check(kind, fn)` (or `custom(kind, parse)`).

## AG-20: an update names its file actions only as counts

`update:v2` prints `counts` for create, replace, unchanged and keep, and lists paths only for
`keepChanged`, `override`, `remove` and `orphan`. A record of which generated files an update
rewrote needs the full plan. `planUpdate` already computes it (`records/update-actions.tsv` came
from calling it directly). Fix idea: print `actions` with the result, or under a flag.

## AG-21: the stub's settings comment predates QG34

Each new stub's comment reads: "Values come from the process environment, secrets from SECRET_DIR
files." `readSettings` reads a `secret()` or `keyRing()` from `JEEVES_SECRET_<NAME>_FILE` first
(QG34), as the README says. A1's production profile uses only that variable. The comment is in
generated text, and each stub keeps it as written.

## Earlier gaps, as seen at 0aea8e7

- **AG-03** (one credential directory): closed by QG34. The production preflight no longer links the
  Cloud Run secret volumes into one directory. Each process gets `JEEVES_SECRET_<NAME>_FILE` for
  each of its credentials.
- **AG-09** (two files ending with a blank line): gone in the new `Dockerfile` and
  `src/features/service-resources.ts`.
- **AG-10** (a stub has no declared configuration): closed by QL05. Link operations declares its four
  settings, and Link API's configuration pass reads them before any client.
- **AG-04** (Memorystore `AUTH_DISABLED`) still holds. The generated cache client still reads a
  credential file, so the IaC points the cache's file variable at `/dev/null`, an empty credential.
  It used to be an empty file the preflight wrote.
- **AG-05** (Pub/Sub names compiled, without the `qrwtya-` prefix) still holds. QG28 changed the
  names to `click-events--analytics-worker--analytics-worker-click-aggregator` (and `.failed`);
  `infra/gcp/locals.tf` follows them.
- **AG-13 to AG-16:** the new README describes no workload identity, ID token, health path or
  regional Pub/Sub endpoint, so Q13's workarounds stay (`google-credentials.ts` among them). AG-17
  was not checked.

# Q06 checks: durable guest link creation

Arm A, Q06, attempt 1 (ledger `a-4056`, role implementer, phase backend), run `qrwty-r1-20261114`.
QRWTY started at `8c8edd4`; main moved to `678c199` during the unit (the coordinator's commits
`5065dde`, which also carried this attempt's start record `a-4056`, `5a5bb23` and `678c199`; the
second adds the owner decisions of 2026-11-15, which stop A after Q06 and one live deploy). Started 2026-11-15T08:38:56Z; a usage
limit paused the session after the reading phase and before anything ran (nothing was lost or
left running; resumed with no `qrwtya*` resource present). Generator: Jeeves **`4e87f97`** only,
read with `git show` (`source-loc.ts` exports) and `git archive` through `tools/loc/setup.sh` (its
`docs/` left out); nothing in the Jeeves checkout was written or run. Pack v1.6 from a scratch copy
(`verify_pack.py` OK, manifest `1250b854…fc579`). Node 24.21.0, pnpm 12.16.1, Python 3.12.3,
PostgreSQL 17.11 (the export's image), Vitest 5.0.0 and Biome 2.6.4 (pack pins, from the local store).
No cloud, Auth0, Cloudflare or Stripe call; `~/.config/qrwty/` not read; arm B not read.

The commands are in [q06-checks.sh](commands/q06-checks.sh); every duration is from
`/proc/uptime` or `performance.now()`.

## 1. Step 0 (Q05 review)

| Item | Change | Check | Result |
| --- | --- | --- | --- |
| Q05c | `tools/loc/setup.sh` refuses any Node but `pins.json`'s before it installs; `verify-runner.sh` runs a one-line `codeLines` smoke through the copy's own loader after the pin checks; README note | `setup.sh` under Node 18.19.1 | `refused: node v18.19.1, pinned v24.21.0`, exit 1, nothing created |
| | | `setup.sh` under 24.21.0 | 1.8 s, `verified: true, parserSmoke: ok` |
| | | the same copy with `@rolldown/binding-linux-x64-gnu@1.2.15` removed | `runner is not usable: the parser does not load; rebuild the copy under the pinned Node: Cannot find native binding`, exit 1 ([log](logs/q05c-broken.txt)) |
| | | the new runner on `33d50e9` | `source-loc-v2.json` and `summary.json` **byte-identical** to `docs/evidence/q05/loc/` |
| Q05d | Root `README.md`: status paragraph (baseline `33d50e9`, revision 84, Jeeves `4e87f97`, pack v1.6, not deployed), live sites (qrwty.io placeholder; `b.qrwty.io` live for arm B), one skin (owner decisions §11), the measured table (G0 2,926 = 2,871 + 55, R/C/D/B at the baseline, template share 100% by definition, UI 0), pack links to v1.6 | Diagram section unchanged (Detailed view embedded) | `git diff README.md` touches only the status, live-site, UI-brief and measurement lines |

## 2. What Q06 implements

**Link API's link operations, `POST /modules/link-api-link-operations/links`** (the internal route
Session API forwards `POST /api/v1/links` to in Q07), answering as http-contract §4 says:

- **Request.** `Idempotency-Key` (1–255 visible ASCII, else 400 `idempotency_key_required`); a
  guest carries `QRWTY-Guest-Scope`, an opaque handle Session API derives from the server-issued
  guest session (else 400 `invalid_request`); a verified bearer is an account (the generated
  Optional guard: a bad token is 401, never a guest). Body `{destination, expiresAt?}` only.
- **Destination** (`destination.ts`): absolute http(s) only; no credentials, controls (C0, DEL,
  C1), lone surrogates, spaces or non-ASCII after the host; port 1–65535 without a leading zero;
  IPv4 only as four decimal numbers and public (RFC 6890 blocks); IPv6 only global unicast minus
  documentation, 6to4 and IETF blocks, no zone; no `localhost`, `*.localhost`, `*.local`,
  `*.internal`, `*.home.arpa` or single-label name; no host equal to the public origin's; ≤ 8,192
  bytes before and after. Normalization is only scheme and host lower-case, default port removed,
  IDN to A-label (`domainToASCII`, then the host is checked again, so `１２７.０.０.１` is refused);
  path, query and fragment are kept byte for byte (no WHATWG re-serialization). 400
  `invalid_destination` with a `reason`.
- **Order.** Validation; an existing idempotency record is replayed (same request) or 409
  `idempotency_conflict` (another request) before any other work; the Web Risk check (422
  `reputation_rejected`; 503 `reputation_unavailable`, `Retry-After: 5`, 500 ms deadline, 64 KiB
  answer bound); then up to 1 + 5 slug candidates, each one database call; 503
  `slug_allocation_failed` after that. Any database error is 503 `storage_unavailable` with
  `Retry-After: 1`: never a success. Signed-in (owned) create is 503 `entitlement_unavailable`
  (`Retry-After: 30`) until Billing API's entitlement grant exists (Q10b): it fails closed.
- **201** `{id, shortUrl, destination, version: 1, state: "active", createdAt, updatedAt,
  expiresAt, owned: false, claim: {token, expiresAt}}`, `ETag: "1"`; a replay adds
  `Idempotent-Replayed: true` and is otherwise the same status and body, proof included.
- **Slugs** (`slug.ts`): 10 base62 characters from `randomBytes` with rejection sampling (bytes ≥
  248 dropped), never a reserved path; the database also checks the format and the reserved list.
- **Claim proof**: 32 random bytes (base64url, 43 characters); only its SHA-256 is stored
  (`link_claims`, unique), 24 hours from creation. The replay copy is sealed with AES-256-GCM
  under a rotated key ring (`link-replay-keys`, first line seals, all open), bound to the link ID
  as associated data (`replay-seal.ts`); the database never holds the key.
- **Product SQL** (`infra/postgres/links/modules/link-api-link-operations.sql`, the supported
  path: `applyProductSql` at every start): a migration sequence (`product_migrations`, step 1),
  tables `domains`, `links`, `link_versions`, `link_claims`, `idempotency_records`; triggers for
  tombstones and versions (AG-12); `create_guest_link` (one call = one transaction: the
  idempotency record first, so a same-key racer waits and replays; a taken slug rolls all back),
  `find_idempotent`, a bounded purge of expired records (≤ 16 per create, `SKIP LOCKED`); and the
  routing view `published.link_routes` (no owner, claim or idempotency data; a destination only
  while active) for the Redirect service (Q08).
- **Test profile only**: `QRWTY_TEST_HOOKS=on` opens `/__test/fault-points`
  (`force-slug-collision`) and `/__test/clock` on each Link API copy; the oracle's `faultPoint`
  command sets every copy. The production preflight refuses `QRWTY_TEST_*` (R01 `test-hooks`).
- **State diagram**: [link-states.excalidraw](../../architecture/link-states.excalidraw) with
  [PNG](../../architecture/link-states.png) (and SVG), active / disabled / blocked / deleted, from
  [render-link-states.mjs](commands/render-link-states.mjs). The PNG is drawn from the same
  element list by Chromium (Playwright 1.63.0 from the pack copy), not by Excalidraw's exporter.

**Configuration** (AG-10): `QRWTY_PUBLIC_ORIGIN_URL` (the origin itself; locally
`http://127.0.0.1:47201`) and the `link-replay-keys` credential, read when Link API loads its
module; both added to `compose.override.yaml` (from `QRWTY_LOCAL_APP_SECRET_DIR`,
`infra/local/app-secrets.sh`) and to the production profile. Q04's overlay was installed into
`app/` with `infra/local/install-overlay.py app infra/app-overlay` (three files, all
`not-in-manifest`); `infra/app-overlay/` stays the source and `app/`'s copies equal it.

**Not here** (later units): Session API's `/api/v1` facade, guest session and CSRF (Q07); claim,
owned list, edit, disable and delete (Q07); the Redirect service and the trusted edge (Q08); guest
admission (Q09, its seam is marked in `create.ts`); entitlements and owned creation (Q10b); the live
Web Risk credential (Q12a; Link API sends none, so production creation answers 503 until then); the
`link-replay-keys` secret in `infra/gcp` (Q12a/Q13).

## 3. Tests

| Suite | What | Result |
| --- | --- | --- |
| Unit (`pnpm --dir app test`, offline: no Docker, no network) | A09's whole corpus plus 36 more destination tests; slug format, uniformity, rejection sampling, reserved paths, the candidate bound; key, scope and request hashing; the sealed replay (round trip, wrong link, altered byte, rotation, bad key rings); the create route on an in-memory store (order, replay before reputation, 409, scoping, every error code, forced collision, 6-attempt bound, owned 503, hooks closed); the Web Risk adapter (query, verdicts, bounds, deadline); startup configuration | **118 passed** in 5 files ([log](logs/unit.log)) |
| Integration (`pnpm --dir app test:integration`, disposable PostgreSQL 17.11 `qrwtya-q06-testpg` on 127.0.0.1:47241, migrated with the export's own `applyProductSql`/`grantProductSql`) | Migration re-runnable (one recorded step after three runs); created/replay/conflict/collision/invalid-expiry outcomes; a collision writes nothing; the 24-hour window on the database clock; bounded purge (16 + own); tombstone, version and append-only triggers as the runtime login; reserved and format checks; Redirect and Account logins read only `published.link_routes`. Races through the real route on two pools (two "replicas"): **200 concurrent creates → 200 distinct slugs, each stored with its own destination**; **20 same-key requests → one link, one body, one proof**; **two bodies racing on one key → one winner everywhere, the rest 409, one link**; replay after both pools restart; forced collision → another slug, the existing link unchanged; 6 collisions → 503 `slug_allocation_failed`, nothing written; unreachable database → 503 | **20 passed** in 2 files ([log](logs/integration.log)) |
| Stack (`pnpm --dir app test:stack`): project `qrwtya-q06`, Q04's test profile, two copies of every process, each Link API copy in its own container, `verify-full` TLS to PostgreSQL and Valkey, the pack's own Web Risk fixture (`startWebRisk` from the pack copy) | Create over TLS (every `r_links__link_api` connection `ssl = t`); A02 at Link API (same key on both copies → one link and body, restart both containers → same body, changed body 409, no key 400); A03 at Link API (200 concurrent creates over both copies → 200 distinct slugs, each in `published.link_routes` with its own destination; `force-slug-collision` through the adapter's `faultPoint` command on both copies → 201 with another slug on each, the existing route unchanged); A09 at Link API (every accepted corpus entry stored byte for byte, every rejected one 400 `invalid_destination`, unsafe 422, slow and error 503 with `Retry-After: 5` in under 1 s and nothing stored, spoofed `x-user-id`/`X-Forwarded-For` change nothing, a bad bearer 401, 405 with `Allow`) | **9 passed** ([log](logs/stack.log); the final run is on a second, fresh stack, `first-run` 92 s, after one test literal was rewritten to be built at run time) |
| Ordinary build (R01's `ordinaryBuildAndTest`, now with lint and the unit tests) | `tsc`, test `tsc`, Biome, Vitest unit, `verify-generated.py`, preflight syntax and empty-environment refusal, with an empty `HOME` | `{"ok": true}` |

The first stack attempt answered `503 reputation_unavailable` while no Web Risk fixture was running:
creation fails closed when the scanner is unreachable (kept as observed, not an error). After every
stack and oracle run the Links database held 651 links with 651 distinct slugs, and exactly one
version row, one claim proof and one idempotency record each ([counts](records/stack-db-counts.txt));
the two Link API containers logged only start-up lines and seven `reputation check` failures (the
fixture's 500s, its slow path's deadline, the fixture not yet running), never a destination or a
proof ([log](logs/link-api-containers.log)).

## 4. Oracle (pack v1.6)

`node src/cli.ts run --adapter docs/evidence/q06/oracle/oracle-adapter.json --rows
A02,A03,A09,F07,R01,R02,R03 --scope local --no-reset` from the scratch pack copy; the adapter
validates ([record](oracle/validate-adapter.json)) and now declares `faultPoint`
(`force-slug-collision`), `providers.webRisk` (`172.17.0.1:47212`, deadline 500 ms) and the R01
setting `test-hooks`. First run: [results](oracle/results/summary.md); final rerun after the
ordinary-build change: [results-final](oracle/results-final/summary.md). The adapter's `commit` is
`5065dde` (HEAD while testing); the tested tree is this unit's `app/` (the stack copy equals it:
`diff -r` of `src`, `infra`, `scripts` and every manifest file).

| Row | Oracle status | Reported | Why |
| --- | --- | --- | --- |
| A02 | failed (1/6 checks) | **blocked** (needs Q07) | `GET /api/v1/session` and `POST /api/v1/links` are 404 on the session replicas: Session API's `/api/v1` facade, guest session and CSRF are Q07's. Link API's side of A02 passes in the stack and integration tests above |
| A03 | blocked | **blocked** (needs Q07, Q08) | `ORACLE_EDGE_TOKEN` unset: A has no trusted edge yet (Q08/Q09); it also creates through `/api/v1/links` (Q07) and follows `/{slug}` (Redirect, Q08). The adapter's `force-slug-collision` works (stack test) |
| A09 | failed (0/15 checks) | **blocked** (needs Q07, Q08) | Every create through `/api/v1/links` is 404 (Q07), and its Location, HEAD, 405, Host and query checks are the Redirect service's (Q08). The destination corpus, reputation verdicts and spoofed headers pass at Link API (unit and stack tests) |
| F07 | blocked | **blocked** (needs Q07, Q10a/Q10b) | The adapter has no identity section (A05, A07: Q07) and no Stripe binding (A22: Q10a/b). Each replica is in its own container; the A02 race across them passes at Link API |
| R01 | passed | **passed** | Every forbidden start refused with a named reason (now with `test-hooks`, refused by the preflight); every category declared; the ordinary build and tests pass without credentials |
| R02 | passed | **passed** | Six stand-ins listed ([limitations](limitations.json), the Web Risk item updated: now exercised) |
| R03 | failed (41/42) | **failed, unchanged since Q04** (the failing check needs Q07) | Drain, start, restart and liveness of all 10 HTTP copies and bounded connections pass; "session shared through external state" creates through `/api/v1/links` (404 until Q07), as in Q04 |

Under the owner decisions of 2026-11-15 Q07–Q10b will not run, so the four blocked rows stay
blocked and R03's session check stays failed in this run.

The final rerun gave the same status and the same failing checks for every row as the first run;
its R01 ordinary build now ran Biome and the 118 unit tests (1,234 ms against 411 ms in the first
run, exit 0).

`clear-route-caches` and `admissionBound` were not added: no row this unit runs needs them (F01
and F06 are Q08's).

Production profile, by hand: Link, Session, Account and Billing API start ready under the
production profile (`profile-check.mjs check <p> none none profile`), Link API now with
`QRWTY_PUBLIC_ORIGIN_URL` and `link-replay-keys`; `QRWTY_TEST_HOOKS=on` is refused by the preflight
(`test-hook: QRWTY_TEST_HOOKS: test-only hook`) and, as expected, not by the generated runtime alone.

## 5. Measurement (source-loc-v2, backend only, UI excluded)

`bash tools/loc/source-loc.sh .scratch/Q06/loc-runner 33d50e9 <commit> <out>` with the Q05c
runner. Before committing, the count ran on a scratch clone's commit whose `app/` and `tools/` are
this unit's (the CLI reads only Git objects of `app/` and the scope file); [loc/](loc/summary.json)
holds it. The handoff records the rerun on the unit commit itself.

| Measure | Value |
| --- | ---: |
| G0 (baseline backend) | 2,926 (scaffolding 2,871 + stub bodies 55) |
| R (retained generated) | 2,925 |
| C (written after generation) | 720 |
| D (removed or replaced) | 1 (the link-operations stub's `throw`) |
| B (final backend) | 3,645 |
| Template share | **80.25%** (R + C = B and G0 − R = D hold) |
| UI | 0 (`web/` absent) |
| Product SQL | 411 lines in 8 files (support, not backend) |
| Tests and their config | 1,675 TS lines and 15 JSON lines, in the support category `other` (source-loc-v2 marks paths outside `src/` first; noted in [gaps](a-found-gaps.md)) |

Open work after Q06: 10 of 11 stubs unwritten, 0 hooks.

## 6. Hygiene

- `verify-generated.py app`: all **64** generated files at their manifest hashes; application
  files changed: the link-operations stub body, its product SQL, `package.json` and
  `pnpm-lock.yaml` (Vitest 5.0.0 and Biome 2.6.4, dev only) ([record](records/verify-generated.json)).
- Root `pnpm build`, `pnpm typecheck`, `pnpm check`; `app` build, test typecheck and Biome: exit 0
  ([log](logs/root-build-check.log), [log](logs/app-build-lint.log)). `open-work` still lists Link
  API's two routes from the static report; the link-operations route answers.
- Formatting: new files are Biome 2.6.4 at line width 100 (`app/biome.json` covers only them and
  the tests); generated files and the stub file's generated lines were not reformatted.
- Secret scan and `git diff --check`: in the handoff entry.
- Docker: `qrwtya-q06` (18 containers, its network and three volumes; brought up twice),
  `qrwtya-q06-rehearsal`, `qrwtya-q06-testpg` and the image `qrwtya-q06-app` (twice), all removed
  by exact name; no prune; nothing of arm B's or Jeeves's touched ([teardown record](records/teardown.txt)).
- Secret scan ([record](records/secret-scan.json)): 80 unit files, 93 credential values of this run;
  the only hits are the pack's own A09 input (a URL with a user and password) echoed in the two
  oracle `results.jsonl`. The first stack's generated credentials were deleted with its private
  runtime before the scan, so only its shapes, not its values, are checked; no recorded command
  prints a credential (the oracle and tests never read them, and `profile-check.mjs` copies them
  into throwaway mounts it deletes).

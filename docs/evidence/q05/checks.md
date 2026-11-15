# Q05 checks: QRWTY's frozen generated baseline

Arm A, Q05, attempt 1 (ledger `a-3636`, role implementer, phase generation-baseline), run
`qrwty-r1-20261114`. QRWTY started at `e17df9c`; main moved to `2e1752b` during the unit (the
coordinator's commit, which also carried this attempt's start record `a-3636`). Started 2026-11-15T07:45:57Z. Generator: Jeeves
**`4e87f97`** (QGR2) only, from `git archive` into `.scratch/Q05/jeeves` with its own offline
install (`pnpm install --frozen-lockfile --offline --ignore-scripts`, exit 0, 265 packages, 0
downloaded); `docs/plans/qrwty-lessons/` was deleted from it unread. Nothing in the Jeeves checkout
was written or run (only `git archive`, `git show`, `git diff` and `git log` reads). Pack v1.6.
Node 24.21.0, pnpm 12.16.1, Python 3.12.3, Docker 29.9.1, Compose 5.6.0, Chromium 153.0.8010.12
(`@playwright/test` 1.63.0 from the frozen copy).

The baseline is `app/` in the commit **`Q05: freeze QRWTY generated baseline`**. Its full hash
can't be inside itself; the follow-up commit records it, **`33d50e9c693b4d8d60d723e0de75b79f3570da64`**,
in [baseline.json](baseline.json) with the LOC report run on it ([loc/](loc/summary.json)).

## 1. The new revision: 84

| Item | Value |
| --- | --- |
| Project | **QRWTY · production candidate v1**, `d1e59607-0616-418d-83d5-4cfe5bcb4b11`, owner's `jeeves` database through the dev API on 127.0.0.1:4310 (not restarted) |
| Revision | 83 → **84**, saved 2026-11-15T07:53:01.637Z, operation 7037 |
| The change | Click events (Queue) **Provider: Unspecified → Google Cloud**. The only other difference in the design is its `revision` field ([record](records/save-record.json)) |
| How | Q01's path: `buildSupportedAuthoringCommand(design, {type: "edit", element: "click-events", settings: {kind: "queue", mode: "work-queue", provider: "google-cloud"}}, installed)` from `@jeeves/spec` at `4e87f97`, then `POST /projects/<id>/operations {baseRevision: 83, ops, source: "api"}`: 200. The batch was built and applied in memory first: no refusal, no export blocker, and the in-memory result's canonical hash equals the saved one ([plan](records/plan-revision.json), [commands](commands/plan-revision.mts), [save](commands/save-revision.mjs)) |
| Source | canonical SHA-256 **`4fbcd311992737c402d22d28415765b598f806c1c01a35ead81eb5ec6d3b024d`** (27,842 bytes) = `GET /design` = the studio's "Download source JSON" re-canonicalised = `app/.jeeves/inputs/design.json`. Pretty download: [source JSON](jeeves/QRWTY-production-candidate-v1-r84-source.json) |
| Blueprint | [v3](jeeves/blueprint-v3-r84.json) (differs from r83's only in `revision`, the provider in two places and one hash); v2 refuses (422, [kept](jeeves/blueprint-v2-refusal-r84.json)) |
| Renders | By mouse in fresh browser contexts: [Detailed](jeeves/QRWTY-production-candidate-v1-r84-detailed.png) and [Simple](jeeves/QRWTY-production-candidate-v1-r84.png) PNGs and their capture files. **Both PNGs are byte-identical to revision 83's** (`826a9efb…f965`, `5384d218…473b`): a queue's provider is not drawn |
| Provenance | [provenance.json](jeeves/provenance.json): generation by Jeeves `4e87f97`; saving and renders by the owner's studio at Jeeves HEAD `79ecb96` with uncommitted generator changes (section 3) |
| Other projects | 20 before and after; only this one changed (revision and `updatedAt`). The project stayed at 84 through every mouse step ([mouse record](records/mouse-record.json)) |
| By mouse | Click events selected in a fresh context: Inspector → Options → **Provider: Google Cloud** (options Unspecified, Self-hosted, Google Cloud) ([screenshot](screenshots/02-click-events-provider.png)); the project reopened with 19 nodes, 35 lines Detailed and 27 Simple, no page errors |
| Q02's as-found artifacts | Unchanged: `docs/evidence/q01/`, `q02/` (ZIP, manifests) are not touched |

**Other diagram changes considered.** Every normal generation control of the design was listed
before and after, under the studio's installed support and the frozen registry's (they are equal):
15 controls, the same 15 before and after (3 Sign-in, 11 process limits, 1 queue Provider). The
Provider is the only control a QG fix added (QG07). QG01, QG04, QG06, QG10, QG11, QG12, QG17–QG20
and QG21–QG25 change generated code or deployment settings, not diagram choices. So **no other
change was made.** Not changed, for a later authorized revision or unit:

- **Click events' description** still says "Production transport is GCP Pub/Sub, pending G12; the
  local export uses the installed broker." It is text in the design (only in
  `.jeeves/inputs/design.json`; no generated file carries it). Saving it would be a second change
  outside this packet's rule.
- **Billing API's Entitlements** (Q03's note, G08): moving it to an internal tile is not a choice a
  QG fix made supported (QG15 is deferred); QRWTY's own edge keeps it unreachable from the Internet.
- **Redirect service's Request timeout** stays the fixed 1000 ms, below the Pub/Sub publisher's
  2000 ms settle bound; a slow ACK then answers 503 `DEADLINE` (QGR2 finding 2). It is an existing
  control, not a QG fix; Q08 decides.

## 2. The export: `app/`

| Step | Result |
| --- | --- |
| Input | The canonical r84 bytes (`4fbcd311…024d`), so the export's `.jeeves/inputs/design.json` and the manifest's input hash equal the server's (Q02's finding) |
| Command | `bash docs/evidence/q05/commands/export-app.sh <frozen copy> <canonical r84> /home/ash/github/qrwty/app` = `pnpm --filter @jeeves/generator export:v2 …` at `4e87f97`, from the frozen copy: exit 0, 1.1 s, 2026-11-15T07:56:23Z: `files: 87, applicationComplete: false, findings: 0, requiredGaps: 11` ([log](records/logs/export-app.log)) |
| Refuses an existing `app/` | The script refuses first (`refused: …/app exists`, exit 1, [log](records/logs/export-app-refuse.log)); the CLI itself refuses an existing directory (`EEXIST`, exit 1, nothing written, [log](records/logs/cli-export-refuse-existing.log)) |
| Deterministic | Two more fresh exports into new scratch directories: identical to each other and to `app/` (`diff -r`, and every path and SHA-256) |
| Payload | 87 files, manifest SHA-256 **`c4c33e264d6b2a63e38ef87de22e441c2ec251e1dff554580e16e45ceb87daff`**; 61 generated-scaffold, 22 generated-extension (11 stub bodies, 8 product SQL files, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`), 3 generator-metadata plus the manifest. Registry `46f9cb0b…c09c`, generator `jeeves-v2` 0.1.0-experimental.1, runtime `local-runtime` 0.1.0 |
| Click events | A Pub/Sub topic `click-events`; Redirect service publishes; Analytics worker consumes `click-events--analytics-worker` (dead letter `….failed`); emulator `local-pubsub` and `setup-pubsub` locally; no `local-broker` |
| Untouched | Nothing in `app/` was edited. `pnpm app:install`, `build`, `typecheck` and `check` left every payload file's SHA-256 as exported (only the ignored `node_modules/` and `dist/` appeared) |

**M01: pass** ([m01.json](records/m01.json), [script](commands/m01.py)): the input equals the
canonical `GET /design` bytes; the manifest's input hashes equal them; every manifest-listed file
is present with its recorded SHA-256 and every payload file is listed (except the manifest itself);
all **165** generator source files the manifest names equal their blobs at `4e87f97`; a second
fresh CLI export is identical; the studio export has the same 87 paths, the same input bytes and
the same 14 template selections, and its preview's manifest hash equals its ZIP's.

## 3. Studio export compared with the frozen CLI

The studio (by mouse: Generate project → Preview scaffold → Download project ZIP, 07:54:06Z,
`a837fdc8…930e`, 87 files, `experimental-partial`, Runnable processes on) runs Jeeves HEAD
`79ecb96`, and its API server (`tsx watch`) also served **uncommitted** changes to 11 generator
files in the checkout, an in-progress Jeeves unit. 73 files are identical; 14 differ. Each
difference is explained by exporting the same source at each later commit in a scratch copy and
then with the checkout's uncommitted diff ([attribution.json](records/attribution.json),
[script](commands/attribution.sh), [file diffs](records/studio-vs-cli.diff)):

| Files that differ | Explained by | What changed |
| --- | --- | --- |
| `src/runtime/http.ts` | `39a20be` QG21 | The fallback 503 for a dependency's or stub's own error sets `Retry-After: 1` unless the route set one |
| `scripts/bootstrap.mjs`, `scripts/setup.mjs` | `1d42570` QG22 | Secret files `chmod` to their mode whatever the host umask |
| `README.md` (part) | `efbff72` QG23 | A sentence on starting a service of one's own from the override |
| `infra/edge/nginx.conf` | `79ecb96` QG25 | The edge's `@unavailable` 503 adds `Retry-After 1` |
| `src/processes/*.ts` (6), `src/runtime/module-clients.ts`, `README.md` (part) | **Uncommitted** (Jeeves working tree) | A URL with whitespace is refused; a cache's failed startup probe is logged, not fatal (comment); the README and report list `JEEVES_EXTERNAL_*_URL` per process |
| `.jeeves/manifest.json`, `.jeeves/report.json` | All of the above | Template and file hashes, sizes and the report rows that follow |

The frozen CLI's output equals the chain's start exactly. Every one of the 14 differences is in a
step above. The chain's end equals the studio export except one comment line in
`module-clients.ts` (and the two metadata files' hashes of it): the uncommitted tree changed
between the export (07:54:06Z) and the capture of its diff (07:55:00Z), or the server had not yet
reloaded that edit. **The frozen CLI's output is the baseline**; none of these later changes is in
`app/`.

## 4. No product code

`app/` is the untouched payload: its 11 stub bodies throw `Not implemented: <name>`, its 8 product
SQL files hold only their generated comments, it has no hook file and no UI (`web/` doesn't exist).
Q04's `infra/app-overlay/` (the application's own Compose test profile and production preflight)
is **not** copied into `app/` in this unit: its override needs a run-time CA directory
(`QRWTY_LOCAL_TLS_DIR`) for every start and doubles every process, so the unit that first runs
product code (Q06) installs it with `infra/local/install-overlay.py`, which refuses generated paths.

## 5. LOC runner

[`tools/loc/`](../../../tools/loc/README.md): `setup.sh` (git-archive copy of Jeeves `4e87f97`
without `docs/`, offline install), `verify-runner.sh` (every pinned file, the method document and
the installed Rolldown 1.2.15, zod 4.5.4, tsx 4.23.15 against [pins.json](../../../tools/loc/pins.json)),
`source-loc.sh` (Jeeves's unchanged `source-loc-cli.ts` with this repository as `repo`, `app` as
the application) and `summary.mts` (totals, identities, split, open work, support).

**Tool commit:** Jeeves `4e87f97bdc8ce590edd479e16308c892b9049554`; method document SHA-256
`c9b5106f…0076` (the pack's pin). **Command** (run from the QRWTY root):

```sh
bash tools/loc/source-loc.sh .scratch/Q05/jeeves <baseline> <baseline> docs/evidence/q05/loc
# = cd <qrwty> && <runner>/jeeves-generator/node_modules/.bin/tsx \
#     <runner>/jeeves-generator/src/source-loc-cli.ts app <baseline> <baseline> <scope from git show>
```

**Scope review** ([backend-scope.json](../../../tools/loc/backend-scope.json), JSON-content SHA-256
`8721e798…3a22`): every one of the 87 paths is classified. Counted: 45 files in `src/runtime`
(14), `src/processes` (6), `src/modules` (24: 11 stub bodies, 11 `.slots.ts`, `dependencies.ts`,
`entry.ts`) and `src/features` (1, `service-resources.ts`). `configurationPaths` (excluded as
`configuration-or-build`): `application-bindings.ts` and `local-bindings.ts`, one data constant
each, as in YouTube v3. Outside `src/`: 40 (`.jeeves/`, `diagnostics/`, `infra/` SQL, nginx and
`local.json`, `scripts/`, Compose, Dockerfile, package files, README). No UI path: the export has no
browser code.

**Baseline numbers** (backend only, UI excluded; source-loc-v2):

| Measure | LOC | Files |
| --- | ---: | ---: |
| **G0** (eligible generated baseline) | **2,926** | 45 |
| of which generated scaffolding (`generated-scaffold`) | 2,871 | 34 |
| of which stub bodies (`generated-extension`, unwritten) | 55 | 11 |
| By directory: `src/runtime` / `src/processes` / `src/modules` (scaffold) / `src/features` | 2,104 / 546 / 171 / 50 | 14 / 6 / 13 / 1 |
| **First template share** (baseline against itself: R = B = G0) | **100.00%** | |

R = 2,926, C = 0, D = 0, B = 2,926: R + C = B and G0 − R = D hold. The 100% is the definition at
the baseline, not an outcome: every stub still throws and every product route answers 501. The
first share that measures anything comes after Q06 writes product code.

**Reads Git objects, not the working tree** ([loc-proof](records/loc-proof/)): in a scratch clone
with the baseline committed, the runner's output on that commit was byte-identical (both files)
after appending code to `app/src/runtime/http.ts`, deleting a stub body, replacing
`app/.jeeves/manifest.json` with `{}`, adding an unclassified `app/src/extra/unclassified.ts` and
narrowing the working-tree scope to `src/runtime` (each would change or refuse the count if read).
Positive control: committing a one-line change to one stub body and running baseline → that commit
gave R 2,925, C 1, D 1, B 2,926, share 99.97%. The clone was deleted afterwards.

The report on the real baseline commit `33d50e9` is in the follow-up commit:
[source-loc-v2.json](loc/source-loc-v2.json) (the CLI's output, unchanged) and
[summary.json](loc/summary.json). Apart from the two commit hashes, both are identical to the trial
run's on the scratch clone.

## 6. Root commands

[`package.json`](../../../package.json) at the root (no dependencies; `app/` stays its own pnpm
project, so no generated package file changes): `app:install` (`pnpm --dir app install
--frozen-lockfile`), `build`, `typecheck` (`tsc --noEmit` in `app/`), `verify:generated` (Q04's
`verify-generated.py`), `open-work` ([tools/open-work.mjs](../../../tools/open-work.mjs)), `check`
(typecheck, verify:generated, open-work), `loc:setup`, `loc`, `ledger:validate`. pnpm 12 writes a
root `pnpm-lock.yaml` that pins only pnpm 12.16.1 itself (`packageManagerDependencies`); it is
committed so a root run doesn't leave it untracked. No lint or unit
test runner yet: the export emits none, and the product units add them with their code.

| Command | Exit | Time | Output |
| --- | --- | --- | --- |
| `pnpm app:install` | 0 | 0.7 s | 188 packages from the store, 0 downloaded, lock unchanged ([log](records/logs/root-app-install.log)) |
| `pnpm build` | 0 | 0.6 s | `tsc -p tsconfig.json`, no diagnostics, 47 `.js` files ([log](records/logs/root-build.log)) |
| `pnpm typecheck` | 0 | 0.5 s | no diagnostics ([log](records/logs/root-typecheck.log)) |
| `pnpm check` | 0 | 0.7 s | 64 generated files equal the manifest; 22 application files still as generated ([log](records/logs/root-check.log)) |

**Hook inventory: empty.** No `*.hooks.ts` file, and every process's report row has `hooks: []`
(no template on this design has hooks). Open work ([open-work.json](records/open-work.json)): 11
stub modules (10 routes, 1 loop), 11 required gaps, `applicationComplete: false`.

## 7. Diagnostic smoke

A scratch copy of `app/` (byte-equal payload) with a smoke-only `compose.override.yaml`
([generator](commands/smoke-override.py): `qrwty.arm=a` labels on all 14 services, and the two
External API base URLs that Billing API and Link API need to start, `http://127.0.0.1:9`, never
called). Project `qrwtya-q05`, loopback ports 47241–47243. `pnpm install --frozen-lockfile --offline`
then `pnpm first-run`: exit 0 in 152 s, **all 12 services healthy** ([log](records/smoke/first-run.log),
[ps](records/smoke/ps.txt)). [Probes](commands/smoke-probe.sh):

| Request | Answer |
| --- | --- |
| `/healthz` at the edge; Session, Billing and Redirect `/api/<tile>/healthz` | 200 ready |
| Link API, Account API through the edge | 404 (internal); 200 ready from inside the network |
| Redirect `GET` and `HEAD …/redirect-service-resolve-and-redirect/abc123` | **501** "Not implemented: Resolve and redirect" |
| Session API `…/session-api-sign-in-flow/login`, `POST …/session-api-api-forwarding/links` | **501** "Sign-in flow", **501** "API forwarding" |
| Billing API `POST …/customer-billing/checkout`, `POST …/payment-events`, `GET …/entitlements` | **501** "Customer billing", "Payment events", "Entitlements" |
| Link API (inside) `POST …/link-operations/links`, `POST …/abuse-and-moderation/reports` | **501** "Link operations", "Abuse and moderation" |
| Account API (inside), no token or `Bearer not-a-token` | 401 `SIGN_IN_REQUIRED` (Required guard, before the stubs) |
| Account API (inside) with a client-credentials token from the scratch Keycloak ([script](commands/smoke-token.mjs); `iss` = the export's issuer, `aud` includes `identity-web`) | `/me` 200 `signedIn: true`; **501** "My links", **501** "Link analytics" |
| Billing and Link API `…/sign-in/me`, no token | 200 `{"signedIn":false}` (Optional) |
| One Pub/Sub message on `click-events` (emulator) | The worker dead-lettered it: pulled from `click-events--analytics-worker.failed` with `x-terminal-code: NOT_IMPLEMENTED` |

So **exactly the 11 named stubs are unimplemented** (10 routes answer their named 501; the loop
dead-letters), and nothing else failed: the logs hold 11 `not-implemented` warnings, 11 `ok`
probes, 3 sign-in `started` lines and no error ([logs](records/smoke/app-logs.txt),
[probes](records/smoke/probe.jsonl), [token probes](records/smoke/probe-token.jsonl)). No
product-completion claim. Teardown by exact name ([script](commands/smoke-down.sh),
[log](records/smoke/down.log)): `pnpm stop`, `docker compose --profile '*' down --volumes
--remove-orphans`, `docker image rm qrwtya-q05-app:latest`, `.runtime/` deleted; afterwards no
container, volume, network or image named `qrwtya-q05` and no `qrwty.arm=a` container. No prune;
BuildKit cache layers remain.

## 8. M03

At the baseline: R + C = B (2,926 + 0 = 2,926) and G0 − R = D (2,926 − 2,926 = 0) hold; the scope
is reviewed (section 5); UI is counted independently: **0** (no UI path, no `web/`). Support for
`app/`, by `summary.mts` (JS/TS by the pinned parser; others nonblank physical lines, comments
kept):

| Support category | Files | Lines |
| --- | ---: | ---: |
| Scripts (`scripts/*.mjs`) | 10 | 716 |
| Product SQL (application-owned, comments only) | 8 | 125 |
| Generated SQL (`000-foundation.sql`) | 5 | 10 |
| Deployment config (Compose as one JSON line, Dockerfile, nginx, `infra/local.json`, `ffmpeg-os.lock`, `.dockerignore`) | 6 | 343 |
| Package and build config (`package.json`, lock, workspace, `tsconfig.json`, `.gitignore`) | 5 | 1,550 |
| Docs (`README.md`) | 1 | 15 |
| Generator metadata (`.jeeves/`, `diagnostics/`) | 5 | 5 |
| Configuration source (`configurationPaths`) | 2 | 2 |

Authored support outside `app/` (Q04's `infra/`, this unit's `tools/`) is not in this table; it is
counted when the run's support tool covers the whole repository. Open work beside the counts:
11 unwritten stubs, 0 hooks, `src/features/service-resources.ts` (50 counted LOC) imported by no
process, the declared dependencies `hls.js`, `@aws-sdk/s3-request-presigner`,
`@opensearch-project/opensearch` and `zod` imported nowhere (`@aws-sdk/client-s3` only by
`scripts/storage-config.mjs`, which this design never runs), and the Dockerfile's unused `ffmpeg`
and `media` stages (Q02 F15).

## 9. Hygiene

| Check | Result |
| --- | --- |
| `git diff --check` | Clean outside `app/` (trailing spaces stripped from two captured Compose logs, the file diffs and one log first). Inside `app/` it flags two generated files, `Dockerfile` and `src/features/service-resources.ts`, which end with a blank line: left as generated (AG-09) |
| Secret scan | Q04's `secret-scan.py` (shapes) over `docs/evidence/q05`, `app`, `tools` and the root `package.json`: nothing. The smoke's random credentials stayed in the scratch copy's `.runtime/` (deleted); the Keycloak admin password, the smoke client's secret and its token were held in memory only |
| Ledger | `ledger.py validate` exit 0 after this attempt's records |
| Docker | Before: no `qrwtya*` or `qrwty.arm=a` resource. After: none (section 7). Other lanes' containers untouched |
| `~/.config/qrwty/`, cloud, Auth0, Cloudflare, Stripe | Not read, not called |
| Jeeves | Checkout: read through Git only. Studio: one revision of this project; no other project, no restart, no database read |

## 10. A-found gaps

| ID | Severity | Gap | Workaround |
| --- | --- | --- | --- |
| AG-08 | Low (notation) | A queue's Provider is not drawn: revision 84's Detailed and Simple PNGs are byte-identical to revision 83's, so a reader can't tell Pub/Sub from RabbitMQ in the published picture | The README says so beside the image; the source JSON, blueprint and provenance carry it |
| AG-09 | Low (cosmetic) | Two generated files end with an extra blank line (`Dockerfile` from the local-v2 asset, `src/features/service-resources.ts` from its template), which `git diff --check` reports as `new blank line at EOF` | None needed: they stay as generated; later diffs don't touch them |

No generated file needed a hand edit. Known and not new: QGR2 finding 7 (the frozen report's
`environment` omits `JEEVES_EXTERNAL_*_URL`; the uncommitted Jeeves work above lists them), F15
unused material, AG-01 to AG-07 from Q04.

## Not run

No Jeeves suite (no Jeeves file changed). No oracle row beyond M01/M03 (the A/F rows need product
code). No cloud, Auth0, Cloudflare or Stripe call. No overlay install into `app/` (section 4).

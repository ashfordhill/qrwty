# Q02 checks: the as-found QRWTY export

Run `qrwty-r1-20261114`, arm A, unit Q02, attempt 1 (ledger `a-0154`). QRWTY starting commit
`7e9041f`; Jeeves at `59bfbc6` ("SO08: say which outside calls keep the normal retries"). Started
2026-11-14T06:28:01Z. No Jeeves file changed and no Jeeves project changed: the 20 projects
listed before and after this unit are identical, and the QRWTY project stayed at revision 83
through every step ([record](records/studio-export-record.json)).

**What this is.** A reproducible diagnostic baseline of what the installed library generates
today for the saved design: not the application, not production approval and not the Q05
generated baseline. `.jeeves/report.json` is kept as generated: `experimental-partial`,
application complete **false**, runtime verification none, strict readiness not assessed,
0 findings, 11 required custom gaps.

## 1. Checks

| Check | Result | Evidence |
| --- | --- | --- |
| **M01 at the as-found scope**: saved design, registry and manifest match; fresh CLI and studio payloads compare | **Pass.** Export `.jeeves/inputs/design.json` = canonical `GET /design` bytes = SHA-256 `a3c978d1…753b` (Q01). Registry `08e0c945…d322d`, runtime `71dcdadd…5eaec`, generator `jeeves-v2 0.1.0-experimental.1` and the 14 template selections equal Q01's provenance and the preview. `manifest.json` `c1868eab…b9632` in both exports and the preview. All 83 files the manifest lists match their recorded hashes. All 163 generator source files the manifest names equal their blobs at Jeeves HEAD `59bfbc6` | [m01-identity.json](records/m01-identity.json), [payload-manifest.json](payload-manifest.json) |
| **Payload equality, studio versus CLI** | **Pass.** 84 paths each, 3,805,071 bytes, every SHA-256 equal; `diff -r` finds nothing | §4; [tree-studio](records/tree-studio.json), [tree-cli](records/tree-cli.json) |
| **Clean standalone build** | **Pass, both exports**, outside the Jeeves checkout: `pnpm install --frozen-lockfile --ignore-scripts --offline` (109 packages from the local store, 0 downloaded, lockfile unchanged) and `pnpm build` (`tsc`, exit 0, 46 files). The two `dist/` trees are identical | §5; [logs](logs/) |
| **Diagram round trip** | **Pass.** A fresh browser reopened the project (19 nodes; 35 lines Detailed, 27 Simple; no page errors). Re-exported source JSON is byte-identical to Q01's (`4c16e0ca…`); Detailed and Simple PNGs are byte-identical to Q01's (`826a9efb…`, `5384d218…`); capture JSONs differ only in `capturedAt`. The studio's preview body equals Q01's report byte for byte (`853f7ee6…`) and the ZIP equals Q01's (`dcaff3aa…`) | §9 |
| Runtime observation (optional; Docker) | **Observed: healthy and incomplete.** `pnpm first-run` started all 12 services healthy in 97 s; `/healthz` answers 200 on all six processes while every stub route answers 501 and the worker stub dead-letters | §6 |
| No secrets or runtime files kept | **Pass.** The payload holds secret *names* only; `.runtime/` is not in the payload; credentials are random at `first-run` into `.runtime/secrets` (ignored), which was deleted with the runtime; logs grep clean | §8 |

## 2. Identity and versions

| Item | Value |
| --- | --- |
| Project | **QRWTY · production candidate v1**, `d1e59607-0616-418d-83d5-4cfe5bcb4b11`, revision 83, owner's `jeeves` database through the dev servers (web 4300, API 4310; not restarted) |
| Jeeves | `59bfbc6b4c9cc149cc7760555cf753c7485c59d7`; tracked changes under `jeeves/` and `jeeves-generator/` before and after: only the owner's mode change on `jeeves/scripts/e2e-docker.sh` |
| Generator CLI | `pnpm --filter @jeeves/generator export:v2` (`tsx src/v2/cli.ts`), tsx 4.23.15, package `@jeeves/generator` 0.1.0-experimental.2; emitted generator identity `jeeves-v2` 0.1.0-experimental.1 |
| Archive | `jeeves-local-v2-experimental.zip`, `zip-store-v1`, 3,817,527 bytes, SHA-256 `dcaff3aa004e3b2a04b09c2162e7b7c5295c13f4927d3ece31af9339b2a3cd14`: 84 stored entries, ASCII order, 1980-01-01 dates, no extras, no comment, no mode bits ([entries](records/zip-entries.json)) |
| Host tools | Node v24.21.0 (nvm), pnpm 12.16.1, Python 3.12.3, curl 8.5.0, Linux 6.6.87.2 (WSL2) |
| Browser | `@playwright/test` 1.63.0 from the Jeeves workspace, HeadlessChrome 153.0.8010.12, 1440×900 |
| Docker | Engine 29.9.1, Compose v5.6.0 |
| Emitted toolchain | Node **24.21.0** (`engines`, `node:24.21.0-bookworm-slim@sha256:d6aa754f…`), pnpm 12.16.1, TypeScript 7.0.2, `@types/node` 24.19.2; no Vitest, Biome or Playwright. Same as Q01 found; pack v1 pins Node 24.22.2 on Alpine, which remains the coordinator's decision |

## 3. Commands, in order

All scratch work was under `/tmp/claude-1000/-home-ash-github-jeeves/25a62ed6-cc60-4bd9-b2cf-35664f59d9c5/scratchpad/q02`
(`$S` below), outside both repositories, with `PATH=$HOME/.nvm/versions/node/v24.21.0/bin:$PATH`.
The scripts are kept in [commands/](commands/) exactly as run.

| # | Command | cwd | Exit, time | Output |
| --- | --- | --- | --- | --- |
| 1 | `curl -s http://127.0.0.1:4310/projects/<id>/design > $S/input/design-response.json`; `python3 -I commands/canon.py … $S/input/design.canonical.json` | `$S` | 0 | 27,841 bytes, SHA-256 `a3c978d1…753b` (equals Q01's canonical hash) |
| 2 | `node commands/studio-export.mjs $S/studio-zip $S/roundtrip $S/shots …` (mouse: Generate project → Preview scaffold → Download project ZIP; then a fresh context: Export diagram → Source & diagnostics → Download source JSON; PNG; Download capture details) | `$S` | 0, 5.5 s, 2026-11-14T06:32:18Z | [studio-export-record.json](records/studio-export-record.json) |
| 3 | `node commands/roundtrip-simple.mjs $S/roundtrip-simple $S/shots …` (fresh context, View → Simple, Export diagram → PNG) | `$S` | 0 | [roundtrip-simple-record.json](records/roundtrip-simple-record.json) |
| 4 | `pnpm --filter @jeeves/generator export:v2` (no arguments) | Jeeves root | 1 | Usage: `export:v2 /path/design.json /absolute/new-directory` |
| 5 | `pnpm --filter @jeeves/generator export:v2 $S/input/design.canonical.json $S/cli-export` | Jeeves root | 0, 0.5 s, 06:33:18Z | `files: 84, applicationComplete: false, findings: 0, requiredGaps: 11` ([log](logs/cli-export.log)) |
| 6 | `pnpm --filter @jeeves/generator export:v2 $S/roundtrip/QRWTY-production-candidate-v1-r83-source.json $S/cli-export-sourcejson` (supplementary: the pretty-printed "Download source JSON" file) | Jeeves root | 0 | [log](logs/cli-export-sourcejson.log); see §4 |
| 7 | `python3 -I commands/extract.py $S/studio-zip/jeeves-local-v2-experimental.zip $S/studio-export …` (refuses absolute, `..` and directory entries; new directory only) | `$S` | 0 | 84 files |
| 8 | `python3 -I commands/tree.py studio-export …`, the same for `cli-export` and `cli-export-sourcejson`; `diff -r studio-export cli-export` | `$S` | 0 | identical |
| 9 | `cp -a studio-export build-studio; cp -a cli-export build-cli`; in each: `pnpm install --frozen-lockfile --ignore-scripts --offline`, then `pnpm build`; `cmp pnpm-lock.yaml <untouched>`; `diff -r build-studio/dist build-cli/dist` | each build directory | 0, 0, 06:34:51Z | §5 |
| 10 | `COMPOSE_PROJECT_NAME=q02-qrwty-studio LOCAL_HTTP_PORT=47811 LOCAL_IDENTITY_PORT=47812 LOCAL_OBJECT_PORT=47813 pnpm first-run` | `$S/build-studio` | 0, 97.2 s, 06:35:34Z | [log](logs/runtime-first-run.log) |
| 11 | `bash commands/probe.sh`; `bash commands/probe-internal.sh`; one confirmed AMQP publish of message `q02-probe-1` to `click-events` from the Redirect service container (inline `node -e` with the image's `amqplib`; password read from `/run/secrets/broker-password`, never printed); `rabbitmqctl list_queues` | same | 0 | [edge](logs/runtime-probe-edge.txt), [internal](logs/runtime-probe-internal.txt), [process logs](logs/runtime-app-logs.txt), [ps](logs/runtime-ps.txt) |
| 12 | `docker compose --profile '*' down --volumes --remove-orphans`; `docker image rm q02-qrwty-studio-app`; `rm -rf .runtime` | same | 0, 5.5 s | [log](logs/runtime-down.log); §10 |
| 13 | `python3 -I commands/imports.py`, `inventory.py`, `m01.py` | `$S` | 0 | [import-graph](records/import-graph.json), [payload-manifest.json](payload-manifest.json), [m01-identity](records/m01-identity.json) |
| 14 | `node commands/preview-status.mjs …` (Generate project → Preview scaffold, scroll to the result, keep the dialog text; no download) | `$S` | 0 | [dialog text](records/generate-dialog-text.txt), [screenshot](screenshots/05-preview-status.png) |

## 4. Payload comparison

| Export | Input | Files | Bytes | Same as the studio? |
| --- | --- | ---: | ---: | --- |
| Studio, by mouse (ZIP, extracted) | Server: `canonicalJson(saved design)` | 84 | 3,805,071 | — |
| CLI | `design.canonical.json` (the same canonical bytes) | 84 | 3,805,071 | **Identical**: every path and SHA-256 |
| CLI, supplementary | The studio's "Download source JSON" file (`JSON.stringify(design, null, 2)` + newline) | 84 | 3,820,757 | Two files differ: `.jeeves/inputs/design.json` holds the input bytes as given, and `.jeeves/manifest.json` records their hash (`input.sourceSha256`, `files[2]`). `sourceCanonicalSha256` and `normalizedInputSha256` are the same; the other 82 files are identical |

So a byte-identical CLI export needs the canonical bytes the server uses, not the pretty-printed
download. Q05 should export from the canonical source (or record which input it used).
`payload.sha256` lists all 84 files; `cd <extracted export> && sha256sum -c payload.sha256` checks
a copy ([payload.sha256](payload.sha256)).

## 5. Build

| Step | Studio copy | CLI copy |
| --- | --- | --- |
| `pnpm install --frozen-lockfile --ignore-scripts --offline` | exit 0, 0.35 s: resolved 109, reused 109, downloaded 0 | exit 0, 0.25 s: same |
| `pnpm build` (`tsc -p tsconfig.json`) | exit 0, 0.32 s, no diagnostics, 46 `.js` files | exit 0, 0.28 s, same |
| `pnpm-lock.yaml` after install | unchanged | unchanged |
| `dist/` | identical between the two (tree hash `7b7c138a…bf3a`) | |

The install used the README's own command plus `--offline`; the packages were already in the
local pnpm store (`~/.local/share/pnpm/store/v11`), so nothing was fetched. The container build in
`first-run` (step 10) used the pinned base image already present by digest and the cached
`npm install --global pnpm@12.16.1` and `pnpm install --frozen-lockfile` layers; it ran
`COPY src`, `pnpm build` (`tsc`, 1.0 s) and the later `COPY` steps. No image was pulled.

## 6. Runtime observation

One run, from the studio copy (the payloads are identical), under its own Compose project
`q02-qrwty-studio` on loopback ports 47811–47813. `first-run` generated private credentials,
built `q02-qrwty-studio-app` (`sha256:27dac97e…`, 710 MB), started Postgres 17.11, two Valkey
8.1.10, RabbitMQ 4.4.0 and Keycloak 26.8.1 (`start-dev`), ran migrations and broker setup, and
started the six processes and the edge: **all 12 services healthy**.

| Request | Answer |
| --- | --- |
| `GET /healthz` at the edge; `GET /api/{session-api,redirect-service,billing-api}/healthz` | 200 `{"service":…,"application":"ready"}` |
| `GET /api/link-api/healthz`, `GET /api/account-api/healthz` at the edge | 404 (internal tiles are not published) |
| `GET` and `HEAD /api/redirect-service/modules/redirect-service-resolve-and-redirect/abc123` | **501** `NOT_IMPLEMENTED` "Not implemented: Resolve and redirect" |
| `GET …/session-api-sign-in-flow/login`, `POST …/session-api-api-forwarding/links` | **501** |
| `POST …/billing-api-payment-events`, `GET …/billing-api-entitlements`, `POST …/billing-api-customer-billing/checkout` | **501**, all reachable from the public edge |
| `GET /api/billing-api/modules/billing-api-sign-in/me`: no token / `Bearer not-a-token` | 200 `{"signedIn":false}` / 401 `SIGN_IN_REQUIRED` (Optional guard) |
| Inside the network: Link API and Account API `/healthz` | 200 |
| Link API `…/link-api-sign-in/me`; `…/link-api-link-operations/links`; `…/link-api-abuse-and-moderation/reports` | 200 `{"signedIn":false}`; **501**; **501** |
| Account API `…/account-api-sign-in/me`, `…/account-api-my-links`, `…/account-api-link-analytics`, no token | 401 (Required guard, before the stubs) |
| One confirmed publish `q02-probe-1` to `click-events` | The worker consumed it; log `not-implemented … sent to click-events.failed (NOT_IMPLEMENTED)`; `click-events` 0 messages / 1 consumer, `click-events.failed` 1 message |

Each process logged its store probes (`SELECT 1`, `PING`, a broker confirm channel) as `ok`, and
the three Sign-in modules logged `started … verified-identity … sign-in Optional|Required on
every module route`. **A healthy process that answers 501 is incomplete**: every product path of
this export is a 501 or a dead-lettered message today. Not run: a valid-token request (the local
realm seeds no user and disables direct grants, so it needs a browser sign-in with a created
user), drain on `pnpm stop`, restart, and any fault.

## 7. Classification

### 7.1 Supported runtime (generated, works as found)

| Mechanism | Generated by | Observed |
| --- | --- | --- |
| Six runnable processes, one per application tile, `/healthz` 200 once ready and 503 while draining, HTTP admission (1000 ms, 1000 concurrent: the fixed defaults), JSON 404 elsewhere, ready marker for Compose health | `local.tile-processes`, `local.primitives` | All healthy; drain not exercised |
| Edge (nginx 1.28.3) publishing exactly the three lane-entry tiles at `/api/<id>/`; internal tiles 404 | `local.tile-processes` | Yes |
| Local providers: PostgreSQL with five logical databases (links, sessions, billing, analytics, identity), least-privilege logins and `published` views; two Valkey caches; RabbitMQ work queue `click-events` + `click-events.failed`; Keycloak as the local OIDC issuer | `local.foundation` | All healthy; grants as Q01 recorded (Links read-only for Redirect and Account API) |
| Setup: random credentials into private `.runtime/secrets`, migrations, broker setup, idempotent `first-run`/`start`/`stop` | `local.foundation` | `first-run` exit 0 |
| Store/channel clients for each stub, probed at startup; publish with broker confirms; loop consume with retries and `.failed` routing | `local.tile-processes`, `local.primitives` | Probes ok; dead-letter path observed |
| **Sign-in** (`verified-identity` ×3): JWT verification against the realm's JWKS with issuer and audience `identity-web`; Optional on Link API and Billing API, Required on Account API | template `verified-identity` 0.1.0 | Missing/invalid token behaviour observed; valid token not run |

### 7.2 You write it (application-owned files)

The manifest marks **19 files `generated-extension`**: export never overwrites them, and no other
file may be edited by hand. There are **0 hook files** (no template on this design has hooks;
every process reports `hooks: []`).

| Module (tile) | Stub body (8 lines, throws) | Product SQL (comments only) | Runs as |
| --- | --- | --- | --- |
| Sign-in flow (Session API) | `src/modules/session-api/session-api-sign-in-flow.ts` | `infra/postgres/sessions/modules/session-api-sign-in-flow.sql` | route, 501 |
| API forwarding (Session API) | `…/session-api-api-forwarding.ts` | `…/sessions/modules/session-api-api-forwarding.sql` | route, 501 |
| Link operations (Link API) | `src/modules/link-api/link-api-link-operations.ts` | `infra/postgres/links/modules/link-api-link-operations.sql` | route, 501 |
| Abuse and moderation (Link API) | `…/link-api-abuse-and-moderation.ts` | `…/links/modules/link-api-abuse-and-moderation.sql` | route, 501 |
| Resolve and redirect (Redirect service) | `src/modules/redirect-service/redirect-service-resolve-and-redirect.ts` | none (reads only) | route, 501 |
| My links (Account API) | `src/modules/account-api/account-api-my-links.ts` | none (reads only) | route, 401 then 501 |
| Link analytics (Account API) | `…/account-api-link-analytics.ts` | none (reads only) | route, 401 then 501 |
| Customer billing (Billing API) | `src/modules/billing-api/billing-api-customer-billing.ts` | `infra/postgres/billing/modules/billing-api-customer-billing.sql` | route, 501 |
| Payment events (Billing API) | `…/billing-api-payment-events.ts` | `…/billing/modules/billing-api-payment-events.sql` | route, 501 |
| Entitlements (Billing API) | `…/billing-api-entitlements.ts` | `…/billing/modules/billing-api-entitlements.sql` | route, 501 |
| Click aggregator (Analytics worker) | `src/modules/analytics-worker/analytics-worker-click-aggregator.ts` | `infra/postgres/analytics/modules/analytics-worker-click-aggregator.sql` | loop, `.failed` |

These are the report's 11 required custom gaps, unchanged. Q02 did not write any of them.

### 7.3 Unsupported cloud bindings and other gaps

Q01's F1–F10 stand; the export confirms each one it can show. F11–F15 are new from reading and
running the export. All are for Q03; none was worked around here.

| # | Gap | What the export shows | Related |
| --- | --- | --- | --- |
| F1, F5 | **No Pub/Sub**; no topic mode | Click events is a RabbitMQ work queue (`click-events`, `.failed`); the Redirect service's client is AMQP with confirms | G12 |
| F2 | **No raw webhook bytes** | `src/modules/entry.ts`: `body` is "Parsed JSON or text, up to 64 KiB"; Payment events' own comment says it must verify Stripe's signature over the raw bytes | G13 |
| F3 | **Whole tile public** | Billing API's Entitlements and Customer billing answer at the public edge (501 today, real once written) | G08 |
| F4 | Stubs cannot compose; 11 of 14 modules are stubs | Each stub gets only its own slots' clients | G04, G10 |
| F6 | **OIDC issuer** is local only; Session API gets none | `OIDC_ISSUER=http://127.0.0.1:${LOCAL_IDENTITY_PORT}/realms/identity` and the JWKS URL are Compose values for Keycloak `start-dev` (report: `localAdapterTreatments` "Fixed local OIDC vendor substitution", unsupported intent); Session API's environment is empty | G03, G10 |
| F7 | No scheduled trigger | No schedule or owner call for reconciliation or cleanup | G11 |
| F8 | Event counter and cache read not used | Not in this export (Custom modules instead) | G05, G07 |
| F9, F10 | Notation; ownership readiness findings | Unchanged; no generation effect (report findings: 0) | — |
| F11 | **Short-link path** | A redirect is reachable only at `/api/redirect-service/modules/redirect-service-resolve-and-redirect/<slug>`; serving `/<slug>` needs an edge route map the export does not generate | G08 |
| F12 | **External APIs and Identity are unavailable to stubs** | Stripe API (Customer billing, Payment events), Reputation API (Link operations) and Identity (both Session API stubs) are `unavailable(…)` proxies that answer "Not implemented"; no base URL, credential or timeout binding exists | G10, G03 |
| F13 | **Managed endpoints and credentials** | Hosts are fixed Compose names in generated code (`local-postgres:5432`, `local-broker:5672`, `cache-<id>:6379`); no TLS/CA, IAM or endpoint injection | G01 |
| F14 | **Container runs as root** | The Dockerfile has no `USER`; no restart policy (local by design) | G09 |
| F15 | **Unused generated material** | `ffmpeg`/`media` Docker stages and `ffmpeg-os.lock`; dependencies `hls.js`, `@aws-sdk/s3-request-presigner`, `@opensearch-project/opensearch`, `zod` imported nowhere, `@aws-sdk/client-s3` only by the unused storage bootstrap; `src/features/application-bindings.ts` and `service-resources.ts` unreached from any process | Open work; affects G0 mechanically ([inventory](scope-inventory.md)) |

Also kept from Q01: the Redirect service's 1000 ms request timeout is the fixed default and
would bound an awaited publish (G04).

## 8. Preserved bytes, secrets and runtime files

- **Untouched bytes:** [`artifact/sha256-dcaff3aa…a3cd14.zip`](artifact/) is the studio download as
  received (3,817,527 bytes); its name is its SHA-256. [payload-manifest.json](payload-manifest.json)
  lists every payload file with bytes, SHA-256, manifest ownership, emitter, scope category and
  raw line count; [payload.sha256](payload.sha256) checks an extracted copy.
- **Secrets:** the payload names 20 secrets (for example `postgres-admin`, `broker-password`,
  `sql-links--redirect-service`) and reads them from `.runtime/secrets/` at run time; no value is
  in the payload. A scan for private keys, Stripe/AWS/Google/GitHub/Slack keys and JWTs found
  nothing in the payload, logs or records. `scripts/setup.mjs` creates the plain credentials with
  `randomBytes(32)` at `first-run`, in `.runtime/` and `.runtime/secrets/` (both mode 0700).
- **Runtime files:** no `.runtime/`, `node_modules/`, `dist/` or `.env` is in the payload or in this
  folder. The run's `.runtime/` was deleted with the Compose project.

## 9. Diagram round trip

| Output, fresh browser context | This unit | Q01 | Same |
| --- | --- | --- | --- |
| Source JSON (Export diagram → Source & diagnostics → Download source JSON) | `4c16e0ca…a5d50`, 43,527 B | `QRWTY-production-candidate-v1-r83-source.json` | Byte-identical |
| Detailed PNG | `826a9efb…f965`, 588,945 B | `…-r83-detailed.png` | Byte-identical |
| Simple PNG | `5384d218…473b`, 397,653 B | `…-r83.png` | Byte-identical |
| Capture details | [detailed](records/roundtrip-detailed-capture.json), [simple](records/roundtrip-simple-capture.json) | Q01's captures | Only `capturedAt` differs |
| Preview response (Generate project → Preview scaffold) | `853f7ee6…a74d0` | `generation-preview-r83.json` | Byte-identical |
| Project ZIP | `dcaff3aa…a3cd14` | provenance `export.archive` | Byte-identical |

The project reopened at revision 83 with the menu "QRWTY · production candidate v1", 19 nodes,
35 lines in Detailed and 27 in Simple, and no page errors ([screenshots](screenshots/):
`03-reopened-detailed.png` was saved by `studio-export.mjs` as `03-reopened-simple.png` and
renamed, since the studio's default view is Detailed; `04-reopened-simple.png`;
`05-preview-status.png`). The Simple/Detailed toggle is browser `localStorage`, never part of the
design. The first Generate dialog screenshot equals Q01's `13-generate-preview-final.png` byte for
byte, so it is not kept again.

## 10. Cleanup and what remains

- Removed: the Compose project `q02-qrwty-studio` (12 service containers, the `--rm` setup
  containers, 4 volumes, the network) with the README's own `down --volumes --remove-orphans`, the
  image `q02-qrwty-studio-app` by exact name, and `.runtime/`. Afterwards no container, volume,
  network or image named `q02-…` exists; `jeeves-postgres-1` was never touched.
- Remains: BuildKit cache layers from the image build (not removed: pruning is forbidden).
- Scratch directory `$S` (above) holds the exports, build copies and logs; it is outside both
  repositories and is deleted at the end of the unit.

## Not run

No Jeeves suite (no Jeeves file changed). No valid-token request, drain, restart or fault test.
No cloud, Stripe, chat model or paid call. No stub, hook or SQL was written. The A ledger attempt
`a-0154` was started by this worker; usage, end time and `commits.after` are the coordinator's.

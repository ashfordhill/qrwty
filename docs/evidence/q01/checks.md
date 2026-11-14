# Q01 checks: the QRWTY backend diagram in Jeeves

Run `qrwty-r1-20261114`, arm A, unit Q01, attempt 1. QRWTY starting commit `7e373c7`; Jeeves at
`59bfbc6` ("SO08: say which outside calls keep the normal retries"). Started 2026-11-14T05:59:01Z.
No Jeeves file was changed; the only Jeeves write is the one new project below.

**Project:** **QRWTY · production candidate v1**, ID `d1e59607-0616-418d-83d5-4cfe5bcb4b11`, saved
revision 83, in the owner's `jeeves` database (dev servers on 4300/4310). Open it at
`http://127.0.0.1:4300/?project=d1e59607-0616-418d-83d5-4cfe5bcb4b11`. No other project changed
([before](commands/projects-before.json), [after](commands/projects-after.json): 19 projects
before, 20 after, the only difference is this one).

Exported artifacts, with provenance and hashes: [`jeeves/`](jeeves/) and
[`jeeves/provenance.json`](jeeves/provenance.json). `sha256sum -c SHA256SUMS` in this folder
rechecks every file.

## 1. Jeeves identity

| Item | Value |
| --- | --- |
| Commit | `59bfbc6b4c9cc149cc7760555cf753c7485c59d7`. Tracked changes under `jeeves/` and `jeeves-generator/`: none except the owner's mode change on `jeeves/scripts/e2e-docker.sh` |
| Generator sources used | All 163 source files listed in the report's `implementations` equal their blobs at HEAD (checked by SHA-256) |
| Web renderer | The owner's Vite dev server, started 2026-11-10 at `73bd4a8` and serving the working tree through HMR, so the capture files' `renderer.commit` says `73bd4a8` with `trackedTreeDirtyAtBuild: true`. The tree audit above is the identity of what was served |
| API | `tsx watch` worker last restarted 2026-11-14T05:18:59Z, after the SO08 files were saved (commit 05:19:16Z) |
| Registry | SHA-256 `08e0c945be87ff3218680027056660890be4e6dcacce4c32144c65ea33ad322d`; generator `jeeves-v2` `0.1.0-experimental.1`; runtime `local-runtime` 0.1.0 `71dcdadd…5eaec`; Runnable processes installed |
| Installed templates | `module-stub`, `owned-multipart`, `asset-lifecycle`, `video-hls`, `positive-cache-read`, `event-counter`, `search-projection`, `search-query`, `verified-identity`, `favorites` (all 0.1.0; hashes in [generation-support.json](jeeves/generation-support.json)); preset `video-feature` 0.1.0 |
| Plans | No active plan (`AGENTS.md` lines 99–100, `jeeves/PLAN.md`). Pending proposals only: SO06 and SO07 in the store outage review, waiting for the owner |

### Toolchain pins as the generator emits them

Read from the export's own files (ZIP downloaded by mouse to a scratch folder only, SHA-256
`dcaff3aa…a3cd14`; `package.json` `e078d8eb…bddb04`, `Dockerfile` `9548875e…570954`), compared
with [neutral pack v1 decisions §6](../../benchmarks/neutral-pack/v1/frozen/decisions.md#6-toolchain).
The pack was not changed.

| Tool | Generator emits | Pack v1 | Same? |
| --- | --- | --- | --- |
| Node.js | `engines.node` **24.21.0**; image `node:24.21.0-bookworm-slim@sha256:d6aa754f…ec7f87b20` | **24.22.2**; `node:24.22.2-alpine` | **No**: version and base image (Debian slim, not Alpine) differ |
| pnpm | `packageManager: pnpm@12.16.1` | 12.16.1 | Yes |
| TypeScript | 7.0.2 | 7.0.2 | Yes |
| `@types/node` | 24.19.2 | 24.19.2 | Yes |
| Vitest | not emitted (no test runner in the export) | 5.0.0 | **Absent** |
| Biome | not emitted | 2.6.4 | **Absent** |
| Playwright | not emitted | 1.63.0 | **Absent** |

For reference only (not emitted into exports): the Jeeves workspace itself pins Vitest 5.0.0,
`@playwright/test` 1.63.0 and Biome **2.5.15**. Per decisions §6 the Node difference is the
coordinator's to settle (pack v1.1 before B02); A must not edit generated files to match.

## 2. What was drawn

Two actions, 16 tiles, 27 links (the user's 2 lines, 3 entries, 22 connections), 14 modules,
Runnable processes on. Validation: no lane error, no design warning; the 35 remaining findings are
readiness findings (`CONFIG_REQUIRED` ×21, `NEEDS_TEMPLATE` ×14), the same classes the owner's
YouTube v3 project carries (9 and 13).

| Lane | Action → entries |
| --- | --- |
| download | **Open link** → Redirect service |
| upload | **Create, manage & pay** → Session API, Billing API (Stripe's signed webhook) |

| Tile (kind) | Outgoing links | Owner of |
| --- | --- | --- |
| Session API (Service) | Identity, Sessions, Link API, Account API, Billing API (5) | Sessions |
| Link API (Service) | Links, Identity, Admission cache, Reputation API, Billing API (5) | Links, Admission cache |
| Redirect service (Service) | Links (read), Hot routes, Click events (publish, dashed) | Hot routes, Click events |
| Account API (Service) | Identity, Links (read), Analytics (read), Billing API (4) | none |
| Billing API (Service) | Identity, Billing, Stripe API (3) | Billing |
| Analytics worker (Worker) | Analytics (1); consumes Click events (dashed) | Analytics |
| Identity (Identity), Links, Sessions, Billing, Analytics (Database), Hot routes, Admission cache (Cache), Click events (Queue), Reputation API, Stripe API (External API) | none (end tiles) | |

This is the inventory and connection checklist of
[architecture.md](../../plans/production-build/architecture.md#lane-and-connection-checklist-for-q01),
including Session/Sessions and Billing API/Billing/Stripe. Every tile and module has a description
(the responsibility from architecture.md). Nine read, write and channel lines carry labels typed
in the line inspector (for example Redirect service → Click events "Publishes clicks and awaits
the ACK", Account API → Links "Reads the owner view"); the others keep the link table's default.

**Ownership.** Each store is owned by the tile it was added after (the studio's ordinary rule), so
every store has exactly one writer and the readers read: the export provisions Links read-write
for Link API and read-only (`SELECT on published`) for Redirect service and Account API, and
Analytics read-only for Account API. Module commands derived explicit owners and roles for the
four tiles with a template (Account API, Billing API, Identity, Link API); explicit resource
authority has no normal mouse or chat control, so the 18 ownership readiness findings stay
unresolved, as in YouTube v3. Source & diagnostics shows the same
([screenshot](screenshots/12-source-diagnostics.png)).

### Differences from the plan, and why

1. **One action per lane, one entry per tile.** architecture.md names five user flows across two
   lanes and gives Session API flows in both. Jeeves allows one action per lane and one entry per
   tile ("Session API already starts the upload lane; a tile has one entry."). Session API's one
   entry is in the upload lane, whose action is named **Create, manage & pay** to cover create,
   claim, edit, sign-in, list, analytics, plan and payment events; **Open link** covers the
   redirect. Generation is unaffected: an entry makes a tile public at the edge, and Session API,
   Billing API and Redirect service are exactly the three public tiles.
2. **Stripe's webhook enters Billing API through the upload action**, as architecture.md says;
   a Stripe API → Billing API line is refused as a loop.
3. **Multi-dependency handlers are Custom modules.** A stub receives clients only for its own
   connected slots, and modules in one tile cannot call each other (except a Cache reader's
   loader and Favorites' items). So a handler that needs several stores or targets has to be one
   Custom module: Resolve and redirect uses Links, Hot routes and Click events together, which a
   Redirect responder (no slots) or a separate Event publisher (its own route) could not. Section 4
   lists what was considered and why it was not used.
4. **Click events stays a work queue on the installed broker.** Mode and provider have no
   normal control; both edits are refused (section 5). With one consumer drawn the queue is
   correct locally; the archive subscription is deployment (Excalidraw). Pub/Sub is pending G12.
5. **Artifact folder.** architecture.md names `docs/architecture/jeeves/` with renamed files;
   this unit's allowed writes are `docs/evidence/q01/`, so the artifacts are in
   [`jeeves/`](jeeves/) under the file names Jeeves gave them, mapped to their roles in
   `provenance.json`. Blueprint v2 refuses this design (422, explicit declarations), so the
   derived blueprint is v3; the refusal is kept.

## 3. How it was built (exact commands)

Everything ran from scratch scripts outside both repositories (not committed), with
`PATH=$HOME/.nvm/versions/node/v24.21.0/bin:$PATH` and Jeeves's own `tsx` 4.23.15
(`jeeves/apps/server/node_modules/.bin/tsx`) and `@playwright/test` 1.63.0 (headless Chromium,
1440×900). Browser steps drove the owner's studio at `127.0.0.1:4300` by mouse.

| Step | How | Revisions | Record |
| --- | --- | --- | --- |
| Studio loads; TinyURL renders; New project → Blank architecture → name → Create project | Mouse | 0 | [mouse/01](mouse/01-tinyurl-and-create.json), screenshots 01, 03, 04 |
| Actions, 16 tiles, 22 connections, 3 entries | API, the canvas's command path: `GET /projects/<id>/design`, `buildSupportedAuthoringCommand(design, command, GET /generation-support)` from `@jeeves/spec`, `POST /projects/<id>/operations {baseRevision, ops, source: "api"}`; IDs from names as chat's `compileChatCommand` does (`newNamedTileId`, `newLinkId`) | 1–27 | [commands/api-structure.json](commands/api-structure.json): each command, HTTP status, revision |
| 14 modules (`addModule`) and 30 module links (`connectModule`) | Same path | 28–71 | [commands/api-modules.json](commands/api-modules.json) |
| Sign-in Optional on Link API and Billing API (Account API left Required) | Mouse: open the module row, Sign-in select | 72–73 | [mouse/02](mouse/02-sign-in-and-processes.json), screenshots 05 |
| Runnable processes on; Preview scaffold | Mouse: Generate project dialog checkbox | 74 | screenshot 06 |
| Nine line labels | Mouse: click the line, type in Action | 75–83 | [mouse/04](mouse/04-labels-and-exports.json) |
| Exports: Simple PNG + capture, Detailed PNG + capture, source JSON | Mouse: Export diagram | 83 | same |
| Final report: Preview scaffold, Download project ZIP (scratch only) | Mouse | 83 | [mouse/06](mouse/06-final-preview.json), screenshot 13 |
| Blueprint | `GET /projects/<id>/blueprint?version=3` (v2: 422) | 83 | [jeeves/](jeeves/) |

Before any server write, the whole command sequence was applied in memory to an empty design with
the spec's `applyOperations`: no refusal, no lane error, no warning, no export blocker. Every live
command returned 200. No chat model was used.

## 4. Per-module classification

From the studio (module page, by mouse) and the generation report (its words in brackets).

| Module | Tile | Studio | Report | Reason |
| --- | --- | --- | --- | --- |
| Sign-in | Link API | **Generated** · Sign-in, **Optional** | Template `verified-identity` | Auth guard on Identity; guest create sends no token; an invalid token is 401 |
| Sign-in | Account API | **Generated** · Sign-in, **Required** | Template `verified-identity` | Every route needs a valid token |
| Sign-in | Billing API | **Generated** · Sign-in, **Optional** | Template `verified-identity` | Stripe's webhook has no token; customer routes check the caller in their handler |
| Sign-in flow | Session API | **You write it** | Stub | Custom: OIDC code + PKCE and cookie sessions (Identity, Sessions) |
| API forwarding | Session API | **You write it** | Stub | Custom: cookie, CSRF, bearer forwarding (Sessions, Identity, Link API, Account API, Billing API) |
| Link operations | Link API | **You write it** | Stub | Custom: create, claim, edit, delete (Links, Admission cache, Reputation API, Billing API) |
| Abuse and moderation | Link API | **You write it** | Stub | Custom: reports and operator decisions (Links, Admission cache) |
| Resolve and redirect | Redirect service | **You write it** | Stub | Custom: lookup, publish and await ACK, 302 (Links read, Hot routes, Click events publish); no identity link |
| My links | Account API | **You write it** | Stub ("No template in Account API uses it.") | Data access on Links (read) |
| Link analytics | Account API | **You write it** | Stub | Custom (Links read, Analytics read, Billing API) |
| Customer billing | Billing API | **You write it** | Stub | Custom (Billing, Stripe API) |
| Payment events | Billing API | **You write it** | Stub | Custom: signature check and inbox (Billing, Stripe API) |
| Entitlements | Billing API | **You write it** | Stub | Custom (Billing) |
| Click aggregator | Analytics worker | **You write it** | Stub (loop on `click-events`) | Custom (consumes Click events, writes Analytics) |

Totals: 3 Generated (one template, three times), 0 Building block, 11 You write it, 0 Refused.
The report's 11 required custom gaps are exactly the 11 stubs. No catalog refusal was suppressed:
none arose while saving, and the refusals reproduced in section 5 are kept verbatim.

**Considered, not used** (installed, but they would not express the contract):

| Mechanism | Why not |
| --- | --- |
| Cache reader + Data access (`positive-cache-read`) for Hot routes | Its mounted route answers JSON, not a 302 pipeline, and caches only positive results with a template-fixed policy; mutable link state and freshness deadlines are G05. architecture.md: use a stub unless composition is proven |
| Event counter (`event-counter`) for Analytics | Keeps one receipt row per event for ever (Jeeves template-gaps "Known limits"); the bounded dedup horizon and dimensions are G07 |
| Redirect responder | Takes no connections ("Redirect responder can't connect; a Redirect responder takes no connections."), so its stub could not reach Links, Hot routes or Click events |
| Event publisher on Click events | Accepted in memory, but it is its own stub route ("No Generated module in Redirect service uses it, so you write it."); the redirect handler could not await its publish |
| Rate limiter, ID generator, External call | One slot each and their own routes; the create handler needs all of admission, slug allocation, reputation and entitlement in one request |

## 5. Generation report summary

[`generation-preview-r83.json`](jeeves/generation-preview-r83.json) (the Preview scaffold response,
SHA-256 `853f7ee6…a74d0`): `selected-source-v2`, **experimental-partial**; semantic complete true,
application complete false, runtime verification none, strict readiness not assessed; 0 findings;
84 files, archive `dcaff3aa004e3b2a04b09c2162e7b7c5295c13f4927d3ece31af9339b2a3cd14`, manifest
`c1868eab7b324a4db222f63715e73c16cc23c1c47aab94df337e1f58e6eb9632`. One local adapter treatment:
Identity's TypeScript language runs as Keycloak (unsupported intent, fixed local OIDC substitution).

| Process | Shape, exposure | Provisioned | Product SQL |
| --- | --- | --- | --- |
| `app-session-api` | HTTP, public `/api/session-api/` | Sessions read-write | sign-in flow, API forwarding |
| `app-link-api` | HTTP, internal | Links read-write, Admission cache (Valkey) | link operations, abuse and moderation |
| `app-redirect-service` | HTTP, public `/api/redirect-service/` | Links read (`SELECT on published`), Hot routes (Valkey), Click events publish (RabbitMQ work queue) | none |
| `app-account-api` | HTTP, internal | Links read, Analytics read | none |
| `app-billing-api` | HTTP, public `/api/billing-api/` | Billing read-write | customer billing, payment events, entitlements |
| `app-analytics-worker` | worker, loop on `click-events` | Analytics read-write, Click events consume | click aggregator |

Process settings are the descriptor defaults (request timeout 1000 ms and concurrency limit 1000
per HTTP tile, worker concurrency 1); they show in each tile's Options by mouse. Stack runnable:
yes. Every route stub answers 501 "Not implemented" until written.

## 6. Findings for Q03 (generic gaps)

Reproductions run in memory against saved revision 83 with the studio's builder
([commands/refusals-in-memory.json](commands/refusals-in-memory.json)), or read from the export.

| # | Finding | Reproduction | Related |
| --- | --- | --- | --- |
| F1 | No GCP Pub/Sub channel: Click events exports as a RabbitMQ work queue; the provider has no normal control | `edit click-events {provider: "google-cloud"}` → "provider has no installed, useful editable consumer for this target/value…"; report: "RabbitMQ work queue click-events and its .failed" | G12 |
| F2 | A route stub's request has no raw body: `ModuleRequest.body` is "Parsed JSON or text, up to 64 KiB" | Export `src/modules/entry.ts`; Payment events cannot check Stripe's signature over the exact bytes | G13 |
| F3 | A public tile is public as a whole: Billing API's Entitlements and Customer billing routes are on the edge at `/api/billing-api/modules/…` with an Optional guard; no per-route exposure and no workload identity for Link API and Account API calling it | Report processes: `billing-api … HTTP, public`; edge `/api/billing-api/` | G08 |
| F4 | A stub gets clients only for its own slots and cannot call another module in its tile (`ModuleCall` exists only for loader/items), so single-slot kinds cannot be composed into one handler; 11 of 14 modules are stubs, 10 of them Custom | Redirect responder: "Redirect responder can't connect…"; Event publisher accepted but "No Generated module in Redirect service uses it, so you write it."; slots files in the export | G04, G10 |
| F5 | Topic versus work queue has no control; a new channel stays a work queue unless a template derives a topic | `edit click-events {mode: "topic"}` → "mode has no installed, useful editable consumer…" | G12 (archive subscription is deployment) |
| F6 | Session API's OIDC client flow and cookie sessions are Custom; only guarded tiles receive `OIDC_ISSUER`/`OIDC_JWKS_URL` in Compose (Session API's environment is empty) | Export `compose.yaml` | G03, G10 |
| F7 | No scheduled trigger: Billing reconciliation, inbox processing and session/idempotency/retention cleanup have no owner call or schedule | Jeeves playbook "Gaps": scheduled work left to the developer | G11 |
| F8 | Event counter's unbounded receipts; positive cache read's JSON route and fixed policy | Section 4 | G07, G05 |
| F9 | Diagram notation: one action per lane and one entry per tile collapse the plan's five flows into two action words | `linkTiles {from: download, to: session-api}` → "Session API already starts the upload lane; a tile has one entry." | Notation only; no generation effect |
| F10 | Explicit resource authority and grants have no normal control; 18 ownership readiness findings remain although the export's provisioned grants are right | Blueprint v3 `ownershipFindings`; Source & diagnostics | Readiness only |

Not gaps but limits to keep in mind: a new Billing-kind tile is refused by design ("A new tile
can't be Billing…"); the 1000 ms default request timeout applies to the redirect's awaited publish
unless changed in Redirect service's Options (G04).

## 7. Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Studio app loads | Pass: the studio opened, board ready, "Server healthy" | screenshot [01](screenshots/01-tinyurl-simple.png) |
| TinyURL still renders on the lane canvas | Pass: the owner's "TinyURL · studio study" project (`41bbd268…`) drew 11 tiles and 11 lines in Simple and Detailed. It is the study as created on 2026-11-10, not a fresh copy of `studio-tinyurl@3.3.0`: creating one would add a project this unit may not add | [mouse/01](mouse/01-tinyurl-and-create.json) |
| New project reloads | Pass: a fresh browser load at revision 74 showed the menu "Project: QRWTY · production candidate v1", 19 nodes and 27 lines in Simple, no page errors; three more fresh loads opened revision 83 (final preview, re-export, fit screenshots). Revisions 75–83 changed only line labels | [mouse/03](mouse/03-connections-and-modules.json), [mouse/05](mouse/05-reexport-after-reload.json), [mouse/06](mouse/06-final-preview.json) |
| Every connection checked by mouse | Pass (at revision 74, the final structure): all 18 tiles and actions selected, Connections rows read (incoming and outgoing, with writes/reads/publishes/consumes/calls); all 27 lines clicked (7 through Choose relationship) and their endpoints, label and interaction read; 0 failures | [mouse/03](mouse/03-connections-and-modules.json) |
| Settings reachable by mouse | Pass: three Sign-in selects (two changed), Runnable processes checkbox, nine line labels typed, process Options (Request timeout, Concurrency limit) shown | [mouse/02](mouse/02-sign-in-and-processes.json), [mouse/04](mouse/04-labels-and-exports.json), screenshots 05, 06 |
| Every module page by mouse | Pass: 14 module rows opened; status as in section 4 | [mouse/03](mouse/03-connections-and-modules.json), screenshot [09](screenshots/09-detailed-module-open.png) |
| No catalog refusal suppressed | Pass: every saved command returned 200; refusals found while designing are recorded verbatim | [commands/](commands/) |
| Saved source equals the API and the report | Pass: downloaded source JSON, `GET /design` and the preview's `selectedSource` all have canonical SHA-256 `a3c978d1dc3f29229e942f7f73394ff4ff2fbc3d09ea4da12189d5202c9d753b`; it parses as a stored design and re-serialises identically | provenance.json |
| Export after reload is stable | Pass: a second export after a fresh load gave byte-identical PNGs and source JSON; the capture files differ only in `capturedAt` | [mouse/05](mouse/05-reexport-after-reload.json) |
| Readable at normal fit; no replicas or regions in Jeeves | Pass with the usual limit: Simple (1248×1394 board px, 27 lines) reads at fit with names and kind labels; Detailed (1888×1442, 35 lines) needs zoom for module rows, as the studies do. Lines that come back to Links, Identity and Billing API draw U shapes that can read as boxes (a known Jeeves layout limit). No replica, autoscaling, region or provider value was set | screenshots [fit-r83-simple](screenshots/fit-r83-simple-fit.png), [fit-r83-detailed](screenshots/fit-r83-detailed-fit.png) |
| Artifact hashes recompute | Pass: `sha256sum -c SHA256SUMS` | [SHA256SUMS](SHA256SUMS) |

## Not run

No Jeeves suite (no Jeeves file changed). No export build, Compose start or runtime check: Q02
freezes and builds the as-found export. No chat model, cloud, Stripe or paid call. The A ledger
attempt `a-0001` was started by this worker; usage, end time and `commits.after` are the
coordinator's.

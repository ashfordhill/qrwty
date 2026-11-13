# Architecture, generation and the remaining diagrams

The Jeeves diagram is authoritative for generated files. Excalidraw explains product policy and
deployment that Jeeves does not model. The two must agree on service names and flows, but an
Excalidraw box does not install a template. See the [overview drawing](../../diagrams/system-overview.svg).

## Proposed logical services

Keep responsibilities distinct even if deployment later co-locates some processes. Separate
redirect capacity from account traffic and analytics failures. The first diagram uses installed
Service/Worker/Identity/Database/Cache/Topic/External API kinds; do not revive legacy Redirect
or Gateway kinds merely because their names sound appropriate.

| Tile | Responsibility | Store ownership / dependencies |
| --- | --- | --- |
| Session API | Same-origin browser facade, OIDC code/PKCE flow, cookie sessions and CSRF; guest create passes without login | Sole writer of Sessions; calls Identity, Link API and Account API; never invents an identity header |
| Link API | Guest create, claim, owned mutations, abuse reporting and operator decisions | Sole writer of Links; Optional sign-in; Admission cache; Reputation API adapter |
| Redirect service | Resolve host+slug, freshness/expiry/policy checks, 302, enqueue local telemetry attempt | Reads Links public route view; owns Hot routes cache; calls Telemetry intake |
| Account API | Required identity, owned list and analytics reads | Reads approved Links owner view and Analytics; no second writer of Links |
| Telemetry intake | Internal authenticated, bounded batch acceptance and publish | Owns Click events topic; broker may be unavailable without killing Redirect |
| Analytics worker | Validate, deduplicate, aggregate, expire, expose read view | Consumes Click events; sole writer of Analytics |
| Identity | Verified account identity | Local Keycloak while testing; managed issuer is a deployment compatibility decision |
| Links | Durable routes, ownership, claim/idempotency data, tombstones | PostgreSQL; public and account views have separate grants |
| Sessions | Encrypted tokens, session expiry and revocation state | Separate restricted PostgreSQL logical database; never queried by Redirect |
| Hot routes | Short-lived route metadata | Valkey; replaceable, never source of truth |
| Admission cache | Approximate distributed abuse/admission counters | Valkey; durable hard account limits belong in Links transactions |
| Click events | Asynchronous delivery of accepted batches | Topic + subscriber queue; replay/retention/dead-letter policy explicitly bounded |
| Analytics | Aggregates plus bounded dedup data | Initially separate PostgreSQL logical database; larger analytical store requires a measured decision |
| Reputation API | Destination reputation check | External API stub; real bounded adapter belongs to product code |

An external safety/moderation operator is a role reaching Link API through an authenticated
administrative route, not an all-powerful database user or a public UI shortcut. Rechecks and
retention jobs execute under the owning service, or via a new explicitly drawn queue/worker if
that becomes necessary; don't silently introduce a second Links writer.

### Lane and connection checklist for Q01

- Read/download actions: **Open link** → Redirect service; **My links and analytics** and
  **Sign in** → Session API. Write/upload action: **Create or manage a link** → Session API.
- Session API → Identity, Sessions, Link API and Account API: four outgoing connections. It
  forwards valid bearer tokens, or no token on guest create; downstream guards verify them.
- Link API → Links, Identity, Admission cache, Reputation API: four outgoing connections.
- Redirect → Links, Hot routes, Telemetry intake: three. Its telemetry HTTP call is **solid**:
  the product schedules it off the response path, but the transport is still a direct request.
- Account API → Identity, Links, Analytics: three. The Session API routes mutations to Link API;
  Account API does not forward writes or impersonate the user.
- Telemetry intake ⇢ Click events ⇢ Analytics worker → Analytics. Only channel connections are
  dashed. No direct call to a Worker, outgoing store link, loop or invented replica tile.
- The application graphs may share one physical managed Postgres cluster initially while keeping
  database identities/grants separate. That placement is an Excalidraw/cloud concern.
- Check actual lane validation and module slot rules. If the current catalog refuses a proposed
  connection, record the exact refusal; revise the proposal or commission the necessary generic
  unit. Never save invalid JSON to make the screenshot look right.

## Installed mechanisms versus work still required

Snapshot-specific: re-audit after other agents finish. The words Template, Part and Stub must match
the actual generation report, not the table author's intention.

| Capability | Current usable mechanism | QRWTY work / limitation |
| --- | --- | --- |
| Process lifecycle, HTTP admission, logs | Runnable processes | Cloud health/readiness, secret/endpoint injection, non-root image, limits and real probes need audit |
| Sign-in | `auth-guard` → `verified-identity` | Optional on Link API, Required on Account API; product authorization and BFF/session remain custom |
| Public redirects | `custom` or `redirect-responder` typed route stub | Implement lookup/policy/302 in product body; response headers already supported |
| Route cache | `cache-reader` + Data access can select `positive-cache-read` | Its mounted JSON route is not a redirect pipeline. Do not assume mutable policy/TTL composition; use a stub unless composition is proven |
| Slugs, claims, owned link CRUD | `id-generator`, `data-access`, `custom` stubs | Random allocation, transactions, optimistic updates, guest proof and product SQL |
| Admission/rate limiting | `rate-limiter` stub | Distributed mechanism and product policy; edge approximation is not a hard global quota |
| Telemetry intake | Service stub with queue dependency | Bounded request/batch validation, internal auth, stable IDs and backpressure |
| Aggregation | `event-counter` exists; stub consumer is also available | Existing unbounded receipts and basic sum are insufficient for retention/dimensions at target scale |
| Saved links | Owned link data and product endpoints | Do not add Favorites just to raise generated LOC. Favorites means bookmarking arbitrary items, not ownership |
| Reputation provider | External API connection gives a stub | Current unavailable client needs a supported adapter seam or product-owned HTTP client with bounded config |
| Cloud infrastructure and UI | Outside Jeeves | Project-owned IaC, edge routing, website and design assets; measured separately |

There is no promise of 60% generation for this app. The aim is to discover reusable mechanisms
and reduce total effort while retaining correct code. Do not add video, search, favorites or
unused framework scaffolding to improve the percentage.

## Required capability audit / potential gaps

Q03 creates `docs/evidence/q03/capabilities.md` with for each row: inspected commit, minimal
reproduction, actual supported seam, proposed remedy, owning repo/unit and verification. These
are candidates, not claims that every item requires new generator code.

| Gap ID | Probe | Allowed remedy / stop condition |
| --- | --- | --- |
| G01 | Managed DB/cache/broker endpoints, CA verification, secrets and IAM/credentials | Generic runtime bindings configured at execution time; deployment supplies values. No new cloud sizing controls on Jeeves canvas |
| G02 | Atomic create/idempotency/claim and mutation+outbox | Product single-statement SQL when sufficient; otherwise generic transaction dependency with scoped connection, rollback and retry tests |
| G03 | Managed OIDC tokens pass guard with correct issuer/audience/JWKS | Generic explicit runtime auth binding. Never disable audience verification or accept an ID token as API auth merely to pass a test |
| G04 | Redirect survives broker, telemetry and identity outages, including cold startup | No broker/identity dependency in Redirect. Intake and aggregation may fail independently; local buffers bounded |
| G05 | Cache expiry, stale fill race, max age and recovery after a cache timeout | Reusable mutable read mechanism if warranted; otherwise product stub. Never refresh the original validation timestamp on cache-to-cache transfer |
| G06 | Repeat-safe migrations against managed Postgres without local superuser assumptions | Versioned immutable migration history, lock, least-privilege migration role; product DDL remains product-owned |
| G07 | Bounded aggregate storage, dedup/replay, poison events and high-throughput batches | Reusable batch/retention mechanism or declared product implementation; never run unlimited receipts and call it scale-ready |
| G08 | Internal HTTP routes are protected and public paths mapped safely | App-owned edge route map/internal auth; generated module routes inaccessible directly from the Internet |
| G09 | Container non-root, graceful drain, liveness versus readiness, credential rotation | Generic runtime fix where generated; deployment options in IaC, never patched emitted files |
| G10 | External reputation client and cookie/session integration usable from stubs | Narrow product adapters where an honest extension seam exists; generic seam otherwise |
| G11 | Bounded telemetry sender start/stop/drain and scheduled session/idempotency/retention cleanup | Explicit lifecycle seam or authenticated scheduled call into the store owner; repeat-safe jobs with locks/leases. No untracked timer started on every request |

Generator changes occur only in separately assigned Jeeves units, after the current plans. Each
obeys Jeeves AGENTS.md, required checks, append-only handoff and local commit. QRWTY agents do not
silently take those units. Count all QRWTY-motivated template work against the experiment. If a
gap is blocked, finish independent authorized work and report the blocked dependent unit without
weakening requirements or patching generated files.

## Artifacts to save from Jeeves

Under `docs/architecture/jeeves/`, save `design.json` (original round-trippable project/export),
`blueprint.json` (derived API view), `simple.png`, `detailed.png`, `generation-report.json`, and
`provenance.json`. Include actual filenames/format returned by Jeeves if they differ; do not
rename a blueprint into a design. Provenance records project ID, revision, export time, Jeeves
commit, registry/template/source hashes and image/design SHA-256 values. Keep the ZIP or its
content-addressed artifact reference and payload manifest.

Reopen the saved design and export again. Compare canonical design and payload bytes according
to Jeeves's documented rules; verify CLI and studio ZIP payload agreement. Keep a named saved
project in the owner's studio for review. Never overwrite TinyURL or another agent's project.
The root README gets the **actual** simple image and links to detailed/export files only then.

## What still needs diagramming after generation

“Non-deterministic” here means authored product choices and implementation, not that the running
software should behave unpredictably. Give each diagram one job:

| Drawing | Shows | Associated proof |
| --- | --- | --- |
| [System overview](../../diagrams/system-overview.svg) | Public and account paths, service owners, telemetry boundary | Saved Jeeves graph plus catalog/report audit |
| [Guest ownership](../../diagrams/guest-ownership.svg) | Creation, one-time proof, concurrent claim, account boundary | A01–A06 |
| [Redirect and failure](../../diagrams/redirect-failure.svg) | Freshness, outage behavior, analytics boundary | A07–A13, F01–F06 |
| [Cloud deployment](../../diagrams/cloud-deployment.svg) | Edge, AZs, private stores, backup and regional recovery | D01–D07, L01–L05 |
| Q06 link-state sheet | Active/disabled/blocked/deleted and allowed actors | A07/A08, A16 |
| Q10 event-lifecycle sheet | Accepted, published, retried, deduplicated, expired, dead-lettered | A10–A13 |
| Q11 UI flow sheet | Create/result/claim/library/edit/analytics/error states | U01–U08 |
| Q15 recovery sequence | Failure detected → traffic fenced → restore/promote → verify → resume | D04–D07 |

Use the same names as code and saved Jeeves modules. Keep these editable in Excalidraw and render
SVG/PNG beside them. Changes to behavior update the relevant diagram and evidence, not every
historical image. Avoid a giant sheet combining infrastructure, state machines and UI mockups.

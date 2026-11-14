# Architecture, generation and the remaining diagrams

The Jeeves diagram is authoritative for generated files. Excalidraw explains product policy and
deployment that Jeeves does not model. The two must agree on service names and flows, but an
Excalidraw box does not install a template. See the [overview drawing](../../diagrams/system-overview.svg).

## Proposed logical services

Keep responsibilities distinct even if deployment later co-locates some processes. Separate
redirect capacity from account traffic and analytics processing failures. Durable event publication
is now a required redirect dependency. The first diagram uses installed
Service/Worker/Identity/Database/Cache/Topic/External API kinds; do not revive legacy Redirect
or Gateway kinds merely because their names sound appropriate.

| Tile | Responsibility | Store ownership / dependencies |
| --- | --- | --- |
| Session API | Same-origin browser facade, OIDC code/PKCE flow, cookie sessions and CSRF; guest create passes without login | Sole writer of Sessions; calls Identity, Link API, Account API and Billing API; never invents an identity header |
| Link API | Guest create, claim, owned mutations, abuse reporting and operator decisions | Sole writer of Links; Optional sign-in; Admission cache; Reputation API; Billing API grants for owned operations |
| Redirect service | Resolve host+slug, freshness/expiry/policy, await durable event ACK, then 302 | Reads Links public route view; owns Hot routes cache; sole publisher of Click events; no sign-in/payment dependency |
| Account API | Required identity, owned list and analytics reads | Reads approved Links owner view and Analytics; checks Billing API entitlements; no second writer of Links |
| Billing API | Customer Checkout/portal, signature-verified webhook inbox, subscription reconciliation and entitlements | Sole writer of Billing; Identity and Stripe API; Optional guard with explicitly authorized handlers |
| Analytics worker | Validate, deduplicate, aggregate, expire, expose read view | Consumes Click events; sole writer of Analytics |
| Identity | Verified account identity | Local Keycloak while testing; managed issuer is a deployment compatibility decision |
| Links | Durable routes, ownership, claim/idempotency data, tombstones | PostgreSQL; public and account views have separate grants |
| Sessions | Encrypted tokens, session expiry and revocation state | Separate restricted PostgreSQL logical database; never queried by Redirect |
| Billing | Customer mappings, inbox, subscription/entitlement revisions and jobs | Restricted PostgreSQL logical database; no raw card data |
| Hot routes | Short-lived route metadata | Valkey; replaceable, never source of truth |
| Admission cache | Approximate distributed abuse/admission counters | Valkey; durable hard account limits belong in Links transactions |
| Click events | Durable publication before response; asynchronous analytics/archive delivery | Topic + subscriber queue; GCP Pub/Sub needs a proven adapter; no local fire-and-forget buffer |
| Analytics | Aggregates plus bounded dedup data | Initially separate PostgreSQL logical database; larger analytical store requires a measured decision |
| Reputation API | Destination reputation check | External API stub; real bounded adapter belongs to product code |
| Stripe API | Hosted payment/subscription provider | External API stub; signed incoming webhook enters Billing API through an explicit public action |

Cloud Storage's independent archive export subscription is deployment infrastructure, configured
prepared locally in Q04, verified live in Q12a/Q13. It is shown in Excalidraw, not offered as an installed Jeeves generation
feature. The native Pub/Sub topic, publisher and analytics subscriber require G12 to pass.

An external safety/moderation operator is a role reaching Link API through an authenticated
administrative route, not an all-powerful database user or a public UI shortcut. Rechecks and
retention jobs execute under the owning service, or via a new explicitly drawn queue/worker if
that becomes necessary; don't silently introduce a second Links writer.

### Lane and connection checklist for Q01

- Read/download actions: **Open link** → Redirect service; **My links and analytics** and
  **Sign in** → Session API. Write/upload actions: **Create or manage a link** and **Manage my plan**
  → Session API; **Receive payment event** → Billing API (provider-origin signature required).
- Session API → Identity, Sessions, Link API, Account API and Billing API: five outgoing connections. It
  forwards valid bearer tokens, or no token on guest create; downstream guards verify them.
- Link API → Links, Identity, Admission cache, Reputation API, Billing API: five outgoing connections.
- Redirect → Links, Hot routes, Click events: three. Click events is a channel connection,
  drawn dashed; asynchronous transport does not mean the caller can skip awaiting durable ACK.
- Account API → Identity, Links, Analytics, Billing API: four. Session API routes mutations to Link API;
  Account API does not forward writes or impersonate the user.
- Billing API → Identity, Billing, Stripe API: three. Incoming provider webhook is a public action,
  not an unsupported reverse connection out of an External API tile. Recheck handler limits.
- Redirect ⇢ Click events ⇢ Analytics worker → Analytics. Only channel connections are
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
| Sign-in | `auth-guard` → `verified-identity` | Optional on Link/Billing APIs, Required on Account API; every owner handler still authorizes explicitly |
| Public redirects | `custom` or `redirect-responder` typed route stub | Implement lookup/policy/302 in product body; response headers already supported |
| Route cache | `cache-reader` + Data access can select `positive-cache-read` | Its mounted JSON route is not a redirect pipeline. Do not assume mutable policy/TTL composition; use a stub unless composition is proven |
| Slugs, claims, owned link CRUD | `id-generator`, `data-access`, `custom` stubs | Random allocation, transactions, optimistic updates, guest proof and product SQL |
| Admission/rate limiting | `rate-limiter` stub | Distributed mechanism and product policy; edge approximation is not a hard global quota |
| Durable clicks | Service stub with channel dependency | Await durable ACK before 302; GCP Pub/Sub provider seam, stable IDs, bounded waits and backpressure |
| Billing | Service/External API stubs | Hosted Checkout/portal, raw signed webhook, durable inbox, reconciliation and entitlements; no installed subscription template assumed |
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
are candidates, not claims that every item requires new generator code. Under revision 3, Q04
proves local adapter/runtime behavior; Q12a holds managed IAM/TLS/provider/hosting checks. A
deferred live check is neither a pass nor a reason to block unrelated local implementation.
The actual production adapter must still be implemented before the local baseline is frozen.

| Gap ID | Probe | Allowed remedy / stop condition |
| --- | --- | --- |
| G01 | Managed DB/cache/broker endpoints, CA verification, secrets and IAM/credentials | Generic runtime bindings configured at execution time; deployment supplies values. No new cloud sizing controls on Jeeves canvas |
| G02 | Atomic create/idempotency/claim and mutation+outbox | Product single-statement SQL when sufficient; otherwise generic transaction dependency with scoped connection, rollback and retry tests |
| G03 | Managed OIDC tokens pass guard with correct issuer/audience/JWKS | Generic explicit runtime auth binding. Never disable audience verification or accept an ID token as API auth merely to pass a test |
| G04 | Redirect awaits durable ACK; survives identity/consumer faults; publisher failure returns 503 and recovers | No identity dependency. Bounded publisher queue/retries; liveness independent of temporary dependency readiness; no fail-open redirect |
| G05 | Cache expiry, stale fill race, max age and recovery after a cache timeout | Reusable mutable read mechanism if warranted; otherwise product stub. Never refresh the original validation timestamp on cache-to-cache transfer |
| G06 | Repeat-safe migrations against managed Postgres without local superuser assumptions | Versioned immutable migration history, lock, least-privilege migration role; product DDL remains product-owned |
| G07 | Bounded aggregate storage, dedup/replay, poison events and high-throughput batches | Reusable batch/retention mechanism or declared product implementation; never run unlimited receipts and call it scale-ready |
| G08 | Internal HTTP routes are protected and public paths mapped safely | App-owned edge route map/internal auth; generated module routes inaccessible directly from the Internet |
| G09 | Container non-root, graceful drain, liveness versus readiness, credential rotation | Generic runtime fix where generated; deployment options in IaC, never patched emitted files |
| G10 | External reputation client and cookie/session integration usable from stubs | Narrow product adapters where an honest extension seam exists; generic seam otherwise |
| G11 | Awaited publisher start/stop/drain; scheduled session/idempotency/retention/billing cleanup | Lifecycle seam or authenticated scheduled owner call; repeat-safe jobs with leases/fencing. No after-response durability or per-request timers |
| G12 | Native Pub/Sub publisher ACK, IAM, regional endpoint, subscriptions, redelivery and worker hosting | Generic installed provider/adapter support with real managed-service proof; do not rename RabbitMQ wiring or force an HTTP-less worker into a Cloud Run service |
| G13 | Exact raw webhook bytes available before JSON parsing; route auth supports signed public provider events | Generic bounded raw-body seam where missing; Stripe SDK verification in product hook. Test byte changes, body limits and both auth modes |

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
| [System overview](../../diagrams/system-overview.svg) | Public/account paths, durable publication boundary, billing | Saved Jeeves graph plus catalog/report audit |
| [Guest ownership](../../diagrams/guest-ownership.svg) | Creation, one-time proof, concurrent claim, account boundary | A01–A06 |
| [Redirect and failure](../../diagrams/redirect-failure.svg) | Freshness, outage behavior, analytics boundary | A07–A13, F01–F06 |
| [Cloud deployment](../../diagrams/cloud-deployment.svg) | Cloudflare/GCP, managed regional durability, archive and recovery | D01–D07, L01–L05 |
| [Billing lifecycle](../../diagrams/billing-lifecycle.svg) | Checkout, signed webhook/inbox, reconciliation, entitlements and downgrade | A19–A23, Q10a–Q10b |
| Q06 link-state sheet | Active/disabled/blocked/deleted and allowed actors | A07/A08, A16 |
| Q10 event-lifecycle sheet | Durable ACK, response attempt, archive, replay, dedup, retention and quarantine | A10–A13, A24 |
| Q11 UI flow sheet | Create/result/claim/library/edit/analytics/billing/error states | U01–U08 |
| Q15 recovery sequence | Failure detected → traffic fenced → restore/promote → verify → resume | D04–D07 |

Use the same names as code and saved Jeeves modules. Keep these editable in Excalidraw and render
SVG/PNG beside them. Changes to behavior update the relevant diagram and evidence, not every
historical image. Avoid a giant sheet combining infrastructure, state machines and UI mockups.

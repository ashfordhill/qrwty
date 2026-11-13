# Product and correctness contract

Revision 1, proposed defaults. Changes are shared by both experiment arms before either implements
them. The acceptance IDs below link to [acceptance](acceptance.md).

## Release 1

The public page creates a short link and its downloadable QR code without a sign-in. The result
offers copy, open, PNG and SVG download, plus a quiet invitation to save it to an account. The
account area lists owned links, allows destination changes, disable/delete and basic click
analytics. “Saved” initially means owned links; arbitrary bookmarks are a separate feature.

No paid plans, organizations, team invitations, vanity aliases, custom domains, developer API
keys, bulk campaigns, device hardware, geofencing or custom landing-page builder in release 1.
These are scope decisions, not claims that enterprise buyers never need them. QRWTY can be
production-quality before selling enterprise contracts.

| Operation | Anonymous | Signed in | Invariant |
| --- | --- | --- | --- |
| Create random short link / QR | Yes | Yes, owned immediately | No auth redirect before success |
| Follow a public link | Yes | Yes | No account or session lookup in the redirect path |
| Claim a guest link | No | With unexpired, one-time claim proof | Knowing the slug or destination is insufficient |
| List, edit, disable, delete | No | Owner only | Server checks every object; client filters do not authorize |
| Analytics and CSV export | No | Owner only | Public slug reveals no private analytics |
| Abuse report | Yes, bounded | Yes | Does not disable a link just because a report was submitted |
| Moderate a link | No | Separate operator permission | No public endpoint trusts a caller-supplied role or account ID |

## Anonymous creation and claiming

1. Validate the destination and enforce admission/abuse policy before allocating durable state.
2. Allocate a CSPRNG slug (proposed 10 base62 characters, about 60 bits). Enforce the unique
   `(domain_id, slug)` constraint in the database; retry collisions within a fixed bound. Do not
   use a timestamp, exposed sequence or in-process counter. Reserve application paths.
3. Atomically persist the link, idempotency result and hash of a random 256-bit claim secret.
   An acknowledged create must survive a process restart. A database error never becomes success.
4. Return the URL immediately. For guest creation, also return proof to the creating browser,
   over TLS, with a 24-hour expiry. Keep it in session-scoped browser storage for this flow, never
   in the short URL, QR, referrer or logs. OAuth redirect within the same tab preserves it.
   Publish the limitation: closing the session may lose the ability to claim; the link still works.
5. Claim requires a verified account plus the proof. In one database transaction, compare the
   hashed proof, expiry and unowned state, assign the owner, consume the proof and store the
   idempotent result. Concurrent claims have one winner. Repeat by the same owner may succeed
   idempotently; another owner receives no private detail. Never claim by matching IP or email.

Idempotency keys are required for browser create/claim requests; scope them to the verified owner
or a server-issued guest session. Store a request hash. Same key/same request returns the same
result; same key/different request returns 409. Proposed TTL is 24 hours. If the replay response
must include the claim proof, encrypt that small replay payload at rest with a rotated service
key; store the verifier as a hash. Do not store the proof in plaintext just for replay convenience.
Guest session is an opaque abuse/idempotency handle, not a user account or ownership authority.

## Link state and URL semantics

Each link has an internal ID, domain, slug, exact validated destination, nullable owner subject,
state, monotonically increasing version, creation/update timestamps and optional absolute expiry.
Keep claim proof and idempotency data in separate restricted tables. Use UTC timestamps.

States: `active`, `disabled`, `blocked`, `deleted`. An account may edit an active or disabled
link, disable/enable its own link, or delete it. Only the abuse operator may block/unblock it;
owners cannot enable a blocked link. A soft deletion is a permanent tombstone for that slug.
Never recycle a printed link into another person's destination. Guest links are immutable until
claimed. The proposed guest policy has no automatic expiry; the owner must confirm that cost.

Updates use optimistic concurrency (`If-Match` version); stale updates return 412. Database
mutation, version increment and any durable change event/outbox are one transaction. A single
statement/CTE can implement an atomic operation where clear; multi-statement work requires a
reserved connection or an explicit transaction API. A pool's standalone `query` calls do not
provide this guarantee. SQL stays product-owned unless it implements a generic template.

Only absolute HTTP(S) destinations. Reject credentials in URLs, control characters, invalid
ports/hosts, non-public IP literals, localhost/private/internal destinations, excessive length
(proposed 8 KiB UTF-8), QRWTY redirect loops and reserved paths. Normalize only the host, scheme
and agreed canonical components; preserve query order, escaping and case-sensitive path/query
semantics. Display the normalized host before creation, handle IDNs visibly, and never put the
full destination/query into analytics logs. A URL shortener intentionally redirects externally;
validation is not an allowlist of QRWTY-owned sites.

The backend never fetches arbitrary destinations to create a preview. Reputation scanning is a
bounded provider adapter. Any future crawler must reject private/metadata addresses after every
DNS resolution and redirect, with an isolated egress policy, byte/time/redirect bounds and no
credentials. Creation fails with a retryable 503 if required reputation checking is unavailable;
existing permitted redirects continue.

## HTTP contract to freeze in Q00/Q06

These are proposed public routes. Q03 verifies their mapping to generated `/modules/<id>` routes;
do not edit generated dispatch files to obtain pretty paths. Domain/path configuration belongs
in the app's edge/deployment layer.

| Method and route | Result | Authentication |
| --- | --- | --- |
| `POST /api/v1/links` | 201, `{id, shortUrl, destination, version, claim?}` | Optional; invalid supplied credential is 401 |
| `POST /api/v1/links/{id}/claim` | 200, owned link; 409/410 for consumed/expired proof without data leakage | Required + proof |
| `GET /api/v1/me/links?cursor=...` | Cursor page, max 50, stable `(created_at,id)` order | Required |
| `PATCH /api/v1/links/{id}` | 200 + next ETag; 412 on stale version | Owner, version precondition |
| `DELETE /api/v1/links/{id}` | 204, repeat-safe tombstone | Owner |
| `GET /api/v1/links/{id}/analytics` | Counts, range, freshness, coverage, bot definition | Owner; bounded range |
| `GET /api/v1/links/{id}/analytics.csv` | Bounded export; spreadsheet-safe fields | Owner |
| `POST /api/v1/abuse-reports` | 202 acknowledgment, no reporter-visible disposition | Public, rate-limited |
| `GET /{slug}` | 302 + `Location`; no application session required | Public |
| `HEAD /{slug}` | Same location/status, no body and no click event | Public |

Use 302 for mutable links and `Cache-Control: no-store` on the client response. Do not cache a
permanent 301/308 in the browser. Cache **routing metadata** internally with a bounded freshness
deadline. Unknown slug: 404; deleted/expired: 410; blocked: 403 safety page without `Location`;
disabled: 410; lookup unavailable with no valid cache: 503 + `Retry-After`. The UI gives useful
copy without leaking an owner. Reject unsupported redirect methods with 405.

No forwarding arbitrary inbound query parameters into the destination. Preserve the destination
as saved; adding campaign parameters later is an explicit product feature. Treat supplied Host
and proxy headers as untrusted unless inserted by the authenticated edge. Route on an allowlisted
hostname and validated slug, not arbitrary full URLs. Partition cache keys by hostname.

## Identity and isolation

Use managed OIDC through a tested provider adapter. The web flow uses authorization code + PKCE,
state and nonce. Prefer a same-origin backend-for-frontend session with Secure, HttpOnly cookies,
CSRF defense on mutations and a bounded session store. Keep bearer tokens out of localStorage.
That session/BFF implementation is backend source, even though it supports the UI; count it.

The BFF forwards a token the generated guard actually validates. Verify issuer, audience, expiry,
signature, allowed algorithm and key rotation. A browser-supplied `x-user-id` is never an identity.
Malformed/expired credentials fail; do not silently downgrade to a guest. Optional authentication
does not mean authorization is optional on edit/list/claim routes. Logged-out creation intentionally
sends no credential. Existing redirects survive an identity outage.

Every owner query uses the server's verified subject. Ownership predicates apply to reads,
updates, deletes, analytics and exports, including pagination cursors. Two-account cross-ID tests
are mandatory. Public published views expose only routing fields, never claim hashes or account
identifiers. An account-facing read view may expose ownership to its restricted service login;
that service must still scope each query. Prefer an owner API over broadly granting private tables.

## Analytics and data minimization

“Click” means an eligible GET resolved by QRWTY, not proof a human reached the destination. HEAD,
health probes and known test traffic do not count. Show observed redirects and filtered clicks
with the filter version; don't label IP-based estimates as exact unique people. QR versus copied
link cannot be distinguished when both encode the same URL; do not invent attribution.

Events contain a stable event ID, link ID, event time, schema version and only approved coarse
dimensions (for example country, referrer hostname and device class). Strip referrer paths,
queries, destination URLs, raw authorization and cookies. Proposed raw sanitized retention is
7 days, daily aggregates 13 months, operational logs 14 days; confirm residency and privacy policy
before launch. Do not keep raw IP addresses in product analytics. Security abuse data has a
separate restricted retention decision and must not silently reuse analytics data.

At-least-once processing requires deduplication and an explicit replay horizon. The dedup retention
must exceed every allowed redelivery/replay horizon, or older batches are refused and rebuilt
from an isolated source. At high traffic, one relational receipt per click forever is unacceptable.
Q10 must prove bounded storage and aggregate correctness with duplicates, late and out-of-order
events. A crash before durable intake may lose a click under D09; expose gaps and distinguish
observed drops from unmeasurable crash loss. Never advertise these counts as financial-grade.

Account deletion removes ownership/private data and follows the confirmed link-retention policy.
Keep tombstones to prevent reassignment. Deletion must propagate through aggregates, raw event
retention, exports and restored backups according to a documented restore procedure. Q00 settles
whether owned links are disabled or explicitly transferred on account deletion; default: disable.

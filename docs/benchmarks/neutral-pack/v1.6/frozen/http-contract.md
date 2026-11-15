# External HTTP and event contract v1

Frozen by Q00 (product contract: "HTTP contract to freeze in Q00/Q06"). This is the observable
surface the neutral oracle drives, identical for both arms. Internal service routes, generated
module paths, cookie names, database schemas and process layout are each arm's own choice.
Status codes and the fields named here are binding; other response fields may be added.

## 1. Origin, hosts and paths

- One public origin per environment serves the UI, `/api/v1/*`, `/auth/*` and short links
  `/{slug}`. It is configuration (`PUBLIC_ORIGIN`); the test-mode preview uses `https://qrwty.io`.
  `shortUrl` is `<PUBLIC_ORIGIN>/<slug>`.
- A request whose `Host` is not allowlisted is refused without `Location` (404 or 421).
- A slug matches `^[0-9A-Za-z]{10}$`. Other paths never redirect.
- Reserved first path segments, never allocated as slugs and never redirected: `api`, `auth`,
  `assets`, `static`, `app`, `account`, `pricing`, `billing`, `login`, `logout`, `healthz`,
  `readyz`, `.well-known`, `favicon.ico`, `robots.txt`.

## 2. Conventions for `/api/v1`

- JSON in UTF-8. Timestamps RFC 3339 in UTC. Dates `YYYY-MM-DD` in UTC.
- Product errors use `{"error": {"code": "<code>", "message": "<text>", "retryable": <bool>}}`,
  optionally with `"reason"`. The status code is authoritative; a guard's 401 body may differ.
- **Idempotency.** `Idempotency-Key` (1–255 visible ASCII characters) is required on
  `POST /api/v1/links`, `POST /api/v1/links/{id}/claim`, `POST /api/v1/billing/checkout` and
  `DELETE /api/v1/me`. Missing: 400 `idempotency_key_required`. Same key and same request within
  24 hours: the same status and body, including any claim proof. Same key, different request:
  409 `idempotency_conflict`. Scope: the verified account, or the guest session.
- **CSRF.** Every cookie-bearing mutation (`POST`, `PATCH`, `DELETE` under `/api/v1`, and
  `POST /auth/logout`) needs `X-CSRF-Token` equal to the session's token from
  `GET /api/v1/session`; otherwise 403 `csrf_failed`. The webhook is exempt.
- **Limits.** 429 `rate_limited` with `Retry-After` in seconds.
- **No existence oracle.** Another account's object and an unknown ID both return 404 `not_found`.
- **Versions.** A link has an integer `version`. A single-link response carries
  `ETag: "<version>"`. `PATCH` needs `If-Match: "<version>"`: missing 428 `precondition_required`,
  stale 412 `version_conflict`.

## 3. Session and sign-in

| Request | Result |
| --- | --- |
| `GET /api/v1/session` | 200 `{authenticated, csrfToken, account}`; `account` is `null` for a guest. Issues an opaque guest session when none exists (an idempotency and abuse handle, never an identity) |
| `GET /auth/login?returnTo=<relative path>` | 302 to the issuer: authorization code with PKCE `S256`, `state` and `nonce`. A non-relative `returnTo` becomes `/` |
| `GET /auth/callback` | Success: 302 to `returnTo`. Cancel or failure: 302 to `returnTo` with `signin=cancelled` or `signin=failed` added |
| `POST /auth/logout` | 204; the session is revoked server-side |

An expired, revoked or invalid session on any `/api/v1` request is 401 (`session_expired` or
`unauthenticated`), including on `POST /api/v1/links`: a supplied bad credential is never
treated as a guest. Sessions use Secure, HttpOnly, same-site cookies; tokens never reach the
browser.

## 4. Links

A link object is `{id, shortUrl, destination, version, state, createdAt, updatedAt, expiresAt}`,
with `state` one of `active`, `disabled`, `blocked`. Deleted links are not returned.

| Request | Result |
| --- | --- |
| `POST /api/v1/links` `{destination, expiresAt?}` | 201 link plus `owned` (bool); a guest create also returns `claim: {token, expiresAt}` (24 hours). 400 `invalid_destination`; 422 `reputation_rejected`; 503 `reputation_unavailable` with `Retry-After`; 403 `quota_exceeded` with `limit`, `used`, `periodEnd`; 429 |
| `POST /api/v1/links/{id}/claim` `{claimToken}` | Signed in only (else 401). 200 owned link; a repeat by the same owner is 200 with the same link. 403 `claim_invalid`; 409 `claim_consumed` (also when another account owns it; no private fields); 410 `claim_expired`; 403 `quota_exceeded` (the link stays unclaimed and working) |
| `GET /api/v1/me/links?cursor&limit` | 200 `{items, nextCursor}`; newest first by `(createdAt, id)`; `limit` default 20, above 50 is 400 `invalid_request`; a foreign or malformed cursor is 400 `invalid_cursor` |
| `GET /api/v1/links/{id}` | 200 owned link with `ETag` |
| `PATCH /api/v1/links/{id}` `{destination?, state?, expiresAt?}` | `state` may be `active` or `disabled`. 200 with the new `ETag`; 412; 428; 409 `blocked_by_operator`; 400 `invalid_destination`; reputation errors as on create |
| `DELETE /api/v1/links/{id}` | 204, and 204 again on repeat; the slug is a permanent tombstone |

**Destination rules** (examples in the [acceptance specification](acceptance-oracle.md#a09-destination-corpus)):
absolute `http` or `https` only; no credentials; no control characters (a literal CR, LF, tab or
other C0/C1 character is rejected; percent-encoded bytes are kept); valid host and port 1–65535;
no non-public IP literal in any notation; no `localhost`, `*.localhost`, `*.local`, `*.internal`
or single-label host; no host on the public origin (loop); at most 8,192 bytes. The only
normalization is lowercasing the scheme and host, removing a default port and converting an
international host to its A-label. Path, query (order, case and escapes) and fragment are kept.

## 5. Redirect

| Request | Result |
| --- | --- |
| `GET /{slug}`, active and valid | 302, `Location` equal to the saved destination, `Cache-Control: no-store`, and `QRWTY-Click-Event: <eventId>`. Sent only after the event's durable acknowledgment |
| Unknown slug | 404 |
| Deleted, disabled or expired | 410 |
| Blocked | 403 safety page |
| Route lookup unavailable with no valid cache entry; publish rejected, timed out, ambiguous or over capacity | 503 with `Retry-After` |
| A post-wait recheck fails after the event was acknowledged | 410 or 503 that still carries `QRWTY-Click-Event`, so the extra recorded attempt is explainable |
| `HEAD /{slug}` | Same status and headers a GET would get, no body, no event and no `QRWTY-Click-Event` |
| Any other method | 405 with `Allow: GET, HEAD` |

No error response carries `Location`. Error pages are HTML with `Cache-Control: no-store`. A
query string on the short URL is ignored and never forwarded. `QRWTY-Synthetic: <probe-id>` marks
a synthetic GET only when it arrives through the authenticated edge (or the test profile's
trusted edge); otherwise the header is ignored. Synthetic GETs are recorded and excluded from
customer totals.

## 6. Click event v1 (Pub/Sub message)

Message data is UTF-8 JSON; attribute `schemaVersion` is `"1"`.

```json
{
  "schemaVersion": 1,
  "eventId": "<UUID; equals the QRWTY-Click-Event header; reused on every retry>",
  "linkId": "<link id>",
  "eventTime": "<RFC 3339 UTC, millisecond precision>",
  "synthetic": false,
  "deviceClass": "desktop | mobile | tablet | bot | unknown",
  "country": "<ISO 3166-1 alpha-2 from the trusted edge, or null>",
  "referrerHost": "<lowercase host of the Referer, or null>"
}
```

Forbidden in events and analytics logs: IP addresses, the user agent string, referrer paths or
queries, the destination, the slug's query string, cookies and authorization. New fields come
only by amendment, from approved coarse dimensions. Readers accept unknown fields of the same
major version.

## 7. Analytics

`GET /api/v1/links/{id}/analytics?from&to` (inclusive UTC dates; default the last 7 days
including today) returns:

```json
{
  "linkId": "…",
  "range": {"from": "2026-11-08", "to": "2026-11-14"},
  "totals": {"recordedAttempts": 0, "filteredClicks": 0},
  "series": [{"date": "2026-11-14", "recordedAttempts": 0, "filteredClicks": 0}],
  "breakdowns": null,
  "freshness": {"asOf": "<ts>", "delayed": false},
  "reconciliation": {"status": "ok | delayed | incident"},
  "filter": {"version": "filter-v1", "definition": "<text>"},
  "lookback": {"maxDays": 7, "limitedByTier": false}
}
```

`recordedAttempts` counts unique non-synthetic recorded GET attempts, bots included.
`filteredClicks` excludes `filter-v1` bots. `breakdowns` is `null` without the tier's breakdowns.
A range beyond the tier's lookback is 403 `tier_restricted`; `from` after `to` or a range over
366 days is 400 `invalid_range`.

`GET /api/v1/links/{id}/analytics.csv?from&to` returns `text/csv; charset=utf-8` with header
`date,recorded_attempts,filtered_clicks`. A cell starting with `=`, `+`, `-` or `@` is prefixed
with `'`. Each success uses one export allowance: 403 `quota_exceeded` when none is left.

## 8. Abuse reports and moderation

| Request | Result |
| --- | --- |
| `POST /api/v1/abuse-reports` `{shortUrl, reason, details?}` | `reason` is `phishing`, `malware`, `spam` or `other`; `details` at most 1,000 characters. Always 202 `{received: true}`, even for an unknown link; 429 when limited. A report never blocks a link by itself |
| `GET /api/v1/operator/links/by-slug/{slug}` | Operator only: the link with its state and whether it has an owner |
| `POST /api/v1/operator/links/{id}/block` `{reason}` and `/unblock` | Operator only: 200. The actor, reason and time are recorded |

An operator is a verified account whose subject is in the configured operator allowlist
(`OPERATOR_SUBJECTS`). Anyone else gets 404 on operator routes.

## 9. Billing and account

| Request | Result |
| --- | --- |
| `GET /api/v1/me/billing` | `{tier, policy, subscription: {status, paidThrough, graceUntil, cancelAtPeriodEnd}, usage: {period: {start, end}, ownedLinkCreates: {used, limit}, csvExports: {used, limit}}, portalAvailable, confirming}`; `status` is `none`, `incomplete`, `active`, `past_due`, `canceled` or `expired` |
| `POST /api/v1/billing/checkout` `{plan: "paid-monthly"}` | 200 `{url}` of a hosted Checkout session; 409 `already_subscribed`; 400 for an unknown plan. The browser never supplies a price ID |
| `POST /api/v1/billing/portal` | 200 `{url}`; 409 `no_customer`; 503 `billing_unavailable` |
| `POST /api/v1/billing/webhook` | Stripe signature checked over the unchanged raw bytes before parsing. 2xx only after the event is durably in the inbox; a duplicate event ID is 2xx with no second effect; bad signature 400; body over 256 KiB 413; inbox failure 5xx (retryable) |
| `DELETE /api/v1/me` | 202 `{deletionScheduled: true}`; effects as frozen in decisions §3 |

Checkout returns to `/billing?checkout=success` or `/billing?checkout=cancelled`; neither grants
anything. Paid access comes only from verified webhook or reconciliation state.

## 10. Health

Each process exposes liveness and readiness on paths it chooses, named in the arm's oracle
adapter manifest. Liveness never depends on a downstream dependency.

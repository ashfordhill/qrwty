# A-found gaps from A4 (Jeeves 0aea8e7)

A4 wrote the public redirect, the click aggregator and the owner's analytics in the
application-owned stub bodies and product SQL of the Redirect service, the Analytics worker,
Account API and Session API ([handoff](../../handoff.md)). No generated file was edited:
`infra/local/verify-generated.py app` reports 71 generated files unchanged. Each gap has a
workaround in application files. As the owner decided on 2026-11-15 evening, these gaps are
recorded, not fixed.

| ID | Severity | Gap | Where | Workaround in A |
| --- | --- | --- | --- | --- |
| AG-26 | Medium | The generated clients' own bounds are longer than the tile's Request timeout, and they take no deadline or `signal`: the Pub/Sub publisher fails a publish after 2000 ms, the database client's statement and connection timeouts are 2000 ms, while the diagram gives the Redirect service 1000 ms. Past 1000 ms the admission answers its own 503 `DEADLINE` (JSON, no event ID) while the call goes on | `src/runtime/module-clients.ts` (`pubsubPublisher`, `databaseClient`), `src/modules/dependencies.ts` (`QueuePublisher`, `DatabaseReader`) | The stub races each call: the route read 400 ms, the publish 500 ms, the whole answer 850 ms (`redirect/redirect.ts`). The diagram's 1000 ms is unchanged. A publish the stub gave up on can still be stored: the 503 carries its event ID |
| AG-27 | Low | `QueuePublisher.publish` sets only the `messageId` attribute: a stub can't add others, so http-contract §6's `schemaVersion: "1"` attribute is missing | `src/runtime/module-clients.ts` (`pubsubPublisher`) | The version is in the body (`schemaVersion: 1`), which the aggregator checks; readers that route on the attribute can't |
| AG-28 | Low | `CacheClient` has `get`, `set` and `delete` only: no conditional or compare-and-set write, so a slower fill of an older version can overwrite a newer entry | `src/modules/dependencies.ts` (`CacheClient`) | Every entry carries an absolute `validatedUntil` (its own read + 30 s, never extended), checked on every hit, so an older state can't outlive its read by more than 30 s (decisions §3's 60 s bound) |
| AG-29 | Medium | A loop stub gets no timer or scheduled job, and a reader no backlog signal: retention runs only when messages arrive, and analytics freshness can't tell an idle pipeline from a stopped consumer (no oldest-unacknowledged age or heartbeat) | `src/runtime/tile-loop.ts`, the worker process file | The aggregator purges at most once a minute as messages arrive (`purge_expired`, bounded); freshness reports the last commit time and that event's lag (`delayed` above 60 s). A stopped worker shows as an old `asOf`, not as `delayed` |
| AG-30 | Low | No consumer deduplication helper: `idempotent()` keeps HTTP answers for 24 hours, while a click consumer needs a receipt per event ID for its own horizon (35 days), committed with its effect | `src/runtime/idempotency.ts`, `src/modules/dependencies.ts` | `record_click` in the module's product SQL: receipt and aggregate in one statement, purged after 35 days |

## AG-26: client bounds over the Request timeout

The durable-clicks contract wants a publish rejected, timed out or unknown to answer 503 with
`Retry-After` and no `Location`. The tile's Request timeout (the diagram's 1000 ms) bounds the
answer, but the generated publisher's deadline is a fixed 2000 ms and neither the publisher nor the
database reader takes a `signal` or a per-call deadline. So without the stub's own races, a slow
publish or route read would end in the admission's generic 503 `DEADLINE`, which has no click event
ID and a JSON body instead of the contract's HTML page.

Reproduce: in the Redirect service's process, `config.settings.requestTimeoutMs` is 1000;
`pubsubDeadlineMs` in `module-clients.ts` is 2000; `databaseClient` builds its pool with
`statementTimeoutMs: 2000, connectionTimeoutMs: 2000`. A publisher that never answers leaves the
stub waiting past 1000 ms.

A generic fix: give `publish` and `query` an optional `signal` (the request's), or derive each
client's deadline from the tile's Request timeout.

## AG-27: no message attributes

`publish(message, { key?, messageId? })` maps `messageId` to the attribute of that name and ignores
everything else. A versioned event contract usually puts the schema version in an attribute so a
subscriber can filter or route without parsing the body. A generic fix: `attributes?:
Record<string, string>` beside `messageId`, refusing the reserved name.

## AG-28: no conditional cache write

Two copies of the Redirect service that read a link before and after an edit can fill the cache in
either order. With only `set`, the older read may land last. Valkey supports `SET ... GET` and Lua
for a version check; the generated client exposes neither. The absolute `validatedUntil` makes the
outcome bounded rather than prevented.

## AG-29: no timer for a worker stub, no backlog signal

The Click aggregator must purge receipts past 35 days and aggregates past 13 months. With no
scheduled hook, it piggybacks on message arrivals; a quiet week leaves expired rows until the next
click (bounded, but not on time). The owner's analytics must show freshness and delay; without the
subscription's oldest-unacknowledged age (Cloud Monitoring) or a heartbeat from the consumer, a
stopped worker can't be told from no traffic. A generic fix: a scheduled-job tile or a loop `every`
hook, and a backlog metric a reader may query.

## AG-30: no consumer dedup

The README tells a consumer to deduplicate on the `messageId` attribute, but gives it nothing to do
so with: `idempotent()` is for HTTP answers (status and body, 24 hours, keyed by scope and key). A
consumer needs "take this event ID once, with my write, for N days" and a bounded purge. A generic
fix: an `once(eventId, horizon, fn)` step on `DatabaseReadWriter` next to `idempotent`, with a
partitioned or purged receipts table owned by Jeeves.

# A-found gaps from A6 (Jeeves 0aea8e7)

A6 wrote guest admission, reports, operator moderation and the issuer's part of account deletion
in the application-owned stub bodies and product SQL of Link API and Session API
([handoff](../../handoff.md)). No generated file was edited: `infra/local/verify-generated.py app`
reports 71 generated files unchanged. Each gap has a workaround in application files. As the owner
decided on 2026-11-15 evening, these gaps are recorded, not fixed.

| ID | Severity | Gap | Where | Workaround in A |
| --- | --- | --- | --- | --- |
| AG-31 | Medium | `CacheClient` has no atomic counter (`INCR` with an expiry, `SET NX`, or a script), so a distributed limit can't count exactly in Valkey | `src/modules/dependencies.ts` (`CacheClient`), `src/runtime/valkey.ts` | Each Link API copy counts its own admissions exactly in memory and is the only writer of its own count key; a request writes its intent first, then reads the other copies' counts from a per-key directory (`abuse-and-moderation/admission.ts`). Once copies know each other the limit holds; copies that start on a key together can miss each other briefly, so the worst case is copies × limit (Link API's maximum is 3) |
| AG-32 | Medium | The cache client treats a full command queue as a lost connection: with 32 commands waiting, node-redis rejects with "The queue is full", and the generated `bounded` wrapper then destroys the client and tries a new one only 5 s later, so a burst of more than 32 concurrent cache calls in one process takes the cache away from every request for 5 s | `src/runtime/valkey.ts` (`commandsQueueMaxLength: 32`, `bounded` → `lose`) | Admission falls back to each copy's exact local count while the cache is away (bounded: the limit per copy); the Redirect service falls back to the database as before (A4). Nothing in A can change the client |

## AG-31: no atomic counter on the cache

decisions §4 makes guest admission approximate and distributed (`guest-admission-test-v1`, 10
creations per 60 seconds per admission key), and acceptance A17 allows at most twice the limit
across replicas. Valkey's `INCR` plus `PEXPIRE ... NX` (or `SET key 0 NX PX`) would make it one
round trip and exact across any number of copies. The generated client exposes `get`, `set` and
`delete` only (AG-28 found the missing conditional write for routes).

Reproduce: `test/unit/abuse.test.ts`, "stays bounded in a simultaneous burst": 300 requests issued
at once over three copies that share one stand-in cache; every copy reads before any writes, so
each admits up to the limit (at most 30). With requests that follow each other closely the total
stays at the limit (10–12 in "admits exactly the limit when copies' requests follow each other
closely"). A generic fix: `increment(key, { ttlSeconds })` on the cache client, returning the new
count.

## AG-32: a full command queue loses the cache for 5 seconds

`createValkeyCache` opens the client with `commandsQueueMaxLength: 32`. node-redis's
`commands-queue.js` rejects a command when the queue to write plus the replies awaited reach that
length (`The queue is full`). `bounded()` catches every rejection and calls `lose(generation)`, which
destroys the connected client and reconnects only after 5 s; until then every command fails at once
(`Cache unavailable`). A busy process (more than 32 cache calls in flight: a guest-create burst, or
hot redirects) thus turns a back-pressure signal into a 5-second outage. A generic fix: reject the
one command (a retryable "busy" error) without losing the connection, and size the queue to the
process's concurrency.

# Durable click recording

Revision 2 implements the owner's requirement: **every click is durably recorded**. This contract
is shared by both builds and supersedes revision 1's optional telemetry buffer. It is a planned
contract, not an implemented guarantee. Revision 3 adds a $0 local-build phase: emulator/fixture
checks can prove application ordering, not real storage durability. That evidence remains pending
until cloud activation under [local-to-cloud.md](local-to-cloud.md).

## The guarantee we can actually provide

For every eligible public GET for which QRWTY sends `302 + Location`, a versioned click event
must already have received a durable acknowledgment from the selected storage service. Record
guest, free and paid links equally. Do not sample events or drop bots before durable recording;
derive filtered views afterward. HEAD, invalid/blocked links and health checks are not clicks.
Identify synthetic GETs explicitly and retain them separately from customer totals.

QRWTY cannot record a click that never reaches its service, prove that a destination loaded, or
atomically commit a database event and delivery of an HTTP response to someone's browser. A crash
after event acknowledgment but before response delivery can leave a recorded attempt without a
delivered redirect. A later browser request is another attempt. Use **recorded redirect attempts**
and **filtered clicks** in the product; never claim exact human visits or exactly-once delivery.
This limitation does not permit returning a successful GET redirect without a durable event.

## Ordered request path

1. Validate host, slug, method and admission; read fresh route metadata or the authoritative DB.
2. Enforce state and absolute expiry. Assign a server-generated event ID and event timestamp.
3. Publish the sanitized event directly to GCP Pub/Sub and **await** acknowledgment. Reuse the
   event ID for all retries within this request. The client has bounded retries, queue size,
   batch size and deadline. Batching can combine waiting requests, but none returns early.
4. Recheck expiry and route validation deadline after the wait. If they elapsed, refresh/recheck
   policy or return an error. An event already committed can therefore describe an attempted
   resolution without a redirect; include event schema semantics and account copy accordingly.
5. Only then send `302`, the saved `Location` and `Cache-Control: no-store`.

Publish rejection, timeout, ambiguous acknowledgment, exhausted capacity or unavailable publisher
returns `503` with a bounded `Retry-After` and **no Location**. Do not retry forever, emit a success
from `finally`, bypass ingestion on a cache hit, or use an after-response callback as durability.
An ambiguous publish may already be stored; same-ID retry and consumer deduplication handle it.
Do not log destination queries, cookies, tokens or raw IPs to compensate for uncertainty.

A publisher outage reduces redirect availability. Keep liveness separate from readiness and
retry dependency recovery without a crash loop. Sign-in, Stripe and analytics query availability
are not required for an otherwise healthy redirect. A stopped consumer does not stop ingestion
immediately: the durable backlog supplies time to recover.

## Durable storage, archive and replay

GCP reports successful publication after synchronous replication in multiple zones. This is a
regional fault boundary; a global Pub/Sub name is not synchronous multi-region replication.
[Publish lifecycle](https://docs.cloud.google.com/pubsub/docs/publish-message-overview),
[regional reliability](https://docs.cloud.google.com/pubsub/docs/reliability-intro).

Q04 prepares the real publisher adapter and proves its local behavior. Q12a must verify runtime
IAM, regional endpoint/storage policy,
topic/subscription setup and returned acknowledgment. Use pre-created analytics and archive
subscriptions, disable inactivity expiration, restrict deletion, and verify them before enabling
traffic. A RabbitMQ confirm implementation cannot be relabeled Pub/Sub without a real adapter.

Proposed retention for Q00 to freeze: topic and analytics subscription **31 days**, sanitized raw
Cloud Storage archive **31 days**, aggregate analytics **13 months**, dedup receipts/partitions
**35 days**, operational logs **14 days**. Raw retention changes from revision 1's seven days to
make recovery practical; it remains a proposal. This is durable recording within an explicit
retention policy, not permanent storage of every raw event. Publish that policy before launch.
Include all retained bytes and duplicates in the price calculation.

Use an independent managed Cloud Storage export subscription for durable batched archive files;
Q04 prepares its schema/configuration; Q12a verifies real permissions, delivery and retention. Archive objects
can contain duplicate event IDs. Analytics consumes independently, atomically deduplicates and
updates aggregates, then acknowledges. Never ACK a consumer before its transaction commits.
Do not assume a GCS object is one click, or use one object per click.

Archive health, oldest unprocessed age, backlog bytes, dedup partition size, retries, DLQ age
and reconciliation lag are mandatory signals. Proposed alerts: archive lag >5 minutes warning,
>30 minutes urgent; analytics lag >60 seconds degraded; oldest backlog >1 day urgent recovery.
Before any retention boundary, run tested archive/replay recovery. If safety cannot be restored,
stop admitting new redirects and declare an incident. **Stopping new traffic does not save old
messages**: drain or durably preserve the existing backlog before expiration. A lost accepted
event is a correctness incident, never an acceptable coverage gap.

Automatic same-stream replay is limited to 31 days from original event time, inside the 35-day
dedup horizon. Older events are quarantined for an isolated aggregate rebuild/reconciliation,
never blindly incremented into live totals. Keep schema versions, original IDs and timestamps.
Poison events are preserved in a durable quarantine with a repair/replay workflow, not discarded.
No permanent per-event relational table: Q10 proves partition/expiry cost at L0 and L1 volumes.
At 4,000 events/second, a 35-day per-event receipt table would hold about **12.1 billion rows**.
Adding a TTL does not make that suitable for the small launch database. Before L1, prove a
bounded batch/stream dedup and aggregate mechanism or commission a separate measured analytical
storage unit for both arms. Keep event-level correctness; a probabilistic filter cannot silently
discard real clicks. Record any extra service, migration and template effort in the experiment.
[Retention](https://docs.cloud.google.com/pubsub/docs/subscription-message-retention),
[Cloud Storage export](https://docs.cloud.google.com/pubsub/docs/create-cloudstorage-subscription).

## Failure envelope and release evidence

The launch target covers process failures, duplicate delivery, consumer outages within the tested
recovery window and a zone failure using regional managed durability. It does not claim no data
loss after simultaneous destruction of every regional copy or unauthorized deletion of all
retained copies. No provider brand establishes such a guarantee.

If zero acknowledged-event loss through destruction of a whole region is required, commission
a separate unit before that claim: synchronously confirm independently retained regional copies
before 302, define partial-commit behavior, share IDs, deduplicate/reconcile, test regional fencing,
and price the added network delay and storage. Warm asynchronous standby alone is insufficient.
The link database's disaster RPO must not silently authorize loss of acknowledged click events.

Required tests: withhold/lose publish ACK; kill before publish, after publish and after ACK; fill
the publisher queue; force SDK retries; expire a link while waiting; delete/misconfigure a test
subscription; kill consumer after commit before ACK; stall archive delivery; replay duplicate and
old events; exercise retention alarms and recovery with a virtual clock. Reconcile every captured
successful GET response against a durable event. Explain any extra attempts without inventing
client delivery evidence. Publish measured latency including the durable acknowledgment.

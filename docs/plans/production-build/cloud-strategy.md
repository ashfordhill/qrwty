# Cloud strategy and scale proof

Revision 2 follows the owner's GCP preference, with no stated residency restriction. Proposed
reference: Cloudflare edge and static UI; Node containers on Cloud Run; Cloud SQL PostgreSQL,
Pub/Sub, optional Memorystore cache and Cloud Storage. Billing uses a tested managed provider.
Docker packages processes; correct code, managed durability, recovery and operating evidence
establish the production properties. No cloud account, resources or deployment were created.

Cloudflare can host substantial applications with Workers and stateful services. An all-Cloudflare
implementation remains technically credible, but is not the selected comparison target. Existing
Jeeves output is Node/Postgres/Valkey/RabbitMQ-oriented: GCP is not a hostname-only change.
G12 must provide real Pub/Sub support; this work counts in Jeeves's experiment cost. Kubernetes
is not required. See [cost options](budget-options.md) and [durability](durable-clicks.md).

## Reference topology

See [editable cloud diagram](../../diagrams/cloud-deployment.excalidraw) and
[rendered diagram](../../diagrams/cloud-deployment.svg). All resources below are planned.

| Boundary | Proposed service | Required production property |
| --- | --- | --- |
| DNS, TLS, defense | Cloudflare DNS/proxy/WAF | Certificate renewal, origin protection, distributed abuse limits; quote actual plan |
| UI | Cloudflare static hosting | Immutable assets, rollback, no browser secrets |
| Public routing | Thin Cloudflare Worker or equivalent route configuration | Allowlisted hosts/methods/routes, trusted forwarding, bounded timeouts; no cached final redirect |
| GCP ingress | External HTTPS load balancer with serverless NEGs or verified authenticated invocation | Disable/restrict default Cloud Run public bypass; prove the exact Cloudflare-to-origin authentication and routing in Q04 |
| HTTP processes | Regional Cloud Run services, proposed us-central1 | Independent redirect scaling, measured warm minimums/concurrency/max instances, drain, non-root images and rollback; managed regional placement rather than invented zone-pinned tasks |
| Background consumers | Cloud Run worker pools, subject to G12/Q04 region/lifecycle proof | Always-running pull consumer without an HTTP listener; explicit replicas and tested backlog scaling. If incompatible, use a regional Compute Engine managed instance group with the same container and record the cost/operational delta |
| Links / Sessions / Billing | Cloud SQL PostgreSQL regional HA | Restricted separate logical DB roles; encryption, PITR, migrations, tested failover; one owning writer per domain |
| Analytics | Separate logical Postgres DB initially; separate capacity before interference | Time partitions, bounded dedup/retention/query work; large-event storage redesign only from measured limits |
| Hot routes / Admission | Managed Memorystore Redis/Valkey option proven against actual client | TLS/auth/network compatibility, optional redirect cache, safe distributed creation admission; exact edition/version and quote chosen in Q04 |
| Click events | Pub/Sub topic and subscriptions, explicit regional storage policy | Durable ACK required before 302; 31-day proposed retention; subscriber expiry disabled, least privilege, replay/DLQ and health gates |
| Raw sanitized archive | Independent Pub/Sub Cloud Storage export subscription | Batched files, dedup-aware replay, lag alarms, tested failure/recovery and explicit lifecycle; no one-object-per-click design |
| Identity | Managed OIDC, selected after compatibility probe | Audience/JWKS/rotation/recovery compatibility, MFA option and MAU/email costs; GCP Identity Platform is a candidate, not an assumed fit |
| Payments | Stripe Checkout / Billing / Customer Portal, proposed | Signed raw webhook, durable inbox, reconciled entitlements, sandbox proof and separate fee quote |
| Private artifacts / recovery | Cloud Storage and managed Cloud SQL backups | Restrict deletes/access, encryption, retention and restore-tested backup; backup location stated explicitly |
| Secrets / access / delivery | Secret Manager, workload IAM, Artifact Registry, federated CI | No static service keys; short-lived workload identity, digest-pinned releases and rotation |
| Telemetry / jobs | Cloud Monitoring/Logging + OpenTelemetry, authenticated scheduler/jobs | Cost-bounded technical logs, actionable alerts, owning-service cleanup/reconciliation jobs; never sample required click records |

Cloud SQL HA uses synchronous regional replication; Cloud Run HTTP services and worker pools
have distinct runtime contracts. A worker that has no listener must not be deployed as if it were
an HTTP service. Verify current worker-pool availability and scaling; do not assume HTTP
request autoscaling applies. [Cloud SQL HA](https://docs.cloud.google.com/sql/docs/postgres/high-availability),
[Cloud Run resource model](https://docs.cloud.google.com/run/docs/resource-model),
[worker scaling](https://docs.cloud.google.com/run/docs/configuring/workerpools/manual-scaling).

The Cloudflare origin protection mechanism must be demonstrated, not just an IP filter around an
otherwise public run.app URL. Webhook ingress requires Stripe signature validation independently
of edge authentication. Cloud Run request-based CPU allocation is not a durable background job
mechanism. Choose billing/runtime settings for each process explicitly and await publication in
request scope. [Billing settings](https://docs.cloud.google.com/run/docs/configuring/billing-settings).

A shared Cloud SQL instance can initially host restricted logical databases; monitor analytics
and billing interference and separate capacity when needed. Enforce private networking, managed
DB connections, verified TLS, scoped runtime IAM and a separately authorized migration role.
No hosts-file tricks, disabled TLS, broad database owner credentials or secrets in generated
source. Runtime endpoint bindings are generic mechanisms; sizes, regions and IAM are IaC outside
Jeeves. Isolated container listeners follow platform rules; the Jeeves studio still binds locally.

## Capacity assumptions, not TinyURL measurements

Use 30 days = 2,592,000 seconds. A billion redirects/month averages about 386/s; ten billion
averages about 3,858/s. Peak shape, bots, random misses, geographical spread and hot keys matter
more than the average. Creation and management workloads are independent of redirect volume.

| Tier | Offered redirect load | Mixed writes/reads | Dataset and test |
| --- | --- | --- | --- |
| L0: launch proof | 100/s steady, 1,000/s burst | 10 creates/s + 20 account reads/s | 1 million route records; 60-minute steady + 10-minute burst |
| L1: large-service proof | 4,000/s steady, 40,000/s burst | 100 creates/s + 200 account reads/s | 100 million records or explicitly provisional smaller-data result; 60-minute steady + 10-minute burst |
| L2: resilience proof | Selected tier with one AZ unavailable, cache cold and backlog draining | Same write mix; no hidden traffic reduction | Separate fault runs and at least 6-hour soak within agreed spend |

L1 is roughly a 10-billion/month average-equivalent and a tenfold burst. It is not a forecast.
Never label L0 evidence “TinyURL scale.” Running 40,000/s against the real cloud is expensive:
prepare the priced workload and obtain the agreed test authorization before running it.

Every tier runs: warm 95% cache hit; realistic long-tail/Zipf-like access; one slug at 50% of
traffic; random invalid slugs; all-cold cache; 0% cache hit at the stated origin capacity; and
creation followed by immediate lookup. Publish offered, completed, throttled and failed RPS,
load-generator saturation, client geography, network throughput, CPU/RAM/DB IOPS/connections,
cache hit rate and provider throttles. Use an open-arrival load model to expose queueing; do not
hide latency by slowing request issuance when the server is overloaded. Separate pathological
attack load from legitimate load and state when shedding is expected.

Do not extrapolate 100 million live rows from a 10,000-row hot cache. Seed cost, index size and
working-set distribution are part of the evidence. At 1 KiB/route, 100 million rows is roughly
100 GB before indexes, WAL, replicas, bloat and backups. At 4,000 clicks/s, even one day has
345.6 million events: permanent per-event relational receipts are not the target design.

## Proposed SLOs and error budgets

SLOs are release targets, not results or an SLA promise. Freeze them before building.

| Path | Target | Measurement |
| --- | --- | --- |
| Eligible redirects | 99.99% successful valid responses over 30 days | Edge/request telemetry plus external synthetics; intentional 404/410/403 reported separately; infrastructure 5xx/timeouts count as failures |
| Origin redirect | p99 ≤ 200 ms at the accepted load tier | Request arrival at regional ingress to response headers; destination site excluded |
| Global redirect | p99 ≤ 500 ms at named probes in North America, Europe and Asia | Client request to response headers; disclose DNS/TLS inclusion and cold connection results separately |
| Create/account APIs | 99.9%; p99 ≤ 1 s excluding interactive identity/step-up time | Still count backend failures; cap request/provider deadlines and disclose scanning latency |
| Edit/block propagation | No redirect with old allowed state after 60 s | Start at durable commit; multi-location probes and cached-copy timestamp inspection |
| Expiry | No redirect after recorded expiry, within documented clock bound | Enforced locally on every hit; no extra TTL grace |
| Analytics freshness | p95 ≤ 60 s while pipeline healthy | Event time to query-visible aggregate; delayed/stale indicator during faults; missing accepted events are an incident |
| Data recovery | AZ failover target RPO 0 for acknowledged link commits; RTO ≤ 5 min | Forced failover and verification, not a vendor guarantee |
| Regional disaster, link DB | Proposed RPO ≤ 5 min; RTO ≤ 60 min only after warm-standby drill | Measured replication lag and promotion/fencing; this does not authorize silent click loss |
| Click recording | Every eligible successful GET has durable event ACK before 302 | Acknowledge under regional multi-zone provider contract; no sampling; see durable-click fault envelope |

99.99% over 30 days allows about 4.32 minutes of unavailability; 99.9% allows 43.2 minutes. A short
load test cannot establish a 30-day SLO. Account/API outage budgets do not justify killing the
redirect service. If regional recovery takes 60 minutes, that incident violates the redirect
budget; report it. Faster regional continuity requires a separate design and cost decision.

## Cache and failure contract

Start with origin-served redirects behind Cloudflare. Cache static UI freely; no final redirect
response cache before the mandatory click-observation point. Worker route-metadata caching is a
later measured optimization subject to identical policy and durability tests.

Cache entries contain version, destination, allowed state, expiry and an **absolute**
`validatedUntil` from the authoritative writer (proposed maximum age 30 seconds). Copying entries
never extends that deadline. Ignore stale/corrupt entries; do not cache misses initially. Early
invalidation is an optimization; the fixed deadline bounds correctness. Conditional version
checks prevent a slow old read replacing a newer cache entry. After waiting for durable publish,
recheck expiry/freshness before responding. The overall revocation bound remains 60 seconds.

Cloudflare KV's eventual consistency and location-local Cache API deletion are insufficient on
their own for the authoritative policy contract. [KV](https://developers.cloudflare.com/kv/concepts/how-kv-works/),
[Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/).

| Failure | Redirect behavior | Other behavior |
| --- | --- | --- |
| Cache slow/down | Bounded bypass and authoritative read under DB admission | Prevent stampede; required creation admission fails safely |
| Links DB unavailable | Only still-valid metadata may resolve; durable event ACK remains mandatory; otherwise 503 | No false create/edit/claim success; reconnect without patching code |
| Identity or Stripe unavailable | No dependency; redirects continue if route and click storage are healthy | Account/billing follows verified state and finite entitlement/grace deadlines |
| Pub/Sub publish unavailable or ACK unknown | 503, no Location; bounded retry/backpressure; no fail-open mode | Same event ID for retries; automatic recovery without crash loops |
| Analytics worker/DB unavailable | Continue while durable retention/recovery safety holds | Backlog grows; show delayed analytics; catch up and reconcile without duplicate counts |
| Archive lag / retention danger | Safety gate can stop new redirects; never discard accepted backlog | Recover/drain/archive existing backlog before expiry; missing accepted record is an incident |
| Poison event | Already durable; no effect on subsequent valid processing | Durable quarantine, bounded retry, alert and repaired replay |
| Region lost | Do not assume a remaining route cache can replace unavailable durable ingestion | Fence link writer, recover exact accepted-event set; synchronous multi-region click durability needs a separate design |
| Cloudflare/Internet outage | No independent-CDN continuity claim | Document dependency and recovery; add a second CDN only through a tested design |

[Durable clicks](durable-clicks.md) defines the request order, duplicate semantics, archive,
retention and regional failure envelope. Delayed analytics and unavailable publication are different
faults: only the latter immediately prevents a redirect. Include publication latency in every
redirect histogram and failed ACK in the availability/error budget. The 99.99% target is a goal
requiring proof; adding a synchronous dependency makes it harder, not automatically satisfied.

## Deployment progression and cost

1. **Q04 disposable probe:** real GCP TLS/IAM, Cloud Run HTTP and consumer hosting, Cloud SQL,
   Pub/Sub ACK/replay/archive and managed identity. Bound duration, price, instances and teardown.
   A small probe is not HA or scale evidence.
2. **Q13 staging:** independent projects/credentials/data/hostnames per arm; reproducible IaC,
   secrets, private stores, migration/release jobs, warm capacity and operational telemetry.
3. **Q14–Q15 reliability and load:** actual regional failover, restore, durability/backlog tests and
   authorized capacity tiers. Save topology, sizes, quotas and image digests with every run.
4. **Q18 selected release:** exact estimate, IaC/images, recovery/security evidence, live billing
   configuration and unresolved findings reviewed; gradual `qrwty.io` cutover with rollback.
   Baseline uses an isolated hostname and synthetic data, not copied private customer traffic.
5. **Regional evolution:** measure failover/lag and fence writers. Warm asynchronous standby is
   not zero-loss multi-region click publication. Any stronger requirement has its own design,
   latency tests, pricing and acceptance gates before a claim.

A paid apply needs a concrete reviewed plan and available authorized cap. The user's GCP
preference is recorded; no spend cap or account permissions were inferred. Use earlier approvals
when provided. Budgets alerts alone do not stop charges; configure limits while preserving
backlog/recovery capacity. Test notifications need the owner's selected destination/scope.

The [budget worksheet](budget-options.md) gives options and dated component prices. Q13 expands it:

`monthly = edge + request/compute + ingress/network + DB/storage/backup + cache + event delivery
+ retained topic/archive bytes + analytics + identity/email/reputation + observability + standby`.

Include both arms' actual live hours, attack/replay costs, payload sizes, retained data, log volume
and teardown. Payment/Billing fees and model costs are separate. Report cost per million durable
successful redirects, thousand new links and active account. No free-tier or component-only row
is a total enterprise deployment quote.

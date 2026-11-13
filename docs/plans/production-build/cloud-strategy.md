# Cloud strategy and scale proof

Proposed reference deployment: Cloudflare at the public edge, containerized Node services on
AWS ECS/Fargate, managed Postgres/Valkey/RabbitMQ and a managed OIDC provider. Docker is a packaging
format here. The production properties come from the application contracts, managed storage,
placement, networking, backups, release process and observed recovery.

Cloudflare can also host substantial stateful applications using Workers and its storage/queue
services. “Cloudflare cannot do enterprise” is not a useful premise. An all-Cloudflare design
could work, but current Jeeves output is not a Workers/Durable Objects runtime. Choose it only
after comparing compatibility work, consistency, limits and measured cost. Kubernetes is not a
prerequisite for this application.

## Reference topology

See [editable cloud diagram](../../diagrams/cloud-deployment.excalidraw) and
[rendered diagram](../../diagrams/cloud-deployment.svg). These are planned resources.

| Boundary | Proposed service | Required production property |
| --- | --- | --- |
| DNS, TLS, edge defense | Cloudflare DNS/proxy/WAF; suitable paid plan if limits require it | DNS ownership, certificate renewal, tested origin protection and abuse limits |
| Public UI | Cloudflare static hosting | Immutable hashed assets, deploy rollback, no secrets in browser bundle |
| Public routing | Thin Worker or equivalent edge route configuration | Allowlisted host/path/method, browser 302 no-store, trusted forwarding, bounded origin timeouts |
| Regional ingress | AWS ALB | TLS, authenticated/restricted Cloudflare origin path, only intended service routes |
| Backend processes | ECS/Fargate in private subnets across at least 2 AZs | Independent scaling for Redirect; at least 2 healthy copies per critical request service; non-root, drain, task restart and deployment rollback |
| Links / Sessions | RDS PostgreSQL Multi-AZ | Writer authority, restricted roles, encryption, PITR, migration lock and measured failover |
| Hot routes / Admission | ElastiCache for Valkey | TLS/auth and failover; cache optional on redirect reads, creation admission fails safely |
| Click events | Amazon MQ for RabbitMQ cluster | TLS, publisher confirms, tested queue type/version, bounded backlog and dead-letter handling |
| Analytics | Separate logical Postgres DB initially; separate capacity from Links when measured | Partition/retention strategy, constrained queries, no starving redirect lookups |
| Identity | Managed OIDC, selection in Q04 | Token compatibility, rotation/revocation behavior, recovery/email flow and MAU pricing |
| Artifacts / backups | S3 with private access and lifecycle rules | Restore-tested exports/backups, encryption and explicit retention |
| Secrets / access | Secrets Manager + workload roles, KMS | No static cloud key in repo/image; least privilege, rotation proof |
| Delivery / telemetry | Image registry, CI using federated identity, OpenTelemetry + selected metrics/log backend | Traceable image digests, bounded log volume, actionable alerts and rollback |

ECS supports AZ balancing, RDS's synchronous standby provides failover rather than read capacity,
and Amazon MQ supports multi-AZ clusters. Those capabilities must be configured and exercised,
not assumed from service names. [ECS](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-rebalancing.html),
[RDS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZSingleStandby.html),
[Amazon MQ](https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/best-practices-broker-setup.html).

A DB role owns only its logical domain. A single RDS cluster can initially host several logical
databases without sharing credentials; monitor analytics interference and move it before the
scale gate if necessary. A second AZ is not a second region. The single-region reference cannot
claim continuous service through a regional outage.

External runtime configuration is a required generic seam, not deployment settings on the Jeeves
canvas. Never turn off TLS validation, emulate local DNS names with a public hosts hack, embed
secrets in generated code, or give runtime users a database owner login to make managed services
work. Network listeners inside isolated containers follow the platform needs; local host ports
stay loopback. This does not change Jeeves studio's `127.0.0.1` binding rule.

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
| Analytics freshness | p95 ≤ 60 s while pipeline healthy | Event time to query-visible aggregate; stale/coverage indicator during faults |
| Data recovery | AZ failover target RPO 0 for acknowledged link commits; RTO ≤ 5 min | Forced failover and verification, not a vendor guarantee |
| Regional disaster | Proposed RPO ≤ 5 min; RTO ≤ 60 min only after warm-standby drill | Measured replication lag and promotion/traffic-fencing sequence |

99.99% over 30 days allows about 4.32 minutes of unavailability; 99.9% allows 43.2 minutes. A short
load test cannot establish a 30-day SLO. Account/API outage budgets do not justify killing the
redirect service. If regional recovery takes 60 minutes, that incident violates the redirect
budget; report it. Faster regional continuity requires a separate design and cost decision.

## Cache and failure contract

Start with origin-served redirects behind Cloudflare. Cache static UI freely; no final redirect
response cache in front of the click-observation point. Introduce Worker route-metadata caching
only when it meets the same correctness tests and the measured benefit warrants it.

Cache entries include link version, destination, allowed state, expiry and an **absolute**
`validatedUntil` derived from a read of the authoritative writer (proposed max age 30 s). Copying
through Redis/edge never extends that deadline. Reject stale/corrupt entries; don't cache misses
initially. Updates may invalidate early, but max age is the correctness backstop. Test an old
read racing with a newer write; conditional version checks prevent a stale fill replacing a
newer entry. Never promise instantaneous global revocation from eventual cache storage.

Cloudflare KV is eventually consistent, including negative reads, so it cannot by itself meet
this authoritative update/revocation contract. Cache API deletion is local, not a global purge.
These are design constraints, not reasons to exclude Cloudflare.
[KV](https://developers.cloudflare.com/kv/concepts/how-kv-works/),
[Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/).

| Failure | Redirect behavior | Other behavior |
| --- | --- | --- |
| Valkey slow/down | Time-bounded bypass; authoritative DB read under admission limit | No unbounded concurrent DB stampede; create fails closed if mandatory admission state unavailable |
| DB unavailable | Serve only entries still inside their original validation and expiry deadlines; then 503 | No create acknowledgment, edits or claims; reconnect without manual code restart |
| Identity unavailable | Redirect unaffected | New login fails clearly; existing session follows bounded token/JWKS rules, never bypasses validation |
| Telemetry/broker unavailable | Redirect unaffected; bounded local batch attempt may drop | Pipeline reports degraded coverage; no unbounded RAM, retry loop or request queue |
| One worker killed | Redirect unaffected | Confirmed accepted batches replay without duplicate aggregates |
| Invalid event | Redirect unaffected | Quarantine with reason, bounded retry, alert; next valid item proceeds |
| Region lost | Cache may provide only its remaining short validity window | Fence old writer, recover/promote one authority; no active-active writes by accident |
| Cloudflare/Internet outage | No claim of automatic independent-provider failover | Document dependency and recovery; second CDN only if justified and separately tested |

The optional telemetry call must not use an unbounded `Promise` per click. Redirect owns a bounded
buffer and scheduled batch sender; loss and buffer pressure are observable. No await of broker
confirm in the redirect response. Intake authenticates service requests, rejects oversize batches
and only reports acceptance after durable broker confirmation **and successful routing to an
existing durable subscriber queue**. Verify persistent delivery, queue replication/type,
publisher returns for unroutable messages, dead-letter policy and consumer ACK after transaction
commit. A broker confirm for an unroutable publish is not proof that an event was stored.
A restart can lose a redirect's
unconfirmed buffer; publish that limitation. If the owner chooses lossless capture, redesign
before implementation rather than quietly relabeling best-effort events.

## Deployment progression and cost

1. **Q04 disposable compatibility probe:** smallest bounded environment with real TLS endpoints,
   managed identity and migration privileges. Capture findings, teardown and costs. This is not HA.
2. **Q13 staging:** separate credentials/data/hostnames per arm; reproducible IaC, private stores,
   observable services, migration/release jobs and rollback. No production DNS switch.
3. **Q14–Q15 HA and capacity:** multi-AZ placement, failover, restores, queue recovery and tiered
   load. The tested topology, resource sizes and image digests are saved with every result.
4. **Q18 public deployment:** review exact bill estimate, image/infra plan, backup evidence and
   unresolved findings; gradual traffic and an explicit rollback. Use `qrwty.io` for the selected
   arm only. The comparison deployment has its own hostname and synthetic data; never replay
   private customer traffic into it without a separate policy.
5. **Regional evolution:** before a global-resilience claim, build a warm standby, measure
   replication lag, fence writes, promote and verify revocation/tombstones. Partitioning and
   edge-resolved metadata follow profiling, not an enterprise checklist.

IaC must produce a reviewable plan before any paid apply. A concrete resource list, region,
maximum task counts, quotas, expected duration, rollback and teardown must accompany approval.
Use the owner's prior approved cap when one exists; do not repeatedly ask for already authorized
spend. No account, credentials or budget was verified in this planning unit.

Build a dated calculator worksheet for **both** arms, low/expected/burst and outage/replay cases:

`monthly = edge requests+CPU + container vCPU/RAM-hours + ALB/NAT/endpoints/egress + DB/IOPS/storage
+ cache + broker + identity MAU/email + observability + backups + standby + support`.

Include fixed HA costs at zero traffic, AWS-to-Cloudflare transfer, logs per redirect, NAT,
duplicate environments and test seed/cleanup costs. Show cost per million successful redirects,
per thousand new links and per active account. Quote current official prices and plan limits;
never use “free tier” as the full scale budget. Reference:
[Fargate pricing](https://aws.amazon.com/fargate/pricing/),
[Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/).

# Budget options and AWS versus GCP

Researched 2026-11-13. USD, one environment, on-demand list prices before credits, discounts and
tax. The bands below are **engineering allowances**, not vendor quotes or spending permission.
No cloud resources were provisioned. The owner prefers GCP and has no residency requirement.

**Revision 3 owner decision:** spend nothing on new cloud/services yet. The active path is local
development plus deployment preparation under [local-to-cloud.md](local-to-cloud.md). All bands
and probe allowances below are future options, not today's recommendation to provision resources.

## Practical options

| Option | Working monthly envelope | What it buys / what remains unproven |
| --- | ---: | --- |
| Development and private staging | $100–$250 | Small single-zone DB, mostly scale-to-zero HTTP services, bounded worker/probe time. Real cloud integration; no HA or public availability claim |
| Regional HA public launch — recommended next production target | $600–$1,500 | Regional HA Postgres, warm redirect capacity, managed durable events, cache, backups, monitoring and failover drills. Assumes low initial traffic, roughly up to 10 million redirects/month; capacity must still be tested |
| Warm second region and more operating headroom | $1,500–$3,500 | Additional database/compute/storage/network capacity and recovery operation. Does not automatically buy continuous global availability or zero regional-disaster data loss |
| Billion-scale operation | Quote after Q15's measured resource model | Actual per-event bytes, compute time, DB working set, geographical egress and peak capacity dominate. None of the smaller bands is a promise of 10 billion redirects/month |

When the owner later activates cloud work: use temporary probes, then consider about **$1,000/month**
as a planning center for the first HA deployment. Suggested separate probe allowance **$250 total**
across both arms, subject to a resource/duration worksheet; stop or reprice if insufficient.
L0 load tests need their own quote. Price L1's 100-million-row seed, load generators, replicas,
retention and teardown before proposing a one-off cap. No budget is approved by these suggestions.

The launch envelope assumes one small shared Cloud SQL cluster with separate logical databases,
moderate account traffic, no paid support contract and no prolonged attack. It includes rough
allowances for Cloudflare, networking, cache, identity/email/reputation and observability; those
providers and plans are still to be quoted. Paid support, large MAU counts, two permanent
deployments or a sustained attack can exceed it. User acquisition and AI development cost are
separate. A money ceiling implies traffic/instance/creation limits and explicit 429/503 behavior;
it cannot also promise unlimited traffic and an unconditional SLO.

## Does AWS cost less?

Sometimes, for particular components. It is not established for QRWTY's total bill. Representative
always-running compute for **1 vCPU + 2 GiB, 730 hours**, no discounts:

| Component | Region / configuration | Monthly compute only |
| --- | --- | ---: |
| AWS Fargate | us-east-1, Linux x86 | $36.04 |
| GCP Cloud Run HTTP service | us-central1, instance-based billing | $57.82 |
| GCP Cloud Run worker pool | us-central1 | $36.04 |

These are resource-price calculations, not equal-throughput benchmarks. Fargate's cited CPU/RAM
rates are $0.000011244 and $0.000001235 per second; Cloud Run HTTP instance rates are $0.000018 and
$0.000002. Networking, load balancers, storage and logs are additional. Cloud Run's request-based
mode can reduce idle-service cost, but has a different rate model. CPU/platform performance,
concurrency and minimum instances need measurement.
[AWS rates](https://aws.amazon.com/fargate/pricing/),
[Cloud Run rates](https://cloud.google.com/run/pricing).

At the cited Cloud SQL Enterprise general-purpose rates, regional HA **2 vCPU + 8 GiB** is about
**$202.36/month for CPU/RAM**, before storage, backup and networking. This already uses HA rates;
do not multiply by another standby factor. That fixed base exists even with few visitors.
[Cloud SQL pricing](https://cloud.google.com/sql/pricing).

Our conclusion is an engineering judgment: **use GCP given the owner's preference**, then compare
measured total cost. There is no whole-stack AWS quote or benchmark supporting a claim that one
provider is categorically cheaper. Jeeves currently emits RabbitMQ-oriented runtime code, so
native Pub/Sub is an explicit compatibility/template investment, charged to A rather than hidden.
Self-hosting RabbitMQ merely to avoid measuring that work is not the default managed design.

## Why traffic and durability change the bill

Illustration only: assume 1 KiB billable per click per Pub/Sub direction, one analytics consumer,
one independent archive export, no retries, no free tier, and a 31-day fully retained topic in
steady state using 30-day monthly traffic. Payload attributes and request minimums affect actual
billable bytes. Batching lowers some charges; duplicates and replay raise them.

| Component only | 1 billion clicks/month | 10 billion clicks/month |
| --- | ---: | ---: |
| Standard Pub/Sub publish + one consume, $40/TiB | $74.51 | $745.06 |
| Cloud Storage export subscription, $50/TiB | $46.57 | $465.66 |
| 31-day topic retention at $0.27/GiB-month, assumed 1 KiB stored/event | $266.08 | $2,660.75 |
| Cloud Run request fee **if using request-based billing**, $0.40/million | $400.00 | $4,000.00 |

These rows **are not a total**. Add compute, Cloud Storage objects/bytes, analytical storage and
queries, links DB, other API requests, edge traffic, network transfer, replicas, logs and recovery.
Instance-based Cloud Run uses a different charging model without that per-request fee. Stored
event size can be smaller than the 1 KiB request billing assumption; measure both independently.
Do not infer “one billion clicks costs $75” from the throughput row.
[Pub/Sub rates and minimum request size](https://cloud.google.com/pubsub/pricing),
[Cloud Run rates](https://cloud.google.com/run/pricing).

See the reproducible [rate worksheet](../../evidence/plan-revision-2/rate-calculation.json).
The formulas, sources, units and exclusions are retained; current prices must be rechecked at apply.

## Keep the experiment affordable and fair

Two equivalent environments left running can roughly double infrastructure cost. Deploy/test
arms sequentially with identical topology, dataset and provider settings where practical. Keep
separate projects, credentials and evidence; recreate from independent IaC for the maintenance
trial. Do not compare a tiny temporary B environment to a permanently warm HA A environment.
Record live hours, idle hours, resources and actual bills, plus normalized equal-traffic estimates.

Use budget alerts **and** limits on maximum instances, per-service concurrency, API quotas, DB
connections, log sampling and synthetic test duration. Alerts are not a hard cap. Sample technical
logs if needed; never sample the required click event stream. Reserve enough capacity for safe
backlog drain, security response and teardown. Automatic action at a cost limit must not delete
durable records. Compare payment processing/Billing fees separately from cloud and model costs.

Future activation steering: pick a monthly envelope and disposable-test allowance then. Local
development does not wait for those choices; exact model/settings and local tier fixtures are
pinned separately. Existing answers already settle no cloud spending now, GCP
preference, indefinite guest links, durable clicks, individual free/paid accounts and a controlled
same-stack/model comparison. No repeated approval is needed for those decisions.

# Build locally; prepare the GCP deployment now

Revision 3, owner decision 2026-11-13: **no new cloud or paid-service spending now**. Build the
product and its deployment assets locally. GCP remains the production target. Later activation
should use configuration, secrets, infrastructure provisioning and migrations with the same
application artifacts, without a planned product rewrite. This is a build constraint, not a claim
that the currently empty app is deployable or that untested managed services will work perfectly.

## Current execution boundary

- Use existing local tools and isolated containers. Do not create cloud resources, enable billing,
  start a trial, purchase a plan, run paid API/load tests or activate live payments. A free-tier
  assumption does not authorize provisioning. Keep future cost options as reference only.
- Q00 records a current additional cloud/service budget of $0. A future production budget is
  deliberately deferred, so it does not block diagramming, generation or local implementation.
  Record model usage honestly; this does not authorize buying additional model/API capacity.
- Q04 prepares and tests runtime bindings locally; Q05 may freeze the generated baseline after
  those checks. Q06–Q12 can complete product/backend/UI and deployment preparation. Q12a and
  Q13–Q15/Q18 require a later owner instruction to activate cloud work. B follows the same split.
- A no-charge provider sandbox may be used only if access already exists and the test sends no
  real payment/email/SMS or billable request. Otherwise use local fixtures and mark live-provider
  tests not run. Lack of sandbox credentials does not justify bypassing signature/auth logic.

## One application, explicit environment bindings

| Concern | Local development and verification | GCP production binding prepared now |
| --- | --- | --- |
| HTTP services | Final production-built containers behind local routing; loopback host ports | Same image digests, Cloud Run ingress/port/health/drain settings |
| Background consumers | Same worker image, explicit local processes | Cloud Run worker-pool manifest; documented VM-group fallback pending compatibility |
| Links/Sessions/Billing/Analytics | Real isolated Postgres with persistent volumes, restricted roles and product migrations | Cloud SQL connection/IAM/TLS/secret bindings; same SQL and transaction semantics |
| Cache/admission | Pinned Redis/Valkey-compatible local server, including disconnect tests | Selected Memorystore endpoint/security; edition compatibility explicitly pending |
| Click transport | Real GCP Pub/Sub client against local emulator; controlled ACK/failure fixtures | Same implemented Pub/Sub adapter with real endpoint, project/topic/subscriptions and workload IAM |
| Raw archive | Fixtures validate schema, replay, lifecycle declarations and recovery logic | IaC for native Pub/Sub Cloud Storage export; no production archive stub |
| Identity | Local OIDC issuer with real signature/audience/key-rotation checks | Managed issuer/audience/JWKS and credentials selected under the same adapter contract |
| Payments/reputation/email | Local signed events and deterministic bounded provider responses | Real implemented provider clients, runtime credentials and allowed production endpoints |
| UI | Built static assets; same-origin relative API paths | Same asset bundle and safe public runtime configuration; secrets remain server-side |

The Pub/Sub emulator only retains messages/resources for its session and can differ from the
managed service. It is useful for client wiring, not durable-storage or IAM evidence. Local tests
prove **await ACK before 302**, retry/dedup and error handling using controlled acknowledgments;
they cannot prove the managed acknowledgment's physical durability, archive delivery or regional
failover. Keep those rows not run until Q12a/Q14. Never swap RabbitMQ in locally and assume that
tests the production Pub/Sub client. [Official emulator limitations](https://docs.cloud.google.com/pubsub/docs/emulator).

## Implementation constraints for every unit

1. **Configuration is finite and validated.** Define local/test/production schemas, example
   non-secret files and required secret names. Endpoints, IDs, regions, domains, issuer/audience,
   pool sizes, deadlines, concurrency, retention, replica bounds and price IDs belong in the
   appropriate app/IaC configuration. Prices and tier policy are app-owned; cloud sizing remains
   outside Jeeves. No hardcoded localhost, cloud account, credentials or production domain in
   application behavior. Reject missing/contradictory required production settings at startup.
2. **Production cannot use development shortcuts.** Fail startup if production is configured
   with emulator endpoints, test identities, fake providers, development secrets or insecure TLS.
   Use real provider clients now, with local test injection isolated from production configuration.
   No TODO/501 production adapter, auth bypass, no-op archive or automatic memory-store fallback.
   Mock-driven test success is labeled separately from real local-store integration.
3. **Correct with multiple copies now.** No process-local session/ownership/quota authority,
   in-memory-only idempotency, local-disk business state or reliance on sticky sessions. Use DB
   constraints/transactions, durable ownership, bounded pools/retries, cache expiry and idempotent
   consumers. Test concurrent create/claim/quota and duplicate delivery on at least two copies.
4. **Respect the deployment runtime.** Build production containers from the start, support
   configured listeners, health/readiness and graceful termination, and keep workers separate
   from HTTP services. Do not rely on local filesystem persistence or work after HTTP response
   completion. Match the current [Cloud Run contract](https://docs.cloud.google.com/run/docs/container-contract).
   No deployment-specific branch may turn off the durable-click or authorization requirements.
5. **Prepare infrastructure alongside code.** Keep declarative GCP resources, IAM grants, private
   networking, secrets references, backup/retention, queue/archive policy, alerts and independent
   scaling bounds in `infra/`. Prepare migration, bootstrap, release, rollback and teardown
   commands. Validate syntax/schema and dependency wiring offline; no apply, account discovery or
   authenticated refresh hidden in ordinary checks. A real cloud plan and quotas remain later.
6. **Promote artifacts, not edits.** Build once, record backend/worker image digests and UI hashes,
   then select the environment through configuration. A local production-profile rehearsal must
   require no edits to handlers, SQL, generated files or UI source. Inject test endpoints only in
   an explicit test profile; verify the real production validator rejects them. Schema migration
   is an explicit release job, not a manual edit or every replica racing at startup.

Q04 writes a binding inventory: configuration key, owning component, local value/reference,
production source, secret/public classification, validation, test and unverified cloud assumption.
The exact config mechanism follows the implemented generic seams. Never patch generated output
to make environments work; record and fix a generic template gap in an assigned Jeeves unit.

## What counts as prepared

Q12/B08 packages a release rehearsal report with final images/assets, example environment files,
IaC validation, migrations, bootstrap/deploy/rollback instructions and a named live-check backlog.
A fresh local checkout must start through documented commands without owner DB access, paid
credentials or source edits. Health, restart, concurrent replicas, click ACK failures and free/paid
account behavior must be exercised locally to the documented test scope. No command is claimed
implemented merely because it is listed in this plan.

Use **locally verified; cloud activation pending**, never “production proven,” for this milestone.
At activation, Q12a/B08a supplies real IAM/TLS/network/provider evidence; Q13/B09 applies the
prepared infrastructure; cloud failure, security, capacity and release gates still follow. If a
cloud probe reveals a code defect or missing adapter, fix it explicitly and charge the work to
its arm. Do not relabel a late implementation change as configuration or move the frozen baseline.

Scaling within the tested architecture should adjust replica/concurrency/pool/resource settings.
An unlimited-traffic or billion-event analytics claim cannot follow from config alone: a changed
storage/partition strategy is architecture work and needs its own measurement and diagram. The
small launch Postgres instance is not assumed to hold L1's 35-day per-event dedup set.

The experiment therefore has two evidence milestones: local implementation/deployment preparation
now, and real cloud deployment/operation later. Keep all pending cloud rows visible and account
for later template/product fixes and actual service costs in both arms.

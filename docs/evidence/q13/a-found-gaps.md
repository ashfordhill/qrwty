# Q13: A-found Jeeves gaps the cloud revealed

Found by arm A's one live deploy (Q12a and Q13 combined) of the frozen generator's export, Jeeves
`4e87f97` (baseline `33d50e9` plus Q06 `ee186c1`), on Cloud Run, Cloud SQL, Memorystore for Valkey
and Pub/Sub in `us-central1`, with Auth0 as the issuer. No generated file was edited
(`infra/local/verify-generated.py app`: 64 generated files unchanged). Earlier gaps AG-01 to AG-12
are unchanged; AG-03, AG-04 and AG-05 held on the cloud exactly as Q04 predicted (one link
directory for Cloud Run's per-secret mounts, `AUTH_DISABLED` caches, unprefixed Pub/Sub names).
Deployment findings in A's own IaC are in [checks](checks.md#deployment-findings). The
coordinator decides whether a post-freeze Jeeves fix is taken (owner decisions §10).

| ID | Severity | Gap | Template | Workaround in Q13 |
| --- | --- | --- | --- | --- |
| AG-13 | Medium | An External API client has no workload-identity credential: a stub calling a Google API can only send a key from a file | `module-clients.ts.template` (`externalTarget`), generator README | `link-operations/google-credentials.ts`: the metadata server's token, selected by `QRWTY_REPUTATION_CREDENTIALS=metadata`, required by the production profile |
| AG-14 | Medium | Tile-to-tile calls carry no ID token, so Cloud Run IAM can't protect a service another tile calls | `module-clients.ts.template` (`httpTarget`) | Internal ingress with IAM off for Link, Account and Billing API; IAM on the public origins |
| AG-15 | Medium | The health route `/healthz` is a path Cloud Run's front end reserves: `run.app/healthz` never reaches the container | `http.ts.template` (the reserved `/healthz`) | None needed: Cloud Run's own probes reach it |
| AG-16 | Medium | The Pub/Sub clients have no regional endpoint; with in-transit region enforcement a request routed elsewhere is refused | `module-clients.ts.template` (`pubsubPublisher`, `pubsubLoop`) | None in the app; operators use `us-central1-pubsub.googleapis.com` |
| AG-17 | Low | No log line on SIGTERM, drain or exit | `process.ts.template` (`runProcess`) | P10 showed the drain by traffic (1,501 requests, none failed) |

## AG-13: no workload identity for an External API

**Found.** `externalTarget` passes `init` to `fetch` unchanged and "reads no credential"; the
README tells a stub to add "a credential from a `SECRET_DIR` file". For Google Cloud APIs that
means a long-lived API key in Secret Manager, while the process already has a service account.
**Reproduction (cloud).** With the Q06 image, `POST /modules/link-api-link-operations/links` from
inside the VPC answered `503 reputation_unavailable` with `Retry-After: 5`, and Link API logged
`Web Risk answered 403` ([record](records/probe-create-1.jsonl)).
**Workaround.** `google-credentials.ts` (application file): with
`QRWTY_REPUTATION_CREDENTIALS=metadata` the Web Risk adapter gets the service account's access
token from `http://169.254.169.254/computeMetadata/v1/instance/service-accounts/default/token`
(`Metadata-Flavor: Google`), caches it until a minute before expiry on a monotonic clock, never
caches a failure, and bounds the token and the lookup with one 500 ms deadline; any failure is
`unavailable` (fail closed). The production profile adds the variable to Link API's list and fixes
its value. Unit tests: 9 new (127 in all), Biome, test typecheck and build pass; the preflight
refuses the variable unset or wrong. On the cloud the guest create then answered 201, and Web
Risk's malware and phishing test URLs 422 ([records](records/probe-create-2.jsonl),
[threats](records/probe-threat.jsonl)).
**Remedy (generic).** A declared credential kind per External API: `google-identity` (Application
Default Credentials or the metadata server, an OAuth token with a scope, cached and refreshed),
besides a file credential.

## AG-14: tile calls can't use Cloud Run IAM

**Found.** `httpTarget` sends no `Authorization`; Q04's IaC therefore set `invoker_iam_disabled`
on every service. On Cloud Run that leaves two choices for a service other tiles call: internal
ingress with IAM off (any workload with a route into the VPC may call it), or public ingress open
to everyone.
**Effect.** Billing API had to become internal for this deploy, though Stripe's webhooks (Q10a)
would need it public; Session API's public origin could require IAM only because no tile calls it,
and then the qrwty.io edge can't call it either without a Google ID token.
**Remedy.** An optional ID token on `httpTarget` (audience = the target's URL, from the metadata
server), switched on by a deployment variable.

## AG-15: `/healthz` is reserved on Cloud Run

**Found.** Every service's `https://<service>.run.app/healthz`, public or internal, from outside
or from the VPC, answered Google's own HTML 404 page; other paths reached the process
([record](records/probe-net.jsonl)). Cloud Run reserves some paths that end in `z`. The startup
and liveness probes, which call the container directly, passed.
**Effect.** Nothing outside a container (the edge, an uptime check, a tile, an operator) can read
a process's readiness over HTTP.
**Remedy.** A health path that Cloud Run doesn't reserve (for example `/health`), or a
configurable one, kept in step with the probes in the IaC.

## AG-16: no regional Pub/Sub endpoint

**Found.** The durable-clicks contract pins Click events to `us-central1`, and the IaC sets
`enforce_in_transit = true`. A dead-letter pull from outside the region through the global
endpoint was refused: `FAILED_PRECONDITION: … the subscribe request was received by a Pub/Sub
server in a non-allowed region`; through `https://us-central1-pubsub.googleapis.com/` it worked.
The generated publisher and worker (`new PubSub({ projectId })`) use the global endpoint and
worked because Cloud Run in `us-central1` is routed to `us-central1`.
**Effect.** Correct only while Google's routing keeps the request in the allowed region; a
publish refused this way is a redirect 503 (fail closed), a pull refused is a stalled worker.
**Remedy.** `JEEVES_PUBSUB_ENDPOINT` (the regional endpoint), required when the plan pins regions.

## AG-17: drains are invisible

**Found.** `runProcess` writes `Application ready` and error lines only. During P10's rollout no
line said when an old instance received SIGTERM, how long its drain took or how it exited, and
Cloud Run logs no exit for a service instance (only the worker pool's "Shutting down user disabled
instance").
**Remedy.** `{"event":"draining"}` on the signal and `{"event":"stopped","exitCode","drainMs"}`
before exit.

## Noticed, not new Jeeves gaps

- A dead-lettered copy keeps the attributes and adds `x-terminal-code`, but gets a new messageId
  and carries no attribute naming the original one; the archive holds the original messageId.
- The guard's key-set fetch timeout is compiled at 3,000 ms (`jwksTimeoutMs`), while a fresh
  Cloud Run task's first Internet connection through Cloud NAT failed for 12 s and 48 s in two
  runs. No Link API verification failed in Q13 (its instances were older), so this is not claimed
  as a gap.
- `migrate.mjs` throws an uncaught `Error: timeout expired` (pg) when it can't connect, naming no
  endpoint; the cause was A's IaC (I-4).
- AG-06 on the cloud: `i_identity` and the two identity secrets were created on Cloud SQL though
  Auth0 is the issuer.

# Q13: arm A's one live deploy, recorded and torn down

Run `qrwty-r1-20261114`, arm A, Q13 attempt 1 (ledger `a-4542`, role implementer, phase cloud),
from QRWTY `1d79868`. Generator: Jeeves `4e87f97` only, through the frozen export already in `app/`
(no Jeeves file was read or run in this unit). Project: the owner's trial project, `us-central1`.
The viewable record is [demo/index.html](demo/index.html) (offline, sanitized); its data is
[demo/demo-data.json](demo/demo-data.json), built from [records/](records/) by
[commands/build-demo-data.py](commands/build-demo-data.py) and
[commands/render-demo.py](commands/render-demo.py).

## What ran

| Step | Result | Evidence |
| --- | --- | --- |
| Q04b | `infra/gcp/validate.sh` exits 0 (lint 0 errors; `tofu fmt` 0, `init` 0, `validate` 0) with OpenTofu 1.13.2 and the google 8.8.1 mirror; the only failure before was `fmt` in `locals.tf`. Re-run after every IaC change; lint self-test 8/8 | `records/validate.json` |
| Requote | Cloud Billing Catalog, list prices: about USD 0.18 an hour, USD 131.74 a 730-hour month, for the smallest tiers (db-f1-micro, 2 × shared-core-nano, 1 vCPU / 512 MiB Cloud Run) | [cost-quote.json](cost-quote.json) |
| Budget | Reused: the project's one budget, USD 50 a month, alerts at 20/50/100 % (USD 10/25/50), credits excluded; none created | `records/p01-inventory-before.txt` |
| Auth0 | `qrwtya-api` (identifier `https://api.qrwtya.qrwty.io`, RS256, 60 s tokens) and `qrwtya-web` (machine to machine, one grant, probe only); both deleted at teardown | `records/auth0-teardown.txt` |
| Apply | Eleven saved plans (`plan-01` … `plan-11-destroy`), each applied as saved: foundation (93 resources), secrets and migration job, job VPC egress, services and worker pool, image 2, worker pool 2 and 1, traffic, deletion protection off, destroy. A final plan before teardown reported no changes | `records/plan-*.txt`, `records/apply-*.txt` |
| Images | `qrwtya-images/app@sha256:a99d60c7…87a99` (committed `app/` at `1d79868`, `git archive`) and `@sha256:fa158f69…fe989` (the same plus Q13's AG-13 fix); every Cloud Run resource of a release ran one digest | `records/plan-04.txt`, `records/plan-05.txt` |

## Probes (manifest P01–P12)

| Probe | Result | What showed it |
| --- | --- | --- |
| P01 budget, inventory | passed | One budget read; no `qrwtya-` resource or `click-events` name before apply |
| P02 image digest | passed | Two digests pushed; one per release in every service, the worker pool and the job |
| P03 network, stores, Pub/Sub, IAM | passed after fixes I-2, I-3 | Cloud SQL private only, `TRUSTED_CLIENT_CERTIFICATE_REQUIRED`, no backups (D05 not run); Valkey CLUSTER_DISABLED, `SERVER_AUTHENTICATION`, `AUTH_DISABLED`; subscription ack 60 s, retry 1–10 s, dead letter after 100, 31 days, no expiry |
| P04 credentials | passed | 15 versions generated and piped; the admin password set through the SQL Admin API; nothing printed |
| P05 migrations | passed after fix I-4 | Two executions together (one migrated, one waited on the lock), a third with no template migration, all exit 0; no PUBLIC CONNECT, no admin CONNECT, no runtime CREATE; QRW10 refuses a DELETE |
| P06 startup on managed stores | passed | profile-ok, then SELECT 1 (socket), PING (verify-full TLS, IP SANs, no servername), topic/subscription exists, in every process |
| P06b Valkey and SQL TLS (Q13) | passed | Plain text reset; TLSv1.3 +PONG with the instance's CA; system roots and the other instance's CA refused; Cloud SQL refused plain text and TLS without a client certificate |
| P07 Pub/Sub | passed | 20 publishes as the Redirect account ACKed (p50 44.6 ms, p99 494.6 ms); the worker dead-lettered all 20 with `x-terminal-code` NOT_IMPLEMENTED; 11 Avro archive objects carry all 20 messageIds; another account PERMISSION_DENIED |
| P08 Auth0 | passed (one case not run) | Issuer exact with its slash; A's token signedIn true; changed audience, foreign issuer, unknown key, malformed and expired tokens 401. Not run: a validly signed token for another audience (only B's or the Management API's exist) |
| P09 ingress | passed | Internal services: 404 from the Internet, answer the VPC; public origins: 403 without IAM from the Internet and the VPC, served with the owner's token; deterministic URLs present |
| P10 drain, replicas | partial | Image 2 rolled out under 1,501 requests in 150 s: none failed (p50 24.4 ms, p99 47.8 ms); worker pool 1 → 2 → 1. Old service instances' exit code and time not observable (AG-17) |
| P11 refused revision | passed | `profile-refused` naming `PUBSUB_EMULATOR_HOST`, exit 1, never ready; traffic unchanged; revision deleted |
| P12 providers | partial | Web Risk priced first (100,000 free a month). Q06 image: 403, so 503 `reputation_unavailable`. AG-13 fix: 201 clean, 422 for Web Risk's malware and phishing test URLs, the link in Cloud SQL. Not run: Stripe test mode (Billing API's stub is Q10a, which won't run) |

Not in scope or not run: D03 rollback and credential rotation, D04–D07, the Session API facade,
redirects and every product route behind Q07–Q10b (A02, A03, A09, F07 stay blocked), the optional
qrwty.io route (below).

## Deployment findings

Cloud-revealed defects in A's own IaC (application-owned, fixed in `infra/gcp/`), I-1 to I-10, are
listed with their fixes in [records/gaps.json](records/gaps.json) and on the record page. In short:
`fmt` (I-1); Memorystore's empty discovery endpoints broke the first apply (I-2); one CA per
instance (I-3); the migration job needed VPC egress (I-4); Cloud NAT for Auth0 and Stripe, whose
first connections from a new task failed for 12–48 s (I-5); the archive's 300 s ack deadline (I-6);
volume order (I-7); an undeclared traffic block let a manual pin survive (I-8); Billing API
internal and public origins IAM-protected (I-9); the Q06 additions (I-10). Jeeves gaps: [AG-13 to
AG-17](a-found-gaps.md).

## Application change (AG-13)

Application-owned only: `app/src/modules/link-api/link-operations/google-credentials.ts` (new),
`reputation.ts`, `service.ts`, `app/test/unit/google-credentials.test.ts` (new) and the production
profile (`infra/app-overlay/infra/qrwty/production-profile.json`, installed into `app/` with
`install-overlay.py`). Local checks under Node 24.21.0: `pnpm build`, `pnpm typecheck:test`, `pnpm
lint` (Biome) and `pnpm test` (127 passed, 9 new) exit 0; the preflight refuses
`QRWTY_REPUTATION_CREDENTIALS` unset or `key` and accepts `metadata`; `verify-generated.py app`: 64
generated files unchanged.

## Optional qrwty.io route

Not added. The `qrwty-edge` Worker has no proxy code (only the placeholder, `/healthz` and
`/build.json`), so exposing A's edge needs Worker code, not only a route; and A's public origins
require a Google ID token the Worker can't mint without a key (AG-14). No Cloudflare call was made.

## Teardown

See [records/teardown.json](records/teardown.json) and the record's teardown section: probe
resources by `gcloud` (three jobs, one secret, one service account), archive objects, deletion
protection off (saved plan), then the saved destroy plan of every OpenTofu resource, with the
three `prevent_destroy` guards removed only in a scratch copy of `pubsub.tf` (the committed file
keeps them). Auth0 objects deleted through the Management API. Local images removed by exact name.
The budget was kept; no image was kept.

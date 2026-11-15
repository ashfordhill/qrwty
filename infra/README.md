# QRWTY arm A: deployment

Status: **live since A2 (2026-11-15), on the GCP trial credit only.** Q04 wrote the IaC from the
Jeeves `4e87f97` export of revision 83 with Click events on Google Cloud
([Q04 evidence](../docs/evidence/q04/checks.md)). Q13 applied it once with OpenTofu 1.13.2 and the
google provider 8.8.1, fixed what the cloud showed (Cloud NAT, Memorystore's primary endpoint and
per-instance CA, the migration job's VPC egress, declared traffic, read-back orders), ran the probes
and destroyed it ([Q13 evidence](../docs/evidence/q13/checks.md),
[record](../docs/evidence/q13/demo/index.html)). A1 regenerated `app/` from Jeeves `0aea8e7`; A2
applied the IaC again and put the stack behind `https://qrwty.io` ([below](#live-stack-a2)).

| Folder | What it is |
| --- | --- |
| [`app-overlay/`](app-overlay/) | Application-owned files that go into the export (Q05+ `app/`), never generated ones: `compose.override.yaml` (the local test profile), `scripts/qrwty-production-profile.mjs` (the production preflight) and `infra/qrwty/production-profile.json` (what it allows) |
| [`local/`](local/) | Local harness: `tls-certs.sh` (throwaway CA), `install-overlay.py` (refuses any generated path), `verify-generated.py` (no generated file changed), `profile-check.mjs` (R01's production-profile start), `oracle-commands.mjs` and `ordinary-build.sh` (the oracle adapter's commands) |
| [`gcp/`](gcp/) | OpenTofu: VPC, Cloud NAT, Cloud SQL, Memorystore, Pub/Sub and archive, IAM, secrets, Cloud Run services, worker pool and migration job; `qrwtya.tfvars` (the live values, none a credential). `validate.sh` is the offline check. `scripts/`: `redeploy.sh` (below), `tf.sh` (OpenTofu with the pinned binary, the provider mirror and the state bucket) and `bootstrap-secrets.py` (the first credential versions). Q13's probe commands are in `docs/evidence/q13/commands/` |
| [`q12a/`](q12a/) | The live-probe manifest Q12a runs, its schema and validator |

## Local test profile

```sh
infra/local/tls-certs.sh "$QRWTY_LOCAL_TLS_DIR"            # outside the app tree
python3 infra/local/install-overlay.py <export> infra/app-overlay
cd <export> && pnpm install --frozen-lockfile && pnpm build
COMPOSE_PROJECT_NAME=qrwtya-… LOCAL_HTTP_PORT=… LOCAL_IDENTITY_PORT=… LOCAL_OBJECT_PORT=… \
  QRWTY_LOCAL_TLS_DIR=… pnpm first-run
```

Every container is labelled `qrwty.arm=a`, every application process runs twice, and PostgreSQL and
both caches are reached with `verify-full` TLS, as in production.

## Production profile

Each Cloud Run container runs `node scripts/qrwty-production-profile.mjs <process> && exec node
dist/processes/<process>.js`. The preflight refuses any emulator, fake provider, development
secret, disabled TLS verification, missing value or test hook with a named reason before any network
call. Each credential is its own Cloud Run secret volume (`/var/run/qrwty-secrets/<name>/value`),
which the process reads through `JEEVES_SECRET_<NAME>_FILE` (Jeeves QG34, which closed A-found gap
AG-03); the preflight checks that each variable names that volume. The migration job sets
`JEEVES_MIGRATE_TLS` (QG29). The generated runtime's own checks (`JEEVES_REQUIRE_TLS=true`, `Invalid
setting`) run after it.

## Live stack (A2)

Everything runs in the owner's trial project (`project-f46f6d6a-8e74-42a0-ab1`, `us-central1`) on
the trial credit, which never charges the card unless the account is upgraded (it never is). The
project's one budget (USD 50 a month, alerts at USD 10, 25 and 50) is reused.

| Where | What |
| --- | --- |
| `https://qrwty.io/healthz` | Session API's readiness, through the `qrwty-edge` Worker ([deploy/cloudflare](../deploy/cloudflare/README.md)). Cloud Run's front end keeps `run.app/healthz`, and no other spelling reaches the route (AG-15), so the Worker asks `GET /modules/session-api-sign-in-flow`: the process admits a stub request only once it is ready, so any answer below 500, or the stub's 501, is `ready` |
| `https://qrwty.io/api/*`, `/auth/*` | Session API's API forwarding and sign-in stubs, any method: since A3 the browser's sessions, sign-in, links and account routes, since A4 a link's analytics and CSV ([handoff](../docs/handoff.md)) |
| `https://qrwty.io/<slug>` | GET and HEAD of a short link (10 base62 characters, one segment): the Redirect service's resolve-and-redirect stub (A4); 302 only after the click's Pub/Sub ACK |
| `https://qrwty.io/`, `/app/*`, `/assets/*`, `/versions/` | The app (A5, [web/](../web/README.md)) and the static pages, served by the Worker as static assets |
| Cloud Run services | `qrwtya-session-api` (public, unauthenticated invocation allowed: the Worker can't send a Google ID token, AG-14), `qrwtya-redirect-service` (public, unauthenticated invocation allowed since A4, for the same reason), `qrwtya-link-api`, `qrwtya-account-api`, `qrwtya-billing-api` (internal ingress, reached over the VPC). All minimum 0 instances, maximum 3, 1 vCPU / 512 MiB, CPU only while serving |
| Cloud Run worker pool | `qrwtya-analytics-worker` at 1 instance since A4 (`analytics_workers` in `qrwtya.tfvars`): the click aggregator on `click-events--analytics-worker--analytics-worker-click-aggregator` |
| Cloud Run job | `qrwtya-migrate` (run by `redeploy.sh` before the services roll) |
| Stores | Cloud SQL `qrwtya-pg` (PostgreSQL 17, db-f1-micro, 10 GiB, private address, no backups), Memorystore for Valkey `qrwtya-hot-routes` and `qrwtya-admission-cache` (shared-core-nano, TLS, `AUTH_DISABLED`; each process's `JEEVES_SECRET_CACHE_<ID>_FILE` is `/dev/null`, an empty credential, which works on Cloud Run: both caches answer PING over verify-full TLS at startup), Pub/Sub `click-events` with its subscription, dead letters and Avro archive in `gs://qrwtya-click-archive-<project>` |
| Images | Artifact Registry `qrwtya-images/app`, tagged `app-<first 12 of app/'s git tree hash>`; every Cloud Run resource runs one digest |
| State | `gs://qrwtya-tfstate-523800841789/infra/gcp` (versioned, created by hand in A2) |
| Auth0 | API `qrwtya-api`, identifier `https://api.qrwtya.qrwty.io` (RS256, 300 s tokens, offline access allowed); A3's Regular Web Application `qrwtya-web` (code flow, callback `https://qrwty.io/auth/callback`, logout `https://qrwty.io/`, rotating refresh tokens, a user grant to `qrwtya-api`), with the tenant's `Username-Password-Authentication` (sign-ups allowed) and `google-oauth2` enabled for it, and one `qrwtya-test-…@qrwty.io` user; A6's Machine to Machine application `qrwtya-account-erasure` (only `delete:users` on the Management API) |

### Redeploy

```sh
infra/gcp/scripts/redeploy.sh <release> [--allow-dirty]   # e.g. redeploy.sh HEAD
```

It builds `app/` at `<release>` (`git archive`, `docker build --target app`), pushes it to
`qrwtya-images/app:app-<tree>` and pins its digest (a tag already there is reused: a rebuild of the
same files gets a new digest, so a release that leaves `app/` alone rolls nothing); applies a saved plan of the migration job and
runs it; applies a saved plan of the whole stack (refused if it would destroy or replace anything),
which rolls every service and the worker pool to the new digest; redeploys the Worker from the
working tree (`deploy/cloudflare/deploy.sh`, which refuses a dirty tree unless `--allow-dirty`);
and smoke-tests `https://qrwty.io`: `/healthz` a ready Session API, `/versions/` 200, `/api/*` and
`/auth/*` answered by Session API. A rerun of the same release changes nothing. Plans and logs go
to `$QRWTY_REDEPLOY_DIR` (default a new temporary directory). Needs Docker with
`docker-credential-gcloud`, gcloud with Application Default Credentials, Node 22+ and pnpm, the
coordinator's `.scratch/tools/` (OpenTofu 1.13.2 and the google 8.8.1 mirror, or `QRWTY_TOOLS`), and
`~/.config/qrwty/auth0.env` and `cloudflare.env`, which only `tf.sh` (the tenant domain) and
`deploy.sh` read, never printing them.

Any other change to the stack: `QRWTY_TF_WORK=<dir> infra/gcp/scripts/tf.sh plan -out=x.tfplan`,
read it, then `QRWTY_TF_WORK=<dir> infra/gcp/scripts/tf.sh apply x.tfplan`.

### First apply (done in A2, once)

1. The state bucket: `gcloud storage buckets create gs://qrwtya-tfstate-523800841789
   --location=us-central1 --uniform-bucket-level-access --public-access-prevention`, then
   `--versioning`.
2. Auth0: the `qrwtya-api` API (Management API, from `auth0.env`).
3. A saved plan without the Cloud Run resources (`-exclude=google_cloud_run_v2_service.http
   -exclude=google_cloud_run_v2_worker_pool.analytics -exclude=google_cloud_run_v2_job.migrate`,
   with any digest-shaped `TF_VAR_image`, since none of them reads it), applied: about 20 minutes
   for Cloud SQL and Memorystore.
4. `infra/gcp/scripts/bootstrap-secrets.py <project> qrwtya-pg <every id in tf.sh output -json secret_ids>`:
   the first version of each credential, generated locally and piped to Secret Manager, and the
   `postgres` admin's password through the SQL Admin API.
5. `infra/gcp/scripts/redeploy.sh HEAD`.

### Sign-in (A3, once)

1. `tf.sh` plan and apply of the three new secrets (`qrwtya-signin-client`, `qrwtya-session-keys`,
   `qrwtya-auth0-test-user`) and Session API's two reader bindings, targeted.
2. `bootstrap-secrets.py <project> qrwtya-pg qrwtya-session-keys`: the ring (generated `keyRing()`
   JSON) that seals tokens and signs cookies.
3. With `auth0.env` loaded (`set -a; . ~/.config/qrwty/auth0.env; set +a`, same command):
   `python3 -I infra/gcp/scripts/auth0.py create`, then `store-client` (qrwtya-web's
   `{client_id, client_secret}` straight into `qrwtya-signin-client`) and `test-user` (a password
   generated there, kept only in `qrwtya-auth0-test-user`). `check` lists what exists.
4. `redeploy.sh HEAD`.

### Abuse controls and account erasure (A6, once)

1. `tf.sh` plan and apply, targeted, of three secrets and their readers: `qrwtya-client-address-key`
   and `qrwtya-account-erasure-client` (Session API), `qrwtya-operator-key` (Link API).
2. `bootstrap-secrets.py <project> qrwtya-pg qrwtya-client-address-key qrwtya-operator-key`: 32
   random bytes in hex each.
3. With `auth0.env` loaded: `python3 -I infra/gcp/scripts/auth0.py erasure-client`: the Machine to
   Machine application `qrwtya-account-erasure`, whose only grant is `delete:users` on the
   Management API, and its `{client_id, client_secret}` straight into
   `qrwtya-account-erasure-client`. Session API deletes a deleted account's Auth0 user with it.
4. `redeploy.sh HEAD`. `deploy/cloudflare/deploy.sh` puts the Worker secret `CLIENT_ADDRESS_KEY`
   from `qrwtya-client-address-key` (piped, never printed) when the Worker lacks it; after a new
   version, `QRWTY_PUT_CLIENT_KEY=1 deploy.sh` puts it again and a Session API redeploy reads it.

**The client address.** The Worker sends Session API `QRWTY-Client-Address` (Cloudflare's
`CF-Connecting-IP`) and `QRWTY-Client-Signature: v1.<unix seconds>.<HMAC-SHA-256>` with that key,
and drops any `QRWTY-Client-*` header a browser sent. Session API accepts it within 60 s, reduces it
to its network (IPv4 /32, IPv6 /64), and sends Link API only `QRWTY-Admission-Key`, a keyed hash of
the network. A request without a valid signature (one sent to the `run.app` URL directly) shares the
single key `unverified`. Link API's guest admission allows 10 creates a minute per key (decisions
§4), reports 5 per 10 minutes; nothing stores an address.

**The operator CLI.** An operator is a verified account in Link API's `OPERATOR_SUBJECTS` (unset:
nobody), or the CLI, which signs each request with `qrwtya-operator-key` (only the project's owners
and Link API read it):

```sh
node infra/gcp/scripts/operator.mjs show    <slug or short URL>
node infra/gcp/scripts/operator.mjs block   <slug or short URL> --reason "<why>"
node infra/gcp/scripts/operator.mjs unblock <slug or short URL> --reason "<why>"
# options: --actor <name> (default: the gcloud account), --origin <url> (default https://qrwty.io)
```

`show` prints the link (state, owned or not), its report totals by reason and its last 10 actions.
A block answers 403 everywhere within 30 s (the Redirect service's route entries); an unblock
returns the link to its state before the block (disabled if its owner was erased meanwhile). Each
action records `cli:<actor>` or `account:<subject>`, the reason and the time, kept 13 months. The
signature covers the method, path, time (120 s), a one-time nonce, the actor and the reason; anyone
else gets 404 on `/api/v1/operator/*`. Reports and actions are readable only by Link API's login.

**When abuse spikes.** `gcloud logging read` on `qrwtya-link-api` for `admission cache` failures
(each copy then limits alone), 429s on `POST /api/v1/links` in Session API's request log, and `show`
on a reported link; block with the CLI. A report never blocks anything by itself.

### Cost (trial credit, no charge)

At the Q13 list prices ([cost-quote.json](../docs/evidence/q13/cost-quote.json)), idle, about
**USD 0.124 an hour, USD 3.0 a day** of trial credit: Memorystore 2 nodes USD 1.53 a day, its 4 PSC
endpoints USD 0.96, Cloud SQL and its disk USD 0.31, Cloud NAT and its IP USD 0.15, secrets USD
0.03; since A4 the worker pool's one always-on instance adds about USD 1.0 a day (USD 0.043 an
hour), so about **USD 4.0 a day** in all; Cloud Run at minimum 0, Artifact Registry and the state
bucket round to nothing. Requests add Cloud Run's request-based CPU and memory (USD 0.000024 a vCPU-second) once
traffic arrives. The budget's alerts (USD 10, 25 and 50 a month) are reached after about 3, 8 and
17 days of uptime.

### Teardown

Not scheduled. When wanted, from the repository root:

```sh
export QRWTY_TF_WORK="$(mktemp -d)"
gcloud storage rm -r 'gs://qrwtya-click-archive-project-f46f6d6a-8e74-42a0-ab1/**'   # if it holds objects
infra/gcp/scripts/tf.sh plan -var=deletion_protection=false -out=off.tfplan   # read it
infra/gcp/scripts/tf.sh apply off.tfplan
QRWTY_TF_TEARDOWN=1 infra/gcp/scripts/tf.sh plan -destroy -var=deletion_protection=false -out=destroy.tfplan
QRWTY_TF_TEARDOWN=1 infra/gcp/scripts/tf.sh apply destroy.tfplan
(set -a; . ~/.config/qrwty/auth0.env; set +a; python3 -I infra/gcp/scripts/auth0.py delete)          # A3, A6: users, grants, qrwtya-web, qrwtya-account-erasure
(set -a; . ~/.config/qrwty/auth0.env; set +a; python3 -I docs/evidence/q13/commands/auth0.py delete)  # qrwtya-api
gcloud storage rm -r gs://qrwtya-tfstate-523800841789   # last: the state
docs/evidence/q13/commands/inventory.sh                 # must list nothing
```

`QRWTY_TF_TEARDOWN=1` drops `pubsub.tf`'s three `prevent_destroy` guards in the working copy only.
The images go with their repository. If the private services access connection is refused (its
producer, Cloud SQL, still holds it, as in Q13), rerun the destroy plan later.

## Not here

The billing budget: the project's existing budget ($10/$25/$50 alerts) is reused, and no
configuration here creates one. Credentials: added by `scripts/bootstrap-secrets.py` straight into
Secret Manager, never in Git or OpenTofu state. Auth0 objects: created through its Management API,
not here.

# QRWTY arm A: deployment preparation

Status: **applied once and torn down (Q13, 2026-11-15).** Q04 wrote it from the Jeeves `4e87f97`
export of revision 83 with Click events on Google Cloud ([Q04 evidence](../docs/evidence/q04/checks.md)).
Q13 applied it with OpenTofu 1.13.2 and the google provider 8.8.1, fixed what the cloud showed
(Cloud NAT, Memorystore's primary endpoint and per-instance CA, the migration job's VPC egress,
declared traffic, read-back orders) until a plan reported no changes, ran the probes and destroyed
it ([Q13 evidence](../docs/evidence/q13/checks.md), [record](../docs/evidence/q13/demo/index.html)).
Nothing of it runs now; a few free network objects wait for Q13b.

| Folder | What it is |
| --- | --- |
| [`app-overlay/`](app-overlay/) | Application-owned files that go into the export (Q05+ `app/`), never generated ones: `compose.override.yaml` (the local test profile), `scripts/qrwty-production-profile.mjs` (the production preflight) and `infra/qrwty/production-profile.json` (what it allows) |
| [`local/`](local/) | Local harness: `tls-certs.sh` (throwaway CA), `install-overlay.py` (refuses any generated path), `verify-generated.py` (no generated file changed), `profile-check.mjs` (R01's production-profile start), `oracle-commands.mjs` and `ordinary-build.sh` (the oracle adapter's commands) |
| [`gcp/`](gcp/) | OpenTofu: VPC, Cloud NAT, Cloud SQL, Memorystore, Pub/Sub and archive, IAM, secrets, Cloud Run services, worker pool and migration job. `validate.sh` is the offline check; Q13's commands to apply and probe it are in `docs/evidence/q13/commands/` |
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

Each Cloud Run container runs `node scripts/qrwty-production-profile.mjs <process> &&
SECRET_DIR=/tmp/qrwty-secrets exec node dist/processes/<process>.js`. The preflight refuses any
emulator, fake provider, development secret, disabled TLS verification, missing value or test hook
with a named reason before any network call, and links each Cloud Run secret volume
(`/var/run/qrwty-secrets/<name>/value`) into the one directory the generated runtime reads
(A-found gap AG-03). The generated runtime's own checks (`JEEVES_REQUIRE_TLS=true`) run after it.

## Not here

The billing budget: the project's existing budget ($10/$25/$50 alerts) is reused, and no
configuration here creates one. A's Auth0 application and API: Q12a/Q13. Credentials: added by
Q12a's bootstrap straight into Secret Manager, never in Git or OpenTofu state.

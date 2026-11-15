# Q04 checks: QRWTY cloud bindings prepared and verified locally

Arm A, Q04, attempt 1 (ledger `a-3332`), run `qrwty-r1-20261114`. QRWTY started at `086a599`; main
advanced to `511bd54` during the unit (the coordinator's commit, which also carried this attempt's
start record). Generator: Jeeves **`4e87f97`** only, from `git archive` into `.scratch/Q04/jeeves`
with its own offline install (`pnpm install --frozen-lockfile --offline --ignore-scripts`, exit 0).
Pack **v1.6** (manifest `1250b854…c579`) from a scratch copy: `verify_pack.py` OK; its oracle
installed offline. Node 24.21.0, pnpm 12.16.1, Docker 29.9.1, Compose 5.6.0. Status:
**locally verified; cloud activation pending.**

## 1. Scratch export

| Step | Result |
| --- | --- |
| Design | Q01's `QRWTY-production-candidate-v1-r83-source.json` (`4c16e0ca…5d50`) with one change: `click-events.settings.provider` `unspecified` → `google-cloud` (one-line diff; formatting byte-identical otherwise). Scratch SHA-256 `bffad0db…3029` |
| Export | `pnpm --filter @jeeves/generator export:v2` at `4e87f97`: 87 files, 0 findings, 11 required gaps (the stubs), `processes.runnable` true. Click events is a Pub/Sub topic; Redirect service publishes, Analytics worker consumes `click-events--analytics-worker`; no `local-broker` |
| Build | In the export: `pnpm install --frozen-lockfile --offline` and `pnpm build`, exit 0 |
| Generated files | `infra/local/verify-generated.py`: all 64 generated-scaffold and metadata files equal the manifest, before and after the overlay ([record](records/verify-generated.json)) |
| Application files | Written only by `infra/local/install-overlay.py`, which refuses a generated-scaffold path: `compose.override.yaml`, `scripts/qrwty-production-profile.mjs`, `infra/qrwty/production-profile.json` (not in the manifest) and Q04's probe bodies at four generated-extension paths ([record](records/overlay-install.json)) |

## 2. Bindings verified locally

The stack: Compose project `qrwtya-q04`, loopback ports 47201–47203 and 47221–47230, every
container labelled `qrwty.arm=a`, two copies of every application process, PostgreSQL and both
Valkey caches with TLS only for runtime logins and `verify-full` clients (throwaway CA, generated at
run time outside the tree). `pnpm first-run` exit 0 in 112 s, all 24 containers healthy.

| Binding | Proof | Evidence |
| --- | --- | --- |
| Endpoints from the environment (QG06) | Every process read its endpoints from the override; the rehearsal reached PostgreSQL and Valkey by address with `_TLS_SERVERNAME`; a missing host is `Invalid endpoint …` | [bindings](records/bindings-probe.jsonl), [R01 generated](records/r01-matrix-generated.jsonl) |
| TLS `verify-full`, `disable`, `JEEVES_REQUIRE_TLS` (QG10) | Each request's own connection is TLSv1.3 as its runtime login; a plain-text login is rejected by the server (`no encryption`); a wrong CA is refused (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`); under the switch `disable` is `Insecure endpoint …` | [bindings](records/bindings-probe.jsonl), [TLS override](records/node-tls-override.json) |
| Sign-in issuer and audience (QG11, QG24) | Link API's guard with an Auth0-shaped issuer and A's audience: no token → `signedIn: false`; configured issuer and audience → `signedIn: true`; audience `identity-web`, the issuer without its trailing slash and another issuer → 401 | [OIDC](records/oidc-binding.jsonl) |
| Identity backchannel `JEEVES_IDENTITY_IDENTITY_URL` (QGR2) | Session API's `identityTarget` → Keycloak realm document, 200, from inside the network | [bindings](records/bindings-probe.jsonl) |
| External API base URLs (QG20) | Billing and Link API start only with `JEEVES_EXTERNAL_*_URL` set (override); the preflight requires exactly `https://api.stripe.com` and `https://webrisk.googleapis.com`. No provider call yet (stubs unwritten) | [R01 profile](records/r01-matrix-profile.jsonl) |
| Pub/Sub on the emulator (QG07–QG09) | Publish awaited (202, 14–21 ms); messageId kept; a repeated ID stored once with 2 deliveries; poison → `.failed` with `x-terminal-code: NOT_IMPLEMENTED`; subscription ack 60 s, retry 1–10 s, dead letter after 100; 12,117 publishes through a drain all 202 | [bindings](records/bindings-probe.jsonl), [drain](records/drain-under-load.json) |
| Restricted roles and migrations (QG12) | `migrate.mjs` from the production image with a CREATEDB CREATEROLE non-superuser `postgres`: two at once exit 0 (3.7 s), a third exit 0 (template migrations applied once; product SQL re-runs by design); no database keeps PUBLIC CONNECT, the admin has no CONNECT of its own; runtime logins have no CREATE; Redirect's login reads only `published` | [managed migrate](records/managed-migrate.jsonl) |
| Cache without AUTH (Memorystore `AUTH_DISABLED`) | The generated cache client over TLS to a passwordless Valkey: set/get work with an empty credential and with a password | [cache](records/cache-auth-disabled.json) |
| Cloud Run secret layout | Every profile-mode start mounted credentials as `<dir>/<name>/value`; the preflight linked them; four processes became ready | [R01 profile](records/r01-matrix-profile.jsonl) |

## 3. R01: production profile (pack v1.6 oracle and the full matrix)

Production profile = `QRWTY_PROFILE=production`, `JEEVES_REQUIRE_TLS=true`, `verify-full` by
address with `_TLS_SERVERNAME`, https issuer, tiles and providers, credentials in the Cloud Run
layout, run on an internal network with no route out. Positive controls: Session, Account, Billing
and Link API **start and become ready**; Redirect service and Analytics worker pass the preflight
and stop at the Pub/Sub probe (`Could not load the default credentials`), the expected local limit.

16 forbidden settings in all seven categories × 6 processes:

| Mode | Refused | Named reason | Notes |
| --- | --- | --- | --- |
| Production profile (preflight, then the generated process) | 96/96 | 96/96 | Every refusal from the preflight, before any network call |
| Generated runtime alone | 59/96 | 15/96 | 37 starts accepted (test hooks, fake provider, `SECRET_DIR`, `NODE_TLS_REJECT_UNAUTHORIZED=0`, `JEEVES_REQUIRE_TLS` unset, `METADATA_SERVER_DETECTION`); 44 refused for another reason (a probe, a login) — AG-01, AG-02 |

Oracle (`node src/cli.ts run --rows R01,R02,R03 --scope local --no-reset`, pack v1.6 build 1.6.0, run `oracle-a-20261115T073456-6fae6d`):

| Row | Status | Checks passed/failed/blocked | Notes |
| --- | --- | --- | --- |
| R01 | passed | 3/0/0 | all forbidden starts refused with a named reason; ordinary build without credentials exit 0 |
| R02 | passed | 2/0/0 | limitations listed for the emulator, both provider fixtures and the local issuer, each with its production client |
| R03 | failed | 41/1/0 | every replica drains, starts, restarts and stays live; connection counts bounded. **Failed:** 'session shared through external state' needs the product's `/api/v1/session` (404: Session API's stubs are unwritten until Q07) |

Results: [results.jsonl](oracle/results/results.jsonl), [summary](oracle/results/summary.md), adapter [oracle-adapter.json](oracle/oracle-adapter.json).

## 4. Images and lifecycle (R03)

One production image for every process, setup container and the job: `sha256:ebeb7475ba5478dd9e3cad04cd3d320bdabdb2182ed14e37e60fcbe6a0ea4f97` (14
layers, layer list SHA-256 `5c6c1f5e6a133be0…`), user `node`, label `qrwty.arm=a`
([record](records/image.json)). The image ID also depends on Compose's `com.docker.compose.service`
label (whichever service built it last), with identical layers; Q12a's P02 pushes one digest.

| Lifecycle | Result |
| --- | --- |
| Whole stack | `pnpm stop` exit 0 in 14.2 s, every application container `Exited (0)`; `pnpm start` exit 0 in 58.8 s, all healthy on the rebuilt image (and again for the final rerun) |
| Each replica (oracle R03) | 10 HTTP replicas: SIGTERM with a 10 s bound (Cloud Run's window) drained in 644–731 ms, exit 0; start and restart reach readiness 200; liveness 200 |
| Drain under load | 32 concurrent clients through the edge for 13.2 s: 12,117 requests, all 202 (each awaited a Pub/Sub ACK), while `redirect-service-1` drained in 1113 ms (exit 0) and started again |
| Connections | At most 20 for Redirect's login with two copies (bound 10 per copy) |
| Two copies share only external state | Both Redirect copies served the same probe stream; both analytics workers consumed one subscription and wrote one table (one row per messageId). The oracle's session check is the R03 failure above |

## 5. IaC draft and static validation (R04's command)

`infra/gcp/`: 10 files, 32 resources, 1 data source, 11 variables, OpenTofu `= 1.13.2`, google
provider `8.8.1` (both at least two weeks old). Every name starts with `qrwtya-` except the three
Pub/Sub names the export compiles (AG-05); no budget, no credential in configuration or state.

| Check | Result |
| --- | --- |
| `python3 infra/gcp/lint_iac.py` (lexing, block structure, references, names, no budget or state credential, exact pins) | exit 0, 0 errors ([record](records/lint-iac.json)) |
| `bash infra/gcp/lint_selftest.sh` (8 injected faults) | 8/8 detected ([record](records/lint-iac-selftest.jsonl)) |
| `bash infra/gcp/validate.sh` (`tofu fmt -check`, `init -backend=false`, `validate` under `unshare -rn`) | **blocked, exit 3**: OpenTofu is not installed here, and downloading the pinned release was refused by this session's permission policy. Not run; Q12a's P03 runs it first |

## 6. Q12a probe manifest

`infra/q12a/probe-manifest.json`: 12 probes (P01–P12), each with bindings, checks, steps, expected
results, region, resources, cost inputs (prices `null` until requoted from the linked price list
before apply) and teardown, plus the whole teardown. `python3 infra/q12a/validate_manifest.py`:
valid against `probe-manifest.schema.json` (Draft 2020-12), every named resource is in the IaC, and
6/6 injected faults rejected ([record](records/probe-manifest-validate.json)).

## 7. Hygiene

| Check | Result |
| --- | --- |
| Generated files | `verify-generated.py` on the final export: 64 generated files equal the manifest; the only changed manifest-listed files are the four generated-extension probe paths ([record](records/verify-generated.json)) |
| Secret scan | `commands/secret-scan.py` over `docs/evidence/q04` and `infra` (71 files): no credential shape (private keys, JWTs, Stripe, AWS, GitHub, Slack, Google, npm, URL credentials, quoted passwords) and none of this run's 33 credential values (the stack's generated passwords and the TLS private keys, checked by value, never printed) |
| `git diff --check` | clean on the staged unit |
| Ledger | `ledger.py validate` exit 0 after this attempt's update |
| Docker | Before: no `qrwtya*` or `qrwty.arm=a` resource. After `commands/teardown.sh` (by exact name, no prune): none left; 19 containers, 2 networks, 3 volumes and the image tag `qrwtya-q04-app:latest` removed ([record](records/teardown.jsonl)). BuildKit cache layers remain (no prune). Other lanes' containers were not touched |
| Credentials | No credential was written to the repository; every test value was generated at run time in `.scratch/Q04` (private). `~/.config/qrwty/` was not read |
| Timing | Every duration above is from `performance.now()` or `/proc/uptime` |

Commands as run are in [commands/](commands/) and `infra/local/`; the final rerun is
[commands/final-rerun.sh](commands/final-rerun.sh). The pg_ssl step of `bindings-probe.sh` is
empty because the pools had closed their idle connections; each probe request's own connection
shows TLS instead.

## 8. Not run (Q12a backlog)

Everything that needs GCP or Auth0: managed Pub/Sub ACK durability, IAM, archive delivery and
retention; Cloud SQL through the connector on a private-IP-only instance, its non-superuser admin
and the socket; Memorystore's managed CA, certificate names, `AUTH_DISABLED` behaviour and
`TOKEN_AUTH`; Auth0's issuer, A's audience and key rotation; Cloud Run ingress, internal calls with
invoker IAM off, the default-URL bypass, the 10 s drain window and the worker pool; the pushed image
digest; `tofu validate`. Each is a probe in the manifest; none is passed here.

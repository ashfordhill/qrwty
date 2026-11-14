# Q03 commands, as run

Scratch root `$S` = `/tmp/claude-1000/-home-ash-github-jeeves/25a62ed6-cc60-4bd9-b2cf-35664f59d9c5/scratchpad/q03`
(outside both repositories, deleted at the end of the unit). `PATH=$HOME/.nvm/versions/node/v24.21.0/bin:$PATH`
for every Node command. Jeeves at `59bfbc6`; no Jeeves file and no Jeeves project was written
(`git status` in Jeeves before and after lists only the owner's two mode changes, the
`.jeeves-feedback/` and `Zone.Identifier` paths).

| # | Command | Result | Output |
| --- | --- | --- | --- |
| 1 | `jeeves-generator/node_modules/.bin/tsx commands/build-fixture.mts $S/fx/design.json` (studio command path in memory: `buildSupportedAuthoringCommand` + `applyOperations` with `loadLocalV2Registry().installed`) | revision 24, 0 export blockers, the two queue edits refused | [probe-design.json](../fixtures/probe-design.json), [commands log](../fixtures/probe-design.commands.json) |
| 2 | `pnpm --filter @jeeves/generator export:v2 $S/fx/design.json $S/fx/export` (Jeeves root) | exit 0, 0.46 s: 57 files, `applicationComplete: false`, 0 findings, 3 required gaps (the three stubs), runnable | [export.log](../logs/export.log), [summary](../fixtures/probe-export-summary.json) |
| 3 | `cp -a export run`; the five [application-owned files](../fixtures/app-code/) written to their `generated-extension` paths (checked against the manifest); app-owned [`compose.override.yaml`](../fixtures/compose.override.yaml) added (not in the manifest) | — | — |
| 4 | in `run`: `pnpm install --frozen-lockfile --ignore-scripts --offline`; `pnpm build` | exit 0, exit 0 | [install](../logs/install.log), [build](../logs/build.log) |
| 5 | `node commands/probe-identity.mjs $S/fx/run` | exit 0 | [g03-identity.json](../probes/g03-identity.json) |
| 6 | `env SECRET_DIR=<fake> PGHOST=127.0.0.1 PGPORT=55432 PGSSLMODE=verify-full REDIS_URL=… AMQP_URL=… OIDC_ISSUER=https://issuer.example OIDC_JWKS_URL=… node dist/processes/{front,tally}.js` (secret files hold the text `probe-not-a-secret`) | both exit 1 | [g01-endpoints.txt](../probes/g01-endpoints.txt) |
| 7 | `COMPOSE_PROJECT_NAME=q03-probe LOCAL_HTTP_PORT=47921 LOCAL_IDENTITY_PORT=47922 LOCAL_OBJECT_PORT=47923 pnpm first-run` | exit 0, 80 s, 7 services healthy | [first-run.log](../logs/first-run.log), [stack-ps.txt](../probes/stack-ps.txt) |
| 8 | `docker compose --profile '*' config --format json` (same variables) | override merged | [compose-override-merge.txt](../probes/compose-override-merge.txt) |
| 9 | `curl` against `http://127.0.0.1:47921/api/front/modules/…` (redirect, method, raw ×5, internal route, env, caller ×2, provider, identity) | as recorded | [http-edge.txt](../probes/http-edge.txt), [raw-body.bin](../probes/raw-body.bin) |
| 10 | `curl -X POST …/front-probe/tx` ×3, `…/fn` | as recorded | [g02-transactions.txt](../probes/g02-transactions.txt) |
| 11 | publish probe: normal ×2 (same ID), `docker pause`/`unpause q03-probe-local-broker-1`, `docker stop`/`start` of it, polling until 202; `rabbitmqctl list_queues`; the consumer's `m_tally_count.seen` rows | as recorded (the first attempt's output file was truncated by `curl -o /dev/stdout`; its surviving tail is kept and the run repeated) | [g04-publish.txt](../probes/g04-publish.txt), [first attempt's tail](../probes/g04-publish-run1-tail.txt) |
| 12 | startup coupling: `docker stop q03-probe-cache-hot-1`, `docker restart q03-probe-app-front-1`; `docker stop q03-probe-local-broker-1`, `docker restart q03-probe-app-tally-1`; listening sockets from `/proc/net/tcp{,6}` | as recorded | [g04-startup-coupling.txt](../probes/g04-startup-coupling.txt) |
| 13 | cache probe: set, get; `docker pause`/`unpause q03-probe-cache-hot-1`; `docker stop`/`start` | as recorded | [g05-cache.txt](../probes/g05-cache.txt) |
| 14 | own `postgres:17.11-alpine3.23@sha256:bc2701f9…` containers `q03-pg-nonsuper` (127.0.0.1:47931; superuser `bootstrap`, then `CREATE ROLE postgres LOGIN CREATEDB CREATEROLE`) and `q03-pg-fresh` (127.0.0.1:47932); in a copy of `run`: `env PGHOST=127.0.0.1 PGPORT=… SECRET_DIR=<copy>/.runtime/secrets node scripts/migrate.mjs` (non-superuser; after `GRANT o_store, o_tally_db, io_identity TO postgres WITH INHERIT FALSE, SET TRUE`; repeat; two concurrent first runs on the fresh one; a third) | exit 1; exit 0; exit 0; exit 1 + exit 0; exit 0 | [g06-migrations.txt](../probes/g06-migrations.txt) |
| 15 | drain: `docker pause` the cache, one in-flight `GET …/cache`, `docker stop -t 10 q03-probe-app-front-1` | stop took 14.0 s, exit 137 | [g09-drain.txt](../probes/g09-drain.txt) |
| 16 | `docker compose --profile '*' down --volumes --remove-orphans`; `docker image rm q03-probe-app:latest`; `docker rm -f q03-pg-nonsuper q03-pg-fresh`; `docker volume rm` of those two containers' anonymous volumes (created 02:17:59 and 02:18:38, label `com.docker.volume.anonymous`) | exit 0 | [down.log](../logs/down.log) |
| 17 | `node commands/probe-http-offline.mjs $S/fx/run`; a temporary `src/q03-type-probe.ts` with two `Set-Cookie` values, `tsc --noEmit`, then deleted | exit 0; TS2322 | [g13-g10-http-offline.json](../probes/g13-g10-http-offline.json), [g10-set-cookie-type.txt](../probes/g10-set-cookie-type.txt) |
| 18 | `docker pull gcr.io/google.com/cloudsdktool/google-cloud-cli:591.0.0-emulators@sha256:112c21f8…f935` (the image N01 pinned; free, 19 s); container `q03-pubsub` on 127.0.0.1:47941 (`gcloud beta emulators pubsub start --host-port=0.0.0.0:8085 --project=q03-probe`) | started | [pubsub-pull.log](../logs/pubsub-pull.log) |
| 19 | `PUBSUB_EMULATOR_HOST=127.0.0.1:47941 node commands/probe-pubsub.cjs setup`; `docker stop q03-pubsub`; `… stopped`; `docker start q03-pubsub`; `… restarted` (SDK `@google-cloud/pubsub` 6.3.2 from the neutral oracle's install, read only) | exit 0 ×3 | [setup](../probes/g12-pubsub-setup.json), [stopped](../probes/g12-pubsub-stopped.json), [restarted](../probes/g12-pubsub-restarted.json) |
| 20 | `docker rm -f q03-pubsub`; `docker image rm gcr.io/…/google-cloud-cli@sha256:112c21f8…f935` | removed | — |
| 21 | `docker images`/`volume ls`/`network ls`/`ps -a` before step 7 and after step 20 | all four lists equal | [logs](../logs/) (`*-before.txt`, `*-after.txt`) |

No container, volume, network or image tag created by this unit remains; `jeeves-postgres-1` and
other projects' containers were not touched. BuildKit cache layers from the `q03-probe-app` build
remain (no prune).

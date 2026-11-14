# Neutral acceptance oracle (pack v1.3)

The executable form of the [black-box specification](../frozen/acceptance-oracle.md), built by unit
N01 from the [tooling plan](../frozen/oracle-tooling-plan.md). It drives an arm only through the
[external contract](../frozen/http-contract.md) and the arm's test control interface, described by
the arm's `oracle-adapter.json`. Only an oracle run can mark an A, F, R or U row `passed`.

Both arms run it **from their own copy of this pack and never edit it**. A defect in the oracle is
fixed by a further pack version, rerun in both arms.

## Install

Node.js 24.21.0 and pnpm 12.16.1 (decisions §6, as amended in v1.1). From the pack copy:

```sh
cd <pack>/oracle
pnpm install --frozen-lockfile        # installs into oracle/node_modules (ignored by verify_pack.py)
pnpm check                            # Biome, TypeScript, the oracle's unit tests
pnpm exec playwright install chromium # browser rows (A01, U02-U08) only
```

`pnpm-workspace.yaml` sets `minimumReleaseAge: 20160` (14 days), so every resolved package is at
least two weeks old; no dependency runs an install script.

## Run against an arm

```sh
node src/cli.ts validate-adapter <arm>/oracle-adapter.json
node src/cli.ts run --adapter <arm>/oracle-adapter.json --out <arm evidence dir> \
  [--rows A09,A24 | --all] [--scope local|staging] [--ui-names <frozen ui-names.json>] [--no-reset]
node src/cli.ts summary <arm evidence dir>/results.jsonl   # regenerates summary.md
node src/cli.ts fixtures --adapter <arm>/oracle-adapter.json  # Stripe and Web Risk fixtures, for the arm's own development
node src/cli.ts list                                          # rows, coverage and scope
```

`run` exits 0 only when every selected row passed. Before each row it calls the adapter's `reset`
command (unless `--no-reset`) and resets the oracle's fixtures. Results are written to the arm's
evidence folder, never to the pack.

Environment: the variables the adapter names (`edgeTokenEnv`, `identity.passwordEnv`,
`providers.stripe.webhookSecretEnv`) must be set for the rows that need them; their values are
registered as secrets and redacted from every result and artifact. A row whose capability is
missing is `blocked`, with the reason, and is not run.

## Result format

One `results.jsonl` per run (one JSON object per row, append order), `summary.md` beside it, and
`artifacts/<runId>/<acceptanceId>/…` referenced by path and SHA-256.

```json
{
  "runId": "oracle-b-20261120T101500-3f2a1c",
  "arm": "b", "commit": "<tested commit>", "images": {"<name>": "sha256:<digest>"},
  "environment": {"scope": "local", "oracle": {"pack": "v1.3", "version": "1.3.0", "node": "v24.21.0"},
                  "adapterPath": "…", "adapterSha256": "…", "publicEntry": {…}, "fixtures": {…}},
  "acceptanceId": "A09", "status": "passed | failed | blocked | not run",
  "startedAt": "<RFC 3339>", "endedAt": "<RFC 3339>",
  "command": "node src/cli.ts run --adapter … --rows A09",
  "expected": "<pass condition from acceptance-oracle.md>",
  "observed": {"checks": [{"name": "…", "status": "passed", "expected": "…", "observed": …}],
               "clockOffsets": [{"at": "…", "offsetMs": 0, "boundMs": 250}], "params": {…}},
  "artifacts": [{"path": "artifacts/<runId>/A09/commands.json", "sha256": "…"}],
  "notes": "…"
}
```

A row's status comes from its checks: any `failed` → failed; else any `blocked` → blocked; else any
`not run` → not run; else passed (a row with no checks is blocked). An exception in the arm's
behaviour is a failed check; a failing adapter command is `blocked`. `params` are the frozen
timing bounds; only the self-test may shorten them, and then they are recorded. Captures drop
cookies, authorization, CSRF tokens, the edge token and Stripe signatures; known key patterns and
registered secrets are replaced by `[redacted]`. Failures are kept: a rerun is a new result.

## Writing `oracle-adapter.json`

Each arm writes it (counted in that arm's test/support source) and validates it with
`validate-adapter`. The schema is [adapter.schema.json](adapter.schema.json); unknown keys are
errors. Relative paths (`cwd`, inventory files) resolve against the manifest's folder.

| Field | Meaning |
| --- | --- |
| `schemaVersion` | `1` |
| `arm`, `commit`, `images` | `a` or `b`, the tested commit, image name → `sha256:` digest |
| `publicEntry` | `url`: where the oracle connects (the test profile's trusted edge in front of the origin); `origin`: `PUBLIC_ORIGIN`, sent as `Host` and used for `shortUrl`. For browser rows the origin must resolve to the entry (for example `http://qrwty.localhost:47100`) |
| `edgeTokenEnv` | Variable holding `ORACLE_EDGE_TOKEN`. The oracle sends it as **`X-Oracle-Edge-Token`**, with `X-Oracle-Client-IP`, `X-Oracle-Country` and `QRWTY-Synthetic`; only then may the edge turn them into trusted forwarded headers |
| `services` | Name → `roles` (`redirect`, `session`, `link`, `account`, `billing`, `edge`, `other`), `replicas` (`name`, internal `url`, `container`), `health`, `readiness`, optional `guardedRoutes` (`method`, `path`) that require a bearer token (A14). At least one service has the `redirect` role; `session` replicas are the browser-facing API (A02, A22, F05, R03) |
| `workers` | `name`, `kind` (`analytics`, `billing`, `other`), `container` |
| `commands` | See below |
| `toxiproxy` | `apiUrl` and `proxies`: dependency → proxy names. Keys `postgres` (and optionally `postgres.links`, `.sessions`, `.billing`, `.analytics`), `valkey`, `pubsub` (optionally `pubsub.publish`, `pubsub.consume`), `issuer`, `stripe`, `webRisk`. A finer key falls back to its parent |
| `pubsub` | `emulatorHost` as the oracle reaches it **directly** (not through Toxiproxy), `project`, `topic`. The oracle creates its own capture subscription before traffic and publishes to the topic |
| `identity` | `issuerUrl` (the `iss` value, reachable by the oracle), `audience`, the accounts `oracle-alice`, `oracle-bob`, `oracle-operator`, `passwordEnv`. The oracle signs in through `/auth/login` and the issuer's HTML login form, like a browser |
| `providers.stripe` | `listen` (host:port the oracle's Stripe fixture binds; the arm's test profile points the official Stripe SDK's `host`/`port`/`protocol` there), `webhookUrl` (the arm's webhook as the oracle reaches it), `webhookSecretEnv`, `priceId` (the allowlisted price the arm sends; offline: `price_TEST_qrwty_paid_monthly_v1`) |
| `providers.webRisk` | `listen` for the Web Risk fixture (`GET /v1/uris:search`), `deadlineMs` (the arm's adapter deadline) |
| `productionProfileCheck` | `command`, `processes`, `settings` (`category`, `name`): categories `emulator-endpoint`, `fake-provider`, `development-secret`, `tls-verification-disabled`, `missing-required-value`, `placeholder-credential`, `test-hook`. Used by R01 and A18 |
| `deploymentPreparation` | `iacValidate` (command), `secretInventory`, `limitations`, `activationBacklog`, `imageDigestsByConfiguration` (JSON files), `freshCheckout` (`build`, `start`, `migrate`, `deployRehearsal`, `rollback` commands). Used by R02–R06 |
| `ui` | `skins`, `selectSkin` (`query` parameter or `storage` key), optional `humanScans` (U06 real-phone scans) |
| `versions.previous` | Set only when a second released version exists (F08) |

### Commands

A command is `{"argv": [...], "cwd"?: "...", "timeoutMs"?: n}`, run **without a shell**;
`{placeholder}` parts are replaced by the arguments below. Every command prints one JSON value on
stdout (the last line is used if there is other output) and exits non-zero on failure.

| Command | Placeholders | Prints |
| --- | --- | --- |
| `start`, `stop`, `kill` (SIGKILL), `restart` | `{target}`: a replica or worker name | `{"ok": true}` |
| `terminate` (SIGTERM, then wait for drain) | `{target}` | `{"drainedMs": n, "boundMs": n}` |
| `scale` | `{service}`, `{count}` | `{"replicas": [{"name", "url"}]}` |
| `reset` | – | `{"ok": true}` after a full reset to a clean state (stores, cache, topic backlog, fault points, clock 0, accounts recreated with the run's password) |
| `clock` | `{offsetMs}`: absolute offset from real time | `{"offsetMs": n, "boundMs": n}` (`boundMs` is the recorded clock bound) |
| `faultPoint` | `{name}`, `{state}` (`on`/`off`), `{arg}` | `{"ok": true}`. Names: `consumer-exit-after-commit-before-ack` (arg: worker), `force-slug-collision` (arg: existing slug), `pause-reconciliation-worker`, `corrupt-route-cache` (arg: slug; F01, an N01 addition) |
| `inspect` | `{what}` | see below |
| `backup` / `restore` | – / `{backupId}` | `{"backupId"}` / `{"publicEntry": {"url", "origin"}}` of the isolated restored copy |
| `rotateIdentityKey` | – | `{"newKid"}` |
| `rogueKey` | – | `{"privateJwk": <RSA or P-256 JWK>, "kid"}`: a key the arm does not trust |
| `issueToken` (optional) | `{account}`, `{audience}`, `{issuer}`, `{expiresInSeconds}` | `{"token"}` signed by the **real** issuer key with those claims; without it A14 signs those cases with the rogue key |
| `replayQuarantine` | – | `{"ok": true}` after replaying the quarantine through the normal consumer (A12) |
| `subscriptionCheck` | `{case}`: `inactivity-expiry-enabled`, `missing-archive-subscription` | `{"rejected": bool, "reason"}` (F09) |
| `ordinaryBuildAndTest` | – | `{"ok": true}`; run with cloud credentials removed and an empty `HOME` (R01) |
| `productionProfileCheck.command` | `{process}`, `{setting}`, `{category}` | `{"refused": bool, "reason": "<named reason>"}`, exit 0 when the check ran |

`inspect` answers (read-only):

| `what` | Shape |
| --- | --- |
| `dbConnections` | `{"byService": {"<service>": {"current": n, "max": n}}}` (F01 sums `current`) |
| `dbQueries` | `{"byService": {"<service>": n}}`, cumulative counters |
| `memory` | `{"byProcess": {"<name>": {"rssBytes": n}}}` |
| `publisherQueue` | `{"byProcess": {"<name>": {"depth": n, "bound": n, "deadlineMs": n}}}` |
| `consumerBacklog` | `{"messages": n, "oldestAgeSeconds": n}` |
| `quarantine` | `{"items": [{"eventId"?, "messageId"?, "reason", "attempts"}]}`, oldest first |
| `operatorActions` | `{"items": [{"actor", "action", "linkId", "reason", "at"}]}` |
| `alerts` | `{"items": [{"name", "state": "firing" | "ok", "severity"}]}` |
| `safetyGate` | `{"redirectAdmission": "open" | "closed", "reason"}` |
| `webhookInbox` | `{"items": [{"eventId"}]}`, one item per stored provider event |
| `linkCount` | `{"links": n}`, rows in the links table (A17) |

Inventory files (R rows): `secretInventory` `{"bindings": [{"name", "owner", "source",
"classification"}]}`; `limitations` `{"items": [{"component", "limitation", "productionClient"}]}`
with components `pubsub-emulator`, `stripe-fixture`, `web-risk-fixture`, `local-issuer`;
`activationBacklog` `{"checks": [{"id", "description", "resources": [], "price", "teardown",
"status": "not run"}]}` listing at least D01, D02, D03, D09, D10; `imageDigestsByConfiguration`
`{"configurations": {"<name>": {"images": {...}, "uiHashes": {...}}}}`. `deployRehearsal` prints
`{"sourceEdits": 0}` when switching configuration needed no source edit.

## Rows

One module per acceptance ID in `src/rows/`. `coverage` says whether the self-test exercises the
row against a deliberately wrong double, or whether it can only run against a real arm (it is still
implemented against the adapter interface, and its helpers are unit-tested).

| Coverage | Rows |
| --- | --- |
| Self-test double (good and faulty) | A01, A02, A03, A04, A05, A06, A07, A08, A09, A10, A14, A16, A17, A18, A20, A24, F03 |
| Live arm only | A11, A12, A13, A15, A19, A21, A22, A23, F01, F02, F04, F05, F06, F07, F08, F09, F10, R01–R06, U02–U08 |

Browser rows (A01, A04's browser step, U02–U08) drive the UI by accessible role and name through
logical keys (`src/browser/names.ts`). The name list is frozen by the pack amendment that carries
Q11's design assets ([acceptance-oracle §6](../frozen/acceptance-oracle.md#6-ui-rows)); it is
passed with `--ui-names` (schema [ui-names.schema.json](ui-names.schema.json)). Until then those
rows report `blocked`. The browser makes every host except the arm, its issuer and the fixtures
unresolvable, and fulfils destination navigations locally, so no destination is ever fetched.

## Contract readings (N01)

Where the frozen documents leave a detail open, the oracle reads it as follows. The coordinator
may change any of these in a later pack version.

- **A06 foreign claim.** http-contract §4 allows `409 claim_consumed` "also when another account
  owns it"; A06 asks for 404 on foreign objects. A06 accepts 404, `403 claim_invalid` or
  `409 claim_consumed` for the claim, provided no Bob data is returned.
- **Uncertain publishes.** A24 needs every captured message without a 302 to be explained by a
  410/503 carrying its event ID, or by a request in flight at a kill. A 503 for a timed-out or
  ambiguous publish must therefore carry `QRWTY-Click-Event` (with no `Location`).
- **Publish before 302.** A24 and F03 also compare the message's Pub/Sub `publishTime` with the
  time the response head reached the capture proxy (tolerance 50 ms locally).
- **Free or paid** is read from `policy` (`free-test-v1`, `paid-test-v1`); `tier` is not interpreted.
- **Quota errors** carry `limit`, `used` and `periodEnd` either inside `error` or beside it.
- **Guest admission** is exercised through the trusted edge with synthetic client addresses; each
  oracle actor otherwise gets its own address in `198.19.0.0/16`, so only A17 meets the limit.
- **Clock.** Moves of more than 12 hours are made in 12-hour steps that touch the sessions the row
  still needs (the 24-hour idle timeout follows the clock). A12's 32-day event is published with an
  `eventTime` 32 days in the past rather than by moving the clock.
- **F01 corrupt cache entries** need the `corrupt-route-cache` fault point (not in §2's list); without
  it that check is `blocked`.

## Self-test

`selftest/` holds a small in-memory **double** of the external contract (table-driven; not a
reference implementation, and arms must not copy it) with one mode per deliberate fault, and
`cases.ts` listing each case with the status the oracle must report. Run it with the pinned
dependencies:

```sh
docker run -d --name <name>-pubsub --network host \
  gcr.io/google.com/cloudsdktool/google-cloud-cli:591.0.0-emulators@sha256:112c21f8f6e04b03b393b3c34fb943a1f443e839f18c6492c364ac2e6c3ff935 \
  gcloud beta emulators pubsub start --host-port=127.0.0.1:47285 --project=oracle-selftest
docker run -d --name <name>-toxiproxy --network host \
  ghcr.io/shopify/toxiproxy:2.13.0@sha256:5d3dae09bc185dcc5ff6cf43abf6062a4a720aff0c4306a471e773acdcd107aa \
  -host 127.0.0.1 -port 47274
node selftest/run.ts --out <dir> --pubsub-emulator 127.0.0.1:47285 --toxiproxy http://127.0.0.1:47274
ORACLE_IT_PUBSUB=127.0.0.1:47285 ORACLE_IT_TOXIPROXY=http://127.0.0.1:47274 pnpm test:integration
```

The suite passes only when every case gets its expected status: every faulty double must be
reported `failed`, and every correct one `passed` (or `blocked` where the double deliberately lacks
a capability). Remove the two containers afterwards by name.

## Pins

| Package or image | Version | Published |
| --- | --- | --- |
| Node.js | 24.21.0 | 2026-09-07 |
| pnpm | 12.16.1 | 2026-10-27 |
| TypeScript | 7.0.2 | 2026-07-08 |
| `@types/node` | 24.19.2 | 2026-10-09 |
| Vitest | 5.0.0 | 2026-09-03 |
| `@playwright/test` (Chromium 153.0.8010.12, revision 1243) | 1.63.0 | 2026-09-04 |
| `@biomejs/biome` | 2.6.4 | 2026-10-28 |
| `@google-cloud/pubsub` | 6.3.2 | 2026-10-29 |
| `jsqr` | 1.4.0 | 2021-04-24 |
| `pngjs` | 7.0.0 | 2023-02-20 |
| `@types/pngjs` | 6.0.5 | 2024-05-02 |
| `stripe` (tests and the self-test double only: proves signer and fixture compatibility) | 23.1.0 | 2026-10-29 |
| `qrcode`, `@types/qrcode` (tests and the self-test double only) | 1.5.4, 1.5.6 | 2024-08-05, 2025-10-24 |
| Toxiproxy server `ghcr.io/shopify/toxiproxy` (`sha256:5d3dae09…07aa`) | 2.13.0 | 2026-10-14 |
| Pub/Sub emulator `gcr.io/google.com/cloudsdktool/google-cloud-cli` (`sha256:112c21f8…f935`) | 591.0.0-emulators | 2026-10-27 |

The Toxiproxy driver is the oracle's own code (`src/faults/toxiproxy.ts`, the server's HTTP API);
no third-party driver package is used. Every locked package's date is in
`../evidence/n01/pins.json`.

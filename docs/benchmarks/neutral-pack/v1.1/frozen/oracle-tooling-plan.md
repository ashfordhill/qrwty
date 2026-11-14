# Neutral acceptance oracle: tooling plan

Frozen by Q00. This plans a **later shared unit**, proposed as **N01 — Build the neutral
acceptance oracle**. Q00 implements nothing here. The coordinator schedules N01 as one fresh
shared worker; it should finish before either arm reports an A, F, R or U row as passed (arms
keep building and testing with their own suites meanwhile).

## Inputs and isolation

- **Reads only this pack:** the [black-box specification](acceptance-oracle.md), the
  [external contract](http-contract.md), the [frozen decisions](decisions.md) and the copied
  contracts. Public documentation and packages are allowed and recorded.
- **Never reads** A's or B's source, tests, IaC, handoffs or history, nor Jeeves. Its author has
  no arm context. A-generated tests are never promoted into the oracle.
- Charged once to the **shared** ledger. Arm adapters (manifest and commands) are each arm's own
  work, counted in that arm's support/test source.

## Deliverable

Pack version **v1.1**: a self-contained copy of v1 plus `oracle/`, with a new manifest. Both arms
run the oracle from their pack copy and never edit it; a defect is fixed by a further pack
version, rerun in both arms.

```
oracle/
  package.json, pnpm-lock.yaml       pinned per decisions §6 (Node 24.22.2, pnpm 12.16.1, TS 7.0.2,
                                     Vitest 5.0.0, Playwright 1.63.0, Biome 2.6.4)
  adapter.schema.json                schema of an arm's oracle-adapter.json
  src/client/                        raw HTTP (node:http / node:net for byte-exact requests,
                                     no redirect following), session + CSRF + idempotency helpers
  src/fixtures/                      destination corpus, reputation (Web Risk) fixture server,
                                     stateful Stripe API fixture, Stripe webhook signer,
                                     known click streams, poison messages, test accounts
  src/observe/                       capture reverse proxy (status, headers, timing, event header),
                                     Pub/Sub capture subscriber, result writer
  src/faults/                        Toxiproxy HTTP API driver; adapter command runner
  src/rows/                          one module per acceptance ID (A01-A24, F01-F10, R01-R06, U02-U08)
  selftest/                          known-bad servers proving each check can fail
  README.md                          how an arm runs it; result format
```

## Components

| Component | Specification |
| --- | --- |
| HTTP client | Sends exact bytes (CR LF injection, spoofed `Host`), never follows redirects, records raw response headers |
| Capture proxy | Sits in front of the arm's public entry; records every request and response with monotonic timestamps; used by A07, A08 and A24 |
| Pub/Sub capture | Uses `@google-cloud/pubsub` (exact version pinned by N01, at least two weeks old) against the emulator; creates its own subscription on the arm's topic before traffic; can publish duplicates, out-of-order and poison messages |
| Fault driver | Talks to a Toxiproxy server (exact version pinned by N01) through its HTTP API: refuse (disable), stall (latency/timeout toxics), break (reset_peer) |
| Stripe fixture | A stateful server for the Stripe API subset the contract needs (customers, Checkout sessions, portal sessions, subscriptions, events), with idempotency-key handling, a call log, controllable state, delay and failure. Arms point the official Stripe SDK's host at it in the test profile. Real Stripe test-mode runs are separate rows |
| Webhook signer | Signs fixture events with the secret named by the adapter; can alter one byte after signing |
| Web Risk fixture | `uris.search` responses by destination path marker (`/oracle/unsafe/`, `/oracle/slow/`, `/oracle/error/`) |
| Browser driver | Playwright with route interception for destination opens; QR decoding with jsQR and pngjs (exact pins by N01); SVG rasterized in the browser before decoding |
| Clock | Calls the adapter's clock-offset command; records offsets in each result |

## Adapter manifest (`oracle-adapter.json`)

Written by each arm. Fields: `arm`, `commit`, `images` (name → digest), `publicEntry`,
`edgeTokenEnv`, `services` (name → replica base URLs, health and readiness paths), `workers`,
`commands` (start, stop, kill, terminate, restart, scale, reset, clock, faultPoint, backup,
restore, inspect, rotateIdentityKey), `toxiproxy` (API URL and proxy names per dependency),
`pubsub` (emulator host, project, topic), `identity` (issuer URL, account names, password env,
rogue-key command), `providers` (Stripe fixture binding, webhook secret env, Web Risk binding),
`productionProfileCheck` (the command R01 runs with each forbidden setting). Commands print JSON
and exit non-zero on failure.

## Results

One `results.jsonl` per oracle run, stored in the arm's evidence folder:
`{runId, arm, commit, images, environment, acceptanceId, status, startedAt, endedAt, command,
expected, observed, artifacts: [{path, sha256}], notes}`. A summary table is generated from it.
Secrets never appear in results or captures; captures drop cookies and authorization headers.

## Self-test

For each check, a small deliberately wrong server must make the oracle report `failed`, for
example: a 302 sent before the event (A24); an altered `Location` (A09); 301 instead of 302;
missing `no-store`; `HEAD` that emits an event; another account's link returned with 200 (A06);
a different body for a repeated idempotency key (A02); a webhook accepted with a bad signature
(A20). N01 passes only when every self-test detects its fault and the oracle's own unit tests pass.

## N01 checks and done

Checks: `pnpm check` inside `oracle/` (lint, types, unit tests), the self-test suite, the v1.1
manifest verification, `git diff --check`. Done: pack v1.1 committed and hashed, with the
adapter schema both arms implement. Commit: `N01: build neutral acceptance oracle`.

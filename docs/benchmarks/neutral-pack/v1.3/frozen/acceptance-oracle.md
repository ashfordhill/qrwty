# Black-box acceptance specification v1

Frozen by Q00 from the shared [acceptance contract](../files/docs/plans/production-build/acceptance.md),
as amended by the [owner decisions](../files/docs/plans/production-build/owner-decisions-2026-11-13.md).
It says, for every acceptance ID, what the neutral oracle sends, what it observes and what passes.
Both arms run the same checks through the same [external contract](http-contract.md). The
executable oracle is a later shared unit ([plan](oracle-tooling-plan.md)); nothing here is
implemented yet, and no row has passed.

## 1. Rules

- A row's status is `planned`, `passed`, `failed`, `blocked` or `not run`. Only an oracle run
  can mark an A, F, R or U row `passed`. An arm's own tests support it and never replace it.
- Every result records: run ID, arm, tested commit and image digests, environment, the exact
  oracle command, start and end times, expected and observed outcome, and artifact paths with
  SHA-256. Failures are kept; a rerun is a new result.
- **Scopes.** *Local*: the arm's local deployment with at least two copies of every HTTP service
  and two analytics workers, real Postgres and Valkey, the Pub/Sub emulator, a local issuer and
  the oracle's provider fixtures. *Staging*: the arm's trial-credit staging (Q13, B09).
  *Deferred*: needs Q14/Q15/B10/B11 spend.
- Destinations are synthetic and never fetched: the oracle compares `Location` bytes; a browser
  "open" is intercepted and fulfilled locally. No real third-party site is loaded or load-tested.
- Faults are injected as refused connections, stalled connections and broken established
  connections, through the test control interface (section 2). Stopping an idle container is not
  a fault test.

## 2. Test control interface each arm provides

Each arm writes an **oracle adapter manifest** (`oracle-adapter.json`, schema in the oracle
plan) and the commands it names. All of it exists only in the test profile; the production
configuration validator rejects every hook below (R01).

| Capability | What the oracle needs |
| --- | --- |
| Topology | Base URLs of the public entry and of every replica of every HTTP service (internal URLs reachable only on the test network); health and readiness paths |
| Lifecycle | Start, stop, `SIGTERM`, `SIGKILL` and restart of a named replica or worker; scale to N copies; full reset to a clean state |
| Network faults | A Toxiproxy proxy between the application and each dependency: Postgres, Valkey, Pub/Sub, issuer, Stripe fixture, Web Risk fixture |
| Clock | A test-only clock offset honoured by claim and idempotency expiry, link expiry, sessions, entitlements and grace, retention and replay horizons, and alert thresholds |
| Fault points | `consumer-exit-after-commit-before-ack`; `force-slug-collision` (allocator returns a chosen existing slug first); `pause-reconciliation-worker` |
| Inspection (read-only JSON) | Database connection count per service, process memory, publisher queue depth, consumer backlog and oldest-age, quarantine contents, operator action log, alert and safety-gate states |
| Backup | Back up and restore the arm's databases into an isolated copy, then start against it |
| Pub/Sub | Emulator project and topic names, so the oracle can create its own capture subscription before traffic and publish directly to the topic |
| Trusted edge | A local edge in front of the origin that, only with the oracle credential (`ORACLE_EDGE_TOKEN`), turns `X-Oracle-Client-IP`, `X-Oracle-Country` and `QRWTY-Synthetic` into its trusted forwarded headers. The production edge strips them |
| Identity | Accounts `oracle-alice`, `oracle-bob` and `oracle-operator` in the local issuer (password from `ORACLE_TEST_PASSWORD`, generated per run); a key-rotation command; a second "rogue" issuer key for forged tokens |
| Providers | The Stripe API base URL and the Web Risk endpoint point at the oracle's fixtures; the webhook signing secret is passed by variable name |

## 3. Product behaviour

| ID | Oracle stimulus | Pass when | Scope |
| --- | --- | --- | --- |
| A01 | Logged-out browser: enter a destination, create, copy, open the short link, download PNG and SVG | No sign-in step; the copied text is `shortUrl`; the opened navigation targets the exact destination; both downloads decode (jsQR on the PNG, the SVG rasterized then decoded) to `shortUrl` | Local; staging subset |
| A02 | Same `Idempotency-Key` and body sent twice concurrently to two replicas, then again after restarting every replica; then the same key with another destination | One link (one slug, same body each time, including the claim proof); the changed body is 409 `idempotency_conflict` | Local |
| A03 | 200 concurrent creates across two replicas; then creates under `force-slug-collision` | All slugs distinct and each redirects to its own destination; under the forced collision the create succeeds within 5 retries or returns 503 `slug_allocation_failed`; the existing slug's destination never changes | Local |
| A04 | Guest create; sign in; claim with the proof; repeat with sign-in cancelled then retried; claim with the clock at 24 h − 1 s and at 24 h + 1 s | Claim succeeds for the proof holder; another account without the proof gets 403; the cancelled sign-in keeps the proof (browser); 24 h − 1 s succeeds, 24 h + 1 s is 410 `claim_expired` | Local |
| A05 | `oracle-alice` and `oracle-bob` claim the same proof concurrently; each repeats | Exactly one 200; the other 409 `claim_consumed` with no owner or private field; the winner's repeat is 200 with the same link; only the winner lists it | Local |
| A06 | Alice uses Bob's link IDs on read, edit, delete, claim, analytics and CSV; Bob's cursor in Alice's list; no session on owner routes; an expired session cookie on create | 404 for every foreign object; 400 `invalid_cursor`; 401 without a session; 401 (not a guest 201) with the bad cookie; no Bob data in any body | Local; staging subset |
| A07 | Ten concurrent `PATCH` with the same `If-Match`; continuous GETs on every replica during edit, disable, delete and operator block | One 200, the rest 412; after each change's commit, no replica returns the old allowed result later than 60 s; a deleted slug stays 410 and is never issued again | Local; staging subset |
| A08 | Link with `expiresAt` = now + 20 s, cache warmed on every replica; GETs continue past expiry; owner tries to enable a blocked link | No 302 later than `expiresAt` + the recorded clock bound (≤ 1 s); 410 afterwards; enabling a blocked link is 409 `blocked_by_operator` | Local |
| A09 | The [destination corpus](#a09-destination-corpus); response header checks; `HEAD`; `POST`/`PUT`/`DELETE` on a slug; a foreign `Host`; spoofed `X-Forwarded-For` and `x-user-id` on create; a query on the short URL | Accepted entries return `Location` byte-equal to the expected value; rejected entries are 400 `invalid_destination`; 302 has `Cache-Control: no-store`; `HEAD` matches GET without body or event; 405 with `Allow`; foreign host refused without `Location`; spoofed headers change nothing; the query is not forwarded | Local |
| A10 | A known stream per link across replicas: normal GETs, bot user agents, synthetic GETs via the trusted edge, `HEAD`s and health probes; then republish captured messages (duplicates), messages with older `eventTime` (out of order) and within-window late messages | After freshness: `recordedAttempts` equals the number of unique non-synthetic event IDs; `filteredClicks` excludes `filter-v1` bots; `HEAD`, probes and synthetic GETs are excluded | Local |
| A11 | `consumer-exit-after-commit-before-ack` on one worker during a known stream | Totals equal the unique event set (no double count); another worker continues while the killed one restarts | Local |
| A12 | Publish an invalid JSON message, a `schemaVersion: 999` message and a message missing `linkId`, then valid events; replay the quarantined items after repair; replay an event 32 days old (clock) | Valid events counted; each poison item quarantined with its reason, with bounded retries; repaired replay passes dedup; the 32-day event is quarantined for rebuild, not added to live totals | Local |
| A13 | Stop every analytics worker for 10 minutes while GETs continue; restart; then move the clock so the oldest backlog nears the retention threshold | Every 302 still has its event captured; analytics shows `delayed: true`; after restart totals reconcile without double counting; alerts fire and the safety gate stops new redirects (503) before any accepted event could expire | Local |
| A14 | Rotate the issuer key; expire a session; cancel a sign-in; send forged bearer tokens (rogue key, wrong audience, wrong issuer, `alg: none`, expired) directly to every guarded internal route | Rotation handled by refresh or a clean sign-in; the expired session is 401 and the return location and claim proof survive; every forged token is 401 | Local; staging subset |
| A15 | Alice with links, events and a subscription deletes her account; back up before, restore into an isolated copy after | Links 410 within 60 s; Alice's private data and exports gone; tombstones kept; the restored copy reapplies the deletion before serving | Local (database backup); PITR is D05 |
| A16 | Many public reports on one link; non-operator calls to operator routes; operator block and unblock | Reports alone change nothing; non-operator 404; block reaches every replica within 60 s (403); actor and reason recorded | Local |
| A17 | Guest creates beyond `guest-admission-test-v1` from one client address across replicas; addresses rotating within one IPv6 /64; five browsers behind one address within the limit | 429 with `Retry-After` and a useful body once over the limit (at most twice the limit admitted across replicas); the /64 counts as one key; legitimate shared-address users under the limit succeed; no storage for refused creates | Local |
| A18 | Call every route of the external contract with valid and invalid input; start production with placeholder credentials | No 501 or "not implemented" anywhere; placeholders refused at startup | Local |
| A19 | Free sign-up; checkout; five concurrent checkout requests with distinct keys; portal | Free needs no card; checkout returns a hosted URL for the allowlisted price; after completion at most one active subscription; portal returns a URL | Local (fixture) and Stripe test mode |
| A20 | Signed webhook; wrong signature; one byte changed after signing; duplicate event ID; inbox database refused | 2xx only after the inbox write; 400 for both forgeries; duplicate 2xx without a second effect; refused inbox 5xx, then the redelivery succeeds | Local; staging subset |
| A21 | Older subscription event after a newer one; `pause-reconciliation-worker` past its lease then resume; the same webhook sent again after dropping the first response; the Stripe fixture delayed; `/billing?checkout=success` without a webhook | No state regression; the late worker cannot write; idempotent redelivery; reconciliation recovers; the return URL grants nothing | Local |
| A22 | Free account: 10 concurrent owned creates on two replicas; retries with the same keys; a claim when the allowance is used; delete then create; upgrade and downgrade during creates; free analytics with breakdowns and an 8-day range | Exactly 5 succeed; retries consume nothing; the claim is 403 `quota_exceeded` and the guest link keeps working; delete refunds nothing; new limits apply within 60 s and usage is kept; breakdowns `null` and 403 `tier_restricted` | Local |
| A23 | Payment failure; duplicate failure events; clock to grace end; cancel at period end; delete the account while the Stripe fixture is down | `past_due` with `graceUntil` = first failure + 7 days, not extended; free after grace; paid until `paidThrough` after cancellation; links, redirects and click capture never interrupted; deletion retries without a second cancellation or charge call | Local |
| A24 | A capture proxy records every response; an independent capture subscription records every message; run traffic while faulting the publisher path (refuse, stall, break, kill a replica) | Every 302 carries an event ID found among the captured messages for the right link; every fault-time failure is 503 without `Location`; `HEAD` has no event; bots are present; every message without a 302 is explained by a 410/503 carrying its ID or an in-flight request at a kill | Local; staging subset |

### A09 destination corpus

`<origin>` is the arm's public origin. Accepted inputs and the expected `Location`:

| Input | Expected `Location` |
| --- | --- |
| `https://example.com/oracle/a09/plain` | unchanged |
| `https://example.com/oracle/a09/q?b=2&a=1&A=3` | unchanged (order and case kept) |
| `https://example.com/oracle/a09/esc?x=%2F%20%E2%9C%93&y=a+b` | unchanged (escapes kept) |
| `https://example.com/oracle/a09/Case/Path` | unchanged |
| `https://example.com/oracle/a09/frag#section-2` | unchanged |
| `HTTPS://EXAMPLE.COM/oracle/a09/host-case` | `https://example.com/oracle/a09/host-case` |
| `https://example.com:443/oracle/a09/default-port` | `https://example.com/oracle/a09/default-port` |
| `https://münchen.example.com/oracle/a09/idn` | `https://xn--mnchen-3ya.example.com/oracle/a09/idn` |
| `http://example.com/oracle/a09/http` | unchanged |
| `https://example.com/oracle/a09/len?p=` padded to exactly 8,192 bytes | unchanged |

Rejected with 400 `invalid_destination`: `javascript:alert(1)`; `data:text/html,hi`;
`ftp://example.com/x`; `mailto:a@example.com`; `https://user:pass@example.com/x`;
`https://user@example.com/x`; a URL containing a literal CR LF, tab or NUL; `https://exa mple.com/`;
`https://example.com:0/`; `https://example.com:65536/`; `https:///nohost`; `/relative`;
`example.com/no-scheme`; `http://127.0.0.1/`; `http://10.1.2.3/`; `http://172.16.0.1/`;
`http://192.168.1.1/`; `http://169.254.169.254/latest`; `http://0.0.0.0/`; `http://2130706433/`;
`http://0x7f000001/`; `http://[::1]/`; `http://[fc00::1]/`; `http://[fe80::1]/`; `http://localhost/`;
`http://foo.localhost/`; `http://printer.local/`; `http://db.internal/`; `http://intranet/`;
`<origin>/AbCdEfGhIj`; the 8,192-byte URL plus one byte.

**Reputation fixture verdicts:** a destination path containing `/oracle/unsafe/` is a threat
(422 `reputation_rejected`); `/oracle/slow/` exceeds the adapter deadline and `/oracle/error/`
returns 500 (both 503 `reputation_unavailable`); anything else is clean.

## 4. Failure and recovery

Run with at least two replicas of every HTTP service and two workers, under steady traffic.

| ID | Fault | Pass when | Scope |
| --- | --- | --- | --- |
| F01 | Valkey refused, stalled and broken during hot redirects; corrupt entries written to the cache | Redirects continue from the database within admission bounds; no connection leak (counts return to baseline); no stampede (database queries bounded); corrupt entries ignored; cache use resumes after recovery | Local |
| F02 | Postgres refused and stalled, then restored | Cached valid routes redirect only until their `validatedUntil` (≤ 30 s), then 503 with `Retry-After`; writes fail with 503, never a false success; service recovers without restart | Local |
| F03 | Pub/Sub refused, stalled and broken during publish and during consume | No 302 without a confirmed event; 503 on uncertainty; the same event ID on retry; processes recover without crash loops; consumption resumes without double counting | Local |
| F04 | Issuer unavailable at startup and mid-session | Redirect starts and serves; account operations keep their authentication rules (no guest downgrade) | Local |
| F05 | `SIGKILL` of a replica mid-create; `SIGTERM` during in-flight requests | Client retry with the same key yields one result; no partial mutation; drain completes or times out within the configured bound | Local |
| F06 | Publisher latency above the deadline; traffic beyond the publisher queue bound; a link expiring while its GET waits | 503 without `Location` within deadline plus margin; memory stays bounded; no 302 after expiry | Local |
| F07 | A02, A05, A07 and A22 races, with each replica in its own container | All invariants hold with no shared process memory | Local |
| F08 | Old and new versions of the arm side by side with old and new event and database versions | Expand/contract migrations and the versioned event codec keep both working, or the rollback is explicitly blocked before apply. **Not run** until a second version exists | Local |
| F09 | Archive delivery stalled; retention threshold approached (clock); a misconfigured subscription (inactivity expiry enabled, missing archive subscription) | Locally: alerts and the safety gate fire, the startup or deployment check rejects the misconfiguration, backlog is preserved and replayed. Real archive delivery is staging | Local portion; staging |
| F10 | Stripe fixture down; billing database down; inbox worker killed mid-lease | No paid access granted wrongly; no duplicate checkout or cancellation; the inbox retries; entitlements stay bounded; redirects unaffected | Local |

## 5. Deployment preparation (R)

| ID | Oracle check | Scope |
| --- | --- | --- |
| R01 | Start each process with the production profile and, in turn, an emulator endpoint, a fake provider, a development secret, disabled TLS verification, a missing required value and each test hook: every start is refused with a named reason. Ordinary build and tests run with no cloud credentials in the environment | Local |
| R02 | Production clients run against the local real stores and emulator; signed fixtures exercise the real validation code; each emulator or fixture limitation is listed | Local |
| R03 | The final images start, drain and restart; two copies share only external state; connection counts stay bounded | Local |
| R04 | The offline IaC validation command exits 0 without credentials or network calls; the secret inventory names an owner and source for every binding | Local |
| R05 | From a fresh clone, the documented build, start, migrate, deploy-rehearsal and rollback commands work; image digests and UI hashes are identical across test configurations; no source edit is needed to change environment | Local |
| R06 | The activation backlog lists each live check still not run, with resources, prices and teardown | Local |

## 6. UI rows

U01 is replaced by the owner decisions: both skins are published for review and built, and the
reviewer's default is recorded. U02–U08 run in **each skin × light/dark × desktop (1440×900) /
mobile (360×800)**, plus the brief's extra widths for U04. The oracle drives the UI by accessible
roles and names; the name list is frozen in the pack amendment that carries Q11's design assets.
U06 real-phone scans and printed-code scans are human steps recorded with device, size and
result. U07 uses a recorded mobile lab profile; field metrics stay pending.

## 7. Cloud, load and measurement rows

| Rows | Where and when |
| --- | --- |
| D01, D02, D03, D10 | Staging within the trial credit (Q13, B09) |
| D09 | Staging preview copy (test-mode payments and trial database stated) |
| D08 | Security review at the final local pack and again at staging; no exploitable critical/high finding left |
| D05 | **Not run** on the Cloud SQL trial instance (no backups); pending a real instance |
| D04, D06, D07, L01–L05 | Deferred (Q14/Q15, B10/B11); need a spend decision |
| M01, M02 | A only (generation baseline and regeneration) |
| M03, M04 | Both arms ([source-count method](loc-method.md), ledger) |
| M05 | Both arms at the agreed maturity point; the challenge stays withheld until then |

# Shared acceptance and evidence contract

An item is **planned**, **passed**, **failed**, **blocked** or **not run**. “Implemented”, a unit
test, a screenshot and a cloud drill are different evidence. Each passed row links to a run ID,
tested commit/image, environment, exact command or mouse steps, expected/observed result and
sanitized artifacts. Preserve failures and reruns. No result is currently passed.

Q00 freezes the external behavior suite before either arm implements it. Implementation-specific
tests supplement this suite; they do not redefine success. Use synthetic destinations controlled
by the experiment, never real third-party load targets or customer data.

## Product behavior

| ID | Test | Pass condition |
| --- | --- | --- |
| A01 | Logged-out browser creates, copies, opens and downloads QR | No login required; URL resolves to exact saved destination; QR decodes to the short URL |
| A02 | Double-click and network retry with same idempotency key | One durable link/result; changed payload with same key is 409; restart does not lose successful result |
| A03 | Force slug collision and concurrent creates on 2+ replicas | Unique constraint prevents duplicates; bounded retry succeeds or explicit failure; no overwritten route |
| A04 | Claim after sign-in | Only proof holder can claim; proof expires at bound; full result returns after login cancellation/retry |
| A05 | Race two claims; replay consumed proof | One owner; idempotent same-owner replay; other account gets no secret/ownership data |
| A06 | Cross-account object IDs/cursors, list/edit/delete/export/analytics | Every operation denies access; guest cannot obtain private data; invalid token never downgrades to guest |
| A07 | Edit racing with reads, then disable/delete/block | Version conflict is 412; all locations stop old destination by 60 s; tombstoned slug cannot be reused |
| A08 | Absolute expiry with clock boundary and old cached entry | No redirect after expiry within recorded clock bound; blocked owner cannot self-enable |
| A09 | HTTP/URL edge cases | Valid query bytes preserved; CRLF/schemes/credentials/private hosts rejected; 302/no-store/HEAD/405 correct; no spoofed Host or identity header |
| A10 | Known click stream, duplicates and out-of-order delivery | Aggregate equals eligible unique event set within replay contract; HEAD/probe traffic excluded |
| A11 | Kill consumer after DB commit before acknowledgment | Redelivery does not increment twice; another worker continues |
| A12 | Poison event followed by valid event; DLQ replay | Poison isolated with reason; bounded retry; valid event proceeds; replay cannot bypass dedup horizon |
| A13 | Analytics consumer outage, backpressure and late recovery | Successful GETs still have durable events; backlog preserved, delayed counts visible, replay reconciles; safe admission stops before unmanageable retention risk |
| A14 | Identity key rotation, expired session and login cancellation | Correct issuer/audience/signature checks; expected refresh or sign-in flow; return location and claim proof preserved |
| A15 | Deletion/retention, including restored backup | Private data removed per policy; tombstones preserved; restore reapplies deletion record before serving |
| A16 | Abuse reports and operator block | Public report cannot arbitrarily disable; privileged action authenticated and recorded; block reaches redirect within bound |
| A17 | Anonymous creation attack and shared-NAT legitimate users | Bounded storage/CPU, distributed admission; useful 429/recovery path; no unbounded resource allocation |
| A18 | Unimplemented/error inventory | No required path returns 501/NotImplemented; no required dead stub, placeholder credential or sample-only data |
| A19 | Free registration, paid Checkout and portal | Guest/free needs no card; authenticated owner uses allowlisted prices; repeat/concurrent checkout cannot create duplicate active subscriptions |
| A20 | Webhook signature, duplicate, modified raw bytes and DB failure | Signature over unchanged bytes; unauthorized rejected; durable inbox before 2xx; replay idempotent; failed inbox is retryable |
| A21 | Out-of-order webhook, stale worker, lost response and delayed provider | Canonical-state reconciliation with fencing; no state regression or entitlement from browser return; retries/nightly reconcile recover |
| A22 | Tier quotas across replicas, retry, claim and plan change | Atomic scoped usage; no limit bypass or usage reset; old grants expire within bound; owner isolation and gated exports enforced |
| A23 | Failed payment, grace expiry, cancel, downgrade and deletion | Explicit finite state transitions; existing permitted links/durable capture continue; subscription deletion retries do not restart charges |
| A24 | Every successful GET has a durable record | Capture responses independently; each 302 maps to provider-acknowledged event before response; loss/unknown ACK/overflow returns 503 without Location; bots retained, HEAD excluded; extra committed attempts explained |

## Failure and recovery

Run against multiple independently addressable application replicas and real isolated stores.
Fault the dependency with network refusal, a stalled connection and an established connection
break where applicable. Merely stopping an idle container is insufficient.

| ID | Fault | Pass condition |
| --- | --- | --- |
| F01 | Cache timeout/disconnect/corruption during hot traffic | Bounded fallback, no connection leak/stampede, safe restore of cache use |
| F02 | Database unavailable and recovered | Valid cached redirects only until deadline; explicit 503 afterward; no false write success; reconnection without manual patch |
| F03 | Pub/Sub disconnected during publish and consume; lose ACK after commit | No unconfirmed GET 302; same-ID bounded retry, 503 on uncertainty; process recovers; accepted work resumes without double count |
| F04 | Identity unavailable at startup and mid-session | Redirect starts/serves independently; account operations retain authentication rules |
| F05 | Process killed mid-request and during drain | Idempotent replay; no partially committed mutation; drain finishes or times out predictably |
| F06 | Publisher slow/full/restarted; link expires while awaiting ACK | Bounded memory/latency; 503 without Location when needed; post-wait policy recheck; no success from an unconfirmed in-memory event |
| F07 | Multiple writers attempt update/claim/idempotent creation | Constraints/transactions serialize correctly across replicas; no reliance on an in-memory mutex |
| F08 | Rolling release with old/new event and DB versions | Expand/contract compatibility; versioned event codec; rollback supported or explicitly blocked before apply |
| F09 | Archive delivery stalls, retention approached, subscription misconfigured | Alerts/gates fire; existing accepted backlog preserved/replayed before expiry; inactive subscription never auto-expires; totals reconcile |
| F10 | Stripe/Billing DB unavailable; inbox/lease worker interrupted | No free paid access or duplicate charges; durable inbox retries; bounded entitlements/grace; redirect has no payment dependency |

## UI and product quality

| ID | Verification | Pass condition |
| --- | --- | --- |
| U01 | Owner visual review of two directions | Decision recorded before full UI build; no claim that a template aesthetic is approved |
| U02 | Mouse/touch-only core flows | Create/copy/QR/save/list/edit/disable/analytics/export/upgrade/portal/cancel complete without keyboard shortcuts |
| U03 | Keyboard/screen reader | Labels, focus, errors, dialogs and route changes usable; no focus traps |
| U04 | Responsive/light/dark/reduced motion/solid fallback | Required widths, zoom and landscape have no lost content or inaccessible controls |
| U05 | Slow/offline/error/session-expiry states | Each state in design brief reproduced; no silent reset or anonymous retry of account requests |
| U06 | QR validation | Automated decode plus real-phone scan of screen and printed PNG/SVG at recorded sizes |
| U07 | Performance | Documented mobile lab profile meets agreed budgets; field metrics explicitly pending until collected |
| U08 | Real-length content, delayed analytics and billing states | Long URLs/counts, confirming payment, grace/downgrade and delayed data remain readable; no false complete-count claim |

## Cloud and operational readiness

| ID | Evidence | Pass condition |
| --- | --- | --- |
| D01 | IaC plan/apply and inventory | Recreates staging with no manual hidden resource; secrets redacted; teardown documented |
| D02 | Edge-to-origin and private stores | Direct unauthorized origin access fails; only allowlisted routes public; TLS verification and least-privilege roles tested |
| D03 | Deploy and rollback | Digest-pinned release, health gate, rollback and credential rotation demonstrated without data loss |
| D04 | Zonal disruption and managed DB/cache failover | Supported placement/redundancy shown; measured recovery and acknowledged link/event reconciliation meet accepted fault envelope; inaccessible provider internals not falsely claimed as injected |
| D05 | PITR restore into isolated environment | Verify create/edit/claim/tombstone/private-data cases, RPO/RTO and deletion replay before serving |
| D06 | Regional recovery | One writer fenced; standby promoted; link lag and event durability envelope reported separately; zero-loss regional click claim requires synchronous regional copies and proof |
| D07 | Operations exercise | Alerts fire to a configured owner destination, runbook followed, incident timestamps and response captured |
| D08 | Security review | No exploitable unresolved critical/high finding; auth/isolation/SSRF/secret/dependency/image review with evidence |
| D09 | Privacy and public terms | Actual retention/cookie/data use matches reviewed product copy; no invented certification or compliance badge |
| D10 | Cost and quotas | Real selected-region prices, provider quotas, fixed HA cost and test caps recorded; cost alert demonstrated |

Alert tests that send email/chat require the owner's authorized destination and notification scope
when that operational unit runs. Prepare rules and a local/dry-run proof first; this planning
document does not authorize sending messages to others.

## Load and measurement

| ID | Test | Evidence |
| --- | --- | --- |
| L01 | L0 normal and burst | Dataset, generator and service limits; full latency distribution and outcome counts |
| L02 | L1 normal and burst | Same plus real large-dataset evidence; smaller data labeled provisional |
| L03 | Hot key, misses, cold cache and database fallback | No misleading cache-only capacity claim; overload shedding classified separately |
| L04 | Soak and backlog recovery | Memory/storage/dedup growth, archive lag, catch-up, accepted GET/event reconciliation and aggregate reconciliation; no capture sampling |
| L05 | Global probes and regional outage | TTFB definition, locations, jitter, clock skew and observed availability limitations |
| M01 | Untouched generated baseline | Saved design/registry/manifest match; fresh CLI and studio payload compare |
| M02 | Regeneration | Product files/SQL/UI preserved; generated edits refused in disposable test; no-op update changes no payload |
| M03 | Source inventories | A report satisfies R+C=B and G0−R=D; reviewed scope; B/UI/support independently counted |
| M04 | Usage ledger | All captured requests reconciled; failures retained; missing coverage visible; no double-counted cumulative usage |
| M05 | Maintenance challenge | Same frozen change and gates; before/after code and time/token/defect results for both arms |

## Release labels

- **Local working:** product tests pass locally. No production claim.
- **Production candidate at L0/L1:** accepted product/security/cloud/failure/load rows pass at that
  exact tier; owner has the priced deployment and rollback pack. Explicit pending items listed.
- **Public beta:** actual chosen deployment, limited traffic/feature scope, known tier and gaps
  disclosed. It may precede L1 if the owner chooses; it cannot be marketed as L1-tested.
- **Production observed:** the recorded observation window and SLO outcomes are available.
- **Regional recovery verified:** D06 passed. Multi-AZ alone never earns this label.

Q00 identifies release blockers. By default all A/F/U rows, D01–D05/D07–D10, L01/L03/L04 and M01–M04
are needed for A's L0 candidate. B uses its own clean baseline instead of M01/M02 generation checks.
L1 additionally requires L02/L05; global recovery requires D06. Both arms receive the same
availability targets and any explicit owner-approved scope reductions. M05 precedes the final
comparison report. A pending 30-day observation is always visible rather than declared passed.

Application command names must be implemented and documented before being used as evidence.
The units propose a command contract; no `pnpm check` or `pnpm test:*` currently exists in QRWTY.

# Inspected baseline and sources

Inspected 2026-11-13. Repository facts below are observations; the other planning documents
describe proposals unless a row is explicitly marked observed.

## Local findings

| Area | Observed state | Implication |
| --- | --- | --- |
| QRWTY `1cea386` | Owner README, business-analysis reports/data and PDFs; no application package or deployment | Preserve research; measure a new build, not a rewrite of a running product |
| QRWTY working tree | Untracked `.docs/wheee.gif` | Owner material, left untouched |
| Jeeves inspected HEAD `3575fc2` | UI12 committed; UI13 work/handoff changing during inspection | Re-read HEAD, status and handoff before Q01; do not treat a live worktree as a frozen registry |
| Jeeves PF14 review | Multiple copies, cache and worker interruption tested; broker failure stopped dependent processes | Earlier local tests are useful evidence, not a cloud availability claim |
| Generated-system tests through GS08 | Generated successful flows and regeneration exercised; GS07 awaits broker reconnect; GS09 review pending in inspected handoff | Q03 checks final outcomes rather than assuming plan files are implementation |
| Studio catalog | Optional/required verified identity, positive cache reads, event counter, favorites and typed stubs exist | Catalog membership alone is not product completion |
| HTTP stub response | `ModuleResponse` supports status, headers and body; `stubRoutes` applies them | A stub can send `302` and `Location`; no new redirect-response template required merely for headers |
| Database stub dependency | `query` and `execute` use a pool; no exposed transaction callback or reserved connection | Never implement a transaction using separate `BEGIN`/`COMMIT` calls on that interface |
| Identity template | RS256, issuer, JWKS, expiry/subject and audience `<identity-id>-web`; local Keycloak setup | Managed OIDC issuer/audience and token shape require a real compatibility probe |
| Stub providers | Local hostnames, local secret handling and startup probes | TLS, credentials, endpoint configuration and optional-dependency startup need an explicit gap audit |
| Cache and analytics | Positive-read template; unlimited event receipts; relay around 10 rows/second in documented fixed policy | Mutable redirects, revocation and high-volume analytics need their own proof |
| Source LOC CLI | Uses Git objects in the current repo; app must be a relative subdirectory; generated manifest required | Put export in `app/`; run pinned measurement code against QRWTY Git, not Jeeves Git |

Reproducible Jeeves source locations (relative to the Jeeves repo):

- `docs/handoff.md`, `docs/design-playbook.md`, `docs/template-gaps.md`.
- `docs/plans/production-foundations/review.md`.
- `docs/plans/generated-system-tests/units.md` and `evidence/gs08/README.md`.
- `docs/plans/broker-reconnect/units.md` (a plan, not proof of completion).
- `jeeves/CATALOG.md`, `jeeves-generator/README.md`.
- `jeeves-generator/templates/local-v2/assets/src/modules/entry.ts.template`.
- `jeeves-generator/templates/local-v2/assets/src/runtime/tile-http.ts.template`.
- `jeeves-generator/templates/local-v2/assets/src/runtime/module-clients.ts.template`.
- `jeeves-generator/templates/local-v2/assets/src/modules/dependencies.ts.template`.
- `docs/field-projects/source-loc.md`, `jeeves-generator/src/source-loc.ts` and `source-loc-cli.ts`.

The design references inspected were the owner's `editor-1.png` Excalidraw sketch and the saved
YouTube v3 lane diagram in Jeeves. The companion drawings borrow their readable left-to-right
flows, rounded boxes, blue paper, explicit stores and dashed asynchronous connections. Existing
owner images were read, not copied or altered. No new feedback image was supplied in this request.

## Primary external sources checked

Provider documentation can change. Q04/Q13 must recheck versions, plan limits, regions and prices
against the actual account before choosing resources. The architecture recommendation is our
inference from the current code and these documents; providers do not certify QRWTY.

| Source | Fact used in this plan |
| --- | --- |
| [Cloudflare KV consistency](https://developers.cloudflare.com/kv/concepts/how-kv-works/) | Updates and negative lookups can remain stale across locations for 60 seconds or more; KV is not the authoritative transactional store |
| [Cloudflare Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/) | Cache contents and `cache.delete` are local to a data center; local deletion is not global revocation |
| [Cloudflare rate limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) | Worker rate counters are approximate and local; do not equate them with hard global account quotas |
| [Cloudflare Queues delivery](https://developers.cloudflare.com/queues/reference/delivery-guarantees/) | At-least-once delivery needs application deduplication when duplicates matter |
| [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/concepts/what-are-durable-objects/) | A Cloudflare-native stateful design is a credible alternative, requiring a separate fit evaluation |
| [ECS Availability Zone rebalancing](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-rebalancing.html) | Fargate can distribute and rebalance service tasks across AZs; explicitly verify actual placement |
| [RDS Multi-AZ instances](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZSingleStandby.html) | Synchronous standby and failover; that standby does not serve reads |
| [Amazon MQ production setup](https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/best-practices-broker-setup.html) | Cluster deployment spans three AZs; queue type/version and client compatibility need verification |
| [AWS Fargate pricing](https://aws.amazon.com/fargate/pricing/) | Compute pricing depends on provisioned resources, platform and region |
| [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) | Request and CPU usage are cost inputs; edge work is not automatically free at large volume |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | Accessibility reference for the UI acceptance brief |
| [Excalidraw export utilities](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/utils/export) | Editable scene plus SVG/PNG export for the accompanying explanations |

TinyURL's public pages/search excerpts describe billions of redirects per month; the inspected
homepage did not provide a usable, audited current traffic breakdown. This plan **does not use
a claimed exact TinyURL RPS, peak factor, account count or database size**. The numerical tiers
in [cloud strategy](cloud-strategy.md) are explicitly QRWTY planning assumptions.

The 2026-10-31 QRWTY business review distinguishes enterprise-capable software from an enterprise
sales operation. Preserve that distinction. Its prices, commercial hypotheses and historical
Jeeves C1–C4 proposals are not a current implementation contract.

# QRWTY: production build and Jeeves comparison

Planning revision 2 · 2026-11-13 · **owner decisions incorporated; not implemented or deployed**.

Build QRWTY as a real public link and QR service, then measure how much Jeeves helped. A visitor
can make a quick link without signing in. An account owns saved links, edits and analytics.
Production quality means tested behavior under concurrency, failure, abuse and recovery, plus
an operated cloud deployment. A diagram, a Docker launch and a high generated LOC percentage
prove different things; none substitutes for the others.

This is one planning unit. It does not start the unfinished Jeeves units, create cloud resources,
change DNS, generate the application, or establish a second deployment. It prepares those steps
for sequential execution. The first **application-building phase** is the saved Jeeves diagram.
The diagrams supplied with this plan are editable Excalidraw explanations of the proposed design;
they are explicitly **not** a saved Jeeves project or evidence that generation works.

## Read in this order

| Document | Purpose |
| --- | --- |
| [Repository findings and sources](snapshot-and-sources.md) | What exists today, evidence boundaries and current provider references |
| [Product contract](product-contract.md) | Scope, anonymous versus account behavior, API and data invariants |
| [Architecture and Jeeves mapping](architecture.md) | What to draw, what generates, what is a stub, and what needs another diagram |
| [Cloud strategy](cloud-strategy.md) | GCP service candidates, traffic assumptions, failure behavior and cost gates |
| [Budget options](budget-options.md) | Development, HA launch and regional recovery envelopes; sourced AWS/GCP rate comparison |
| [Durable clicks](durable-clicks.md) | Publish acknowledgment before redirect, recovery/retention and exact guarantee boundaries |
| [Billing contract](billing-contract.md) | Individual free/paid tiers, subscriptions, webhooks, entitlements and downgrade behavior |
| [Design brief](design-brief.md) | Distinctive, restrained Liquid Glass direction and measurable usability criteria |
| [Comparison protocol](comparison.md) | Independent builds, backend/UI LOC, tokens, prompts, models, time and cost |
| [Acceptance contract](acceptance.md) | Shared tests and release evidence for both builds |
| [Execution units](units.md) | Small sequential assignments with boundaries, checks and handoffs |
| [Independent baseline units](baseline-units.md) | A complete second implementation without Jeeves, under the same contracts |
| [Diagrams](../../diagrams/README.md) | Editable Excalidraw files and rendered previews |

## Phases and their exit conditions

| Phase | Units | Exit condition |
| --- | --- | --- |
| 0. Freeze the experiment | Q00 | Owner decisions recorded; common requirements, budgets and measurement protocol pinned |
| 1. Draw and save in Jeeves | Q01–Q02 | Valid saved project, original design JSON, blueprint, simple/detailed images and an untouched diagnostic export |
| 2. Make the generation boundary honest | Q03–Q05 | Required generic gaps resolved by assigned Jeeves units; cloud compatibility demonstrated; reusable generated baseline frozen in this repo |
| 3. Complete the product backend | Q06–Q10, Q10a–Q10b | Guest links, ownership, durable redirects, abuse handling, analytics and individual billing satisfy their contracts |
| 4. Design and build the UI | Q11–Q12 | Owner-reviewed visual direction; complete accessible workflows on desktop and mobile |
| 5. Operate a real cloud staging deployment | Q13–Q15 | Infrastructure, recovery drills, failure tests, load evidence and priced capacity report |
| 6. Compare and release | Q16–Q18 | Baseline arm passes the same gates; report published; selected production release and observed operation |

Cloud feasibility is tested early in Q04. Full deployment follows the backend and UI. This avoids
discovering at the end that local generated clients cannot use managed services. Build units have
no calendar estimate until the capability audit and cloud budget are known.

## Working decisions

The owner confirmed the product/cloud/comparison choices below in the follow-up to revision 1.
Numerical budgets, prices, limits and retention remain proposed until Q00 freezes them. These
decisions authorize planning; they do not claim a paid cloud apply or production cutover occurred.

| ID | Decision or proposed default | Why / consequence |
| --- | --- | --- |
| D01 | Keep the Jeeves-assisted application in `qrwty/app/`; UI in `qrwty/web/` | Independent repo and deployment; existing research and root README survive |
| D02 | New separate `qrwty-baseline` repo for the build without Jeeves | No copying generated code, hooks, application tests or incident fixes between arms |
| D03 | Controlled same-stack/cloud experiment — confirmed | Main comparison measures generation and orchestration; same independently authored product and deployment contracts |
| D04 | Guest links stay valid until removed for abuse — confirmed | No hidden account requirement, anonymous editing or guest analytics; printed QR codes have no automatic expiry |
| D05 | One-time guest claim proof lasts 24 hours | Retained default in the accepted permanence/claim proposal; signing in alone never proves ownership |
| D06 | Individual accounts, free and paid tiers in release 1 — confirmed | Add real subscription lifecycle and enforcement; no teams, custom domains or SSO/SCIM |
| D07 | Cloudflare edge plus managed GCP — owner preference | No residency requirement; propose us-central1 subject to compatibility/latency. Native Pub/Sub is a real generation gap to probe |
| D08 | Multi-AZ first; second-region recovery before a global resilience claim | Global edge presence does not make the database globally available |
| D09 | Every click durably recorded — confirmed | Eligible GET waits for durable acknowledgment before 302; failure/unknown ACK means 503. No lossy telemetry fallback |
| D10 | No assertion of literal TinyURL traffic or cost | Use explicit synthetic capacity tiers, verify provider limits, and publish measured results |
| D11 | Distinctive glass UI, designed around the link task | Glass is a surface treatment; clarity, speed and readable QR codes take precedence |
| D12 | Freeze the same execution model/configuration for both arms — comparison accepted | Exact model/settings and spend cap still need selection; usage comes from tooling, never inferred from agent prose |

The old business research proposes a much larger SaaS catalog. It is useful background, not an
instruction to implement every proposal. Jeeves's “owner is the only user” rule describes the
studio; it does not prohibit QRWTY end-user accounts. Conversely, QRWTY accounts do not authorize
adding multi-user features to Jeeves.

## Owner steering questions

The original six questions are answered except spending and exact execution settings. The owner
asked for options on budget and whether AWS would be cheaper. [Budget options](budget-options.md)
provides sourced component comparisons and these rough single-environment monthly bands:
development $100–$250, regional HA launch $600–$1,500, warm second region $1,500–$3,500. None is a
billion-scale capacity quote. Recommendation: GCP, local development first, then a launch planning
center near $1,000/month. No spending cap has been accepted yet.

Q00 still needs: initial budget and separate test cap; whether L0 public beta may precede L1
proof; paid-tier price/currency/limits; exact model/settings and model budget. Retention, account
deletion and paid-grace defaults in the contracts are also frozen there. Detailed aesthetic
review remains the later Q11 gate. Do not re-ask about confirmed GCP preference, guest permanence,
durable clicks, individual billing, excluded custom domains or controlled comparison.

**Durability consequence:** a publisher outage causes temporary redirect failures. Delayed
analytics is acceptable during recovery; silent missing accepted clicks is not. The guarantee
covers recorded redirect attempts, not proof of a destination page visit. Regional disaster
protection beyond managed multi-zone durability is a separate explicit recovery design.

## Current result

No backend, frontend or production deployment exists in the inspected repo. Generated,
post-template and UI LOC are therefore **not measured**, rather than reported as 0% or 100%.
The root README contains the proposed system overview and a pending-results table. Q02 replaces
the clearly marked Jeeves-diagram placeholder with an actual saved diagram and provenance.

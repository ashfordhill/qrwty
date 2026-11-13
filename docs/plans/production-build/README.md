# QRWTY: production build and Jeeves comparison

Planning revision 1 · 2026-11-13 · **proposed, not implemented or deployed**.

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
| [Cloud strategy](cloud-strategy.md) | Actual service candidates, traffic assumptions, failure behavior and cost gates |
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
| 3. Complete the product backend | Q06–Q10 | Guest links, ownership, redirects, abuse handling and account analytics satisfy their contracts |
| 4. Design and build the UI | Q11–Q12 | Owner-reviewed visual direction; complete accessible workflows on desktop and mobile |
| 5. Operate a real cloud staging deployment | Q13–Q15 | Infrastructure, recovery drills, failure tests, load evidence and priced capacity report |
| 6. Compare and release | Q16–Q18 | Baseline arm passes the same gates; report published; selected production release and observed operation |

Cloud feasibility is tested early in Q04. Full deployment follows the backend and UI. This avoids
discovering at the end that local generated clients cannot use managed services. Build units have
no calendar estimate until the capability audit and cloud budget are known.

## Working decisions

These defaults make the plan executable enough to review. They are not represented as owner
approvals. Q00 records changes before implementation, and before freezing the comparison.

| ID | Proposed default | Why / consequence |
| --- | --- | --- |
| D01 | Keep the Jeeves-assisted application in `qrwty/app/`; UI in `qrwty/web/` | Independent repo and deployment; existing research and root README survive |
| D02 | New separate `qrwty-baseline` repo for the build without Jeeves | No copying generated code, hooks, application tests or incident fixes between arms |
| D03 | Same TypeScript backend language and cloud target for both arms | Main comparison measures generation and orchestration, rather than different providers |
| D04 | Guest links stay valid until removed for abuse; no anonymous editing or analytics | No hidden account requirement and no misleading expiry on printed QR codes; indefinite storage is a cost commitment |
| D05 | One-time guest claim proof lasts 24 hours | Signing in alone never proves ownership of a public link |
| D06 | Accounts are individual owners in release 1 | Organizations, billing, SSO/SCIM and private enterprise delivery are later product phases |
| D07 | Cloudflare edge plus managed AWS regional services | Closest practical fit to Jeeves's current Node/Postgres/Valkey/RabbitMQ output; must pass compatibility tests |
| D08 | Multi-AZ first; second-region recovery before a global resilience claim | Global edge presence does not make the database globally available |
| D09 | Redirect availability takes priority over complete click capture during an outage | Analytics displays coverage gaps; no billing or fraud decision relies on these counts |
| D10 | No assertion of literal TinyURL traffic or cost | Use explicit synthetic capacity tiers, verify provider limits, and publish measured results |
| D11 | Distinctive glass UI, designed around the link task | Glass is a surface treatment; clarity, speed and readable QR codes take precedence |
| D12 | Freeze the same execution model/configuration for both arms | Exact IDs and usage are recorded by tooling; do not infer model names from an agent's prose |

The old business research proposes a much larger SaaS catalog. It is useful background, not an
instruction to implement every proposal. Jeeves's “owner is the only user” rule describes the
studio; it does not prohibit QRWTY end-user accounts. Conversely, QRWTY accounts do not authorize
adding multi-user features to Jeeves.

## Owner steering questions

Answer these after reviewing the plan; no need to settle all the visual details now.

1. **Capacity and spending:** what monthly infrastructure budget and one-off load-test budget can
   we spend, and is global-scale load proof required before any public beta? Defaults: no paid
   provisioning until a priced plan is reviewed; launch and scale claims remain separate.
2. **Cloud and geography:** is Cloudflare plus AWS acceptable, and where must user data live?
   A Cloudflare-native alternative remains viable, but needs different runtime support and would
   be a separate architecture experiment.
3. **Anonymous permanence:** should guest links remain valid indefinitely, with 24-hour claiming,
   or have a clearly disclosed lifetime? Default: indefinite links, no guest analytics.
4. **Analytics:** are transparent gaps during infrastructure outages acceptable in exchange for
   keeping links working? If every redirect must be durably recorded, change both arms' latency,
   availability and cost contracts before building.
5. **First product scope:** individual accounts only, or must teams, custom domains or billing be
   in the first public release? Defaults exclude those three; they each need explicit units.
6. **Comparison:** prefer the controlled same-stack experiment described here, or a second arm
   free to choose its own stack? Default: controlled. Which execution model and spend cap should
   we pin? Use separate fresh contexts for the two builds when they begin.

These decisions affect the build; detailed aesthetic review is deliberately a later Q11 gate.

## Current result

No backend, frontend or production deployment exists in the inspected repo. Generated,
post-template and UI LOC are therefore **not measured**, rather than reported as 0% or 100%.
The root README contains the proposed system overview and a pending-results table. Q02 replaces
the clearly marked Jeeves-diagram placeholder with an actual saved diagram and provenance.

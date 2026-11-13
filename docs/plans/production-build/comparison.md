# Two-build comparison protocol

The question is whether Jeeves reduces the cost and difficulty of producing and maintaining the
same correct deployed product. Generated LOC is one outcome; it is not equivalent to time saved,
quality or operating efficiency. Two builds are a case study, not a statistically general claim.

## Arms and fairness

| Item | A: Jeeves-assisted | B: without Jeeves |
| --- | --- | --- |
| Repository | Existing `qrwty`, backend under `app/` | New `qrwty-baseline`, backend under `app/` |
| Shared inputs | Frozen product contract, cloud/SLO targets, UI design brief, black-box acceptance contract | Exactly the same neutral inputs |
| Backend start | Saved Jeeves diagram + installed reusable templates + untouched export | Empty application; normal documented libraries/frameworks permitted |
| Backend completion | Hooks, stubs, SQL and product code; generator gaps fixed at source | Independently authored backend and infrastructure |
| UI | Authored independently from approved common design assets | Authored independently; no copied A components or API clients |
| Infrastructure | Same selected provider/topology/tier | Same; independent IaC implementation |
| Agent setup | Pinned execution model, reasoning setting, tool access, context budget and review protocol | Same settings and resource budgets |
| Proof | Shared neutral black-box tests plus implementation-specific unit/integration tests | Same black-box tests; independent implementation-specific tests |

The common high-level architecture can be supplied to both arms. That measures implementation
and orchestration under a fixed design. If the owner wants to compare architecture discovery as
well, run a separate product-brief-only experiment; don't mix the conclusions. Likewise, an
all-Cloudflare baseline against a GCP generated app is a stack comparison, not a clean test of
Jeeves. Record it as an exploratory third variant if desired.

Q00/Q16 create a neutral experiment pack containing only the agreed requirements, service
contracts, UI assets, provider assumptions and externally observable tests. Do not include A's
generated source, module bodies, generator internals, handoffs or failure fixes. The baseline
executor gets this pack in a fresh context and is instructed not to read the Jeeves checkout or
A source. Record filesystem/tool access and any violations; a prose instruction is not a secure
isolation mechanism. If stronger separation is needed, use an isolated checkout/container at
execution time without importing A, under the owner's then-current workflow rules.

Do not leak a discovery to one arm only. A defect in common requirements yields a versioned
amendment to both arms, with the rework charged to both actual runs. An implementation bug stays
with its arm. Record build order and reviewer knowledge. Prefer a reviewer who did not implement
the code when the owner assigns one; this plan does not authorize spawning agents now.

## Baselines and template development

1. Q00 starts accounting **before** diagramming. Record the planning unit as shared preparation,
   with unknown usage explicitly missing if no provider usage can be retrieved.
2. Q02 freezes the first as-found diagram/export as a diagnostic artifact with capability gaps.
   This is evidence of today's library, not a product-specific template disguised as a baseline.
3. Q03–Q04 resolve necessary reusable gaps through assigned Jeeves units. Capture their tokens,
   prompts, model calls, time, tests and code changes as `template-development` cost for A.
4. Q05 exports a clean reusable baseline into `app/` and commits it **before** product hooks,
   product SQL and UI are written. No QRWTY behavior can be moved into a recipe to boost credit.
5. Freeze generated baseline commit and manifest hashes. Later updates get separate chronological
   intervals; never rewrite the original baseline or retroactively relabel custom code generated.

Publish two cost views: **first application**, including all QRWTY-driven template work; and
**library reuse**, excluding already-paid template work but itemizing it alongside the result.
Shared preparation/review costs are shown once and, if allocated, identically by a stated rule.
Do not charge A's template work to B or omit it from the first-application comparison. Prior
YouTube template work is historical sunk cost, disclosed but not invented from incomplete logs.

## Backend, UI and supporting source

Use Jeeves **source-loc-v2** unchanged for A's core report: physical nonblank JS/TS source lines
after parsed comments, scoped production files under `src/`, same-file ordered exact matching.
Backend excludes UI regardless of path. Tests, fixtures, config, declarations, vendored/build
output, SQL, scripts and infrastructure are excluded from that percentage. Report those other
categories separately, so deployment and SQL work cannot disappear from the effort story.

| Symbol / measure | Definition |
| --- | --- |
| G0 | Eligible untouched generated baseline lines |
| R | Baseline lines retained in final files according to source-loc-v2 |
| C | New/replaced final backend lines, including all product-authored additions |
| D | Baseline lines removed/replaced; `G0 − R` |
| B | Final backend production source, `R + C` |
| Template share | `R / B × 100`; undefined if B is zero |
| UI source | Independent total for reviewed browser TS/JS/TSX, CSS and markup, with language subtotals |
| Supporting source | Separate SQL, IaC/config, scripts, tests and docs totals with explicit counting method |

For UI, reuse the pinned parser for JS/TS comment handling and a pinned appropriate parser/tool
for CSS/markup. Count original source, not minified output, generated CSS, screenshots or assets.
Publish per-file classifications and tool versions; do not call this expanded UI count
source-loc-v2. Compare like languages/layouts. No new product folders may remain unclassified.

Keep all production backend code—including BFF, edge Worker logic and integration adapters—under
`app/src/` or explicitly reviewed nested `src/` paths within `app/`. Infrastructure files remain
in `infra/`, UI in `web/`. Source placement must reflect the runtime, not game the metric. Browser
QR encoding is UI work; server-side QR generation is backend work. Package dependencies are
disclosed with their purposes/versions; dependency source LOC is not credited as authored code.

The current Jeeves CLI cannot accept an arbitrary external-repo app path from the Jeeves cwd,
and it rejects `.` as the app directory. Q05 establishes a pinned, auditable measurement runner:
execute the unchanged `sourceLocReport(repo, "app", baseline, completed, scope)` with QRWTY as
`repo`, from tooling that resolves the pinned Jeeves parser dependencies. Alternatively execute
the pinned CLI with cwd QRWTY and a local scope path. Record the exact command and tool commit.
Do not copy QRWTY into Jeeves or modify report hashes merely to make the CLI convenient.

B has no generated manifest; do not invent one to run A's comparator. A neutral inventory tool
uses the same eligibility/comment parsing for B's total backend LOC. Generated share is **not
applicable**, and authored/reused-library scaffolding is separately attributed. Q00 defines the
shared language/layout so a smaller B cannot win just by moving source into SQL or config.

Scaffolding and unwritten stubs count mechanically under source-loc-v2. Therefore also report
open hooks/unimplemented routes, unused generated source and behavior completion. A high share
with any required 501 response is an unfinished product, not a win. Never introduce padding,
gratuitous services or line reformatting to improve the report.

## Prompt, token, model, time and cost ledger

Write append-only `docs/benchmarks/runs/<run-id>/events.jsonl`, with raw usage artifacts referenced
by relative path and SHA-256. One record per actual provider/model request where available:

| Field | Requirement |
| --- | --- |
| Identity | run ID, arm/shared, unit, phase, attempt, provider request/session ID and timestamp |
| Model | provider, exact model ID/snapshot when returned, reasoning setting, model/tool versions |
| Prompt | user-task ID, numbered agent turn, normalized prompt hash, transcript artifact reference |
| Usage | provider input/output/cached-input/cache-write/reasoning counters with provider semantics; null if absent |
| Cost | provider reported USD if present; separately estimated cost with dated price source; never silently substitute |
| Time | start/end, active elapsed, waiting/build/test time, human intervention minutes and description |
| Work | commit before/after, success/failure/retry, gap IDs, test artifact references, reused inputs |
| Coverage | `reported`, `partial` or `unavailable`; reason and which calls are missing |

Input counters may already include cached tokens; reasoning may already be part of output.
Store raw provider fields and a documented normalization; never add overlapping counters. Count
request-level usage once, not cumulative UI/session counters plus requests. Include failed calls,
retries, compaction/summarization, tool-return context, design chat and review calls when reported.
If an API error reports no usage, keep the attempt with null usage; zero would be false precision.
Record actual billing separately from model estimates and local CPU/cloud costs. Subscription
access is not proof of zero marginal economic cost.

Report at least these different prompt counts: owner instructions/steering messages, assigned
agent task prompts, model requests, tool calls and retries. A chat turn can contain several
model requests. Tokenizer estimates for stored text are a separate estimate, never presented as
provider-reported usage. Exact current planner model ID/token counters are not available in this
planning environment; record them as missing, not as “top model” or an inferred product label.

Track human minutes for requirement choices, visual reviews, debugging help and operational
actions. Measure time-to-first-success and time-to-pass-all-release-gates. If builds overlap,
report total compute/agent time and wall time separately. Do not derive “hours saved” from LOC.

## Shared evaluation and maintenance challenge

Both arms must pass the frozen acceptance contract with the same data, traffic shapes, failure
schedule, credential boundaries and SLO definitions. Benchmark them at comparable provisioned
capacity, then separately at their lowest measured capacity that passes. Publish both cost views.
Use separate hosts/credentials and synthetic data; randomize test order when practical and record
provider conditions. Don't run competing large loads simultaneously on shared resources.

Before calling the comparison complete, apply one identical change request to both arms:
**add scheduled activation (`startsAt`) with owner edit and UTC validation, enforce it on every
cached hit, and add an account UI scheduled status/filter**. Expiry already belongs to the base
contract; scheduled activation does not. If activation entered scope through an approved amendment,
choose a comparably bounded new feature before either arm begins the challenge. Freeze its tests
first. Measure time, tokens, prompts, affected files, defects and regression results. A's diagram
change, template change and regeneration costs count. Prove that regeneration preserves product
hooks/SQL/UI and refuses a deliberately edited generated file in a disposable copy.

The final report contains total and per-phase tables, missing-usage coverage, backend/UI/support
LOC, quality/defect evidence, deployment cost at accepted tier, recovery results, maintenance
change results and limitations. A failing arm is reported as failing; it is not removed from the
denominator. Do not conclude that Jeeves helps unless the measured evidence supports the specific
claim being made.

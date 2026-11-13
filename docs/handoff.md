# QRWTY handoff

Append new entries; do not rewrite earlier work or its evidence.

## 2026-11-13 — Plan: production QRWTY and a controlled Jeeves comparison

**Changed.** Added a phased plan with 19 assisted units (Q00–Q18), 14 independent baseline units
(B00–B13), product/API/data invariants, installed-generation audit, 11 capability probes, cloud
strategy, traffic/SLO/recovery gates, a Liquid Glass UI brief and a source/effort comparison
protocol. Added QRWTY agent instructions, four editable Excalidraw explanations with SVG/PNG,
pending metric status and the requested diagram/count-table section in the root README. The
owner's existing README text and research are preserved. No app, saved Jeeves project, baseline
repo, cloud resource or deployment was created.

**Checks.** Four native scenes rendered, reopened and dragged by mouse in Excalidraw at 1600×1200;
no page errors. All four renders visually inspected, with the cloud arrow layout corrected.
JSON/SVG parsing, local-link targets, owner README byte-prefix preservation, artifact hashes and
Git whitespace checks passed. [Verification](evidence/planning/checks.md) and
[diagram hashes](evidence/planning/diagram-validation.json). Application suites do not exist in
QRWTY yet; no Jeeves code changed, so its concurrent regression suites were not taken over.

**Findings.** Jeeves stubs already support status/headers for a 302. Stub DB clients expose pooled
query/execute without a transaction seam; local provider bindings and fixed identity audience
need cloud probes. Current documented counter receipt retention and local throughput evidence do
not prove large-service analytics. Redirect is deliberately independent of broker/identity;
lossless analytics versus available redirects is an owner decision. Precise planner model/token
usage was unavailable and is recorded as missing rather than invented.

**Next.** Review the six owner questions in the plan, assign Q00, then Q01 after the current
Jeeves units permit a safe authoring window. The saved Jeeves diagram is explicitly still pending.
Keep actual template availability, product completion and cloud reliability evidence separate.
All changes belong to QRWTY; the concurrent Jeeves working tree and QRWTY `.docs/` were untouched.

## 2026-11-13 — Plan revision 2: GCP, durable clicks and individual billing

**Decisions.** Incorporated the owner's follow-up: GCP preferred, no residency restriction,
indefinite guest links, every click durably recorded, individual free/paid accounts, no custom
domains, controlled same-stack/model comparison. Budget, exact model/configuration and paid
price/limits are still open. Revision 1's optional capture and deferred billing are superseded;
its evidence and this earlier handoff remain historical records.

**Changed.** Updated both build plans, product/acceptance/UI contracts, root README and agent
guidance. Added detailed durable-click and billing contracts, GCP deployment strategy and sourced
budget options/rate formulas. Added Q10a/Q10b and B07a/B07b: now 21 A units and 16 B units. G12
probes native Pub/Sub and worker hosting; G13 probes original raw webhook bytes. Reworked the
overview/failure/cloud drawings, confirmed guest permanence and added billing lifecycle: five
editable Excalidraw scenes, each with SVG/PNG. App LOC and model usage remain unmeasured/null.

**Consequences.** An eligible GET waits for durable publication before 302; unknown/unavailable
ACK means 503 without Location. Identity/Stripe and downstream analytics remain separate
dependencies. Recorded attempts are not proof of client/destination delivery. Archive, replay,
retention alarms and recovery are mandatory; a missing accepted event is an incident. Regional
multi-zone durability is distinct from zero-loss whole-region disaster protection. Raw retention
is proposed at 31 days; Q00 must freeze it. Thirty-five days of per-event dedup at L1 is about
12.1 billion rows, so the small launch database is not claimed sufficient for that tier.

**Cost finding.** Representative always-on Fargate compute is cheaper than Cloud Run HTTP
instance billing at the cited rates; Cloud Run worker-pool rates match that Fargate example.
No total-cost AWS advantage was demonstrated. Recommend GCP and staged spending: private
development $100–$250/month; low-traffic regional HA launch $600–$1,500; warm second region
$1,500–$3,500. These are single-environment engineering allowances, not vendor quotes, capacity
proof or authorization. Billion-scale traffic and both arms' live hours are priced separately.

**Checks.** Five scenes rendered and visually inspected; archive-label/cloud-arrow issues fixed.
All five reopened and dragged by mouse at 1600×1200 without page errors. Markdown targets/anchors,
JSON/Excalidraw/SVG parsing, 15 artifact hashes, 21/16 unique unit sequences, 62 acceptance IDs,
historical evidence preservation and original owner README prefix checked. Decimal rate results
match the cost tables; `git diff --check` passed. [Verification](evidence/plan-revision-2/checks.md),
[document results](evidence/plan-revision-2/document-validation.json),
[diagram results](evidence/plan-revision-2/diagram-validation.json). No application suites exist;
no Jeeves code changed. Temporary renderer stopped after checks.

**Next.** Q00 can freeze the remaining neutral contract choices; Q01 follows in a safe Jeeves
authoring window. No generated app, saved Jeeves project, independent repo or cloud resources
were created in this unit. Do not re-ask the confirmed decisions. Actual cloud/model spending
still needs its concrete capped plan; paid-tier limits and live price IDs must be explicit before
activation. Preserve `.docs/` and all concurrent Jeeves work.

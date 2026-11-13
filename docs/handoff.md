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

# Planning revision 2 verification

2026-11-13. Parent QRWTY commit `a23f2ea`. Scope: plans, agent guidance, README, explanatory
diagrams and evidence. No app implementation, saved Jeeves project or paid cloud deployment.
No Jeeves file was edited. The owner's `.docs/` remains untracked and untouched.

## Diagram checks

Temporary renderer in `/tmp/qrwty-diagram-tools` uses pinned Excalidraw 0.18.0, React 19.0.0 and
Vite 6.1.0. Node 24.21.0 runs Playwright 1.63.0 from the existing Jeeves installation; no product
dependency was installed. Native sources and SVG/PNG exports are in `docs/diagrams/`.

- `node render.cjs` with Node 24, against the loopback Vite server on 4399: five scenes exported.
  The revision 2 scene input replaces AWS/lossy capture and adds the billing lifecycle.
- Visual inspection of all five PNGs: text fits, expected named components and flows present.
  Initial archive-label overlap and intersecting cloud arrows were corrected and re-rendered.
- `node verify.cjs` with Node 24: all five native scenes reopened in the editor at 1600×1200;
  a rectangle in each moved by mouse; no browser page errors. Changes from this mouse check are
  in-memory only, not saved over the published sources.
- [Diagram validation](diagram-validation.json) records element counts, exact tool versions,
  mouse results and SHA-256 for all 15 source/render artifacts. The previous planning evidence
  remains unchanged and refers to its historical commit's diagrams.

## Document and calculation checks

The document validation script checks Markdown local targets/anchors, JSON/Excalidraw and SVG
parsing, current diagram hashes, original owner README prefix at `1cea386`, unique unit IDs and
acceptance references. Expected units: Q00–Q18 plus Q10a/Q10b = 21; B00–B13 plus B07a/B07b = 16.
Results: [document validation](document-validation.json).

[Rate calculation](rate-calculation.json) uses decimal arithmetic for dated list-rate examples,
with regions, units, formulas and exclusions. The amounts in budget-options.md match the rounded
results. Budget bands are judgment, not quoted whole-service costs. No resource price or capacity
was verified against a live billing account. Exact planning model/token usage remains unavailable
in [benchmark status](../../benchmarks/status.json); no fabricated zero or model ID.

`git diff --check` is the whitespace gate. A contract audit checks the new decisions across both
execution arms: GCP, durable ACK before GET 302, free/paid individual billing, no custom domains,
bounded retention/replay, honest cost and pending application measurements.

No application test/build suite exists in QRWTY yet. Jeeves regression suites were not run for a
QRWTY documentation-only change while other agents are using that checkout. These checks do not
establish production correctness, cloud compatibility, billing behavior or runtime capacity.

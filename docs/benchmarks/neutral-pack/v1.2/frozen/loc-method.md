# Source-count method (frozen for run `qrwty-r1-20261114`)

Frozen by Q00. Backend source is counted with the pinned **source-loc-v2** method, read from Git
objects at named commits, never from a dirty working tree. Behaviour, reliability and effort are
reported separately; a line count is not a productivity score.

## Method pin

| Item | Pin |
| --- | --- |
| Method | source-loc-v2, as written in Jeeves `docs/field-projects/source-loc.md`, SHA-256 `c9b5106ffa5a4d574ce3a7713de85c4b3d1d00da4d65b9372337548b34240076` (read 2026-11-14) |
| Parser | Rolldown 1.2.15 (the method's pinned parser) for JS/TS comment removal |
| Runner | A: the unchanged `sourceLocReport(repo, "app", baseline, completed, scope)` or the pinned CLI with QRWTY as the repository, from tooling that resolves the pinned parser. The Jeeves commit of the runner is recorded at Q05. B: a neutral inventory tool applying the same eligibility and comment parsing, pinned before B's first count (it uses no generated manifest) |

## What counts as backend source

- Physical nonblank lines after removing parsed comments; strings, regular expressions and
  template literals keep their content. Imports, braces, types, boilerplate and throwing stubs
  count as code.
- Backend JS/TS production files inside `src/` directories under `app/` (including the
  session/BFF facade, edge Worker logic and provider adapters, and server-side QR generation).
- Excluded from the backend count: tests and specs, fixtures and mocks, configuration and
  environment files (plus reviewed `configurationPaths`), declarations, dependencies and vendored
  or build output, SQL, scripts, Docker/Compose, IaC, manifests and docs. Each is reported in the
  support counts instead.
- Each count uses a reviewed scope file (`backendPaths`, `uiPaths`, optional `configurationPaths`,
  app-relative). UI exclusions take precedence. Eligible source outside both lists stops the
  report until it is classified. The scope file is committed with each report.

## Definitions

| Symbol | Meaning |
| --- | --- |
| **G0** | Eligible lines in A's untouched generated baseline (the Q05 commit) |
| **R** | Baseline lines retained in the final files: the longest ordered matching sequence within each same-named file, ignoring indentation and trailing whitespace |
| **C** | New or replaced final backend lines, including every product-authored addition and any edit to a generated line |
| **D** | Baseline lines removed or replaced: `D = G0 − R` |
| **B** | Final backend production source: `B = R + C` |
| Template share | `R / B × 100`; undefined when `B` is 0 |

A reports G0, R, C, D and B and checks both identities. **B (the independent arm) has no
generated baseline**: it reports its total backend `B` only; template share is *not applicable*.
Starter or library scaffolding in B is attributed separately and never presented as generated.

## Separate counts

| Count | Rule |
| --- | --- |
| **UI source** (`ui-loc-v1`) | Reviewed browser TS/JS/TSX under `web/` (and any reviewed UI path), CSS and markup, with language subtotals. JS/TS use the same parser; CSS and markup use a parser pinned when the measurement tool is built. Original source only: no minified output, generated CSS, screenshots or assets. Not called source-loc-v2 |
| **Support source** (`support-loc-v1`) | Separate totals for product SQL, IaC and deployment configuration, scripts, tests (including oracle adapters) and docs. JS/TS files use the source-loc-v2 parser; other files count nonblank physical lines with comments kept, reported per extension |
| Open work | Open hooks, unimplemented routes, unused generated source and behaviour completion are reported beside the counts. Any required 501 means the product is unfinished, whatever the share |

## Layout both arms follow

Backend in `app/` (production code under `src/`), UI in `web/`, infrastructure in `infra/`,
product SQL beside the backend outside `src/` (for example `app/migrations/`), evidence and docs
in `docs/`. Placement follows the runtime, not the metric. No padding, gratuitous services,
moving logic into SQL or configuration to shrink a count, or reformatting to change line counts
(formatting rule in decisions §6).

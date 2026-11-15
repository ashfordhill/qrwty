# Source-count runner (arm A)

The pinned, auditable runner for **source-loc-v2** that [comparison.md](../../docs/plans/production-build/comparison.md)
and the pack's [loc-method](../../docs/benchmarks/neutral-pack/v1.6/frozen/loc-method.md) ask for. It
runs Jeeves's own CLI, unchanged, from Jeeves commit **`4e87f97`** (QGR2, A's frozen generator),
with this repository as `repo` and `app` as the application. It counts backend code only; UI is
excluded wherever it lives.

| Item | Pin |
| --- | --- |
| Method | source-loc-v2, Jeeves `docs/field-projects/source-loc.md` SHA-256 `c9b5106f…0076` (the pack's pin) |
| Code | `jeeves-generator/src/source-loc.ts` and `source-loc-cli.ts` at `4e87f97`, unchanged ([pins.json](pins.json) holds every SHA-256) |
| Parser | Rolldown 1.2.15, with zod 4.5.4 and tsx 4.23.15, from the copy's own lockfile |
| Runtime | Node 24.21.0, pnpm 12.16.1 |
| Scope | [backend-scope.json](backend-scope.json), reviewed in Q05 ([evidence](../../docs/evidence/q05/checks.md#5-loc-runner)) |

## Use

```sh
# Once: a git-archive copy of Jeeves 4e87f97 (its docs/ left out) with its own offline install.
bash tools/loc/setup.sh /home/ash/github/jeeves .scratch/loc-runner
# Each count: two commits of this repository; writes source-loc-v2.json and summary.json.
bash tools/loc/source-loc.sh .scratch/loc-runner <baseline commit> <final commit> <out dir>
```

`pnpm loc:setup …` and `pnpm loc …` are the same commands. `verify-runner.sh` refuses a copy whose
pinned files, method document or installed parser differ from [pins.json](pins.json), and
`source-loc.sh` refuses any Node but 24.21.0.

## What it reads

- **Git objects only.** The CLI lists `app/` with `git ls-tree` and reads each file with
  `git cat-file` at the two commits, and checks every baseline file against the baseline
  commit's `app/.jeeves/manifest.json` (`git show`). The scope is taken from the final commit's
  Git object (`git show <final>:tools/loc/backend-scope.json`) and passed to the CLI as an absolute
  path. A dirty working tree, a deleted file or an edited scope changes nothing (Q05 proof).
- `summary.mts` adds G0, R, C, D, B, both identities (R + C = B, G0 − R = D), the baseline's
  split into generated scaffolding and stub bodies (by manifest ownership), open work (unwritten
  stubs, hooks files, counted source no process imports), UI, and support counts for `app/` by
  category (JS/TS by the pinned parser; other files by nonblank physical lines, comments kept),
  all from Git objects.

## Scope

`backendPaths`: `src/runtime`, `src/features`, `src/modules`, `src/processes`. `uiPaths`: none
(the UI goes in `web/`, outside `app/`). `configurationPaths`: `src/features/application-bindings.ts`
and `src/features/local-bindings.ts`, one data constant each, as in Jeeves's YouTube v3 precedent.
A new directory under `app/src/` must be added to `backendPaths` (or `uiPaths`), or the report
refuses; a UI file must never be put under a backend path.

# Q00 checks

Run `qrwty-r1-20261114`, unit Q00, attempt 1. Starting commit
`0e2e1f2717b8a823ff501dbec95aebc9dc675d4b`. Documentation, data and tooling only: no application,
package, container, service, cloud call or Jeeves change. Tools: Python 3.12.3, Git 2.43.0,
coreutils `sha256sum`.

Reproduce everything with `bash docs/evidence/q00/run_checks.sh` from the repository root; each
check writes its command, output and exit status to the `.txt` file named below.

| Check | Output | What it shows |
| --- | --- | --- |
| Pack hashes and allowlist | [pack-verify.txt](pack-verify.txt) | All 37 listed files match size and SHA-256; no unlisted file; `SHA256SUMS` agrees; every Markdown link in the pack resolves or is one of the two declared outside references; the 26 copied files are byte-identical to their origin at `0e2e1f2` (`--against-git`) |
| Independent hash recompute | [pack-sha256sum.txt](pack-sha256sum.txt) | `sha256sum -c SHA256SUMS` passes for every file, including `MANIFEST.json` |
| Tamper detection | [pack-negative.txt](pack-negative.txt) | A verified copy elsewhere passes; one changed byte, an added A plan, a removed file, a broken link and an edited `SHA256SUMS` each fail |
| Ledger tool copies | [pack-ledger-copies.txt](pack-ledger-copies.txt) | The pack's `ledger/` files are identical to the run directory's |
| Seeded ledgers | [ledger-validate.txt](ledger-validate.txt) | Shared ledger (planning units, owner decisions, coordinator, Q00) and the empty A ledger pass the schema and rules R0–R17; pending usage listed |
| Validator self-test | [ledger-self-test.txt](ledger-self-test.txt) | A valid base passes; 28 known-bad records are each rejected with the expected rule |
| Recording workflow | [ledger-workflow.txt](ledger-workflow.txt) | In a throwaway repository using the pack's ledger copy: start an attempt, run the coordinator's `transcript-usage.py --records` on a synthetic transcript (duplicate `message.id` removed), import usage with Agent-tool totals, refuse a second import, update, validate; a hand-edited mismatched total is rejected (R14) |
| JSON | [json-parse.txt](json-parse.txt) | `status.json`, `MANIFEST.json` and the ledger schema parse |
| Links | [links.txt](links.txt) | Every relative link and anchor in the Markdown files this unit changed outside the pack resolves; 11 broken links in `business-analysis/` predate this unit (they point at the removed earlier application) |
| Whitespace | [whitespace.txt](whitespace.txt) | New files have no trailing whitespace and end with a newline; `git diff --check` is clean for changed tracked files |
| No runtime change | [no-runtime-change.txt](no-runtime-change.txt) | Every changed path is in the allowed writes; no `app/`, `web/`, `infra/` or `package.json` |

Before the commit, `git diff --cached --check` on the staged paths: [staged-diff-check.txt](staged-diff-check.txt).

**Pack identity:** `MANIFEST.json` SHA-256
`834ff75206531b1742a0677f2b8aadfa7848a4aedada6c354bdbbe4e04765736`.

## Toolchain sources

Publication dates read on 2026-11-14 with `pnpm view <package> time --json` (npm registry),
`https://nodejs.org/dist/index.json` and Docker Hub's tag API. Each pin is at least two weeks old.

| Pin | Published | Newer release seen, not chosen |
| --- | --- | --- |
| Node.js 24.22.2 | 2026-10-27 | 24.22.3 (2026-11-10, under two weeks) |
| `node:24.22.2-alpine` | tag updated 2026-11-05; index digest `sha256:a34ab6d7f6f4813f4d0c5469d74685604b962fbdbf5793a7bc7b4998ecb867c8` | — |
| pnpm 12.16.1 | 2026-10-27 | 12.18.0 |
| TypeScript 7.0.2 | 2026-07-08 | — (latest) |
| `@types/node` 24.19.2 | 2026-10-09 | 26.x (different Node major) |
| Vitest 5.0.0 | 2026-09-03 | 5.1.0 |
| `@playwright/test` 1.63.0 | 2026-09-04 | 1.65.1 |
| Biome 2.6.4 | 2026-10-28 | 2.6.5–2.6.7 (under two weeks) |

The machine's pnpm is 12.16.1; its default `node` is 18.19.1 and nvm holds 24.21.0. The match with
the Jeeves generator's current toolchain was not verified (Q00 may read only
`docs/field-projects/source-loc.md` in Jeeves, SHA-256
`c9b5106ffa5a4d574ce3a7713de85c4b3d1d00da4d65b9372337548b34240076`); see decisions §6.

## Not run

No application, UI, container, cloud or load suite exists or was run. No Jeeves file changed, so
no Jeeves suite was run. No browser check: nothing user-visible changed. Model usage for this
attempt is pending the coordinator's transcript extraction (ledger event `shared-0007`).

# Verification record

**31 October 2026** · All newly authored files are in `business-analysis/ai-generated-reports-gpt-6/`.

## Report and calculations

- Reproduced the new economics using `python3 scripts/economics.py` from this folder. The five CSV outputs contain the report's model inputs and results.
- Checked the cohort outputs against the independent closed-form geometric sum, and checked account targets against the contribution formulas.
- Checked relative Markdown file links and required blank-line separation before tables. External source pages were inspected as documented in [sources.md](sources.md); no blanket external link checker or checkout test is claimed.
- Re-ran DeepSeek's simulation in a temporary directory. Its summary and sensitivity CSV outputs match the supplied files. Neither the original script nor its outputs were modified. Reproduced Fable-case percentile ranks: P16.1, P75.3, P94.1.
- Checked that regenerating the new CSVs leaves their contents unchanged.
- Checked new Markdown and Python files for trailing whitespace. A repository-wide `git diff --check` flags pre-existing CRLF/trailing-whitespace changes in `business-analysis/README.md`; that file was left untouched.

Reproduce the new calculations from the repository root:

```sh
python3 business-analysis/ai-generated-reports-gpt-6/scripts/economics.py
```

The script uses only the Python standard library. No dependencies were added.

## Required project checks

Run from `/home/ash/github/qrwty`:

| Command | Result |
| --- | --- |
| `pnpm install` | Passed; already up to date |
| `pnpm typecheck` | Passed for API and frontend; generated client reported up to date |
| `pnpm test` | Passed: API 29 tests; frontend 15 tests |
| `docker compose up --build --wait` | Passed: images built, database initialization exited successfully, API/database/web healthy |

These checks verify the existing application commands requested by the repository instructions. They are not evidence that the proposed commercial features exist, and they do not imply that the separate generated/acceptance packs were invoked by `pnpm test`.

The composed project was left running after the required check. The workspace already contained report reorganisations and other changes before this task; those were preserved. No application, contract, generated-owned or prior-report files were intentionally changed.

# Agents working on QRWTY

Read the latest `docs/handoff.md`, then `docs/plans/production-build/README.md`, the shared product
and acceptance contracts, and **only the assigned execution unit**. This repo is currently a
planning/research repo. Planned files, scripts, cloud resources and results are not implemented
merely because a plan names them.

- Work sequentially on `main` in the primary checkout. Do not branch, create worktrees, stash or
  delegate unless the owner explicitly assigns a different workflow. Do not start later units.
- Preserve existing business research, owner README prose, `.docs/` and unrelated dirty work.
  Updating this repo's root README with the requested diagrams and measured tables is authorized;
  Jeeves's root README remains owner-maintained and must not be edited.
- Save the real Jeeves diagram/export before generating the application. Keep backend in `app/`,
  UI in `web/`, infrastructure in `infra/`, and evidence/docs separately. Do not replace an
  existing destination or owner's studio project to simplify generation.
- Never hand-edit generated-owned files. Product hooks/stub bodies/SQL are application work.
  Record a template gap and its reproduction, then route it to a separately assigned Jeeves unit.
  Work in Jeeves follows that repo's AGENTS.md and all required regression checks.
- Production correctness, UI quality and measurement honesty take priority over a generated LOC
  target. No invented results, models, costs, tokens or capacity claims. Missing usage is null.
- Use pinned exact dependency versions and TypeScript/ESM with the existing generator-compatible
  toolchain unless the frozen comparison contract says otherwise. Never put secrets in Git.
- Execute meaningful unit/integration/browser/failure checks appropriate to the assigned change.
  New scripts must be real before docs claim they ran. Keep cloud/load tests isolated and within
  the owner's approved spend and notification scope; prepare a concrete IaC/test plan first.
- Record prompts/model usage and attempts under the comparison protocol from the start. Include
  failed work, template development and human interventions. Never read/copy the other arm's
  implementation when assigned the baseline experiment.
- Finish with an append-only handoff: changes, exact checks/results, evidence, differences,
  unresolved issues and next eligible unit. Stage only your paths and make one local unit commit
  after its gates pass. Do not push unless asked. Never use `git add .`, `git add -A`, hard reset
  or cleanup commands that discard unrelated work.

If source differs from a plan, inspect the relevant contract before acting. Adapt a harmless
renamed path and record it. For missing capability, security/correctness conflict, unexpected
existing app or a required owner decision, stop only the dependent work, preserve progress and
report the exact issue. Do not weaken a test, silently change scope or work around a generated
ownership boundary. A coordinator may assign fresh agents sequentially; that is not permission
for this agent to spawn additional agents.

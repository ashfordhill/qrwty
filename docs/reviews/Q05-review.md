# Q05 review: the generated baseline

Arm A, `Q05-review`, attempt 1 (ledger `a-4020`, role reviewer, phase review, requested Fable xhigh),
run `qrwty-r1-20261114`. Reviewer only: I did not implement Q05. QRWTY at `f7f333d` (the commit that
adds the packet); the unit under review is commits **`33d50e9`** (baseline) and **`7b432f7`**
(follow-up), accepted by the coordinator in `f7f333d`. Checked against `units.md` Q05,
`comparison.md`, owner decisions §10 and the evidence in `docs/evidence/q05/`, not only its summary.

Jeeves was read only at **`4e87f97`**, through `git archive` (its `docs/` left out) and `git show`
into `.scratch/Q05-review/`; nothing in the Jeeves checkout was written or run, no later commit and
no `docs/plans/qrwty-lessons/` was read. The studio API was used with `GET /projects` and
`GET /projects/<id>/design` on the QRWTY project only. Arm B's checkout was not read. No cloud,
Auth0, Cloudflare or `~/.config/qrwty/`. Docker: only project `qrwtya-q05r`, removed by exact name.

**Foreign context.** The session started with Jeeves's `AGENTS.md`, the Jeeves Git status (which
names later Jeeves commits) and a memory index. They were ignored; the Jeeves status was not used to
reason about later commits.

## Verdict: passed with findings

Every claim of Q05 that I could re-run reproduced byte for byte. The baseline `app/` is exactly
what the frozen CLI at `4e87f97` produces from revision 84, revision 84 differs from 83 only in the
Click events provider, the LOC runner gives G0 2,926 (2,871 + 55) from Git objects alone, the root
commands change no generated file, and the smoke stack starts healthy from the committed baseline
with exactly the 11 named stubs unimplemented. M01 and M03 pass on my own run. The findings are
about the measurement runner's setup, record-keeping and documentation, none about the baseline's
bytes or numbers, and none blocks Q12a, Q13 or Q06–Q10b.

## What I re-ran

| Check | How | Result |
| --- | --- | --- |
| Frozen copy | `git archive 4e87f97 -- . ':(exclude)docs'` into scratch; `pnpm install --frozen-lockfile --offline --ignore-scripts` | 1 s, store only. Pinned files' SHA-256 equal `pins.json` (`source-loc.ts`, `source-loc-cli.ts`, three package files, lockfile) and the method document equals the pack's pin `c9b5106f…0076` |
| Live design | `GET /projects/<id>/design` (200, revision 84), canonicalised with the frozen generator's `canonicalJson` | SHA-256 **`4fbcd311…024d`**, 27,842 bytes, equal to `33d50e9:app/.jeeves/inputs/design.json`. Project list: 20 projects; QRWTY at 84, `updatedAt 07:53:01.637Z`, unchanged since Q05's save |
| Regeneration | `pnpm --filter @jeeves/generator export:v2 <canonical r84> <new dir>` from the frozen copy, twice | 87 files, `requiredGaps: 11`, `findings: 0`. Both exports identical to each other and to `git archive 33d50e9 app` (`diff -r` clean; tree-of-hashes `897cc221…`); manifest `c4c33e26…7daff` |
| M01 | My own script over the fresh export, the live design, `git show 4e87f97:<path>` and the studio records (`tree-studio.json`, `studio-generation-preview-r84.json`) | **Pass**, 11/11: input equals the canonical design; manifest input hashes equal it; every listed file present with its hash; every file listed but the manifest; all **165** generator sources named in the manifest equal their `4e87f97` blobs; studio export has the same 87 paths, the same input bytes and the same 14 template selections; its preview's manifest hash equals its ZIP's |
| r83 vs r84 | Structural JSON diff of the two saved sources (Q01's and Q05's downloads) and of the two v3 blueprints | Source: 2 differences (`elements[11].settings.provider` `unspecified → google-cloud`, `revision 83 → 84`). Blueprint: 4 (revision, the provider in two places, one composition hash), as `checks.md` says |
| LOC runner | `tools/loc/setup.sh` into a new copy, then `tools/loc/source-loc.sh <runner> 33d50e9 33d50e9 <out>` under Node 24.21.0 | `source-loc-v2.json` and `summary.json` **byte-identical** to `docs/evidence/q05/loc/`. G0 2,926 in 45 files; R 2,926, C 0, D 0, B 2,926; R + C = B and G0 − R = D hold; scaffolding 2,871 (34 files), stub bodies 55 (11); UI 0, `web/` absent |
| Git objects only | Scratch clone at `33d50e9`: appended to `http.ts`, deleted a stub body, replaced the manifest with `{}`, added `src/extra/unclassified.ts`, narrowed the scope file; ran the clone's runner on `33d50e9` | Both outputs byte-identical to the committed report. Positive control (a committed code line in one stub): R 2,926, C 1, D 0, B 2,927, 99.97%. (Q05's control replaced a line: R 2,925, C 1, D 1.) |
| Node pin | `source-loc.sh` with Node 18.19.1 on PATH | Refused: `node v18.19.1, pinned v24.21.0` |
| Root commands | `pnpm app:install`, `pnpm build`, `pnpm check` (Node 24.21.0) | Exit 0: install from the store, `tsc` clean, 64 generated files equal the manifest, 22 application files as generated, hooks 0, 11 stubs, 11 required gaps. `git status app/` clean afterwards (only ignored `node_modules/`, `dist/`) |
| Smoke | Scratch copy of my fresh export, Q05's `smoke-override.py` (labels `qrwty.arm=a`, unit relabelled `Q05-review`, the two External API URLs), project `qrwtya-q05r`, ports 47251–47253, `pnpm first-run` | Exit 0 in 2 min 43 s, 12 services healthy. Q05's probe scripts with the project renamed: the same 25 answers (10 routes answer their named 501, Account API 401 `SIGN_IN_REQUIRED` without a token and 501 "My links" / "Link analytics" with a client-credentials token, the worker dead-letters one Pub/Sub message with `x-terminal-code: NOT_IMPLEMENTED`). Logs: 11 `not-implemented`, 11 `probe … ok`, 3 `started`, 6 `Application ready`, no error line. Torn down by exact name: no `qrwtya*` container, volume, network or image and no `qrwty.arm=a` container left; `.runtime/` deleted; no prune |
| Records | `sha256sum -c SHA256SUMS` in `docs/evidence/q05/`; coverage of every evidence file; PNG hashes; Q01/Q02 evidence; `git diff --check` | All 58 hashes OK and every file listed. r84's Detailed and Simple PNGs equal r83's (`826a9efb…`, `5384d218…`). `docs/evidence/q01`, `q02` untouched between `e17df9c` and `7b432f7`. `git diff --check` clean outside `app/`; inside, only the two blank-line-at-EOF generated files (AG-09) |
| Ledger | `ledger.py validate` after my start record | OK |

## 1. Revision 84

**Only change: the Click events provider.** The structural diff of the saved sources r83 → r84 has
exactly two differences, the provider and the revision number; the blueprint diff has the same
change in its two places plus one derived hash. `plan-revision.json` lists the same 15 normal
generation controls before and after under both the studio's installed support and the frozen
registry's (equal, SHA-256 `7140e444…`): 3 Sign-in, 10 process limits, 1 worker concurrency and
the queue Provider, of which only the Provider changed. The in-memory result's canonical hash equals
the saved revision's. Blockers under both supports: none.

**Saved through the supported path.** `buildSupportedAuthoringCommand` from `@jeeves/spec` at
`4e87f97` built the batch (one `setStudio` op, identical under both supports) and
`POST /projects/<id>/operations {baseRevision: 83, ops, source: "api"}` answered 200, operation 7037
(`save-record.json`). That is the route Q01 used and the one the server exposes at `4e87f97`
(`routes/projects.ts`). 20 projects before and after; only this one changed. The live project still
reports `updatedAt 2026-11-15T07:53:01.637Z`, so nothing has touched it since.

**Nothing else newly allowed was left wrongly alone.** Of the QG units the frozen plan lists, only
QG07 (Pub/Sub channels) added a diagram choice, the queue's provider. QG01–QG06, QG10–QG12 and
QG17–QG25 change generated code, deployment variables or the application's own files, not diagram
controls, and the control listing confirms no second supported value appeared.

**The three "not changed" items are right.**
- Click events' description ("Production transport is GCP Pub/Sub, pending G12; the local export
  uses the installed broker") is now stale text, but it lives only in the saved design and the
  input copy; no generated file carries it, and fixing it would have been a second change outside
  the packet's authorization. Record it for the next authorized revision (finding F5).
- Billing API's Entitlements on the public tile: QG15 (per-route exposure) is deferred, so no QG fix
  made an internal tile a supported choice; QRWTY's own edge keeps it unreachable. Correct.
- Redirect service's 1000 ms request timeout under the publisher's 2000 ms bound: an existing
  control, not a new one; QGR2 finding 2 describes the resulting 503 `DEADLINE`; Q08 owns the
  decision. Correct.

## 2. The frozen export

**Byte for byte.** My two fresh exports from the frozen copy are identical to each other and to
`app/` at `33d50e9` (87 files, `diff -r` clean, every SHA-256 equal, manifest `c4c33e26…7daff`).
The committed `app/` is unchanged at `HEAD` (`git diff 33d50e9 HEAD -- app` empty).

**Untouched, no product code.** The 11 stub bodies throw `Not implemented: <name>` (55 lines in
all), the 8 product SQL files hold generated comments only, there is no `*.hooks.ts`, every
process's report row has `hooks: []`, and there is no `web/`. `verify-generated.py` finds all 64
generated files at their manifest hashes and the 22 application files as generated. The overlay
(`infra/app-overlay/`) was not copied into `app/`, which is the right call for a baseline that must
hold no application files; the handoff tells Q06 how to install it.

**The studio/CLI difference table holds, as far as the evidence allows.** `tree-cli.json` equals
the committed `app/` (hash and size, all 87); `tree-studio.json` differs in exactly the 14 files the
table names and matches the ZIP entry list and the preview's manifest hash; the studio preview's
templates and input equal the CLI's, and its registry hash differs (the studio ran at HEAD). The
file diff's content matches each attributed subject: `Retry-After: 1` on the fallback 503 in
`http.ts` (QG21), `chmodSync` after writing secret files in `bootstrap.mjs` and `setup.mjs` (QG22),
one README sentence on starting a service of one's own (QG23), `add_header Retry-After 1 always`
on the edge's `@unavailable` (QG25), and the uncommitted set (a whitespace check in the six
process files and `module-clients.ts`, a comment on cache probes, the README listing
`JEEVES_EXTERNAL_*_URL` per process). The union of the steps' `changedFiles` is the 14-file set,
`frozenCliEqualsChainStart` is true and the chain's end is explained to one comment line.
**Limit of this review:** the packet forbids me to read any Jeeves commit after `4e87f97`, so I
did not re-export at `39a20be`, `1d42570`, `efbff72`, `79ecb96` or with the working-tree diff; the
commit-by-commit attribution is verified from Q05's records and the diff content, not re-executed.

## 3. LOC runner

**Unchanged source-loc-v2, pinned, Git objects only.** `source-loc.sh` runs Jeeves's own
`source-loc-cli.ts` with QRWTY as `repo` (the CLI takes `git rev-parse --show-toplevel`) and
`app` as the application; both files and the method document hash to the pins, which equal the
`4e87f97` blobs. The CLI reads with `git ls-tree`, `git cat-file` and `git show`
(`source-loc.ts` lines 112–151); the scope comes from `git show <final>:tools/loc/backend-scope.json`.
My dirty-clone run proves it: five working-tree corruptions changed nothing, a committed one-line
code change changed C by one.

**G0, identities, scope.** My rerun's report and summary are byte-identical to the committed ones:
G0 **2,926** = scaffolding **2,871** (34 `generated-scaffold` files) + stub bodies **55** (11
`generated-extension` files, all `src/modules/<tile>/<module>.ts`), 0 unclassified; R + C = B and
G0 − R = D hold; first template share 100.00%, which `checks.md` correctly calls the definition at
the baseline, not an outcome. The scope follows `comparison.md` and the pack's `loc-method.md`:
`backendPaths` `src/runtime`, `src/features`, `src/modules`, `src/processes`; `uiPaths` empty
(UI goes in `web/`, which is absent, so UI = 0 counted independently); `configurationPaths` the two
one-constant binding files, as in Jeeves's YouTube v3 precedent. 45 included + 42 excluded = 87, so
every path is classified. Support counts are separate by category (scripts 716, product SQL 125,
deployment config 343, package/build config 1,550, …), and open work is beside them: 11 unwritten
stubs, 0 hooks, `src/features/service-resources.ts` (50 LOC) reached by no process.

**Finding F1 (low):** a runner copy built with the wrong Node on PATH verifies but cannot parse
(details below). It did not affect Q05's numbers; my rebuilt copy reproduced them exactly.

## 4. Wiring and smoke

**Root commands wrap, they don't edit.** The root `package.json` has no dependencies and every
script runs in `app/` with `--dir app` or `exec`; `check` = typecheck + `verify-generated.py` +
`open-work.mjs`. After `app:install`, `build` and `check`, `git status app/` is clean; only the
ignored `node_modules/` and `dist/` appeared. The root `pnpm-lock.yaml` pins pnpm itself only.
Not yet present, and not required of Q05 by the contract ("created in Q05/Q06"): lint, network-free
unit tests and `evidence:validate` (F7).

**The smoke is honest.** My rerun of the committed baseline reproduces Q05's record exactly: the
stack starts healthy, exactly the 10 route stubs answer 501 with their module names, the loop stub
dead-letters with `NOT_IMPLEMENTED`, the Required guard answers 401 before the stubs, the Optional
guards answer `signedIn: false`, and nothing else fails. `checks.md` §7 says "No product-completion
claim" and the README calls `app/` "the measurement starting point, not the application". The
override used for the smoke lives only in the scratch copy; the baseline has none.

## 5. Records

- **Provenance** (`jeeves/provenance.json`): generation by `4e87f97`, saving and renders by the
  studio at HEAD `79ecb96` with uncommitted generator changes (both diff hashes recorded), the
  registry, runtime and 14 template refs, the preview archive's hashes, the renders' hashes with the
  note that they equal r83's, the blueprint hashes. Complete and consistent with the files.
- **Hashes:** `SHA256SUMS` lists all 58 evidence files and verifies; `baseline.json` records the
  baseline commit, `app/` tree `c209a832…`, manifest, design, generator command and the LOC
  numbers, and its hash is in ledger `a-3835` (R12 accepts the committed version).
- **README:** the diagram section embeds the **Detailed** r84 PNG, links Simple, the source JSON,
  blueprint, report, provenance and checks, keeps revision 83 as history, and says plainly that the
  provider isn't drawn and that every product route still answers 501. The rest of the README is
  stale (F3).
- **Ledger:** `a-3636` (start, worker, phase `generation-baseline`, foreign context noted) and
  `a-3835` (evidence with hashes; status and usage left to the coordinator) are correct.
  The coordinator's `a-4018` carries `agentToolTotals` 0/0/0 with a source while `a-4019` puts the
  real totals (400,838 tokens, 192 tool uses, 1,738,518 ms) in a note; the same pattern is in all
  24 imported attempts (F4). Not Q05's doing.

## 6. Fitness for what follows

**A sound start for Q12a/Q13 and Q06–Q10b.** The baseline is reproducible from the saved design
and a frozen commit, builds and typechecks, starts healthy with the Pub/Sub emulator, and has a
pinned measurement runner with a Git-object proof. Q04's IaC draft, overlay and probe manifest
target this same export (Click events on Google Cloud). What Q12a/Q13 must carry from the gaps:
AG-02 (TLS override), AG-03 (one secret directory) and AG-04 (no IAM auth for the cache) through
the overlay's preflight and the IaC; AG-05's unprefixed Pub/Sub names in the shared project (B
prefixes its own); the `JEEVES_EXTERNAL_*_URL` variables the frozen report's `environment` omits
(QGR2 finding 7, the README lists them). The real precondition for Q13's apply is **Q04b**
(`tofu validate` needs the owner's permission to download OpenTofu), recorded in Q04's handoff, not
a Q05 matter.

**AG-01 to AG-09 are recorded honestly.** Q04's seven have severities, the template file each
touches, the workaround and a remedy; Q05's two are low and described exactly (I confirmed both:
identical PNGs, two `new blank line at EOF`). Nothing found in this review contradicts them, and no
generated file was edited to work around any of them. The coordinator's `run-status.md` lists
AG-01–07 as future QG30+ but not yet AG-08/09 (F6). **None blocks a later unit**: AG-08 is
notation, AG-09 cosmetic, and the Q04 gaps have workarounds that Q12a executes.

## Findings

| ID | Severity | Finding | Fix |
| --- | --- | --- | --- |
| F1 | Low | `tools/loc/setup.sh` builds a runner that `verify-runner.sh` accepts but whose parser cannot load when another Node is on PATH. Rolldown's native binding `@rolldown/binding-linux-x64-gnu@1.2.15` has `engines: ^20.19.0 \|\| >=22.12.0` and is an optional dependency, so under the host's default Node 18.19.1 pnpm skipped it silently; `verify-runner.sh` checks only `rolldown/package.json`'s version; the Node pin is enforced only at count time (`source-loc.sh`). Evidence: my first copy, built with Node 18 on PATH, printed `verified: true`, then `Cannot find native binding`; the same copy stayed broken after a reinstall under Node 24 (pnpm keeps the skipped optional); a fresh copy under Node 24.21.0 reproduced the report byte for byte | In `setup.sh`, refuse any Node but `pins.json`'s before `pnpm install` (the check `source-loc.sh` already has); in `verify-runner.sh`, require the platform binding package in `node_modules/.pnpm` or run `codeLines` on a one-line sample. Does not change any number |
| F2 | Low (process) | Q05 read Jeeves beyond `4e87f97`: `attribution.sh` applied the `jeeves-generator` diffs of four later commits and the checkout's **uncommitted** working tree, and `provenance.json` records that diff's hashes. The packet's instruction to name the commit explaining each studio difference implies reading later commits; reading the in-progress Jeeves unit's uncommitted work goes further. Nothing from it entered `app/` (M01: 165 sources equal `4e87f97`), and the handoff and provenance disclose it | The coordinator decides whether A's studio comparisons may read Jeeves's working tree. If not, future comparisons attribute committed differences only and record the rest as "studio HEAD + uncommitted, not attributed" |
| F3 | Low (docs) | The root README outside the diagram section contradicts the baseline: "The application has not been generated, built or deployed", the measurement table's "Not generated", "both reviewed directions are built as switchable skins" (superseded by owner decisions §11), and the neutral-pack link to `v1` (current is v1.6). Q05's packet limited its edit to the diagram section and its handoff flags the rest | A small docs unit (authorized by QRWTY `AGENTS.md`: diagrams and measured tables): status paragraph, the G0 row (2,926 = 2,871 + 55; UI 0; template share "100% at the baseline, by definition"), one skin, pack v1.6 |
| F4 | Low (ledger) | Every coordinator usage import (24 attempts, `a-4018` for Q05 among them) records `agentToolTotals` as `0/0/0` with `source: "Agent tool completion notice"` and puts the real totals only in a free-text note. The run README says missing usage is `null`, never `0`; `ledger.py update` has no agent-total options, and `import-usage` refuses re-imported request IDs, so it cannot be corrected with the current tool | Pack amendment (shared, v1.7): `ledger.py update` accepts `--agent-total-tokens/--agent-tool-uses/--agent-duration-ms`; then one correcting update per affected attempt, and `import-usage` without the notice records `null` |
| F5 | Info | Click events' saved description still says "pending G12; the local export uses the installed broker"; the provider is now Google Cloud and the local export uses the emulator. Text only, in the design; no generated file carries it | Fold into the next authorized revision (Q08's timeout decision is the likely occasion); one revision per unit stays the rule |
| F6 | Info | `docs/coordinator/run-status.md` lists AG-01–07 as future QG30+ units but not AG-08/09 | Coordinator bookkeeping at the next status update |
| F7 | Info | Root `check` has no lint and no unit tests, and there is no `evidence:validate`; the units.md command contract says Q05/Q06 create them, and the export emits no lint config or tests | Q06 adds Biome and a network-free unit test runner when it adds the first product code; `evidence:validate` can wrap `SHA256SUMS` checks and `ledger.py validate` |

## Proposed units

1. **Q05c — the LOC runner's setup refuses the wrong Node and verifies the parser** (F1): in
   `tools/loc/setup.sh`, the Node check from `source-loc.sh` before `pnpm install`; in
   `verify-runner.sh`, the platform binding's presence (`@rolldown+binding-linux-x64-gnu@1.2.15`
   under `node_modules/.pnpm`) or a one-line `codeLines` smoke; README note that a copy built
   under another Node must be rebuilt. Check: a copy built under Node 18 is refused; a Node 24 copy
   reproduces `docs/evidence/q05/loc/` byte for byte. **Ready.**
2. **Q05d — README status and measured table** (F3): the status paragraph (generated baseline
   exists: `33d50e9`, revision 84, Jeeves `4e87f97`; nothing deployed but the placeholder), the G0
   row and its scaffolding/stub split, UI 0, one skin (§11), pack link to v1.6; nothing else in the
   owner's prose. **Ready.**
3. **N07 — pack v1.7: `ledger.py update` carries agent totals; correction pass** (F4): the three
   options on `update`, `null` when the notice is absent, a self-test case, then one update per
   affected attempt in A's and shared ledgers (B's by B's coordinator step). Shared pack change.
   **Needs the owner.**
4. **Coordinator rule on reading Jeeves's working tree from arm A** (F2): allow or forbid for studio
   comparisons; if forbidden, the comparison records unattributed differences. **Needs the owner.**
5. **Next QRWTY revision folds the Click events description** (F5): with Q08's timeout decision or
   another authorized diagram change; one revision. **Needs the owner.**
6. **Coordinator status update** (F6): AG-08/09 in `run-status.md`, Q05 accepted at `33d50e9`.
   **Ready** (coordinator).

## Not re-run, and why

- Exports at Jeeves commits after `4e87f97` and with the working-tree diff (the commit-by-commit
  attribution): forbidden to this review; verified from the records and diff content (section 2).
- The studio's mouse steps and PNG captures: the owner's studio runs Jeeves HEAD; the renders are
  verified by hash against the committed files and r83's.
- Q05's `m01.py` as written (it needs the studio ZIP's extracted directory, which is not in the
  evidence): replaced by my own equivalent checks over `tree-studio.json` and the preview JSON.

## Read

The packet; QRWTY `AGENTS.md`; `docs/handoff.md` (Q04, Q05); `units.md` (common contract, Q05,
Q06, Q07, Q12a, Q13); `comparison.md`; owner decisions §10–§12; pack v1.6 README, `loc-method.md`,
the M rows (`acceptance-oracle.md`, `acceptance.md`), the ledger README and `ledger.py`'s options;
`docs/evidence/q05/` in full (checks, commands, records, loc, jeeves, screenshots by hash),
`docs/evidence/q04/a-found-gaps.md`, Q01's r83 source, blueprint and PNGs; `tools/loc/`, the root
`package.json`, `tools/open-work.mjs`, `infra/local/verify-generated.py`, `app/README.md`,
`app/.jeeves/report.json`; Jeeves at `4e87f97` only: `docs/field-projects/source-loc.md`, the
generator README (commands), `docs/plans/qrwty-gaps/review-batch2.md` ("For Q05"),
`docs/plans/qrwty-gaps/units.md` (the QG table), `jeeves-generator/src/source-loc-cli.ts`,
`source-loc.ts`, `jeeves/apps/server/src/routes/projects.ts`, `jeeves/packages/spec/src/supported-authoring.ts`.
Not read: `/home/ash/github/qrwty-baseline`, `~/.config/qrwty/`, any Jeeves commit after
`4e87f97`, `docs/plans/qrwty-lessons/`.

## Elapsed

08:15:58Z to the commit, wall clock; see the handoff entry for the end time.

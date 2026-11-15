# A8: line counts for the finished arm A

How each number in the README's [Results after finishing A](../../../README.md#results-after-finishing-a-2026-11-15)
was counted. Backend only. The UI (`web/`) is outside `app/`, so the runner never sees it, and
nothing here counts it. No test or oracle was rerun.

## 1. Runner

- `tools/loc/setup.sh /home/ash/github/jeeves .scratch/A8/loc-runner-4e87f97`, under Node 24.21.0
  and pnpm 12.16.1. `verify-runner.sh` passed (pinned files, method document, Rolldown 1.2.15, parser
  smoke).
- The pinned files and the method document are byte-identical at Jeeves `0aea8e7` (SHA-256 of
  `git show 0aea8e7:<path>` against [pins.json](../../../tools/loc/pins.json), all seven equal). So a
  copy from `0aea8e7` would be the same runner, and none was built.

## 2. Baseline

- `source-loc.sh … 3179494 0647e4a` refuses:
  `Baseline source does not match its generated manifest: src/modules/link-api/link-api-link-operations.ts`
  ([output](loc/refused-3179494.txt)). It reads the new manifest fine. The problem is that A1's
  commit is an update on top of Q06, so Q06's merged stub body and its `link-operations/` files are
  already in it.
- So the baseline is the clean `0aea8e7` export of the same input: A1's fresh `export:v2` of
  revision 84 (`.scratch/A1/fresh`).
  - Its manifest is byte-identical to `3179494:app/.jeeves/manifest.json` (`f0eb002f…e024`).
  - All 93 listed files match that manifest's SHA-256, and there are no other files.
  - At `3179494`, only four of those files differ from it: Link operations' stub and SQL,
    `package.json` and `pnpm-lock.yaml` ([A1 checks](../a1/checks.md)).
- In a scratch clone (`.scratch/A8/loc-clone`), detached at `3179494`, `app/` was replaced by that
  export and committed as `3f546c26…bc2387` (the `app/` tree is `dc6f559e…980f`). The runner then
  ran from the clone's own copy of `tools/loc`, which is unchanged from `3179494` to `0647e4a`.

## 3. A now (`3f546c2..0647e4a`)

- [loc/summary.json](loc/summary.json):
  - G0 3,572 = 3,495 scaffolding + 77 stub bodies;
  - R 3,548, C 4,998, D 24, B 8,546, share 41.52%. Both identities hold.
  - All 11 stubs are written. No hooks files. One unreached file: `src/features/service-resources.ts`
    (50, generated).
- Areas: [areas.py](loc/areas.py) groups the runner's per-file rows ([areas.json](loc/areas.json)).
  - Areas follow tiles and module folders: `src/runtime` and `src/features` are platform;
    `src/processes`, `src/modules/entry.ts` and `dependencies.ts` are process entry points and wiring.
  - Account API's My links goes with sessions and accounts (S02 merged B's `session/` and
    `account/`), and Link analytics goes with analytics.
  - Session API's `session/client-address.ts` (72, A6's admission key) goes with abuse.
- Excluded by source-loc-v2's name rule (`settings`): `src/runtime/settings.ts` (141, generated) and
  three `settings.ts` stub files (93, written). The two binding constants are configuration, as in
  Q05's scope.
- Cross-check: S02's counter (`count-tree.mts … 0647e4a a`, [rows](counter/a-0647e4a.json)) gives
  8,548 lines in 86 files under `app/src`. That is the runner's 8,546 plus the two binding constants
  (one line each).
- A1 alone (`3f546c2..3179494`, [loc/a1/](loc/a1/summary.json)): R 3,569, C 761, D 3, B 4,330, share
  82.42%, with 10 stubs unwritten.

## 4. Tests, SQL, infrastructure, edge (A at `0647e4a`)

All from Git objects. JS/TS is counted with the pinned parser, and other files by nonblank lines,
comments kept.
- **Tests:** 5,058, S02's `tests` category (`app/test/` 4,995 and `test-hooks.ts` 63).
- **SQL:** 1,497 in the 17 manifest SQL files. Of these, 155 are the generated headers, foundation
  and idempotency files (the baseline's lines, each still a prefix of the final file), and 1,342
  were written ([areas.json](loc/areas.json) `sql`).
- **Infrastructure:** 3,086, S02's definition: root `infra/` without `app-overlay/` (`gcp` 1,998,
  `local` 502, `q12a` 391, README 195). That is 2,746 without JSON.
- **Edge:** the Worker's `deploy/cloudflare/src` is 418 at `0647e4a` and 217 at `a0ddd52`, before A2
  ([rows](counter/a-a0ddd52.json)). It sits outside `app/` and is not in A's totals.

## 5. B and A v1

- **B:** S02's counts at `f2fb3ce`, reused unchanged ([summary](../s02/loc/counter/summary.json)):
  - 9,361 in 77 files, by S02's areas; 11,113 with `src/platform/config/` (1,752);
  - tests 11,058, SQL 476, infrastructure 13,193 (8,298 without JSON).
  - The helper counterparts are `platform/db/transaction.ts` 118, `links/idempotent.ts` 77 with
    `links/idempotency.ts` 31, and the `config/` registry 1,752.
- **A v1:** Q05/Q06 ([Q06 report](../q06/loc/summary.json)): G0 2,926 = 2,871 + 55, then R 2,925,
  C 720, B 3,645, 80.25%.

## 6. Helper use (A at `0647e4a`, `git grep`)

- `declareSettings`: all 11 stub files.
- `defineRoutes`: 9 route tables (Account API 2, Billing API 3, Link API 2, Session API 2).
- `idempotent(`: owned create and claim (`owned.ts`), checkout (`customer.ts`). Guest create keeps
  Q06's own sealed replay (AG-18).
- `transaction(`: edit and delete (`owned.ts`).

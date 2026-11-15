# S02: versions on qrwty.io and the results in the README

Shared unit S02, attempt 1 (shared ledger `shared-1025`, role implementer, phase `cloud`: the
schema has no `report`), from QRWTY `814f6f9`. During the unit the coordinator committed `dd594d0`
(QGR3 accepted, QG35 packet) and `364f283` (both arms' cloud leftovers removed). Arm B's repository
was read at `f2fb3ce`, never written. Jeeves was read only through its committed QG and QL docs.

## 1. What is live

| URL | What it shows | Source |
| --- | --- | --- |
| <https://qrwty.io/> | S01's placeholder, plus a link to `/versions/` | `deploy/cloudflare/src/router.ts` |
| <https://qrwty.io/versions/> | A dated timeline in plain words, links to the pages below, and a "what each version could do" table | new |
| <https://qrwty.io/versions/design/> | Q11's clickable prototype | byte copy of `docs/design/prototype/` (identical to pack v1.6's frozen copy) |
| <https://qrwty.io/versions/a/> | Arm A: revisions 83 and 84 (Detailed PNGs), what Jeeves generated, Q06's hand-written slice, AG-01 to AG-17 with Jeeves's fix where one exists | new; the PNGs are byte copies from `docs/evidence/q01/jeeves/` and `q05/jeeves/` |
| <https://qrwty.io/versions/a/deploy/> | Q13's deploy record, as it is | byte copy of `docs/evidence/q13/demo/` |
| <https://qrwty.io/versions/b/> | B-final's staging record, as it is | byte copy of qrwty-baseline `f2fb3ce:docs/evidence/b-final/demo/` |
| <https://qrwty.io/versions/original/> | The earlier landing page, as a static copy | fetched once from `qrwty-platform`'s own workers.dev address; edits in [original-page.json](original-page.json) |
| <https://b.qrwty.io/> (any path) | `301` to `https://qrwty.io/versions/b/` | new Custom Domain of `qrwty-edge` |

Every published file, with its source and SHA-256: [published-files.json](published-files.json)
(26 files, 6.7 MB). Each byte copy was compared with its source: no difference.

**The original page.** `qrwty-platform` still has workers.dev on, so the page was fetched from
there once (`/`, `/styles.css`, `/app.js`). Its HTML is the same 11,694 bytes S01 recorded at
qrwty.io (SHA-256 `b146e854…6bd6`). The copy keeps the HTML and `styles.css`. It drops the Google
Fonts links (external requests), so the icon spans are hidden, and it drops `app.js`, which calls
the Worker's live API (links, waitlist, an AI advisor) and imports more modules. A note at the top
says so. No service binding was needed, and nothing in `qrwty-platform` changed.

## 2. Worker changes (`deploy/cloudflare/`)

- `wrangler.toml`: `[assets]` from `public/`, binding `ASSETS`, `run_worker_first = true` (so the
  redirects, the method check and the headers cover the files), and the Custom Domain `b.qrwty.io`.
- `src/router.ts`: `handle()` wraps S01's pure `route()`. `b.qrwty.io` answers `301` to B's record
  for any path and method. `/versions/…` is fetched from `ASSETS` and gets S01's four headers. HTML
  is `no-cache, no-transform`, other files `public, max-age=3600, no-transform`. `/versions` and a
  folder path without its slash answer `301` to the slash, a missing file gets the HTML 404, `HEAD`
  has no body, and other methods get `405`. JSON Lines are served as `text/plain`.
- **CSP.** S01's policy everywhere, except two copies that need their own origin and nothing else:
  - `/versions/design/` adds `script-src 'self'`, `style-src 'self'`, and `data:`/`blob:` images;
  - `/versions/original/` adds `style-src 'self'` and `form-action 'none'`.
- `src/index.ts` passes `env.ASSETS`. The tests grow from 14 to 26. `README.md` documents all of
  this.

## 3. Cloudflare

[cloudflare/state.json](cloudflare/state.json) holds the before and after reads (sanitized; the
account's other Workers and domains are left out, and they were identical). **The only change:** the
Workers Custom Domain `b.qrwty.io` → `qrwty-edge`, with the proxied `AAAA 100::` record Cloudflare
manages for it. B-final had deleted `b.qrwty.io`'s records, so no record was replaced. No other
record, route, Worker or zone setting was touched. Custom Domains and static assets are free on the
Free plan.

| Run | Build | How | Result |
| --- | --- | --- | --- |
| 1 | `364f283…-dirty`, Worker version `69e267f5…` | `deploy.sh --allow-dirty` ([log](cloudflare/deploy-dirty.log), scrubbed) | 25 assets uploaded (1 already there: r84's PNG equals r83's); three Custom Domains; `/healthz` confirmed |
| 2 | this commit | `deploy.sh` from the clean tree | in the unit's report (a commit can't hold its own hash) |

Credentials were loaded only with `set -a; . ~/.config/qrwty/cloudflare.env; set +a` in the
command that used them, for the deploys, the read-only state reads and the one fetch of the
original page. They were never printed. The account's workers.dev subdomain appears nowhere in
the published files, the Worker source or the scrubbed log (checked by value: 0 occurrences).

## 4. Checks

- **`pnpm check`** (in `deploy/cloudflare/`): Biome, TypeScript, and vitest 26/26 pass.
- **Local.** `wrangler dev` served `public/`; every path answered as listed above. Headless
  Chromium: 32 loads, 0 external requests.
- **Live, S01's [check-live.sh](cloudflare/check-live-dirty.txt):** all checks pass (page, headers,
  no HSTS, healthz and build, 404, www redirects, TLS).
- **Live, the new paths** ([versions](cloudflare/live-versions-dirty.txt), [b](cloudflare/live-b-dirty.txt)):
  every page `200` with the expected policy, `nosniff`, `no-referrer` and `noindex`, no HSTS, and
  no injected beacon. `b.qrwty.io` `/`, `/api/v1/links?x=1`, plain HTTP and `POST` all answer `301`
  to `/versions/b/`. Its certificate verifies (Google Trust Services WE1), and following the
  redirect lands on `200`.
- **Live, headless Chromium** ([browser-check.json](browser/browser-check.json), [script](browser/browser-check.mjs),
  [screenshots](browser/)):
  - eight pages at 390 px and 1440 px, in light and dark: 32 loads;
  - **0 external requests** (each would be aborted and counted) and 0 broken images;
  - the console holds only the 404 page's own "404" line;
  - the prototype's scripts run under its policy: the screen picker fills, and Shorten shows a
    short link;
  - the only horizontal overflow is the original page's own layout, 30 px at 390 px, left as it
    was.
- **Secret scan** ([shape-scan.py](shape-scan.py)), by credential shapes only, over all 26
  published files (16 text): 0 hits on private keys, cloud, Stripe, GitHub, Slack, Anthropic and
  OpenAI keys, JWTs, bearer tokens, URLs with passwords or secret assignments. The 11 high-entropy
  strings were reviewed, and none is a credential:
  - the prototype's base62 alphabet;
  - long `example.com` URLs in B's record;
  - B's signed pagination cursor (payload: a version, a timestamp and a link id), whose key was
    destroyed with staging.
- `git diff --check` is clean, and the ledger validates.

## 5. How each number in the README was counted

- **A, from the committed runner.** `tools/loc/source-loc.sh` with the frozen runner copy
  (`.scratch/Q06/loc-runner`, Jeeves `4e87f97`, verified by `verify-runner.sh`) under Node 24.21.0.
  - Q06's numbers come from [Q06's report](../q06/loc/summary.json): G0 2,926 = 2,871 + 55, R
    2,925, C 720, D 1, B 3,645, share 80.25%.
  - A's last commit, `33d50e9..a6f982b`, is counted in [loc/a-final/](loc/a-final/summary.json):
    R 2,925, C 770, D 1, B 3,695, share 79.16%. Q13's AG-13 workaround adds 50 lines
    (`google-credentials.ts` 41, `reputation.ts` +3, `service.ts` +6).
  - Tests: 1,867 (`app/test/` 1,804 and `test-hooks.ts` 63). SQL: 421, of which 411 is product SQL
    and 286 was written: `link-api-link-operations.sql`'s 303 lines minus its 17-line generated
    header.
  - A's own `infra/`: 2,059 lines, counted without `infra/app-overlay/` because `install-overlay.py`
    copies that folder into `app/`.
  - Never written: 10 of 11 stubs (the runner's `openWork`).
- **B, with S02's counter** ([count-tree.mts](loc/counter/count-tree.mts)).
  - It imports the same runner's `codeLines` (Rolldown 1.2.15) and `exclusionReason`, and reads B's
    Git objects at `f2fb3ce` and at B03's `4961ac2`.
  - Backend source is `app/src/` with source-loc-v2's eligibility: tests, `test-*` files and
    configuration are excluded.
  - Areas are folders, with these merges:
    - **abuse:** the four `links/` files B06 added (`admission`, `moderation`, `reports`,
      `reputation`);
    - **sessions and accounts:** `session/` and `account/`;
    - **process entry points:** `processes/` without its `test-*` files.
  - Totals: 9,361 lines in 77 files. source-loc-v2 also drops `src/platform/config/` (1,752 lines),
    because the folder is named `config`.
  - Tests: 11,058 (`app/test/` 10,719 and five `test-*` files 339).
  - SQL: 476 (`app/migrations/`).
  - Infrastructure: 13,193 (`infra/gcp` 5,636, `infra/local` 3,745, `infra/inventory` 3,812), or
    8,298 without its 4,895 JSON lines.
  - Non-JS files count nonblank lines, comments kept, as `tools/loc/summary.mts` counts support
    files. The rows and the totals are in [loc/counter/](loc/counter/summary.json), made by
    [summarize.py](loc/counter/summarize.py).
- **Like for like (guest link creation).**
  - A: Q06's C, 720 lines in Link API's stub body and `link-operations/`, plus the 286 written SQL
    lines.
  - B: the seven `app/src/links/` files B03 added (`create`, `destination`, `idempotency`,
    `link-errors`, `model`, `routes`, `tokens`: 608), counted at B03's commit, plus
    `0002_guest_links.sql` (59).
  - B03's guest session and edge forwarding (`session/guest`, `forward`, `routes`, `edge/routing`
    and `platform/http/edge-auth`: 398) has no counterpart in A, which never wrote Session API.
  - A's slice includes a Web Risk client (53); B's came in B06 (139).
- **Effort** ([effort.py](effort/effort.py), [effort.json](effort/effort.json)).
  - Both ledgers' request records, per attempt.
  - **A** is ledger `a`, in three groups: product units (Q01, Q02, Q04, Q05, its review, Q06, Q13),
    the gap audit (Q03, its review, Q03b) and Jeeves template development (every `jeeves`
    attempt: the QG units, QGR1–QGR3, QGB3; QGR3's usage was imported during this unit).
  - **B** is ledger `b`. One duplicate B04 review record carries no usage.
  - **Shared** is Q00, N01–N06, S01 and Q11. The planning units and the coordinator have no usage.
  - **Agent time** sums the attempt windows. Where a window is missing or zero (Q03b, QG29), it is
    the span of the attempt's requests instead.
  - **Price** uses Anthropic's list prices per million tokens, as the claude-api skill's model table
    (cached 2026-10-06) gives them:
    - Opus 5.5: $4 input, $20 output, $0.20 cache read;
    - Fable 5.1: $10 input, $50 output, $0.25 cache read;
    - cache writes: 1.25× input (5-minute) to 2× (1-hour). The range comes from this, since the
      ledger doesn't split the writes.

    It is an estimate, not a bill.
  - The QL planner's 527,714 tokens are the Agent tool's total, from Jeeves's QL README. They are
    in no ledger.
- **Jeeves counts.**
  - Done: the 30 units in Jeeves's history from `64d0d3b` (QG01) to `fa78baf` (QG34). Deferred:
    QG13–QG16.
  - **A-found:** QG01–QG12 (Q03's audit) and QG30–QG34 (AG-01 to AG-09, batch 3's mapping).
  - **Review-found:** QG17–QG20 (the Q03 review), QG21–QG25 (QGR1), QG26–QG29 (QGR2).
  - Before A's freeze at `4e87f97`: QG01–QG12, QG17–QG20 and QG24 (17 units).
  - QGR3 (Jeeves `1d7399f`) found no defect. It proposed QG35 (ready) and QG36–QG39 (for the owner).
  - The QL estimate (35%, 49%, 64%) is from `docs/plans/qrwty-lessons/owner-summary.md`.

## 6. Findings and differences from the packet

1. **The original page is a static copy**, not a service binding. It works without one, and it
   lets the copy drop the external font and the live-API script. The copy's forms are inert.
2. **Folder paths.** Through the binding, `/versions/a` returned the page without a redirect, which
   would break its relative links. The Worker now answers `301` to the slash itself.
3. **"F3".** The packet's B-derived setting is QG09's fold F3: the Pub/Sub reconnect bound from QL01,
   which arm B's B05 review found (its finding F1). The README names it that way.
4. **A's last count.** The packet lists Q06's numbers. The README gives them, and also the count at
   A's last commit, which includes Q13's 50-line workaround.
5. **source-loc-v2 and B's settings code.** The method's `config` folder rule excludes 1,752 lines of
   B's settings registry and validation. The README states this, with the total that includes them.
6. **Not updated:** `docs/benchmarks/status.json` (not among the unit's allowed writes) still has
   the experiment's pre-run nulls.
7. **Jeeves checkout.** At the start, before taking in the packet's "run nothing there", this unit
   ran `git log --oneline` and `ls` once in `/home/ash/github/jeeves` (read-only). Everything else
   read committed files with the file reader. Nothing there was written.

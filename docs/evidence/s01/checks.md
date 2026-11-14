# S01 checks: qrwty.io placeholder on Cloudflare

Run `qrwty-r1-20261114`, shared unit S01, attempt 1, 2026-11-14 (UTC), from this machine.
Worker `qrwty-edge` with Custom Domains `qrwty.io` and `www.qrwty.io`, Cloudflare Free plan.
Every deploy here was made before the unit's commit, so with `--allow-dirty`, and the commit reads
`0ace46d94d8bc73fa93e59b8b3143f13f07a2a7d-dirty` (HEAD plus this unit's uncommitted files). A
commit can't contain its own hash, so the clean redeploy of the S01 commit itself comes after it
and is reported in the attempt's return and ledger update, not here.

| Check | Result | Evidence |
| --- | --- | --- |
| Token can deploy and attach Custom Domains | Passed: `wrangler deploy` uploaded the Worker and attached both hostnames; no permission error | [deploy-output.txt](deploy-output.txt) |
| `https://qrwty.io/` | `200` `text/html; charset=utf-8`, the QRWTY page with build line `0ace46d-dirty · 2026-11-14 23:02:41 UTC` | [live-checks.txt](live-checks.txt) |
| Security headers on every response, no HSTS | Present with the exact values on `/`, `/healthz`, `/build.json`, `/x` (404) and `www` (301); no `Strict-Transport-Security` | [live-checks.txt](live-checks.txt) |
| `/healthz` shows the deployed commit | `{"ok":true,"commit":"0ace46d94d8bc73fa93e59b8b3143f13f07a2a7d-dirty","builtAt":"2026-11-14T23:02:41Z"}`; `deploy.sh` confirms commit and build time after every run | [live-checks.txt](live-checks.txt), [deploy-output.txt](deploy-output.txt) |
| `/build.json` | `{"commit":"…-dirty","builtAt":"2026-11-14T23:02:41Z"}`, equal to `/healthz` without `ok` | [live-checks.txt](live-checks.txt) |
| Other paths | `/x` → `404` HTML, 1,146 bytes | [live-checks.txt](live-checks.txt) |
| `https://www.qrwty.io/x` → `301` `https://qrwty.io/x` | Passed; `/a/b?c=1` keeps its query | [live-checks.txt](live-checks.txt) |
| TLS certificate valid | `openssl s_client -verify_return_error -verify_hostname` returns `0 (ok)` for both names; curl verified too. Google Trust Services WE1, SANs `qrwty.io`, `www.qrwty.io`, `*.www.qrwty.io`, valid 2026-11-14 21:59:24 to 2027-02-12 22:59:21 GMT | [live-checks.txt](live-checks.txt) |
| No external requests from the page | Headless Chromium (Playwright 1.63.0 from the oracle), light and dark, 390×640: one request (`GET https://qrwty.io/`), no console messages; body colours switch with `prefers-color-scheme` | [browser-check.json](browser-check.json), [light](qrwty-light.png), [dark](qrwty-dark.png) |
| Router unit tests | 14/14 pass (vitest 5.0.0), Biome and TypeScript clean | below |
| Fresh copy | The unit's `deploy/cloudflare` files alone, without `node_modules`: `pnpm install --frozen-lockfile` and `pnpm check` pass | — |
| Redeploy is a clean no-op | Runs 2–3 and 6 redeployed unchanged code. Around run 6, DNS records, Custom Domains, Worker routes and zone settings were listed before and after: identical. Only a new Worker version and build time | [deploy-output.txt](deploy-output.txt), [dns-after.json](dns-after.json) |
| Dirty tree refused | Without `--allow-dirty`: exit 1 before any deploy, listing the dirty paths | [deploy-output.txt](deploy-output.txt) |
| DNS before and after, sanitized | Recorded; only the apex Custom Domain's Worker changed and `www` was added; no MX, TXT or CAA record exists | [dns-before.json](dns-before.json), [dns-after.json](dns-after.json), [rollback.md](rollback.md) |
| `git diff --check` | Clean | — |
| Credentials | Never printed, passed as arguments or written by this unit; see below | — |

## Unit tests

`cd deploy/cloudflare && pnpm check` (Biome 2.6.4, TypeScript 7.0.2, vitest 5.0.0, Node 24.21.0):

```
Checked 9 files. No fixes applied.
 ✓ route > serves the placeholder page with the build line
 ✓ route > makes no external requests from the page
 ✓ route > answers /healthz with ok and the build
 ✓ route > answers /build.json with the build object
 ✓ route > returns a small HTML 404 for any other path
 ✓ route > redirects www to the apex with the same path and query
 ✓ route > sends the security headers on every response and no HSTS
 ✓ route > answers HEAD like GET without a body
 ✓ route > refuses other methods with 405
 ✓ route > escapes build values in the page
 ✓ worker entry > reads the build from the environment
 ✓ worker entry > falls back to unknown without build variables
 ✓ labels > shortens a full SHA and keeps a suffix
 ✓ labels > formats UTC ISO times
      Tests  14 passed (14)
```

## Findings during the unit

- **Cloudflare injected an external script.** For browser-like requests Cloudflare's automatic
  Web Analytics added `<script src="https://static.cloudflareinsights.com/beacon.min.js/…">` to
  every HTML response (`/` and the 404). The CSP blocked it, but the page must carry no external
  script. Plain `curl` does not see it, so the first live check missed it; the headless browser
  found it. Fix in the Worker, with no zone setting changed: every `Cache-Control` includes
  `no-transform`, which Cloudflare honours by not injecting. `check-live.sh` now fetches HTML
  with browser headers; its run before the fix fails on both pages and its runs after pass
  ([live-checks.txt](live-checks.txt)). The Web Analytics site itself is still on for the zone;
  turning it off is the owner's choice.
- **Cloudflare adds `nel` and `report-to` headers** (Network Error Logging, `success_fraction`
  0) and `server`/`cf-ray` to every response. They come from Cloudflare's edge, not the Worker.
- **Plain HTTP is served.** `http://qrwty.io/` answers `200` because the zone's Always Use HTTPS
  is off. Not changed here; it belongs with Q13's HSTS decision.
- **Local DNS lag for `www`.** This machine's resolver (WSL, `10.255.255.254`) kept a negative
  answer for `www.qrwty.io` after the Custom Domain was added, while Cloudflare's and Google's
  resolvers already returned it. `check-live.sh` then resolves through Cloudflare DNS-over-HTTPS
  and connects to that address with `curl --resolve`/`openssl -connect`, and prints a note.
- **The apex already served a Worker.** `qrwty.io` was a Custom Domain of Worker
  `qrwty-platform` (an earlier landing page). The packet authorizes replacing a blocking apex
  record; non-interactive `wrangler deploy` moved the hostname to `qrwty-edge`. `qrwty-platform`
  is untouched, and [rollback.md](rollback.md) restores the hostname.

## Credentials

- Loaded with `set -a; . ~/.config/qrwty/cloudflare.env; set +a` inside the commands that needed
  them; nothing else under `~/.config/qrwty/` was read. The values were never echoed or passed as
  an argument: API calls read them from the environment, and wrangler's output went through
  `scripts/scrub.mjs`.
- A scan by value (the scanner read both values from the environment) of `deploy/cloudflare`,
  `docs/`, the unit's scratch folder, `/tmp` and `~/.config/.wrangler` found the token nowhere.
  The account ID was in wrangler's own debug logs of runs 1 and 2 (API URLs in
  `~/.config/.wrangler/logs/`, outside the repository); those two files were scrubbed in place
  (18 occurrences replaced). `deploy.sh` now points `WRANGLER_LOG_PATH` at a temp file and keeps
  only a scrubbed copy; runs 3–6 wrote no log there and the rescan was clean.
- The committed files match none of the ledger's R15 credential patterns, and they contain no
  32-hex-character string (the account ID's shape) and no token-shaped string.

## Versions

`wrangler` 4.156.0 (published 2026-10-29T18:33:57Z, 16 days before the unit; the latest was
4.162.0). Exact pins in `deploy/cloudflare/package.json`: `@biomejs/biome` 2.6.4, `typescript`
7.0.2, `vitest` 5.0.0, `wrangler` 4.156.0; `pnpm-workspace.yaml` requires every resolved package
to be at least 14 days old. Node 24.21.0, pnpm 12.16.1. Worker `compatibility_date` 2026-10-23.

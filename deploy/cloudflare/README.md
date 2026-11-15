# qrwty.io edge Worker (Cloudflare)

A Cloudflare Worker named `qrwty-edge` serves `https://qrwty.io/` on the **Free plan**. Since A5,
`/` is the QRWTY app ([web/](../../web/README.md)), served as static assets. Since S02 it also
serves the static `/versions/` pages: what happened in run `qrwty-r1-20261114`, with both arms'
records. Since A2 it is the edge of arm A's live stack: `/api/*`, `/auth/*` and `/healthz` go to
A's Session API on Cloud Run (`SESSION_API_ORIGIN` in `wrangler.toml`;
[infra/README.md](../../infra/README.md#live-stack-a2)), and since A4 GET and HEAD of each short
link `/<slug>` go to A's Redirect service (`REDIRECT_SERVICE_ORIGIN`).

| Request | Answer |
| --- | --- |
| `GET /`, `/app`, `/app/…` | `200`, the app's one page (`web/index.html`, staged as `/app/index.html`); the app routes these paths in the browser (`/app/links`, `/app/links/<id>`, `/app/links/<id>/clicks`, `/app/plans`). `no-cache`, and the app's CSP below. Without the assets binding (unit tests, a bare `wrangler dev`), `/` is the old placeholder page |
| `GET /assets/…` | The app's files from `web/assets/`: scripts and stylesheets `no-cache` (revalidated by ETag, since their names don't change), fonts and the icon cached for an hour. A missing file gets the HTML 404 |
| `GET /healthz` | Arm A's Session API's readiness: `200` `{"service":"session-api","application":"ready","probe":"GET /modules/session-api-sign-in-flow","probeStatus":501}`, else `503` (`unavailable` for a 5xx, `unreachable` when nothing answered) with `Retry-After: 1`. Session API's own `/healthz` can't be read through `run.app`: Cloud Run's front end keeps the path, and `/health%7A`, a query, `/healthz/` and `//healthz` are kept too or miss the route (AG-15, A2). The process admits a stub request only once it is ready, so the Worker asks the sign-in stub's mount and counts any answer below 500, or 501, as ready. Without `SESSION_API_ORIGIN` (the unit tests) the Worker answers itself: `200` `{"ok":true,"commit":"<sha>","builtAt":"<iso>"}` |
| Any method on `/api`, `/api/…`, `/auth`, `/auth/…` | Proxied to Session API, to `/modules/session-api-api-forwarding<path>` and `/modules/session-api-sign-in-flow<path>`, so each stub sees the public path (`/api/v1/links`, `/auth/login`) with the query. Method, body and cookies pass through; `X-Forwarded-For` is the browser's address (`CF-Connecting-IP`), `X-Forwarded-Host` `qrwty.io`, `X-Forwarded-Proto` `https`; `cf-*` and hop-by-hop headers are dropped. Redirects and every `Set-Cookie` come back as they are. The answer gets the security headers below and `no-transform`. Unreachable: `503` JSON with `Retry-After: 1`. Until A3 the stubs answer `501` `NOT_IMPLEMENTED` |
| `GET` or `HEAD /<slug>` (exactly 10 base62 characters, one segment) | Proxied to the Redirect service's `/modules/redirect-service-resolve-and-redirect/<slug>`, without the query, cookies, `Authorization` or the browser's address (`User-Agent` and `Referer` pass; the service keeps only a device class and the referrer's host). `X-Forwarded-Host` is `qrwty.io`. Its `302` (after the click's ACK, with `QRWTY-Click-Event`) and its `404`, `410`, `403` and `503` pages come back with the security headers and `no-transform`. Another method gets the Worker's `405`. No reserved path (`/`, `/versions/`, `/api/`, `/auth/`, `/healthz`, `/build.json`, `/app/`, `/assets/`) has that shape. Unreachable: `503` with `Retry-After: 1` and no `Location` |
| `GET /build.json` | `200` `{"commit":"<sha>","builtAt":"<iso>"}`, the build object `deploy.sh` wrote (and polls) |
| `GET /versions/…` | A file from `public/versions/` (Workers static assets, through the `ASSETS` binding): the timeline (`/versions/`), the design prototype (`design/`), arm A's page and deploy record (`a/`, `a/deploy/`), arm B's record (`b/`) and a static copy of the earlier landing page (`original/`). HTML `no-cache`, other files cached for an hour. `/versions` and a folder without its trailing slash answer `301` to the slash; a missing file gets the HTML 404 |
| Any other path | `404`, a small HTML page |
| `HEAD` | Same as `GET`, without a body. Other methods get `405`, except on the proxied paths |
| `www.qrwty.io/<path>` | `301` to `https://qrwty.io/<path>` (query kept) |
| `b.qrwty.io/<anything>` | `301` to `https://qrwty.io/versions/b/` (arm B's old staging host), any method |

Every response carries `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline';
img-src 'self'; base-uri 'none'; frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: no-referrer` and `X-Robots-Tag: noindex`. The app's pages (`/`, `/app/…`) add
`script-src 'self'`, `style-src 'self'`, `font-src 'self'` and `connect-src 'self'`: their own
scripts, stylesheets, the self-hosted Nunito and the API calls, no inline script and no other
origin. Two copies under `/versions/` need more from their own origin, and nothing from any other: `/versions/design/` adds `script-src 'self'`,
`style-src 'self'` and `data:`/`blob:` images (the prototype's scripts, stylesheets and QR export),
and `/versions/original/` adds `style-src 'self'` and `form-action 'none'` (its stylesheet; its
forms stay inert). There is **no HSTS** yet: Q13
decides it, because preload is hard to undo. Every `Cache-Control` includes `no-transform`; without
it Cloudflare's automatic Web Analytics injects an external beacon script into HTML that
browsers receive.

`qrwty.io`, `www.qrwty.io` and `b.qrwty.io` are Workers **Custom Domains** (`wrangler.toml`).
Cloudflare manages their DNS records (read-only proxied `AAAA 100::`) and certificates. `workers.dev`
and preview URLs are off. Static assets run behind the Worker (`run_worker_first = true`), so the
redirects, the method check and the headers apply to them too.

The static assets are staged into `.build/site` (gitignored) by `scripts/stage-assets.mjs`, which
`deploy.sh` and `pnpm check` run: `public/` as it is, `web/index.html` as `/app/index.html` and
`web/assets/` as `/assets/`. It refuses an inline script or event handler, an external reference,
an `@import` or `url()` outside `/assets/`, a missing `/assets/` file and a script that doesn't
parse.

`public/` holds byte copies, listed with their sources and hashes in
[S02's published files](../../docs/evidence/s02/published-files.json): `versions/design/` from
`docs/design/prototype/`, `versions/a/deploy/` from `docs/evidence/q13/demo/`, `versions/b/` from
arm B's `docs/evidence/b-final/demo/` (qrwty-baseline `f2fb3ce`), and `versions/original/` from the
`qrwty-platform` Worker with the edits that page states. Refresh a copy from its source, never by
hand.

## Deploy

From the repository root, with Node.js 22 or newer (24.21.0 is pinned; `deploy.sh` falls back to
nvm's copy) and pnpm 12.16.1:

```sh
deploy/cloudflare/deploy.sh                 # refuses a dirty tree
deploy/cloudflare/deploy.sh --allow-dirty   # deploys it as "<sha>-dirty"
deploy/cloudflare/check-live.sh <sha>       # optional: page, headers, www, TLS
```

`deploy.sh` writes `.build/build.json` from `git rev-parse HEAD` and the UTC time, installs from
the lockfile, stages the assets, runs `wrangler deploy` with the build as plain-text variables (`BUILD_COMMIT`,
`BUILT_AT`) and polls `https://qrwty.io/build.json` until it reports that build. Rerunning it is
safe: each run uploads a new Worker version and keeps the same Custom Domains and DNS. A dirty
tree means tracked changes anywhere in the repository or untracked files under this folder or
`web/`.

Credentials come from `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the environment, or
else from `~/.config/qrwty/cloudflare.env`. They never go on a command line: wrangler reads them
from the environment, `scripts/scrub.mjs` replaces them in wrangler's output, and wrangler's debug
log is written to a temp file and kept only as a scrubbed copy in `.wrangler/logs/last-deploy.log`
(gitignored). Wrangler metrics are off (`WRANGLER_SEND_METRICS=false`). The token needs Workers
Scripts edit, Workers custom domains and DNS edit for the zone; the token in use had them on
2026-11-14.

Without a terminal, `wrangler deploy` takes over a hostname from another Worker or an existing
DNS record without asking. Only the three hostnames in `wrangler.toml` are affected.

## Develop

```sh
cd deploy/cloudflare
pnpm install --frozen-lockfile
pnpm check        # Biome, TypeScript, vitest (the router's unit tests), then the asset staging
pnpm exec wrangler dev   # local preview (after pnpm build); build values read "unknown"
```

`src/router.ts` is pure (Request in, Response out); `src/index.ts` is the Worker entry. Pins are
exact and every resolved package is at least 14 days old (`pnpm-workspace.yaml`). This folder is
its own pnpm workspace with its own `pnpm-lock.yaml`.

## Roll back

`pnpm exec wrangler rollback [version-id]` (with the credentials in the environment) returns the
Worker to an earlier version and keeps the hostnames. Restoring what `qrwty.io` served before S01
is in [the S01 rollback steps](../../docs/evidence/s01/rollback.md).

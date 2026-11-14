# qrwty.io edge Worker (Cloudflare)

A Cloudflare Worker named `qrwty-edge` serves `https://qrwty.io/` on the **Free plan**. It is the
production front door: later units put the application behind it and redeploy it as the build
grows. For now it serves a placeholder.

| Request | Answer |
| --- | --- |
| `GET /` | `200`, the `QRWTY` placeholder page with the deployed short commit and UTC build time. Inline CSS only, light and dark from `prefers-color-scheme`, no external requests |
| `GET /healthz` | `200` `{"ok":true,"commit":"<sha>","builtAt":"<iso>"}` |
| `GET /build.json` | `200` `{"commit":"<sha>","builtAt":"<iso>"}`, the build object `deploy.sh` wrote |
| Any other path | `404`, a small HTML page |
| `HEAD` | Same as `GET`, without a body. Other methods get `405` |
| `www.qrwty.io/<path>` | `301` to `https://qrwty.io/<path>` (query kept) |

Every response carries `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline';
img-src 'self'; base-uri 'none'; frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: no-referrer` and `X-Robots-Tag: noindex`. There is **no HSTS** yet: Q13
decides it, because preload is hard to undo. Every `Cache-Control` includes `no-transform`; without
it Cloudflare's automatic Web Analytics injects an external beacon script into HTML that
browsers receive.

`qrwty.io` and `www.qrwty.io` are Workers **Custom Domains** (`wrangler.toml`). Cloudflare manages
their DNS records (read-only proxied `AAAA 100::`) and certificates. `workers.dev` and preview URLs
are off.

## Deploy

From the repository root, with Node.js 22 or newer (24.21.0 is pinned; `deploy.sh` falls back to
nvm's copy) and pnpm 12.16.1:

```sh
deploy/cloudflare/deploy.sh                 # refuses a dirty tree
deploy/cloudflare/deploy.sh --allow-dirty   # deploys it as "<sha>-dirty"
deploy/cloudflare/check-live.sh <sha>       # optional: page, headers, www, TLS
```

`deploy.sh` writes `.build/build.json` from `git rev-parse HEAD` and the UTC time, installs from
the lockfile, runs `wrangler deploy` with the build as plain-text variables (`BUILD_COMMIT`,
`BUILT_AT`) and polls `https://qrwty.io/healthz` until it reports that build. Rerunning it is
safe: each run uploads a new Worker version and keeps the same Custom Domains and DNS. A dirty
tree means tracked changes anywhere in the repository or untracked files under this folder.

Credentials come from `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the environment, or
else from `~/.config/qrwty/cloudflare.env`. They never go on a command line: wrangler reads them
from the environment, `scripts/scrub.mjs` replaces them in wrangler's output, and wrangler's debug
log is written to a temp file and kept only as a scrubbed copy in `.wrangler/logs/last-deploy.log`
(gitignored). Wrangler metrics are off (`WRANGLER_SEND_METRICS=false`). The token needs Workers
Scripts edit, Workers custom domains and DNS edit for the zone; the token in use had them on
2026-11-14.

Without a terminal, `wrangler deploy` takes over a hostname from another Worker or an existing
DNS record without asking. Only the two hostnames in `wrangler.toml` are affected.

## Develop

```sh
cd deploy/cloudflare
pnpm install --frozen-lockfile
pnpm check        # Biome, TypeScript, vitest (the router's unit tests)
pnpm exec wrangler dev   # local preview; build values read "unknown"
```

`src/router.ts` is pure (Request in, Response out); `src/index.ts` is the Worker entry. Pins are
exact and every resolved package is at least 14 days old (`pnpm-workspace.yaml`). This folder is
its own pnpm workspace with its own `pnpm-lock.yaml`.

## Roll back

`pnpm exec wrangler rollback [version-id]` (with the credentials in the environment) returns the
Worker to an earlier version and keeps the hostnames. Restoring what `qrwty.io` served before S01
is in [the S01 rollback steps](../../docs/evidence/s01/rollback.md).

# QRWTY app (web/)

The browser UI on `https://qrwty.io/` (A5): Q11's "Steel and Ice" direction from
[docs/design/](../docs/design/README.md), wired to arm A's live API. Plain HTML, CSS and one script;
no framework, no build step and no request to another origin.

| Path | What it is |
| --- | --- |
| `index.html` | The one page. The `qrwty-edge` Worker serves it at `/` and every `/app/…` path |
| `assets/app.js` | The app: views, API calls and exports. Markup, icons and copy follow the prototype's `app.js`; control names are the frozen ones in [accessible-names.json](../docs/design/accessible-names.json) |
| `assets/tokens.css`, `assets/app.css`, `assets/qr.js` | Q11's token sheet, components and QR encoder, copied unchanged from `docs/design/prototype/` |
| `assets/site.css` | The app's few additions (footer, layout helpers) |
| `assets/fonts.css`, `assets/fonts/` | Nunito, self-hosted: `@fontsource-variable/nunito` 5.3.0's latin and latin-ext variable files, unchanged, with their SIL Open Font License (`OFL.txt`) |
| `assets/icon.svg` | The tab icon (the brand mark) |

## Screens

| Path | Screen |
| --- | --- |
| `/` | Create and the result: Copy and Open, the QR code with Download PNG and SVG, and Save to my links |
| `/app/links` | My links, newest first, 20 at a time ("Show more links" follows the cursor) |
| `/app/links/<id>` | Link details: change the destination (`If-Match`; a stale edit says "This link changed somewhere else"), disable and turn back on, delete, the QR code, the last 7 days' clicks |
| `/app/links/<id>/clicks` | Click analytics: totals with their definitions, the daily chart and table, the CSV export |
| `/app/plans` | Plans and billing (Free is every account's plan until A7) and Delete my account |

## How it talks to the API

- `GET /api/v1/session` first: it issues a guest session when there is none, and its `csrfToken`
  goes in `X-CSRF-Token` on every mutation. A refused token is fetched again once.
- Create and claim send an `Idempotency-Key`: one per destination for create, one per result for
  the claim, so a retry replays rather than duplicates. Reads and keyed writes are retried on 503
  (a Cloud Run service at minimum 0 instances may time out Session API's 1,000 ms while it starts).
- **Save to my links** keeps the result, with its claim proof, in `sessionStorage`, goes straight
  to `/auth/login?returnTo=/`, and claims the link when the page comes back signed in. That's
  why it works from the same tab for 24 hours.
- **Sign out** is `POST /auth/logout`, then `GET /auth/logout`, which also ends the identity
  provider's session and returns to `/`.
- A 401 on an account call means the session ended: the app fetches a guest session and shows
  "Session expired" with "Sign in again".
- A change of destination or state reaches the short link within 30 seconds: the Redirect
  service keeps each route it read for up to 30 s (A4), and the messages say so.

## Build and deploy

`deploy/cloudflare/scripts/stage-assets.mjs` copies this folder into the Worker's assets
(`/app/index.html` and `/assets/`) and checks it: no inline script or event handler, no external
reference, every script parses. `deploy/cloudflare/deploy.sh` (and `infra/gcp/scripts/redeploy.sh`)
runs it before `wrangler deploy`; `pnpm check` in `deploy/cloudflare` runs it too.

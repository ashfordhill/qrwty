# A-found gaps from A3 (Jeeves 0aea8e7)

A3 wrote sign-in, cookie sessions, ownership and account deletion in the application-owned stub
bodies and product SQL of Session API, Link API and Account API ([handoff](../../handoff.md)). No
generated file was edited: `infra/local/verify-generated.py app` reports 71 generated files
unchanged. Each gap has a workaround in application files. As the owner decided on 2026-11-15
evening, these gaps are recorded, not fixed.

| ID | Severity | Gap | Where | Workaround in A |
| --- | --- | --- | --- | --- |
| AG-22 | Medium | No browser-session (backend-for-frontend) template: the diagram's Sign-in flow and API forwarding are bare Customs, so the whole code + PKCE flow, cookie sessions, CSRF, sealed token storage, refresh rotation, revocation and bearer forwarding are application code | `src/modules/session-api/*` (two route stubs, an Identity `HttpTarget` and a database) | `src/modules/session-api/session/` (1,173 lines, Biome-formatted) and its product SQL (186 lines) |
| AG-23 | Low | `defineRoutes` answers its own 404, 405 and 400 as `{error: "CODE", message}`, with no way to give them the application's error shape | `src/modules/entry.ts` | Each table's caller maps them (`productShape` in Link operations, My links and Session API) |
| AG-24 | Low | A view in `published` is readable by every login on the database; a module can't publish a view to one chosen login | `scripts/products.mjs` (`grantProductSql`) | Account API's owner view `published.owned_links` exposes an owner key (SHA-256 of the subject), never the subject; the Redirect service's login can still read it |
| AG-25 | Low | Settings belong to one stub: two stubs of a tile that need the same values declare them twice and get two frozen copies | `src/runtime/settings.ts`, the process file's `declared` | Both Session API stubs declare `sessionSettings` (`session/settings.ts`); each copy builds its own context |

## AG-22: no browser-session template

The product contract asks for a same-origin backend-for-frontend: authorization code with PKCE
S256, `state` and `nonce`; `Secure`, `HttpOnly`, same-site cookies; CSRF on every cookie-bearing
mutation; a bounded session store with expiry and revocation; tokens kept out of the browser and
encrypted at rest; a valid bearer forwarded to the downstream guards; and a supplied but bad
credential never treated as a guest. The verified-identity template gives Link, Account and Billing
API their bearer guards, and the generated `createPrincipalVerifier` verifies ID and access tokens.
But the browser side, which every web application with sign-in needs, is entirely a stub:

- `oidc.ts`: the authorize URL, token exchange, refresh, revocation, ID-token nonce check;
- `cookies.ts`, `crypto.ts`: cookie formats, MACs, AES-GCM sealing with a `keyRing()`;
- `sessions.ts`, `store.ts` and the Sessions SQL: login attempts, sessions, idle and absolute
  limits, optimistic refresh across replicas, revocation;
- `signin.ts`, `forward.ts`: the `/auth/*` and `/api/*` routes and the downstream relay.

Fix idea: a `browser-session` template on a public tile with an Identity and a database link. It
would own the login attempt and session tables, the cookie and CSRF rules, refresh and revocation,
and forward the bearer to the tiles it calls. The application would keep only its route list and
its error shape.

## AG-23: `defineRoutes`'s own answers have a fixed shape

The table answers an unknown path 404 `NOT_FOUND`, a known path with another method 405
`METHOD_NOT_ALLOWED` with `Allow`, and an undecodable segment 400 `INVALID_REQUEST`, each as
`{error: "<CODE>", message}`. QRWTY's contract is `{error: {code, message, retryable}}`. Every
caller wraps the table and maps those three bodies. Fix idea: an optional `answer(status, code,
message)` in `defineRoutes`'s options.

## AG-24: a published view is granted to every login

`grantProductSql` grants `SELECT` on everything in `published` to every runtime login on the
database. Account API's My links reads the caller's own links through a view that must say whose
each link is. The Redirect service's login, which needs only routing fields, can read it too. A3
exposes the owner as a key (the hash of the subject) and never the subject, and the view leaves out
claims and idempotency records. Fix idea: let a module's SQL name the logins a view is for (a
diagram link from the reading tile already exists: `account-api-links`).

## AG-25: settings are per stub

Both Session API stubs need the issuer, the client credentials, the audience, the public origin and
the session key ring. Each stub's `settings` export declares them, the process reads each
declaration, and each stub gets its own frozen values, so A3 builds two issuer clients and two key
sets, one per stub. Fix idea: tile-level settings that the process reads once and gives to each of
its stubs that names them.

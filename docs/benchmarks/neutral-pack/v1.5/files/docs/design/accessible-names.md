# Frozen accessible names (Q11)

Version `q11-2026-11-14.1`. The machine copy is [`accessible-names.json`](accessible-names.json),
which matches the oracle's `ui-names.schema.json` (neutral pack v1.4). The pack amendment that
carries Q11's assets copies that file. Both arms' UIs must expose exactly these roles and names.

## Rules

- **Exact match.** The oracle finds controls with `getByRole(role, { name, exact: true })`. Names
  are plain ASCII with no apostrophes or curly quotes, and they are the same in light and dark at
  every width.
- **Name equals visible text.** Each name is the control's visible label (WCAG 2.5.3). Icons
  inside controls are `aria-hidden`.
- **Status messages.** Alerts and statuses take their name from their visible title through
  `aria-labelledby`. The longer explanation is the body text.
- **Fixed during work.** A busy control keeps its name. Shorten stays "Shorten" with
  `aria-busy="true"` and `aria-disabled="true"`.
- **The short link.** `result.shortUrl` is a read-only textbox whose text content is the whole
  short URL, `https://qrwty.io/<10 base62>`.
- **The newest link.** `library.firstItem` is the first "Manage" link in the newest-first list.
  Each one has `aria-describedby` pointing at its row's destination host.
- **One target per name.** A name appears once per screen, except "Manage" and "Copy link" on
  library rows, and "Download PNG" / "Download SVG", which appear on the result and on link
  details (never on the same screen).
- **Sign-in goes straight to the provider.** `result.save` and `nav.signIn` open the identity
  provider's page directly, with no QRWTY interstitial.

## Keys the oracle drives (`src/browser/names.ts`)

| Key | Role | Name | Where |
| --- | --- | --- | --- |
| `create.destination` | textbox | Long link | Create and result screens (the dock stays) |
| `create.submit` | button | Shorten | Create and result screens |
| `result.shortUrl` | textbox | Short link | Result |
| `result.copy` | button | Copy short link | Result |
| `result.open` | link | Open short link | Result |
| `result.downloadPng` | button | Download PNG | Result, link details |
| `result.downloadSvg` | button | Download SVG | Result, link details |
| `result.qr` | img | QR code for the short link | Result, link details |
| `result.save` | button | Save to my links | Result, before saving |
| `nav.signIn` | button | Sign in | Top bar, signed out |
| `nav.library` | link | My links | Main navigation (top bar; bottom bar below 720 px) |
| `nav.pricing` | link | Plans and billing | Main navigation |
| `library.firstItem` | link | Manage | My links, first row |
| `link.edit` | button | Change destination | Link details |
| `edit.destination` | textbox | New destination | Change destination form |
| `edit.save` | button | Save destination | Change destination form |
| `link.disable` | button | Disable link | Link details |
| `link.confirmDisable` | button | Yes, disable link | Disable dialog |
| `link.analytics` | link | Click analytics | Link details |
| `analytics.export` | button | Export CSV | Click analytics |
| `analytics.delayed` | status | Counts are running late | Click analytics, delayed pipeline |
| `billing.upgrade` | button | Upgrade to Paid | Plans and billing, Free and signed in |
| `billing.portal` | button | Manage payment | Plans and billing, Paid |
| `billing.confirming` | status | Confirming your subscription | Plans and billing, after checkout returns |
| `billing.grace` | alert | Payment failed | Plans and billing, failed payment in grace |
| `status.offline` | alert | You are offline | Create, submitted while offline |
| `status.error` | alert | Link not created | Create, 503 or other failure (also when the safety check is unavailable) |
| `status.rateLimited` | alert | Too many new links | Create, 429 |
| `status.sessionExpired` | alert | Session expired | Account pages after a 401 |

## Further states for the arms' own UI tests

| Key | Role | Name | Where |
| --- | --- | --- | --- |
| `create.reputationRejected` | alert | This destination was refused | Create, destination refused by the safety check |
| `result.saved` | status | Saved to My links | Result after sign-in and claim |
| `result.claimExpired` | status | This link can no longer be saved | Result, claim proof expired |
| `result.alreadyClaimed` | status | This link is already in an account | Result, claimed elsewhere |
| `signin.failed` | alert | Sign-in did not finish | Result, callback failure |
| `signin.cancelled` | status | Sign-in cancelled | Result, sign-in cancelled |
| `library.loadFailed` | alert | Could not load your links | My links, network failure |
| `library.stale` | status | This list may be out of date | My links, stale data |
| `library.more` | button | Show more links | My links, next cursor page |
| `library.unauthorized` | alert | You cannot open this link | Link details of another account's link |
| `link.saved` | status | Destination saved | Link details after an edit |
| `link.conflict` | alert | This link changed somewhere else | Link details, 412 version conflict |
| `link.disabled` | status | Link disabled | Link details, disabled link |
| `link.enable` | button | Turn link back on | Disabled link (also the undo) |
| `link.blocked` | alert | Blocked for safety | Link details, blocked by the operator |
| `link.delete` | button | Delete link | Link details |
| `link.confirmDelete` | button | Yes, delete link | Delete dialog |
| `link.disableDialog` | dialog | Disable this link? | Disable confirmation |
| `link.deleteDialog` | dialog | Delete this link for good? | Delete confirmation |
| `analytics.incident` | alert | Some recorded clicks are missing from these totals | Click analytics, reconciliation incident |
| `analytics.lookback` | status | Free shows the last 7 days | Click analytics, range beyond the tier |
| `analytics.exportFailed` | alert | Export did not finish | Click analytics, export failure |
| `billing.testMode` | status | Test mode | Plans and billing, always |
| `billing.limitReached` | alert | Monthly link limit reached | Plans and billing, allowance used |
| `billing.checkoutPending` | status | Waiting for the payment page | Plans and billing, checkout open |
| `billing.checkoutCancelled` | status | Checkout cancelled | Plans and billing, returned without paying |
| `billing.active` | status | Paid is on | Plans and billing, confirmed |
| `billing.portalUnavailable` | alert | Payment portal unavailable | Plans and billing, portal 503 |
| `billing.cancelScheduled` | status | Cancellation scheduled | Plans and billing, cancel at period end |
| `billing.downgraded` | status | You are on Free again | Plans and billing, after Paid ended |
| `billing.deletionScheduled` | alert | Account deletion scheduled | Plans and billing, deletion pending |
| `public.notFound` | heading | This short link does not exist | Public page, 404 |
| `public.deleted` | heading | This link was deleted | Public page, 410 deleted |
| `public.disabled` | heading | This link is turned off | Public page, 410 disabled |
| `public.blocked` | heading | This link was blocked for safety | Public page, 403 |
| `public.outage` | heading | Links cannot open right now | Public page, 503 |

## How this list was checked

`docs/evidence/q11/scripts/checks.mjs` validated the JSON against the schema's roles and shape and
confirmed that it covers all 29 oracle keys. It then found each of the 65 names as a visible
element in its state of the prototype, in light and dark at 1440 x 900 and 360 x 800. That is 264
lookups, with 0 missing. The mouse walkthrough drives the core flow by these names alone.

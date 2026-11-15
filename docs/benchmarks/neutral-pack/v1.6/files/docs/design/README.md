# QRWTY visual direction (Q11)

**Status:** one direction, selected on 2026-11-14 under the owner's scope change for Q11 ("pick
the most reasonable one that fits their personal style"). Q12 and B08 build it as the only skin.
Selecting it is not evidence of usability: Q12 records the create, copy, download, save and edit
tasks with real people.

## Steel and Ice: why this direction

The owner has two interfaces they accepted, and they share one visual language. QRWTY takes it
over directly.

- **automation-pitch.** Its `src/app/styles/tokens.css` sets:
  - an icy `--paper` stage (`#e8f4fa`) under a steel `--chrome` bar (`#0c3349`) with a cyan
    `--chrome-line` (`#5ec8e8`);
  - dark `--ink` (`#071c28`) and 2.5–3 px ink outlines on controls;
  - hard offset shadows (`0 6px 0`, `0 3px 0`) instead of blur;
  - Nunito at weights 600–800;
  - one yellow (`--yellow` `#e8c14a`, with `--on-yellow` ink) for the control that matters.
- **The signed-off Jeeves refresh.** In `docs/plans/ui-refresh/preview.md`, §2 and the
  `icons-light`/`icons-dark` images draw every icon with one dark ink outline, one accent fill
  and one light fill. §5 and `top-bar-*.png` keep "Generate project" as the single yellow button.
  `settings-*.png` show status as soft pills with a dot (mint "Key saved", rose "No key"). §8 and
  `dark-ramp.png` give dark mode one solid surface ramp (`#071219` bars, `#0f1d26` canvas,
  `#172a35` rails) and the rule of no see-through mixes.

QRWTY uses those choices directly:

- the steel bar and ice page, with the same ramp in dark;
- yellow for one action per view;
- icons drawn in the same three-layer way;
- status families made of solid shades.

It meets the brief's constraints by having no glass at all. The brief allows "or none", and the
owner's dark-mode rule rules out translucent fills, so text always has a solid backplate. Its
detail goes into the link and the code instead:
- a monospace short link with the slug emphasised;
- the destination host always visible;
- a white QR sticker that keeps the same colours in both themes.

## What is here

| Path | What it is |
| --- | --- |
| `prototype/index.html` | The clickable prototype. Open it directly (it works from `file://`) or serve the folder. No build step, no network requests |
| `prototype/tokens.css` | **The token sheet**: every colour, type, shape, space and motion value as CSS custom properties, the same names in light and dark |
| `prototype/app.css`, `prototype/app.js` | Components and screens, built only from the tokens |
| `prototype/qr.js` | The prototype's QR encoder (byte mode, level M, all 40 versions, mask scoring). It is checked against the oracle's jsQR |
| `accessible-names.md`, `accessible-names.json` | The frozen role and name of every control the UI tests drive. The JSON matches the oracle's `ui-names.schema.json` |
| `qr-export/qrwty-7Hq2xP9kLm.png`, `.svg` | The QR export sample, saved through the prototype's own Download buttons |
| `../evidence/q11/` | Screenshots, the mouse walkthrough, the contrast table and the check scripts ([checks](../evidence/q11/checks.md)) |

The prototype bar at the top (marked "Prototype", with a dashed edge) is not product UI. It holds:
- **Screen** and **State**, which reach every state below;
- **Theme**: System, Light or Dark;
- **Reset prototype**.

Three URL options support the checks:
- `?shot=1` hides the bar;
- `?state=links.empty` opens a state;
- `?theme=dark` forces a theme.

## Screens and states

Every state the design brief lists is a real render, reachable by mouse:

| Flow | States |
| --- | --- |
| Create (`#create`) | blank, pasted URL (host preview, IDN shown with its punycode), invalid URL, submitting, double click, offline, rate limited, reputation rejected, provider unavailable, unknown failure |
| Result (`#result`) | ready with save invitation, copy succeeded, copy failed (the link is selected instead), open, QR downloaded, claim expired, already claimed, saved after sign-in |
| Sign-in (`#signin`) | start (the identity provider stand-in), callback success, failure, cancelled, session expired, restored return location |
| Library (`#links`) | populated (12 real-length links), empty, loading, pagination, stale data, network failure, unauthorized object, signed out |
| Edit and disable (`#link`) | details, editing, validation, version conflict, saved, confirm disable, disabled with undo, blocked by operator, delete consequence |
| Analytics (`#clicks`) | available data, no clicks, delayed pipeline, reconciliation incident, tier lookback, date bounds, failed export, exported, Paid with 90 days and breakdowns |
| Plans and billing (`#plans`) | free tier, limits reached, checkout pending, checkout cancelled, confirming payment, active paid, failed payment with grace, portal unavailable, cancellation scheduled, downgraded, deletion pending, signed out |
| Public error page (`#error`) | unknown link (404), expired or deleted (410), disabled (410), blocked (403), temporary outage (503) |

Content is example data on reserved `.example` hosts. The limits and the test price come from the
frozen tier fixtures (neutral pack `frozen/decisions.md` §4):
- Free: 5 new links, 7 days of click history, no breakdowns, 1 CSV export a month.
- Paid: 50 new links, 90 days, breakdowns, 20 exports a month, at USD 5.00 a month, labelled as
  a test price.

## Decisions the build should keep

1. **The create dock stays on the result screen.** The field empties ("Paste another long link")
   and Shorten drops to an outlined button, so Copy short link becomes the view's one yellow
   button. Each view has exactly one yellow control.
2. **The short link is the whole URL as text.** It is a read-only `textbox` named "Short link". It
   contains `https://qrwty.io/<slug>`, with the scheme small, `qrwty.io/` softer and the slug
   heavy, and `user-select: all` selects it in one tap. Its text is exactly what Copy puts on the
   clipboard. Copy feedback appears in a reserved line, so nothing shifts.
3. **The destination host is always visible.** Long destinations are cut in the middle, keeping
   the start of the path and the end of the query. An internationalised host also shows its
   punycode form.
4. **The QR is a white sticker in both themes.** It has `--qr-ink` `#071c28` modules on opaque
   `#ffffff`, a 4-module quiet zone and error correction M.
   - PNG: whole-pixel modules, 1184 px for a 29-module code (sharp to 10 cm at 300 dpi).
   - SVG: one `crispEdges` path on an opaque rectangle.
5. **Save to my links and Sign in go straight to the identity provider**, with no QRWTY page in
   between. The save band already says what an account adds (change the destination, see clicks,
   find links later), and the oracle's U02 expects the provider page next. The hosted pages in
   the prototype are labelled stand-ins with no third-party branding.
6. **Busy, not renamed.** While a create is pending, Shorten keeps its name, with `aria-busy` and
   `aria-disabled` and a spinner. A second click is ignored, so one click makes one link.
7. **Each message is named by its visible title.** Errors and notices are `alert` or `status`
   regions labelled by their title (`aria-labelledby`). Status chips carry a shape and a word as
   well as colour.
8. **Analytics leads with definitions.** It shows filtered clicks, recorded visits and their
   difference, each with its definition, plus the time of the counts. The daily chart has a table
   view and outlined marks. Breakdowns are Paid only, with a plain explanation on Free.
9. **Billing always says it is in test mode.** The page shows the exact limits and the price
   before checkout. It says what cancelling, a failed payment and deleting a link change, and
   that links never expire on any plan.
10. **Mobile uses a bottom tab bar.** It is the same `nav` element, moved to the bottom below
    720 px and clear of the safe area. Controls are 36–56 px tall.

## Accessibility treatment

- **Solid surfaces.** There is no backdrop blur and no translucent surface behind text. The only
  translucent layer is the dialog scrim, which becomes solid `--paper-deep` under
  `prefers-reduced-transparency`. With no glass, there is no glass rendering cost to measure on
  the mobile profile.
- **Reduced motion.** Under `prefers-reduced-motion` every duration token becomes 0 ms, the
  result tray appears without its 280 ms rise, and the two spinners (submitting, confirming
  payment) stop as a dotted ring. With motion on, nothing animates indefinitely except a spinner
  while something is actually pending.
- **Focus.** The focus ring is a 3 px outline offset by 2 px: deep blue in light, yellow in dark,
  and yellow on the steel bar in both themes.
- **Contrast and targets.** Token text pairs are at least 5.97:1, rendered text in every state at
  least 5.63:1, and every boundary pair at least 3:1 (see the
  [contrast table](../evidence/q11/contrast.md)). No target is smaller than 24 px.

## Limitations

- **Typeface.** The local prototype carries no font file and makes no network request, so it
  renders Nunito's fallback (Ubuntu Sans on this machine, Segoe UI on Windows). The published
  artifact adds one Google Fonts stylesheet so the owner sees Nunito. Q12 should self-host Nunito
  (SIL Open Font License).
- **Real-phone scans.** Scans of the screen and of printed PNG and SVG codes are the U06 human
  step and have not been done. Only decoder checks ran (see the evidence).
- **Downloads in the artifact.** The published artifact can't save files, so its Download and
  Export buttons show the generated file in a dialog. The local prototype downloads.
- **Untested sizes and settings.** 768 px, landscape, the 200% zoom size and 2560 px are checked
  for overflow, not screenshotted. The performance budgets (U07) belong to the built UI. For
  scale, the prototype's script is 23 KiB gzipped.

# Q11 checks, 2026-11-14

Every check below ran against `docs/design/prototype/`, as committed, with Chromium from the neutral
oracle's Playwright 1.63.0 install (nothing installed globally). Node is nvm's 24.21.0. The
scripts are in `scripts/`; run them from the repository root with
`node docs/evidence/q11/scripts/<name>.mjs`. Raw results are in `results/`.

| Check | Result |
| --- | --- |
| Screenshots | 67 PNGs, listed in `screenshots/index.json`:<br>• `screens/`: the 5 core screens in light and dark at 1440 x 900 and 360 x 800, each full page and above the fold, plus the token sheet in each theme.<br>• `states/`: 16 state sheets, all 69 states of the 8 flows in 360 px frames in both themes.<br>• `walkthrough/`: 9 step images (light, desktop) |
| Mouse-only walkthrough | **4 of 4 runs passed** (light/dark x desktop/mobile), with no keyboard event sent. Text went in with `fill`, and every control was clicked, found by its frozen name. Steps: create, copy (the clipboard held the short URL), download PNG and SVG (both decode to the short URL; SVG at 150, 300 and 600 px), Save to my links, the sign-in stand-in, Saved to My links, My links, Manage, change destination, disable with confirmation and undo, Click analytics, Export CSV (header `date,recorded_attempts,filtered_clicks`), Plans and billing, Upgrade to Paid, Pay (test fixture), Confirming your subscription, then Manage payment and Paid is on. `results/walkthrough.json` |
| Frozen accessible names | The JSON matches `ui-names.schema.json` (roles, shape, ASCII only) and covers all 29 oracle keys. All 65 names were found visible in their states: 264 lookups across 2 themes x 2 viewports, 0 missing |
| No horizontal scroll | 69 states at 360 x 800 (with and without reduced motion), 320 x 640, 768 x 1024, landscape 800 x 360, the 200%-zoom size 720 x 450, 1440 x 900 and 2560 x 1080: **0 px overflow everywhere**. The first run found 15 px at 720 px on signed-in pages, from the top bar's name and plan; those now hide below 1024 px |
| Reduced motion | With `prefers-reduced-motion: reduce` (and `prefers-reduced-transparency: reduce`): 0 infinite animations and 0 elements with a transition or animation, across all 69 states. Without the preference, only the two spinners (create submitting, confirming payment) animate indefinitely, and only while something is pending |
| Solid surfaces | No glass anywhere. Under reduced transparency the dialog scrim is opaque (`rgb(220, 236, 244)`, the light `--paper-deep`). Glass rendering cost: not applicable |
| Contrast (WCAG 2.2 AA) | 49 token pairs in each theme, 0 failures ([table](contrast.md)). Text pairs are at least 5.97:1 (light) and 6.12:1 (dark); boundary pairs at least 3.21:1 and 3.48:1; the QR is 17.42:1. A scan of all visible text in all 69 states in both themes took 6,004 measurements: lowest 5.63:1, 0 failures |
| Target size (2.5.8) | 0 controls under 24 x 24 px in any state at either viewport |
| Labels and focus | 0 unlabelled controls. Tabbing 40 stops on create, result, My links and plans, at both viewports, drew a 3 px outline at every stop |
| Network and console | 0 requests leaving the local server and 0 console errors in every run |
| QR encoder | 220 of 220 random and edge-case payloads, versions 1–19, decode with the oracle's jsQR 1.4.0 (`results/qr-encoder.json`) |
| QR export sample | `docs/design/qr-export/qrwty-7Hq2xP9kLm.png` and `.svg`, saved through the prototype's buttons. Details below |

## QR export sample (`results/qr-export.json`)

| Property | Value |
| --- | --- |
| Payload | `https://qrwty.io/7Hq2xP9kLm`: version 3, 29 x 29 modules, error correction M |
| PNG | 1184 x 1184 px, opaque, exactly two colours (`#ffffff`, `#071c28`), 32 px per module, a quiet zone of 128 px (4 modules), sharp to 10.0 cm at 300 dpi |
| SVG | 3,168 bytes, `viewBox` of 37 modules, an opaque white `rect`, one `crispEdges` path |
| Decoded (jsQR 1.4.0) | PNG at its own size and scaled to 600, 354 (3 cm at 300 dpi), 236 (2 cm), 150 and 120 px: all decode. SVG rasterised at 1200, 600, 300, 150 and 120 px: all decode |
| Not run | Real-phone scans of the screen and of printed PNG and SVG codes. These are U06 human steps for Q12, recorded with device, size and result |

## Not covered here

- **Performance budgets (U07).** These apply to the built UI. The prototype's script is 23 KiB
  gzipped.
- **The published artifact.** It is a view of these files: the same page, plus one Google Fonts
  stylesheet for Nunito. It was not run through these checks.

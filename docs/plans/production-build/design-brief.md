# QRWTY product design brief

The interface should feel deliberately designed for QRWTY: precise, light, tactile and fast.
Liquid Glass is the material language, not the product concept. The main object is a usable link
and its QR code. Futuristic means a calm interface that works across changing screen sizes and
input methods; it does not mean decorating the page with cars, headsets or science-fiction panels.

The owner should judge the design before the UI implementation hardens. Q11 supplies two coherent
directions with actual desktop/mobile flows, then records the chosen direction. Do not ask the
owner to judge an abstract mood board while hiding the create/result/dashboard screens.

## Product hierarchy

1. **Create:** one visible destination field and one primary action above the fold. A newcomer
   should understand it without a carousel or a tutorial. Signing in is secondary.
2. **Result:** the short URL is selectable and copyable; the destination host remains visible;
   QR preview, PNG and SVG downloads are adjacent. Show copy success without shifting the layout.
3. **Save:** explain exactly what an account unlocks. Preserve the created result and claim proof
   through login, cancellation, an expired proof and session expiry. No email wall before copying.
4. **Library:** a compact, readable list with title/destination, status, link, clicks/freshness and
   the most useful action. Editing and disabling need clear consequences and an undo path when safe.
5. **Analytics:** prioritize useful totals, date range and trend, then coarse referrer/device/region
   breakdowns. Show sample/coverage/freshness limits alongside the data. Avoid decorative charts.

## Visual direction constraints

- Use a designed typographic hierarchy, disciplined spacing and a small palette with one clear
  action accent. A quiet mineral/ink palette with a vivid citrus or blue accent is a starting
  exploration, not a preapproved token set.
- Glass belongs on a few elevated surfaces: the create dock, result tray, navigation or a sheet.
  Keep readable solid backplates under text and opaque QR export backgrounds. Borders, highlights
  and shadows should explain layering rather than surround every component.
- No default purple-blue gradient hero, enormous generic headline, fake company logos, invented
  testimonials, icon-card feature grid, pointless floating blobs or copied dashboard template.
- No loading shimmer as permanent decoration, parallax prerequisite, cursor-following effects,
  autoplay background video or heavy WebGL just to look futuristic.
- Use product-specific details: excellent URL typography and truncation, a crisp QR/download
  treatment, meaningful status colors and a polished transition from input to result.
- Design light and dark independently. Disabled, focus, danger and empty states must remain
  distinct. Glass behind text cannot depend on an unpredictable wallpaper being dark enough.
- Never make the QR modules translucent, low contrast or distorted. Test PNG/SVG exports at
  practical print sizes, preserve quiet zones, and scan with real phones as well as decoders.

## Every required screen includes states

| Flow | Required states |
| --- | --- |
| Create | Blank, pasted URL, invalid URL, submitting, double click, offline, rate limited, reputation rejected, provider unavailable |
| Result | Copy succeeded/failed, open, QR download, save invitation, claim expired, already claimed |
| Sign-in | Start, callback success/failure, cancelled, session expired, restored return location |
| Library | Empty, loading, populated, pagination, stale data, network failure, unauthorized object |
| Edit / disable | Validation, version conflict, save, confirmed disable, blocked-by-operator, delete consequence |
| Analytics | No clicks, available data, delayed pipeline, coverage gap, date bounds, failed export |
| Public error | Unknown, expired/deleted, disabled, blocked, temporary service outage |

Use real-length links and populated data in previews, not only ideal short labels. Never replace
an error with a blank screen or automatically retry a refused account operation as anonymous.

## Responsive and accessible behavior

Design at 360×800, 768×1024 and 1440×900, then verify at 320 px, landscape, 200% zoom and a wide
desktop. Treat foldables as a responsive layout problem first: usable panes, safe areas, no fixed
viewport-height traps or controls hidden under a hinge. Do not build imaginary VR navigation.

All actions work by mouse/touch, with keyboard and screen-reader access as well. Use semantic
labels, visible focus, meaningful error announcements, no drag-only operation, no hover-only
controls and no color-only status. Respect reduced motion; provide readable solid fallbacks when
backdrop blur is unavailable or transparency is reduced. Contrast, reflow, target sizes and focus
behavior are checked against [WCAG 2.2 AA](https://www.w3.org/TR/WCAG22/).

Proposed performance budgets: LCP ≤ 2.5 s, INP ≤ 200 ms and CLS ≤ 0.1 at the 75th percentile once
real field data exists. Before launch use a recorded mid-range mobile/slow-network lab profile
and publish the limitation; a desktop Lighthouse pass is not field evidence. Proposed initial
compressed route JS budget ≤ 200 KiB excluding separately loaded account/analytics routes.
Measure blur/compositing cost on a modest phone. A tiny redirect/error page must not download the
dashboard bundle. QR encoder loads on demand unless measurement proves a better tradeoff.

## Q11 review package

For each of two directions provide create, successful result, library and analytics screens,
light/dark, desktop/mobile, plus a small token sheet and a clickable local prototype. Explain
three specific choices; don't use a list of aesthetic adjectives as evidence. Keep Excalidraw
flow sketches separate from high-fidelity UI prototypes.

Evaluate each direction using: first-use task clarity, result usability, originality/coherence,
readability/accessibility, mobile adaptation and performance. Review the reference interfaces
the owner selects and current public TinyURL/Bitly/Dub/QR interfaces at that time; record dates
and concrete findings. Do not claim “superior to all competitors” without a defined comparison.
The owner's acceptance of a direction is the entry condition for Q12, not proof of usability.
Later test the create/copy/download/save/edit tasks with recorded completion/errors and owner
feedback. Preserve feedback images and the decision/resolution trail when supplied.

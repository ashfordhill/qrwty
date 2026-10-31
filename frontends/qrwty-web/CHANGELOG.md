# qrwty frontend changes

## 2026-10-30 — P14: session, shell and library foundation

A responsive dark-blue workspace now provides clear account entry, navigation to create/library sections, link management, clipboard feedback and a server-generated QR preview. Existing QR URLs, edit/download/activity contracts and the protected row hooks remain intact. Failed logout keeps the workspace signed in; session-check failures offer a retry. Late list and previous-session mutation responses cannot replace the current workspace.

The UI uses `@jeeves/product-ui@0.1.0` from the project-owned artifact. Generated files and template runtime artifacts are unchanged. The Worker workaround is removed; supplemental browser verification uses P12's exact expected-response policy and asserts zero Workers. Logout explicitly finishes the 204 response stream.

Validation: dependency installation, recursive type checks, 29 service tests, 11 Chromium workflow tests, production build, desktop/mobile axe checks and visual inspection passed. Jeeves's isolated adoption verifier passed four web template checks, the current strict browser journey, and all eight original protected behavior suites (QR-01–QR-09 plus standard session/resource checks). All 32 generated-owned file hashes are unchanged. Disposable databases were removed. Only the local frontend was rebuilt; API/database container identities remained unchanged, and a read-only live anonymous session check passed.

Next: immutable artwork and QR Studio contracts/rendering. Studio customization, global analytics and fully generated product recipes are not included in this slice. No cloud deployment, paid model run or live database migration was performed.

## 2026-10-31 — P17: saved QR Studio designs

QR Studio now provides finite presets, editable colors/module/finder shapes, server-rendered previews, guarded reset, session-local drafts, immutable saved revisions and verified PNG/SVG downloads. The canonical printed link remains separate from editable destinations. Every revision retains renderer version, normalized settings and byte hashes; retrying a save request is idempotent. History is owner-scoped, cursor-based and bounded. Preview/export use typed JSON artifact envelopes; the browser does not generate QR geometry.

The reviewed Jeeves Studio model adds one internal artwork table and four owner operations. Existing users, sessions, QR rows, scan rows, the first migration and all previous vendor artifacts remain unchanged. The API adopts REST runtime 0.2.0 and pinned artwork 0.1.0; the UI adopts product-ui 0.2.0. The API image uses the frozen pnpm lockfile. Generated contracts/routes/acceptance were produced by Jeeves, retaining QR-01–QR-09 and adding QR-10–QR-14.

Validation: 29 service tests, 13 Chromium workflows, recursive types and Vite production build passed. The composed disposable verification passed four web checks, strict QR-09, all ten protected behavior suites, and restart/byte checks. A separate old-to-new migration fixture retained the same database, old sessions/QRs/scans/PNG while adding artwork. Jeeves passed 567 tests in 77 files. Desktop/phone axe, overflow and inspected visual evidence passed for the tested states.

Local adoption: a private database backup was verified; API/frontend were rebuilt without restarting the database. Hashes and counts of all existing user/session/QR/scan rows are identical afterward; no synthetic live rows were created. A strict anonymous live browser check passed. The active Jeeves editor is revision 3 and still retains the unrelated unfinished Service, so the generated checkout uses the reviewed executable three-element Studio snapshot. Completing that draft is separate work. The untracked business-analysis folder is untouched.

Limits: drafts persist within the session, not across browser restart; export durability depends on retaining the pinned renderer and dependency closure. Print/device certification, load/chaos testing, owner-wide analytics and automatic product-recipe generation remain subsequent work.

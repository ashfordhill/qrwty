# qrwty frontend changes

## 2026-10-30 — P14: session, shell and library foundation

A responsive dark-blue workspace now provides clear account entry, navigation to create/library sections, link management, clipboard feedback and a server-generated QR preview. Existing QR URLs, edit/download/activity contracts and the protected row hooks remain intact. Failed logout keeps the workspace signed in; session-check failures offer a retry. Late list and previous-session mutation responses cannot replace the current workspace.

The UI uses `@jeeves/product-ui@0.1.0` from the project-owned artifact. Generated files and template runtime artifacts are unchanged. The Worker workaround is removed; supplemental browser verification uses P12's exact expected-response policy and asserts zero Workers. Logout explicitly finishes the 204 response stream.

Validation: dependency installation, recursive type checks, 29 service tests, 11 Chromium workflow tests, production build, desktop/mobile axe checks and visual inspection passed. Jeeves's isolated adoption verifier passed four web template checks, the current strict browser journey, and all eight original protected behavior suites (QR-01–QR-09 plus standard session/resource checks). All 32 generated-owned file hashes are unchanged. Disposable databases were removed. Only the local frontend was rebuilt; API/database container identities remained unchanged, and a read-only live anonymous session check passed.

Next: immutable artwork and QR Studio contracts/rendering. Studio customization, global analytics and fully generated product recipes are not included in this slice. No cloud deployment, paid model run or live database migration was performed.

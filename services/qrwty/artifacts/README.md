# P17 pinned artwork renderer

`jeeves-qr-artwork-0.1.0.tgz` is the immutable `@jeeves/qr-artwork@0.1.0` artifact from Jeeves P15. SHA-256: `ec642ef20b0d40ca25bfce3e84fad17384e28b02602e0773441584609b7a1abf`.

Saved revisions record the exact renderer version, normalized settings, canonical encoded URL and PNG/SVG SHA-256 hashes. Exports reproduce server bytes and reject mismatched hashes. The API Dockerfile installs with the frozen project pnpm lockfile to retain the transitive encoder dependency versions. Keep this artifact and the compatible dependency closure available when introducing future renderer versions; never replace its bytes under the same version.

The legacy PNG endpoint remains the original qrcode 1.5.4 implementation. Artwork revision migration is additive and does not rewrite QR identities, destinations, scans or legacy image settings. Finite presets and independent PNG decoding are bounded checks, not a guarantee across every printed material or scanning device.

## P18 analytics adoption

`jeeves-analytics-0.1.0.tgz` contains the bounded UTC range and owner-event aggregation component. SHA-256: `737e507b4791283936be5f518512aae97f6ae5fbaea957e0ac088ebdc0bb4048`. The browser imports only its date/count entry; the server binds the authenticated principal and reviewed generated descriptors to `/postgres`. No user-supplied SQL, identifiers or owner scope. Preserve the artifact under this version.

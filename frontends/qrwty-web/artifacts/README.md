# Jeeves product UI adoption (P14)

`jeeves-product-ui-0.1.0.tgz` is the compiled, immutable `@jeeves/product-ui@0.1.0` package built from Jeeves `packages/product-ui/`. SHA-256: `07500c88b206d2192e65a78efbbb330ddad1205ba3a87adb3adaf366655125ac`.

It supplies the responsive shell, page heading, feedback and empty state. This project owns the brand, navigation links, sessions and QR workflows. No protected template runtime was replaced; `vendor/jeeves/`, the generated clients, API contracts and generation lock are unchanged. A future artifact change must use a new package version.

Build at the Jeeves checkout with `pnpm --filter @jeeves/product-ui pack --pack-destination /path/to/qrwty/frontends/qrwty-web/artifacts`. The Dockerfile copies this project-owned artifact before installing dependencies. The application builds without access to the Jeeves checkout.

The Worker HTTP workaround is removed. Requests use the generated client's ordinary fetch. The project explicitly consumes the logout 204 response, because the existing openapi-fetch runtime returns it without reading the browser stream. This preserves browser transport-failure detection; it does not suppress errors.

## P17 adoption

`jeeves-product-ui-0.2.0.tgz` adds the domain-independent preset/configuration editor, guarded reset/preset replacement and sticky save actions. SHA-256: `81c6aaf975c9785e0c045c476dab0525a66c8e8743e6a75fa47b99c61b658e00`.

`jeeves-qr-artwork-0.1.0.tgz` supplies only the browser-safe `@jeeves/qr-artwork/settings` entry here. SHA-256: `ec642ef20b0d40ca25bfce3e84fad17384e28b02602e0773441584609b7a1abf`. The API owns rendering; the browser displays and downloads exact server bytes. It verifies export hashes before download.

The old 0.1.0 UI artifact remains unchanged. P17 intentionally regenerates contracts/routes/acceptance from the reviewed Studio model and adopts REST runtime 0.2.0 alongside the original artifact. Historical P14 preservation claims above describe that earlier package.

## P18 analytics adoption

`jeeves-analytics-0.1.0.tgz` contains the bounded UTC range and owner-event aggregation component. SHA-256: `737e507b4791283936be5f518512aae97f6ae5fbaea957e0ac088ebdc0bb4048`. The browser imports only its date/count entry; the server binds the authenticated principal and reviewed generated descriptors to `/postgres`. No user-supplied SQL, identifiers or owner scope. Preserve the artifact under this version.

`jeeves-product-ui-0.3.0.tgz` adds metric cards and a daily count chart with a complete accessible table. SHA-256: `389791a7a18bf33bbd66fc0b62e8c52c9abedf22acd7ebd86c53f823d696a615`. Previous UI and QR renderer artifacts remain unchanged.

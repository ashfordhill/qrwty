# Jeeves product UI adoption (P14)

`jeeves-product-ui-0.1.0.tgz` is the compiled, immutable `@jeeves/product-ui@0.1.0` package built from Jeeves `packages/product-ui/`. SHA-256: `07500c88b206d2192e65a78efbbb330ddad1205ba3a87adb3adaf366655125ac`.

It supplies the responsive shell, page heading, feedback and empty state. This project owns the brand, navigation links, sessions and QR workflows. No protected template runtime was replaced; `vendor/jeeves/`, the generated clients, API contracts and generation lock are unchanged. A future artifact change must use a new package version.

Build at the Jeeves checkout with `pnpm --filter @jeeves/product-ui pack --pack-destination /path/to/qrwty/frontends/qrwty-web/artifacts`. The Dockerfile copies this project-owned artifact before installing dependencies. The application builds without access to the Jeeves checkout.

The Worker HTTP workaround is removed. Requests use the generated client's ordinary fetch. The project explicitly consumes the logout 204 response, because the existing openapi-fetch runtime returns it without reading the browser stream. This preserves browser transport-failure detection; it does not suppress errors.

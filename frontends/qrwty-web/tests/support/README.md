# Browser error policy

`page-problems.ts` is a verbatim copy of Jeeves `packages/template-kit/src/page-problems.ts`, introduced in P12. SHA-256: `096c53e283c57b80f774a85c701b5c3b02114d2f850a2256247dcdb1fd1c4950`.

The supplemental workflows explicitly scope and finish each expected negative HTTP result. Unexpected HTTP failures, transport errors, broken assets, exceptions and application console errors fail. Every workflow also requires zero Workers. A disposable loopback HTTP API serves the fixtures; there are no Playwright route mocks or external services.

The preview PNG under `../fixtures/` is test-only: generated with the existing server-side qrcode 1.5.4 at 512px, margin 4, ECC M, encoding `https://example.test/q/af387361-4071-41bb-a224-f8a953cb3909`. Application previews and downloads always come from the API.

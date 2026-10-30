import { defineFeature } from "@jeeves/service-runtime";

// Acceptance: QR-02, QR-06
// Implement the owner-scoped PNG download. Use sessionPrincipal(request.request) and publicOrigin() from @jeeves/rest-server; never read process.env.PUBLIC_ORIGIN. Read the QR from the generated qr descriptor's physical table by id and its owner_id column, returning 404 if it is absent or another owner's. Encode publicOrigin() + '/q/' + id as a 512x512 PNG with margin 4 and error-correction level M using the qrcode dependency already in package.json. Never encode destination. Set Content-Type: image/png and a Content-Disposition attachment header. Use deterministic encoder options (no timestamp or random metadata) so the bytes stay identical after destination edits and restarts. Do not generate the QR in the browser.
// Implement operationId downloadQr here; the runtime reports 501 until it is registered.
export default defineFeature({name:"qr-image", operations:{}});

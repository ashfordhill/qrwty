import { defineFeature } from "@jeeves/service-runtime";

// Acceptance: QR-03, QR-04, QR-07
// Implement the public redirect. Query the current destination by id; if it is missing, return 404 and insert nothing. In one transaction (withTransaction from @jeeves/postgres-runtime), insert one scan row for the qr and commit, then return 302 with the destination in Location and Cache-Control: no-store. Every request counts, including repeated requests from the same client. Do not follow or cache the destination. Use the generated qr and scan descriptors for the physical table and column names, and parameterized SQL. Public access means no session lookup. Fastify also sends HEAD requests to this GET handler; do not insert a scan for HEAD. Do not expose fixture or clock controls.
// Implement operationId followQr here; the runtime reports 501 until it is registered.
export default defineFeature({name:"redirect", operations:{}});

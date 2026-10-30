import { defineFeature } from "@jeeves/service-runtime";

// Acceptance: QR-05, QR-06
// Implement the owner-scoped activity query. Use sessionPrincipal(request.request); check the QR belongs to the authenticated principal and return 404 for an absent or another owner's id. Require from and to as inclusive UTC dates. A range is valid when to >= from and (to - from) is at most 365 days, i.e. at most 366 dates inclusive; reject anything else with 400. Return {total, days:[{date,count}]}; include every UTC day in the range, including zero-count days. Aggregate scan rows by UTC day using the generated qr/scan descriptors and parameterized SQL. Do not expose fixture or clock controls.
// Implement operationId qrActivity here; the runtime reports 501 until it is registered.
export default defineFeature({name:"activity", operations:{}});

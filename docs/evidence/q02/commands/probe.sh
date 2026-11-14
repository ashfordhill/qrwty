#!/usr/bin/env bash
# Probes the running as-found export. Prints one line per request: method path -> status body.
set -u
E=http://127.0.0.1:${LOCAL_HTTP_PORT}
p() { local m=$1 u=$2; shift 2; local out; out=$(curl -s -m 10 -X "$m" -o /tmp/q02-probe-body -w '%{http_code}' "$@" "$E$u"); echo "$m $u -> $out $(head -c 160 /tmp/q02-probe-body | tr -d '\n')"; }
p GET /healthz
for t in session-api redirect-service billing-api; do p GET /api/$t/healthz; done
p GET /api/link-api/healthz
p GET /api/account-api/healthz
p GET /api/redirect-service/modules/redirect-service-resolve-and-redirect/abc123
p HEAD /api/redirect-service/modules/redirect-service-resolve-and-redirect/abc123
p GET /api/session-api/modules/session-api-sign-in-flow/login
p POST /api/session-api/modules/session-api-api-forwarding/links -H 'content-type: application/json' -d '{}'
p GET /api/billing-api/modules/billing-api-sign-in/me
p GET /api/billing-api/modules/billing-api-sign-in/me -H 'authorization: Bearer not-a-token'
p POST /api/billing-api/modules/billing-api-payment-events -H 'content-type: application/json' -d '{}'
p GET /api/billing-api/modules/billing-api-entitlements
p POST /api/billing-api/modules/billing-api-customer-billing/checkout -H 'content-type: application/json' -d '{}'

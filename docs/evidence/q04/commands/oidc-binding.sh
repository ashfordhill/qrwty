#!/usr/bin/env bash
# Q04: the sign-in binding comes from the environment (QG11 audience, QG24 issuer and key set).
# Link API's generated guard (Optional) is started once, as a one-off container of the production
# image on the internal rehearsal network, with an Auth0-shaped issuer (trailing slash) served by
# the Q04 OIDC fixture and an API audience of A's own; tokens are minted by the fixture at run time.
# Run from the export directory with the stack environment loaded. Prints JSON lines.
set -euo pipefail
N=${COMPOSE_PROJECT_NAME:?}-rehearsal
img=${COMPOSE_PROJECT_NAME}-app
here=$(cd "$(dirname "$0")" && pwd)
ip() { docker inspect -f "{{(index .NetworkSettings.Networks \"$N\").IPAddress}}" "$1"; }
cleanup() { docker rm -f "${COMPOSE_PROJECT_NAME}-oidc-fixture" "${COMPOSE_PROJECT_NAME}-oidc-link-api" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker run -d --name "${COMPOSE_PROJECT_NAME}-oidc-fixture" --label qrwty.arm=a --network "$N" \
  --network-alias oidc-fixture.qrwtya.internal \
  -v "$here/oidc-fixture.mjs:/app/q04-oidc-fixture.mjs:ro" "$img" node q04-oidc-fixture.mjs >/dev/null
issuer="http://oidc-fixture.qrwtya.internal:8080/"
audience="https://api.qrwtya.qrwty.io"
docker run -d --name "${COMPOSE_PROJECT_NAME}-oidc-link-api" --label qrwty.arm=a --network "$N" \
  -v "$QRWTY_LOCAL_TLS_DIR/ca.crt:/qrwty-tls/ca.crt:ro" -v "$PWD/.runtime/secrets:/run/secrets:ro" \
  -e JEEVES_DATABASE_LINKS_HOST="$(ip "${COMPOSE_PROJECT_NAME}-local-postgres-1")" -e JEEVES_DATABASE_LINKS_PORT=5432 \
  -e JEEVES_DATABASE_LINKS_TLS=verify-full -e JEEVES_DATABASE_LINKS_CA_FILE=/qrwty-tls/ca.crt \
  -e JEEVES_DATABASE_LINKS_TLS_SERVERNAME=local-postgres \
  -e JEEVES_CACHE_ADMISSION_CACHE_HOST="$(ip "${COMPOSE_PROJECT_NAME}-cache-admission-cache-1")" \
  -e JEEVES_CACHE_ADMISSION_CACHE_PORT=6379 -e JEEVES_CACHE_ADMISSION_CACHE_TLS=verify-full \
  -e JEEVES_CACHE_ADMISSION_CACHE_CA_FILE=/qrwty-tls/ca.crt -e JEEVES_CACHE_ADMISSION_CACHE_TLS_SERVERNAME=cache-admission-cache \
  -e JEEVES_EXTERNAL_REPUTATION_API_URL=https://webrisk.googleapis.com \
  -e JEEVES_TILE_BILLING_API_URL=https://qrwtya-billing-api.rehearsal.qrwtya.internal \
  -e OIDC_ISSUER="$issuer" -e OIDC_AUDIENCE="$audience" -e OIDC_JWKS_URL="${issuer}.well-known/jwks.json" \
  "$img" node dist/processes/link-api.js >/dev/null
for _ in $(seq 1 40); do
  docker exec "${COMPOSE_PROJECT_NAME}-oidc-link-api" test -f /tmp/application-ready 2>/dev/null && break
  sleep 0.25
done
docker exec -e ISS="$issuer" -e AUD="$audience" "${COMPOSE_PROJECT_NAME}-oidc-link-api" node --no-warnings -e '
const me = "http://127.0.0.1:3000/modules/link-api-sign-in/me";
const mint = (q) => fetch("http://oidc-fixture.qrwtya.internal:8080/mint?" + new URLSearchParams(q)).then((r) => r.text());
const call = async (name, token) => {
  const r = await fetch(me, token ? { headers: { authorization: "Bearer " + token } } : {});
  console.log(JSON.stringify({ case: name, status: r.status, body: await r.json() }));
};
(async () => {
  const { ISS, AUD } = process.env;
  await call("no token (Optional)");
  await call("issuer and audience as configured", await mint({ iss: ISS, aud: AUD }));
  await call("local Keycloak audience identity-web", await mint({ iss: ISS, aud: "identity-web" }));
  await call("issuer without its trailing slash", await mint({ iss: ISS.slice(0, -1), aud: AUD }));
  await call("another issuer", await mint({ iss: "https://another-tenant.example/", aud: AUD }));
})();'
echo "{\"case\":\"startup line\",\"started\":$(docker logs "${COMPOSE_PROJECT_NAME}-oidc-link-api" 2>&1 | grep -c '"event":"started"\|"event":"probe"')}"

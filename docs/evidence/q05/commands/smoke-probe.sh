#!/usr/bin/env bash
# Q05 diagnostic smoke probes against the running scratch stack (project qrwtya-q05). One JSON line
# per request: where it was sent, the status and the body. Public tiles through the edge on
# loopback; internal tiles from inside the network (Session API's container, Node's fetch); one
# Pub/Sub message published to Click events on the emulator and the worker's dead letter pulled.
#
#   bash smoke-probe.sh <edge port> <scratch dir for response bodies>
set -uo pipefail
port=$1 tmp=$2 project=qrwtya-q05
edge() {
  local method=$1 path=$2 body=${3:-}
  local args=(-s -o "$tmp/body" -w '%{http_code}' -X "$method")
  [ "$method" = HEAD ] && args=(-s -o "$tmp/body" -w '%{http_code}' --head)
  [ -n "$body" ] && args+=(-H 'content-type: application/json' --data "$body")
  local code
  code=$(curl "${args[@]}" "http://127.0.0.1:$port$path")
  python3 -I -c 'import json,sys; print(json.dumps({"via":"edge","method":sys.argv[1],"path":sys.argv[2],"status":int(sys.argv[3]),"body":open(sys.argv[4]).read()[:300]}))' "$method" "$path" "$code" "$tmp/body"
}
inside() {
  local method=$1 url=$2 header=${3:-}
  docker exec "$project-app-session-api-1" node --input-type=module -e '
    const [method, url, header] = process.argv.slice(1);
    const headers = header ? { authorization: header } : {};
    const res = await fetch(url, { method, headers });
    console.log(JSON.stringify({ via: "inside", method, path: url, status: res.status, body: (await res.text()).slice(0, 300) }));
  ' "$method" "$url" "$header"
}

edge GET /healthz
for tile in session-api billing-api redirect-service link-api account-api; do edge GET "/api/$tile/healthz"; done
edge GET /api/redirect-service/modules/redirect-service-resolve-and-redirect/abc123
edge HEAD /api/redirect-service/modules/redirect-service-resolve-and-redirect/abc123
edge GET /api/session-api/modules/session-api-sign-in-flow/login
edge POST /api/session-api/modules/session-api-api-forwarding/links '{"url":"https://example.com/"}'
edge POST /api/billing-api/modules/billing-api-customer-billing/checkout '{}'
edge POST /api/billing-api/modules/billing-api-payment-events '{"type":"probe"}'
edge GET /api/billing-api/modules/billing-api-entitlements
edge GET /api/billing-api/modules/billing-api-sign-in/me
edge GET /api/redirect-service/nothing-here
for tile in link-api account-api; do inside GET "http://app-$tile:3000/healthz"; done
inside GET http://app-link-api:3000/modules/link-api-sign-in/me
inside POST http://app-link-api:3000/modules/link-api-link-operations/links
inside POST http://app-link-api:3000/modules/link-api-abuse-and-moderation/reports
inside GET http://app-account-api:3000/modules/account-api-my-links
inside GET http://app-account-api:3000/modules/account-api-link-analytics
inside GET http://app-account-api:3000/modules/account-api-my-links "Bearer not-a-token"

# One message on Click events; the unwritten Click aggregator dead-letters it.
docker exec "$project-app-redirect-service-1" node --input-type=module -e '
  const { PubSub } = await import("@google-cloud/pubsub");
  const pubsub = new PubSub({ projectId: process.env.JEEVES_PUBSUB_PROJECT });
  const id = await pubsub.topic("click-events").publishMessage({
    data: Buffer.from(JSON.stringify({ probe: "q05" })), attributes: { messageId: "q05-probe-1" } });
  console.log(JSON.stringify({ via: "pubsub", published: "click-events", serverId: id, messageId: "q05-probe-1" }));
  const sub = pubsub.subscription("click-events--analytics-worker.failed");
  const deadline = Date.now() + 20000;
  let got = null;
  while (!got && Date.now() < deadline) {
    got = await new Promise((resolve) => {
      const done = (m) => { sub.removeAllListeners(); resolve(m); };
      sub.on("message", (m) => { m.ack(); done({ attributes: m.attributes, data: m.data.toString() }); });
      setTimeout(() => done(null), 2000);
    });
  }
  await sub.close();
  console.log(JSON.stringify({ via: "pubsub", pulled: "click-events--analytics-worker.failed", message: got }));
  await pubsub.close();
'

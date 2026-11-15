#!/usr/bin/env bash
# Q04: exercise the generated production clients on the running local test-profile stack
# (Compose project qrwtya-q04, built from the scratch export with infra/app-overlay and the Q04
# probe bodies). Run from the export directory with the stack's environment loaded. Prints one
# JSON object per step; every duration uses a monotonic clock (performance.now / /proc/uptime).
set -euo pipefail
edge="http://127.0.0.1:${LOCAL_HTTP_PORT:?}"
dc() { docker compose --profile '*' "$@"; }
psql_admin() { dc exec -T local-postgres psql -U postgres -d "${2:-postgres}" -At -c "$1"; }
step() { printf '{"step":"%s","result":%s}\n' "$1" "$2"; }

# 1. Every process's startup probes (verify-full TLS to PostgreSQL and Valkey; Pub/Sub topic or
#    subscription on the emulator).
step probes "$(dc logs --no-color --no-log-prefix app-redirect-service app-analytics-worker app-session-api \
  app-link-api app-account-api app-billing-api 2>/dev/null | grep '"event":"probe"' | sort | uniq -c |
  python3 -c 'import sys,json;print(json.dumps([l.strip() for l in sys.stdin]))')"

# 2. Which runtime logins are connected, and with TLS (the server's own view).
step pg_ssl "$(psql_admin "SELECT coalesce(json_agg(r ORDER BY r.usename, r.ssl), '[]') FROM (SELECT a.usename, s.ssl, s.version, count(*) AS connections FROM pg_stat_ssl s JOIN pg_stat_activity a USING (pid) WHERE a.usename LIKE 'r\_%' GROUP BY 1,2,3) r")"

# 3. A plain-text attempt by a runtime login is refused by the server (hostnossl reject).
step pg_plain_refused "$(dc exec -T --index 1 app-redirect-service node -e '
const pg=require("pg");const fs=require("fs");
const c=new pg.Client({host:"local-postgres",port:5432,database:"d_links",user:"r_links__redirect_service",password:fs.readFileSync("/run/secrets/sql-links--redirect-service","utf8").trim(),ssl:false});
c.connect().then(()=>{console.log(JSON.stringify({refused:false}));return c.end()},e=>console.log(JSON.stringify({refused:true,error:String(e.message).slice(0,120)})))' 2>/dev/null || true)"

# 4. Redirect service probe through the edge: database over TLS, cache over TLS, publish awaited.
for id in q04-pub-1 q04-pub-2 q04-pub-1; do
  step "redirect_probe_$id" "$(curl -s -o /dev/stdout "$edge/api/redirect-service/modules/redirect-service-resolve-and-redirect/probe?id=$id")"
done
step redirect_probe_poison "$(curl -s "$edge/api/redirect-service/modules/redirect-service-resolve-and-redirect/probe?id=q04-poison-1&poison=1")"

# 5. Session API's Identity client (JEEVES_IDENTITY_IDENTITY_URL, Keycloak inside the network).
step session_identity_probe "$(curl -s "$edge/api/session-api/modules/session-api-sign-in-flow/probe")"

sleep 4
# 6. What the analytics workers recorded (one row per messageId, deliveries counted).
step analytics_probe_seen "$(psql_admin "SELECT coalesce(json_agg(r ORDER BY r.message_id), '[]') FROM (SELECT message_id, deliveries, ssl, worker FROM m_analytics_worker_click_aggregator.probe_seen) r" d_analytics)"

# 7. The emulator's view: subscription settings and the dead-letter pull subscription's contents.
step pubsub_resources "$(dc exec -T --index 1 app-redirect-service node -e '
const b="http://local-pubsub:8085/v1/projects/local";
Promise.all(["/topics","/subscriptions"].map(p=>fetch(b+p).then(r=>r.json()))).then(([t,s])=>console.log(JSON.stringify({topics:(t.topics||[]).map(x=>x.name),subscriptions:(s.subscriptions||[]).map(x=>({name:x.name,topic:x.topic,ackDeadlineSeconds:x.ackDeadlineSeconds,deadLetterPolicy:x.deadLetterPolicy,retryPolicy:x.retryPolicy,messageRetentionDuration:x.messageRetentionDuration,expirationPolicy:x.expirationPolicy}))})))')"
step pubsub_dead_letter "$(dc exec -T --index 1 app-redirect-service node -e '
const u="http://local-pubsub:8085/v1/projects/local/subscriptions/click-events--analytics-worker.failed:pull";
fetch(u,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({maxMessages:10})}).then(r=>r.json()).then(j=>console.log(JSON.stringify((j.receivedMessages||[]).map(m=>({attributes:m.message.attributes,data:Buffer.from(m.message.data,"base64").toString()})))))')"

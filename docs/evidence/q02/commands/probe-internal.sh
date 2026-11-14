#!/usr/bin/env bash
# Internal processes, from inside the Compose network (the edge container has wget).
set -u
w() { docker compose exec -T app-edge sh -c "wget -S -q -O - $* 2>&1 | head -c 400" | tr '\n' ' '; echo; }
for u in http://app-link-api:3000/healthz http://app-account-api:3000/healthz \
  http://app-link-api:3000/modules/link-api-sign-in/me \
  http://app-link-api:3000/modules/link-api-link-operations/links \
  http://app-link-api:3000/modules/link-api-abuse-and-moderation/reports \
  http://app-account-api:3000/modules/account-api-sign-in/me \
  http://app-account-api:3000/modules/account-api-my-links \
  http://app-account-api:3000/modules/account-api-link-analytics; do echo -n "GET $u -> "; w "$u"; done

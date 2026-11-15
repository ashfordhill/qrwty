#!/usr/bin/env bash
# A1: the steps as run, from the repository root, Node 24.21.0 first on PATH. The Jeeves checkout is
# only read through Git (`archive`); nothing runs or is written there. Every Docker resource is
# qrwtya-a1*, labelled qrwty.arm=a, on loopback ports 47201-47230 (the Web Risk fixture on the
# Docker bridge's host address, 172.17.0.1:47212), and removed by exact name at the end.
set -euo pipefail
repo=/home/ash/github/qrwty
s=$repo/.scratch/A1
ev=$repo/docs/evidence/a1
jeeves=0aea8e7450233705b30e6677cf1d2b35af95412e
export PATH=$HOME/.nvm/versions/node/v24.21.0/bin:$PATH

generator() { # Jeeves at 0aea8e7, its own offline install (docs/ left out)
  mkdir -p "$s/jeeves" "$s/logs" "$s/input"
  git -C /home/ash/github/jeeves archive "$jeeves" -- . ':(exclude)docs' | tar -x -C "$s/jeeves"
  (cd "$s/jeeves" && pnpm install --frozen-lockfile --offline --ignore-scripts)
  # The saved design, revision 84: the canonical bytes Q05 exported (sha256 4fbcd311…024d).
  git show 33d50e9:app/.jeeves/inputs/design.json > "$s/input/design-r84.json"
}

update() { # plan, per-file actions, apply, and a fresh export to compare with
  cd "$s/jeeves"
  pnpm --silent --filter @jeeves/generator update:v2 "$s/input/design-r84.json" "$repo/app" --check > "$ev/records/update-plan-check.json"
  (cd jeeves-generator && ./node_modules/.bin/tsx "$ev/commands/plan-actions.mts" "$s/jeeves" "$s/input/design-r84.json" "$repo/app") \
    | sort -t$'\t' -k3 > "$ev/records/update-actions.tsv"
  pnpm --silent --filter @jeeves/generator update:v2 "$s/input/design-r84.json" "$repo/app" > "$ev/records/update-applied.json"
  pnpm --silent --filter @jeeves/generator export:v2 "$s/input/design-r84.json" "$s/fresh"
}

merge() { # the 11 stub shadows: 10 untouched stubs take the new text; Link operations by hand
  cd "$repo/app"
  cp -a .jeeves/generated "$s/shadows/"
  for p in $(cd .jeeves/generated && find src -type f | grep -v link-api-link-operations.ts); do cp ".jeeves/generated/$p" "$p"; done
  # (link-api-link-operations.ts edited by hand: records/link-operations-merge.diff)
  rm -r .jeeves/generated
}

offline() { # build, typecheck, lint and unit tests, root and app/; IaC validation; the preflight
  pnpm --dir app install --frozen-lockfile --offline
  pnpm --dir app run build && pnpm --dir app run typecheck:test && pnpm --dir app run lint && pnpm --dir app test
  pnpm build && pnpm typecheck && pnpm check
  python3 infra/local/install-overlay.py app infra/app-overlay
  TOFU_BIN=$repo/.scratch/tools/tofu-1.13.2/tofu TOFU_PLUGIN_DIR=$repo/.scratch/tools/providers \
    bash infra/gcp/validate.sh > "$s/logs/validate.json"
  node "$ev/commands/preflight-check.mjs" "$repo/infra/app-overlay" "$s/preflight" > "$ev/records/preflight-check.jsonl"
}

stack() { # one local first-run (two copies, verify-full TLS) and the guest-create smoke
  bash infra/local/tls-certs.sh "$s/tls"
  bash infra/local/app-secrets.sh "$s/app-secrets"
  rsync -a --exclude node_modules --exclude dist --exclude .runtime app/ "$s/stack/"
  # stack.env: COMPOSE_PROJECT_NAME=qrwtya-a1, LOCAL_HTTP_PORT=47201, LOCAL_IDENTITY_PORT=47202,
  # LOCAL_OBJECT_PORT=47203, QRWTY_LOCAL_TLS_DIR, QRWTY_LOCAL_APP_SECRET_DIR, QRWTY_EXPORT_DIR
  . "$s/stack.env"
  # The pack's Web Risk fixture, copied and checked against the pack's SHA256SUMS (bd8dd185…ba26).
  cp docs/benchmarks/neutral-pack/v1.6/oracle/src/fixtures/webrisk.ts "$s/fixture/webrisk.ts"
  node "$ev/commands/webrisk-run.mjs" "$s/fixture/webrisk.ts" 172.17.0.1:47212 & # stopped after the smoke
  (cd "$s/stack" && pnpm install --frozen-lockfile --offline && pnpm build && pnpm first-run)
  node "$ev/commands/smoke.mjs" http://127.0.0.1:47225 http://127.0.0.1:47226 http://172.17.0.1:47212 > "$ev/records/smoke.jsonl"
  docker exec qrwtya-a1-local-postgres-1 psql -U postgres -d d_links -At \
    -c "select slug, destination, version from m_link_api_link_operations.links"
  # QL05 at the process: an invalid declared setting fails startup, naming it.
  (cd "$s/stack" && docker compose run --rm --no-deps --name qrwtya-a1-settings-check \
    -e QRWTY_PUBLIC_ORIGIN_URL=https://qrwty.io/x app-link-api) || true
  # QG34 at the process: the production profile on per-secret file variables, then one refusal.
  export QRWTY_PROFILE_WORK_DIR=$s/profile-runs
  node infra/local/profile-check.mjs prepare
  node infra/local/profile-check.mjs check link-api none none profile
  node infra/local/profile-check.mjs check link-api development-secret-dir development-secret profile
  node infra/local/profile-check.mjs teardown
}

teardown() { # exact names only; never prune
  . "$s/stack.env"
  (cd "$s/stack" && docker compose --profile '*' down --volumes --remove-orphans)
  docker image rm qrwtya-a1-app:latest
}

"${@:-offline}"

#!/usr/bin/env bash
# Q06: the checks as run, from the repository root, Node 24.21.0 first on PATH. Every Docker
# resource is qrwtya-q06*, labelled qrwty.arm=a, on loopback ports 47201-47241 (the Web Risk
# fixture on the Docker bridge's host address), and removed by exact name at the end.
set -euo pipefail
repo=/home/ash/github/qrwty
scratch=$repo/.scratch/Q06
ev=$repo/docs/evidence/q06
export PATH=$HOME/.nvm/versions/node/v24.21.0/bin:$PATH

step0() { # Q05c
  bash tools/loc/setup.sh /home/ash/github/jeeves "$scratch/loc-node18" || true # under Node 18: refused
  bash tools/loc/setup.sh /home/ash/github/jeeves "$scratch/loc-runner"
  cp -a "$scratch/loc-runner" "$scratch/loc-broken"
  rm -rf "$scratch/loc-broken/node_modules/.pnpm/@rolldown+binding-linux-x64-gnu@1.2.15"
  bash tools/loc/verify-runner.sh "$scratch/loc-broken" || true # refused: Cannot find native binding
  bash tools/loc/source-loc.sh "$scratch/loc-runner" 33d50e9 33d50e9 "$scratch/loc-q05-repro"
  cmp "$scratch/loc-q05-repro/summary.json" docs/evidence/q05/loc/summary.json
}

offline() { # unit tests, lint and typecheck: no Docker, no network
  pnpm --dir app install --frozen-lockfile --offline
  pnpm --dir app run lint && pnpm --dir app run typecheck:test && pnpm --dir app test
  pnpm build && pnpm typecheck && pnpm check
}

postgres() { # real PostgreSQL 17: schema and races
  bash infra/local/test-postgres.sh start qrwtya-q06-testpg 47241 "$scratch/testpg-password"
  QRWTY_TEST_PG_PORT=47241 QRWTY_TEST_PG_PASSWORD_FILE="$scratch/testpg-password" pnpm --dir app test:integration
}

stack() { # Q04's overlay, two copies of every process, verify-full TLS to PostgreSQL and Valkey
  python3 infra/local/install-overlay.py app infra/app-overlay
  bash infra/local/tls-certs.sh "$scratch/tls"
  bash infra/local/app-secrets.sh "$scratch/app-secrets"
  rsync -a --exclude node_modules --exclude dist --exclude .runtime app/ "$scratch/stack/"
  # stack.env: COMPOSE_PROJECT_NAME=qrwtya-q06, LOCAL_HTTP_PORT=47201, LOCAL_IDENTITY_PORT=47202,
  # LOCAL_OBJECT_PORT=47203, QRWTY_LOCAL_TLS_DIR, QRWTY_LOCAL_APP_SECRET_DIR, QRWTY_EXPORT_DIR
  . "$scratch/stack.env"
  (cd "$scratch/stack" && pnpm install --frozen-lockfile --offline && pnpm build && pnpm first-run)
  (cd app && QRWTY_STACK_PROJECT=qrwtya-q06 QRWTY_STACK_LINK_API_URLS=http://127.0.0.1:47225,http://127.0.0.1:47226 \
    QRWTY_PACK_ORACLE_DIR="$scratch/pack/v1.6/oracle" QRWTY_WEB_RISK_LISTEN=172.17.0.1:47212 \
    QRWTY_ORACLE_COMMANDS="$repo/infra/local/oracle-commands.mjs" pnpm test:stack)
}

oracle() { # pack v1.6 from a verified scratch copy
  rsync -a --exclude node_modules docs/benchmarks/neutral-pack/v1.6/ "$scratch/pack/v1.6/"
  python3 -I "$scratch/pack/v1.6/verify_pack.py" "$scratch/pack/v1.6"
  (cd "$scratch/pack/v1.6/oracle" && pnpm install --frozen-lockfile --offline)
  . "$scratch/stack.env"
  export QRWTY_PROFILE_WORK_DIR=$scratch/profile-runs
  node infra/local/profile-check.mjs prepare
  QRWTY_TESTED_COMMIT=$(git rev-parse HEAD) node infra/local/oracle-commands.mjs adapter "$ev/oracle/oracle-adapter.json"
  cd "$scratch/pack/v1.6/oracle"
  node src/cli.ts validate-adapter "$ev/oracle/oracle-adapter.json"
  node src/cli.ts run --adapter "$ev/oracle/oracle-adapter.json" --out "$ev/oracle/results" \
    --rows A02,A03,A09,F07,R01,R02,R03 --scope local --no-reset || true
}

loc() { # before the commit: a scratch clone whose app/ and tools/ are this unit's, committed there
  git clone -q --no-hardlinks "$repo" "$scratch/loc-clone"
  rsync -a --delete --exclude node_modules --exclude dist --exclude .runtime app/ "$scratch/loc-clone/app/"
  rsync -a tools/ "$scratch/loc-clone/tools/"
  (cd "$scratch/loc-clone" && git add -A app tools && git -c user.name=scratch -c user.email=scratch@invalid \
    commit -qm "scratch: Q06 tree for the pre-commit LOC count" &&
    bash tools/loc/source-loc.sh "$scratch/loc-runner" 33d50e9c693b4d8d60d723e0de75b79f3570da64 HEAD "$ev/loc")
  # after the commit: the same count on the unit commit itself
  bash tools/loc/source-loc.sh "$scratch/loc-runner" 33d50e9c693b4d8d60d723e0de75b79f3570da64 HEAD "$scratch/loc-post"
}

teardown() { # exact names only; never prune
  . "$scratch/stack.env"
  node infra/local/profile-check.mjs teardown
  (cd "$scratch/stack" && docker compose --profile '*' down --volumes --remove-orphans)
  docker image rm qrwtya-q06-app
  bash infra/local/test-postgres.sh stop qrwtya-q06-testpg
}

"${@:-offline}"

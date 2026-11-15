#!/usr/bin/env bash
# QRWTY arm A: a disposable PostgreSQL for `pnpm test:integration` (app/test/integration), the same
# image the export runs. Loopback only, labelled qrwty.arm=a, no volume, removed by exact name.
# The superuser password is random per start and kept only in the given file (outside Git).
#
#   infra/local/test-postgres.sh start <name> <loopback port> <password file>
#   infra/local/test-postgres.sh stop <name>
#
# Then: QRWTY_TEST_PG_PORT=<port> QRWTY_TEST_PG_PASSWORD_FILE=<file> pnpm --dir app test:integration
set -euo pipefail
image='postgres:17.11-alpine3.23@sha256:bc2701f9a79f9248bcb18743bc9b2c732d9a1d16737ca44a8f577752fc43b61f'
command=${1:?usage: test-postgres.sh start|stop <name> ...}
name=${2:?container name}
[[ $name =~ ^qrwtya[a-z0-9-]*$ ]] || { echo "refused: the name must start with qrwtya" >&2; exit 2; }
case $command in
  start)
    port=${3:?loopback port} file=${4:?password file}
    [ -e "$file" ] && { echo "refused: $file exists" >&2; exit 1; }
    (umask 077 && openssl rand -hex 24 >"$file")
    docker run -d --name "$name" --label qrwty.arm=a -p "127.0.0.1:$port:5432" \
      -e POSTGRES_PASSWORD_FILE=/run/pg-password -v "$(cd "$(dirname "$file")" && pwd)/$(basename "$file"):/run/pg-password:ro" \
      --user "$(id -u):$(id -g)" -e PGDATA=/tmp/pgdata "$image" >/dev/null
    for _ in $(seq 1 60); do
      docker exec "$name" pg_isready -U postgres -h 127.0.0.1 >/dev/null 2>&1 && { echo "{\"ok\":true,\"name\":\"$name\",\"port\":$port}"; exit 0; }
      sleep 0.5
    done
    echo "postgres did not become ready" >&2; exit 1 ;;
  stop)
    docker rm -f "$name" >/dev/null && echo "{\"ok\":true,\"removed\":\"$name\"}" ;;
  *) echo "usage: test-postgres.sh start|stop <name> ..." >&2; exit 2 ;;
esac

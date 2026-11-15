#!/usr/bin/env bash
# Q04: the export's migrations against a managed-like PostgreSQL admin (QG12), restricted roles.
# A throwaway PostgreSQL 17.11 (the export's pinned digest) whose `postgres` login is CREATEDB
# CREATEROLE but not a superuser, as Cloud SQL's is. Two copies of the production image's
# `node scripts/migrate.mjs` start at once, then a third runs; then the grants are read back.
# Every password is generated at run time into a private scratch directory and never printed.
# Run from the export directory with the stack environment loaded. Prints JSON lines.
set -euo pipefail
P=${COMPOSE_PROJECT_NAME:?}
N=$P-rehearsal
img=$P-app
pg_image=$(docker compose --profile '*' config --no-env-resolution --format json |
  python3 -c 'import json,sys;print(json.load(sys.stdin)["services"]["local-postgres"]["image"])')
name=$P-pg-managed
work=$(mktemp -d "${QRWTY_PROFILE_WORK_DIR:?}/managed-XXXX")
cleanup() {
  docker rm -f -v "$name" "$P-migrate-a" "$P-migrate-b" "$P-migrate-c" >/dev/null 2>&1 || true
  rm -rf "$work"
}
trap cleanup EXIT
mkdir -m 0700 "$work/secrets"
cp .runtime/secrets/* "$work/secrets/"
head -c 24 /dev/urandom | base64 | tr -d '/+=' >"$work/bootstrap"
head -c 24 /dev/urandom | base64 | tr -d '/+=' >"$work/secrets/postgres-admin"
chmod 0600 "$work/secrets/"*; chmod 0644 "$work/bootstrap"
docker run -d --name "$name" --label qrwty.arm=a --network "$N" -e POSTGRES_USER=bootstrap \
  -e POSTGRES_PASSWORD_FILE=/run/b -v "$work/bootstrap:/run/b:ro" "$pg_image" >/dev/null
for _ in $(seq 1 60); do docker exec "$name" pg_isready -U bootstrap -d postgres -q 2>/dev/null && break; sleep 0.5; done
sleep 1
sql() { docker exec -i "$name" psql -v ON_ERROR_STOP=1 -U bootstrap -d "${2:-postgres}" -At -c "$1"; }
sql "DROP ROLE IF EXISTS postgres" >/dev/null 2>&1 || true
docker exec -i "$name" psql -v ON_ERROR_STOP=1 -U bootstrap -d postgres -q \
  -v pw="$(cat "$work/secrets/postgres-admin")" <<'SQL'
CREATE ROLE postgres LOGIN CREATEDB CREATEROLE PASSWORD :'pw';
SQL
echo "{\"step\":\"admin\",\"result\":$(sql "SELECT json_build_object('rolsuper',rolsuper,'rolcreatedb',rolcreatedb,'rolcreaterole',rolcreaterole) FROM pg_roles WHERE rolname='postgres'")}"
host=$(docker inspect -f "{{(index .NetworkSettings.Networks \"$N\").IPAddress}}" "$name")
migrate() {
  docker run --name "$P-migrate-$1" --label qrwty.arm=a --network "$N" -e PGHOST="$host" -e PGPORT=5432 \
    -e SECRET_DIR=/run/secrets -v "$work/secrets:/run/secrets:ro" "$img" node scripts/migrate.mjs \
    >"$work/migrate-$1.log" 2>&1
}
start=$(cut -d' ' -f1 /proc/uptime)
migrate a & pa=$!
migrate b & pb=$!
set +e
wait $pa; ea=$?
wait $pb; eb=$?
end=$(cut -d' ' -f1 /proc/uptime)
migrate c; ec=$?
set -e
for r in a b c; do
  applied=$(grep -c '^Applied ' "$work/migrate-$r.log" || true)
  last=$(tail -1 "$work/migrate-$r.log" | cut -c1-120)
  code=$([ $r = a ] && echo $ea || ([ $r = b ] && echo $eb || echo $ec))
  echo "{\"step\":\"migrate-$r\",\"exit\":$code,\"applied\":$applied,\"last\":$(printf '%s' "$last" | python3 -c 'import json,sys;print(json.dumps(sys.stdin.read()))')}"
done
echo "{\"step\":\"concurrent-pair-seconds\",\"result\":$(python3 -c "print(round($end-$start,2))")}"
echo "{\"step\":\"database-acl\",\"result\":$(sql "SELECT json_agg(json_build_object('db',datname,'owner',pg_get_userbyid(datdba),'acl',datacl::text,'publicConnect',has_database_privilege('public',datname,'CONNECT'),'adminConnect',has_database_privilege('postgres',datname,'CONNECT')) ORDER BY datname) FROM pg_database WHERE datname LIKE 'd\_%' OR datname LIKE 'i\_%'")}"
echo "{\"step\":\"admin-membership\",\"result\":$(sql "SELECT json_agg(json_build_object('role',r.rolname,'inherit',m.inherit_option,'set',m.set_option) ORDER BY r.rolname) FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.roleid JOIN pg_roles u ON u.oid=m.member WHERE u.rolname='postgres'")}"
echo "{\"step\":\"runtime-logins\",\"result\":$(sql "SELECT json_agg(json_build_object('role',rolname,'super',rolsuper,'createdb',rolcreatedb,'createrole',rolcreaterole) ORDER BY rolname) FROM pg_roles WHERE rolname LIKE 'r\_%'")}"
# What the Redirect service's login may do in d_links: read published views only; no CREATE.
echo "{\"step\":\"redirect-login-privileges\",\"result\":$(sql "SELECT json_build_object('createInPublic',has_schema_privilege('r_links__redirect_service','public','CREATE'),'usagePublished',has_schema_privilege('r_links__redirect_service','published','USAGE'),'usageLinkOperationsSchema',has_schema_privilege('r_links__redirect_service','m_link_api_link_operations','USAGE'),'linkApiUsageOwnSchema',has_schema_privilege('r_links__link_api','m_link_api_link_operations','USAGE'),'linkApiCreateInOwnSchema',has_schema_privilege('r_links__link_api','m_link_api_link_operations','CREATE'))" d_links)}"

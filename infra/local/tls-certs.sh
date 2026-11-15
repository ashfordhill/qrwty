#!/usr/bin/env bash
# QRWTY arm A, local test profile: a throwaway certificate authority and server certificates for the
# local PostgreSQL and the two Valkey caches, so local processes connect with JEEVES_*_TLS=verify-full
# exactly as production does. Everything is generated at run time into the directory given (outside
# the application tree; never committed). A second, unrelated CA ("wrong-ca") is made for the
# negative check: a client given it must refuse the server.
#
#   infra/local/tls-certs.sh <directory>
set -euo pipefail
dir=${1:?usage: tls-certs.sh <directory>}
if [ -e "$dir" ]; then
  echo "refusing: $dir exists; remove it by name first" >&2
  exit 1
fi
mkdir -p "$dir"
chmod 0755 "$dir"
cd "$dir"
subj() { printf '/O=QRWTY arm A local test/CN=%s' "$1"; }

ca() {
  openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes -days 7 \
    -subj "$(subj "$1")" -keyout "$1.key" -out "$1.crt" \
    -addext basicConstraints=critical,CA:TRUE -addext keyUsage=critical,keyCertSign,cRLSign \
    2>/dev/null
}
server() {
  local name=$1 sans=$2
  openssl req -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes -subj "$(subj "$name")" \
    -keyout "$name.key" -out "$name.csr" 2>/dev/null
  printf 'subjectAltName=%s\nextendedKeyUsage=serverAuth\nbasicConstraints=CA:FALSE\n' "$sans" >"$name.ext"
  openssl x509 -req -in "$name.csr" -CA ca.crt -CAkey ca.key -CAcreateserial -days 7 \
    -extfile "$name.ext" -out "$name.crt" 2>/dev/null
  rm -f "$name.csr" "$name.ext"
}

ca ca
ca wrong-ca
server local-postgres "DNS:local-postgres,DNS:links-db.qrwtya.internal"
server cache-hot-routes "DNS:cache-hot-routes"
server cache-admission-cache "DNS:cache-admission-cache"
rm -f ca.srl ca.key wrong-ca.key
# PostgreSQL's client rules for the test profile: the setup admin and Keycloak's own login may use
# plain TCP; every other login (the runtime logins and the setup-only owners) must use TLS.
cat >pg_hba.conf <<'HBA'
local   all        all          trust
host    all        postgres     all  scram-sha-256
host    i_identity ik_identity  all  scram-sha-256
hostssl all        all          all  scram-sha-256
hostnossl all      all          all  reject
HBA
chmod 0644 ./*.crt pg_hba.conf
chmod 0600 ./*.key
echo "{\"ok\":true,\"dir\":\"$dir\",\"files\":$(ls | python3 -c 'import json,sys;print(json.dumps(sorted(sys.stdin.read().split())))')}"

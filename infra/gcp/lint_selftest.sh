#!/usr/bin/env bash
# Proves lint_iac.py rejects what it claims to: each fault is injected into a throwaway copy of
# infra/gcp and must make the lint fail. Prints one line per fault; exit 0 when every fault fails.
set -uo pipefail
here=$(cd "$(dirname "$0")" && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
status=0
for fault in name var local budget brace pin secretver sqluser; do
  d="$work/$fault"
  cp -r "$here" "$d"
  case $fault in
    name) sed -i 's|name                    = "${local.p}vpc"|name                    = "shared-vpc"|' "$d/network.tf" ;;
    var) sed -i 's|var.sql_tier|var.sql_tierx|' "$d/stores.tf" ;;
    local) sed -i 's|local.ca_mount}/value|local.ca_mountx}/value|' "$d/locals.tf" ;;
    budget) printf 'resource "google_billing_budget" "b" {\n  amount {}\n}\n' >>"$d/secrets.tf" ;;
    brace) printf 'locals {\n  x = {\n}\n' >>"$d/secrets.tf" ;;
    pin) sed -i 's|version = "8.8.1"|version = "~> 8.8"|' "$d/versions.tf" ;;
    secretver) printf 'resource "google_secret_manager_secret_version" "pw" {\n  secret      = google_secret_manager_secret.s["postgres-admin"].id\n  secret_data = var.region\n}\n' >>"$d/secrets.tf" ;;
    sqluser) printf 'resource "google_sql_user" "admin" {\n  name     = "postgres"\n  instance = google_sql_database_instance.pg.name\n}\n' >>"$d/stores.tf" ;;
  esac
  if out=$(python3 "$here/lint_iac.py" "$d"); then
    echo "{\"fault\":\"$fault\",\"detected\":false}"
    status=1
  else
    first=$(printf '%s' "$out" | python3 -c 'import json,sys;print(json.dumps(json.load(sys.stdin)["errors"][0]))')
    echo "{\"fault\":\"$fault\",\"detected\":true,\"error\":$first}"
  fi
done
exit $status

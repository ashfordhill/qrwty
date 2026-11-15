#!/usr/bin/env bash
# QRWTY arm A: offline IaC validation (oracle R04's iacValidate). No credentials, no network.
#
#   infra/gcp/validate.sh
#
# 1. lint_iac.py: structural checks from the text alone (always runs).
# 2. OpenTofu 1.13.2 `fmt -check`, `init -backend=false` from a local provider mirror and
#    `validate`, inside `unshare -rn` (no network) with an empty environment. Needs the pinned
#    `tofu` binary (TOFU_BIN, default `tofu` on PATH) and the google provider 8.8.1 in a filesystem
#    mirror (TOFU_PLUGIN_DIR, default infra/gcp/.providers, filled once by
#    `tofu providers mirror infra/gcp/.providers` on a machine with network). When either is
#    missing, step 2 is reported "blocked" (exit 3), never passed.
# Prints one JSON object.
set -uo pipefail
here=$(cd "$(dirname "$0")" && pwd)
lint=$(python3 "$here/lint_iac.py" "$here")
lint_rc=$?
tofu_bin=${TOFU_BIN:-$(command -v tofu || true)}
plugins=${TOFU_PLUGIN_DIR:-$here/.providers}
report() { printf '{"ok":%s,"lint":%s,"tofu":%s}\n' "$1" "$(printf '%s' "$lint" | python3 -c 'import json,sys;d=json.load(sys.stdin);print(json.dumps({"ok":d["ok"],"errors":d["errors"]}))')" "$2"; }
if [ -z "$tofu_bin" ] || [ ! -x "$tofu_bin" ] || [ ! -d "$plugins" ]; then
  report false '{"status":"blocked","reason":"OpenTofu 1.13.2 or the local google 8.8.1 provider mirror is not installed"}'
  exit 3
fi
version=$("$tofu_bin" version -json 2>/dev/null | python3 -c 'import json,sys;print(json.load(sys.stdin)["terraform_version"])')
if [ "$version" != "1.13.2" ]; then
  report false "{\"status\":\"blocked\",\"reason\":\"tofu is $version, not 1.13.2\"}"
  exit 3
fi
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
cp "$here"/*.tf "$work/"
run() { env -i PATH=/usr/bin:/bin HOME="$work" TF_IN_AUTOMATION=1 unshare -rn "$tofu_bin" -chdir="$work" "$@"; }
fmt=$(run fmt -check -diff 2>&1); fmt_rc=$?
init=$(run init -backend=false -input=false -plugin-dir="$plugins" 2>&1); init_rc=$?
val=$(run validate -json 2>&1); val_rc=$?
ok=$([ $lint_rc -eq 0 ] && [ $fmt_rc -eq 0 ] && [ $init_rc -eq 0 ] && [ $val_rc -eq 0 ] && echo true || echo false)
report "$ok" "$(python3 -c 'import json,sys;print(json.dumps({"status":"ran","fmt":int(sys.argv[1]),"init":int(sys.argv[2]),"validate":int(sys.argv[3]),"validateOutput":sys.argv[4][-2000:]}))' $fmt_rc $init_rc $val_rc "$val")"
[ "$ok" = true ]

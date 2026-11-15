#!/usr/bin/env bash
# QRWTY arm A: the ordinary build and checks of an export with the application overlay, as the
# oracle's ordinaryBuildAndTest runs them (no cloud credentials, empty HOME, no network needed).
# Run in the export directory. The export has no test suite of its own yet (Q05 wires root
# commands); this builds it, proves no generated file was edited, and checks the preflight's
# syntax and its refusal of an empty environment. Prints {"ok": true} on success.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
export PATH="${QRWTY_NODE_BIN:-$HOME/.nvm/versions/node/v24.21.0/bin}:$PATH"
node_modules/.bin/tsc -p tsconfig.json >&2
python3 "$here/verify-generated.py" . >&2
node --check scripts/qrwty-production-profile.mjs
if env -i PATH="$PATH" node scripts/qrwty-production-profile.mjs redirect-service 2>/dev/null; then
  echo '{"ok":false,"error":"preflight accepted an empty environment"}'
  exit 1
fi
echo '{"ok":true}'

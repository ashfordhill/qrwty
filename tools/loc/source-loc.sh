#!/usr/bin/env bash
# QRWTY arm A's pinned source-loc-v2 runner (comparison.md, pack loc-method). It runs Jeeves's
# unchanged CLI, `jeeves-generator/src/source-loc-cli.ts` at the pinned commit, with this
# repository as `repo` (the CLI takes `git rev-parse --show-toplevel` of its working directory)
# and `app` as the application. The CLI reads app/ and app/.jeeves/manifest.json from Git objects
# at the two commits, never the working tree. The reviewed scope is read from the final commit's
# Git object too and given to the CLI as an absolute path, so a dirty scope file changes nothing.
# Then summary.mts adds the arm's totals, identities, the baseline's scaffolding/stub split, open
# work and support counts, also from Git objects.
#
#   bash tools/loc/source-loc.sh <runner dir> <baseline ref> <final ref> <out dir>
#
# Writes <out dir>/source-loc-v2.json (the CLI's stdout, unchanged) and <out dir>/summary.json.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
runner=$(cd "$1" && pwd) baseline=$2 final=$3 out=$4
repo=$(git -C "$here" rev-parse --show-toplevel)
node_pin=$(python3 -I -c 'import json,sys; print(json.load(open(sys.argv[1]))["node"])' "$here/pins.json")
test "$(node --version)" = "v$node_pin" || { echo "refused: node $(node --version), pinned v$node_pin" >&2; exit 1; }
bash "$here/verify-runner.sh" "$runner" >&2
mkdir -p "$out"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
git -C "$repo" show "$final:tools/loc/backend-scope.json" > "$tmp/backend-scope.json"
cd "$repo"
"$runner/jeeves-generator/node_modules/.bin/tsx" "$runner/jeeves-generator/src/source-loc-cli.ts" \
  app "$baseline" "$final" "$tmp/backend-scope.json" > "$out/source-loc-v2.json"
"$runner/jeeves-generator/node_modules/.bin/tsx" "$here/summary.mts" \
  "$runner" "$out/source-loc-v2.json" "$out/summary.json"

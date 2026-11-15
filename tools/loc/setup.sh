#!/usr/bin/env bash
# Build the pinned source-loc-v2 runner: a `git archive` copy of Jeeves at the pinned commit (its
# docs/ left out, so nothing of docs/plans is extracted) with its own offline install. The Jeeves
# checkout is only read through Git (`archive`, `show`); nothing runs or is written there.
#
#   bash tools/loc/setup.sh <jeeves git dir> <new runner dir>
#
# Set LOC_INSTALL_ONLINE=1 to let pnpm fetch packages missing from the local store.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
jeeves=$1 dest=$2
commit=$(python3 -I -c 'import json,sys; print(json.load(open(sys.argv[1]))["jeeves"]["commit"])' "$here/pins.json")
if [ -e "$dest" ]; then echo "refused: $dest exists" >&2; exit 1; fi
test "$(git -C "$jeeves" rev-parse "$commit^{commit}")" = "$commit"
mkdir -p "$dest"
git -C "$jeeves" archive "$commit" -- . ':(exclude)docs' | tar -x -C "$dest"
# The method document is part of the pin; keep only that one file from docs/.
mkdir -p "$dest/docs/field-projects"
git -C "$jeeves" show "$commit:docs/field-projects/source-loc.md" > "$dest/docs/field-projects/source-loc.md"
offline=--offline
[ "${LOC_INSTALL_ONLINE:-}" = 1 ] && offline=--prefer-offline
(cd "$dest" && pnpm install --frozen-lockfile $offline --ignore-scripts >/dev/null)
bash "$here/verify-runner.sh" "$dest"

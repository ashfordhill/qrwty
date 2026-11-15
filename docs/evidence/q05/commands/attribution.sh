#!/usr/bin/env bash
# Q05: explain each file in which the studio's export differs from the frozen CLI's, by Jeeves
# commit. A scratch copy of Jeeves 4e87f97 (`git archive`, docs/ left out, its own offline
# install) exports the saved source; then each later commit's generator diff is applied in turn
# with `patch` and the source exported again; last, the checkout's uncommitted generator diff.
# The Jeeves checkout is only read (`git archive`, `git diff`); nothing runs or is written there.
#
#   bash attribution.sh <jeeves git dir> <canonical design.json> <new scratch dir>
set -euo pipefail
jeeves=$1 design=$2 dir=$3
commits=(39a20be 1d42570 efbff72 79ecb96)
mkdir "$dir" && mkdir "$dir/jeeves" "$dir/patches"
git -C "$jeeves" archive 4e87f97 -- . ':(exclude)docs' | tar -x -C "$dir/jeeves"
(cd "$dir/jeeves" && pnpm install --frozen-lockfile --offline --ignore-scripts >/dev/null)
for c in "${commits[@]}"; do
  git -C "$jeeves" --no-optional-locks diff "$c~1" "$c" -- jeeves-generator > "$dir/patches/$c.patch"
done
git -C "$jeeves" --no-optional-locks diff HEAD -- jeeves-generator jeeves/packages jeeves/apps/server \
  > "$dir/patches/worktree.patch"
export_to() { (cd "$dir/jeeves" && pnpm --silent --filter @jeeves/generator export:v2 "$design" "$dir/$1" >/dev/null); }
export_to e0-4e87f97
prev=e0-4e87f97
for c in "${commits[@]}" worktree; do
  (cd "$dir/jeeves" && patch -p1 --no-backup-if-mismatch -s < "../patches/$c.patch")
  export_to "e-$c"
  echo "== $c"
  diff -rq "$dir/$prev" "$dir/e-$c" | sed 's/^Files //; s/ and .*//' || true
  prev=e-$c
done
sha256sum "$dir"/patches/*.patch

#!/usr/bin/env bash
# Q05: write QRWTY's baseline app/ with the frozen generator (Jeeves 4e87f97), from the saved
# revision's canonical source bytes. Refuses an existing destination twice over: this script
# checks first, and the CLI's exportNewDirectory refuses (EEXIST) if anything appears meanwhile.
#
#   bash export-app.sh <frozen jeeves dir> <canonical design.json> <absolute destination>
set -euo pipefail
jeeves=$1 design=$2 dest=$3
case $dest in /*) ;; *) echo "destination must be absolute" >&2; exit 2 ;; esac
if [ -e "$dest" ]; then echo "refused: $dest exists; the baseline is never overwritten" >&2; exit 1; fi
cd "$jeeves"
pnpm --silent --filter @jeeves/generator export:v2 "$design" "$dest"

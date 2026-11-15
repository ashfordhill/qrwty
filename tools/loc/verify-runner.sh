#!/usr/bin/env bash
# Refuse a runner copy that is not the pinned one: every pinned file's SHA-256, the method
# document's, and the installed parser, schema and loader versions must equal tools/loc/pins.json.
# Then the parser must load (Q05c): a one-line `codeLines` smoke through the copy's own loader, so
# a copy installed under another Node, which lacks the native binding, fails here and not later.
#
#   bash tools/loc/verify-runner.sh <runner dir>
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
python3 -I - "$here/pins.json" "$1" <<'PY'
import hashlib, json, os, sys
pins, root = json.load(open(sys.argv[1])), sys.argv[2]
sha = lambda p: hashlib.sha256(open(os.path.join(root, p), "rb").read()).hexdigest()
bad = [p for p, h in pins["files"].items() if sha(p) != h]
doc = pins["methodDocument"]
if sha(doc["path"]) != doc["sha256"]:
    bad.append(doc["path"])
for name, version in pins["installed"].items():
    got = json.load(open(os.path.join(root, "jeeves-generator/node_modules", name, "package.json")))["version"]
    if got != version:
        bad.append(f"{name}@{got} (pinned {version})")
if bad:
    sys.exit("runner is not the pinned copy: " + ", ".join(bad))
PY
generator=$(cd "$1/jeeves-generator" && pwd)
smoke=$(cd "$generator" && node_modules/.bin/tsx -e \
  'import("./src/source-loc.ts").then((m) => console.log(JSON.stringify(m.codeLines("smoke.ts", "const a = 1;\n"))))' 2>&1) ||
  { echo "runner is not usable: the parser does not load; rebuild the copy under the pinned Node: $(printf '%s' "$smoke" | grep -m1 -oE 'Cannot find native binding|[A-Za-z]+Error: [^"]{0,120}' || true)" >&2; exit 1; }
[ "$smoke" = '["const a = 1;"]' ] || { echo "runner is not usable: codeLines smoke printed $smoke" >&2; exit 1; }
python3 -I -c 'import json,sys; print(json.dumps({"runner": sys.argv[1], "jeeves": json.load(open(sys.argv[2]))["jeeves"]["commit"], "verified": True, "parserSmoke": "ok"}))' \
  "$(cd "$1" && pwd)" "$here/pins.json"

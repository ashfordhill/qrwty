#!/usr/bin/env bash
# Refuse a runner copy that is not the pinned one: every pinned file's SHA-256, the method
# document's, and the installed parser, schema and loader versions must equal tools/loc/pins.json.
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
print(json.dumps({"runner": os.path.abspath(root), "jeeves": pins["jeeves"]["commit"], "verified": True}))
PY

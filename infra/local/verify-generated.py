#!/usr/bin/env python3
"""Prove no generated file of a Jeeves export was edited.

  python3 infra/local/verify-generated.py <export dir>

Every file .jeeves/manifest.json records as `generated-scaffold` must still have the manifest's
SHA-256 (generator-metadata files are checked the same way, except the manifest itself, which
holds no hash of itself). `generated-extension` files are the application's and are reported,
not checked. Exit 0 when nothing generated changed.
"""
import hashlib
import json
import sys
from pathlib import Path

export = Path(sys.argv[1]).resolve()
manifest = json.loads((export / ".jeeves/manifest.json").read_text())
changed, extension, checked = [], [], 0
for f in manifest["files"]:
    data = (export / f["path"]).read_bytes()
    same = hashlib.sha256(data).hexdigest() == f["sha256"]
    if f["ownership"] == "generated-extension":
        extension.append({"path": f["path"], "asGenerated": same})
        continue
    checked += 1
    if not same:
        changed.append(f["path"])
print(json.dumps({"ok": not changed, "generatedChecked": checked, "generatedChanged": changed,
                  "applicationFiles": extension}))
sys.exit(1 if changed else 0)

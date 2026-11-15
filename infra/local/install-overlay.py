#!/usr/bin/env python3
"""Copy QRWTY arm A's application-owned files into a Jeeves export, never over a generated file.

  python3 infra/local/install-overlay.py <export dir> <source dir> [<source dir> ...]

Each source directory mirrors export paths (infra/app-overlay/ holds the override, the production
preflight and its profile; docs/evidence/q04/probe-app/ holds Q04's binding probes). A path the
export's .jeeves/manifest.json lists as `generated-scaffold` or `generator-metadata` is refused:
only `generated-extension` files (stub bodies, product SQL, package manifests) and files the
manifest does not list (compose.override.yaml, application scripts) may be written. Prints one JSON
line listing what was written and how the manifest classes each path.
"""
import hashlib
import json
import shutil
import sys
from pathlib import Path

export = Path(sys.argv[1]).resolve()
manifest = json.loads((export / ".jeeves/manifest.json").read_text())
owner = {f["path"]: f["ownership"] for f in manifest["files"]}
written = []
for source in map(Path, sys.argv[2:]):
    for file in sorted(p for p in source.rglob("*") if p.is_file()):
        rel = file.relative_to(source).as_posix()
        cls = owner.get(rel, "not-in-manifest")
        if cls in ("generated-scaffold", "generator-metadata") or rel.startswith(".jeeves/"):
            print(json.dumps({"ok": False, "refused": rel, "ownership": cls}))
            sys.exit(1)
        target = export / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(file, target)
        written.append({"path": rel, "ownership": cls,
                        "sha256": hashlib.sha256(file.read_bytes()).hexdigest()})
print(json.dumps({"ok": True, "written": written}))

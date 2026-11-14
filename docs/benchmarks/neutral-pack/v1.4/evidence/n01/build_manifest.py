#!/usr/bin/env python3
"""Build MANIFEST.json and SHA256SUMS for neutral pack v1.1 the way v1's verify_pack.py reads them.

  python3 -I build_manifest.py <v1 dir> <v1.1 dir> <source commit> <frozenAt>

Every file under <v1.1 dir> except node_modules/, __pycache__/, MANIFEST.json and SHA256SUMS is
listed with bytes, SHA-256, role and origin. A file byte-identical to its v1 namesake keeps v1's
role and origin and gets fromV1 "identical"; a changed v1 file gets origin "authored-n01" and
fromV1 "amended"; a new file gets origin "authored-n01". Python 3.10+, standard library only.
"""
import hashlib, json, sys
from pathlib import Path

IGNORED = {"node_modules", "__pycache__"}
v1, v11, commit, frozen_at = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3], sys.argv[4]
old = json.loads((v1 / "MANIFEST.json").read_text(encoding="utf-8"))
old_files = {e["path"]: e for e in old["files"]}
v1_identity = hashlib.sha256((v1 / "MANIFEST.json").read_bytes()).hexdigest()

def role(path: str) -> str:
    if path == "oracle/README.md": return "oracle readme: running, adapter manifest, result format"
    if path == "oracle/adapter.schema.json": return "schema of an arm's oracle-adapter.json"
    if path == "oracle/ui-names.schema.json": return "schema of the frozen UI name list"
    if path in ("oracle/package.json", "oracle/pnpm-lock.yaml", "oracle/pnpm-workspace.yaml"): return "oracle dependency pins"
    if path.startswith("oracle/src/rows/"): return "oracle row module" if "/lib/" not in path and path != "oracle/src/rows/index.ts" else "oracle row helpers"
    if path.startswith("oracle/src/"): return "oracle component"
    if path.startswith("oracle/selftest/"): return "oracle self-test"
    if path.startswith("oracle/test/"): return "oracle unit and integration tests"
    if path.startswith("oracle/"): return "oracle tool configuration"
    if path.startswith("evidence/n01/"): return "N01 build and check evidence"
    raise SystemExit(f"no role for {path}")

files = []
for p in sorted(x for x in v11.rglob("*") if x.is_file()):
    rel = p.relative_to(v11).as_posix()
    if IGNORED.intersection(p.relative_to(v11).parts) or rel in ("MANIFEST.json", "SHA256SUMS"):
        continue
    data = p.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    entry = {"path": rel, "bytes": len(data), "sha256": digest}
    prior = old_files.get(rel)
    if prior and prior["sha256"] == digest:
        entry.update(role=prior["role"], origin=prior["origin"], fromV1="identical")
    elif prior:
        entry.update(role=prior["role"], origin="authored-n01", fromV1="amended")
    else:
        entry.update(role=role(rel), origin="authored-n01")
    files.append(entry)

missing = sorted(set(old_files) - {f["path"] for f in files})
if missing:
    raise SystemExit(f"v1 files missing from v1.1: {missing}")

manifest = {
    "pack": old["pack"],
    "version": "v1.1",
    "runId": old["runId"],
    "frozenBy": "N01 attempt 1",
    "frozenAt": frozen_at,
    "sourceRepository": old["sourceRepository"],
    "sourceCommit": commit,
    "basedOn": {"version": old["version"], "manifestSha256": v1_identity, "path": "docs/benchmarks/neutral-pack/v1/"},
    "hashAlgorithm": "sha256",
    "identity": old["identity"],
    "readAllowlist": ["docs/benchmarks/neutral-pack/v1.1/"],
    "precedence": old["precedence"],
    "amendments": [
        {"date": "2026-11-14", "decidedBy": "coordinator", "file": "frozen/decisions.md",
         "change": "Node.js 24.22.2 -> 24.21.0; container base node:24.22.2-alpine -> node:24.21.0-bookworm-slim",
         "reason": "the Jeeves generator arm A must use emits Node 24.21.0 and node:24.21.0-bookworm-slim; the arms share one runtime"},
        {"date": "2026-11-14", "decidedBy": "N01 (oracle-tooling-plan.md)", "file": "oracle/",
         "change": "adds the executable neutral oracle and evidence/n01/", "reason": "the plan's deliverable"},
    ],
    "ignoredWhenVerifying": sorted(IGNORED),
    "files": files,
    "excluded": old["excluded"],
    "outsidePackReferences": old["outsidePackReferences"],
}
text = json.dumps(manifest, indent=2, ensure_ascii=False) + "\n"
(v11 / "MANIFEST.json").write_text(text, encoding="utf-8")
identity = hashlib.sha256(text.encode("utf-8")).hexdigest()
lines = [f"{identity}  MANIFEST.json"] + [f"{f['sha256']}  {f['path']}" for f in files]
(v11 / "SHA256SUMS").write_text("\n".join(lines) + "\n", encoding="utf-8")
counts = {}
for f in files:
    key = f.get("fromV1", "new")
    counts[key] = counts.get(key, 0) + 1
print(json.dumps({"manifestSha256": identity, "files": len(files), "byOrigin": counts}))

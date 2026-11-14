"""Q02 payload manifest and backend/UI scope inventory of an extracted as-found export.

Usage: python3 -I inventory.py <extracted export> <import-graph.json> <out.json>

Categories follow the frozen QRWTY loc-method (neutral pack v1). `rawNonblankLines` counts
physical nonblank lines with comments kept: an inventory size, NOT source-loc-v2 and NOT G0.
"""
import hashlib
import json
import os
import sys

root, graph_file, out_file = sys.argv[1:4]
manifest = json.load(open(os.path.join(root, ".jeeves/manifest.json"), encoding="utf-8"))
graph = json.load(open(graph_file, encoding="utf-8"))
by_path = {f["path"]: f for f in manifest["files"]}
ident = lambda o: o.get("id") if isinstance(o, dict) else str(o)
CONFIG_CANDIDATES = {"src/features/application-bindings.ts", "src/features/local-bindings.ts"}


def category(path):
    if path.startswith(".jeeves/") or path.startswith("diagnostics/"):
        return "generator-metadata", "excluded: generator metadata"
    if path.startswith("src/") and path.endswith(".ts"):
        if path in CONFIG_CANDIDATES:
            return "backend-src", "backend src; configurationPaths candidate (YouTube v3 precedent)"
        return "backend-src", "backend src (eligible JS/TS production source under src/)"
    if path.startswith("infra/postgres/") and "/modules/" in path:
        return "product-sql", "support: product SQL (application-owned)"
    if path.startswith("infra/postgres/"):
        return "foundation-sql", "support: generated SQL"
    if path.startswith("scripts/"):
        return "scripts", "support: scripts"
    if path in ("compose.yaml", "Dockerfile", ".dockerignore", "ffmpeg-os.lock") or path.startswith("infra/"):
        return "deployment-config", "support: Docker/Compose/edge/local infrastructure config"
    if path in ("package.json", "pnpm-lock.yaml", "tsconfig.json", ".gitignore"):
        return "package-config", "excluded: manifests, lockfile and build configuration"
    if path.endswith(".md"):
        return "docs", "support: docs"
    raise SystemExit(f"unclassified: {path}")


files = []
for d, dirs, names in os.walk(root):
    dirs.sort()
    for n in sorted(names):
        p = os.path.join(d, n)
        rel = os.path.relpath(p, root)
        data = open(p, "rb").read()
        m = by_path.get(rel)
        cat, why = category(rel)
        row = {
            "path": rel,
            "bytes": len(data),
            "sha256": hashlib.sha256(data).hexdigest(),
            "ownership": m["ownership"] if m else "generator-metadata (the manifest itself)",
            "emitter": ident(m["owner"]) if m else "assembler",
            "manifestSha256Matches": (m["sha256"] == hashlib.sha256(data).hexdigest()) if m else None,
            "category": cat,
            "scopeNote": why,
            "rawNonblankLines": sum(1 for line in data.decode("utf-8").splitlines() if line.strip()),
        }
        if cat == "backend-src":
            row["reachedFromProcessEntries"] = rel not in graph["unreached"]
        files.append(row)
files.sort(key=lambda r: r["path"])

summary = {}
for r in files:
    key = (r["category"], r["ownership"])
    s = summary.setdefault(" | ".join(key), {"files": 0, "bytes": 0, "rawNonblankLines": 0})
    s["files"] += 1
    s["bytes"] += r["bytes"]
    s["rawNonblankLines"] += r["rawNonblankLines"]

payload_bytes = sum(r["bytes"] for r in files)
doc = {
    "format": "qrwty-q02-payload-manifest-v1",
    "run": "qrwty-r1-20261114",
    "unit": "Q02",
    "note": "Untouched as-found export of Jeeves project d1e59607-0616-418d-83d5-4cfe5bcb4b11 revision 83. rawNonblankLines keeps comments: an inventory size, not source-loc-v2, not G0. No template share is computed here (Q05).",
    "archive": {
        "path": "docs/evidence/q02/artifact/sha256-dcaff3aa004e3b2a04b09c2162e7b7c5295c13f4927d3ece31af9339b2a3cd14.zip",
        "sha256": "dcaff3aa004e3b2a04b09c2162e7b7c5295c13f4927d3ece31af9339b2a3cd14",
        "format": "zip-store-v1",
    },
    "manifestSha256": hashlib.sha256(open(os.path.join(root, ".jeeves/manifest.json"), "rb").read()).hexdigest(),
    "payload": {"files": len(files), "bytes": payload_bytes},
    "summaryByCategoryAndOwnership": dict(sorted(summary.items())),
    "unusedGenerated": {
        "srcUnreachedFromProcessEntries": graph["unreached"],
        "declaredDependenciesNotImportedBySrcOrScripts": ["@aws-sdk/s3-request-presigner", "@opensearch-project/opensearch", "hls.js", "zod"],
        "declaredDependenciesImportedOnlyByUnusedScripts": {"@aws-sdk/client-s3": "scripts/bootstrap.mjs (object storage bootstrap; this design has no object storage)"},
        "dockerStagesNotBuiltByCompose": ["ffmpeg", "media (CMD dist/services/media.js, which this export does not emit)"],
        "files": ["ffmpeg-os.lock"],
    },
    "files": files,
}
json.dump(doc, open(out_file, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
open(out_file, "a").write("\n")
print(json.dumps({k: v for k, v in doc.items() if k in ("payload", "manifestSha256", "summaryByCategoryAndOwnership")}, indent=1))
print("manifest hash mismatches:", [r["path"] for r in files if r["manifestSha256Matches"] is False])

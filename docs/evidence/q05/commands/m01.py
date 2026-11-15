"""Q05 M01: the untouched baseline matches the saved design, the frozen registry and its manifest;
fresh CLI exports agree with each other, and the studio's export is compared file by file.

Usage: python3 -I m01.py <app dir> <second cli export> <studio export dir> <studio preview.json>
                         <canonical design.json> <jeeves git dir> <frozen commit> <out.json>

Reads the Jeeves checkout only through `git show <frozen commit>:<path>` (no write, no run).
"""
import hashlib
import json
import os
import subprocess
import sys

app, cli2, studio, preview_file, design_file, jeeves, frozen, out = sys.argv[1:9]
sha = lambda b: hashlib.sha256(b).hexdigest()
read = lambda p: open(p, "rb").read()


def tree(root):
    files = {}
    for d, dirs, names in os.walk(root):
        dirs[:] = sorted(x for x in dirs if x not in ("node_modules", "dist", ".runtime"))
        for n in names:
            p = os.path.join(d, n)
            assert not os.path.islink(p), p
            files[os.path.relpath(p, root)] = sha(read(p))
    return dict(sorted(files.items()))


m = json.loads(read(f"{app}/.jeeves/manifest.json"))
pv = json.loads(read(preview_file))
design = read(design_file)
a, c2, st = tree(app), tree(cli2), tree(studio)
listed = {f["path"]: f for f in m["files"]}

sources = {}


def walk(o):
    if isinstance(o, dict):
        if set(o) == {"path", "sha256", "bytes"}:
            sources[o["path"]] = o["sha256"]
        for v in o.values():
            walk(v)
    elif isinstance(o, list):
        for v in o:
            walk(v)


walk(m["registry"]); walk(m["implementations"]); walk(m["files"]); walk(m["runtime"])
bad = []
for path, h in sorted(sources.items()):
    blob = subprocess.run(["git", "-C", jeeves, "show", f"{frozen}:{path}"], capture_output=True)
    if blob.returncode != 0 or sha(blob.stdout) != h:
        bad.append(path)
frozen_full = subprocess.run(["git", "-C", jeeves, "rev-parse", f"{frozen}^{{commit}}"],
                             capture_output=True, text=True).stdout.strip()

studio_manifest = json.loads(read(f"{studio}/.jeeves/manifest.json"))
differ = sorted(p for p in a if a[p] != st.get(p))
checks = {
    "app/.jeeves/inputs/design.json == canonical GET /design bytes (r84)":
        read(f"{app}/.jeeves/inputs/design.json") == design,
    "manifest input hashes == canonical design SHA-256":
        m["input"]["sourceSha256"] == m["input"]["sourceCanonicalSha256"] == sha(design),
    "every manifest-listed file is present with its recorded SHA-256":
        all(a.get(p) == f["sha256"] for p, f in listed.items()),
    "every payload file is listed, except the manifest itself":
        sorted(set(a) - set(listed)) == [".jeeves/manifest.json"],
    f"{len(sources)} generator source files named in the manifest equal their blobs at {frozen}": not bad,
    "a second fresh CLI export is identical (paths and SHA-256)": a == c2,
    "studio export has the same paths": sorted(a) == sorted(st),
    "studio export's input design.json is the same bytes":
        st[".jeeves/inputs/design.json"] == a[".jeeves/inputs/design.json"],
    "studio export selects the same templates":
        sorted(json.dumps(t, sort_keys=True) for t in m["templates"])
        == sorted(json.dumps(t, sort_keys=True) for t in studio_manifest["templates"]),
    "studio preview's manifest SHA-256 == its ZIP's manifest":
        pv["archive"]["manifestSha256"] == st[".jeeves/manifest.json"],
}
record = {
    "frozenCommit": frozen_full,
    "manifestSha256": a[".jeeves/manifest.json"],
    "registrySha256": {"cli": m["registry"]["sha256"], "studio": studio_manifest["registry"]["sha256"]},
    "files": {"app": len(a), "manifestListed": len(listed)},
    "ownership": {k: sum(1 for f in m["files"] if f["ownership"] == k)
                  for k in sorted({f["ownership"] for f in m["files"]})},
    "checks": checks,
    "mismatchedSources": bad,
    "studioDiffers": differ,
    "studioIdentical": len(a) - len(differ),
}
with open(out, "w") as f:
    f.write(json.dumps(record, indent=1) + "\n")
print(json.dumps({k: record[k] for k in ("frozenCommit", "checks", "studioDiffers")}, indent=1))
sys.exit(0 if all(checks.values()) else 1)

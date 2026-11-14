"""M01 identity checks of the as-found export against the saved design, Q01 provenance and Jeeves HEAD."""
import hashlib, json, subprocess, sys
exp, preview_file, prov_file, design_file, jeeves = sys.argv[1:6]
sha = lambda b: hashlib.sha256(b).hexdigest()
m = json.load(open(f"{exp}/.jeeves/manifest.json"))
pv = json.load(open(preview_file)); prov = json.load(open(prov_file))
design_bytes = open(design_file, "rb").read()
inp = open(f"{exp}/.jeeves/inputs/design.json", "rb").read()
checks = {
  "inputs/design.json == canonical GET /design bytes": inp == design_bytes,
  "manifest input.sourceSha256 == a3c978d1 (Q01 canonical)": m["input"]["sourceSha256"] == prov["source"]["canonicalSha256"] == sha(design_bytes),
  "manifest input.sourceCanonicalSha256 == Q01": m["input"]["sourceCanonicalSha256"] == prov["source"]["canonicalSha256"],
  "manifest input.normalizedInputSha256 == Q01": m["input"]["normalizedInputSha256"] == prov["source"]["normalizedInputSha256"],
  "registry sha256 == Q01 == preview": m["registry"]["sha256"] == prov["registry"]["sha256"] == pv["registry"]["sha256"],
  "runtime == Q01": m["runtime"] == prov["registry"]["runtime"],
  "generator == Q01": m["generator"] == prov["registry"]["generator"],
  "templates == Q01 selectedTemplates": sorted(json.dumps(t, sort_keys=True) for t in m["templates"]) == sorted(json.dumps(t, sort_keys=True) for t in prov["registry"]["selectedTemplates"]),
  "manifest.json sha256 == preview manifestSha256 == Q01": sha(open(f"{exp}/.jeeves/manifest.json", "rb").read()) == pv["archive"]["manifestSha256"] == prov["export"]["archive"]["manifestSha256"],
}
# Every generator source file named anywhere in the manifest equals its blob at Jeeves HEAD.
sources = {}
def walk(o):
    if isinstance(o, dict):
        # A generator source row is exactly {bytes, path, sha256}; export file rows also carry
        # ownership/contributors. Jeeves's root pnpm-lock.yaml is one of the sources.
        if set(o) == {"path", "sha256", "bytes"}:
            sources[o["path"]] = o["sha256"]
        for v in o.values(): walk(v)
    elif isinstance(o, list):
        for v in o: walk(v)
walk(m["registry"]); walk(m["implementations"]); walk(m["files"]); walk(m["runtime"])
bad = []
for path, h in sorted(sources.items()):
    blob = subprocess.run(["git", "-C", jeeves, "show", f"HEAD:{path}"], capture_output=True)
    if blob.returncode != 0 or sha(blob.stdout) != h: bad.append(path)
checks[f"{len(sources)} generator source files in the manifest equal their blobs at Jeeves HEAD"] = not bad
head = subprocess.run(["git", "-C", jeeves, "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
print(json.dumps({"jeevesHead": head, "checks": checks, "mismatchedSources": bad}, indent=1))
sys.exit(0 if all(checks.values()) else 1)

"""Publish dates of every package in pnpm-lock.yaml (direct and transitive), from the npm registry."""
import json, re, sys, urllib.request, concurrent.futures, datetime
lock = open(sys.argv[1], encoding="utf-8").read()
pkgs = set()
for part in lock.split("\npackages:\n")[1:]:
    section = part.split("\nsnapshots:\n", 1)[0]
    pkgs |= set(re.findall(r"^  '?((?:@[^/@\s]+/)?[^@\s']+)@([^:'\s(]+)'?:\s*$", section, re.M))
pkgs = sorted(pkgs)
def fetch(item):
    name, version = item
    url = "https://registry.npmjs.org/" + name.replace("/", "%2F")
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.load(r)
    return name, version, data.get("time", {}).get(version)
rows = []
with concurrent.futures.ThreadPoolExecutor(8) as pool:
    for name, version, published in pool.map(fetch, pkgs):
        rows.append({"name": name, "version": version, "published": published})
cutoff = datetime.datetime(2026, 10, 31, tzinfo=datetime.timezone.utc)
for r in rows:
    p = datetime.datetime.fromisoformat(r["published"].replace("Z", "+00:00")) if r["published"] else None
    r["atLeast14Days"] = bool(p and p <= cutoff)
json.dump({"checkedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"), "cutoff": "2026-10-31T23:59:59Z (14 days before 2026-11-14)", "packages": rows}, sys.stdout, indent=2)

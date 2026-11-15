"""A8: group the committed runner's per-file rows (source-loc-v2.json) by backend area, and split
product SQL into its generated header and written lines (nonblank physical lines, comments kept).

  python3 -I areas.py <source-loc-v2.json> <baseline repo> <baseline commit> <final repo> <final commit>

Areas follow tiles and module folders, as S02's B areas follow B's folders.
"""
import collections, json, subprocess, sys

report_file, base_repo, base_commit, final_repo, final_commit = sys.argv[1:6]
report = json.load(open(report_file))

def area(path):
    if path == "src/modules/session-api/session/client-address.ts":
        return "abuse"  # A6's admission key (the client's network, signed by the Worker)
    if path.startswith("src/runtime/") or path.startswith("src/features/"):
        return "platform"
    if path.startswith("src/processes/") or path in ("src/modules/entry.ts", "src/modules/dependencies.ts"):
        return "process-entry-points"
    m = path.split("/")
    tile, rest = m[2], "/".join(m[3:])
    if tile == "session-api" or (tile == "account-api" and "my-links" in rest):
        return "sessions-and-accounts"
    if tile == "account-api" and "link-analytics" in rest or tile == "analytics-worker":
        return "analytics"
    if tile == "link-api" and "abuse-and-moderation" in rest:
        return "abuse"
    if tile == "link-api" and "link-operations" in rest:
        return "links"
    if tile == "redirect-service":
        return "redirect"
    if tile == "billing-api":
        return "billing"
    raise SystemExit(f"unmapped: {path}")

rows = collections.defaultdict(lambda: collections.Counter())
for f in report["included"]:
    a = area(f["path"])
    rows[a]["files"] += 1
    for k_in, k_out in (("baselineLoc", "G0"), ("retainedTemplateLoc", "R"), ("postTemplateLoc", "C"),
                        ("removedOrReplacedTemplateLoc", "D"), ("finalLoc", "B")):
        rows[a][k_out] += f[k_in]
total = sum(rows.values(), collections.Counter())

def show(repo, commit, path):
    r = subprocess.run(["git", "-C", repo, "show", f"{commit}:{path}"], capture_output=True)
    return r.stdout.decode() if r.returncode == 0 else None

nonblank = lambda text: [l for l in text.splitlines() if l.strip()]
manifest = json.loads(show(base_repo, base_commit, "app/.jeeves/manifest.json"))
sql = {}
for f in manifest["files"]:
    if not f["path"].endswith(".sql"):
        continue
    before = nonblank(show(base_repo, base_commit, f"app/{f['path']}") or "")
    after = nonblank(show(final_repo, final_commit, f"app/{f['path']}") or "")
    sql[f["path"]] = {"ownership": f["ownership"], "baselineLines": len(before), "finalLines": len(after),
                      "baselineIsPrefix": after[: len(before)] == before,
                      "written": len(after) - len(before)}
out = {
    "report": {"baselineCommit": report["baselineCommit"], "finalCommit": report["finalCommit"]},
    "byArea": {k: dict(v) for k, v in sorted(rows.items())},
    "total": dict(total),
    "sql": {"files": sql,
            "total": sum(v["finalLines"] for v in sql.values()),
            "generatedHeadersAndFoundation": sum(v["baselineLines"] for v in sql.values()),
            "written": sum(v["written"] for v in sql.values())},
}
print(json.dumps(out, indent=1))

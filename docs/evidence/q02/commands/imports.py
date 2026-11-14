import os, re, sys, json
root = sys.argv[1]
src = os.path.join(root, "src")
files = sorted(os.path.relpath(os.path.join(d, f), root) for d, _, fs in os.walk(src) for f in fs if f.endswith(".ts"))
rx = re.compile(r"""(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s+['"]([^'"]+)['"]""")
graph, pkgs = {}, {}
for f in files:
    text = open(os.path.join(root, f), encoding="utf-8").read()
    deps, ext = [], []
    for m in rx.finditer(text):
        spec = next(g for g in m.groups() if g)
        if spec.startswith("."):
            deps.append(os.path.normpath(os.path.join(os.path.dirname(f), spec)))
        else:
            ext.append(spec)
    graph[f], pkgs[f] = deps, sorted(set(ext))
entries = [f for f in files if f.startswith("src/processes/")]
seen, todo = set(), list(entries)
while todo:
    f = todo.pop()
    if f in seen: continue
    seen.add(f); todo += [d for d in graph.get(f, []) if d in graph]
unreached = [f for f in files if f not in seen]
used_pkgs = sorted({p.split("/")[0] if not p.startswith("@") else "/".join(p.split("/")[:2]) for f in seen for p in pkgs[f] if not p.startswith("node:")})
all_pkgs = sorted({p.split("/")[0] if not p.startswith("@") else "/".join(p.split("/")[:2]) for f in files for p in pkgs[f] if not p.startswith("node:")})
deps = json.load(open(os.path.join(root, "package.json")))["dependencies"]
print(json.dumps({"tsFiles": len(files), "reachedFromProcesses": len(seen), "unreached": unreached,
                  "packagesImportedByReached": used_pkgs, "packagesImportedAnywhere": all_pkgs,
                  "declaredDependenciesNeverImported": sorted(set(deps) - set(all_pkgs))}, indent=1))

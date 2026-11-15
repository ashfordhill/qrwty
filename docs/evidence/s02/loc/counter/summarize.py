"""S02: summarize count-tree.mts's rows into the README's numbers (writes summary.json beside it).

  python3 -I summarize.py <dir holding b-f2fb3ce.json, b-4961ac2.json and a-a6f982b.json>
"""
import collections, json, os, sys

here = sys.argv[1]
load = lambda name: json.load(open(os.path.join(here, name)))
b, b03, a = load("b-f2fb3ce.json"), load("b-4961ac2.json"), load("a-a6f982b.json")

def total(rows):
    return {"files": len(rows), "lines": sum(r["lines"] for r in rows)}

def by(rows, key):
    out = collections.defaultdict(list)
    for r in rows:
        out[key(r)].append(r)
    return {k: total(v) for k, v in sorted(out.items())}

rows = b["rows"]
cat = lambda c: [r for r in rows if r["category"] == c]
infra = cat("infrastructure")
b_summary = {
    "commit": b["commit"],
    "backendSource": {**total(cat("backend-source")), "byArea": by(cat("backend-source"), lambda r: r["area"])},
    "configurationSourceExcludedBySourceLocV2": {**total(cat("configuration-source-excluded")),
        "paths": [r["path"] for r in cat("configuration-source-excluded")],
        "why": "source-loc-v2 excludes any path with a directory named config (exclusionReason: configuration-or-build)"},
    "tests": {**total(cat("tests")), "appTest": total([r for r in cat("tests") if r["path"].startswith("app/test/")]),
              "srcTestFiles": total([r for r in cat("tests") if r["path"].startswith("app/src/")])},
    "sql": total(cat("sql")),
    "infrastructure": {**total(infra), "byFolder": by(infra, lambda r: r["area"]), "byExtension": by(infra, lambda r: r["ext"]),
                       "withoutJson": total([r for r in infra if r["ext"] != ".json"])},
    "appBuildAndContainer": total(cat("app-deployment-and-scripts") + cat("app-package-and-build-config")),
    "ui": total(cat("ui")),
}

# Like for like: guest link creation.
b03rows = {r["path"]: r for r in b03["rows"]}
b03_links = ["app/src/links/create.ts", "app/src/links/destination.ts", "app/src/links/idempotency.ts",
             "app/src/links/link-errors.ts", "app/src/links/model.ts", "app/src/links/routes.ts", "app/src/links/tokens.ts"]
b03_facade = ["app/src/session/guest.ts", "app/src/session/forward.ts", "app/src/session/routes.ts",
              "app/src/edge/routing.ts", "app/src/platform/http/edge-auth.ts"]
arows = {r["path"]: r for r in a["rows"]}
like = {
    "B (B03, 4961ac2)": {
        "createCode": {p: b03rows[p]["lines"] for p in b03_links},
        "createCodeLines": sum(b03rows[p]["lines"] for p in b03_links),
        "sql": {"app/migrations/links/0002_guest_links.sql": b03rows["app/migrations/links/0002_guest_links.sql"]["lines"]},
        "guestSessionAndEdgeFacade": {p: b03rows[p]["lines"] for p in b03_facade},
        "guestSessionAndEdgeFacadeLines": sum(b03rows[p]["lines"] for p in b03_facade),
        "laterWebRiskAdapter (B06, f2fb3ce)": {"app/src/links/reputation.ts": {r["path"]: r for r in rows}["app/src/links/reputation.ts"]["lines"]},
    },
    "A (Q06; C from the committed runner, docs/evidence/q06/loc/summary.json)": {
        "C": 720,
        "sqlWritten": arows["app/infra/postgres/links/modules/link-api-link-operations.sql"]["lines"] - 17,
        "sqlNote": "link-api-link-operations.sql: 303 nonblank lines at a6f982b (unchanged since Q06) minus its 17-line generated header",
        "webRiskAdapter": 53,
    },
    "mapping": "A's C is Link API's guest create (the stub body and link-operations/, 10 files). B's counterpart is the seven app/src/links/ files B03 added, counted at B03's commit. B03's guest session and edge forwarding have no counterpart in A, which never wrote Session API (Q07). A's slice includes a Web Risk check that B added later, in B06.",
}

a_infra = [r for r in a["rows"] if r["category"] == "infrastructure"]
a_summary = {
    "commit": a["commit"],
    "rootInfra": {**total(a_infra), "byFolder": by(a_infra, lambda r: r["area"]),
                  "withoutAppOverlay": total([r for r in a_infra if not r["path"].startswith("infra/app-overlay/")]),
                  "withoutAppOverlayOrJson": total([r for r in a_infra if not r["path"].startswith("infra/app-overlay/") and r["ext"] != ".json"]),
                  "note": "infra/app-overlay/ is installed into app/ (install-overlay.py), so app/'s own counts already hold it"},
    "tests": total([r for r in a["rows"] if r["category"] == "tests"]),
}
out = {"method": "count-tree.mts: Git objects only; JS/TS by source-loc-v2's pinned parser (codeLines) and eligibility (exclusionReason) from the frozen runner copy of Jeeves 4e87f97; other files nonblank physical lines, comments kept",
       "b": b_summary, "likeForLike": like, "a": a_summary}
json.dump(out, open(os.path.join(here, "summary.json"), "w"), indent=1)
print(json.dumps(out, indent=1))

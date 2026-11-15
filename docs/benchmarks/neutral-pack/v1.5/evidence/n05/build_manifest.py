#!/usr/bin/env python3
"""Build MANIFEST.json and SHA256SUMS for neutral pack v1.5 (unit N05).

  python3 -I build_manifest.py <neutral-pack dir> <source commit> <frozenAt>

<neutral-pack dir> holds v1/ to v1.5/. The algorithm is N04's (evidence/n04/build_manifest.py)
with v1.4 as the base. Every file under v1.5/ except node_modules/, __pycache__/, MANIFEST.json
and SHA256SUMS is listed with bytes, SHA-256, role and origin. A file identical to its v1.4 entry
keeps v1.4's role and origin; a changed file keeps its role and gets origin "authored-n05". Q11's
design files under files/docs/design/ are copies: origin {copyOf, commit} names the QRWTY file and
commit they were copied from (verify_pack.py --against-git compares them). Other new files get
origin "authored-n05". fromV1 to fromV1.4 are present when that version's manifest lists the path:
"identical" when the hash is the same, otherwise "amended".

It refuses a change outside the expected set, a new file outside files/docs/design/ and
evidence/n05/ other than the new unit test, a design file that is not in the expected list, and a
v1.4 file that is missing. Python 3.10+, standard library only.
"""
import hashlib
import json
import sys
from pathlib import Path

IGNORED = {"node_modules", "__pycache__"}
Q11_COMMIT = "d67f5fe52fddaf7fca5cf086556b888556502886"
DESIGN_PREFIX = "files/docs/design/"
DESIGN_FILES = {
    "README.md": "Q11 design README",
    "accessible-names.md": "frozen accessible names (rules and table)",
    "accessible-names.json": "frozen accessible-name list (read by the oracle's browser rows)",
    "prototype/index.html": "Q11 clickable prototype",
    "prototype/app.css": "Q11 clickable prototype",
    "prototype/app.js": "Q11 clickable prototype",
    "prototype/qr.js": "Q11 clickable prototype",
    "prototype/tokens.css": "Q11 token sheet",
    "qr-export/qrwty-7Hq2xP9kLm.png": "Q11 QR export sample (png)",
    "qr-export/qrwty-7Hq2xP9kLm.svg": "Q11 QR export sample (svg)",
}
UI_NAMES = {
    "oracle/src/runner.ts",
    "oracle/src/cli.ts",
    "oracle/src/browser/names.ts",
    "oracle/ui-names.schema.json",
}
ONE_SKIN = {f"oracle/src/rows/U0{n}.ts" for n in range(2, 9)} | {
    "frozen/acceptance-oracle.md",
    "b/execution-brief.md",
}
BUILD_LABEL = {"oracle/package.json", "oracle/README.md"}
CHANGED = UI_NAMES | ONE_SKIN | BUILD_LABEL | {"README.md", "frozen/decisions.md"}
NEW_FILES = {"oracle/test/ui-names.test.ts": "oracle unit and integration tests"}
NEW_PREFIX = "evidence/n05/"

packs, commit, frozen_at = Path(sys.argv[1]), sys.argv[2], sys.argv[3]
here, base = packs / "v1.5", packs / "v1.4"


def load(version: str) -> tuple[dict, dict[str, dict]]:
    manifest = json.loads((packs / version / "MANIFEST.json").read_text(encoding="utf-8"))
    return manifest, {e["path"]: e for e in manifest["files"]}


old, old_files = load("v1.4")
earlier = {
    "fromV1": load("v1")[1],
    "fromV1.1": load("v1.1")[1],
    "fromV1.2": load("v1.2")[1],
    "fromV1.3": load("v1.3")[1],
    "fromV1.4": old_files,
}
base_identity = hashlib.sha256((base / "MANIFEST.json").read_bytes()).hexdigest()

files, changed, errors = [], set(), []
for p in sorted(x for x in here.rglob("*") if x.is_file()):
    rel = p.relative_to(here).as_posix()
    if IGNORED.intersection(p.relative_to(here).parts) or rel in ("MANIFEST.json", "SHA256SUMS"):
        continue
    data = p.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    entry = {"path": rel, "bytes": len(data), "sha256": digest}
    prior = old_files.get(rel)
    if prior and prior["sha256"] == digest:
        entry.update(role=prior["role"], origin=prior["origin"])
    elif prior:
        changed.add(rel)
        entry.update(role=prior["role"], origin="authored-n05")
    elif rel.startswith(DESIGN_PREFIX):
        name = rel[len(DESIGN_PREFIX) :]
        if name in DESIGN_FILES:
            entry.update(
                role=DESIGN_FILES[name],
                origin={"copyOf": f"docs/design/{name}", "commit": Q11_COMMIT},
            )
        else:
            errors.append(f"unexpected design file: {rel}")
    elif rel in NEW_FILES:
        entry.update(role=NEW_FILES[rel], origin="authored-n05")
    elif rel.startswith(NEW_PREFIX):
        entry.update(role="N05 build and check evidence", origin="authored-n05")
    else:
        errors.append(f"new file outside {DESIGN_PREFIX} and {NEW_PREFIX}: {rel}")
    for key, listed in earlier.items():
        if rel in listed:
            entry[key] = "identical" if listed[rel]["sha256"] == digest else "amended"
    files.append(entry)

paths = {f["path"] for f in files}
missing = sorted(set(old_files) - paths)
if missing:
    errors.append(f"v1.4 files missing from v1.5: {missing}")
absent = sorted(
    (set(NEW_FILES) | {DESIGN_PREFIX + name for name in DESIGN_FILES}) - paths
)
if absent:
    errors.append(f"expected new files missing: {absent}")
if changed != CHANGED:
    errors.append(
        f"changed set differs: unexpected={sorted(changed - CHANGED)} unchanged={sorted(CHANGED - changed)}"
    )
if errors:
    raise SystemExit("refused:\n  " + "\n  ".join(errors))

amendments = old["amendments"] + [
    {
        "version": "v1.5",
        "date": "2026-11-15",
        "decidedBy": "coordinator, for both arms (unit N05)",
        "file": "files/docs/design/accessible-names.json, oracle/src/runner.ts, oracle/src/cli.ts, frozen/acceptance-oracle.md",
        "change": "the frozen accessible-name list: Q11's docs/design/accessible-names.json (version q11-2026-11-14.1, commit d67f5fe) copied byte for byte to files/docs/design/accessible-names.json; before any row the oracle loads it from there (FROZEN_UI_NAMES_PATH) and validates it against oracle/ui-names.schema.json; the browser rows (A01, A04's browser step, U02-U08) use it and each result records its version and SHA-256 in environment.uiNames; the CLI refuses --ui-names, so no arm supplies its own list; only the self-test keeps its double-only list; new unit test oracle/test/ui-names.test.ts; oracle build 1.5.0, results report pack v1.5",
        "reason": "acceptance-oracle section 6 freezes the name list in the pack amendment that carries Q11's design assets; until v1.5 the browser rows were blocked unless the arm passed a list of its own",
    },
    {
        "version": "v1.5",
        "date": "2026-11-15",
        "decidedBy": "coordinator, for both arms (unit N05)",
        "file": "files/docs/design/",
        "change": "Q11's design deliverables copied byte for byte from commit d67f5fe: the design README, accessible-names.md, the token sheet and clickable prototype (prototype/), and the QR export sample (qr-export/); Q11's screenshots and evidence (docs/evidence/q11/) are not copied, and the README's two links to them are declared outside the pack",
        "reason": "both arms build their UI from the same frozen copy of the design",
    },
    {
        "version": "v1.5",
        "date": "2026-11-15",
        "decidedBy": "owner (owner decisions section 11); coordinator, for both arms (unit N05)",
        "file": "frozen/acceptance-oracle.md, frozen/decisions.md, b/execution-brief.md, oracle/src/rows/U02.ts-U08.ts, oracle/README.md",
        "change": "one skin: acceptance-oracle section 6, decisions sections 1, 2 and 7-10, the B execution brief and the U rows' scope labels say one skin x light/dark x desktop/mobile; decisions section 2 quotes owner decisions section 11, which replaces section 5 of the pack's copy of the owner decisions; no row's checks change (the U rows run each skin the adapter lists, and the adapter lists one)",
        "reason": "the owner replaced the two skins with one (owner decisions section 11, 2026-11-14 night, QRWTY commit 3f9e0d3)",
    },
]

excluded = old["excluded"] + [
    {
        "category": "Q11 screenshots and evidence: docs/evidence/q11/",
        "present": True,
        "reason": "check records and screenshots of Q11's work, not design inputs; only Q11's design deliverables (docs/design/) are copied",
    },
]
outside = old["outsidePackReferences"] + [
    {
        "from": "files/docs/design/README.md",
        "target": "../evidence/q11/checks.md",
        "reason": "excluded Q11 evidence (screenshots, the mouse walkthrough and the check scripts)",
    },
    {
        "from": "files/docs/design/README.md",
        "target": "../evidence/q11/contrast.md",
        "reason": "excluded Q11 evidence (the contrast table)",
    },
]

manifest = {
    "pack": old["pack"],
    "version": "v1.5",
    "runId": old["runId"],
    "frozenBy": "N05 attempt 1",
    "frozenAt": frozen_at,
    "sourceRepository": old["sourceRepository"],
    "sourceCommit": commit,
    "basedOn": {
        "version": old["version"],
        "manifestSha256": base_identity,
        "path": "docs/benchmarks/neutral-pack/v1.4/",
    },
    "hashAlgorithm": old["hashAlgorithm"],
    "identity": old["identity"],
    "readAllowlist": ["docs/benchmarks/neutral-pack/v1.5/"],
    "precedence": old["precedence"],
    "amendments": amendments,
    "ignoredWhenVerifying": sorted(IGNORED),
    "files": files,
    "excluded": excluded,
    "outsidePackReferences": outside,
}
text = json.dumps(manifest, indent=2, ensure_ascii=False) + "\n"
(here / "MANIFEST.json").write_text(text, encoding="utf-8")
identity = hashlib.sha256(text.encode("utf-8")).hexdigest()
lines = [f"{identity}  MANIFEST.json"] + [f"{f['sha256']}  {f['path']}" for f in files]
(here / "SHA256SUMS").write_text("\n".join(lines) + "\n", encoding="utf-8")
counts: dict[str, int] = {}
for f in files:
    key = f.get("fromV1.4", "new")
    counts[key] = counts.get(key, 0) + 1
print(json.dumps({"manifestSha256": identity, "files": len(files), "fromV1.4": counts}))

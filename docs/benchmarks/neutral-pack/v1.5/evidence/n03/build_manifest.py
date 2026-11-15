#!/usr/bin/env python3
"""Build MANIFEST.json and SHA256SUMS for neutral pack v1.3 (unit N03).

  python3 -I build_manifest.py <neutral-pack dir> <source commit> <frozenAt>

<neutral-pack dir> holds v1/, v1.1/, v1.2/ and v1.3/. The algorithm is N01's
(evidence/n01/build_manifest.py) with v1.2 as the base. Every file under v1.3/ except
node_modules/, __pycache__/, MANIFEST.json and SHA256SUMS is listed with bytes, SHA-256, role and
origin. A file identical to its v1.2 entry keeps v1.2's role and origin; a changed file keeps its
role and gets origin "authored-n03"; a new file gets origin "authored-n03". fromV1, fromV1.1 and
fromV1.2 are present when that version's manifest lists the path: "identical" when the hash is
the same, otherwise "amended".

It refuses a change outside the expected set, a new file outside evidence/n03/, a v1.2 file that
is missing, and a rewritten-only file that differs from v1.2's working-tree copy (the bytes the
2026-11-14 history rewrite left). Python 3.10+, standard library only.
"""
import hashlib
import json
import sys
from pathlib import Path

IGNORED = {"node_modules", "__pycache__"}
REWRITTEN = {
    "oracle/selftest/double.ts",
    "oracle/src/fixtures/stripe-signer.ts",
    "oracle/test/stripe.test.ts",
    "oracle/test/observe.test.ts",
}
A06_FIX = {
    "oracle/src/rows/A06.ts",
    "oracle/selftest/cases.ts",
    "oracle/selftest/double.ts",
    "oracle/src/runner.ts",
    "oracle/package.json",
    "oracle/README.md",
}
CHANGED = REWRITTEN | A06_FIX | {"README.md", "frozen/decisions.md"}
REWRITE_ONLY = REWRITTEN - A06_FIX
NEW_PREFIX = "evidence/n03/"

packs, commit, frozen_at = Path(sys.argv[1]), sys.argv[2], sys.argv[3]
here, base = packs / "v1.3", packs / "v1.2"


def load(version: str) -> tuple[dict, dict[str, dict]]:
    manifest = json.loads((packs / version / "MANIFEST.json").read_text(encoding="utf-8"))
    return manifest, {e["path"]: e for e in manifest["files"]}


old, old_files = load("v1.2")
earlier = {"fromV1": load("v1")[1], "fromV1.1": load("v1.1")[1], "fromV1.2": old_files}
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
        entry.update(role=prior["role"], origin="authored-n03")
        if rel in REWRITE_ONLY and data != (base / rel).read_bytes():
            errors.append(f"{rel} differs from v1.2's working-tree copy")
    elif rel.startswith(NEW_PREFIX):
        entry.update(role="N03 build and check evidence", origin="authored-n03")
    else:
        errors.append(f"new file outside {NEW_PREFIX}: {rel}")
    for key, listed in earlier.items():
        if rel in listed:
            entry[key] = "identical" if listed[rel]["sha256"] == digest else "amended"
    files.append(entry)

missing = sorted(set(old_files) - {f["path"] for f in files})
if missing:
    errors.append(f"v1.2 files missing from v1.3: {missing}")
if changed != CHANGED:
    errors.append(
        f"changed set differs: unexpected={sorted(changed - CHANGED)} unchanged={sorted(CHANGED - changed)}"
    )
if errors:
    raise SystemExit("refused:\n  " + "\n  ".join(errors))

amendments = old["amendments"] + [
    {
        "version": "v1.3",
        "date": "2026-11-14",
        "decidedBy": "owner (history rewrite); coordinator, for both arms (unit N03)",
        "file": ", ".join(sorted(REWRITTEN)),
        "change": "five Stripe-key-shaped test literals are string concatenations with the same runtime values, as the 2026-11-14 history rewrite left them; the manifest is regenerated so every file verifies",
        "reason": "GitHub push protection rejected the literals; after the rewrite these four files no longer match the v1.1 and v1.2 manifests, so v1.3 supersedes both",
    },
    {
        "version": "v1.3",
        "date": "2026-11-14",
        "decidedBy": "coordinator, for both arms (unit N03)",
        "file": "oracle/src/rows/A06.ts",
        "change": "the check 'invalid session cookie on create' sends a present but invalid cookie: the cookie names are read once after sign-in, the revoked-session actor gets a copy of the jar, the garbage actor has its own jar with every name set to a value the arm never issued and gets the CSRF token directly, and the check fails when no cookie name was sent; new self-test case A06-unknown-cookie (double mode a06-unknown-cookie-guest) must be reported failed; oracle build 1.3.0, results report pack v1.3; frozen/decisions.md section 11 records it",
        "reason": "A06 gave the revoked-session actor the original jar by reference; an arm that clears the revoked cookie in its 401 emptied it, so the garbage create carried no cookie (cookieNames: []) and the check proved nothing",
    },
]

manifest = {
    "pack": old["pack"],
    "version": "v1.3",
    "runId": old["runId"],
    "frozenBy": "N03 attempt 1",
    "frozenAt": frozen_at,
    "sourceRepository": old["sourceRepository"],
    "sourceCommit": commit,
    "basedOn": {
        "version": old["version"],
        "manifestSha256": base_identity,
        "path": "docs/benchmarks/neutral-pack/v1.2/",
    },
    "hashAlgorithm": old["hashAlgorithm"],
    "identity": old["identity"],
    "readAllowlist": ["docs/benchmarks/neutral-pack/v1.3/"],
    "precedence": old["precedence"],
    "amendments": amendments,
    "ignoredWhenVerifying": sorted(IGNORED),
    "files": files,
    "excluded": old["excluded"],
    "outsidePackReferences": old["outsidePackReferences"],
}
text = json.dumps(manifest, indent=2, ensure_ascii=False) + "\n"
(here / "MANIFEST.json").write_text(text, encoding="utf-8")
identity = hashlib.sha256(text.encode("utf-8")).hexdigest()
lines = [f"{identity}  MANIFEST.json"] + [f"{f['sha256']}  {f['path']}" for f in files]
(here / "SHA256SUMS").write_text("\n".join(lines) + "\n", encoding="utf-8")
counts: dict[str, int] = {}
for f in files:
    key = f.get("fromV1.2", "new")
    counts[key] = counts.get(key, 0) + 1
print(json.dumps({"manifestSha256": identity, "files": len(files), "fromV1.2": counts}))

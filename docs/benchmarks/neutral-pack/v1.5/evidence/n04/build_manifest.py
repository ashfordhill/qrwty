#!/usr/bin/env python3
"""Build MANIFEST.json and SHA256SUMS for neutral pack v1.4 (unit N04).

  python3 -I build_manifest.py <neutral-pack dir> <source commit> <frozenAt>

<neutral-pack dir> holds v1/, v1.1/, v1.2/, v1.3/ and v1.4/. The algorithm is N03's
(evidence/n03/build_manifest.py) with v1.3 as the base. Every file under v1.4/ except
node_modules/, __pycache__/, MANIFEST.json and SHA256SUMS is listed with bytes, SHA-256, role and
origin. A file identical to its v1.3 entry keeps v1.3's role and origin; a changed file keeps its
role and gets origin "authored-n04"; a new file gets origin "authored-n04". fromV1, fromV1.1,
fromV1.2 and fromV1.3 are present when that version's manifest lists the path: "identical" when
the hash is the same, otherwise "amended".

It refuses a change outside the expected set, a new file outside evidence/n04/ other than the new
timing test, and a v1.3 file that is missing. Python 3.10+, standard library only.
"""
import hashlib
import json
import sys
from pathlib import Path

IGNORED = {"node_modules", "__pycache__"}
F01_F06 = {
    "oracle/src/rows/F01.ts",
    "oracle/src/rows/F06.ts",
    "oracle/adapter.schema.json",
    "oracle/src/types.ts",
    "oracle/src/adapter.ts",
    "oracle/src/client/raw.ts",
    "oracle/src/client/client.ts",
    "oracle/selftest/cases.ts",
    "oracle/selftest/double.ts",
    "oracle/selftest/run.ts",
    "oracle/test/adapter.test.ts",
    "frozen/acceptance-oracle.md",
}
MONOTONIC = {
    "oracle/src/rows/lib/flows.ts",
    "oracle/src/faults/commands.ts",
    "oracle/src/fixtures/stripe.ts",
    "oracle/src/rows/A01.ts",
    "oracle/src/rows/A07.ts",
    "oracle/src/rows/A11.ts",
    "oracle/src/rows/A13.ts",
    "oracle/src/rows/A15.ts",
    "oracle/src/rows/A16.ts",
    "oracle/src/rows/A23.ts",
    "oracle/src/rows/F02.ts",
    "oracle/src/rows/F03.ts",
    "oracle/test/rows.test.ts",
    "oracle/test/fixtures.test.ts",
}
BUILD_LABEL = {"oracle/src/runner.ts", "oracle/package.json", "oracle/README.md"}
CHANGED = F01_F06 | MONOTONIC | BUILD_LABEL | {"README.md", "frozen/decisions.md"}
NEW_FILES = {"oracle/test/timing.test.ts": "oracle unit and integration tests"}
NEW_PREFIX = "evidence/n04/"

packs, commit, frozen_at = Path(sys.argv[1]), sys.argv[2], sys.argv[3]
here, base = packs / "v1.4", packs / "v1.3"


def load(version: str) -> tuple[dict, dict[str, dict]]:
    manifest = json.loads((packs / version / "MANIFEST.json").read_text(encoding="utf-8"))
    return manifest, {e["path"]: e for e in manifest["files"]}


old, old_files = load("v1.3")
earlier = {
    "fromV1": load("v1")[1],
    "fromV1.1": load("v1.1")[1],
    "fromV1.2": load("v1.2")[1],
    "fromV1.3": old_files,
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
        entry.update(role=prior["role"], origin="authored-n04")
    elif rel in NEW_FILES:
        entry.update(role=NEW_FILES[rel], origin="authored-n04")
    elif rel.startswith(NEW_PREFIX):
        entry.update(role="N04 build and check evidence", origin="authored-n04")
    else:
        errors.append(f"new file outside {NEW_PREFIX}: {rel}")
    for key, listed in earlier.items():
        if rel in listed:
            entry[key] = "identical" if listed[rel]["sha256"] == digest else "amended"
    files.append(entry)

missing = sorted(set(old_files) - {f["path"] for f in files})
if missing:
    errors.append(f"v1.3 files missing from v1.4: {missing}")
absent = sorted(set(NEW_FILES) - {f["path"] for f in files})
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
        "version": "v1.4",
        "date": "2026-11-14",
        "decidedBy": "coordinator, for both arms (unit N04)",
        "file": "oracle/src/rows/F01.ts, oracle/adapter.schema.json, frozen/acceptance-oracle.md",
        "change": "new fault point clear-route-caches, declared in the adapter's new faultPoints list: the named replica drops every per-process route-cache entry and leaves the shared cache and the database alone; a replica without one does nothing and reports success; F01 runs it on every replica right after injecting each Valkey fault and before that fault's hot redirects, and is blocked with 'adapter has no clear-route-caches fault point' when it is not declared; 'no stampede' passes at most max(2 x redirect replicas, 0.1 x hot requests) database queries per fault; new self-test case F01-inprocess-stampede must be reported failed",
        "reason": "a per-process route cache in each replica served the hot slug through the whole Valkey fault, so the database fallback and the stampede bound were never exercised; v1.3's bound of 2 queries per request grew with the traffic and passed a one-query-per-request fallback",
    },
    {
        "version": "v1.4",
        "date": "2026-11-14",
        "decidedBy": "coordinator, for both arms (unit N04)",
        "file": "oracle/src/rows/F06.ts",
        "change": "traffic beyond the publisher queue bound: a pack-fixed burst of max(2000, declared queue bound + declared admission bound + 1) concurrent GETs (admissionBound is a new field of inspect publisherQueue; blocked without it); memory growth is measured above a baseline taken with the same number of connections held open and idle, then the GETs are sent on those connections; the limit stays 128 MiB; a 503 without Location passes whether admission or the publisher queue refused it; new self-test case F06-small-bound-unbounded-queue must be reported failed",
        "reason": "the burst was 3 x the arm's own declared bound, so a small declared bound made a small burst and was rewarded, and the measured growth was mostly the cost of accepted sockets",
    },
    {
        "version": "v1.4",
        "date": "2026-11-14",
        "decidedBy": "coordinator, for both arms (unit N04)",
        "file": "oracle/src/rows/lib/flows.ts, oracle/src/faults/commands.ts, oracle/src/fixtures/stripe.ts, rows A01 A07 A11 A13 A15 A16 A23 F01 F02 F03 F06, oracle/selftest/run.ts",
        "change": "every duration and deadline the oracle measures uses the monotonic clock (performance.now); wall-clock time stays only for recorded timestamps and comparisons with times the arm enforces; new unit test oracle/test/timing.test.ts fakes a 3.6 s wall-clock jump inside measured intervals; oracle build 1.4.0, results report pack v1.4; frozen/decisions.md section 11 records it",
        "reason": "this host's wall clock (WSL2) jumps forward about 3.6 s every 36 s, so one jump inside an interval measured with Date.now() inflated it",
    },
]

manifest = {
    "pack": old["pack"],
    "version": "v1.4",
    "runId": old["runId"],
    "frozenBy": "N04 attempt 1",
    "frozenAt": frozen_at,
    "sourceRepository": old["sourceRepository"],
    "sourceCommit": commit,
    "basedOn": {
        "version": old["version"],
        "manifestSha256": base_identity,
        "path": "docs/benchmarks/neutral-pack/v1.3/",
    },
    "hashAlgorithm": old["hashAlgorithm"],
    "identity": old["identity"],
    "readAllowlist": ["docs/benchmarks/neutral-pack/v1.4/"],
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
    key = f.get("fromV1.3", "new")
    counts[key] = counts.get(key, 0) + 1
print(json.dumps({"manifestSha256": identity, "files": len(files), "fromV1.3": counts}))

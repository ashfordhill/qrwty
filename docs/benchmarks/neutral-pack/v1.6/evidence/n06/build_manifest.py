#!/usr/bin/env python3
"""Build MANIFEST.json and SHA256SUMS for neutral pack v1.6 (unit N06).

  python3 -I build_manifest.py <neutral-pack dir> <source commit> <frozenAt>

<neutral-pack dir> holds v1/ to v1.6/. The algorithm is N05's (evidence/n05/build_manifest.py)
with v1.5 as the base. Every file under v1.6/ except node_modules/, __pycache__/, MANIFEST.json
and SHA256SUMS is listed with bytes, SHA-256, role and origin. A file identical to its v1.5 entry
keeps v1.5's role and origin; a changed file keeps its role and gets origin "authored-n06". The
three new oracle files and evidence/n06/ get origin "authored-n06". fromV1 to fromV1.5 are present
when that version's manifest lists the path: "identical" when the hash is the same, otherwise
"amended".

It refuses a change outside the expected set, a new file outside the expected list and
evidence/n06/, and a v1.5 file that is missing. Python 3.10+, standard library only.
"""
import hashlib
import json
import sys
from pathlib import Path

IGNORED = {"node_modules", "__pycache__"}
IDENTITY = {
    "oracle/adapter.schema.json",
    "oracle/src/types.ts",
    "oracle/src/adapter.ts",
    "oracle/src/fixtures/accounts.ts",
    "oracle/src/context.ts",
    "oracle/src/runner.ts",
    "oracle/src/rows/A04.ts",
    "oracle/src/rows/A05.ts",
    "oracle/src/rows/A06.ts",
    "oracle/src/rows/A09.ts",
    "oracle/src/rows/A14.ts",
    "oracle/src/rows/A15.ts",
    "oracle/src/rows/F04.ts",
    "oracle/src/rows/U02.ts",
    "oracle/src/rows/U05.ts",
    "oracle/src/rows/U08.ts",
    "oracle/src/rows/lib/ui.ts",
}
ONE_POST = {"oracle/src/client/session.ts"}
SELFTEST = {
    "oracle/selftest/double.ts",
    "oracle/selftest/cases.ts",
    "oracle/selftest/run.ts",
    "oracle/test/adapter.test.ts",
}
RECORDS = {
    "oracle/package.json",
    "oracle/README.md",
    "frozen/acceptance-oracle.md",
    "frozen/decisions.md",
    "README.md",
}
CHANGED = IDENTITY | ONE_POST | SELFTEST | RECORDS
NEW_FILES = {
    "oracle/src/identity.ts": "oracle component",
    "oracle/selftest/password.ts": "oracle self-test",
    "oracle/test/signin.test.ts": "oracle unit and integration tests",
}
NEW_PREFIX = "evidence/n06/"

packs, commit, frozen_at = Path(sys.argv[1]), sys.argv[2], sys.argv[3]
here, base = packs / "v1.6", packs / "v1.5"


def load(version: str) -> tuple[dict, dict[str, dict]]:
    manifest = json.loads((packs / version / "MANIFEST.json").read_text(encoding="utf-8"))
    return manifest, {e["path"]: e for e in manifest["files"]}


old, old_files = load("v1.5")
earlier = {
    "fromV1": load("v1")[1],
    "fromV1.1": load("v1.1")[1],
    "fromV1.2": load("v1.2")[1],
    "fromV1.3": load("v1.3")[1],
    "fromV1.4": load("v1.4")[1],
    "fromV1.5": old_files,
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
        entry.update(role=prior["role"], origin="authored-n06")
    elif rel in NEW_FILES:
        entry.update(role=NEW_FILES[rel], origin="authored-n06")
    elif rel.startswith(NEW_PREFIX):
        entry.update(role="N06 build and check evidence", origin="authored-n06")
    else:
        errors.append(f"new file outside the expected list and {NEW_PREFIX}: {rel}")
    for key, listed in earlier.items():
        if rel in listed:
            entry[key] = "identical" if listed[rel]["sha256"] == digest else "amended"
    files.append(entry)

paths = {f["path"] for f in files}
missing = sorted(set(old_files) - paths)
if missing:
    errors.append(f"v1.5 files missing from v1.6: {missing}")
absent = sorted(set(NEW_FILES) - paths)
if absent:
    errors.append(f"expected new files missing: {absent}")
if changed != CHANGED:
    errors.append(
        f"changed set differs: unexpected={sorted(changed - CHANGED)} unchanged={sorted(CHANGED - changed)}"
    )
if errors:
    raise SystemExit("refused:\n  " + "\n  ".join(errors))

decided = "coordinator, for both arms (unit N06); owner decisions section 12"
amendments = old["amendments"] + [
    {
        "version": "v1.6",
        "date": "2026-11-15",
        "decidedBy": decided,
        "file": "oracle/adapter.schema.json, oracle/src/types.ts, oracle/src/adapter.ts, oracle/src/identity.ts, oracle/src/fixtures/accounts.ts, oracle/src/context.ts, oracle/src/runner.ts, oracle/src/rows/ (A04, A05, A06, A09, A14, A15, F04, U02, U05, U08, lib/ui.ts), frozen/acceptance-oracle.md",
        "change": "per-account login identifiers: identity.accounts maps alice, bob and operator to the arm issuer's login identifiers (default oracle-alice, oracle-bob, oracle-operator when the map is absent; an account the map leaves out is not mapped); exactly one password source, passwordEnv or the new passwordCommand ({account}), which prints that account's password once; each password is read at most once per run, registered as a secret and never logged or stored; a check that needs an unmapped account or an unreadable password is blocked (check 'account <key>'), never failed; every row that named an account literally uses the mapped identifiers",
        "reason": "owner decisions section 12 chose Auth0 (free tier) with one shared email-only Username-Password connection for both arms' staging; v1.5 could sign in only as the fixed names, which that connection refuses and cannot hold once per arm",
    },
    {
        "version": "v1.6",
        "date": "2026-11-15",
        "decidedBy": decided,
        "file": "oracle/src/client/session.ts, oracle/src/context.ts",
        "change": "at most one login post: Api.signIn posts the issuer's login form at most once per call; a post, or a page after it, answered with anything but a redirect is a refused login that fails with its reason ('posted once, not posted again') and is never posted again; the run remembers a refused login and later sign-ins of that account fail without posting (A15's sign-in after deleting the account and F04's during the issuer outage are exempt); only network errors before the post are retried, at most twice",
        "reason": "after a refused login v1.5's driver posted the form again up to 10 times, which is Auth0's brute-force threshold, so the accounts were blocked",
    },
    {
        "version": "v1.6",
        "date": "2026-11-15",
        "decidedBy": decided,
        "file": "oracle/selftest/double.ts, oracle/selftest/cases.ts, oracle/selftest/run.ts, oracle/selftest/password.ts, oracle/test/adapter.test.ts, oracle/test/signin.test.ts",
        "change": "self-test cases signin-lockout (A14 with a stale password against an issuer that re-renders its form on a refused login and locks the identifier after 3 refused posts: expected failed, with at most one post per identifier, no lock and the refusal reason) and signin-mapped-identifier (A06 against an email-only issuer with mapped email identifiers and per-account passwords from a passwordCommand: expected passed, with no refused post); every other case keeps its expected result; oracle build 1.6.0, results report pack v1.6",
        "reason": "each fix proves itself: with v1.5's driver the lockout case posts 11 times and locks the account, and with v1.5's fixed names the email-only case fails",
    },
]

manifest = {
    "pack": old["pack"],
    "version": "v1.6",
    "runId": old["runId"],
    "frozenBy": "N06 attempt 1",
    "frozenAt": frozen_at,
    "sourceRepository": old["sourceRepository"],
    "sourceCommit": commit,
    "basedOn": {
        "version": old["version"],
        "manifestSha256": base_identity,
        "path": "docs/benchmarks/neutral-pack/v1.5/",
    },
    "hashAlgorithm": old["hashAlgorithm"],
    "identity": old["identity"],
    "readAllowlist": ["docs/benchmarks/neutral-pack/v1.6/"],
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
    key = f.get("fromV1.5", "new")
    counts[key] = counts.get(key, 0) + 1
print(json.dumps({"manifestSha256": identity, "files": len(files), "fromV1.5": counts}))

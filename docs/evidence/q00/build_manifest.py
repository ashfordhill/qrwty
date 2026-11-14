#!/usr/bin/env python3
"""Q00: build MANIFEST.json and SHA256SUMS for docs/benchmarks/neutral-pack/v1.

Run from the QRWTY repository root: python3 docs/evidence/q00/build_manifest.py
It refreshes the pack's ledger copies from the run directory, hashes every pack file, records
each file's origin and role, the exclusions and the declared outside-pack links, then writes the
manifest and the sha256sum-format list. Standard library only.
"""

import hashlib
import json
import re
import shutil
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
PACK = REPO / "docs/benchmarks/neutral-pack/v1"
RUN = REPO / "docs/benchmarks/runs/qrwty-r1-20261114"
COMMIT = "0e2e1f2717b8a823ff501dbec95aebc9dc675d4b"

ROLES = {
    "README.md": "pack readme",
    "verify_pack.py": "pack verifier",
    "frozen/decisions.md": "frozen decisions",
    "frozen/http-contract.md": "external HTTP and event contract",
    "frozen/acceptance-oracle.md": "black-box acceptance specification",
    "frozen/oracle-tooling-plan.md": "neutral oracle tooling plan",
    "frozen/loc-method.md": "source-count method",
    "b/execution-brief.md": "B execution brief",
    "ledger/README.md": "ledger documentation",
    "ledger/events.schema.json": "ledger schema",
    "ledger/ledger.py": "ledger validator and helpers",
    "files/docs/plans/production-build/product-contract.md": "product contract",
    "files/docs/plans/production-build/durable-clicks.md": "durable-click contract",
    "files/docs/plans/production-build/billing-contract.md": "billing contract",
    "files/docs/plans/production-build/acceptance.md": "acceptance contract",
    "files/docs/plans/production-build/local-to-cloud.md": "local-to-cloud contract",
    "files/docs/plans/production-build/cloud-strategy.md": "cloud strategy",
    "files/docs/plans/production-build/design-brief.md": "design brief",
    "files/docs/plans/production-build/architecture.md": "architecture contract",
    "files/docs/plans/production-build/owner-decisions-2026-11-13.md": "owner decisions",
    "files/docs/plans/production-build/baseline-units.md": "B unit plan",
    "files/docs/diagrams/README.md": "diagram conventions",
}
TOPOLOGY = ("system-overview", "cloud-deployment")
OUTSIDE_REASONS = {
    ("files/docs/plans/production-build/cloud-strategy.md", "budget-options.md"):
        "excluded future cost reference; its fairness rule (separate per-arm environments) is in decisions §5",
    ("files/docs/diagrams/README.md", "../evidence/plan-revision-2/checks.md"):
        "excluded planning evidence (diagram verification record of revision 2)",
}
EXCLUDED = [
    {"category": "A source (app/, web/, infra/)", "present": False},
    {"category": "Generated payloads, generated tests, generation reports, saved Jeeves designs", "present": False},
    {"category": "Jeeves generator internals: the Jeeves repository and docs/plans/production-build/snapshot-and-sources.md", "present": True,
     "reason": "snapshot-and-sources.md names generator files, stub interfaces and provider seams"},
    {"category": "A handoffs and evidence: docs/handoff.md, docs/evidence/", "present": True,
     "reason": "A-side history; Q01+ handoffs do not exist yet"},
    {"category": "A IaC", "present": False},
    {"category": "A repair or incident history", "present": False},
    {"category": "QRWTY Git history, including an earlier application removed in November 2026", "present": True},
    {"category": "Coordinator state, prompts and tools: docs/coordinator/", "present": True},
    {"category": "Orchestration: units.md, coordinator-prompt.md, readiness.md, the plan README.md", "present": True,
     "reason": "A's unit plan and coordinator instructions, not shared requirements"},
    {"category": "comparison.md", "present": True,
     "reason": "B-relevant rules restated in frozen/; holds A-process detail and the withheld maintenance challenge"},
    {"category": "budget-options.md and its rate worksheet", "present": True,
     "reason": "future cost options; mentions generator output"},
    {"category": "business-analysis/, root README.md, owner .docs/", "present": True,
     "reason": "background research and owner material, not requirements; .docs/ is never read"},
]
LINK_RE = re.compile(r"\]\(([^)\s]+)\)")


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def origin(rel):
    if rel.startswith("files/"):
        return {"copyOf": rel[len("files/"):], "commit": COMMIT}
    return "authored-q00"


def role(rel):
    if rel in ROLES:
        return ROLES[rel]
    name = Path(rel).stem
    if rel.startswith("files/docs/diagrams/"):
        kind = "high-level topology" if name in TOPOLOGY else "shared explanatory diagram"
        return f"{kind} ({Path(rel).suffix[1:]})"
    raise SystemExit(f"no role for {rel}")


def outside_links(files):
    found = []
    for rel in files:
        if not rel.endswith(".md"):
            continue
        source = PACK / rel
        in_code = False
        for line in source.read_text(encoding="utf-8").splitlines():
            if line.startswith("```"):
                in_code = not in_code
                continue
            if in_code:
                continue
            for target in LINK_RE.findall(line):
                if re.match(r"^[a-z][a-z0-9+.-]*:", target):
                    continue
                path_part = target.partition("#")[0]
                resolved = (source.parent / path_part).resolve() if path_part else source
                if not resolved.is_relative_to(PACK) or not resolved.exists():
                    key = (rel, target)
                    if key not in OUTSIDE_REASONS:
                        raise SystemExit(f"undeclared outside link {key}")
                    found.append({"from": rel, "target": target, "reason": OUTSIDE_REASONS[key]})
    return found


def main():
    import datetime as dt

    for name in ("README.md", "events.schema.json", "ledger.py"):
        shutil.copyfile(RUN / name, PACK / "ledger" / name)
    files = sorted(
        p.relative_to(PACK).as_posix()
        for p in PACK.rglob("*")
        if p.is_file() and "__pycache__" not in p.parts and p.name not in ("MANIFEST.json", "SHA256SUMS")
    )
    entries = [
        {"path": rel, "bytes": (PACK / rel).stat().st_size, "sha256": sha256(PACK / rel),
         "role": role(rel), "origin": origin(rel)}
        for rel in files
    ]
    manifest = {
        "pack": "qrwty-neutral-pack",
        "version": "v1",
        "runId": "qrwty-r1-20261114",
        "frozenBy": "Q00 attempt 1",
        "frozenAt": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "sourceRepository": "qrwty",
        "sourceCommit": COMMIT,
        "hashAlgorithm": "sha256",
        "identity": "SHA-256 of this MANIFEST.json file, recorded outside the pack",
        "readAllowlist": ["docs/benchmarks/neutral-pack/v1/"],
        "precedence": [
            "files/docs/plans/production-build/owner-decisions-2026-11-13.md",
            "frozen/",
            "files/ (read with frozen/decisions.md section 2)",
        ],
        "files": entries,
        "excluded": EXCLUDED,
        "outsidePackReferences": outside_links(files),
    }
    (PACK / "MANIFEST.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    sums = [f"{e['sha256']}  {e['path']}" for e in entries]
    sums.append(f"{sha256(PACK / 'MANIFEST.json')}  MANIFEST.json")
    (PACK / "SHA256SUMS").write_text("\n".join(sorted(sums, key=lambda s: s.split('  ', 1)[1])) + "\n", encoding="utf-8")
    print(f"{len(entries)} files; manifest sha256 {sha256(PACK / 'MANIFEST.json')}")


if __name__ == "__main__":
    main()

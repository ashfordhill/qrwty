#!/usr/bin/env python3
"""Validate the Q12a probe manifest against its JSON Schema, and prove the schema rejects faults.

  python3 infra/q12a/validate_manifest.py

Uses the `jsonschema` package (Draft 2020-12). Beyond the schema: probe IDs are unique, every
resource named in a probe is in the IaC draft or is one of the declared external names, and every
probe is still "not run". Then six faults are injected into copies and each must be rejected.
Prints one JSON object; exit 0 when the manifest is valid and every fault is rejected.
"""
import copy
import json
import re
import sys
from pathlib import Path

from jsonschema import Draft202012Validator

here = Path(__file__).parent
schema = json.loads((here / "probe-manifest.schema.json").read_text())
manifest = json.loads((here / "probe-manifest.json").read_text())
Draft202012Validator.check_schema(schema)
validator = Draft202012Validator(schema)
iac = "\n".join(p.read_text() for p in sorted((here.parent / "gcp").glob("*.tf")))


def problems(doc):
    found = [f"{'/'.join(map(str, e.path))}: {e.message}" for e in validator.iter_errors(doc)]
    ids = [p.get("id") for p in doc.get("probes", [])]
    if len(ids) != len(set(ids)):
        found.append("duplicate probe id")
    for p in doc.get("probes", []):
        for r in p.get("resources", []):
            base = r.replace("qrwtya-", "", 1)
            if r.startswith("qrwtya-q12a-") or r.startswith(("budget:", "auth0:")):
                continue  # created by the probe itself, or outside GCP
            stem = re.sub(r"-project-.*$", "", base)
            if not (stem in iac or r in iac or base.split("--")[0] in iac):
                found.append(f"{p.get('id')}: resource {r} is not in infra/gcp")
    return found


result = {"ok": True, "manifest": problems(manifest), "faults": {}}
faults = {
    "missing-teardown": lambda d: d["probes"][0].pop("teardown"),
    "passed-status": lambda d: d["probes"][1].update(status="passed"),
    "other-region": lambda d: d["probes"][2].update(region="europe-west1"),
    "unprefixed-resource": lambda d: d["probes"][2]["resources"].append("shared-vpc"),
    "creates-budget": lambda d: d["budget"].update(create=True),
    "invented-price": lambda d: d["probes"][2]["costInputs"][0].update(priceUsdPerUnitHour="cheap"),
}
for name, inject in faults.items():
    doc = copy.deepcopy(manifest)
    inject(doc)
    result["faults"][name] = bool(problems(doc))
result["ok"] = not result["manifest"] and all(result["faults"].values())
result["probes"] = len(manifest["probes"])
print(json.dumps(result, indent=1))
sys.exit(0 if result["ok"] else 1)

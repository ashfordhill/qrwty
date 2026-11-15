"""Q05 diagnostic smoke: write the smoke-only compose.override.yaml for a scratch copy of the export.

Labels every service `qrwty.arm=a` and gives Billing API and Link API the External API base URLs
they need to start (their stubs are unwritten, so nothing calls them). An application-owned file
of the scratch copy only; it is not part of the baseline.

Usage: python3 -I smoke-override.py <export copy>
"""
import json
import sys
from pathlib import Path

root = Path(sys.argv[1])
compose = json.loads((root / "compose.yaml").read_text())
env = {
    "app-billing-api": {"JEEVES_EXTERNAL_STRIPE_API_URL": "http://127.0.0.1:9"},
    "app-link-api": {"JEEVES_EXTERNAL_REPUTATION_API_URL": "http://127.0.0.1:9"},
}
services = {}
for name in sorted(compose["services"]):
    services[name] = {"labels": {"qrwty.arm": "a", "qrwty.unit": "Q05"}}
    if name in env:
        services[name]["environment"] = env[name]
target = root / "compose.override.yaml"
with open(target, "x") as f:
    f.write(json.dumps({"services": services}, indent=1) + "\n")
print(json.dumps({"written": str(target), "services": len(services), "environment": env}))

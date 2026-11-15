#!/usr/bin/env python3
"""Q04 secret scan: credential shapes, and the run's actual credential values, in the unit's files.

  python3 docs/evidence/q04/commands/secret-scan.py <secret dir or file> ... -- <path> ...

Shapes: private-key blocks, JWTs, Stripe, AWS, GitHub, Slack, Google API and npm token shapes, URL
credentials and quoted password assignments. Values: every file in the given secret directories
(the stack's generated credentials and the throwaway TLS keys), trimmed, at least 8 bytes, must not
occur in any scanned file (their contents are never printed). Prints one JSON object; exit 0 when
nothing is found.
"""
import json
import re
import sys
from pathlib import Path

args = sys.argv[1:]
split = args.index("--")
secret_dirs, roots = args[:split], args[split + 1:]
SHAPES = {
    "private-key": r"-----BEGIN [A-Z ]*PRIVATE KEY-----",
    "jwt": r"eyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.",
    "stripe": r"\b(sk|pk|rk|whsec)_(test|live)_[A-Za-z0-9]{8,}",
    "aws": r"\bAKIA[0-9A-Z]{16}\b",
    "github": r"\b(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})",
    "slack": r"\bxox[abprs]-[A-Za-z0-9-]{10,}",
    "google-api-key": r"\bAIza[0-9A-Za-z_-]{35}\b",
    "npm": r"\bnpm_[A-Za-z0-9]{36}\b",
    "url-credentials": r"\b[a-z][a-z0-9+.-]*://[^/\s:@\"']+:[^/\s@\"']{3,}@",
    "password-assignment": r"(?i)\bpass(word)?\s*[:=]\s*[\"'][^\"'$<{\s]{6,}[\"']",
}
values = set()
for d in secret_dirs:
    for f in [Path(d)] if Path(d).is_file() else Path(d).rglob("*"):
        if f.is_file():
            v = f.read_bytes().strip()
            if len(v) >= 8:
                values.add(v)
                # PEM bodies: also each long base64 line on its own.
                values.update(line for line in v.split(b"\n") if len(line) >= 40 and not line.startswith(b"-----"))
files, findings = 0, []
for root in roots:
    for f in sorted([Path(root)] if Path(root).is_file() else Path(root).rglob("*")):
        if not f.is_file() or "node_modules" in f.parts:
            continue
        files += 1
        data = f.read_bytes()
        text = data.decode("utf8", "replace")
        for name, pattern in SHAPES.items():
            for m in re.finditer(pattern, text):
                findings.append({"file": str(f), "kind": name, "offset": m.start()})
        for v in values:
            if v in data:
                findings.append({"file": str(f), "kind": "credential value of this run", "offset": data.find(v)})
print(json.dumps({"ok": not findings, "filesScanned": files, "credentialValuesChecked": len(values),
                  "shapes": sorted(SHAPES), "findings": findings}, indent=1))
sys.exit(1 if findings else 0)

#!/usr/bin/env python3
"""Offline structural checks of QRWTY arm A's OpenTofu draft (standard library only).

  python3 infra/gcp/lint_iac.py [infra/gcp]

This is NOT `tofu validate` (that needs the pinned OpenTofu and provider schemas: validate.sh).
It needs no credentials and no network, and checks what can be checked from the text alone:

  L1  every file lexes: strings, interpolations, heredocs and comments close; braces, brackets
      and parentheses balance
  L2  top-level blocks are well formed and no block address is declared twice
  L3  every reference resolves: resource and data addresses, var.*, local.*
  L4  every literal resource name starts with "qrwtya-" or with ${local.p} (local.p = "qrwtya-"),
      except the Pub/Sub names the generated code compiles (AG-05)
  L5  no budget is created (the project's existing $10/$25/$50 budget is reused), no provider
      or resource that would put a credential in state (random_password, google_sql_user with a
      password, a secret version other than Memorystore's public CA)
  L6  providers are pinned to one exact version, and OpenTofu to one exact version
Prints one JSON object; exit 0 when every check passes.
"""
import json
import re
import sys
from pathlib import Path

root = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).parent)
files = sorted(root.glob("*.tf"))
errors, blocks, locals_declared, vars_declared = [], {}, set(), set()
NAME_ATTRS = ("name", "account_id", "secret_id", "instance_id", "repository_id")
AG05 = {"local.topic", "local.subscription", "local.dead_letter_topic"}


def lex(text, path):
    """Returns the code with string contents blanked (interpolations kept), plus string literals."""
    out, strings, i, n, depth_stack = [], [], 0, len(text), []
    while i < n:
        c = text[i]
        if c == "#" or text.startswith("//", i):
            j = text.find("\n", i)
            i = n if j < 0 else j
            continue
        if text.startswith("/*", i):
            j = text.find("*/", i + 2)
            if j < 0:
                errors.append(f"L1 {path}: unclosed block comment")
                return "".join(out), strings
            i = j + 2
            continue
        if text.startswith("<<", i) and re.match(r"<<-?([A-Z]+)\n", text[i:]):
            m = re.match(r"<<-?([A-Z]+)\n", text[i:])
            end = re.search(rf"\n\s*{m.group(1)}\n", text[i + m.end() - 1:])
            if not end:
                errors.append(f"L1 {path}: unclosed heredoc {m.group(1)}")
                return "".join(out), strings
            out.append('""')
            i = i + m.end() - 1 + end.end()
            continue
        if c == '"':
            j, buf, interp = i + 1, [], 0
            while j < n:
                if text[j] == "\\":
                    buf.append(text[j:j + 2])
                    j += 2
                    continue
                if text.startswith("${", j):
                    interp += 1
                elif text[j] == "}" and interp:
                    interp -= 1
                elif text[j] == '"' and not interp:
                    break
                elif text[j] == "\n" and not interp:
                    errors.append(f"L1 {path}: string broken by a newline near offset {i}")
                    break
                buf.append(text[j])
                j += 1
            if j >= n:
                errors.append(f"L1 {path}: unclosed string near offset {i}")
                return "".join(out), strings
            literal = "".join(buf)
            strings.append(literal)
            # Keep the text (headers and names are read from it) and its interpolations (the
            # reference check reads them); brackets outside interpolations can't unbalance code.
            parts = re.split(r"(\$\{(?:[^{}]|\{[^{}]*\})*\})", literal)
            out.append('"' + "".join(x if x.startswith("${") else re.sub(r"[{}\[\]()]", "_", x) for x in parts) + '"')
            i = j + 1
            continue
        out.append(c)
        i += 1
    return "".join(out), strings


for path in files:
    code, _ = lex(path.read_text(), path.name)
    pairs = {"{": "}", "[": "]", "(": ")"}
    stack = []
    for k, ch in enumerate(code):
        if ch in pairs:
            stack.append(ch)
        elif ch in pairs.values():
            if not stack or pairs[stack.pop()] != ch:
                errors.append(f"L1 {path.name}: unbalanced {ch!r} at offset {k}")
                break
    if stack:
        errors.append(f"L1 {path.name}: {len(stack)} unclosed bracket(s)")
    # L2: top-level blocks (depth 0).
    depth, start = 0, 0
    for m in re.finditer(r"[{}]", code):
        if m.group() == "{":
            if depth == 0:
                header = code[start:m.start()].strip().split("\n")[-1].strip()
                hm = re.fullmatch(r'(resource|data)\s+"([a-z0-9_]+)"\s+"([A-Za-z0-9_-]+)"|(variable|output|provider)\s+"([A-Za-z0-9_]+)"|(locals|terraform)', header)
                if not hm:
                    errors.append(f"L2 {path.name}: unexpected top-level header {header!r}")
                    current = (None, None, m.end())
                else:
                    kind = hm.group(1) or hm.group(4) or hm.group(6)
                    addr = (f"{hm.group(1)}.{hm.group(2)}.{hm.group(3)}" if hm.group(1)
                            else f"{kind}.{hm.group(5)}" if hm.group(4) else None)
                    if addr:
                        if addr in blocks:
                            errors.append(f"L2 duplicate {addr}")
                        blocks[addr] = (path.name, m.end())
                    if kind == "variable":
                        vars_declared.add(hm.group(5))
                    body_start = m.end()
                    current = (kind, addr, body_start)
            depth += 1
        else:
            depth -= 1
            if depth == 0:
                kind, addr, body_start = current
                body = code[body_start:m.start()]
                if kind == "locals":
                    # attributes at depth 0 of the locals body
                    d = 0
                    for line in body.split("\n"):
                        if d == 0:
                            lm = re.match(r"\s*([a-z_][a-z0-9_]*)\s*=", line)
                            if lm:
                                locals_declared.add(lm.group(1))
                        d += line.count("{") + line.count("[") + line.count("(") - line.count("}") - line.count("]") - line.count(")")
                if addr:
                    blocks[addr] = (path.name, body)
                elif kind == "locals":
                    blocks[f"locals@{path.name}:{body_start}"] = (path.name, body)
                start = m.end()

resources = {a.split(".", 1)[1] for a in blocks if a.startswith("resource.")}
datas = {a.split(".", 1)[1] for a in blocks if a.startswith("data.")}
types = {r.split(".")[0] for r in resources}
counts = {"files": len(files), "resources": len(resources), "data": len(datas),
          "variables": len(vars_declared), "locals": len(locals_declared)}

for addr, (fname, body) in blocks.items():
    if not isinstance(body, str):
        continue
    # L3: references.
    for m in re.finditer(r"\bvar\.([a-z_][a-z0-9_]*)", body):
        if m.group(1) not in vars_declared:
            errors.append(f"L3 {addr}: undeclared var.{m.group(1)}")
    for m in re.finditer(r"\blocal\.([a-z_][a-z0-9_]*)", body):
        if m.group(1) not in locals_declared:
            errors.append(f"L3 {addr}: undeclared local.{m.group(1)}")
    for m in re.finditer(r"\bdata\.([a-z0-9_]+)\.([a-z0-9_]+)", body):
        if f"{m.group(1)}.{m.group(2)}" not in datas:
            errors.append(f"L3 {addr}: undeclared data.{m.group(1)}.{m.group(2)}")
    for m in re.finditer(r"(?<![.\w])(google_[a-z0-9_]+)\.([a-z0-9_]+)\b", body):
        if m.group(1) in types and f"{m.group(1)}.{m.group(2)}" not in resources:
            errors.append(f"L3 {addr}: undeclared {m.group(1)}.{m.group(2)}")
        if m.group(1) not in types and m.group(1).startswith("google_") and not addr.startswith("terraform"):
            # A reference to a resource type with no block at all.
            errors.append(f"L3 {addr}: no resource of type {m.group(1)}")
    # L4: names (top-level attributes of resource blocks only).
    if addr.startswith("resource."):
        rtype = addr.split(".")[1]
        d = 0
        for line in body.split("\n"):
            if d == 0:
                nm = re.match(r'\s*(' + "|".join(NAME_ATTRS) + r')\s*=\s*(.+?)\s*$', line)
                if nm and not (rtype.endswith("_iam_member") or rtype == "google_project_service"):
                    value = nm.group(2)
                    ok = (value.startswith('"qrwtya-') or value.startswith('"local.p')
                          or value.startswith('"${local.p}') or value in AG05)
                    if not ok:
                        errors.append(f"L4 {addr}: {nm.group(1)} = {value} lacks the qrwtya- prefix")
            d += line.count("{") - line.count("}")

# L5.
for forbidden in ("google_billing_budget", "random_password", "random_string", "tls_private_key"):
    if any(a.split(".")[1] == forbidden for a in blocks if a.startswith("resource.")):
        errors.append(f"L5 {forbidden} must not be created")
for addr, (fname, body) in blocks.items():
    if addr.startswith("resource.google_sql_user"):
        errors.append(f"L5 {addr}: database users are created by the migration job")
    if addr.startswith("resource.google_secret_manager_secret_version") and addr != "resource.google_secret_manager_secret_version.memorystore_ca":
        errors.append(f"L5 {addr}: only Memorystore's public CA may be a version in state")
# L6.
tf = "\n".join(p.read_text() for p in files)
req = re.search(r'required_version\s*=\s*"([^"]+)"', tf)
if not req or not re.fullmatch(r"= ?\d+\.\d+\.\d+", req.group(1)):
    errors.append("L6 required_version is not one exact OpenTofu version")
for m in re.finditer(r'source\s*=\s*"([^"]+)"\s*\n\s*version\s*=\s*"([^"]+)"', tf):
    if not re.fullmatch(r"\d+\.\d+\.\d+", m.group(2)):
        errors.append(f"L6 provider {m.group(1)} is not pinned exactly ({m.group(2)})")
providers = re.findall(r'source\s*=\s*"([^"]+)"', tf)
counts["providers"] = providers

print(json.dumps({"ok": not errors, "check": "lint_iac (structural; not tofu validate)", "counts": counts,
                  "exemptNames": sorted(AG05), "errors": errors}, indent=1))
sys.exit(1 if errors else 0)

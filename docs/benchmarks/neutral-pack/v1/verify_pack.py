#!/usr/bin/env python3
"""Verify this neutral pack. Python 3.10+, standard library only.

  python3 verify_pack.py [--json]
  python3 verify_pack.py --against-git <qrwty checkout>   (coordinator/A side only)

Checks, relative to this script's directory (the pack can be copied anywhere):
  1. every file listed in MANIFEST.json exists with the recorded size and SHA-256;
  2. the pack holds no file that the manifest does not list (the allowlist is exact);
  3. SHA256SUMS agrees with the manifest and with MANIFEST.json's own hash;
  4. every relative Markdown link in the pack resolves inside the pack, or is one of the
     manifest's declared outsidePackReferences; anchors in authored files resolve;
  5. with --against-git, each copied file is byte-identical to its origin commit in that
     repository. B workers never use this option: it reads the QRWTY Git history.
Prints the pack identity: the SHA-256 of MANIFEST.json. Exit 0 when everything passes.
"""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent
MANIFEST = "MANIFEST.json"
SUMS = "SHA256SUMS"
LINK_RE = re.compile(r"(?<!!)\[[^\]]*\]\(([^)\s]+)\)|!\[[^\]]*\]\(([^)\s]+)\)")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for block in iter(lambda: handle.read(65536), b""):
            digest.update(block)
    return digest.hexdigest()


def slug(heading: str) -> str:
    text = unicodedata.normalize("NFKC", heading).strip().lower()
    text = re.sub(r"[`*~]", "", text)
    text = re.sub(r"[^\w\- ]", "", text)
    return text.replace(" ", "-")


def anchors(path: Path) -> set[str]:
    found: set[str] = set()
    counts: dict[str, int] = {}
    in_code = False
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("```"):
            in_code = not in_code
            continue
        if in_code:
            continue
        found.update(re.findall(r"<a\s+(?:id|name)=\"([^\"]+)\"", line))
        match = re.match(r"^(#{1,6})\s+(.*?)\s*(<!--.*-->)?\s*$", line)
        if match:
            base = slug(match.group(2))
            n = counts.get(base, 0)
            found.add(base if n == 0 else f"{base}-{n}")
            counts[base] = n + 1
    return found


def links(path: Path):
    in_code = False
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if line.startswith("```"):
            in_code = not in_code
            continue
        if in_code:
            continue
        for match in LINK_RE.finditer(line):
            target = match.group(1) or match.group(2)
            if re.match(r"^[a-z][a-z0-9+.-]*:", target) or target.startswith("<"):
                continue
            yield number, target


def main(argv) -> int:
    as_json = "--json" in argv
    against = None
    if "--against-git" in argv:
        against = Path(argv[argv.index("--against-git") + 1])
    errors: list[str] = []
    manifest_path = HERE / MANIFEST
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    listed = {entry["path"]: entry for entry in manifest["files"]}

    for rel, entry in listed.items():
        path = HERE / rel
        if not path.is_file():
            errors.append(f"missing listed file {rel}")
            continue
        if path.stat().st_size != entry["bytes"]:
            errors.append(f"size mismatch {rel}")
        if sha256(path) != entry["sha256"]:
            errors.append(f"sha256 mismatch {rel}")

    present = {
        p.relative_to(HERE).as_posix()
        for p in HERE.rglob("*")
        if p.is_file() and "__pycache__" not in p.parts
    }
    for rel in sorted(present - set(listed) - {MANIFEST, SUMS}):
        errors.append(f"unlisted file in pack (not on the allowlist): {rel}")

    sums_path = HERE / SUMS
    expected = {rel: e["sha256"] for rel, e in listed.items()}
    expected[MANIFEST] = sha256(manifest_path)
    seen = {}
    for line in sums_path.read_text(encoding="utf-8").splitlines():
        digest, _, rel = line.partition("  ")
        seen[rel] = digest
    if seen != expected:
        missing = sorted(set(expected) - set(seen))
        extra = sorted(set(seen) - set(expected))
        wrong = sorted(k for k in set(seen) & set(expected) if seen[k] != expected[k])
        errors.append(f"SHA256SUMS disagrees: missing={missing} extra={extra} wrong={wrong}")

    declared = {(r["from"], r["target"]) for r in manifest.get("outsidePackReferences", [])}
    used_declared = set()
    authored = {e["path"] for e in manifest["files"] if e.get("origin") == "authored-q00"}
    link_count = 0
    for rel in sorted(listed):
        source = HERE / rel
        if not rel.endswith(".md") or not source.is_file():
            continue
        for number, target in links(source):
            link_count += 1
            path_part, _, anchor = target.partition("#")
            resolved = (source.parent / path_part).resolve() if path_part else source
            inside = resolved.is_relative_to(HERE)
            rel_target = resolved.relative_to(HERE).as_posix() if inside else None
            if not inside or not resolved.exists():
                if (rel, target) in declared:
                    used_declared.add((rel, target))
                else:
                    errors.append(f"{rel}:{number}: link target outside or missing: {target}")
                continue
            if anchor and rel_target and rel_target.endswith(".md") and rel in authored:
                if resolved.is_file() and anchor not in anchors(resolved):
                    errors.append(f"{rel}:{number}: missing anchor #{anchor} in {rel_target}")
    for item in sorted(declared - used_declared):
        errors.append(f"declared outside reference not found in the file: {item}")

    copies = 0
    if against is not None:
        for rel, entry in listed.items():
            origin = entry.get("origin")
            if not isinstance(origin, dict):
                continue
            copies += 1
            spec = f"{origin['commit']}:{origin['copyOf']}"
            try:
                blob = subprocess.run(
                    ["git", "-C", str(against), "show", spec], check=True, capture_output=True
                ).stdout
            except subprocess.CalledProcessError:
                errors.append(f"cannot read {spec} in {against}")
                continue
            if hashlib.sha256(blob).hexdigest() != entry["sha256"]:
                errors.append(f"copy differs from origin {spec}: {rel}")

    identity = sha256(manifest_path)
    result = {
        "ok": not errors,
        "pack": f"{manifest['pack']} {manifest['version']}",
        "manifestSha256": identity,
        "files": len(listed),
        "markdownLinksChecked": link_count,
        "declaredOutsideReferences": len(declared),
        "copiesComparedWithGit": copies if against is not None else None,
        "errors": errors,
    }
    if as_json:
        print(json.dumps(result, indent=2))
    else:
        print(f"pack {result['pack']}: {len(listed)} files, {link_count} links checked")
        if against is not None:
            print(f"copies compared with Git origin: {copies}")
        print(f"manifest sha256 (pack identity): {identity}")
        for item in errors:
            print(f"ERROR: {item}")
        print("OK" if not errors else f"FAILED: {len(errors)} error(s)")
    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

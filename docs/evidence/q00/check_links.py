#!/usr/bin/env python3
"""Q00: check relative Markdown links and anchors across QRWTY (run from the repository root).

Skips .git/, the owner's .docs/ and the neutral pack (verify_pack.py checks the pack, whose
copies keep two declared outside links). Fails only on broken links in files this unit changed;
broken links elsewhere are listed as pre-existing.
"""

import re
import subprocess
import sys
import unicodedata
from pathlib import Path

REPO = Path.cwd()
SKIP = (".git/", ".docs/", "docs/benchmarks/neutral-pack/", "node_modules/")
LINK = re.compile(r"\]\(([^)\s]+)\)")


def slug(text):
    text = unicodedata.normalize("NFKC", text).strip().lower()
    text = re.sub(r"[`*~]", "", text)
    text = re.sub(r"[^\w\- ]", "", text)
    return text.replace(" ", "-")


def anchors(path):
    found, counts, code = set(), {}, False
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("```"):
            code = not code
            continue
        if not code:
            found.update(re.findall(r"<a\s+(?:id|name)=\"([^\"]+)\"", line))
        m = None if code else re.match(r"^(#{1,6})\s+(.*?)\s*(<!--.*-->)?\s*$", line)
        if m:
            base = slug(m.group(2))
            n = counts.get(base, 0)
            found.add(base if n == 0 else f"{base}-{n}")
            counts[base] = n + 1
    return found


def changed():
    out = subprocess.run(["git", "status", "--porcelain", "--untracked-files=all"],
                         capture_output=True, text=True, check=True).stdout
    return {line[3:] for line in out.splitlines()}


def main():
    touched = changed()
    files = sorted(p for p in REPO.rglob("*.md")
                   if not any(p.relative_to(REPO).as_posix().startswith(s) for s in SKIP))
    broken_mine, broken_other, total = [], [], 0
    for path in files:
        rel = path.relative_to(REPO).as_posix()
        code = False
        for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if line.startswith("```"):
                code = not code
                continue
            if code:
                continue
            for target in LINK.findall(re.sub(r"`[^`]*`", "", line)):
                if re.match(r"^[a-z][a-z0-9+.-]*:", target):
                    continue
                total += 1
                part, _, anchor = target.partition("#")
                dest = (path.parent / part).resolve() if part else path
                problem = None
                if not dest.exists():
                    problem = "missing target"
                elif anchor and dest.suffix == ".md" and anchor not in anchors(dest):
                    problem = f"missing anchor #{anchor}"
                if problem:
                    item = f"{rel}:{number}: {target} ({problem})"
                    (broken_mine if rel in touched else broken_other).append(item)
    print(f"markdown files: {len(files)}; relative links checked: {total}")
    mine = sorted(t for t in touched if t.endswith(".md") and not any(t.startswith(s) for s in SKIP))
    print(f"changed Markdown files checked here (the pack is checked by verify_pack.py): {mine}")
    for item in broken_other:
        print(f"pre-existing (not this unit): {item}")
    for item in broken_mine:
        print(f"BROKEN: {item}")
    print("OK" if not broken_mine else f"FAILED: {len(broken_mine)} broken link(s) in changed files")
    return 1 if broken_mine else 0


if __name__ == "__main__":
    sys.exit(main())

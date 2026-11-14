#!/usr/bin/env python3
"""Q00: prove verify_pack.py detects tampering. Works on temporary copies of the pack only."""

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

PACK = Path(__file__).resolve().parents[2] / "benchmarks/neutral-pack/v1"


def case(name, mutate, expect):
    with tempfile.TemporaryDirectory() as tmp:
        copy = Path(tmp) / "v1"
        shutil.copytree(PACK, copy)
        mutate(copy)
        out = subprocess.run([sys.executable, str(copy / "verify_pack.py")],
                             capture_output=True, text=True)
        ok = out.returncode == 1 and expect in out.stdout
        print(f"{'ok  ' if ok else 'FAIL'} {name}: exit {out.returncode}, expected '{expect}'")
        if not ok:
            print(out.stdout)
        return ok


def flip_byte(copy):
    path = copy / "files/docs/plans/production-build/product-contract.md"
    data = bytearray(path.read_bytes())
    data[100] ^= 0x01
    path.write_bytes(bytes(data))


def add_file(copy):
    (copy / "files/docs/plans/production-build/units.md").write_text("A plan\n", encoding="utf-8")


def remove_file(copy):
    (copy / "frozen/http-contract.md").unlink()


def break_link(copy):
    path = copy / "b/execution-brief.md"
    path.write_text(path.read_text(encoding="utf-8") + "\n[gone](../frozen/missing.md)\n", encoding="utf-8")


def edit_sums(copy):
    path = copy / "SHA256SUMS"
    lines = path.read_text(encoding="utf-8").splitlines()
    lines[0] = "0" * 64 + lines[0][64:]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    with tempfile.TemporaryDirectory() as tmp:
        copy = Path(tmp) / "elsewhere" / "v1"
        shutil.copytree(PACK, copy)
        out = subprocess.run([sys.executable, str(copy / "verify_pack.py")], capture_output=True, text=True)
        clean = out.returncode == 0
        print(f"{'ok  ' if clean else 'FAIL'} untouched copy in another directory verifies: exit {out.returncode}")
    results = [
        clean,
        case("one byte changed in a copied contract", flip_byte, "sha256 mismatch"),
        case("an A plan added to the pack", add_file, "unlisted file in pack"),
        case("a listed file removed", remove_file, "missing listed file"),
        case("a broken link added", break_link, "link target outside or missing"),
        case("SHA256SUMS edited", edit_sums, "SHA256SUMS disagrees"),
    ]
    print("NEGATIVE TESTS OK" if all(results) else "NEGATIVE TESTS FAILED")
    return 0 if all(results) else 1


if __name__ == "__main__":
    sys.exit(main())

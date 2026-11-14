import os, sys, hashlib, json
root = sys.argv[1]
out = {}
for d, dirs, files in os.walk(root):
    dirs.sort()
    for f in files:
        p = os.path.join(d, f)
        assert not os.path.islink(p), p
        rel = os.path.relpath(p, root)
        b = open(p, "rb").read()
        out[rel] = {"bytes": len(b), "sha256": hashlib.sha256(b).hexdigest(), "mode": oct(os.stat(p).st_mode & 0o777)}
json.dump(dict(sorted(out.items())), open(sys.argv[2], "w"), indent=1)
print(root, len(out), "files", sum(v["bytes"] for v in out.values()), "bytes", sorted({v["mode"] for v in out.values()}))

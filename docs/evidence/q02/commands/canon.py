import json, sys, hashlib
resp = json.load(open(sys.argv[1], encoding="utf-8"))
design = resp["design"]
s = json.dumps(design, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False)
b = s.encode("utf-8")
open(sys.argv[2], "wb").write(b)
print("revision", design["revision"], "bytes", len(b), "sha256", hashlib.sha256(b).hexdigest())

import zipfile, sys, os, hashlib, json
zpath, dest = sys.argv[1], sys.argv[2]
os.makedirs(dest)  # must be new
z = zipfile.ZipFile(zpath)
entries = []
for info in z.infolist():
    n = info.filename
    assert not n.startswith("/") and ".." not in n.split("/") and "\\" not in n, n
    assert not n.endswith("/"), "directory entry " + n
    data = z.read(info)
    mode = (info.external_attr >> 16) & 0o777777
    entries.append({"path": n, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(),
                    "method": info.compress_type, "date": list(info.date_time), "mode": oct(mode), "extra": len(info.extra), "comment": len(info.comment)})
    p = os.path.join(dest, n)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "xb") as f: f.write(data)
print(json.dumps({"entries": len(entries), "methods": sorted({e["method"] for e in entries}), "dates": sorted({tuple(e["date"]) for e in entries}),
                  "modes": sorted({e["mode"] for e in entries}), "extras": sum(e["extra"] for e in entries), "zipComment": len(z.comment),
                  "orderedAscii": [e["path"] for e in entries] == sorted(e["path"] for e in entries)}))
json.dump(entries, open(sys.argv[3], "w"), indent=1)

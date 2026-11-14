import json, sys
def walk(a, b, p=""):
    out = []
    if type(a) != type(b): return [p]
    if isinstance(a, dict):
        for k in sorted(set(a) | set(b)):
            if k not in a or k not in b: out.append(p + "/" + k)
            else: out += walk(a[k], b[k], p + "/" + k)
    elif isinstance(a, list):
        if len(a) != len(b): return [p + " (len)"]
        for i, (x, y) in enumerate(zip(a, b)): out += walk(x, y, f"{p}/{i}")
    elif a != b: out.append(p)
    return out
a = json.load(open(sys.argv[1])); b = json.load(open(sys.argv[2]))
print(sys.argv[2].split("/")[-1], "differs at:", walk(a, b))

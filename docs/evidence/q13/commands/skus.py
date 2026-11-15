import glob, json, re, sys
svc, pattern = sys.argv[1], re.compile(sys.argv[2], re.I)
region = sys.argv[3] if len(sys.argv) > 3 else "us-central1"
for f in sorted(glob.glob(f"{sys.argv[4] if len(sys.argv)>4 else '.'}/prices/{svc}.*.json")):
    for s in json.load(open(f)).get("skus", []):
        if not pattern.search(s["description"]): continue
        regs = s.get("serviceRegions", [])
        if region != "*" and region not in regs and "global" not in regs: continue
        for p in s.get("pricingInfo", [])[:1]:
            e = p["pricingExpression"]
            tiers = [(t["startUsageAmount"], int(t["unitPrice"].get("units", 0)) + t["unitPrice"].get("nanos", 0) / 1e9) for t in e["tieredRates"]]
            print(f'{s["skuId"]} | {s["description"]} | {e["usageUnitDescription"]} | {tiers} | {",".join(regs[:3])}')

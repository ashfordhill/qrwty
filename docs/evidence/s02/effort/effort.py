"""S02: effort per arm from the run ledgers (attempt windows and imported request records).

Read-only. Prices: Anthropic first-party list prices per million tokens as cached in the
claude-api skill (table dated 2026-10-06): claude-opus-5-5 input 4, output 20, cache read 0.20;
claude-fable-5-1 input 10, output 50, cache read 0.25; cache writes 1.25x input (5-minute TTL) or
2x input (1-hour TTL). The ledger does not split cache writes by TTL, so the estimate is a range.
"""
import json, sys, collections
from datetime import datetime

PRICES = {
    "claude-opus-5-5": {"in": 4.0, "out": 20.0, "read": 0.20},
    "claude-fable-5-1": {"in": 10.0, "out": 50.0, "read": 0.25},
}
A = "docs/benchmarks/runs/qrwty-r1-20261114/a/events.jsonl"
S = "docs/benchmarks/runs/qrwty-r1-20261114/shared/events.jsonl"
B = "/home/ash/github/qrwty-baseline/docs/benchmarks/runs/qrwty-r1-20261114/b/events.jsonl"

def ts(s):
    return datetime.fromisoformat(s.replace("Z", "+00:00")) if s else None

def load(path):
    attempts, order, reqs = {}, [], collections.defaultdict(list)
    for line in open(path):
        r = json.loads(line)
        if r["kind"] == "attempt":
            attempts[r["eventId"]] = dict(r); order.append(r["eventId"])
        elif r["kind"] == "attempt-update":
            a = attempts[r["updates"]]
            for k, v in r.items():
                if k not in ("schemaVersion", "eventId", "runId", "ledger", "kind", "recordedAt", "recordedBy", "updates", "reason"):
                    a[k] = v
        elif r["kind"] == "request":
            reqs[r["attemptEventId"]].append(r)
    return [(attempts[e], reqs.get(e, [])) for e in order]

def group_of(ledger, a):
    if ledger == "b":
        return "B"
    if ledger == "shared":
        return "shared"
    if a["repository"] == "jeeves":
        return "A-jeeves-template-development"
    if a["unit"] in ("Q03", "Q03-review", "Q03b"):
        return "A-gap-audit"
    return "A-application"

def blank():
    return {"attempts": 0, "units": [], "requests": 0, "input": 0, "cacheWrite": 0, "cacheRead": 0, "output": 0,
            "byModel": collections.Counter(), "minutes": 0.0, "windowStart": None, "windowEnd": None,
            "usdLow": 0.0, "usdHigh": 0.0, "unavailableAttempts": []}

groups = collections.OrderedDict((g, blank()) for g in ["A-application", "A-gap-audit", "A-jeeves-template-development", "B", "shared"])
rows = []
for ledger, path in (("a", A), ("b", B), ("shared", S)):
    for a, reqs in load(path):
        g = groups[group_of(ledger, a)]
        if not reqs:
            g["unavailableAttempts"].append(f'{a["eventId"]} {a["unit"]} ({a["usage"]["coverage"]})')
            continue
        st, en = ts(a.get("startedAt")), ts(a.get("endedAt"))
        rts = sorted(ts(q["timestamp"]) for q in reqs)
        span = (rts[-1] - rts[0]).total_seconds() / 60
        window = (en - st).total_seconds() / 60 if st and en else None
        minutes, source = (window, "attempt window") if window and window > 0 else (span, "request span")
        c = collections.Counter()
        low = high = 0.0
        for q in reqs:
            u = q["usage"]["counters"]
            for k in ("input_tokens", "cache_creation_input_tokens", "cache_read_input_tokens", "output_tokens"):
                c[k] += u.get(k) or 0
            p = PRICES.get(q["model"])
            if p:
                base = (u["input_tokens"] * p["in"] + u["cache_read_input_tokens"] * p["read"] + u["output_tokens"] * p["out"]) / 1e6
                low += base + u["cache_creation_input_tokens"] * p["in"] * 1.25 / 1e6
                high += base + u["cache_creation_input_tokens"] * p["in"] * 2.0 / 1e6
            g["byModel"][q["model"]] += 1
        g["attempts"] += 1
        g["units"].append(f'{a["unit"]}{"" if a["attempt"] == 1 else " a" + str(a["attempt"])}')
        g["requests"] += len(reqs)
        g["input"] += c["input_tokens"]; g["cacheWrite"] += c["cache_creation_input_tokens"]
        g["cacheRead"] += c["cache_read_input_tokens"]; g["output"] += c["output_tokens"]
        g["minutes"] += minutes; g["usdLow"] += low; g["usdHigh"] += high
        first = st if st else rts[0]
        last = en if en else rts[-1]
        g["windowStart"] = min(filter(None, [g["windowStart"], first]))
        g["windowEnd"] = max(filter(None, [g["windowEnd"], last]))
        rows.append({"ledger": ledger, "event": a["eventId"], "unit": a["unit"], "attempt": a["attempt"], "role": a["role"],
                     "phase": a["phase"], "repository": a["repository"], "group": group_of(ledger, a), "requests": len(reqs),
                     "counters": dict(c), "minutes": round(minutes, 1), "minutesSource": source,
                     "usdLow": round(low, 2), "usdHigh": round(high, 2)})

out = {"prices": {"source": "Anthropic first-party list prices, claude-api skill model table cached 2026-10-06", "perMillionTokens": PRICES,
                  "cacheWrite": "1.25x input (5-minute TTL, low end) to 2x input (1-hour TTL, high end); the ledger does not record the TTL split"},
       "groups": {}, "attempts": rows}
for name, g in groups.items():
    total_in = g["input"] + g["cacheWrite"] + g["cacheRead"]
    out["groups"][name] = {
        "attempts": g["attempts"], "units": g["units"], "requests": g["requests"],
        "inputSideTokens": total_in, "uncachedInput": g["input"], "cacheWrite": g["cacheWrite"], "cacheRead": g["cacheRead"],
        "outputTokens": g["output"], "byModel": dict(g["byModel"]),
        "agentMinutes": round(g["minutes"], 1), "agentHours": round(g["minutes"] / 60, 2),
        "calendarSpan": [g["windowStart"].isoformat() if g["windowStart"] else None, g["windowEnd"].isoformat() if g["windowEnd"] else None],
        "estimateUsd": [round(g["usdLow"]), round(g["usdHigh"])],
        "notCounted": g["unavailableAttempts"],
    }
json.dump(out, sys.stdout, indent=1, default=str)

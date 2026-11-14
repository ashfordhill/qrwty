#!/usr/bin/env python3
"""Summarise one Claude Code worker transcript (JSONL) into per-request usage records.

Usage: transcript-usage.py <transcript.jsonl> [--records]

Prints a JSON summary: request count, models seen, and summed provider usage counters. With
--records it prints one JSON object per model request instead (deduplicated by message.id).
Counters are copied as the provider reports them; nothing is estimated. The transcript itself is
never copied into the repository (it may hold tool output); only these derived numbers are.
"""

import collections
import json
import sys


def requests(path):
    seen = set()
    with open(path, encoding="utf-8") as handle:
        for line in handle:
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue
            if record.get("type") != "assistant":
                continue
            message = record.get("message") or {}
            usage = message.get("usage")
            key = message.get("id")
            if not usage or key in seen:
                continue
            seen.add(key)
            yield {
                "requestId": key,
                "timestamp": record.get("timestamp"),
                "model": message.get("model"),
                "usage": {k: v for k, v in usage.items() if isinstance(v, (int, float))},
            }


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    rows = list(requests(sys.argv[1]))
    if "--records" in sys.argv:
        for row in rows:
            print(json.dumps(row))
        return
    totals = collections.Counter()
    models = collections.Counter()
    for row in rows:
        models[row["model"]] += 1
        totals.update(row["usage"])
    stamps = [row["timestamp"] for row in rows if row["timestamp"]]
    print(json.dumps({
        "requests": len(rows),
        "models": dict(models),
        "usage": dict(totals),
        "first": min(stamps) if stamps else None,
        "last": max(stamps) if stamps else None,
        "coverage": "reported" if rows else "unavailable",
        "notes": "Provider counters as reported; reasoning is inside output_tokens; no cost field.",
    }, indent=2))


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Q00: exercise the recording workflow end to end in a throwaway repository.

Uses the neutral pack's ledger copy (as B00 will) and the coordinator's transcript-usage.py on a
small synthetic transcript. Nothing here touches a real ledger; all IDs and counts are synthetic.
"""

import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
PACK_LEDGER = REPO / "docs/benchmarks/neutral-pack/v1/ledger"
USAGE_TOOL = REPO / "docs/coordinator/tools/transcript-usage.py"
RUN = "docs/benchmarks/runs/qrwty-r1-20261114"


def sh(args, cwd, expect=0):
    out = subprocess.run(args, cwd=cwd, capture_output=True, text=True)

    def clean(text):
        return text.replace(str(cwd), "<sim>").replace(str(cwd.parent), "<tmp>").replace(str(REPO), "<qrwty>")

    shown = clean(" ".join(str(a) for a in args))
    print(f"$ {shown}\n{clean(out.stdout)}{clean(out.stderr)}exit={out.returncode}\n")
    if out.returncode != expect:
        raise SystemExit(f"unexpected exit {out.returncode} (expected {expect})")
    return out


def main():
    with tempfile.TemporaryDirectory() as tmp:
        sim = Path(tmp) / "qrwty-baseline-sim"
        run = sim / RUN
        (run / "b").mkdir(parents=True)
        for name in ("ledger.py", "events.schema.json", "README.md"):
            shutil.copyfile(PACK_LEDGER / name, run / name)
        (run / "b/events.jsonl").write_text("", encoding="utf-8")
        sh(["git", "init", "-q", "."], sim)
        packet = sim / "docs/prompts/B00-a1.md"
        packet.parent.mkdir(parents=True)
        packet.write_text("Synthetic assignment packet for the workflow test.\n", encoding="utf-8")

        led = [sys.executable, str(run / "ledger.py")]
        sh(led + ["start-attempt", "--ledger", "b", "--unit", "B00", "--attempt", "1",
                  "--role", "implementer", "--phase", "shared-preparation", "--repository", "qrwty-baseline",
                  "--recorded-by", "worker:B00-a1", "--assignment", str(packet),
                  "--commit-before", "0000000", "--requested-model", "inherited (Opus)",
                  "--requested-effort", "inherited"], sim)

        transcript = Path(tmp) / "synthetic-transcript.jsonl"
        rows = [
            {"type": "user", "message": {"content": "task"}},
            {"type": "assistant", "timestamp": "2026-11-14T06:00:01.000Z",
             "message": {"id": "msg_syn_1", "model": "synthetic-model",
                         "usage": {"input_tokens": 10, "cache_creation_input_tokens": 200,
                                   "cache_read_input_tokens": 0, "output_tokens": 30,
                                   "service_tier": "standard"}}},
            {"type": "assistant", "timestamp": "2026-11-14T06:00:01.000Z",
             "message": {"id": "msg_syn_1", "model": "synthetic-model",
                         "usage": {"input_tokens": 10, "cache_creation_input_tokens": 200,
                                   "cache_read_input_tokens": 0, "output_tokens": 30}}},
            {"type": "assistant", "timestamp": "2026-11-14T06:00:09.500Z",
             "message": {"id": "msg_syn_2", "model": "synthetic-model",
                         "usage": {"input_tokens": 4, "cache_creation_input_tokens": 0,
                                   "cache_read_input_tokens": 200, "output_tokens": 50}}},
        ]
        transcript.write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
        records = run / "usage/b/B00-implementer-a1.records.jsonl"
        records.parent.mkdir(parents=True)
        out = sh([sys.executable, str(USAGE_TOOL), str(transcript), "--records"], sim)
        records.write_text(out.stdout, encoding="utf-8")
        print(f"(records saved: {sum(1 for _ in out.stdout.splitlines())} requests after dedup by message.id)\n")

        sh(led + ["import-usage", "--ledger", "b", "--attempt-event", "b-0001", "--recorded-by", "coordinator",
                  "--records", str(records), "--agent-total-tokens", "494", "--agent-tool-uses", "7",
                  "--agent-duration-ms", "8500", "--status", "passed", "--commit-after", "1111111",
                  "--ended-at", "2026-11-14T06:00:10Z"], sim)
        sh(led + ["import-usage", "--ledger", "b", "--attempt-event", "b-0001", "--recorded-by", "coordinator",
                  "--records", str(records)], sim, expect=1)
        sh(led + ["update", "--ledger", "b", "--attempt-event", "b-0001", "--recorded-by", "coordinator",
                  "--reason", "accepted by the coordinator", "--human-minutes", "0"], sim)
        sh(led + ["validate"], sim)

        events = run / "b/events.jsonl"
        lines = events.read_text(encoding="utf-8").splitlines()
        update = json.loads(lines[3])
        print("import totals:", json.dumps(update["usage"]["counters"]), "requests:", update["usage"]["requestCount"])
        update["eventId"] = "b-0007"
        update["usage"]["counters"]["input_tokens"] += 1
        events.write_text("\n".join(lines) + "\n" + json.dumps(update) + "\n", encoding="utf-8")
        print("\n(appended a hand-edited update whose input_tokens no longer matches the requests)\n")
        sh(led + ["validate"], sim, expect=1)
    print("WORKFLOW TEST OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())

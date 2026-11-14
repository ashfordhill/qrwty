#!/usr/bin/env python3
"""QRWTY run ledger tool, schema version 1. Python 3.10+, standard library only.

  ledger.py validate [RUN_DIR] [--repo-root DIR] [--json]
  ledger.py self-test
  ledger.py start-attempt --ledger L --unit U --attempt N --role R --phase P \
      --repository REPO --recorded-by WHO [--run-dir DIR] [options]
  ledger.py update --ledger L --attempt-event ID --recorded-by WHO --reason TEXT [options]
  ledger.py import-usage --ledger L --attempt-event ID --records FILE --recorded-by WHO [options]

RUN_DIR is docs/benchmarks/runs/<run-id>/ and defaults to this script's directory. Each ledger
is RUN_DIR/<a|b|shared>/events.jsonl. Paths inside records are relative to the repository root.
Writers validate the whole ledger plus the new lines before appending; nothing is rewritten.
See README.md beside this script for the record kinds and the cross-record rules (R1-R16).
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
SCHEMA_FILE = HERE / "events.schema.json"
LEDGERS = ("a", "b", "shared")
COUNTERS = (
    "input_tokens",
    "cache_creation_input_tokens",
    "cache_read_input_tokens",
    "output_tokens",
)
MUTABLE = (
    "status",
    "endedAt",
    "commits",
    "model",
    "usage",
    "agentToolTotals",
    "cost",
    "humanMinutes",
    "evidence",
    "notes",
)
USAGE_TOOL = "docs/coordinator/tools/transcript-usage.py --records"
SECRET_PATTERNS = [
    re.compile(p)
    for p in (
        r"\b[sr]k_(live|test)_[0-9A-Za-z]{8,}",
        r"\bpk_live_[0-9A-Za-z]{8,}",
        r"\bwhsec_[0-9A-Za-z]{8,}",
        r"\bAIza[0-9A-Za-z_-]{30,}",
        r"\bya29\.[0-9A-Za-z_-]{20,}",
        r"\bgh[pousr]_[0-9A-Za-z]{30,}",
        r"\bxox[abprs]-[0-9A-Za-z-]{10,}",
        r"-----BEGIN [A-Z ]*PRIVATE KEY-----",
        r"(?i)\bbearer\s+[0-9a-z._~+/-]{20,}",
    )
]
TS_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?Z$")


# --------------------------------------------------------------------------- helpers


def now_ts() -> str:
    return dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_ts(value: str) -> dt.datetime:
    base = value[:19]
    frac = value[19:-1]
    stamp = dt.datetime.strptime(base, "%Y-%m-%dT%H:%M:%S").replace(tzinfo=dt.timezone.utc)
    if frac:
        stamp += dt.timedelta(microseconds=int((frac[1:] + "000000")[:6]))
    return stamp


def normalize_ts(value):
    """Return a UTC '...Z' timestamp or None. Accepts '+00:00' offsets from transcripts."""
    if value is None:
        return None
    if TS_RE.match(value):
        return value
    try:
        stamp = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if stamp.tzinfo is None:
        return None
    return stamp.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for block in iter(lambda: handle.read(65536), b""):
            digest.update(block)
    return digest.hexdigest()


def find_repo_root(start: Path) -> Path:
    for candidate in [start, *start.parents]:
        if (candidate / ".git").exists():
            return candidate
    # docs/benchmarks/runs/<run>/ -> repository root
    return start.parents[3] if len(start.parents) > 3 else start


def is_int(value) -> bool:
    return isinstance(value, int) and not isinstance(value, bool)


def is_number(value) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def strict_equal(a, b) -> bool:
    if isinstance(a, bool) or isinstance(b, bool):
        return isinstance(a, bool) and isinstance(b, bool) and a == b
    return a == b


def no_duplicate_keys(pairs):
    seen = {}
    for key, value in pairs:
        if key in seen:
            raise ValueError(f"duplicate key {key!r}")
        seen[key] = value
    return seen


# --------------------------------------------------------------------------- schema subset


class Schema:
    def __init__(self, path: Path = SCHEMA_FILE):
        with open(path, encoding="utf-8") as handle:
            self.root = json.load(handle)

    def resolve(self, schema):
        while "$ref" in schema:
            ref = schema["$ref"]
            if not ref.startswith("#/$defs/"):
                raise ValueError(f"unsupported $ref {ref}")
            schema = self.root["$defs"][ref[len("#/$defs/") :]]
        return schema

    def check(self, value, schema=None, where="$"):
        errors: list[str] = []
        self._check(self.root if schema is None else schema, value, where, errors)
        return errors

    def _type_ok(self, value, name) -> bool:
        return {
            "object": lambda v: isinstance(v, dict),
            "array": lambda v: isinstance(v, list),
            "string": lambda v: isinstance(v, str),
            "integer": is_int,
            "number": is_number,
            "boolean": lambda v: isinstance(v, bool),
            "null": lambda v: v is None,
        }[name](value)

    def _check(self, schema, value, where, errors):
        schema = self.resolve(schema)
        if "oneOf" in schema:
            branches = [self.resolve(b) for b in schema["oneOf"]]
            results = []
            for branch in branches:
                branch_errors: list[str] = []
                self._check(branch, value, where, branch_errors)
                results.append(branch_errors)
            passing = [r for r in results if not r]
            if len(passing) == 1:
                return
            if len(passing) > 1:
                errors.append(f"[S] {where}: matches {len(passing)} alternatives")
                return
            kind = value.get("kind") if isinstance(value, dict) else None
            for branch, branch_errors in zip(branches, results):
                const = branch.get("properties", {}).get("kind", {}).get("const")
                if kind is not None and const == kind:
                    errors.extend(branch_errors)
                    return
            if kind is not None and where == "$":
                errors.append(f"[S] {where}.kind: unknown kind {kind!r}")
                return
            errors.extend(min(results, key=len))
            return
        if "type" in schema:
            names = schema["type"] if isinstance(schema["type"], list) else [schema["type"]]
            if not any(self._type_ok(value, n) for n in names):
                errors.append(f"[S] {where}: expected {'/'.join(names)}, got {type(value).__name__}")
                return
        if "const" in schema and not strict_equal(value, schema["const"]):
            errors.append(f"[S] {where}: must be {schema['const']!r}")
        if "enum" in schema and not any(strict_equal(value, e) for e in schema["enum"]):
            errors.append(f"[S] {where}: {value!r} not one of {schema['enum']}")
        if isinstance(value, str) and "pattern" in schema:
            if not re.search(schema["pattern"], value):
                errors.append(f"[S] {where}: {value!r} does not match {schema['pattern']}")
        if is_number(value) and "minimum" in schema and value < schema["minimum"]:
            errors.append(f"[S] {where}: below minimum {schema['minimum']}")
        if isinstance(value, dict):
            for key in schema.get("required", []):
                if key not in value:
                    errors.append(f"[S] {where}: missing required key {key!r}")
            props = schema.get("properties", {})
            extra = schema.get("additionalProperties", True)
            for key, item in value.items():
                if key in props:
                    self._check(props[key], item, f"{where}.{key}", errors)
                elif extra is False:
                    errors.append(f"[S] {where}: unknown key {key!r}")
                elif isinstance(extra, dict):
                    self._check(extra, item, f"{where}.{key}", errors)
        if isinstance(value, list):
            if "minItems" in schema and len(value) < schema["minItems"]:
                errors.append(f"[S] {where}: needs at least {schema['minItems']} items")
            if "items" in schema:
                for index, item in enumerate(value):
                    self._check(schema["items"], item, f"{where}[{index}]", errors)


# --------------------------------------------------------------------------- validation


class Report:
    def __init__(self):
        self.errors: list[str] = []
        self.warnings: list[str] = []
        self.counts: dict[str, dict[str, int]] = {}
        self.pending: list[str] = []
        self.open_attempts: list[str] = []

    def error(self, where, message):
        self.errors.append(f"{where}: {message}")

    def warn(self, where, message):
        self.warnings.append(f"{where}: {message}")


def merged_attempts(records):
    """Return {eventId: merged attempt} applying attempt-update records in order."""
    merged = {}
    for record in records:
        if record.get("kind") == "attempt":
            merged[record["eventId"]] = dict(record)
        elif record.get("kind") == "attempt-update" and record.get("updates") in merged:
            target = merged[record["updates"]]
            for key in MUTABLE:
                if key in record:
                    target[key] = record[key]
    return merged


def check_usage(usage, where, report):
    if not isinstance(usage, dict):
        return
    coverage = usage.get("coverage")
    counters = usage.get("counters") or {}
    values = [counters.get(k) for k in COUNTERS]
    if coverage == "reported":
        if any(v is None for v in values) or usage.get("requestCount") is None:
            report.error(where, "[R7] reported usage needs all four counters and requestCount")
        if usage.get("source") is None:
            report.error(where, "[R7] reported usage needs a source")
        if usage.get("pending"):
            report.error(where, "[R7] reported usage cannot be pending")
    elif coverage == "unavailable":
        if any(v is not None for v in values) or usage.get("requestCount") is not None:
            report.error(where, "[R7] unavailable usage must keep counters and requestCount null")
        if usage.get("extraCounters"):
            report.error(where, "[R7] unavailable usage cannot carry extraCounters")
        if not usage.get("coverageReason"):
            report.error(where, "[R7] unavailable usage needs coverageReason")
    elif coverage == "partial":
        if not usage.get("coverageReason"):
            report.error(where, "[R7] partial usage needs coverageReason")


def check_fields(record, where, report, repo_root: Path):
    model = record.get("model")
    if isinstance(model, dict) and model.get("actualModelIds") and not model.get("actualSource"):
        report.error(where, "[R8] actualModelIds need actualSource")
    totals = record.get("agentToolTotals")
    if isinstance(totals, dict):
        if any(totals.get(k) is not None for k in ("totalTokens", "toolUses", "durationMs")):
            if not totals.get("source"):
                report.error(where, "[R9] agentToolTotals values need a source")
    cost = record.get("cost")
    if isinstance(cost, dict) and cost.get("reportedUsd") is not None and not cost.get("reportedSource"):
        report.error(where, "[R10] reportedUsd needs reportedSource")
    prompt = record.get("prompt")
    if isinstance(prompt, dict):
        path, digest = prompt.get("assignmentPath"), prompt.get("assignmentSha256")
        if (path is None) != (digest is None):
            report.error(where, "[R11] assignmentPath and assignmentSha256 go together")
        elif path is not None:
            check_artifact({"path": path, "sha256": digest}, where + ".prompt", report, repo_root)
    for item in record.get("evidence") or []:
        check_artifact(item, where + ".evidence", report, repo_root)
    usage = record.get("usage")
    if isinstance(usage, dict):
        check_usage(usage, where + ".usage", report)
        source = usage.get("source")
        if isinstance(source, dict) and isinstance(source.get("artifact"), dict):
            check_artifact(source["artifact"], where + ".usage.source", report, repo_root)
    source = record.get("source")
    if record.get("kind") == "request" and isinstance(source, dict):
        if isinstance(source.get("artifact"), dict):
            check_artifact(source["artifact"], where + ".source", report, repo_root)


def check_artifact(artifact, where, report, repo_root: Path):
    if not isinstance(artifact, dict) or not isinstance(artifact.get("path"), str):
        return
    path = repo_root / artifact["path"]
    if not path.is_file():
        report.warn(where, f"[R12] referenced file not present here: {artifact['path']}")
        return
    if artifact.get("sha256") and sha256_file(path) != artifact["sha256"]:
        report.error(where, f"[R12] sha256 mismatch for {artifact['path']}")


def validate_lines(lines, ledger, run_id, schema, report, repo_root: Path, label):
    """lines: list of (line number, text). Returns parsed records that passed parsing."""
    records = []
    last_number = 0
    last_recorded = None
    attempt_keys = set()
    request_ids = set()
    attempts = {}
    counts = report.counts.setdefault(ledger, {})
    for number, text in lines:
        where = f"{label}:{number}"
        if not text.strip():
            report.error(where, "[R0] blank line")
            continue
        for pattern in SECRET_PATTERNS:
            if pattern.search(text):
                report.error(where, "[R15] value looks like a secret; never record secrets")
                break
        try:
            record = json.loads(text, object_pairs_hook=no_duplicate_keys)
        except ValueError as exc:
            report.error(where, f"[R16] not valid JSON or duplicate key: {exc}")
            continue
        if not isinstance(record, dict):
            report.error(where, "[S] record must be a JSON object")
            continue
        for problem in schema.check(record):
            report.error(where, problem)
        kind = record.get("kind")
        counts[str(kind)] = counts.get(str(kind), 0) + 1
        event_id = record.get("eventId")
        if record.get("ledger") != ledger:
            report.error(where, f"[R2] ledger field must be {ledger!r}")
        if record.get("runId") != run_id:
            report.error(where, f"[R2] runId must be {run_id!r}")
        if isinstance(event_id, str) and re.match(r"^(a|b|shared)-\d{4,}$", event_id):
            prefix, number_text = event_id.rsplit("-", 1)
            if prefix != ledger:
                report.error(where, f"[R1] eventId prefix must be {ledger!r}")
            if int(number_text) <= last_number:
                report.error(where, "[R1] eventId numbers must strictly increase in file order")
            last_number = max(last_number, int(number_text))
        for key in ("recordedAt", "startedAt", "endedAt", "timestamp", "occurredAt"):
            value = record.get(key)
            if isinstance(value, str) and TS_RE.match(value):
                try:
                    parse_ts(value)
                except ValueError:
                    report.error(where, f"[R17] {key} is not a real date/time")
        recorded = record.get("recordedAt")
        if isinstance(recorded, str) and TS_RE.match(recorded):
            try:
                stamp = parse_ts(recorded)
                if last_recorded and stamp < last_recorded:
                    report.error(where, "[R3] recordedAt must not decrease (append-only order)")
                last_recorded = stamp
            except ValueError:
                pass
        if kind == "attempt":
            key = (record.get("unit"), record.get("role"), record.get("attempt"))
            if key in attempt_keys:
                report.error(where, f"[R4] duplicate attempt {key}")
            attempt_keys.add(key)
            attempts[event_id] = record
        elif kind == "attempt-update":
            if record.get("updates") not in attempts:
                report.error(where, "[R5] updates must name an earlier attempt in this ledger")
            if not any(k in record for k in MUTABLE):
                report.error(where, "[R5] an update must change at least one field")
        elif kind == "request":
            if record.get("attemptEventId") not in attempts:
                report.error(where, "[R6] attemptEventId must name an earlier attempt")
            request_id = record.get("requestId")
            if request_id in request_ids:
                report.error(where, f"[R6] duplicate requestId {request_id!r}")
            request_ids.add(request_id)
        check_fields(record, where, report, repo_root)
        records.append(record)

    merged = merged_attempts(records)
    by_attempt: dict[str, list[dict]] = {}
    for record in records:
        if record.get("kind") == "request":
            by_attempt.setdefault(record.get("attemptEventId"), []).append(record)
    for event_id, attempt in merged.items():
        where = f"{label}:{event_id}"
        started, ended = attempt.get("startedAt"), attempt.get("endedAt")
        if isinstance(started, str) and isinstance(ended, str):
            try:
                if parse_ts(ended) < parse_ts(started):
                    report.error(where, "[R13] endedAt precedes startedAt")
            except ValueError:
                pass
        usage = attempt.get("usage") or {}
        requests = by_attempt.get(event_id, [])
        if requests:
            if usage.get("coverage") == "unavailable":
                report.error(where, "[R14] request records exist but usage says unavailable")
            if usage.get("coverage") == "reported":
                counters = usage.get("counters") or {}
                for key in COUNTERS:
                    total = sum((r["usage"]["counters"].get(key) or 0) for r in requests)
                    if counters.get(key) != total:
                        report.error(where, f"[R14] {key} {counters.get(key)} != request sum {total}")
                if usage.get("requestCount") != len(requests):
                    report.error(where, "[R14] requestCount differs from request records")
                model_ids = sorted({r["model"] for r in requests if r.get("model")})
                actual = (attempt.get("model") or {}).get("actualModelIds")
                if actual is not None and sorted(actual) != model_ids:
                    report.error(where, "[R14] actualModelIds differ from request models")
        if usage.get("pending"):
            report.pending.append(f"{ledger}:{event_id} {attempt.get('unit')}")
        if attempt.get("status") == "started":
            report.open_attempts.append(f"{ledger}:{event_id} {attempt.get('unit')}")
    return records


def read_lines(path: Path):
    with open(path, encoding="utf-8") as handle:
        text = handle.read()
    if text and not text.endswith("\n"):
        return None
    return [(i + 1, line) for i, line in enumerate(text.splitlines())]


def validate_run(run_dir: Path, repo_root: Path | None, schema: Schema) -> Report:
    report = Report()
    run_dir = run_dir.resolve()
    repo_root = (repo_root or find_repo_root(run_dir)).resolve()
    run_id = run_dir.name
    found = 0
    for child in sorted(run_dir.iterdir()):
        events = child / "events.jsonl"
        if child.is_dir() and events.exists() and child.name not in LEDGERS:
            report.error(str(events), "[R2] ledger directory must be a, b or shared")
    for ledger in LEDGERS:
        path = run_dir / ledger / "events.jsonl"
        if not path.exists():
            continue
        found += 1
        lines = read_lines(path)
        label = str(path.relative_to(repo_root)) if path.is_relative_to(repo_root) else str(path)
        if lines is None:
            report.error(label, "[R0] file must end with a newline")
            continue
        validate_lines(lines, ledger, run_id, schema, report, repo_root, label)
    if not found:
        report.error(str(run_dir), "no a/, b/ or shared/ events.jsonl ledger found")
    return report


def print_report(report: Report, as_json: bool):
    if as_json:
        print(
            json.dumps(
                {
                    "ok": not report.errors,
                    "counts": report.counts,
                    "errors": report.errors,
                    "warnings": report.warnings,
                    "pendingUsage": report.pending,
                    "openAttempts": report.open_attempts,
                },
                indent=2,
            )
        )
        return
    for ledger, counts in report.counts.items():
        summary = ", ".join(f"{k}={v}" for k, v in sorted(counts.items())) or "empty"
        print(f"ledger {ledger}: {summary}")
    for item in report.pending:
        print(f"pending usage: {item}")
    for item in report.open_attempts:
        print(f"open attempt: {item}")
    for item in report.warnings:
        print(f"warning: {item}")
    for item in report.errors:
        print(f"ERROR: {item}")
    print("OK" if not report.errors else f"FAILED: {len(report.errors)} error(s)")


# --------------------------------------------------------------------------- writers


def ledger_path(run_dir: Path, ledger: str) -> Path:
    if ledger not in LEDGERS:
        raise SystemExit(f"ledger must be one of {LEDGERS}")
    return run_dir / ledger / "events.jsonl"


def existing(run_dir: Path, ledger: str):
    path = ledger_path(run_dir, ledger)
    if not path.exists():
        return path, [], []
    lines = read_lines(path)
    if lines is None:
        raise SystemExit(f"{path} does not end with a newline; refusing to append")
    records = [json.loads(text) for _, text in lines if text.strip()]
    return path, lines, records


def next_event_id(ledger: str, records, offset: int = 0) -> str:
    numbers = [int(r["eventId"].rsplit("-", 1)[1]) for r in records if "eventId" in r]
    return f"{ledger}-{(max(numbers, default=0) + 1 + offset):04d}"


def append_checked(run_dir: Path, ledger: str, new_records, repo_root: Path, dry_run: bool):
    path, lines, _ = existing(run_dir, ledger)
    texts = [json.dumps(r, ensure_ascii=False, separators=(", ", ": ")) for r in new_records]
    candidate = lines + [(len(lines) + i + 1, t) for i, t in enumerate(texts)]
    report = Report()
    label = f"{ledger}/events.jsonl (with new lines)"
    validate_lines(candidate, ledger, run_dir.name, Schema(), report, repo_root, label)
    if report.errors:
        print_report(report, False)
        raise SystemExit("refusing to append: the ledger would not validate")
    if dry_run:
        print("\n".join(texts))
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "a", encoding="utf-8") as handle:
        for text in texts:
            handle.write(text + "\n")
    for record in new_records:
        print(f"appended {record['eventId']} ({record['kind']}) to {path}")


def null_usage(reason: str, pending: bool):
    return {
        "coverage": "unavailable",
        "coverageReason": reason,
        "pending": pending,
        "requestCount": None,
        "counters": {k: None for k in COUNTERS},
        "extraCounters": {},
        "source": None,
    }


def rel_to_repo(path: Path, repo_root: Path) -> str:
    resolved = path.resolve()
    if not resolved.is_relative_to(repo_root):
        raise SystemExit(f"{path} must be inside the repository {repo_root}")
    return resolved.relative_to(repo_root).as_posix()


def git_head(repo_root: Path):
    try:
        out = subprocess.run(
            ["git", "-C", str(repo_root), "rev-parse", "HEAD"],
            check=True,
            capture_output=True,
            text=True,
        )
        return out.stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return None


def cmd_start(args, run_dir: Path, repo_root: Path):
    _, _, records = existing(run_dir, args.ledger)
    prompt = {"assignmentPath": None, "assignmentSha256": None, "ownerInstructionCount": None}
    if args.assignment:
        assignment = Path(args.assignment)
        prompt["assignmentPath"] = rel_to_repo(assignment, repo_root)
        prompt["assignmentSha256"] = sha256_file(assignment)
    record = {
        "schemaVersion": 1,
        "eventId": next_event_id(args.ledger, records),
        "runId": run_dir.name,
        "ledger": args.ledger,
        "kind": "attempt",
        "recordedAt": now_ts(),
        "recordedBy": args.recorded_by,
        "unit": args.unit,
        "attempt": args.attempt,
        "role": args.role,
        "phase": args.phase,
        "repository": args.repository,
        "status": "started",
        "startedAt": normalize_ts(args.started_at) if args.started_at else now_ts(),
        "endedAt": None,
        "commits": {"before": args.commit_before or git_head(repo_root), "after": None},
        "prompt": prompt,
        "model": {
            "requested": {
                "agentTool": args.agent_tool,
                "subagentType": args.subagent_type,
                "model": args.requested_model,
                "effort": args.requested_effort,
            },
            "actualModelIds": None,
            "actualSource": None,
        },
        "usage": null_usage("pending coordinator extraction from the worker transcript", True),
        "agentToolTotals": {"totalTokens": None, "toolUses": None, "durationMs": None, "source": None},
        "cost": {"reportedUsd": None, "reportedSource": None, "estimate": None},
        "humanMinutes": None,
        "evidence": [],
        "notes": args.notes,
    }
    append_checked(run_dir, args.ledger, [record], repo_root, args.dry_run)


def cmd_update(args, run_dir: Path, repo_root: Path):
    _, _, records = existing(run_dir, args.ledger)
    merged = merged_attempts(records)
    if args.attempt_event not in merged:
        raise SystemExit(f"no attempt {args.attempt_event} in {args.ledger}")
    current = merged[args.attempt_event]
    update = {
        "schemaVersion": 1,
        "eventId": next_event_id(args.ledger, records),
        "runId": run_dir.name,
        "ledger": args.ledger,
        "kind": "attempt-update",
        "recordedAt": now_ts(),
        "recordedBy": args.recorded_by,
        "updates": args.attempt_event,
        "reason": args.reason,
    }
    if args.status:
        update["status"] = args.status
    if args.ended_at:
        update["endedAt"] = normalize_ts(args.ended_at)
    if args.commit_after or args.commit_before:
        commits = dict(current["commits"])
        if args.commit_before:
            commits["before"] = args.commit_before
        if args.commit_after:
            commits["after"] = args.commit_after
        update["commits"] = commits
    if args.human_minutes is not None:
        update["humanMinutes"] = args.human_minutes
    if args.evidence:
        items = list(current.get("evidence") or [])
        for item in args.evidence:
            path = Path(item)
            items.append({"path": rel_to_repo(path, repo_root), "sha256": sha256_file(path)})
        update["evidence"] = items
    if args.notes:
        update["notes"] = args.notes
    append_checked(run_dir, args.ledger, [update], repo_root, args.dry_run)


def cmd_import(args, run_dir: Path, repo_root: Path):
    _, _, records = existing(run_dir, args.ledger)
    merged = merged_attempts(records)
    if args.attempt_event not in merged:
        raise SystemExit(f"no attempt {args.attempt_event} in {args.ledger}")
    attempt = merged[args.attempt_event]
    known = {r.get("requestId") for r in records if r.get("kind") == "request"}
    source_path = Path(args.records)
    artifact = {"path": rel_to_repo(source_path, repo_root), "sha256": sha256_file(source_path)}
    rows = []
    with open(source_path, encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                rows.append(json.loads(line))
    if not rows:
        raise SystemExit("the records file is empty; record coverage by hand with 'update'")
    duplicate = [r.get("requestId") for r in rows if r.get("requestId") in known]
    if duplicate:
        raise SystemExit(f"already imported: {duplicate[:3]} ...; refusing to double count")
    new = []
    totals = {k: 0 for k in COUNTERS}
    extra_totals: dict[str, float] = {}
    complete = True
    models = set()
    for offset, row in enumerate(rows):
        usage = row.get("usage") or {}
        counters = {k: usage.get(k) if is_int(usage.get(k)) else None for k in COUNTERS}
        extra = {k: v for k, v in usage.items() if k not in COUNTERS and is_number(v)}
        if any(v is None for v in counters.values()):
            complete = False
        for key, value in counters.items():
            totals[key] += value or 0
        for key, value in extra.items():
            extra_totals[key] = extra_totals.get(key, 0) + value
        if row.get("model"):
            models.add(row["model"])
        else:
            complete = False
        new.append(
            {
                "schemaVersion": 1,
                "eventId": next_event_id(args.ledger, records, offset),
                "runId": run_dir.name,
                "ledger": args.ledger,
                "kind": "request",
                "recordedAt": now_ts(),
                "recordedBy": args.recorded_by,
                "attemptEventId": args.attempt_event,
                "requestId": row.get("requestId"),
                "timestamp": normalize_ts(row.get("timestamp")),
                "provider": args.provider,
                "model": row.get("model"),
                "usage": {"counters": counters, "extraCounters": extra},
                "source": {"tool": USAGE_TOOL, "artifact": artifact},
            }
        )
    usage = {
        "coverage": "reported" if complete else "partial",
        "coverageReason": None if complete else "some requests lack counters or model ID",
        "pending": False,
        "requestCount": len(rows),
        "counters": totals,
        "extraCounters": extra_totals,
        "source": {"tool": USAGE_TOOL, "artifact": artifact},
    }
    if args.coverage_reason:
        usage["coverage"] = "partial"
        usage["coverageReason"] = args.coverage_reason
    update = {
        "schemaVersion": 1,
        "eventId": next_event_id(args.ledger, records, len(rows)),
        "runId": run_dir.name,
        "ledger": args.ledger,
        "kind": "attempt-update",
        "recordedAt": now_ts(),
        "recordedBy": args.recorded_by,
        "updates": args.attempt_event,
        "reason": args.reason or "usage imported from the worker transcript",
        "usage": usage,
        "model": {
            "requested": attempt["model"]["requested"],
            "actualModelIds": sorted(models) or None,
            "actualSource": "transcript message.model via " + USAGE_TOOL if models else None,
        },
    }
    if any(v is not None for v in (args.agent_total_tokens, args.agent_tool_uses, args.agent_duration_ms)):
        update["agentToolTotals"] = {
            "totalTokens": args.agent_total_tokens,
            "toolUses": args.agent_tool_uses,
            "durationMs": args.agent_duration_ms,
            "source": "Agent tool completion notice",
        }
    if args.status:
        update["status"] = args.status
    if args.ended_at:
        update["endedAt"] = normalize_ts(args.ended_at)
    if args.commit_after:
        update["commits"] = {"before": attempt["commits"]["before"], "after": args.commit_after}
    append_checked(run_dir, args.ledger, new + [update], repo_root, args.dry_run)


# --------------------------------------------------------------------------- self-test


def _base_records(run_id: str):
    attempt = {
        "schemaVersion": 1,
        "eventId": "shared-0001",
        "runId": run_id,
        "ledger": "shared",
        "kind": "attempt",
        "recordedAt": "2026-11-14T00:00:00Z",
        "recordedBy": "self-test",
        "unit": "Q00",
        "attempt": 1,
        "role": "implementer",
        "phase": "shared-preparation",
        "repository": "qrwty",
        "status": "started",
        "startedAt": "2026-11-14T00:00:00Z",
        "endedAt": None,
        "commits": {"before": "0e2e1f2", "after": None},
        "prompt": {"assignmentPath": None, "assignmentSha256": None, "ownerInstructionCount": None},
        "model": {
            "requested": {"agentTool": "Agent", "subagentType": "general-purpose", "model": "inherited", "effort": None},
            "actualModelIds": None,
            "actualSource": None,
        },
        "usage": null_usage("pending", True),
        "agentToolTotals": {"totalTokens": None, "toolUses": None, "durationMs": None, "source": None},
        "cost": {"reportedUsd": None, "reportedSource": None, "estimate": None},
        "humanMinutes": None,
        "evidence": [],
        "notes": None,
    }
    request = {
        "schemaVersion": 1,
        "eventId": "shared-0002",
        "runId": run_id,
        "ledger": "shared",
        "kind": "request",
        "recordedAt": "2026-11-14T01:00:00Z",
        "recordedBy": "self-test",
        "attemptEventId": "shared-0001",
        "requestId": "msg_1",
        "timestamp": "2026-11-14T00:10:00.5Z",
        "provider": "anthropic",
        "model": "model-x",
        "usage": {
            "counters": {"input_tokens": 3, "cache_creation_input_tokens": 5, "cache_read_input_tokens": 7, "output_tokens": 11},
            "extraCounters": {},
        },
        "source": {"tool": USAGE_TOOL, "artifact": {"path": "records.jsonl", "sha256": None}},
    }
    update = {
        "schemaVersion": 1,
        "eventId": "shared-0003",
        "runId": run_id,
        "ledger": "shared",
        "kind": "attempt-update",
        "recordedAt": "2026-11-14T01:00:00Z",
        "recordedBy": "self-test",
        "updates": "shared-0001",
        "reason": "usage imported",
        "status": "passed",
        "endedAt": "2026-11-14T00:30:00Z",
        "usage": {
            "coverage": "reported",
            "coverageReason": None,
            "pending": False,
            "requestCount": 1,
            "counters": {"input_tokens": 3, "cache_creation_input_tokens": 5, "cache_read_input_tokens": 7, "output_tokens": 11},
            "extraCounters": {},
            "source": {"tool": USAGE_TOOL, "artifact": None},
        },
        "model": {
            "requested": {"agentTool": "Agent", "subagentType": "general-purpose", "model": "inherited", "effort": None},
            "actualModelIds": ["model-x"],
            "actualSource": "transcript message.model",
        },
    }
    human = {
        "schemaVersion": 1,
        "eventId": "shared-0004",
        "runId": run_id,
        "ledger": "shared",
        "kind": "human",
        "recordedAt": "2026-11-14T01:00:01Z",
        "recordedBy": "self-test",
        "unit": None,
        "who": "owner",
        "activity": "decision",
        "occurredAt": None,
        "messageCount": None,
        "minutes": None,
        "description": "test",
        "evidence": [],
    }
    return [attempt, request, update, human]


def _mutations():
    def setter(index, path, value):
        def apply(records):
            target = records[index]
            for key in path[:-1]:
                target = target[key]
            if value is _DELETE:
                del target[path[-1]]
            else:
                target[path[-1]] = value
            return records

        return apply

    def raw_line(text):
        def apply(records):
            records.append(text)
            return records

        return apply

    def duplicate_attempt(records):
        copy = json.loads(json.dumps(records[0]))
        copy["eventId"] = "shared-0005"
        copy["recordedAt"] = "2026-11-14T02:00:00Z"
        records.append(copy)
        return records

    return [
        ("duplicate attempt", duplicate_attempt, "[R4]"),
        ("artifact hash mismatch", setter(1, ["source", "artifact", "sha256"], "0" * 64), "[R12]"),
        ("prompt path without hash", setter(0, ["prompt", "assignmentPath"], "packet.md"), "[R11]"),
        ("unknown top-level key", setter(0, ["totalTokens"], 5), "[S]"),
        ("missing required field", setter(0, ["status"], _DELETE), "[S]"),
        ("bad status", setter(0, ["status"], "done"), "[S]"),
        ("bool as counter", setter(1, ["usage", "counters", "input_tokens"], True), "[S]"),
        ("negative counter", setter(1, ["usage", "counters", "output_tokens"], -1), "[S]"),
        ("cost estimate without label", setter(0, ["cost", "estimate"], {"usd": 1, "priceSource": "x", "priceDate": "2026-11-14", "method": "m"}), "[S]"),
        ("reported cost without source", setter(0, ["cost", "reportedUsd"], 1.5), "[R10]"),
        ("wrong ledger prefix", setter(1, ["eventId"], "a-0002"), "[R1]"),
        ("event order", setter(2, ["eventId"], "shared-0002"), "[R1]"),
        ("wrong runId", setter(3, ["runId"], "other-run"), "[R2]"),
        ("recordedAt decreases", setter(3, ["recordedAt"], "2026-11-13T00:00:00Z"), "[R3]"),
        ("update of unknown attempt", setter(2, ["updates"], "shared-0099"), "[R5]"),
        ("request of unknown attempt", setter(1, ["attemptEventId"], "shared-0099"), "[R6]"),
        ("unavailable with counters", setter(0, ["usage", "counters", "input_tokens"], 4), "[R7]"),
        ("reported without counters", setter(2, ["usage", "counters", "output_tokens"], None), "[R7]"),
        ("actual model without source", setter(2, ["model", "actualSource"], None), "[R8]"),
        ("agent totals without source", setter(0, ["agentToolTotals", "toolUses"], 3), "[R9]"),
        ("sum mismatch (double count)", setter(2, ["usage", "counters", "input_tokens"], 6), "[R14]"),
        ("model mismatch", setter(2, ["model", "actualModelIds"], ["model-y"]), "[R14]"),
        ("ended before started", setter(2, ["endedAt"], "2026-11-13T23:00:00Z"), "[R13]"),
        ("impossible date", setter(3, ["occurredAt"], "2026-02-30T00:00:00Z"), "[R17]"),
        ("secret value", setter(3, ["description"], "key sk_test_" + "A1b2C3d4E5f6G7h8"), "[R15]"),
        ("duplicate key", raw_line('{"schemaVersion": 1, "schemaVersion": 1}'), "[R16]"),
        ("absolute evidence path", setter(0, ["evidence"], [{"path": "/etc/passwd", "sha256": None}]), "[S]"),
        ("parent evidence path", setter(0, ["evidence"], [{"path": "docs/../../x", "sha256": None}]), "[S]"),
    ]


_DELETE = object()


def cmd_self_test() -> int:
    schema = Schema()
    run_id = "self-test-run"
    failures = 0

    def run(records):
        report = Report()
        lines = []
        for i, record in enumerate(records):
            text = record if isinstance(record, str) else json.dumps(record)
            lines.append((i + 1, text))
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / "records.jsonl").write_text('{"requestId": "msg_1"}\n', encoding="utf-8")
            validate_lines(lines, "shared", run_id, schema, report, Path(tmp), "self-test")
        return report

    base = run(_base_records(run_id))
    if base.errors:
        failures += 1
        print("FAIL valid base ledger produced errors:")
        for item in base.errors:
            print("   ", item)
    else:
        print("ok   valid base ledger accepted")
    for name, mutate, code in _mutations():
        records = json.loads(json.dumps(_base_records(run_id)))
        report = run(mutate(records))
        if any(code in e for e in report.errors):
            print(f"ok   rejects {name} {code}")
        else:
            failures += 1
            print(f"FAIL did not reject {name} (expected {code}); errors: {report.errors}")
    print("SELF-TEST OK" if not failures else f"SELF-TEST FAILED: {failures}")
    return 1 if failures else 0


# --------------------------------------------------------------------------- CLI


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)

    p_validate = sub.add_parser("validate", help="validate every ledger in a run directory")
    p_validate.add_argument("run_dir", nargs="?", default=str(HERE))
    p_validate.add_argument("--repo-root")
    p_validate.add_argument("--json", action="store_true")

    sub.add_parser("self-test", help="prove the validator rejects known-bad records")

    def common(p):
        p.add_argument("--run-dir", default=str(HERE))
        p.add_argument("--repo-root")
        p.add_argument("--ledger", required=True, choices=LEDGERS)
        p.add_argument("--recorded-by", required=True)
        p.add_argument("--dry-run", action="store_true")

    p_start = sub.add_parser("start-attempt", help="append an attempt record before work starts")
    common(p_start)
    p_start.add_argument("--unit", required=True)
    p_start.add_argument("--attempt", required=True, type=int)
    p_start.add_argument("--role", required=True)
    p_start.add_argument("--phase", required=True)
    p_start.add_argument("--repository", required=True)
    p_start.add_argument("--started-at")
    p_start.add_argument("--commit-before")
    p_start.add_argument("--assignment", help="saved assignment packet (hashed)")
    p_start.add_argument("--agent-tool", default="Claude Code Agent tool")
    p_start.add_argument("--subagent-type", default="general-purpose")
    p_start.add_argument("--requested-model")
    p_start.add_argument("--requested-effort")
    p_start.add_argument("--notes")

    p_update = sub.add_parser("update", help="append an attempt-update record")
    common(p_update)
    p_update.add_argument("--attempt-event", required=True)
    p_update.add_argument("--reason", required=True)
    p_update.add_argument("--status")
    p_update.add_argument("--ended-at")
    p_update.add_argument("--commit-before")
    p_update.add_argument("--commit-after")
    p_update.add_argument("--human-minutes", type=float)
    p_update.add_argument("--evidence", action="append")
    p_update.add_argument("--notes")

    p_import = sub.add_parser("import-usage", help="append request records and usage totals")
    common(p_import)
    p_import.add_argument("--attempt-event", required=True)
    p_import.add_argument("--records", required=True, help="saved output of transcript-usage.py --records")
    p_import.add_argument("--provider", default="anthropic")
    p_import.add_argument("--reason")
    p_import.add_argument("--coverage-reason", help="mark coverage partial with this reason")
    p_import.add_argument("--status")
    p_import.add_argument("--ended-at")
    p_import.add_argument("--commit-after")
    p_import.add_argument("--agent-total-tokens", type=int)
    p_import.add_argument("--agent-tool-uses", type=int)
    p_import.add_argument("--agent-duration-ms", type=int)

    args = parser.parse_args(argv)
    if args.command == "self-test":
        return cmd_self_test()
    if args.command == "validate":
        run_dir = Path(args.run_dir)
        root = Path(args.repo_root) if args.repo_root else None
        report = validate_run(run_dir, root, Schema())
        print_report(report, args.json)
        return 1 if report.errors else 0
    run_dir = Path(args.run_dir).resolve()
    repo_root = Path(args.repo_root).resolve() if args.repo_root else find_repo_root(run_dir).resolve()
    {"start-attempt": cmd_start, "update": cmd_update, "import-usage": cmd_import}[args.command](
        args, run_dir, repo_root
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Q13: spend computed from each billable resource's lifetime (cloud create and delete times, from
Cloud Audit Logs and the resources' createTime) at the requoted list prices (cost-quote.json).
Not a billing figure: Cloud Billing reports lag and this project has no billing export.
Lifetimes run to the delete operation's completion (an upper bound)."""
import json
from datetime import datetime
from pathlib import Path

q = json.loads((Path(__file__).resolve().parents[1] / "cost-quote.json").read_text())
price = {r["sku"].split("/")[1]: r["unitPriceUsd"] for r in q["fixedHourly"]}
h = lambda a, b: (datetime.fromisoformat(b) - datetime.fromisoformat(a)).total_seconds() / 3600
rows = [
    ("Cloud SQL db-f1-micro", 1, h("2026-11-15T12:01:07+00:00", "2026-11-15T13:10:06+00:00"), price["C2D4-F7DF-B8D0"]),
    ("Cloud SQL 10 GiB storage", 1, h("2026-11-15T12:01:07+00:00", "2026-11-15T13:10:06+00:00"), 10 * price["C18F-7FE0-0717"] / 730),
    ("Valkey hot-routes node", 1, h("2026-11-15T12:00:31+00:00", "2026-11-15T13:19:41+00:00"), price["1E97-7EC7-226D"]),
    ("Valkey admission-cache node", 1, h("2026-11-15T12:00:31+00:00", "2026-11-15T13:18:55+00:00"), price["1E97-7EC7-226D"]),
    ("PSC endpoints, hot-routes (2)", 2, h("2026-11-15T12:00:31+00:00", "2026-11-15T13:19:41+00:00"), price["9E4E-F9A7-5EAE"]),
    ("PSC endpoints, admission-cache (2)", 2, h("2026-11-15T12:00:31+00:00", "2026-11-15T13:18:55+00:00"), price["9E4E-F9A7-5EAE"]),
    ("Cloud NAT gateway and its IP", 1, h("2026-11-15T12:00:30+00:00", "2026-11-15T13:08:17+00:00"), price["32E2-4EFC-EF9F"] + price["8515-9425-D2CE"]),
    ("Redirect min instance (idle CPU and memory)", 1, h("2026-11-15T12:21:43+00:00", "2026-11-15T13:07:59+00:00"), 0.0000025 * 3600 + 0.0000025 * 0.5 * 3600),
    ("Worker pool instance", 1, h("2026-11-15T12:21:44+00:00", "2026-11-15T13:07:59+00:00"), 0.000011244 * 3600 + 0.000001235 * 0.5 * 3600),
    ("Worker pool second instance (P10)", 1, h("2026-11-15T12:56:20+00:00", "2026-11-15T12:59:30+00:00"), 0.000011244 * 3600 + 0.000001235 * 0.5 * 3600),
    ("Secret Manager versions (17, as if none were free)", 17, h("2026-11-15T12:00:30+00:00", "2026-11-15T13:08:30+00:00"), 0.06 / 730),
]
usage = [
    ("Cloud Run job executions (5 migrate, 13 probe; 60 s each, 1 vCPU, 0.5 GiB)", 18 * 60 * (0.000018 + 0.5 * 0.000002)),
    ("Cloud Run service requests (about 1,700, 50 ms CPU each at request-based rates)", 1700 * 0.05 * (0.000024 + 0.5 * 0.0000025)),
    ("Artifact Registry storage (two images, about 0.45 GB, 1.4 h)", 0.45 * 0.10 / 730 * 1.4),
    ("Pub/Sub (21 publishes, 20 dead letters, 11 archive objects), Cloud Storage, logging", 0.0),
    ("Web Risk lookups (6, inside the free 100,000)", 0.0),
]
out = [{"resource": r, "quantity": n, "hours": round(hh, 3), "usdPerHourEach": round(p, 6), "usd": round(n * hh * p, 4)} for r, n, hh, p in rows]
out += [{"resource": r, "usd": round(u, 4)} for r, u in usage]
total = sum(o["usd"] for o in out)
print(json.dumps({"method": __doc__.strip(), "rows": out, "totalUsd": round(total, 2)}, indent=1))

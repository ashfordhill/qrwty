#!/usr/bin/env python3
"""Steady traffic to one public, IAM-protected Cloud Run URL for a fixed time, with the owner's ID
token held in memory (never printed). One JSON line per request: monotonic offset, status, ms.
  traffic.py <url> <seconds> <rps> <out.jsonl>"""
import http.client, json, subprocess, sys, time, urllib.parse
url, seconds, rps, outp = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), sys.argv[4]
token = subprocess.run(["gcloud", "auth", "print-identity-token"], capture_output=True, text=True, check=True).stdout.strip()
u = urllib.parse.urlsplit(url)
conn = None
t0 = time.monotonic()
with open(outp, "w") as f:
    i = 0
    while time.monotonic() - t0 < seconds:
        due = t0 + i / rps
        if due > time.monotonic():
            time.sleep(due - time.monotonic())
        s = time.monotonic()
        rec = {"i": i, "atS": round(s - t0, 3)}
        try:
            if conn is None:
                conn = http.client.HTTPSConnection(u.netloc, timeout=10)
            conn.request("GET", u.path or "/", headers={"Authorization": f"Bearer {token}"})
            r = conn.getresponse()
            body = r.read()
            rec.update(status=r.status, ms=round((time.monotonic() - s) * 1000, 1), retryAfter=r.getheader("retry-after"), body=body[:80].decode("utf8", "replace"))
        except Exception as e:
            rec.update(status=None, error=f"{type(e).__name__}: {e}"[:120], ms=round((time.monotonic() - s) * 1000, 1))
            try:
                conn.close()
            except Exception:
                pass
            conn = None
        f.write(json.dumps(rec) + "\n")
        f.flush()
        i += 1
print("requests", i)

#!/usr/bin/env python3
"""P04: add one version to each of A's credential secrets, generated here and piped to gcloud, and
set the Cloud SQL `postgres` admin's password to the qrwtya-postgres-admin value through the SQL
Admin API (request body, over TLS). No value is printed, written to a file or passed as an
argument. Refuses a secret that already has an enabled version (no silent rotation).

  bootstrap-secrets.py <project> <instance> <secret id> [<secret id> ...]
"""
import base64, json, secrets, subprocess, sys, time, urllib.request

project, instance, ids = sys.argv[1], sys.argv[2], sys.argv[3:]
out = []
admin = None
for sid in ids:
    assert sid.startswith("qrwtya-") and sid != "qrwtya-memorystore-ca", sid
    existing = subprocess.run(["gcloud", "secrets", "versions", "list", sid, f"--project={project}", "--filter=state=ENABLED",
                               "--format=value(name)"], capture_output=True, text=True, check=True).stdout.split()
    if existing:
        out.append({"secret": sid, "added": False, "reason": "already has an enabled version"})
        continue
    if sid == "qrwtya-link-replay-keys":
        # Q06's ring: one line "<kid> <32 bytes base64url>"; the kid must not look like a development one.
        value = f"kq13{time.strftime('%Y%m%d', time.gmtime())} {base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip('=')}\n"
    else:
        value = secrets.token_bytes(32).hex()  # the export's own format (scripts/setup.mjs)
    r = subprocess.run(["gcloud", "secrets", "versions", "add", sid, f"--project={project}", "--data-file=-", "--format=value(name)"],
                       input=value, capture_output=True, text=True)
    out.append({"secret": sid, "added": r.returncode == 0, "version": r.stdout.strip().rsplit("/", 1)[-1] if r.returncode == 0 else None,
                "error": None if r.returncode == 0 else r.stderr.strip()[-200:]})
    if sid == "qrwtya-postgres-admin":
        admin = value
if admin is not None:
    token = subprocess.run(["gcloud", "auth", "print-access-token"], capture_output=True, text=True, check=True).stdout.strip()
    req = urllib.request.Request(
        f"https://sqladmin.googleapis.com/v1/projects/{project}/instances/{instance}/users?name=postgres", method="PUT",
        data=json.dumps({"name": "postgres", "password": admin}).encode(),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        op = json.load(resp)
    out.append({"sqlUser": "postgres", "operation": op.get("operationType"), "status": op.get("status")})
print(json.dumps(out, indent=1))

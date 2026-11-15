#!/usr/bin/env python3
"""Once per stack (A2, from Q13's P04): add the first version of each of arm A's credential
secrets, generated here and piped to gcloud, and set the Cloud SQL `postgres` admin's password to
the qrwtya-postgres-admin value through the SQL Admin API (request body, over TLS). No value is
printed, written to a file or passed as an argument. A secret that already has an enabled version
is left as it is (no silent rotation), so a rerun changes nothing.

  infra/gcp/scripts/bootstrap-secrets.py <project> <instance> <secret id> [<secret id> ...]

The secret ids are OpenTofu's `secret_ids` output (every qrwtya- secret but the caches' CAs).
"""
import base64, json, secrets, subprocess, sys, time, urllib.request

project, instance, ids = sys.argv[1], sys.argv[2], sys.argv[3:]
out, admin = [], None
for sid in ids:
    assert sid.startswith("qrwtya-") and not sid.startswith("qrwtya-memorystore-ca"), sid
    existing = subprocess.run(["gcloud", "secrets", "versions", "list", sid, f"--project={project}", "--filter=state=ENABLED",
                               "--format=value(name)"], capture_output=True, text=True, check=True).stdout.split()
    if existing:
        out.append({"secret": sid, "added": False, "reason": "already has an enabled version"})
        continue
    if sid == "qrwtya-link-replay-keys":
        # Q06's ring: one line "<kid> <32 bytes base64url>"; the kid must not look like a development one.
        value = f"ka{time.strftime('%Y%m%d', time.gmtime())} {base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip('=')}\n"
    else:
        value = secrets.token_bytes(32).hex()  # the export's own format (scripts/setup.mjs)
    r = subprocess.run(["gcloud", "secrets", "versions", "add", sid, f"--project={project}", "--data-file=-", "--format=value(name)"],
                       input=value, capture_output=True, text=True)
    out.append({"secret": sid, "added": r.returncode == 0, "version": r.stdout.strip().rsplit("/", 1)[-1] if r.returncode == 0 else None,
                "error": None if r.returncode == 0 else r.stderr.strip()[-200:]})
    if sid == "qrwtya-postgres-admin" and r.returncode == 0:
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
sys.exit(0 if all(o.get("added", True) or o.get("reason") for o in out) else 1)

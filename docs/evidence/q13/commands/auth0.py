#!/usr/bin/env python3
"""Arm A's Auth0 objects for Q13 (qrwtya- only). Reads AUTH0_DOMAIN, AUTH0_MGMT_CLIENT_ID and
AUTH0_MGMT_CLIENT_SECRET from the environment (loaded by the caller with set -a; . file; set +a).
Never prints a credential or the tenant domain: output names objects by label.

  auth0.py check                      what qrwtya- objects exist (labels only)
  auth0.py create                     the qrwtya-api API and the qrwtya-web M2M application + grant
  auth0.py emit-web-credentials       JSON {client_id, client_secret} on stdout, for a pipe into
                                      `gcloud secrets versions add --data-file=-` only
  auth0.py write-tfvars FILE          append auth0_domain to a tfvars file (scratch, never Git)
  auth0.py delete                     delete the grant, qrwtya-web and qrwtya-api
"""
import json, os, re, sys, urllib.parse, urllib.request, urllib.error

API_NAME, API_ID, WEB_NAME = "qrwtya-api", "https://api.qrwtya.qrwty.io", "qrwtya-web"
domain = os.environ["AUTH0_DOMAIN"].strip().removeprefix("https://").rstrip("/")


def call(method, path, body=None, token=None):
    req = urllib.request.Request(f"https://{domain}{path}", method=method,
                                 data=None if body is None else json.dumps(body).encode(),
                                 headers={"content-type": "application/json", **({"authorization": f"Bearer {token}"} if token else {})})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            text = r.read().decode()
            return r.status, (json.loads(text) if text else None)
    except urllib.error.HTTPError as e:
        text = e.read().decode()
        try:
            return e.code, json.loads(text)
        except Exception:
            return e.code, {"raw": text[:200]}


def mgmt():
    s, b = call("POST", "/oauth/token", {"grant_type": "client_credentials", "client_id": os.environ["AUTH0_MGMT_CLIENT_ID"],
                                         "client_secret": os.environ["AUTH0_MGMT_CLIENT_SECRET"], "audience": f"https://{domain}/api/v2/"})
    if s != 200:
        sys.exit(f"management token: HTTP {s} {b.get('error') if isinstance(b, dict) else ''}")
    return b["access_token"]


def find(token):
    s, apis = call("GET", "/api/v2/resource-servers?per_page=100", token=token)
    assert s == 200, s
    s, clients = call("GET", "/api/v2/clients?per_page=100&fields=client_id,name,app_type,grant_types&include_fields=true", token=token)
    assert s == 200, s
    api = next((a for a in apis if a.get("identifier") == API_ID), None)
    web = next((c for c in clients if c.get("name") == WEB_NAME), None)
    others = sorted({a["name"] for a in apis if a.get("name", "").startswith("qrwtya-")} | {c["name"] for c in clients if c.get("name", "").startswith("qrwtya-")})
    return api, web, others


cmd = sys.argv[1]
token = mgmt()
api, web, others = find(token)
if cmd == "check":
    print(json.dumps({"domainShapeAuth0Com": bool(re.fullmatch(r"[a-z0-9-]+(\.[a-z0-9-]+)*\.auth0\.com", domain)),
                      "api": None if not api else {"name": api["name"], "identifier": api["identifier"], "signing_alg": api.get("signing_alg"), "token_lifetime": api.get("token_lifetime")},
                      "web": None if not web else {"name": web["name"], "app_type": web.get("app_type"), "grant_types": web.get("grant_types")},
                      "qrwtyaNames": others}))
elif cmd == "create":
    if not api:
        s, api = call("POST", "/api/v2/resource-servers", {"name": API_NAME, "identifier": API_ID, "signing_alg": "RS256",
                                                           "token_lifetime": 60, "allow_offline_access": False,
                                                           "skip_consent_for_verifiable_first_party_clients": True}, token)
        print(json.dumps({"api": s}))
    if not web:
        s, web = call("POST", "/api/v2/clients", {"name": WEB_NAME, "app_type": "non_interactive", "grant_types": ["client_credentials"],
                                                  "token_endpoint_auth_method": "client_secret_post",
                                                  "description": "QRWTY arm A Q13 staging probe client (deleted at teardown)"}, token)
        print(json.dumps({"web": s}))
    s, grants = call("GET", f"/api/v2/client-grants?audience={urllib.parse.quote(API_ID, safe='')}&client_id={web['client_id']}", token=token)
    if s == 200 and not grants:
        s, _ = call("POST", "/api/v2/client-grants", {"client_id": web["client_id"], "audience": API_ID, "scope": []}, token)
        print(json.dumps({"grant": s}))
    else:
        print(json.dumps({"grant": "exists" if grants else s}))
elif cmd == "emit-web-credentials":
    s, c = call("GET", f"/api/v2/clients/{web['client_id']}?fields=client_id,client_secret&include_fields=true", token=token)
    assert s == 200, s
    sys.stdout.write(json.dumps({"client_id": c["client_id"], "client_secret": c["client_secret"], "audience": API_ID,
                                 "token_url": f"https://{domain}/oauth/token"}))
elif cmd == "write-tfvars":
    with open(sys.argv[2], "a") as f:
        f.write(f'auth0_domain       = "{domain}"\n')
    print("written")
elif cmd == "delete":
    out = {}
    if web:
        s, grants = call("GET", f"/api/v2/client-grants?client_id={web['client_id']}", token=token)
        for g in grants if s == 200 else []:
            out.setdefault("grants", []).append(call("DELETE", f"/api/v2/client-grants/{g['id']}", token=token)[0])
        out["web"] = call("DELETE", f"/api/v2/clients/{web['client_id']}", token=token)[0]
    if api:
        out["api"] = call("DELETE", f"/api/v2/resource-servers/{api['id']}", token=token)[0]
    print(json.dumps(out))
    print(json.dumps({"after": find(token)[2]}))

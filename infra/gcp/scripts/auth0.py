#!/usr/bin/env python3
"""Arm A's Auth0 sign-in objects (A3; qrwtya- only, besides enabling two tenant connections for
qrwtya-web). Reads AUTH0_DOMAIN, AUTH0_MGMT_CLIENT_ID and AUTH0_MGMT_CLIENT_SECRET from the
environment, which the caller loads with `set -a; . ~/.config/qrwty/auth0.env; set +a` in the same
shell command. Never prints a credential, a client ID or the tenant domain; output names objects by
label. Credentials go from here straight to Secret Manager (`gcloud ... --data-file=-`, stdin).

  auth0.py check         what exists: qrwtya-web's settings, its grant, the two connections
  auth0.py create        qrwtya-web (Regular Web Application: code flow, callback
                         https://qrwty.io/auth/callback, logout https://qrwty.io/, rotating refresh
                         tokens), its grant to qrwtya-api, and Username-Password-Authentication
                         (sign-ups allowed) and google-oauth2 enabled for it
  auth0.py store-client  qrwtya-web's {client_id, client_secret} as a new version of
                         qrwtya-signin-client (Session API's SIGNIN_CLIENT)
  auth0.py test-user     one qrwtya-test-<hex>@qrwty.io user with a password generated here; the
                         {username, password} go only to qrwtya-auth0-test-user
  auth0.py erasure-client  (A6) qrwtya-account-erasure, a Machine to Machine application whose
                         only grant is delete:users on the Management API, and its {client_id,
                         client_secret} as a new version of qrwtya-account-erasure-client (Session
                         API's ACCOUNT_ERASURE_CLIENT: account deletion deletes the Auth0 user)
  auth0.py delete        the test users, the grants, qrwtya-web and qrwtya-account-erasure
                         (qrwtya-api stays: A2's)
"""
import json, os, secrets, string, subprocess, sys, urllib.error, urllib.parse, urllib.request

PROJECT = "project-f46f6d6a-8e74-42a0-ab1"
API_ID, WEB_NAME = "https://api.qrwtya.qrwty.io", "qrwtya-web"
ERASURE_NAME = "qrwtya-account-erasure"
ORIGIN = "https://qrwty.io"
DATABASE, GOOGLE = "Username-Password-Authentication", "google-oauth2"
domain = os.environ["AUTH0_DOMAIN"].strip().removeprefix("https://").rstrip("/")


def call(method, path, body=None, token=None):
    req = urllib.request.Request(f"https://{domain}{path}", method=method,
                                 data=None if body is None else json.dumps(body).encode(),
                                 headers={"content-type": "application/json",
                                          **({"authorization": f"Bearer {token}"} if token else {})})
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


def why(body):
    """An error's code and message, never a value from the request."""
    return {k: body.get(k) for k in ("statusCode", "error", "errorCode", "message")} if isinstance(body, dict) else None


def mgmt():
    s, b = call("POST", "/oauth/token", {"grant_type": "client_credentials", "client_id": os.environ["AUTH0_MGMT_CLIENT_ID"],
                                         "client_secret": os.environ["AUTH0_MGMT_CLIENT_SECRET"], "audience": f"https://{domain}/api/v2/"})
    if s != 200:
        sys.exit(f"management token: HTTP {s} {why(b)}")
    return b["access_token"]


def put_secret(secret_id, value):
    r = subprocess.run(["gcloud", "secrets", "versions", "add", secret_id, f"--project={PROJECT}", "--data-file=-",
                        "--format=value(name)"], input=value, capture_output=True, text=True)
    return {"secret": secret_id, "added": r.returncode == 0,
            **({"version": r.stdout.strip().rsplit("/", 1)[-1]} if r.returncode == 0 else {"error": r.stderr.strip()[-200:]})}


WEB = {
    "name": WEB_NAME,
    "description": "QRWTY arm A: qrwty.io sign-in (Session API's code + PKCE flow). Test-mode preview.",
    "app_type": "regular_web",
    "is_first_party": True,
    "oidc_conformant": True,
    "cross_origin_authentication": False,
    "token_endpoint_auth_method": "client_secret_post",
    "grant_types": ["authorization_code", "refresh_token"],
    "callbacks": [f"{ORIGIN}/auth/callback"],
    "allowed_logout_urls": [f"{ORIGIN}/"],
    "web_origins": [],
    "allowed_origins": [],
    "jwt_configuration": {"alg": "RS256", "lifetime_in_seconds": 300},
    # Rotating refresh tokens within the session limits (decisions §3: 7 days absolute, 24 hours
    # idle); 30 s of leeway lets two replicas refresh one session at once.
    "refresh_token": {"rotation_type": "rotating", "expiration_type": "expiring", "leeway": 30,
                      "token_lifetime": 604800, "infinite_token_lifetime": False,
                      "idle_token_lifetime": 86400, "infinite_idle_token_lifetime": False},
}


def find(token):
    s, clients = call("GET", "/api/v2/clients?per_page=100&fields=client_id,name,app_type,grant_types,callbacks,allowed_logout_urls,refresh_token&include_fields=true", token=token)
    assert s == 200, (s, why(clients))
    web = next((c for c in clients if c.get("name") == WEB_NAME), None)
    s, apis = call("GET", "/api/v2/resource-servers?per_page=100", token=token)
    assert s == 200, (s, why(apis))
    api = next((a for a in apis if a.get("identifier") == API_ID), None)
    return web, api


def connection(token, name):
    s, found = call("GET", f"/api/v2/connections?name={urllib.parse.quote(name)}", token=token)
    assert s == 200, (s, why(found))
    return found[0] if found else None


def enabled_for(token, conn, client_id):
    s, body = call("GET", f"/api/v2/connections/{conn['id']}/clients?take=100", token=token)
    if s == 200 and isinstance(body, dict):
        return any(c.get("client_id") == client_id for c in body.get("clients", []))
    return client_id in (conn.get("enabled_clients") or [])


def enable(token, conn, client_id):
    if enabled_for(token, conn, client_id):
        return "already"
    s, body = call("PATCH", f"/api/v2/connections/{conn['id']}/clients", [{"client_id": client_id, "status": True}], token)
    if s in (200, 204):
        return "enabled"
    # Older tenants: the connection's own list (the whole list is sent back with the new client).
    s2, full = call("GET", f"/api/v2/connections/{conn['id']}", token=token)
    assert s2 == 200, (s2, why(full))
    clients = sorted(set(full.get("enabled_clients") or []) | {client_id})
    s3, body3 = call("PATCH", f"/api/v2/connections/{conn['id']}", {"enabled_clients": clients}, token)
    return "enabled (list)" if s3 == 200 else f"failed {s} {why(body)} / {s3} {why(body3)}"


def check(token):
    web, api = find(token)
    out = {"api": None if not api else {"name": api["name"], "allow_offline_access": api.get("allow_offline_access"),
                                        "token_lifetime": api.get("token_lifetime")},
           "web": None}
    if web:
        out["web"] = {"name": web["name"], "app_type": web.get("app_type"), "grant_types": web.get("grant_types"),
                      "callbacks": web.get("callbacks"), "allowed_logout_urls": web.get("allowed_logout_urls"),
                      "rotation": (web.get("refresh_token") or {}).get("rotation_type")}
        s, grants = call("GET", f"/api/v2/client-grants?client_id={web['client_id']}", token=token)
        out["grants"] = [{"audience": g.get("audience"), "subject_type": g.get("subject_type")} for g in grants] if s == 200 else s
        for name in (DATABASE, GOOGLE):
            conn = connection(token, name)
            out[name] = None if not conn else {"strategy": conn.get("strategy"), "enabled": enabled_for(token, conn, web["client_id"]),
                                               "signups_allowed": not (conn.get("options") or {}).get("disable_signup", False)}
    s, users = call("GET", "/api/v2/users?q=" + urllib.parse.quote('email:qrwtya-test-*') + "&search_engine=v3&fields=email,email_verified&include_fields=true", token=token)
    out["testUsers"] = len(users) if s == 200 else s
    return out


cmd = sys.argv[1] if len(sys.argv) > 1 else "check"
token = mgmt()
web, api = find(token)
if cmd == "check":
    print(json.dumps(check(token), indent=1))
elif cmd == "create":
    out = {}
    if not api:
        sys.exit("qrwtya-api is missing (A2 creates it)")
    if not api.get("allow_offline_access"):
        s, _ = call("PATCH", f"/api/v2/resource-servers/{api['id']}", {"allow_offline_access": True}, token)
        out["api_offline_access"] = s
    if web and web.get("app_type") != "regular_web":
        sys.exit(f"{WEB_NAME} exists as {web.get('app_type')}; refusing to change its type")
    if not web:
        s, web = call("POST", "/api/v2/clients", WEB, token)
        if s != 201:
            sys.exit(f"create {WEB_NAME}: HTTP {s} {why(web)}")
        out["web"] = "created"
    else:
        s, body = call("PATCH", f"/api/v2/clients/{web['client_id']}", {k: v for k, v in WEB.items() if k != "app_type"}, token)
        out["web"] = "updated" if s == 200 else f"update failed {s} {why(body)}"
    s, grants = call("GET", f"/api/v2/client-grants?client_id={web['client_id']}&audience={urllib.parse.quote(API_ID, safe='')}", token=token)
    if s == 200 and grants:
        out["grant"] = "exists"
    else:
        s, body = call("POST", "/api/v2/client-grants", {"client_id": web["client_id"], "audience": API_ID, "scope": [], "subject_type": "user"}, token)
        if s == 400:
            s, body = call("POST", "/api/v2/client-grants", {"client_id": web["client_id"], "audience": API_ID, "scope": []}, token)
        out["grant"] = "created" if s == 201 else f"failed {s} {why(body)}"
    db = connection(token, DATABASE)
    if not db:
        sys.exit(f"{DATABASE} is missing")
    if (db.get("options") or {}).get("disable_signup"):
        s, full = call("GET", f"/api/v2/connections/{db['id']}", token=token)
        options = dict(full.get("options") or {}, disable_signup=False)
        s, body = call("PATCH", f"/api/v2/connections/{db['id']}", {"options": options}, token)
        out["signups"] = "allowed" if s == 200 else f"failed {s} {why(body)}"
    else:
        out["signups"] = "already allowed"
    out[DATABASE] = enable(token, db, web["client_id"])
    google = connection(token, GOOGLE)
    if not google:
        s, google = call("POST", "/api/v2/connections", {"name": GOOGLE, "strategy": "google-oauth2",
                                                         "options": {"email": True, "profile": True}}, token)
        out["google_created"] = s
    out[GOOGLE] = enable(token, google, web["client_id"])
    print(json.dumps(out, indent=1))
elif cmd == "store-client":
    if not web:
        sys.exit(f"{WEB_NAME} is missing")
    s, c = call("GET", f"/api/v2/clients/{web['client_id']}?fields=client_id,client_secret&include_fields=true", token=token)
    assert s == 200, s
    print(json.dumps(put_secret("qrwtya-signin-client", json.dumps({"client_id": c["client_id"], "client_secret": c["client_secret"]}) + "\n")))
elif cmd == "test-user":
    alphabet = string.ascii_letters + string.digits
    while True:
        password = "".join(secrets.choice(alphabet) for _ in range(20)) + secrets.choice("!#%+-=?@") + secrets.choice(string.digits)
        if any(c.islower() for c in password) and any(c.isupper() for c in password):
            break
    username = f"qrwtya-test-{secrets.token_hex(3)}@qrwty.io"
    s, body = call("POST", "/api/v2/users", {"connection": DATABASE, "email": username, "password": password,
                                             "email_verified": True, "verify_email": False}, token)
    if s != 201:
        sys.exit(f"create test user: HTTP {s} {why(body)}")
    print(json.dumps({"testUser": "created", **put_secret("qrwtya-auth0-test-user", json.dumps({"username": username, "password": password}) + "\n")}))
elif cmd == "erasure-client":
    management = f"https://{domain}/api/v2/"
    s, clients = call("GET", "/api/v2/clients?per_page=100&fields=client_id,name,app_type&include_fields=true", token=token)
    assert s == 200, (s, why(clients))
    app = next((c for c in clients if c.get("name") == ERASURE_NAME), None)
    out = {}
    if app and app.get("app_type") != "non_interactive":
        sys.exit(f"{ERASURE_NAME} exists as {app.get('app_type')}; refusing to change its type")
    if not app:
        s, app = call("POST", "/api/v2/clients", {
            "name": ERASURE_NAME, "app_type": "non_interactive", "is_first_party": True,
            "description": "QRWTY arm A: Session API deletes a deleted account's Auth0 user (delete:users only).",
            "grant_types": ["client_credentials"], "token_endpoint_auth_method": "client_secret_post",
            "jwt_configuration": {"alg": "RS256", "lifetime_in_seconds": 3600}}, token)
        if s != 201:
            sys.exit(f"create {ERASURE_NAME}: HTTP {s} {why(app)}")
        out["client"] = "created"
    else:
        out["client"] = "exists"
    s, grants = call("GET", f"/api/v2/client-grants?client_id={app['client_id']}", token=token)
    assert s == 200, (s, why(grants))
    mine = [g for g in grants if g.get("audience") == management]
    if mine:
        s, body = call("PATCH", f"/api/v2/client-grants/{mine[0]['id']}", {"scope": ["delete:users"]}, token)
        out["grant"] = "set to delete:users" if s == 200 else f"failed {s} {why(body)}"
    else:
        s, body = call("POST", "/api/v2/client-grants", {"client_id": app["client_id"], "audience": management,
                                                         "scope": ["delete:users"]}, token)
        out["grant"] = "created (delete:users)" if s == 201 else f"failed {s} {why(body)}"
    # Any other grant (another audience) is removed: the application may only delete users.
    out["otherGrants"] = [call("DELETE", f"/api/v2/client-grants/{g['id']}", token=token)[0]
                          for g in grants if g.get("audience") != management]
    s, grants = call("GET", f"/api/v2/client-grants?client_id={app['client_id']}", token=token)
    out["grants"] = [{"audience": "management-api" if g.get("audience") == management else "other",
                      "scope": g.get("scope")} for g in grants] if s == 200 else s
    s, c = call("GET", f"/api/v2/clients/{app['client_id']}?fields=client_id,client_secret&include_fields=true", token=token)
    assert s == 200, s
    out["secret"] = put_secret("qrwtya-account-erasure-client",
                               json.dumps({"client_id": c["client_id"], "client_secret": c["client_secret"]}) + "\n")
    print(json.dumps(out, indent=1))
elif cmd == "delete":
    out = {}
    s, users = call("GET", "/api/v2/users?q=" + urllib.parse.quote('email:qrwtya-test-*') + "&search_engine=v3&fields=user_id,email&include_fields=true", token=token)
    out["testUsers"] = [call("DELETE", f"/api/v2/users/{urllib.parse.quote(u['user_id'], safe='')}", token=token)[0]
                        for u in (users if s == 200 else []) if u.get("email", "").startswith("qrwtya-test-")]
    if web:
        s, grants = call("GET", f"/api/v2/client-grants?client_id={web['client_id']}", token=token)
        out["grants"] = [call("DELETE", f"/api/v2/client-grants/{g['id']}", token=token)[0] for g in (grants if s == 200 else [])]
        out["web"] = call("DELETE", f"/api/v2/clients/{web['client_id']}", token=token)[0]
    s, clients = call("GET", "/api/v2/clients?per_page=100&fields=client_id,name&include_fields=true", token=token)
    for app in (c for c in (clients if s == 200 else []) if c.get("name") == ERASURE_NAME):
        s, grants = call("GET", f"/api/v2/client-grants?client_id={app['client_id']}", token=token)
        out["erasureGrants"] = [call("DELETE", f"/api/v2/client-grants/{g['id']}", token=token)[0] for g in (grants if s == 200 else [])]
        out["erasure"] = call("DELETE", f"/api/v2/clients/{app['client_id']}", token=token)[0]
    print(json.dumps(out))
else:
    sys.exit(f"unknown command {cmd}")

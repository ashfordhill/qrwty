#!/usr/bin/env python3
"""Q13: assemble docs/evidence/q13/demo/demo-data.json from the sanitized records in
docs/evidence/q13/records/ (and the hand-written summaries below, each traceable to a record).

  python3 docs/evidence/q13/commands/build-demo-data.py
"""
import json
from pathlib import Path

ev = Path(__file__).resolve().parents[1]
rec = ev / "records"


def jsonl(name):
    return [json.loads(l) for l in (rec / name).read_text().splitlines() if l.strip()]


def steps(name, keep=None):
    out = []
    for d in jsonl(name):
        if d.get("probe") != "q13" or d.get("step") in (None, "done"):
            continue
        if keep and not keep(d):
            continue
        req = d.get("request")
        request = f"{req['method']} {req['url']}" if req else d.get("sql", "")
        body = d.get("body")
        if isinstance(body, str) and body.startswith("<!DOCTYPE"):
            body = "<Google front end's HTML 404 page>"
        if isinstance(body, str) and "403 Forbidden" in body:
            body = "<Google front end's HTML 403 Forbidden page>"
        if isinstance(body, str) and body.startswith('{"issuer"'):
            body = '{"issuer":"https://<tenant>.auth0.com/", ...} (discovery document, cut)'
        resp = {k: v for k, v in d.items() if k not in ("probe", "mode", "step", "atMs", "request", "timestamp", "severity", "sql", "ms", "body")}
        if "status" in d:
            response = f"{d['status']} {json.dumps(d.get('headers', {}))}\n{body or ''}"
        elif "error" in d and req:
            response = d["error"]
        elif "rows" in d:
            response = json.dumps(d["rows"])[:900]
        else:
            response = json.dumps(resp)[:900]
        out.append({"at": d["timestamp"][11:23], "step": d["step"], "request": request, "response": response.strip(), "ms": d.get("ms")})
    return out


def logs(name, keep):
    out = []
    for r in json.loads((rec / name).read_text()):
        p = r.get("jsonPayload") or r.get("textPayload")
        text = json.dumps(p) if isinstance(p, dict) else str(p)
        lab = r["resource"]["labels"]
        who = (lab.get("service_name") or lab.get("worker_pool_name") or lab.get("job_name") or "").replace("qrwtya-", "")
        if p and keep(text):
            out.append({"at": r["timestamp"][11:23], "step": who, "request": lab.get("revision_name", "").replace("qrwtya-", ""), "response": text[:400], "ms": None})
    return out


traffic = jsonl("p10-traffic.jsonl")
lat = sorted(r["ms"] for r in traffic if r.get("status"))
failed = [r for r in traffic if r.get("status") != 404]
publish = next(d for d in jsonl("probe-publish.jsonl") if d.get("step") == "publish")
dead = json.loads((rec / "p07-dead-letters.json").read_text())
quote = json.loads((ev / "cost-quote.json").read_text())
teardown = json.loads((rec / "teardown.json").read_text()) if (rec / "teardown.json").exists() else None

probes = [
    {"id": "P01", "title": "Budget and inventory before anything is created", "result": "passed",
     "summary": "The project's one budget (USD 50 a month, alerts at 20 %, 50 % and 100 %: USD 10, 25 and 50, credits excluded, this project only) was read and reused; none was created. No qrwtya- resource and no click-events name existed. Prices were requoted from the Cloud Billing Catalog before the first apply (records/p01-inventory-before.txt, cost-quote.json)."},
    {"id": "P02", "title": "Push the image and pin it by digest", "result": "passed",
     "summary": "Two images were pushed to qrwtya-images: the committed baseline plus Q06 (sha256:a99d60c7…87a99, built from git archive of 1d79868) and the same app with Q13's AG-13 fix (sha256:fa158f69…fe989). Each release ran one digest in every service, the worker pool and the migration job. Cloud Run records the platform manifest the index resolves to (…e3e6d3f9ced0 and …cbcc295c049f)."},
    {"id": "P03", "title": "Apply network, stores, Pub/Sub, secrets and IAM", "result": "passed after fixes",
     "summary": "The saved plan's 93 resources were created in 11 min (Cloud SQL 10 min 43 s, each Memorystore instance about 5.5 min), but the apply ended in errors: CLUSTER_DISABLED Memorystore reports no discovery endpoints, so 24 IAM bindings and the outputs could not be evaluated (finding I-2). After the fixes the configuration converged: a final plan reports no changes. Cloud SQL has only a private address and requires trusted client certificates; both caches are CLUSTER_DISABLED, SERVER_AUTHENTICATION, AUTH_DISABLED; the analytics subscription reads back ack 60 s, retry 1–10 s, dead letter after 100, retention 31 days, no expiry."},
    {"id": "P04", "title": "Bootstrap credentials without printing them", "result": "passed",
     "summary": "15 credentials (14 database credentials and the link-replay-keys ring) were generated locally and piped to Secret Manager; the postgres admin's password was set through the SQL Admin API from the same value. No value is in the plan, the state, a log or this record. The two Memorystore CA versions are public certificates in state."},
    {"id": "P05", "title": "Migrations as a release job with a non-superuser admin", "result": "passed after fixes",
     "summary": "The first two executions timed out connecting (the job had no VPC egress to the private-IP instance: finding I-4). After the fix, two executions started together: one applied every template migration, the other waited on the advisory lock and applied only the module SQL; a third applied no template migration. All exit 0. The admin (postgres) is CREATEDB CREATEROLE, not superuser, and has no CONNECT on the four application databases; PUBLIC has none; Link API's login can CREATE in no schema; the never-delete trigger refuses a DELETE (QRW10).",
     "steps": steps("probe-sql.jsonl") + logs("p05-qrwtya-migrate-hxs7p.log.json", lambda t: "profile-ok" in t or "Migrations current" in t or "000-foundation" in t)[:4] + logs("p05-qrwtya-migrate-8g4gt.log.json", lambda t: "profile-ok" in t or "Migrations current" in t)},
    {"id": "P06", "title": "Five services and the worker pool start on managed stores", "result": "passed",
     "summary": "Every revision became ready within 12 s of the apply. Each process logged profile-ok, then every probe ok: SELECT 1 over the Cloud SQL socket, PING over verify-full TLS to its Memorystore instance (no TLS servername needed: the certificate carries IP SANs), the Pub/Sub topic or subscription exists.",
     "steps": logs("p06-startup.log.json", lambda t: ("probe" in t and "result" in t) or "profile-ok" in t or "Application ready" in t)},
    {"id": "P07", "title": "Managed Pub/Sub ACK, IAM, dead letter and archive", "result": "passed",
     "summary": f"20 events published as the Redirect service's account were each acknowledged by Pub/Sub (p50 {publish['p50Ms']} ms, p99 {publish['p99Ms']} ms, the first one cold). The worker received all 20 and, its click aggregator being a stub, sent each to click-events--analytics-worker.failed with x-terminal-code NOT_IMPLEMENTED ({len(dead)} pulled, every seq 0–19). The Cloud Storage archive wrote 11 Avro objects carrying all 20 messageIds within 5 minutes. Publishing as another account was refused PERMISSION_DENIED.",
     "steps": steps("probe-publish.jsonl") + steps("probe-publish-denied.jsonl") + [{"at": d["publishTime"][11:23], "step": "dead letter pulled (regional endpoint)", "request": "click-events--analytics-worker.failed", "response": json.dumps(d["attributes"]), "ms": None} for d in dead[:3]]},
    {"id": "P08", "title": "Auth0 issuer and A's audience on the generated guard", "result": "passed",
     "summary": "From the VPC (the probe job on Session API's subnet and NAT), the tenant's discovery document names exactly OIDC_ISSUER, with its trailing slash, and its key set URL. A client-credentials token for https://api.qrwtya.qrwty.io was accepted by Link API's guard (signedIn true); the same token with its audience changed, a foreign issuer's self-signed token, A's issuer signed by a key outside the key set, a malformed bearer and A's token after its 60 s lifetime were each refused 401. Not run: a validly signed token for another audience (the tenant's only other audiences are arm B's and the Management API, which this unit may not use; Q04 proved the audience check locally).",
     "steps": steps("probe-oidc.jsonl")},
    {"id": "P09", "title": "Ingress, internal calls and workload identity", "result": "passed",
     "summary": "Link, Account and Billing API (internal ingress) answered the VPC and refused the Internet (404). Redirect and Session (public ingress, Cloud Run IAM) refused unauthenticated requests from outside and from the VPC (403) and served the owner's identity token, so run.app is protected. Each service's URL list includes the deterministic URL the tiles are configured with. /healthz is unreachable through run.app (AG-15).",
     "steps": steps("probe-net.jsonl", lambda d: "tile" in d["step"] or "public" in d["step"])},
    {"id": "P10", "title": "Startup, drain and replicas on Cloud Run", "result": "partial",
     "summary": f"Image 2 was rolled out to every service and the worker pool from a saved plan while {len(traffic)} requests over 150 s (10 a second, owner token) hit the Redirect service: {len(failed)} failed; latency p50 {lat[len(lat)//2]} ms, p99 {lat[int(len(lat) * 0.99)]} ms, max {lat[-1]} ms. The worker pool went from 1 to 2 instances and back with saved plans; the old worker instance was shut down 8 s after its replacement was ready. Not shown: each old service instance's exit code and time after SIGTERM (neither Cloud Run nor the generated process logs a service instance's drain or exit: AG-17).",
     "steps": logs("p10-redirect.log.json", lambda t: "Starting new instance" in t or "Application ready" in t) + logs("p10-workers-2.log.json", lambda t: "Application ready" in t)},
    {"id": "P11", "title": "The production profile refuses a forbidden setting", "result": "passed",
     "summary": "A Session API revision with PUBSUB_EMULATOR_HOST, at 0 % traffic, never became ready: both starts logged profile-refused naming PUBSUB_EMULATOR_HOST and exited 1; traffic stayed on the ready revision. A 0 %-traffic revision is not started at all until something routes to it: a tag change started its health check. The revision was deleted; the manual traffic pin it left behind was found and removed by finding I-7.",
     "steps": logs("p11.log.json", lambda t: "profile-refused" in t or "exit(" in t or "Starting" in t)},
    {"id": "P12", "title": "Providers from Cloud Run: Web Risk and Stripe", "result": "partial",
     "summary": "Web Risk was priced before the first call (first 100,000 lookups a month free, then USD 0.0005). With the Q06 image Link API sent no credential, Web Risk answered 403 and the guest create failed closed: 503 reputation_unavailable with Retry-After 5. With the AG-13 fix (Link API's own service account token from the metadata server) the guest create answered 201 and its replay returned the same body; Web Risk's malware and phishing test URLs were refused 422 reputation_rejected; the link, its claim-proof hash and its idempotency record are in Cloud SQL. Not run: Stripe test mode (Billing API's stub is Q10a, which won't run); api.stripe.com is reachable through the NAT.",
     "steps": steps("probe-create-1.jsonl")[:1] + steps("probe-create-2.jsonl") + steps("probe-threat.jsonl")},
]
cache_steps = steps("probe-net.jsonl", lambda d: "cache" in d["step"] or "cloud sql" in d["step"])
probes.insert(7, {"id": "P06b", "title": "Valkey TLS and Cloud SQL TLS from the VPC", "result": "passed",
                  "summary": "Each Memorystore instance refused plain text (connection reset), answered +PONG over TLSv1.3 verified with its own managed CA, and refused verification with system roots or with the other instance's CA (each instance has its own CA: finding I-3). Cloud SQL's private address refused plain text (pg_hba: no encryption) and TLS without a client certificate.",
                  "steps": cache_steps})

data = {
    "run": "qrwty-r1-20261114",
    "title": "Arm A's one live deploy",
    "lede": "The Jeeves-generated QRWTY backend (baseline 33d50e9 plus Q06 ee186c1) on real Cloud Run, Cloud SQL, Memorystore for Valkey and Pub/Sub in us-central1, with Auth0 as the issuer: what ran, what each probe sent and got back, and the gaps only the cloud showed. Everything here was torn down afterwards.",
    "facts": {
        "Generator": "Jeeves 4e87f97 (frozen)", "App": "33d50e9 + Q06 ee186c1 + Q13 AG-13 fix",
        "Region": "us-central1", "Processes": "5 Cloud Run services, 1 worker pool, 1 migration job",
        "Stores": "Cloud SQL PG 17 db-f1-micro; 2 × Valkey shared-core-nano",
        "Issuer": "Auth0 (qrwtya-api audience)", "Estimated rate": f"USD {quote['estimatedUsdPerHour']}/h (USD {quote['estimatedUsdPer730hMonth']}/month)",
        "Probes": "P01–P12 (see results)",
    },
    "timeline": [
        {"t": "11:44", "what": "Start (host clock); foreign Jeeves context noted and ignored. Q04b: validate.sh exits 0 after tofu fmt; IaC additions (I-5, I-9, I-10)"},
        {"t": "11:45–12:00", "what": "Budget read, inventory empty, prices requoted; Auth0 qrwtya-api and qrwtya-web created; images built and pushed"},
        {"t": "12:00–12:11", "what": "Foundation plan applied: Memorystore created 12:00:31, Cloud SQL 12:01:07 to 12:11:50; the apply ends in errors on Memorystore's empty discovery endpoints (I-2)"},
        {"t": "12:12–12:20", "what": "Fixes I-2 and I-3; 15 credentials bootstrapped; migration job; the first two executions time out (I-4); fixed; three executions pass (12:18:53–12:20:34)"},
        {"t": "12:21", "what": "Services and worker pool applied; every revision ready with every probe ok by 12:21:54"},
        {"t": "12:27–12:47", "what": "Probes: ingress and TLS, guest create 503 without a Web Risk credential, Pub/Sub ACK, dead letters and archive, NAT egress timing, Auth0 guard"},
        {"t": "12:48–12:55", "what": "P11 refused revision; image 2 rolled out at 12:50 under 1,501 requests with no failure; guest create 201 in Cloud SQL; Web Risk test URLs 422"},
        {"t": "12:56–13:02", "what": "Worker pool 1 → 2 → 1; findings I-7 and I-8 fixed; final plan reports no changes; inventory captured"},
        {"t": "13:06", "what": "Record captured; teardown starts (below)"},
    ],
    "services": [
        {"name": "qrwtya-redirect-service", "kind": "Cloud Run service, min 1", "ingress": "all; IAM required", "revisions": ["redirect-service-00001-4qz (image 1)", "redirect-service-00002-k6c (image 2)"], "image": "@sha256:fa158f69… (index)", "health": "ready; probes ok; 403 to unauthenticated callers"},
        {"name": "qrwtya-session-api", "kind": "Cloud Run service", "ingress": "all; IAM required", "revisions": ["session-api-00001-sg5", "session-api-00002-rpx (P11, refused, deleted)", "session-api-00003-hnt"], "image": "@sha256:fa158f69…", "health": "ready; probes ok"},
        {"name": "qrwtya-link-api", "kind": "Cloud Run service", "ingress": "internal; IAM off", "revisions": ["link-api-00001-mvf", "link-api-00002-fq6"], "image": "@sha256:fa158f69…", "health": "ready; guest create 201"},
        {"name": "qrwtya-account-api", "kind": "Cloud Run service", "ingress": "internal; IAM off", "revisions": ["account-api-00001-ddg", "account-api-00002-5ch"], "image": "@sha256:fa158f69…", "health": "ready; sign-in Required (401 without a token)"},
        {"name": "qrwtya-billing-api", "kind": "Cloud Run service", "ingress": "internal; IAM off", "revisions": ["billing-api-00001-4jd", "billing-api-00002-5sm"], "image": "@sha256:fa158f69…", "health": "ready"},
        {"name": "qrwtya-analytics-worker", "kind": "Cloud Run worker pool", "ingress": "none (no port)", "revisions": ["analytics-worker-00001-x2p", "analytics-worker-00002-6ds"], "image": "@sha256:fa158f69…", "health": "consuming; 1 → 2 → 1 instances"},
        {"name": "qrwtya-migrate", "kind": "Cloud Run job", "ingress": "none", "revisions": ["executions 8g4gt, hxs7p (together), m7k7g"], "image": "@sha256:a99d60c7… then fa158f69…", "health": "exit 0 × 3 after I-4"},
    ],
    "probes": probes,
    "gaps": json.loads((rec / "gaps.json").read_text())["jeeves"],
    "findings": json.loads((rec / "gaps.json").read_text())["deployment"],
    "inventory": json.loads((rec / "inventory.json").read_text()),
    "cost": {"summary": f"Requoted {quote['recordedAt']} from the Cloud Billing Catalog (list prices before credits). Fixed rate while everything ran: about USD {quote['estimatedUsdPerHour']} an hour, USD {quote['estimatedUsdPer730hMonth']} for a 730-hour month. The existing budget was reused.",
             "rows": quote["fixedHourly"], "actual": teardown["spend"] if teardown else "Recorded after teardown."},
    "teardown": teardown["steps"] if teardown else [{"step": "Teardown", "result": "pending at capture time"}],
    "footer": "Sanitized: the project ID and number, the billing account, the owner's account, the Auth0 tenant and client IDs are labels; no token, claim proof, password or key is shown. Sources: docs/evidence/q13/records/. No external request is made by this page.",
}
(ev / "demo" / "demo-data.json").write_text(json.dumps(data, indent=1) + "\n")
print("probes", len(probes), "steps", sum(len(p.get("steps", [])) for p in probes))

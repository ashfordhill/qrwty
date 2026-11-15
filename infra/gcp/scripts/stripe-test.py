#!/usr/bin/env python3
"""Arm A's Stripe TEST-MODE objects (A7), created or updated idempotently, all named qrwtya.

  (set -a; . ~/.config/qrwty/stripe.env; set +a; python3 -I infra/gcp/scripts/stripe-test.py setup)

Refuses any key that is not a test-mode secret key (sk_test_...): no live object, no real charge.
  - product `qrwtya_paid_monthly` "QRWTY Paid (test, not approved pricing)" (decisions §4);
  - its price, lookup key qrwty-a-test-paid-monthly, USD 5.00 a month (a test fixture);
  - the webhook endpoint https://qrwty.io/api/v1/billing/webhook (the Worker sends /api/* to
    Session API, which passes the unchanged bytes to Billing API), the events Billing API handles,
    API version pinned; its signing secret goes straight into Secret Manager's
    qrwtya-stripe-webhook-secret (created on first run; an endpoint whose secret Secret Manager
    lacks is replaced, since Stripe shows a secret only once);
  - a customer-portal configuration: card update, invoices, cancel at period end;
  - the secret key itself into qrwtya-stripe-secret-key when Secret Manager's latest differs.
Secrets go to `gcloud secrets versions add --data-file=-` on stdin and are never printed. Prints one
JSON line of object IDs (none is a credential): the price and portal IDs go in qrwtya.tfvars.
"""
import json
import os
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request

PROJECT = "project-f46f6d6a-8e74-42a0-ab1"
API = "https://api.stripe.com"
VERSION = "2025-09-30.clover"  # app/src/modules/billing-api/billing/stripe.ts STRIPE_VERSION
PRODUCT_ID = "qrwtya_paid_monthly"
PRODUCT_NAME = "QRWTY Paid (test, not approved pricing)"
LOOKUP_KEY = "qrwty-a-test-paid-monthly"
WEBHOOK_URL = "https://qrwty.io/api/v1/billing/webhook"
RETURN_URL = "https://qrwty.io/billing?portal=returned"
EVENTS = sorted([  # reconcile.ts HANDLED_EVENTS
    "checkout.session.completed",
    "checkout.session.expired",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.paid",
    "invoice.payment_failed",
])
KEY_SECRET = "qrwtya-stripe-secret-key"
HOOK_SECRET = "qrwtya-stripe-webhook-secret"

key = os.environ.get("STRIPE_SECRET_KEY", "")
if not key.startswith("sk_test_"):
    sys.exit("stripe-test.py: refused: STRIPE_SECRET_KEY is not a test-mode secret key")


class StripeFailure(Exception):
    def __init__(self, status, code, text):
        super().__init__(text)
        self.status, self.code = status, code


def stripe(method, path, fields=None, idempotency=None):
    data = urllib.parse.urlencode(fields or {}, doseq=True).encode() if fields is not None else None
    if method == "GET" and fields:
        path, data = f"{path}?{data.decode()}", None
    request = urllib.request.Request(f"{API}{path}", data=data, method=method)
    request.add_header("Authorization", f"Bearer {key}")
    request.add_header("Stripe-Version", VERSION)
    if idempotency:
        request.add_header("Idempotency-Key", idempotency)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = json.load(response)
    except urllib.error.HTTPError as error:
        detail = json.load(error).get("error", {})
        raise StripeFailure(error.code, detail.get("code") or detail.get("type"),
                            f"{method} {path.split('?')[0]} answered {error.code}: "
                            f"{detail.get('code') or detail.get('type')}: {detail.get('message', '')[:200]}")
    if body.get("livemode"):
        sys.exit("stripe-test.py: refused: Stripe answered with a live-mode object")
    return body


def gcloud(*args, stdin=None):
    return subprocess.run(["gcloud", *args, f"--project={PROJECT}"], input=stdin, capture_output=True)


def latest_secret(name):
    result = gcloud("secrets", "versions", "access", "latest", f"--secret={name}")
    return result.stdout if result.returncode == 0 else None


def put_secret(name, value):
    result = gcloud("secrets", "versions", "add", name, "--data-file=-", stdin=value.encode())
    if result.returncode != 0:
        sys.exit(f"stripe-test.py: could not add a version to {name}")


def setup():
    ids = {}
    # Product (a fixed ID makes it idempotent).
    try:
        product = stripe("GET", f"/v1/products/{PRODUCT_ID}")
    except StripeFailure as missing:
        if missing.code != "resource_missing":
            raise
        product = stripe("POST", "/v1/products", {
            "id": PRODUCT_ID, "name": PRODUCT_NAME,
            "description": "Arm A's test-mode plan; not approved pricing; no real charge.",
            "metadata[qrwtya]": "paid-monthly",
        }, idempotency="qrwtya-product-v1")
    ids["product"] = product["id"]
    # Price, by its lookup key.
    prices = stripe("GET", "/v1/prices", {"lookup_keys[]": LOOKUP_KEY, "active": "true"})["data"]
    price = next((p for p in prices if p["unit_amount"] == 500 and p["currency"] == "usd"
                  and (p.get("recurring") or {}).get("interval") == "month"
                  and p["product"] == PRODUCT_ID), None)
    if not price:
        price = stripe("POST", "/v1/prices", {
            "product": PRODUCT_ID, "currency": "usd", "unit_amount": 500,
            "recurring[interval]": "month", "lookup_key": LOOKUP_KEY, "transfer_lookup_key": "true",
            "nickname": "qrwtya paid-monthly (USD 5.00, test fixture)",
            "metadata[qrwtya]": "paid-monthly",
        }, idempotency="qrwtya-price-v1")
    ids["price"] = price["id"]
    # Webhook endpoint: one for this URL; replaced when Secret Manager lacks its secret.
    endpoints = [e for e in stripe("GET", "/v1/webhook_endpoints", {"limit": 100})["data"]
                 if e["url"] == WEBHOOK_URL and (e.get("metadata") or {}).get("qrwtya") == "webhook"]
    have_secret = latest_secret(HOOK_SECRET) is not None
    endpoint = endpoints[0] if endpoints and have_secret else None
    for stale in endpoints:
        if stale is not endpoint:
            stripe("DELETE", f"/v1/webhook_endpoints/{stale['id']}")
    if endpoint is None:
        created = stripe("POST", "/v1/webhook_endpoints", {
            "url": WEBHOOK_URL, "enabled_events[]": EVENTS, "api_version": VERSION,
            "description": "qrwtya: arm A billing (test mode)", "metadata[qrwtya]": "webhook",
        })
        put_secret(HOOK_SECRET, created["secret"])
        endpoint = created
        ids["webhookSecret"] = "new version in " + HOOK_SECRET
    elif sorted(endpoint["enabled_events"]) != EVENTS or endpoint.get("status") != "enabled":
        endpoint = stripe("POST", f"/v1/webhook_endpoints/{endpoint['id']}",
                          {"enabled_events[]": EVENTS, "disabled": "false"})
    ids["webhookEndpoint"] = endpoint["id"]
    ids["webhookUrl"] = WEBHOOK_URL
    # Customer portal.
    portal_fields = {
        "business_profile[headline]": "QRWTY (test mode): manage Paid. No real card is charged.",
        "default_return_url": RETURN_URL,
        "features[customer_update][enabled]": "false",
        "features[invoice_history][enabled]": "true",
        "features[payment_method_update][enabled]": "true",
        "features[subscription_cancel][enabled]": "true",
        "features[subscription_cancel][mode]": "at_period_end",
        "features[subscription_cancel][proration_behavior]": "none",
        "features[subscription_update][enabled]": "false",
        "metadata[qrwtya]": "portal",
    }
    portals = [c for c in stripe("GET", "/v1/billing_portal/configurations", {"limit": 100})["data"]
               if (c.get("metadata") or {}).get("qrwtya") == "portal"]
    if portals:
        portal = stripe("POST", f"/v1/billing_portal/configurations/{portals[0]['id']}",
                        {k: v for k, v in portal_fields.items() if k != "metadata[qrwtya]"})
    else:
        portal = stripe("POST", "/v1/billing_portal/configurations", portal_fields,
                        idempotency="qrwtya-portal-v1")
    ids["portalConfiguration"] = portal["id"]
    # The secret key for Billing API.
    if (latest_secret(KEY_SECRET) or b"").decode().strip() != key:
        put_secret(KEY_SECRET, key)
        ids["secretKey"] = "new version in " + KEY_SECRET
    print(json.dumps(ids))


if __name__ == "__main__":
    if sys.argv[1:] != ["setup"]:
        sys.exit(__doc__)
    try:
        setup()
    except StripeFailure as failure:
        sys.exit(f"stripe-test.py: {failure}")

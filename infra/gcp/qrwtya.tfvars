# Arm A's live values (A2). scripts/tf.sh copies this file into its working directory as
# qrwtya.auto.tfvars. No value here is a credential; two values come from the environment:
# TF_VAR_image (the image by digest, from scripts/redeploy.sh) and TF_VAR_auth0_domain (from
# ~/.config/qrwty/auth0.env, read by scripts/tf.sh).
project_id             = "project-f46f6d6a-8e74-42a0-ab1"
region                 = "us-central1"
auth0_api_audience     = "https://api.qrwtya.qrwty.io"
reputation_credentials = "metadata" # the production profile requires it (Q13, AG-13)
analytics_workers      = 1          # trial credit: one copy of the click aggregator (A4)
# A7, Stripe TEST MODE (infra/gcp/scripts/stripe-test.py): the qrwty-a-test-paid-monthly price
# (USD 5.00 a month, a test fixture, decisions §4) and the customer-portal configuration.
stripe_price_paid_monthly   = "price_1UcBddBCgK4pyiZ2kwUtHsWD"
stripe_portal_configuration = "bpc_1UcBdfBCgK4pyiZ2Q5yV7mpo"

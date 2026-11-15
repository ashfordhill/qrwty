# Arm A's live values (A2). scripts/tf.sh copies this file into its working directory as
# qrwtya.auto.tfvars. No value here is a credential; two values come from the environment:
# TF_VAR_image (the image by digest, from scripts/redeploy.sh) and TF_VAR_auth0_domain (from
# ~/.config/qrwty/auth0.env, read by scripts/tf.sh).
project_id             = "project-f46f6d6a-8e74-42a0-ab1"
region                 = "us-central1"
auth0_api_audience     = "https://api.qrwtya.qrwty.io"
reputation_credentials = "metadata" # the production profile requires it (Q13, AG-13)
analytics_workers      = 0          # trial credit: none until A4 writes the click aggregator

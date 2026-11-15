# QRWTY arm A on GCP (Q04's draft; Q13 applied it once; live since A2 on the trial credit).
# Apply it only through scripts/tf.sh or scripts/redeploy.sh. See infra/README.md.
terraform {
  required_version = "= 1.13.2"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "8.8.1"
    }
  }

  # State: gs://qrwtya-tfstate-<project number>/infra/gcp, a versioned bucket created by hand
  # (A2), never here. scripts/tf.sh passes the bucket and prefix to `tofu init`.
  backend "gcs" {}
}

provider "google" {
  project = var.project_id
  region  = var.region

  default_labels = {
    arm    = "a"
    run    = "qrwty-r1-20261114"
    system = "qrwty"
  }
}

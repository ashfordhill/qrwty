# QRWTY arm A: GCP staging draft (Q04). Prepared, statically checked, never applied in Q04.
# Q12a/Q13 apply it inside the owner's trial-credit project. See README.md.
terraform {
  required_version = "= 1.13.2"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "8.8.1"
    }
  }

  # State stays local until Q13 chooses a backend (a bucket created by hand, never here).
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

# One Secret Manager secret per credential the export reads (its Compose secrets), named
# qrwtya-<generated name>. Versions are added out of band by the bootstrap (Q12a): values are
# generated locally and piped to `gcloud secrets versions add --data-file=-`, so no credential is in
# this configuration or its state. The one version here is Memorystore's public server CA.
resource "google_secret_manager_secret" "s" {
  for_each  = local.secrets
  secret_id = "${local.p}${each.key}"

  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }
  labels = {
    arm = "a"
  }
  depends_on = [google_project_service.api]
}

# Each instance has its own managed CA (serverCaMode GOOGLE_MANAGED_PER_INSTANCE_CA; the two
# instances' CAs differed in Q13), so each cache's public CA is its own secret.
resource "google_secret_manager_secret_version" "memorystore_ca" {
  for_each    = local.caches
  secret      = google_secret_manager_secret.s["memorystore-ca-${each.key}"].id
  secret_data = join("\n", flatten([for ca in google_memorystore_instance.cache[each.key].managed_server_ca[0].ca_certs : ca.certificates]))
}

# Images: one repository; the same digest for every process and the migration job.
resource "google_artifact_registry_repository" "images" {
  repository_id = "${local.p}images"
  location      = var.region
  format        = "DOCKER"
  labels = {
    arm = "a"
  }
  depends_on = [google_project_service.api]
}

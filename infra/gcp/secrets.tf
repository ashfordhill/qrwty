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

# Both instances are created in one project and region; Q12a confirms they share the managed CA
# (if not, this becomes one CA secret per cache).
resource "google_secret_manager_secret_version" "memorystore_ca" {
  secret      = google_secret_manager_secret.s["memorystore-ca"].id
  secret_data = join("\n", flatten([for ca in google_memorystore_instance.cache["hot-routes"].managed_server_ca[0].ca_certs : ca.certificates]))
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

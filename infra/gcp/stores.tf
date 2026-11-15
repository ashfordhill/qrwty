# Cloud SQL: one PostgreSQL 17 instance holds the export's four application databases (d_links,
# d_sessions, d_billing, d_analytics; the migration job creates them and every role). Processes
# reach it only through Cloud Run's Cloud SQL connector (a Unix socket at /cloudsql/<connection
# name>): Node cannot verify a server certificate named <project>:<instance> (Jeeves QGR2 finding
# 13), and the connector encrypts with the instance's client certificates. No public address.
resource "google_sql_database_instance" "pg" {
  name                = "${local.p}pg"
  region              = var.region
  database_version    = "POSTGRES_17"
  deletion_protection = var.deletion_protection

  settings {
    edition           = "ENTERPRISE"
    tier              = var.sql_tier
    availability_type = "ZONAL" # staging; regional HA is Q15's
    disk_autoresize   = true
    disk_size         = 10
    user_labels = {
      arm = "a"
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
      ssl_mode        = "TRUSTED_CLIENT_CERTIFICATE_REQUIRED" # only the connector's certificates
    }

    backup_configuration {
      enabled                        = false # the trial instance has no backups (owner decisions §1); D05 stays not run
      point_in_time_recovery_enabled = false
    }
  }

  depends_on = [google_service_networking_connection.psa]
}
# The built-in `postgres` user (CREATEDB CREATEROLE, not a superuser) is the migration admin. Its
# password is set out of band (gcloud sql users set-password … --prompt-for-password) and the same
# value added as the secret qrwtya-postgres-admin's version, so it never enters the state file.

# Memorystore for Valkey: one instance per Cache tile, as the design has two. Cluster mode off (the
# generated client is a standalone client), in-transit encryption on (JEEVES_CACHE_<ID>_TLS =
# verify-full with the instance's managed CA), authorization off: IAM_AUTH needs an access token
# refreshed hourly, which the generated cache client cannot send (AG-04); reached only through PSC.
resource "google_memorystore_instance" "cache" {
  for_each = local.caches

  instance_id                 = "${local.p}${each.key}"
  location                    = var.region
  shard_count                 = 1
  replica_count               = 0
  mode                        = "CLUSTER_DISABLED"
  node_type                   = var.memorystore_node_type
  engine_version              = "VALKEY_8_0"
  transit_encryption_mode     = "SERVER_AUTHENTICATION"
  authorization_mode          = "AUTH_DISABLED"
  deletion_protection_enabled = var.deletion_protection
  engine_configs = {
    "maxmemory-policy" = "allkeys-lru"
  }
  labels = {
    arm = "a"
  }

  desired_auto_created_endpoints {
    network    = google_compute_network.vpc.id
    project_id = var.project_id
  }

  depends_on = [google_network_connectivity_service_connection_policy.memorystore]
}

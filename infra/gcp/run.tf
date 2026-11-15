# The five HTTP processes as Cloud Run services, the Analytics worker as a worker pool and the
# migrations as a job: one image digest, selected by command and environment only.
resource "google_cloud_run_v2_service" "http" {
  for_each = local.http

  name     = "${local.p}${each.key}"
  location = var.region
  ingress  = each.value.ingress
  # An origin the Internet can reach requires Cloud Run IAM, so its run.app URL refuses anyone
  # without roles/run.invoker (no allUsers binding), unless it is in local.open (Session API, the
  # qrwty.io Worker's origin). Internal-only services keep IAM off: the generated tile clients send
  # no ID token, and internal ingress is their restriction.
  invoker_iam_disabled = each.value.ingress != "INGRESS_TRAFFIC_ALL" || contains(local.open, each.key)
  deletion_protection  = var.deletion_protection
  labels = {
    arm = "a"
  }

  # All traffic on the latest revision, declared: without this block a traffic split or tag set
  # outside OpenTofu survives every apply (Q13: a pinned revision kept serving the old image).
  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  template {
    service_account                  = google_service_account.run[each.value.sa].email
    timeout                          = "30s"
    max_instance_request_concurrency = 100
    execution_environment            = "EXECUTION_ENVIRONMENT_GEN2"

    scaling {
      min_instance_count = each.value.min
      max_instance_count = var.max_instances
    }

    vpc_access {
      egress = "ALL_TRAFFIC"
      network_interfaces {
        network    = google_compute_network.vpc.id
        subnetwork = google_compute_subnetwork.run.id
      }
    }

    containers {
      image   = var.image
      command = ["/bin/sh", "-c", local.command[each.key]]

      ports {
        container_port = 3000 # compiled in the generated process config
      }
      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        cpu_idle = true
      }

      dynamic "env" {
        for_each = merge(local.profile, each.value.env, local.secret_files[each.key])
        content {
          name  = env.key
          value = env.value
        }
      }

      startup_probe {
        http_get {
          path = "/healthz"
          port = 3000
        }
        period_seconds    = 2
        timeout_seconds   = 1
        failure_threshold = 30
      }
      liveness_probe {
        http_get {
          path = "/healthz"
          port = 3000
        }
        period_seconds    = 10
        failure_threshold = 3
      }

      # Secret volumes first, then the Cloud SQL one: the order Cloud Run reads them back in, so a
      # plan shows no reordering diff (Q13).
      dynamic "volume_mounts" {
        for_each = toset(concat(each.value.secrets, each.value.ca == null ? [] : ["memorystore-ca-${each.value.ca}"]))
        content {
          name       = "s-${replace(volume_mounts.key, "--", "-")}"
          mount_path = startswith(volume_mounts.key, "memorystore-ca-") ? local.ca_mount : "${local.secret_mount}/${volume_mounts.key}"
        }
      }
      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }

    dynamic "volumes" {
      for_each = toset(concat(each.value.secrets, each.value.ca == null ? [] : ["memorystore-ca-${each.value.ca}"]))
      content {
        name = "s-${replace(volumes.key, "--", "-")}"
        secret {
          secret = google_secret_manager_secret.s[volumes.key].secret_id
          items {
            version = "latest"
            path    = "value"
          }
        }
      }
    }
    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.pg.connection_name]
      }
    }
  }

  depends_on = [google_secret_manager_secret_iam_member.reader, google_project_iam_member.sql_client]
}

# The Analytics worker listens on no port: a worker pool, not a service.
resource "google_cloud_run_v2_worker_pool" "analytics" {
  name                = "${local.p}analytics-worker"
  location            = var.region
  deletion_protection = var.deletion_protection
  labels = {
    arm = "a"
  }

  scaling {
    manual_instance_count = var.analytics_workers
  }

  template {
    service_account = google_service_account.run["analytics"].email

    vpc_access {
      egress = "ALL_TRAFFIC"
      network_interfaces {
        network    = google_compute_network.vpc.id
        subnetwork = google_compute_subnetwork.run.id
      }
    }

    containers {
      image   = var.image
      command = ["/bin/sh", "-c", local.command["analytics-worker"]]

      dynamic "env" {
        for_each = merge(local.profile, local.worker.env, local.secret_files["analytics-worker"])
        content {
          name  = env.key
          value = env.value
        }
      }
      volume_mounts {
        name       = "s-sql-analytics-analytics-worker"
        mount_path = "${local.secret_mount}/sql-analytics--analytics-worker"
      }
      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }

    volumes {
      name = "s-sql-analytics-analytics-worker"
      secret {
        secret = google_secret_manager_secret.s["sql-analytics--analytics-worker"].secret_id
        items {
          version = "latest"
          path    = "value"
        }
      }
    }
    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.pg.connection_name]
      }
    }
  }

  depends_on = [google_secret_manager_secret_iam_member.reader, google_project_iam_member.sql_client]
}

# Migrations: an explicit release job (never every replica at startup). migrate.mjs holds an
# advisory lock, so a second run waits; it creates the databases, roles and grants as the
# non-superuser `postgres` admin (Jeeves QG12).
resource "google_cloud_run_v2_job" "migrate" {
  name                = "${local.p}migrate"
  location            = var.region
  deletion_protection = var.deletion_protection
  labels = {
    arm = "a"
  }

  template {
    task_count = 1
    template {
      service_account = google_service_account.run["migrate"].email
      max_retries     = 0
      timeout         = "600s"

      # The instance has only a private address: the Cloud SQL connector reaches it through the
      # VPC, so the job needs Direct VPC egress like the services (without it every connection
      # timed out after 5 s, Q13).
      vpc_access {
        egress = "ALL_TRAFFIC"
        network_interfaces {
          network    = google_compute_network.vpc.id
          subnetwork = google_compute_subnetwork.run.id
        }
      }

      containers {
        image   = var.image
        command = ["/bin/sh", "-c", "node scripts/qrwty-production-profile.mjs migrate && exec node scripts/migrate.mjs"]

        dynamic "env" {
          for_each = merge(local.profile, local.secret_files.migrate, {
            PGHOST = "/cloudsql/${google_sql_database_instance.pg.connection_name}"
            PGPORT = "5432"
            # migrate.mjs's own TLS (Jeeves QG29): a Unix socket, which the Cloud SQL connector
            # encrypts; JEEVES_REQUIRE_TLS allows disable only for a socket directory.
            JEEVES_MIGRATE_TLS = "disable"
          })
          content {
            name  = env.key
            value = env.value
          }
        }
        dynamic "volume_mounts" {
          for_each = toset(local.migrate_secrets)
          content {
            name       = "s-${replace(volume_mounts.key, "--", "-")}"
            mount_path = "${local.secret_mount}/${volume_mounts.key}"
          }
        }
        volume_mounts {
          name       = "cloudsql"
          mount_path = "/cloudsql"
        }
      }

      dynamic "volumes" {
        for_each = toset(local.migrate_secrets)
        content {
          name = "s-${replace(volumes.key, "--", "-")}"
          secret {
            secret = google_secret_manager_secret.s[volumes.key].secret_id
            items {
              version = "latest"
              path    = "value"
            }
          }
        }
      }
      volumes {
        name = "cloudsql"
        cloud_sql_instance {
          instances = [google_sql_database_instance.pg.connection_name]
        }
      }
    }
  }

  depends_on = [google_secret_manager_secret_iam_member.reader, google_project_iam_member.sql_client]
}

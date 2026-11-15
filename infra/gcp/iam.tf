# One service account per process and one for the migration job; each gets only what its
# generated clients need (jeeves-generator README at 4e87f97: Pub/Sub channels, Pub/Sub loops).
resource "google_service_account" "run" {
  for_each     = local.service_accounts
  account_id   = "${local.p}${each.key}"
  display_name = "QRWTY arm A ${each.value}"
}

# Cloud SQL through the connector (password logins; IAM database authentication is not used:
# the generated pool reads a password file, AG-03's mount layout).
resource "google_project_iam_member" "sql_client" {
  for_each = local.service_accounts
  project  = var.project_id
  role     = "roles/cloudsql.client"
  member   = google_service_account.run[each.key].member
}

# Redirect service: publish, and pubsub.topics.get for its startup probe (topic.exists()).
resource "google_pubsub_topic_iam_member" "redirect_publish" {
  topic  = google_pubsub_topic.events.id
  role   = "roles/pubsub.publisher"
  member = google_service_account.run["redirect"].member
}

resource "google_pubsub_topic_iam_member" "redirect_probe" {
  topic  = google_pubsub_topic.events.id
  role   = "roles/pubsub.viewer"
  member = google_service_account.run["redirect"].member
}

# Analytics worker: consume and get its subscription; publish copies to `.failed`.
resource "google_pubsub_subscription_iam_member" "analytics_consume" {
  subscription = google_pubsub_subscription.analytics.id
  role         = "roles/pubsub.subscriber"
  member       = google_service_account.run["analytics"].member
}

resource "google_pubsub_subscription_iam_member" "analytics_probe" {
  subscription = google_pubsub_subscription.analytics.id
  role         = "roles/pubsub.viewer"
  member       = google_service_account.run["analytics"].member
}

resource "google_pubsub_topic_iam_member" "analytics_dead_letter" {
  topic  = google_pubsub_topic.dead_letter.id
  role   = "roles/pubsub.publisher"
  member = google_service_account.run["analytics"].member
}

# Each credential is readable only by the accounts whose process mounts it.
locals {
  secret_readers = merge(
    { for s in local.migrate_secrets : "migrate/${s}" => { sa = "migrate", secret = s } },
    { for name, svc in local.http : "${svc.sa}/memorystore-ca" => { sa = svc.sa, secret = "memorystore-ca" } if svc.uses_ca },
    merge([for name, svc in local.http : { for s in svc.secrets : "${svc.sa}/${s}" => { sa = svc.sa, secret = s } }]...),
    { for s in local.worker.secrets : "analytics/${s}" => { sa = "analytics", secret = s } },
  )
}

resource "google_secret_manager_secret_iam_member" "reader" {
  for_each  = local.secret_readers
  secret_id = google_secret_manager_secret.s[each.value.secret].id
  role      = "roles/secretmanager.secretAccessor"
  member    = google_service_account.run[each.value.sa].member
}

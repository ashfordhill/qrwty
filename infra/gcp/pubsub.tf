# Click events: the export's Pub/Sub plan (infra/local.json) as managed resources, plus the
# retention, region and archive the durable-clicks contract adds. Processes never create or change
# these (Jeeves QG07 invariant 5); they must exist, with every subscription, before traffic.
locals {
  retention = "2678400s" # 31 days: topic, analytics subscription, dead letters and the archive
}

resource "google_pubsub_topic" "events" {
  name                       = local.topic
  message_retention_duration = local.retention

  message_storage_policy {
    allowed_persistence_regions = [var.region]
    enforce_in_transit          = true
  }

  lifecycle {
    prevent_destroy = true # a lost topic loses every unacknowledged click
  }
  depends_on = [google_project_service.api]
}

resource "google_pubsub_topic" "dead_letter" {
  name                       = local.dead_letter_topic
  message_retention_duration = local.retention

  message_storage_policy {
    allowed_persistence_regions = [var.region]
    enforce_in_transit          = true
  }
}

# The analytics subscription, exactly as the export's plan sets it, with 31-day retention and no
# inactivity expiry (a subscription that expired would silently stop retaining clicks).
resource "google_pubsub_subscription" "analytics" {
  name                       = local.subscription
  topic                      = google_pubsub_topic.events.id
  ack_deadline_seconds       = 60
  message_retention_duration = local.retention

  expiration_policy {
    ttl = "" # never expires
  }
  retry_policy {
    minimum_backoff = "1s"
    maximum_backoff = "10s"
  }
  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.dead_letter.id
    max_delivery_attempts = 100
  }

  lifecycle {
    prevent_destroy = true
  }
}

# The dead-letter topic's pull subscription (`.failed`), for inspection and replay.
resource "google_pubsub_subscription" "dead_letter" {
  name                       = local.dead_letter_topic
  topic                      = google_pubsub_topic.dead_letter.id
  ack_deadline_seconds       = 60
  message_retention_duration = local.retention

  expiration_policy {
    ttl = ""
  }
}

# The raw archive: an independent Cloud Storage export subscription on the same topic, batched
# Avro objects with each message's attributes (messageId), kept 31 days. Objects can hold
# duplicate event IDs; nothing treats an object as one click.
resource "google_storage_bucket" "archive" {
  name                        = "${local.p}click-archive-${var.project_id}"
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = false

  lifecycle_rule {
    condition {
      age = 31
    }
    action {
      type = "Delete"
    }
  }
  labels = {
    arm = "a"
  }
}

resource "google_pubsub_subscription" "archive" {
  name                       = "${local.p}click-events-archive"
  topic                      = google_pubsub_topic.events.id
  ack_deadline_seconds       = 60
  message_retention_duration = local.retention

  expiration_policy {
    ttl = ""
  }
  cloud_storage_config {
    bucket          = google_storage_bucket.archive.name
    filename_prefix = "click-events/"
    filename_suffix = ".avro"
    max_duration    = "300s"
    max_bytes       = 104857600
    avro_config {
      write_metadata = true
    }
  }

  depends_on = [google_storage_bucket_iam_member.archive_writer, google_storage_bucket_iam_member.archive_reader]
  lifecycle {
    prevent_destroy = true
  }
}

# The Pub/Sub service agent: writes archive objects, and moves dead letters.
locals {
  pubsub_agent = "serviceAccount:service-${data.google_project.this.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

resource "google_storage_bucket_iam_member" "archive_writer" {
  bucket = google_storage_bucket.archive.name
  role   = "roles/storage.objectCreator"
  member = local.pubsub_agent
}

resource "google_storage_bucket_iam_member" "archive_reader" {
  bucket = google_storage_bucket.archive.name
  role   = "roles/storage.legacyBucketReader"
  member = local.pubsub_agent
}

resource "google_pubsub_topic_iam_member" "dead_letter_publisher" {
  topic  = google_pubsub_topic.dead_letter.id
  role   = "roles/pubsub.publisher"
  member = local.pubsub_agent
}

resource "google_pubsub_subscription_iam_member" "dead_letter_subscriber" {
  subscription = google_pubsub_subscription.analytics.id
  role         = "roles/pubsub.subscriber"
  member       = local.pubsub_agent
}

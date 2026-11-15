output "service_urls" {
  description = "Each HTTP process's Cloud Run URL (the edge and Q12a's probes reach these)."
  value       = { for k, s in google_cloud_run_v2_service.http : k => s.uri }
}

output "deterministic_urls" {
  description = "The URLs the processes were configured with; Q12a checks they equal service_urls."
  value       = local.url
}

output "cloud_sql_connection_name" {
  value = google_sql_database_instance.pg.connection_name
}

output "memorystore_endpoints" {
  value = { for k, i in google_memorystore_instance.cache : k => i.discovery_endpoints[0] }
}

output "pubsub" {
  value = {
    topic        = google_pubsub_topic.events.id
    subscription = google_pubsub_subscription.analytics.id
    dead_letter  = google_pubsub_topic.dead_letter.id
    archive      = google_pubsub_subscription.archive.id
    bucket       = google_storage_bucket.archive.url
  }
}

output "secret_ids" {
  description = "Secrets the bootstrap must add a version to before the migration job runs."
  value       = sort([for k, s in google_secret_manager_secret.s : s.secret_id if k != "memorystore-ca"])
}

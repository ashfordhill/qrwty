variable "project_id" {
  description = "The owner's GCP trial project (owner decisions §1). Shared with arm B, whose resources are prefixed qrwtyb-."
  type        = string
}

variable "region" {
  description = "One region for everything (owner decisions §1)."
  type        = string
  default     = "us-central1"
}

variable "image" {
  description = "The production image by digest, as built and recorded locally (Artifact Registry path @sha256:...). The same digest runs every process and the migration job."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9.-]+-docker\\.pkg\\.dev/.+@sha256:[0-9a-f]{64}$", var.image))
    error_message = "image must be an Artifact Registry reference pinned by digest."
  }
}

variable "auth0_domain" {
  description = "A's Auth0 tenant domain (owner decisions §12); its issuer is https://<domain>/. Created in Q12a/Q13, not here."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9-]+(\\.[a-z0-9-]+)*\\.auth0\\.com$", var.auth0_domain))
    error_message = "auth0_domain must be an *.auth0.com tenant domain."
  }
}

variable "auth0_api_audience" {
  description = "A's own Auth0 API identifier (OIDC_AUDIENCE); arm B has its own."
  type        = string

  validation {
    condition     = can(regex("^https://[^\\s]+$", var.auth0_api_audience))
    error_message = "auth0_api_audience must be an https identifier."
  }
}

variable "sql_tier" {
  description = "Cloud SQL machine tier. The 30-day free trial instance is acceptable for staging (owner decisions §1); it has no backups or SLA."
  type        = string
  default     = "db-f1-micro"
}

variable "memorystore_node_type" {
  description = "Memorystore for Valkey node type; the smallest is enough for staging."
  type        = string
  default     = "SHARED_CORE_NANO"
}

variable "memorystore_tls_servername" {
  description = "The name Memorystore's server certificate carries, when it is not the endpoint address (JEEVES_CACHE_<ID>_TLS_SERVERNAME). Unknown until Q12a reads a live certificate; null leaves the variable unset."
  type        = string
  default     = null
}

variable "max_instances" {
  description = "Upper bound of copies per HTTP service (Cloud Run max_instance_count)."
  type        = number
  default     = 3
}

variable "analytics_workers" {
  description = "Copies of the Analytics worker (worker pool manual instance count)."
  type        = number
  default     = 1
}

variable "public_origin" {
  description = "Link API's QRWTY_PUBLIC_ORIGIN_URL: the public origin short links are built on (Q06)."
  type        = string
  default     = "https://qrwty.io"

  validation {
    condition     = can(regex("^https://[a-z0-9.-]+$", var.public_origin))
    error_message = "public_origin must be an https origin with no path."
  }
}

variable "reputation_credentials" {
  description = "Link API's QRWTY_REPUTATION_CREDENTIALS: \"metadata\" sends Web Risk the service account's access token from the metadata server (Q13, AG-13). Null leaves it unset (the Q06 image sends none)."
  type        = string
  default     = null

  validation {
    condition     = var.reputation_credentials == null || var.reputation_credentials == "metadata"
    error_message = "reputation_credentials must be null or \"metadata\"."
  }
}

variable "deletion_protection" {
  description = "Protect stateful resources (Cloud SQL, Memorystore, Cloud Run). Teardown sets false and applies before destroy."
  type        = bool
  default     = true
}

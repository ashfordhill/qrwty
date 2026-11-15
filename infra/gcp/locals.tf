locals {
  p = "qrwtya-" # every resource name starts with this, except the three Pub/Sub names below (AG-05)

  # The generated export compiles its Pub/Sub names from the Click events tile's ID
  # (src/processes/*.ts, infra/local.json); there is no environment binding, so they cannot carry
  # the qrwtya- prefix. Recorded as A-found gap AG-05.
  topic             = "click-events"
  subscription      = "click-events--analytics-worker"
  dead_letter_topic = "click-events--analytics-worker.failed"

  secret_mount = "/var/run/qrwty-secrets" # QRWTY_SECRET_MOUNT_DIR: one volume per secret, file "value"
  ca_mount     = "/var/run/qrwty-tls/memorystore-ca"
  issuer       = "https://${var.auth0_domain}/"

  # Cloud Run's deterministic service URLs (https://<service>-<project number>.<region>.run.app),
  # so tiles can name each other without a dependency cycle.
  url = { for s in keys(local.http) : s => "https://${local.p}${s}-${data.google_project.this.number}.${var.region}.run.app" }

  db = { for d in ["links", "sessions", "billing", "analytics"] : d => {
    "JEEVES_DATABASE_${upper(d)}_HOST" = "/cloudsql/${google_sql_database_instance.pg.connection_name}"
    "JEEVES_DATABASE_${upper(d)}_PORT" = "5432"
    "JEEVES_DATABASE_${upper(d)}_TLS"  = "disable" # a Unix socket: the Cloud SQL connector encrypts
  } }
  cache = { for c, i in google_memorystore_instance.cache : c => merge({
    "JEEVES_CACHE_${upper(replace(c, "-", "_"))}_HOST"    = i.discovery_endpoints[0].address
    "JEEVES_CACHE_${upper(replace(c, "-", "_"))}_PORT"    = tostring(i.discovery_endpoints[0].port)
    "JEEVES_CACHE_${upper(replace(c, "-", "_"))}_TLS"     = "verify-full"
    "JEEVES_CACHE_${upper(replace(c, "-", "_"))}_CA_FILE" = "${local.ca_mount}/value"
    }, var.memorystore_tls_servername == null ? {} : {
    "JEEVES_CACHE_${upper(replace(c, "-", "_"))}_TLS_SERVERNAME" = var.memorystore_tls_servername
  }) }
  oidc = {
    OIDC_ISSUER   = local.issuer
    OIDC_AUDIENCE = var.auth0_api_audience
    OIDC_JWKS_URL = "${local.issuer}.well-known/jwks.json"
  }
  profile = {
    QRWTY_PROFILE          = "production"
    JEEVES_REQUIRE_TLS     = "true"
    QRWTY_SECRET_MOUNT_DIR = local.secret_mount
  }

  # One row per generated process: the variables it reads (.jeeves/report.json), its credentials
  # (compose.yaml secrets), and how it is reached. Values are production values; none is secret.
  http = {
    "redirect-service" = {
      env      = merge(local.db.links, local.cache["hot-routes"], { JEEVES_PUBSUB_PROJECT = var.project_id, QRWTY_CACHE_AUTH_DISABLED = "true" })
      secrets  = ["sql-links--redirect-service"]
      uses_ca  = true
      ingress  = "INGRESS_TRAFFIC_ALL" # the qrwty.io Worker is the trusted edge (Q13 restricts the origin)
      sa       = "redirect"
      min      = 1
    }
    "session-api" = {
      env = merge(local.db.sessions, {
        JEEVES_IDENTITY_IDENTITY_URL = "https://${var.auth0_domain}"
        JEEVES_TILE_ACCOUNT_API_URL  = "https://${local.p}account-api-${data.google_project.this.number}.${var.region}.run.app"
        JEEVES_TILE_BILLING_API_URL  = "https://${local.p}billing-api-${data.google_project.this.number}.${var.region}.run.app"
        JEEVES_TILE_LINK_API_URL     = "https://${local.p}link-api-${data.google_project.this.number}.${var.region}.run.app"
      })
      secrets = ["sql-sessions--session-api"]
      uses_ca = false
      ingress = "INGRESS_TRAFFIC_ALL"
      sa      = "session"
      min     = 0
    }
    "link-api" = {
      env = merge(local.db.links, local.cache["admission-cache"], local.oidc, {
        JEEVES_EXTERNAL_REPUTATION_API_URL = "https://webrisk.googleapis.com"
        JEEVES_TILE_BILLING_API_URL        = "https://${local.p}billing-api-${data.google_project.this.number}.${var.region}.run.app"
        QRWTY_CACHE_AUTH_DISABLED          = "true"
      })
      secrets = ["sql-links--link-api"]
      uses_ca = true
      ingress = "INGRESS_TRAFFIC_INTERNAL_ONLY"
      sa      = "link"
      min     = 0
    }
    "account-api" = {
      env = merge(local.db.links, local.db.analytics, local.oidc, {
        JEEVES_TILE_BILLING_API_URL = "https://${local.p}billing-api-${data.google_project.this.number}.${var.region}.run.app"
      })
      secrets = ["sql-analytics--account-api", "sql-links--account-api"]
      uses_ca = false
      ingress = "INGRESS_TRAFFIC_INTERNAL_ONLY"
      sa      = "account"
      min     = 0
    }
    "billing-api" = {
      env     = merge(local.db.billing, local.oidc, { JEEVES_EXTERNAL_STRIPE_API_URL = "https://api.stripe.com" })
      secrets = ["sql-billing--billing-api"]
      uses_ca = false
      ingress = "INGRESS_TRAFFIC_ALL" # Stripe's signed webhooks arrive here through the edge
      sa      = "billing"
      min     = 0
    }
  }
  worker = {
    env     = merge(local.db.analytics, { JEEVES_PUBSUB_PROJECT = var.project_id })
    secrets = ["sql-analytics--analytics-worker"]
  }
  migrate_secrets = [
    "postgres-admin", "owner-analytics", "owner-billing", "owner-links", "owner-sessions",
    "identity-owner-identity", "identity-identity", # the local Keycloak's database, unused with Auth0 (AG-06)
    "sql-analytics--account-api", "sql-links--account-api", "sql-analytics--analytics-worker",
    "sql-billing--billing-api", "sql-links--link-api", "sql-links--redirect-service", "sql-sessions--session-api",
  ]
  # Every credential: a Secret Manager secret per generated name. The caches have none: Memorystore
  # runs AUTH_DISABLED (AG-04), and the preflight gives the client an empty credential.
  secrets = toset(concat(local.migrate_secrets, ["memorystore-ca"]))

  service_accounts = {
    redirect  = "Redirect service"
    session   = "Session API"
    link      = "Link API"
    account   = "Account API"
    billing   = "Billing API"
    analytics = "Analytics worker"
    migrate   = "Migration job"
  }

  # The container command: the application's preflight, then the generated process (exec, so it
  # receives SIGTERM directly). See infra/app-overlay/scripts/qrwty-production-profile.mjs.
  command = { for name in concat(keys(local.http), ["analytics-worker"]) : name =>
    "node scripts/qrwty-production-profile.mjs ${name} && SECRET_DIR=/tmp/qrwty-secrets exec node dist/processes/${name}.js"
  }
}

data "google_project" "this" {
  project_id = var.project_id
}

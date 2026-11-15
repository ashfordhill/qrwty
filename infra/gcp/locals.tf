locals {
  p = "qrwtya-" # every resource name starts with this, except the three Pub/Sub names below (AG-05)

  # The generated export compiles its Pub/Sub names from the Click events tile's ID, and each loop
  # stub's subscription from its tile and module, `<topic>--<tile>--<module>` (Jeeves QG28;
  # src/processes/*.ts, infra/local.json); there is no environment binding, so they cannot carry
  # the qrwtya- prefix. Recorded as A-found gap AG-05.
  topic             = "click-events"
  subscription      = "click-events--analytics-worker--analytics-worker-click-aggregator"
  dead_letter_topic = "click-events--analytics-worker--analytics-worker-click-aggregator.failed"

  secret_mount = "/var/run/qrwty-secrets"            # QRWTY_SECRET_MOUNT_DIR: one volume per secret, file "value"
  ca_mount     = "/var/run/qrwty-tls/memorystore-ca" # the CA of the one cache a process uses
  caches       = toset(["hot-routes", "admission-cache"])
  issuer       = "https://${var.auth0_domain}/"

  # Cloud Run's deterministic service URLs (https://<service>-<project number>.<region>.run.app),
  # so tiles can name each other without a dependency cycle.
  url = { for s in keys(local.http) : s => "https://${local.p}${s}-${data.google_project.this.number}.${var.region}.run.app" }

  db = { for d in ["links", "sessions", "billing", "analytics"] : d => {
    "JEEVES_DATABASE_${upper(d)}_HOST" = "/cloudsql/${google_sql_database_instance.pg.connection_name}"
    "JEEVES_DATABASE_${upper(d)}_PORT" = "5432"
    "JEEVES_DATABASE_${upper(d)}_TLS"  = "disable" # a Unix socket: the Cloud SQL connector encrypts
  } }
  # A CLUSTER_DISABLED instance reports no discovery_endpoints (deprecated, empty: Q13); its
  # primary endpoint is the PSC auto connection of type CONNECTION_TYPE_PRIMARY.
  cache_primary = { for c, i in google_memorystore_instance.cache : c => one([
    for conn in flatten([for e in i.endpoints : e.connections]) : conn.psc_auto_connection[0]
    if length(conn.psc_auto_connection) > 0 && conn.psc_auto_connection[0].connection_type == "CONNECTION_TYPE_PRIMARY"
  ]) }
  cache = { for c, i in google_memorystore_instance.cache : c => merge({
    "JEEVES_CACHE_${upper(replace(c, "-", "_"))}_HOST"    = local.cache_primary[c].ip_address
    "JEEVES_CACHE_${upper(replace(c, "-", "_"))}_PORT"    = tostring(local.cache_primary[c].port)
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
      env = merge(local.db.links, local.cache["hot-routes"], {
        JEEVES_PUBSUB_PROJECT     = var.project_id
        QRWTY_CACHE_AUTH_DISABLED = "true"
        QRWTY_PUBLIC_ORIGIN_URL   = var.public_origin # the only host that redirects (A4)
      })
      secrets = ["sql-links--redirect-service"]
      ca      = "hot-routes"          # Memorystore's CA is per instance (GOOGLE_MANAGED_PER_INSTANCE_CA, Q13)
      ingress = "INGRESS_TRAFFIC_ALL" # the qrwty.io Worker sends each short link here (A4)
      sa      = "redirect"
      min     = 0 # trial credit: no idle copy (A2)
    }
    "session-api" = {
      env = merge(local.db.sessions, {
        JEEVES_IDENTITY_IDENTITY_URL = "https://${var.auth0_domain}"
        JEEVES_TILE_ACCOUNT_API_URL  = "https://${local.p}account-api-${data.google_project.this.number}.${var.region}.run.app"
        JEEVES_TILE_BILLING_API_URL  = "https://${local.p}billing-api-${data.google_project.this.number}.${var.region}.run.app"
        JEEVES_TILE_LINK_API_URL     = "https://${local.p}link-api-${data.google_project.this.number}.${var.region}.run.app"
        # Session API's declared settings (A3): the issuer the browser signs in at, the API the
        # access token is for, and the origin of the callback and cookies.
        SIGNIN_ISSUER_URL       = local.issuer
        SIGNIN_AUDIENCE         = var.auth0_api_audience
        QRWTY_PUBLIC_ORIGIN_URL = var.public_origin
      })
      # signin-client: the qrwtya-web application's {client_id, client_secret} (A3's auth0.py puts
      # it in Secret Manager); session-keys: the ring that seals tokens and signs cookies (A3);
      # client-address-key: checks the Worker's signed visitor address (A6, guest admission; the
      # Worker holds it as its secret CLIENT_ADDRESS_KEY); account-erasure-client: the
      # qrwtya-account-erasure application (delete:users only) that deletes a deleted account's
      # Auth0 user (A6, from auth0.py).
      secrets = ["sql-sessions--session-api", "signin-client", "session-keys", "client-address-key", "account-erasure-client"]
      ca      = null
      ingress = "INGRESS_TRAFFIC_ALL"
      sa      = "session"
      min     = 0
    }
    "link-api" = {
      env = merge(local.db.links, local.cache["admission-cache"], local.oidc, {
        JEEVES_EXTERNAL_REPUTATION_API_URL = "https://webrisk.googleapis.com"
        JEEVES_TILE_BILLING_API_URL        = "https://${local.p}billing-api-${data.google_project.this.number}.${var.region}.run.app"
        QRWTY_CACHE_AUTH_DISABLED          = "true"
        QRWTY_PUBLIC_ORIGIN_URL            = var.public_origin # short URLs and loop rejection (Q06, AG-10)
      }, var.reputation_credentials == null ? {} : { QRWTY_REPUTATION_CREDENTIALS = var.reputation_credentials })
      # link-replay-keys: Q06's claim-proof seal ring; operator-key: verifies the operator CLI's
      # signed requests (A6; infra/gcp/scripts/operator.mjs reads it through gcloud).
      secrets = ["sql-links--link-api", "link-replay-keys", "operator-key"]
      ca      = "admission-cache"
      ingress = "INGRESS_TRAFFIC_INTERNAL_ONLY"
      sa      = "link"
      min     = 0
    }
    "account-api" = {
      env = merge(local.db.links, local.db.analytics, local.oidc, {
        JEEVES_TILE_BILLING_API_URL = "https://${local.p}billing-api-${data.google_project.this.number}.${var.region}.run.app"
        QRWTY_PUBLIC_ORIGIN_URL     = var.public_origin # My links' short URLs (A3)
      })
      secrets = ["sql-analytics--account-api", "sql-links--account-api"]
      ca      = null
      ingress = "INGRESS_TRAFFIC_INTERNAL_ONLY"
      sa      = "account"
      min     = 0
    }
    "billing-api" = {
      env     = merge(local.db.billing, local.oidc, { JEEVES_EXTERNAL_STRIPE_API_URL = "https://api.stripe.com" })
      secrets = ["sql-billing--billing-api"]
      ca      = null
      # Internal until Stripe's signed webhooks exist (Q10a, not run): the tile clients that call it
      # send no ID token, so it can't be both public and IAM-protected (Q13 finding).
      ingress = "INGRESS_TRAFFIC_INTERNAL_ONLY"
      sa      = "billing"
      min     = 0
    }
  }
  # Public origins that allow unauthenticated invocation (no Cloud Run IAM). The qrwty.io Worker
  # proxies the browser's /api/*, /auth/* and /healthz to Session API (A2), and GET and HEAD of
  # each short link to the Redirect service (A4); it can't send a Google ID token (AG-14).
  open = toset(["session-api", "redirect-service"])

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
  # runs AUTH_DISABLED (AG-04), and their file variables name /dev/null (secret_files). Each
  # instance has its own managed CA, so each has its own public CA secret.
  # auth0-test-user: the A3 smoke's test user, {username, password}, mounted by no process.
  secrets = toset(concat(local.migrate_secrets, [for c in local.caches : "memorystore-ca-${c}"],
    ["link-replay-keys", "signin-client", "session-keys", "auth0-test-user",
  "client-address-key", "account-erasure-client", "operator-key"]))

  service_accounts = {
    redirect  = "Redirect service"
    session   = "Session API"
    link      = "Link API"
    account   = "Account API"
    billing   = "Billing API"
    analytics = "Analytics worker"
    migrate   = "Migration job"
  }

  # Each credential a process reads is the file its JEEVES_SECRET_<NAME>_FILE names (Jeeves QG34;
  # <NAME> the secret's name upper-cased, - and . as _): its own secret volume. A cache's names
  # /dev/null, an empty credential, since Memorystore runs AUTH_DISABLED (AG-04).
  credential_sets = merge(
    { for name, h in local.http : name => { secrets = h.secrets, cache = h.ca } },
    { "analytics-worker" = { secrets = local.worker.secrets, cache = null } },
    { migrate = { secrets = local.migrate_secrets, cache = null } },
  )
  secret_files = { for name, c in local.credential_sets : name => merge(
    { for s in c.secrets : "JEEVES_SECRET_${upper(replace(s, "/[-.]/", "_"))}_FILE" => "${local.secret_mount}/${s}/value" },
    { for cache in compact([c.cache]) : "JEEVES_SECRET_CACHE_${upper(replace(cache, "/[-.]/", "_"))}_FILE" => "/dev/null" },
  ) }

  # The container command: the application's preflight, then the generated process (exec, so it
  # receives SIGTERM directly). See infra/app-overlay/scripts/qrwty-production-profile.mjs.
  command = { for name in concat(keys(local.http), ["analytics-worker"]) : name =>
    "node scripts/qrwty-production-profile.mjs ${name} && exec node dist/processes/${name}.js"
  }
}

data "google_project" "this" {
  project_id = var.project_id
}

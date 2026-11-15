resource "google_project_service" "api" {
  for_each = toset([
    "artifactregistry.googleapis.com", "compute.googleapis.com", "iam.googleapis.com",
    "memorystore.googleapis.com", "networkconnectivity.googleapis.com", "pubsub.googleapis.com",
    "run.googleapis.com", "secretmanager.googleapis.com", "servicenetworking.googleapis.com",
    "sqladmin.googleapis.com", "storage.googleapis.com", "webrisk.googleapis.com",
  ])
  service            = each.key
  disable_on_destroy = false # shared with arm B: never turn an API off on teardown
}

resource "google_compute_network" "vpc" {
  name                    = "${local.p}vpc"
  auto_create_subnetworks = false
  depends_on              = [google_project_service.api]
}

# Cloud Run's Direct VPC egress: calls to Memorystore's endpoints, to Cloud SQL's private address
# and to the internal-only services (through Private Google Access) leave from here.
resource "google_compute_subnetwork" "run" {
  name                     = "${local.p}run"
  network                  = google_compute_network.vpc.id
  region                   = var.region
  ip_cidr_range            = "10.42.0.0/24"
  private_ip_google_access = true
}

# Private services access for Cloud SQL's private address.
resource "google_compute_global_address" "psa" {
  name          = "${local.p}psa"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 20
  network       = google_compute_network.vpc.id
}

resource "google_service_networking_connection" "psa" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.psa.name]
}

# Private Service Connect for Memorystore for Valkey's endpoints.
resource "google_network_connectivity_service_connection_policy" "memorystore" {
  name          = "${local.p}memorystore"
  location      = var.region
  service_class = "gcp-memorystore"
  network       = google_compute_network.vpc.id
  psc_config {
    subnetworks = [google_compute_subnetwork.run.id]
  }
}

# Cloud NAT. Every Cloud Run resource sends ALL_TRAFFIC through the VPC (so calls to the
# internal-only services count as internal), which leaves no route to the Internet: the Auth0
# issuer's key set (the sign-in guard of Link, Account and Billing API), Session API's identity
# URL and Stripe need this NAT. Google APIs (Pub/Sub, Web Risk, run.app) use Private Google Access.
resource "google_compute_router" "nat" {
  name    = "${local.p}router"
  region  = var.region
  network = google_compute_network.vpc.id
}

resource "google_compute_router_nat" "nat" {
  name                               = "${local.p}nat"
  router                             = google_compute_router.nat.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "LIST_OF_SUBNETWORKS"

  subnetwork {
    name                    = google_compute_subnetwork.run.id
    source_ip_ranges_to_nat = ["ALL_IP_RANGES"]
  }
}

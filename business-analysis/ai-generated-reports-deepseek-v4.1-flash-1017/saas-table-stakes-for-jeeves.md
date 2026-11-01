# SaaS table stakes as reusable Jeeves templates

**Implementation brief for deterministic SaaS foundations**

Prepared 2026-10-31 for the agents working on `~/github/jeeves`.

---

## 0. Purpose and how to use this document

This is not a product brief for one SaaS. It is a specification for the **table-stakes capabilities that almost every paid SaaS needs**, expressed as reusable Jeeves templates, attachments, runtime libraries and starters.

Use it in three ways:

1. **As a build order.** Sections 5 and 12 name the packages, dependencies and acceptance criteria. An agent can take one package, read its section, and build it without inventing a new architecture.
2. **As a boundary document.** Section 3 says which capability belongs in a template, which belongs in a runtime library, which belongs in a starter, and which must stay project-owned. This is the main defence against non-deterministic agent work.
3. **As an acceptance contract.** Section 9 and the acceptance IDs in section 5 define what “done” means. A template is not done because it generates; it is done because its fixed acceptance suites pass in a disposable project.

The document assumes Jeeves terms:

- **C1 offering** — a system a person can choose (for example “Resource workspace” or “QR Studio”).
- **C2 container** — a deployable or external boundary (web app, API, worker, database, queue, provider).
- **C3 component** — a cohesive responsibility inside a container (accounts, organizations, billing, audit, screen group).
- **C4 implementation** — the template runtime, scaffold, generated files and tests. Jeeves edits C1–C3; C4 is code and verification.

The planned C3 families in `CATALOG.md` already name most of these responsibilities. This document turns those names into implementable packages. It is a proposal, not a commitment: verify the current catalog, template contract and code before implementing; where this document and the code disagree, the code and `PLAN.md` win.

## Contents

- [0. Purpose and how to use this document](#0-purpose-and-how-to-use-this-document)
- [1. What “table stakes” means](#1-what-table-stakes-means)
- [2. Design principles](#2-design-principles)
- [3. Jeeves mapping and package strategy](#3-jeeves-mapping-and-package-strategy)
- [4. Cross-cutting runtime primitives](#4-cross-cutting-runtime-primitives)
- [5. Capability specifications](#5-capability-specifications)
- [6. Composition recipes](#6-composition-recipes)
- [7. Phasing and dependencies](#7-phasing-and-dependencies)
- [8. Acceptance and verification](#8-acceptance-and-verification)
- [9. What not to template](#9-what-not-to-template)
- [10. Open decisions for Jeeves](#10-open-decisions-for-jeeves)
- [11. qrwty-specific mapping](#11-qrwty-specific-mapping)
- [12. First packages for Jeeves](#12-first-packages-for-jeeves)
- [13. Template author checklist](#13-template-author-checklist)
- [Glossary](#glossary)

---

## 1. What “table stakes” means

A capability is table stakes if a paying customer expects it **before** they trust the product with money, data or a team:

- They can sign up, verify their email, sign in, reset a password and manage sessions.
- If the product sells to teams, they can create or join an organization, invite people, and understand who can do what.
- They can pay, see what they bought, change or cancel it, and recover from a failed payment.
- The product enforces the plan they paid for, even if they call the API directly.
- Privileged actions are attributable and reviewable.
- Transactional email arrives, and the customer can opt out of non-essential categories.
- If the product has a developer API, a developer can create a key, call the API, receive webhooks and debug failures.
- A customer can export their data, and an admin can support them without direct database access.
- If the product exposes public links or QR codes, they are protected from abuse.
- The service has health checks, backups, logs and a way to investigate incidents.
- The legal and privacy surface exists: terms, privacy, DPA, retention, deletion, subprocessors.

Table stakes are **not** every feature a mature SaaS has. SSO/SCIM, custom roles, approval workflows, usage-based billing, multi-region residency, search and realtime are conditional or later. Section 3 marks them.

The strongest test of table stakes is not “can a demo do it?” It is “can a customer do it on a bad day?” — duplicate webhook, expired invite, failed payment, revoked key, cross-tenant ID, accidental deletion, provider outage.

---

## 2. Design principles

### 2.1 Deterministic core, project-owned seams

Jeeves exists to remove non-deterministic agent work. The table-stakes core must be:

- **Generated, not re-invented.** Schema, migrations, contracts, routes, state machines and provider adapters are generated or supplied by an immutable runtime.
- **Configurable only through finite choices.** Enums, bounded integers, booleans and provider IDs. No free-form SQL, no arbitrary code in manifests, no per-customer branches in templates.
- **Extended through named seams.** Project code registers a plan, an entitlement, a notification template, an audit action or a provider adapter. It does not edit the generated core.
- **Owned explicitly.** Every file is generated-owned, scaffold (project-owned after first write), runtime (immutable) or project-owned. The lock and regeneration rules enforce it.

### 2.2 Boring, explicit state machines

Money, subscriptions, invitations, exports, webhooks and abuse cases are state machines. Model the states and transitions explicitly, test every transition, and reject invalid transitions with a stable error code. Do not infer state from a pile of booleans.

### 2.3 Tenant isolation is a data-model invariant

Every tenant-owned row has an `org_id`. Every query is scoped by an authenticated tenant context. The client never supplies the tenant for authorization. A UI filter is not isolation. A test with two organizations, two users and cross-tenant IDs is mandatory.

### 2.4 Provider adapters at the edge

Stripe, Postmark, S3, Cloudflare and a malware scanner are **edges**. The core stores local state, exposes a stable interface, and treats provider payloads as untrusted input. Provider-specific code lives in an adapter, never in domain handlers. On the board, the design intent is the C3 **Integration adapter**; in code, it is a runtime package behind a stable interface.

### 2.5 Idempotency everywhere money or events move

Billing webhooks, outbound webhooks, email sends, export jobs, usage events and API-key mutations must be idempotent. Use a persisted idempotency key with a request hash and stored response, or a unique event ID with a processed-at marker. “Exactly once” is a lie; “effectively once” is a design.

### 2.6 Transactional outbox for side effects

Do not send email, deliver a webhook or call a provider inside the request transaction. Write an outbox row in the same transaction as the state change, then let a worker relay it. This is how a paid subscription, an audit row and a “payment succeeded” email stay consistent.

### 2.7 Audit privileged actions by default

Role changes, billing changes, API-key changes, data exports, deletions, impersonation and admin overrides are audited. Audit rows are append-only, attributable and redacted. “We can add audit later” is how enterprises lose trust.

### 2.8 Security and privacy are features

Session cookies, CSRF, password hashing, rate limits, SSRF protection, webhook signatures, signed download URLs, CSV-injection escaping, PII redaction and dependency scanning are part of the template, not documentation.

### 2.9 Accessibility and mouse-only operation

Every table-stakes screen must work by mouse alone. Loading, empty, error, disabled and success states are designed, not left to the agent. Forms have labels, errors are announced, focus is managed, and colour is not the only signal.

### 2.10 Template only what is stable

If a capability has more than two credible shapes, it is probably a recipe or project-owned code, not a template. The table-stakes templates should cover the 80% shape and expose a seam for the rest.

---

## 3. Jeeves mapping and package strategy

### 3.1 The reference C1 composition

A generic **Paid SaaS application** offering (proposed; not yet in `CATALOG.md`) composes:

| C1 | C2 containers | C3 responsibilities |
| --- | --- | --- |
| **Paid SaaS application** | Customer web app, admin console, application API, background worker, PostgreSQL, outbox/queue, object storage, payment provider, email provider, observability | Accounts & access, Organizations & members, Billing & plans, Entitlements, Audit log, Notifications, Developer API & webhooks, Reports & exports, Screen groups, Client session & access, API facade, Integration adapter |

A small product does not need every C2 as a separate deployment. The API and worker can share a service; the outbox can live in PostgreSQL; object storage can be local in development. The C3 boundaries stay meaningful even when the runtime is one container.

### 3.2 Package types

| Package type | Use it for | Examples | What it must not do |
| --- | --- | --- | --- |
| **Runtime library** | Shared invariants and primitives that every template imports | `@jeeves/saas-core`: tenant context, money, idempotency, outbox, audit hook, authz | Own product UI or provider-specific code |
| **Attachment template** | Adds tables, routes, contracts and config to an existing API | `saas-api` (composes the modules below) | Invent a second API or a separate database per capability |
| **Module package** | Tables, routes, runtime and tests composed by `saas-api` | `accounts`, `organizations`, `billing`, `entitlements`, `audit`, `notifications`, `developer-access`, `reports`, `abuse`, `custom-domains` | Own the service contract; assume it can attach independently today |
| **Element template** | A deployable boundary with its own runtime | `background-worker` | Encode domain rules that belong to the app |
| **Provider adapter** | A runtime package behind a stable interface | `stripe-adapter`, `email-adapter`, `scanner-adapter`, `edge-adapter` | Pretend every provider has the same API; leak provider types into domain code |
| **Starter / recipe** | A composed, editable starting point with screens and sample flows | `saas-b2b-starter`, `saas-api-first-starter`, `qrwty-saas-target` | Be the only way to use the modules |
| **Planned C3 block** | Design intent before implementation | `Organizations & members`, `Billing & plans` | Generate runtime or claim verification |

Package names in this document are provisional; follow the repository’s existing naming and versioning conventions when implementing.

### 3.3 Table-stake to Jeeves map

| Table stake | C3 family | Proposed package | Type | Depends on | Current state |
| --- | --- | --- | --- | --- | --- |
| Accounts, sessions, email verification, password reset, MFA | Accounts & access | Harden `rest-api-server` session auth or add `accounts` module | Module in `saas-api` + runtime | `http-service`, `postgres` | Session auth implemented in a bounded form |
| Organizations, memberships, invitations, ownership transfer | Organizations & members | `organizations` | Module in `saas-api` + runtime | Accounts, authz | Planned |
| Roles and permissions | Accounts & access (authorization) | `@jeeves/authz` + generated role tables | Runtime + generated module | Organizations | Planned |
| Plans, checkout, subscriptions, invoices, dunning | Billing & plans | `billing` + `stripe-adapter` | Module in `saas-api` + runtime adapter | Organizations, outbox, worker | Planned |
| Entitlements, quotas, usage limits | Billing & plans | `entitlements` + `@jeeves/entitlements` | Module in `saas-api` + runtime | Billing, organizations | Planned |
| Audit trail | Audit log | `audit` | Module in `saas-api` + runtime | Accounts, organizations | Planned |
| Transactional email, preferences, templates | Notifications | `notifications` + `email-adapter` | Module in `saas-api` + runtime adapter | Outbox, worker | Planned |
| API keys, scopes, rate limits, outbound webhooks | Developer API & webhooks | `developer-access` | Module in `saas-api` + runtime adapter | Organizations, outbox | Planned |
| Async exports and reports | Reports & exports | `reports` | Module in `saas-api` + worker job | Worker, object storage, audit | Planned |
| Staff support console | Screen group / feature area | `saas-admin` starter | Starter | All of the above | Planned |
| Abuse reports, destination scanning, quarantine | Moderation / domain module | `abuse` + `scanner-adapter` | Module in `saas-api` + runtime adapter | Links/QR domain, worker | Planned |
| Custom domains and TLS | Domain module + edge | `custom-domains` + `edge-adapter` | Module in `saas-api` + runtime adapter | DNS, edge, worker | Planned |
| Onboarding and settings | Screen group / feature area | `saas-onboarding` starter | Starter | Accounts, orgs, billing | Planned |
| Backups, health, logs, incident process | C2 integrations / observability | `saas-ops` starter + runtime hooks | Starter + hooks | All | Partial (`/health`, `/ready`) |
| DPA, privacy, retention, export/delete | Audit log + Reports & exports | `saas-compliance` starter + data-lifecycle endpoints | Starter + runtime | Audit, reports | Planned |
| SSO/SCIM | Accounts & access / identity provider | `sso` + `scim` | Module in `saas-api` + adapter | Organizations | Later |
| Metering/usage-based billing | Billing & plans | `@jeeves/metering` | Runtime + worker job | Billing, outbox | Conditional |
| Search | Search & indexing | `search` | Attachment + worker job | Postgres, worker | Conditional |
| File/media uploads | Media module | `media` | Attachment + storage adapter | Object storage | Conditional |
| Realtime | Realtime delivery | `realtime` | Element | API, authz | Conditional |

Scope shorthand: **universal for paid SaaS** — accounts, billing, entitlements, audit, notifications, onboarding, ops; **team/B2B** — organizations, roles, admin; **link/QR** — abuse, custom domains; **conditional** — developer API, reports, metering, search, media, realtime; **later** — SSO/SCIM.

### 3.3.1 What exists today

Jeeves currently supplies `http-service`, `rest-api-server` with bounded session auth and owner-scoped CRUD, `web-app`, `postgres`, `rest-api-client`, `durable-events`, the resource starter, and the QR Studio recipe. It does **not** generate organizations, billing, entitlements, audit, notifications, developer access, reports, admin, abuse, custom domains or SSO. The C3 blocks for those are planned design intent; placing them does not create runtime. This document is the bridge from planned blocks to implemented templates.

### 3.4 Which package shape to choose

Use this rule:

- If the capability needs **new tables and routes but shares the application API**, make it a **module composed by the `saas-api` attachment**. Do not make it an independent attachment until Jeeves supports contract-fragment composition.
- If it needs a **separate process or long-running job**, make it an **element**. Provider connections are adapters, not automatically elements.
- If it is **pure invariant logic** used by several templates, make it a **runtime library**.
- If it is mostly **screens and composition**, make it a **starter**, not a template.
- If the behaviour is **domain-specific** (what a seat means, what a plan includes, what a QR code does), keep it **project-owned** and expose a seam.

This prevents the two common failures: a separate microservice per table stake (too much operational burden) and a giant “SaaS template” that cannot be composed (too much coupling). Table stakes belong in templates, attachments or starters, **not in a domain recipe**; a recipe such as QR Studio composes them, it does not implement them.

### 3.4.1 Contract ownership and composition

Jeeves currently gives `http-service` one `rest-api-server` attachment (`max: 1`), and that attachment owns `contracts/<service>.openapi.yaml`. That means `organizations`, `billing`, `audit` and the rest cannot each be an independent attachment that tries to own the same contract. Choose one:

1. **Recommended: one `saas-api` attachment with modules.** `saas-api` is the successor/composition point; its config selects modules (`accounts`, `organizations`, `billing`, `entitlements`, `audit`, `notifications`, `developer-access`, `reports`, `abuse`, `custom-domains`). It generates one contract and one route table. Each module remains a separate package with its own runtime, generated files and tests; the attachment composes them.
2. **Contract-fragment composition.** Extend `rest-api-server` so capability attachments can contribute OpenAPI fragments and route ownership, merged deterministically by the generator. This preserves independent attachments but is a larger change to the runtime, lock and ownership model.
3. **Separate service per capability.** Not recommended for the target scale; it multiplies deployments, contracts, auth and operations.

Each module can be developed and tested against a small harness before `saas-api` exists; the attachment is only the composition point. A sketch of the composition config:

```ts
modules: z.object({
  accounts: z.boolean().default(true),
  organizations: z.boolean().default(false),
  billing: z.boolean().default(false),
  entitlements: z.boolean().default(false),
  audit: z.boolean().default(true),
  notifications: z.boolean().default(true),
  developerAccess: z.boolean().default(false),
  reports: z.boolean().default(false),
  abuse: z.boolean().default(false),
  customDomains: z.boolean().default(false),
});
```

Each module package exports `manifest`, `generate`, `testPack` and `agentGuide`; `saas-api` merges their generated files, contract fragments and compose contributions deterministically, ordered by dependency and stable module ID rather than user selection order. This is the same template contract, narrowed to a module surface.

For the first implementation, choose (1). Do not build five attachments that all try to own one contract. Adoption is a compatible template version: `http-service` adds a `saas-api` slot (or `rest-api-server` gains a module config), while existing projects keep `rest-api-server`. New projects choose one, not both; a service with two contract owners is a bug. This can be revisited if contract-fragment composition lands; the module packages should not assume independent attachment ownership in the meantime.

### 3.5 Template package layout

Every implemented package follows the Jeeves template contract:

```text
templates/<id>/
  manifest.ts        # defineTemplate: finite config, ports, attachments, card
  runtime/           # immutable @jeeves/<id>-runtime package, packed as an artifact
  scaffold/          # written once, then project-owned
  generate.ts        # deterministic generated-owned files + compose fragments
  test-pack/         # ordered checks against the composed project
  agent-guide.md     # what agents may change, what they must not
  conformance/       # Testcontainers tests for the template itself
  template.ts        # bundles manifest, generate, agentGuide, testPack, runtime
```

`generate.ts` exports `generate(ctx: GenerateContext): GenerateResult` and returns `OutputFile[]` with explicit `generated` or `scaffold` ownership plus compose fragments. It must be deterministic: no timestamps, random IDs, current time or filesystem order in generated files. Stable IDs come from the design. The generator may read the previous model and migrations, but it may not read the network.

Stay on the existing stack — TypeScript, Fastify, React/Vite, PostgreSQL, Docker Compose, pinned dependencies — unless a reviewed reason justifies a new runtime. A table-stakes package is not the place to introduce a second framework.

### 3.6 Ownership rules

| File class | Owner | Rules |
| --- | --- | --- |
| Runtime package | Template release | Immutable; upgrade by version, never patch in a project |
| Generated contract, schema, migrations, descriptors, clients | Generator | Never edit by hand; hashed in `jeeves/lock.json`; destructive changes need reviewed migration |
| Scaffold | Project after first write | Agents may extend; regeneration never overwrites |
| Project-owned domain code | Project | Handlers, screens, templates, plan definitions, entitlement semantics |
| Fixed acceptance | Template/recipe | Protected; agents cannot redefine |

### 3.7 Extension seams

Each package exposes a small, typed seam. Examples:

```ts
// Billing provider adapter: supplied by the template, selected by config.
interface BillingProvider {
  createCustomer(input: { orgId: string; email: string; name: string }): Promise<{ providerCustomerId: string }>;
  createCheckout(input: CheckoutInput): Promise<{ url: string }>;
  createPortal(input: { providerCustomerId: string; returnUrl: string }): Promise<{ url: string }>;
  getSubscription(providerSubscriptionId: string): Promise<ProviderSubscription>;
  cancel(providerSubscriptionId: string, atPeriodEnd: boolean): Promise<void>;
  resume(providerSubscriptionId: string): Promise<void>;
  verifyWebhook(rawBody: Buffer, headers: Record<string, string>): ProviderEvent;
}
```

```ts
// Project-owned entitlement definition.
defineEntitlement({
  key: "projects.max",
  valueType: "integer",
  defaultValue: 3,
  reset: "never",
});
```

```ts
// Project-owned audit action.
registerAuditAction({
  action: "project.archived",
  targetType: "project",
  redact: ["metadata.secret"],
});
```

The template calls these seams. The project never edits the generated tables, routes or state machines. For `rest-api-server` attachments, project extensions live in `src/features/<extension-id>/` and implement only the declared operations; generated CRUD routes and the contract stay generated-owned.

---

## 4. Cross-cutting runtime primitives

These primitives are shared by most table-stakes templates. Build them once in `@jeeves/saas-core`; do not copy them into each template.

### 4.1 Tenant context

```ts
interface TenantContext {
  userId: string;
  orgId: string | null;
  roles: string[];
  permissions: Set<string>;
  requestId: string;
}
```

Rules:

- The session identifies the user. The active organization comes from a validated membership, not from the request body.
- For organization-scoped routes, accept `orgId` in the path (`/api/orgs/{orgId}/...`) or an `X-Org-Id` header validated against membership. Validate membership on every request.
- For structured resources, add a `tenancy` option: `owner` (current), `organization`, or `both`. Organization resources get an `org_id` column and every generated query includes it.
- Database row-level security is optional, but the repository/query helper must always scope by `org_id`. A test that changes an `org_id` in a URL or body must fail with 404, not 403, to avoid existence leaks.
- Background jobs carry a tenant context or an explicit `org_id`; they never run unscoped.
- For structured services, use `sessionPrincipal(request.request)` for identity, `database.pool`/`withTransaction` for data, and the generated resource descriptors for table/column names; never derive SQL names from API names.

Acceptance: `SAAS-TENANT-01` — two orgs, two users, every list/read/update/delete with a cross-tenant ID returns 404 and leaves data unchanged.

### 4.2 Money and time

- Store money as `bigint` minor units plus `char(3)` currency. Never use floats.
- Store timestamps as `timestamptz` in UTC. Render in the organization/user timezone.
- Billing periods are half-open `[start, end)`. Use the provider’s period boundaries, not local arithmetic.
- Format money only at the UI edge; the API returns minor units and currency.
- Tax is provider-calculated unless the product has a tax engine. Do not invent tax rates in templates.

### 4.3 Idempotency

Table `idempotency_keys`:

| Column | Type | Notes |
| --- | --- | --- |
| `key` | text | Client-supplied `Idempotency-Key`; unique with `scope` |
| `scope` | text | Route or operation, e.g. `billing.checkout` |
| `request_hash` | text | SHA-256 of canonical method/path/body |
| `status` | text | `in_progress`, `completed`, `failed` |
| `response_status` | integer | Stored response status |
| `response_body` | jsonb | Stored response body |
| `created_at` | timestamptz | |
| `expires_at` | timestamptz | 24 hours for most; 7 days for money |

Rules:

- Reusing a key with a different request hash returns `409 IDEMPOTENCY_CONFLICT`.
- A completed key returns the stored response without re-executing.
- A failed key may be retried only if the operation is safe; money operations require a new key or an explicit retry policy.
- Webhooks use the provider event ID as the idempotency key, not a client header.

### 4.4 Transactional outbox

Table `outbox_events`:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | |
| `org_id` | uuid | Tenant scope |
| `type` | text | `billing.subscription_changed`, `notification.send`, `webhook.deliver` |
| `payload` | jsonb | Redacted, versioned |
| `idempotency_key` | text | Unique for downstream consumers |
| `status` | text | `pending`, `processing`, `done`, `failed`, `dead` |
| `attempts` | integer | |
| `next_attempt_at` | timestamptz | Exponential backoff |
| `created_at` | timestamptz | |
| `processed_at` | timestamptz | |

Rules:

- Write the outbox row in the same transaction as the state change.
- A worker claims rows with `FOR UPDATE SKIP LOCKED`, processes, and marks done/failed.
- Consumers are idempotent by `idempotency_key`.
- Dead rows go to a visible dead-letter view; an admin can retry.
- If Jeeves’s `durable-events` attachment is a good fit, reuse it; otherwise this table is the minimal portable outbox.

### 4.5 Authorization

```ts
type Action =
  | "org.read" | "org.manage"
  | "member.invite" | "member.manage"
  | "billing.read" | "billing.manage"
  | "api_key.manage" | "audit.read"
  | "report.export" | "domain.manage";

function can(ctx: TenantContext, action: Action, resource?: ResourceRef): boolean;
```

Rules:

- Permissions are strings; roles map to permission sets. Start with fixed roles: `owner`, `admin`, `member`, `billing`, `viewer`.
- `owner` is special: at least one owner per organization; the last owner cannot be removed or demoted.
- Deny by default. The UI may hide actions, but the API must enforce them.
- Project-defined permissions are registered through a seam; they are not free-form strings in the database.
- Tests: role matrix, escalation, last-owner, cross-org, API-key scope.

### 4.6 Audit hook

A single `audit.record()` call in the same transaction as the mutation. It accepts actor, org, action, target, before/after (redacted), request ID, IP and user agent. The audit template owns the table, retention, export and read API. Domain code only declares actions and calls the hook.

### 4.7 Errors, pagination and rate limits

- Error body: `{ error: string, message: string, details?: unknown, requestId: string }`.
- Status codes: 400 schema/validation, 401 unauthenticated, 403 forbidden, 404 not found (including cross-tenant), 409 conflict/idempotency, 422 business rule, 429 rate limit, 5xx server.
- Cursor pagination: `?limit=25&cursor=...`; max 100; stable sort by `(created_at, id)`.
- Rate limits: per IP for unauthenticated, per user for session, per key for API keys, per org for expensive operations. Return `429` with `Retry-After`.
- No stack traces, SQL, provider payloads or secrets in responses.
- Log with `requestId`; never log passwords, tokens, cookies, full card data or raw webhook secrets.

### 4.8 Observability and operations

- `/health` liveness and `/ready` readiness are already in `http-service`; extend readiness to provider dependencies only when a provider outage should degrade readiness.
- Structured logs with `requestId`, `orgId`, `userId` (hashed or omitted where required), `route`, `status`, `durationMs`.
- Metrics: request count/latency, error rate, queue depth, outbox lag, webhook failure rate, billing reconciliation failures, export failures.
- Traces: propagate `traceparent`; do not put PII in span attributes.
- Status page and incident runbook are starter content, not runtime code.
- Backups and restore are documented and tested in the starter; a template cannot prove disaster recovery by itself.

### 4.9 Config and secrets

- Manifest config is finite and validated with Zod.
- Secrets come from environment variables or a provider secret store; never in the design, generated files, logs or client bundle.
- Provider keys are per environment; test packs use fake providers.
- A generated project must fail fast with a readable error if a required secret is missing.

### 4.10 Data lifecycle

- Soft delete for user-visible records (`deleted_at`), hard delete for tokens and sessions.
- Retention policies per table: sessions 30 days after expiry, idempotency keys 7 days, audit 365 days (configurable), exports 7 days, webhook deliveries 30 days.
- Data export and deletion endpoints are part of the compliance starter; they must be audited.
- Never cascade-delete audit rows. Anonymize the actor if required.

### 4.11 Accessibility and UX states

Every screen group in a starter must define:

- Loading, empty, error, disabled, success and permission-denied states.
- Mouse-only operation; no keyboard-only action.
- Labels for every input; inline errors; focus management on submit.
- Confirmation for destructive actions; typed name for organization deletion and data export.
- No colour-only status; text or icon alongside colour.
- `aria-live` for async results; `aria-busy` for pending actions.

### 4.12 Provider adapters and fakes

Every external provider gets an interface and two implementations:

- **Real adapter** (Stripe, Postmark, S3, Cloudflare, scanner).
- **Fake adapter** for tests: deterministic IDs, in-memory state, signed test webhooks, configurable failures.

Test packs use the fake adapter and never require network access. Fixtures live under the template’s `test-pack/fixtures/` and include signed webhook bodies with fixed timestamps and keys, email delivery events, DNS records and scanner verdicts. Conformance tests may use the real adapter in a sandbox only when explicitly marked.

---

## 5. Capability specifications

Each section uses the same shape: table-stakes bar, Jeeves mapping, data model, API, UI, invariants, background work, acceptance, template boundary, dependencies.

### 5.1 Accounts and sessions

**Table-stakes bar.** A person can register, verify email, sign in, sign out, reset a password, see and revoke sessions, and enable MFA. Sessions are secure by default. The API never leaks whether an email exists.

**Jeeves mapping.** C3 Accounts & access. The current `rest-api-server` `auth: "session"` already generates accounts, opaque sessions, cookies and CSRF. Harden it into a documented `accounts` module (or a new `rest-api-server` version) with email verification, password reset, MFA and session management. Keep it composed by `saas-api`; do not create a separate identity service for a small SaaS.

**Data model.**

| Table | Key columns | Constraints / indexes |
| --- | --- | --- |
| `users` | `id uuid`, `email citext`, `email_verified_at`, `password_hash`, `name`, `status`, `created_at`, `updated_at`, `last_login_at` | unique `email` (citext); status in `active`, `disabled` |
| `sessions` | `id uuid`, `user_id`, `token_hash`, `csrf_hash`, `created_at`, `last_seen_at`, `expires_at`, `revoked_at`, `ip`, `user_agent`, `mfa_level` | index `(user_id, expires_at)`; token hash unique |
| `email_tokens` | `id`, `user_id`, `purpose` (`verify_email`, `reset_password`), `token_hash`, `expires_at`, `consumed_at` | index `(user_id, purpose)`; single-use |
| `mfa_methods` | `id`, `user_id`, `type` (`totp`, `webauthn`), `secret_encrypted`, `confirmed_at`, `last_used_at` | unique `(user_id, type)` for TOTP |
| `login_attempts` | `id`, `email_hash`, `ip`, `attempted_at`, `success` | index `(email_hash, attempted_at)`; prune |

**API.** `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/session`, `POST /auth/verify-email`, `POST /auth/resend-verification`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/mfa/enroll`, `POST /auth/mfa/verify`, `GET /auth/sessions`, `DELETE /auth/sessions/{id}`, `DELETE /auth/sessions` (revoke all), `PATCH /auth/password`.

**UI.** Sign up, sign in, verify email, forgot/reset password, MFA challenge, MFA enrollment, session list, security settings. Every form has loading, error and success states. Do not reveal whether an email is registered on login or reset.

**Invariants.**

- Passwords hashed with Argon2id (or the runtime’s reviewed default); never SHA/MD5.
- Session tokens stored hashed; cookie `HttpOnly`, `Secure` in production, `SameSite=Lax`, `__Host-` prefix.
- CSRF token required for cookie-authenticated mutations; Origin check.
- Rotate session on login and privilege change; revoke all on password reset.
- Email change requires the current password, verification of the new address, and a notice to the old address.
- Email verification required before invitations, API-key creation and other sensitive actions; billing may allow checkout but should verify before activation.
- Rate limit login, register, reset and MFA by IP and email hash.
- MFA step-up (when MFA is enabled) required for billing changes, API-key creation and admin actions.
- No user enumeration in register, login or reset responses.

**Background work.** Verification and reset emails go through the notifications outbox. Cleanup job deletes expired sessions and tokens.

**Acceptance.** `SAAS-AUTH-01` register/verify/login/logout; `SAAS-AUTH-02` duplicate email and no enumeration; `SAAS-AUTH-03` reset token single-use and expiry; `SAAS-AUTH-04` session revoke and rotation; `SAAS-AUTH-05` CSRF rejection; `SAAS-AUTH-06` MFA enroll/challenge/recovery; `SAAS-AUTH-07` rate limit; `SAAS-AUTH-08` disabled user cannot authenticate.

**Template boundary.** Runtime owns hashing, cookies, CSRF, session state and rate limits. Generated-owned: tables, migrations, auth routes, contracts. Project-owned: email copy, branding, optional SSO adapter.

**Dependencies.** `http-service`, `postgres`, `notifications` (email), `audit` (security events).

---

### 5.2 Organizations and members

**Table-stakes bar.** A customer can create an organization, invite people by email, accept or decline, see members, change roles, transfer ownership, and delete the organization with a typed confirmation. Cross-tenant access is impossible. The last owner cannot be removed.

**Jeeves mapping.** C3 Organizations & members. Implement as an `organizations` module composed by `saas-api`, plus a shared `@jeeves/saas-orgs` runtime for membership checks and invitation tokens. The UI is a screen group in the customer web app, not a separate template.

**Data model.**

| Table | Key columns | Constraints / indexes |
| --- | --- | --- |
| `organizations` | `id`, `name`, `slug`, `status`, `created_by`, `created_at`, `updated_at`, `deleted_at` | unique `slug`; status `active`, `suspended`, `deleted` |
| `memberships` | `id`, `org_id`, `user_id`, `role`, `status`, `invited_by`, `invited_at`, `accepted_at` | unique `(org_id, user_id)`; role in fixed set |
| `invitations` | `id`, `org_id`, `email citext`, `role`, `token_hash`, `expires_at`, `accepted_at`, `revoked_at`, `invited_by` | partial unique `(org_id, email)` where `accepted_at is null and revoked_at is null` |
| `org_settings` | `org_id`, `billing_email`, `timezone`, `locale`, `created_at`, `updated_at` | one row per org |

**API.** `POST /orgs`, `GET /orgs`, `GET /orgs/{orgId}`, `PATCH /orgs/{orgId}`, `DELETE /orgs/{orgId}`, `GET /orgs/{orgId}/members`, `PATCH /orgs/{orgId}/members/{userId}`, `DELETE /orgs/{orgId}/members/{userId}`, `POST /orgs/{orgId}/invitations`, `GET /orgs/{orgId}/invitations`, `DELETE /orgs/{orgId}/invitations/{id}`, `POST /invitations/{token}/accept`, `POST /orgs/{orgId}/transfer-ownership`.

**UI.** Organization switcher in the shell; members table with role and status; invite dialog; pending invitations; role change; remove member; transfer ownership; danger zone. Empty state explains how to invite the first teammate.

**Invariants.**

- At least one `owner` per organization. Last owner cannot be removed, demoted or deleted.
- Only `owner`/`admin` can invite or manage members; only `owner` can transfer ownership or delete the org.
- Invitation token is random, stored hashed, single-use, expires in 7 days. Resending revokes the old token.
- Accepting an invitation requires the signed-in email to match the invited email (or an explicit verified-email flow).
- Membership checks are server-side for every org route. A cross-org ID returns 404.
- Organization deletion is soft, requires typed name, audits the actor, and schedules a retention job.
- Role changes cannot escalate beyond the actor’s role.

**Background work.** Invitation email through notifications; expired invitation cleanup; organization deletion retention job.

**Acceptance.** `SAAS-ORG-01` create/list/read; `SAAS-ORG-02` invite/accept; `SAAS-ORG-03` duplicate/expired/revoked invite; `SAAS-ORG-04` email mismatch; `SAAS-ORG-05` role change; `SAAS-ORG-06` last owner protection; `SAAS-ORG-07` cross-org 404; `SAAS-ORG-08` transfer ownership; `SAAS-ORG-09` soft delete + retention; `SAAS-ORG-10` audit rows for all privileged actions.

**Template boundary.** Generated-owned: tables, migrations, org/member/invitation routes, contracts. Runtime: membership checks, token handling, role rules. Project-owned: organization profile fields, invitation email copy, custom roles (later).

**Dependencies.** Accounts, authz, notifications, audit.

---

### 5.3 Roles and permissions

**Table-stakes bar.** The product has a small, fixed role model that customers can understand, and every protected action is enforced server-side. Custom roles are later.

**Jeeves mapping.** C3 Accounts & access (authorization). Ship `@jeeves/authz` as a runtime library plus generated `roles`/`role_permissions` tables in the organizations module. Do not create a separate service.

**Data model.**

| Table | Key columns | Constraints |
| --- | --- | --- |
| `roles` | `id`, `org_id` (nullable for system roles), `key`, `name`, `is_system` | unique `(org_id, key)`; separate partial unique on `key` where `org_id is null`; system roles seeded |
| `role_permissions` | `role_id`, `permission_key` | primary key `(role_id, permission_key)` |
| `memberships.role` | text | must reference a role key |

**Permission set (initial).** `org.read`, `org.manage`, `member.invite`, `member.manage`, `billing.read`, `billing.manage`, `api_key.manage`, `audit.read`, `report.export`, `domain.manage`, `project.read`, `project.write`, `project.manage`. Domain permissions are registered by the project.

**Roles (initial).** `owner` (all), `admin` (all except ownership transfer/org deletion), `member` (project read/write), `billing` (billing read/manage, org read), `viewer` (read-only).

**API.** `GET /orgs/{orgId}/roles`, `GET /orgs/{orgId}/roles/{roleKey}`, `PATCH /orgs/{orgId}/members/{userId}` (role), `GET /auth/permissions` (current principal). Custom role CRUD is later.

**UI.** Role badge in the members table; role picker; permission matrix read-only in settings; disabled states for actions the user cannot perform.

**Invariants.** Deny by default; permissions checked on the server; UI hiding is not authorization; no role escalation; last owner rule; API keys carry scopes, not roles; tests cover the full matrix.

**Acceptance.** `SAAS-RBAC-01` owner/admin/member/billing/viewer matrix; `SAAS-RBAC-02` escalation denied; `SAAS-RBAC-03` cross-org denied; `SAAS-RBAC-04` API-key scope; `SAAS-RBAC-05` last owner.

**Template boundary.** Runtime owns `can()` and role evaluation. Generated tables/contracts. Project registers domain permissions. Custom roles are a future package.

**Dependencies.** Organizations.

---

### 5.4 Billing and plans

**Table-stakes bar.** A customer can see plans, start a trial or checkout, pay, see invoices, change plan, cancel/resume, and recover from a failed payment. The product knows what they are entitled to even if the provider is temporarily unavailable. No card data touches the app.

**Jeeves mapping.** C3 Billing & plans. Implement a `billing` module composed by `saas-api` plus a `stripe-adapter` runtime package. The adapter is in-process by default; webhook processing and reconciliation run as worker jobs. Use provider-hosted checkout and portal; do not build a card form.

**Data model.**

| Table | Key columns | Constraints / indexes |
| --- | --- | --- |
| `plans` | `id`, `key`, `name`, `description`, `status`, `trial_days`, `created_at` | unique `key`; status `active`, `archived` |
| `prices` | `id`, `plan_id`, `provider_price_id`, `currency`, `unit_amount_minor`, `interval`, `usage_type`, `active` | unique `(provider_price_id)`; interval `month`, `year` |
| `billing_customers` | `org_id`, `provider`, `provider_customer_id` | unique `(org_id, provider)` |
| `subscriptions` | `id`, `org_id`, `plan_id`, `provider`, `provider_subscription_id`, `status`, `current_period_start`, `current_period_end`, `trial_end`, `cancel_at_period_end`, `created_at`, `updated_at` | unique `(provider, provider_subscription_id)`; partial unique `(org_id)` where status in (`trialing`,`active`,`past_due`) |
| `subscription_items` | `id`, `subscription_id`, `price_id`, `quantity`, `provider_item_id` | |
| `billing_events` | `id`, `provider`, `provider_event_id`, `type`, `payload`, `received_at`, `processed_at`, `status`, `error` | unique `(provider, provider_event_id)` |
| `invoices` | `id`, `org_id`, `provider_invoice_id`, `status`, `amount_due_minor`, `amount_paid_minor`, `currency`, `period_start`, `period_end`, `hosted_invoice_url`, `paid_at` | unique `(provider_invoice_id)` |
| `payment_methods` | `id`, `org_id`, `provider_payment_method_id`, `brand`, `last4`, `exp_month`, `exp_year`, `is_default` | never store PAN/CVC |
| `billing_adjustments` | `id`, `org_id`, `provider_refund_id`, `amount_minor`, `reason`, `created_by`, `created_at` | audit every row |

**API.** `GET /billing/plans`, `GET /billing/subscription`, `POST /billing/checkout`, `POST /billing/portal`, `POST /billing/webhook` (provider, signature-verified, raw body), `GET /billing/invoices`, `POST /billing/cancel`, `POST /billing/resume`, `POST /billing/change-plan`, `GET /billing/payment-method`.

**UI.** Pricing/plan picker, trial banner, checkout redirect, billing portal, invoice list/detail, payment method, cancel/resume, change plan, past-due banner with a fix link, cancellation reason, success/cancel return states.

**State machine.** Illustratively: `incomplete` → `trialing` → `active` → `past_due` → `canceled`/`unpaid` → `active` (on payment recovery). `cancel_at_period_end` is a flag, not a state. Define the exact allowed transitions and reject the rest; not every arrow is valid in both directions.

**Invariants.**

- Provider is the source of truth for money and invoices; local subscription/entitlement state is a reconciled cache.
- Never trust a client-supplied price, plan or amount. Resolve from `prices` by provider price ID.
- Checkout and portal sessions are created server-side with the org’s provider customer.
- Webhook: verify signature, use raw body, store event before processing, deduplicate by provider event ID, acknowledge fast, process async.
- Out-of-order webhooks: after any subscription event, fetch the current provider subscription and reconcile; do not apply event payloads blindly.
- Duplicate payment event: one subscription, one invoice, one entitlement change.
- One active subscription per org; plan changes use provider proration.
- Cancellation at period end keeps entitlements until `current_period_end`; immediate cancellation revokes at the effective time.
- Past due: grace period configurable (default 7 days), then downgrade to free/limited. Never delete data on downgrade.
- Refunds/credits are admin-only, audited, and recorded as adjustments; they do not silently rewrite invoices.
- Tax is provider-calculated; do not invent tax.
- No card data; PCI scope stays with the provider.

**Canonical billing events.** The adapter maps provider payloads to a small internal set: `subscription.created`, `subscription.updated`, `subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `checkout.completed`. Domain code and entitlements react to the canonical events, not provider-specific types.

**Background work.** Webhook processing, reconciliation (daily), dunning emails, trial-ending reminders, invoice sync, entitlement sync, cleanup of stale checkout sessions.

**Acceptance.** `SAAS-BILL-01` plans/prices; `SAAS-BILL-02` checkout success; `SAAS-BILL-03` checkout cancel; `SAAS-BILL-04` webhook signature; `SAAS-BILL-05` duplicate webhook; `SAAS-BILL-06` out-of-order webhook; `SAAS-BILL-07` trial → active; `SAAS-BILL-08` past_due → grace → downgrade; `SAAS-BILL-09` cancel at period end; `SAAS-BILL-10` resume; `SAAS-BILL-11` plan change/proration; `SAAS-BILL-12` invoice list; `SAAS-BILL-13` no client price trust; `SAAS-BILL-14` one active subscription; `SAAS-BILL-15` reconciliation fixes drift; `SAAS-BILL-16` audit admin adjustments.

**Template boundary.** Generated-owned: tables, migrations, contracts, webhook route. Runtime: state machine, provider interface, idempotency, reconciliation. Adapter: Stripe mapping. Project-owned: plan keys, plan names, prices, entitlement meanings, cancellation reasons, email copy.

**Dependencies.** Organizations, outbox/worker, notifications, audit.

---

### 5.5 Entitlements and quotas

**Table-stakes bar.** The product enforces the plan the customer paid for, on the server, including direct API calls. Limits are visible before the customer hits them, and downgrades are graceful.

**Jeeves mapping.** C3 Billing & plans. Implement `@jeeves/entitlements` as a runtime library plus an `entitlements` module composed by `saas-api` that installs generated `entitlements`, `plan_entitlements`, `usage_counters` and `usage_events` tables alongside billing. This is not a separate service.

**Data model.**

| Table | Key columns | Constraints |
| --- | --- | --- |
| `plan_entitlements` | `plan_id`, `key`, `value_type`, `value` | unique `(plan_id, key)`; value_type `boolean`, `integer`, `string` |
| `entitlements` | `org_id`, `key`, `value_type`, `value`, `source`, `expires_at`, `updated_at` | unique `(org_id, key)`; source `plan`, `override`, `trial` |
| `usage_counters` | `org_id`, `key`, `period_start`, `period_end`, `used`, `limit`, `updated_at` | unique `(org_id, key, period_start)` |
| `usage_events` | `id`, `org_id`, `key`, `quantity`, `occurred_at`, `idempotency_key`, `metadata` | unique `(org_id, idempotency_key)` |

**API.** `GET /entitlements`, `GET /usage`, `POST /usage` (service/internal key, idempotent), `POST /orgs/{orgId}/entitlements/override` (admin, audited), `GET /orgs/{orgId}/usage` (admin).

**UI.** Plan/usage card in settings; progress bars with “X of Y”; upgrade prompt at 80% and 100%; overage warning; downgrade preview (“you will lose X”); grace state.

**Invariants.**

- Entitlement resolution order: explicit override → trial → plan → default.
- Every gated action checks the server-side entitlement; UI gating is a convenience.
- Usage events are idempotent; counters are derived/updated transactionally; resets use UTC period boundaries.
- Hard limits reject with `403` or `409` and a stable `LIMIT_EXCEEDED` code; soft limits warn but allow.
- Downgrade never deletes data; it restricts new use and marks excess as read-only.
- Entitlement cache invalidates on subscription change; the database is authoritative for the app.
- Admin overrides require a reason and an expiry date; they are audited.

**Background work.** Usage aggregation, period reset, trial expiry, entitlement reconciliation after billing events, overage notifications.

**Acceptance.** `SAAS-ENT-01` plan entitlement resolution; `SAAS-ENT-02` override precedence; `SAAS-ENT-03` hard limit; `SAAS-ENT-04` soft limit; `SAAS-ENT-05` idempotent usage; `SAAS-ENT-06` period reset; `SAAS-ENT-07` downgrade read-only; `SAAS-ENT-08` trial expiry; `SAAS-ENT-09` admin override audit; `SAAS-ENT-10` cache invalidation.

**Template boundary.** Runtime owns resolution/check APIs. Generated tables/contracts. Project defines entitlement keys and semantics. Billing owns plan→entitlement mapping.

**Dependencies.** Billing, organizations, audit.

---

### 5.6 Audit log

**Table-stakes bar.** Privileged actions are attributable, searchable, exportable and tamper-resistant. An admin can answer “who changed this, when and from where?” without database access.

**Jeeves mapping.** C3 Audit log. Implement an `audit` module composed by `saas-api` with an append-only table, a read API and an export job. Domain code calls `audit.record()`; the module owns storage and access.

**Data model.**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | |
| `org_id` | uuid | Tenant scope; nullable only for system/staff events |
| `actor_type` | text | `user`, `system`, `api_key`, `staff` |
| `actor_id` | uuid/text | |
| `action` | text | `member.role_changed`, `billing.plan_changed` |
| `target_type` | text | `member`, `subscription`, `api_key` |
| `target_id` | text | |
| `before` | jsonb | Redacted snapshot |
| `after` | jsonb | Redacted snapshot |
| `metadata` | jsonb | Request ID, reason, source |
| `ip` | inet | Optional; truncate/anonymize per policy |
| `user_agent` | text | |
| `created_at` | timestamptz | |

Indexes: `(org_id, created_at desc)`, `(org_id, target_type, target_id)`, `(actor_id, created_at desc)`. No update/delete API. Retention job deletes old rows only if policy allows; never cascade from user/org deletion — anonymize instead.

**API.** `GET /audit-events?action=&actor=&target=&from=&to=&cursor=`, `GET /audit-events/{id}`, `POST /audit-events/export` (async), `GET /audit-events/export/{jobId}`. No create route; internal only.

**UI.** Audit table with filters, detail drawer with before/after diff, export button, retention notice, access-denied state.

**Invariants.** Append-only; actor attribution; org isolation; redact secrets/PII; audit the audit export; admin actions always audited; no audit row for read-only views unless policy requires; immutable timestamps.

**Background work.** Retention/pruning, export generation, anomaly alerts (optional).

**Acceptance.** `SAAS-AUDIT-01` append-only; `SAAS-AUDIT-02` actor/org/target filters; `SAAS-AUDIT-03` cross-org 404; `SAAS-AUDIT-04` redaction; `SAAS-AUDIT-05` export access/expiry; `SAAS-AUDIT-06` retention; `SAAS-AUDIT-07` privileged actions emit rows; `SAAS-AUDIT-08` no update/delete route.

**Template boundary.** Runtime hook + table + read API. Project registers actions and redaction rules. Staff access is a separate permission.

**Dependencies.** Accounts, organizations, reports (export), worker.

---

### 5.7 Notifications

**Table-stakes bar.** Transactional email arrives reliably; the customer can control non-essential categories; every send is retried and observable; unsubscribes are honoured.

**Jeeves mapping.** C3 Notifications. Implement a `notifications` module composed by `saas-api` (preferences, templates, outbox) plus an `email-adapter` runtime package. Start with email; add push/SMS later as additional adapters.

**Data model.**

| Table | Key columns | Constraints |
| --- | --- | --- |
| `notification_templates` | `key`, `channel`, `locale`, `subject`, `body`, `version`, `active` | unique `(key, channel, locale, version)` |
| `notification_preferences` | `user_id`/`org_id`, `category`, `channel`, `enabled` | check exactly one of user/org; partial unique `(user_id, category, channel)` and `(org_id, category, channel)` |
| `notifications` | `id`, `org_id`, `user_id`, `category`, `channel`, `template_key`, `payload`, `status`, `provider_message_id`, `attempts`, `next_attempt_at`, `sent_at`, `error` | index `(status, next_attempt_at)` |
| `unsubscribe_tokens` | `token_hash`, `user_id`, `category`, `expires_at`, `used_at` | single-use |

**API.** `GET /notification-preferences`, `PATCH /notification-preferences`, `GET /notifications` (in-app, optional), `POST /notifications/test` (admin), `POST /webhooks/email` (delivery events, signature-verified), `GET /unsubscribe/{token}`, `POST /unsubscribe/{token}`.

**UI.** Preferences matrix (category × channel), unsubscribe page, in-app inbox (optional), admin test send, delivery status in admin.

**Invariants.** Transactional categories (security, billing, invitations) cannot be disabled; marketing categories require opt-in and unsubscribe; templates are versioned; sends are idempotent by outbox key; retries with backoff; suppress if preference off; no PII in logs; provider webhook updates delivery status.

**Background work.** Outbox relay, retries, bounce/complaint handling, digest jobs, cleanup.

**Acceptance.** `SAAS-NOTIF-01` send via outbox; `SAAS-NOTIF-02` preference suppression; `SAAS-NOTIF-03` transactional override; `SAAS-NOTIF-04` retry/backoff; `SAAS-NOTIF-05` idempotency; `SAAS-NOTIF-06` unsubscribe; `SAAS-NOTIF-07` bounce/complaint; `SAAS-NOTIF-08` template version; `SAAS-NOTIF-09` no PII in logs.

**Template boundary.** Runtime/outbox/templates/preferences. Adapter: Postmark/SES/SMTP. Project owns copy and category definitions.

**Dependencies.** Outbox/worker, accounts, organizations, audit.

---

### 5.8 Developer API and webhooks

**Table-stakes bar.** A developer can create a key, call the API with scopes, rotate/revoke it, subscribe to events, verify signatures, see delivery attempts and retry failures.

**Jeeves mapping.** C3 Developer API & webhooks. Implement a `developer-access` module composed by `saas-api` for keys/scopes/rate limits and a worker job for outbound webhook delivery. Public API versioning is part of the contract.

**Data model.**

| Table | Key columns | Constraints |
| --- | --- | --- |
| `api_keys` | `id`, `org_id`, `name`, `key_prefix`, `key_hash`, `scopes`, `created_by`, `created_at`, `last_used_at`, `expires_at`, `revoked_at` | unique `key_prefix`; key shown once |
| `api_key_requests` | `id`, `api_key_id`, `route`, `status`, `duration_ms`, `created_at` | optional; prune |
| `webhook_endpoints` | `id`, `org_id`, `url`, `secret_encrypted`, `events`, `status`, `created_at`, `disabled_at` | URL must be https in production |
| `webhook_deliveries` | `id`, `endpoint_id`, `event_id`, `event_type`, `payload`, `status`, `attempts`, `response_status`, `response_snippet`, `next_attempt_at`, `delivered_at` | unique `(endpoint_id, event_id)` |

**API.** `GET/POST /api-keys`, `DELETE /api-keys/{id}`, `POST /api-keys/{id}/rotate`; `GET/POST/PATCH/DELETE /webhook-endpoints`, `GET /webhook-endpoints/{id}/deliveries`, `POST /webhook-deliveries/{id}/retry`; public API uses `Authorization: Bearer <key>` and scopes. Mutating public endpoints accept `Idempotency-Key` with 24-hour retention.

**UI.** API keys table with prefix, scopes, last used, revoke/rotate; webhook endpoints with event picker; delivery log with status, response snippet, retry; event catalog/docs; “show once” secret modal.

**Invariants.** Key hashed at rest; prefix for lookup; scopes enforced; rate limit per key; rotation issues a replacement key with an overlap window, then revokes the old one; webhook secret shown once; HMAC signature includes timestamp and raw body; timestamp tolerance 5 minutes; retries with exponential backoff; SSRF protection (public HTTPS, no private IPs, DNS re-resolution); delivery logs redact secrets; event IDs idempotent. Public API versioning lives in the path (`/v1`); breaking changes require a new version, additive changes stay within the current one, and deprecations use `Deprecation`/`Sunset` headers with at least six months’ notice.

**Background work.** Webhook delivery, retries, dead-letter view, key usage aggregation, cleanup.

**Acceptance.** `SAAS-DEV-01` key create/show-once; `SAAS-DEV-02` scopes; `SAAS-DEV-03` rotate/revoke; `SAAS-DEV-04` rate limit; `SAAS-DEV-05` webhook signature; `SAAS-DEV-06` retry/backoff; `SAAS-DEV-07` duplicate event; `SAAS-DEV-08` SSRF block; `SAAS-DEV-09` delivery log; `SAAS-DEV-10` event catalog.

**Template boundary.** Generated tables/contracts; runtime key hashing/scopes/rate limits; adapter for webhook HTTP; project defines events and payloads.

**Dependencies.** Organizations, outbox/worker, audit, billing (if API access is a paid entitlement).

---

### 5.9 Reports and exports

**Table-stakes bar.** A customer can export their data in a common format, see progress, download a short-lived file, and know when it expires. Large exports do not block the API.

**Jeeves mapping.** C3 Reports & exports. Implement a `reports` module composed by `saas-api` for job creation/metadata and a worker for generation; use object storage (or local volume in development) for files. Fixed report definitions are project-owned; the module owns the job/retention/access envelope.

**Data model.**

| Table | Key columns | Constraints |
| --- | --- | --- |
| `export_jobs` | `id`, `org_id`, `requested_by`, `type`, `format`, `filters`, `status`, `progress`, `file_key`, `file_size`, `expires_at`, `error`, `created_at`, `completed_at` | index `(org_id, created_at)`; status `queued/running/succeeded/failed/expired` |
| `export_files` | `id`, `job_id`, `storage_key`, `content_type`, `size`, `sha256`, `expires_at` | one per job |

**API.** `POST /exports`, `GET /exports`, `GET /exports/{id}`, `GET /exports/{id}/download`, `DELETE /exports/{id}`. Download uses a short-lived signed URL or a stream with the same authorization check.

**UI.** Export button/menu, format picker, filter summary, job list with progress, download, expiry notice, retry, empty/error states.

**Invariants.** Async for large data; authorization on create/read/download; signed URL expiry ≤ 15 minutes; retention 7 days default; CSV injection escaped; PII minimized; no cross-tenant file keys; idempotency key for repeated create; audit export creation/download.

**Background work.** Job runner, progress updates, file cleanup, expired job marking, optional email when ready.

**Acceptance.** `SAAS-REPORT-01` create/list; `SAAS-REPORT-02` async progress; `SAAS-REPORT-03` download authorization; `SAAS-REPORT-04` expiry; `SAAS-REPORT-05` CSV escaping; `SAAS-REPORT-06` cross-tenant; `SAAS-REPORT-07` audit; `SAAS-REPORT-08` cleanup.

**Template boundary.** Runtime job envelope/access/retention; project owns report queries and columns. Storage adapter can be local or S3-compatible.

**Dependencies.** Worker, object storage, audit, organizations.

---

### 5.10 Admin and staff console

**Table-stakes bar.** Support staff can find an account/org, see subscription and entitlement state, make a bounded adjustment, and investigate an audit trail — without direct database access. Every action is audited and, where relevant, requires a reason.

**Jeeves mapping.** C3 Screen group / feature area. This is a **starter**, not a runtime template: an admin web app or admin area with screen groups. It composes the APIs from organizations, billing, entitlements, audit, abuse and developer access.

**Screens.** Global search (user/org/subscription), account detail, organization detail, subscription detail, entitlement overrides, invoice/refund view, API key view (metadata only), audit search, abuse queue, job/outbox retry, feature flags (optional), impersonation with consent and audit.

**API.** Prefer existing admin-scoped endpoints: `GET /admin/search`, `GET /admin/orgs/{id}`, `POST /admin/orgs/{id}/entitlements/override`, `POST /admin/subscriptions/{id}/refund`, `POST /admin/impersonate`, `GET /admin/audit`, `POST /admin/jobs/{id}/retry`.

**Invariants.** Separate staff role/SSO; step-up MFA; least privilege; every action audited with reason; no raw database console; no secret values after creation; impersonation requires a reason and explicit consent where possible; read-only by default; destructive actions require typed confirmation.

**Acceptance.** `SAAS-ADMIN-01` search; `SAAS-ADMIN-02` org/subscription view; `SAAS-ADMIN-03` override with reason; `SAAS-ADMIN-04` refund audit; `SAAS-ADMIN-05` impersonation audit; `SAAS-ADMIN-06` permission denied; `SAAS-ADMIN-07` no secret exposure.

**Template boundary.** Starter owns screens/flows; APIs are owned by the underlying `saas-api` modules. Project adds domain-specific support views.

**Dependencies.** All table-stakes modules.

---

### 5.11 Abuse and trust/safety (link/QR-specific)

**Table-stakes bar.** A public link/QR product must prevent its domain from becoming a phishing/malware distribution network. One abusive customer can get the shared domain blocklisted and break every customer’s printed codes.

**Jeeves mapping.** C3 Moderation / domain module. Implement an `abuse` module composed by `saas-api` plus a `scanner-adapter` runtime package; scan and re-scan work runs as worker jobs. This is conditional for non-link SaaS, mandatory for QR/link products.

**Data model.**

| Table | Key columns | Constraints |
| --- | --- | --- |
| `scan_verdicts` | `id`, `org_id`, `destination_url`, `verdict`, `provider`, `score`, `categories`, `checked_at`, `expires_at` | index `(destination_url, checked_at)` |
| `blocked_destinations` | `id`, `host`, `url_pattern`, `reason`, `created_by`, `created_at`, `expires_at` | unique pattern |
| `abuse_reports` | `id`, `org_id` (nullable until resolved), `reporter_email`, `target_url`, `reason`, `status`, `created_at`, `resolved_at`, `resolution` | status `open/triage/actioned/dismissed` |
| `appeals` | `id`, `org_id`, `blocked_destination_id`, `message`, `status`, `created_at`, `resolved_at` | |
| `domain_reputation` | `domain`, `status`, `score`, `last_checked_at`, `notes` | |

**API.** `POST /abuse/reports` (public, rate-limited), `GET /abuse/reports` (admin), `POST /abuse/reports/{id}/resolve`, `POST /abuse/appeals`, `GET /abuse/appeals` (admin), `POST /abuse/scan` (internal), `GET /abuse/verdicts/{id}`.

**UI.** Public report form; admin queue; destination detail; block/unblock; appeal review; customer “link paused” state with appeal link.

**Invariants.** Scan at creation and periodically; block on malware/phishing verdict; quarantine rather than delete; notify the customer; appeal path; audit every admin action; don’t leak reporter identity; rate-limit reports; safe browsing provider is an adapter; shared-domain blocklist separate from customer-owned domains.

**Background work.** Scan queue, periodic re-scan, domain reputation refresh, appeal SLA reminders.

**Acceptance.** `SAAS-ABUSE-01` report; `SAAS-ABUSE-02` scan block; `SAAS-ABUSE-03` quarantine + appeal; `SAAS-ABUSE-04` admin resolve; `SAAS-ABUSE-05` audit; `SAAS-ABUSE-06` rate limit; `SAAS-ABUSE-07` false-positive path; `SAAS-ABUSE-08` reporter privacy.

**Template boundary.** Runtime state machine/queue; adapter for scanner; project defines link/QR states and customer messaging.

**Dependencies.** Links/QR domain, worker, notifications, audit.

---

### 5.12 Custom domains and TLS (link/QR-specific)

**Table-stakes bar.** A customer can point their own domain at the product, prove ownership, get a certificate automatically, see the DNS records, and recover from a failed verification. The product does not let one customer take over another’s domain.

**Jeeves mapping.** C3 Domain module + C2 edge. Implement a `custom-domains` module composed by `saas-api` plus a C2 edge/ingress boundary (or Caddy/Traefik locally) and an `edge-adapter` runtime package. This is conditional for generic SaaS, mandatory for a serious QR/link product.

**Data model.**

| Table | Key columns | Constraints |
| --- | --- | --- |
| `domains` | `id`, `org_id`, `hostname`, `status`, `verification_token`, `verified_at`, `tls_status`, `tls_expires_at`, `created_at`, `updated_at` | unique `hostname`; status `pending/verified/failed/disabled` |
| `domain_checks` | `id`, `domain_id`, `type` (`dns_txt`, `cname`, `http`), `observed`, `passed`, `checked_at`, `error` | history |
| `domain_events` | `id`, `domain_id`, `type`, `payload`, `created_at` | audit/ops |

**API.** `POST /domains`, `GET /domains`, `GET /domains/{id}`, `POST /domains/{id}/verify`, `DELETE /domains/{id}`, `GET /domains/{id}/dns-records`, `POST /domains/{id}/retry-tls`.

**UI.** Add domain, DNS record table with copy buttons, verification status/polling, TLS status, error guidance, remove domain with confirmation.

**Invariants.** Hostname normalized; ownership token is random and single-use; verify DNS TXT/CNAME; prevent domain takeover (re-verify on ownership change); rate-limit issuance; certificate private key never leaves the edge; HTTP→HTTPS redirect; HSTS after verification; custom domain routing is isolated per org; disabled domain returns a clear 404/503, not another tenant’s content.

**Background work.** DNS verification retries, certificate issuance/renewal, expiry alerts, drift checks.

**Acceptance.** `SAAS-DOMAIN-01` add/list; `SAAS-DOMAIN-02` TXT verify; `SAAS-DOMAIN-03` wrong token; `SAAS-DOMAIN-04` duplicate hostname; `SAAS-DOMAIN-05` TLS issuance; `SAAS-DOMAIN-06` renewal; `SAAS-DOMAIN-07` cross-org 404; `SAAS-DOMAIN-08` disable/re-enable; `SAAS-DOMAIN-09` no takeover.

**Template boundary.** Runtime state machine/DNS/TLS adapter; project owns DNS copy and routing semantics. Local development uses a fake/local DNS + self-signed or Caddy internal CA; production uses the edge adapter.

**Dependencies.** Organizations, worker, audit, edge.

---

### 5.13 Onboarding and settings

**Table-stakes bar.** A new customer can go from signup to first value without a support ticket, and can find every account/security/billing setting later.

**Jeeves mapping.** C3 Screen group / feature area. This is a **starter** that composes accounts, organizations, billing, entitlements and notifications. It is not a runtime template.

**Screens.** Signup → verify email → create/join org → invite team (optional) → choose plan/trial → connect domain/first resource (product-specific) → checklist. Settings: profile, security (password/MFA/sessions), organization, members, billing, usage, notifications, API keys, audit, danger zone.

**Invariants.** Resume after email verification; skip optional steps; clear progress; no dead ends; every empty state has a next action; destructive actions confirmed; permission-aware navigation; accessible forms; no more than one primary action per step.

**Acceptance.** `SAAS-ONB-01` fresh signup to first value; `SAAS-ONB-02` resume after verification; `SAAS-ONB-03` invite skip; `SAAS-ONB-04` plan/trial; `SAAS-ONB-05` settings discoverability; `SAAS-ONB-06` permission-aware nav; `SAAS-ONB-07` accessible forms.

**Template boundary.** Starter owns screens/copy; APIs are owned by `saas-api` modules. Product-specific first-value step is project-owned.

**Dependencies.** Accounts, organizations, billing, entitlements.

---

### 5.14 Operations and observability

**Table-stakes bar.** The operator can tell whether the service is healthy, investigate a failure, restore data, and communicate an incident.

**Jeeves mapping.** C2 integrations/observability + a `saas-ops` starter. The runtime provides health/readiness, structured logs and request IDs; the starter provides status page, runbooks, backup/restore docs and dashboards.

**Contents.** `/health`, `/ready`, structured logs, metrics, traces, error tracking, status page, incident template, backup schedule, restore test, migration runbook, queue/outbox dashboard, alert thresholds, on-call rotation (template).

**Invariants.** Readiness reflects dependencies; logs redact secrets/PII; metrics have bounded labels; alerts have runbooks; backups are tested, not just scheduled; restore is documented; migrations are forward-only and reviewed.

**Acceptance.** `SAAS-OPS-01` health/readiness; `SAAS-OPS-02` log redaction; `SAAS-OPS-03` metrics; `SAAS-OPS-04` backup/restore drill; `SAAS-OPS-05` migration runbook; `SAAS-OPS-06` status page.

**Template boundary.** Runtime hooks + starter docs. Not a separate service.

**Dependencies.** All.

---

### 5.15 Compliance and privacy

**Table-stakes bar.** The customer can find the legal documents, request an export or deletion, understand retention/subprocessors, and trust that the vendor handles security. Enterprise buyers will ask for a DPA, a security page and a questionnaire.

**Jeeves mapping.** C3 Audit log + Reports & exports + a `saas-compliance` starter. Add data-lifecycle endpoints to the app API; keep policies/docs in the starter.

**Contents.** Terms, privacy, DPA, subprocessor list, cookie policy, security page, retention schedule, data export, account/org deletion, breach notification runbook, accessibility statement, SOC 2 readiness checklist (not certification), GDPR/CCPA request flow.

**API.** `POST /privacy/export`, `POST /privacy/delete`, `GET /privacy/requests/{id}`, `GET /privacy/subprocessors` (static or admin). All audited; deletion is soft then hard after retention.

**Invariants.** Export includes user/org data in machine-readable format; deletion respects legal retention; audit rows anonymized, not cascaded; subprocessor list current; DPA references the actual data flows; no claims of certification without evidence.

**Acceptance.** `SAAS-COMP-01` export request; `SAAS-COMP-02` delete request; `SAAS-COMP-03` retention; `SAAS-COMP-04` audit anonymization; `SAAS-COMP-05` subprocessor page; `SAAS-COMP-06` DPA link.

**Template boundary.** Starter docs + data-lifecycle endpoints. Legal text is project-owned and reviewed; the template supplies the workflow and checklist.

**Dependencies.** Accounts, organizations, audit, reports.

---

### 5.16 Metering and usage-based billing (conditional)

**Table-stakes bar.** If the product charges by usage, the customer can see usage, understand the bill, and trust that events are not double-counted.

**Jeeves mapping.** C3 Billing & plans + a `@jeeves/metering` runtime. Only build it when a plan actually uses metered prices; do not make every SaaS carry it.

**Data model.** `usage_events` (idempotency key, org, meter, quantity, occurred_at, metadata), `usage_aggregates` (org, meter, period, quantity), `metered_prices` (provider price ID, meter, unit). The billing adapter sends usage to the provider or computes the invoice line.

**Invariants.** Events idempotent; late events handled by a cutoff; aggregation is reproducible; customer-visible usage reconciles with the invoice; no negative usage; corrections are audited.

**Acceptance.** `SAAS-METER-01` event idempotency; `SAAS-METER-02` aggregation; `SAAS-METER-03` invoice reconciliation; `SAAS-METER-04` late event; `SAAS-METER-05` correction.

**Template boundary.** Runtime only when metered billing is selected; otherwise do not install it.

---

### 5.17 SSO and SCIM (enterprise, later)

**Table-stakes bar for enterprise.** An enterprise buyer can use their identity provider, provision/deprovision users automatically, and map roles. This is not SMB table stakes; it is the first enterprise extension.

**Jeeves mapping.** C3 Accounts & access / identity provider. Implement `sso` (SAML/OIDC) and `scim` modules later, after organizations and roles are stable.

**Data model.** `sso_connections` (org, protocol, metadata, domains, status), `scim_tokens` (org, token hash, scopes, last used), `identity_links` (user, provider, subject). Invariants: domain verification, JIT provisioning, role mapping, SCIM deprovisioning, break-glass local admin, audit.

**Acceptance.** `SAAS-SSO-01` SAML login; `SAAS-SSO-02` domain verification; `SAAS-SSO-03` JIT; `SAAS-SSO-04` role mapping; `SAAS-SCIM-01` create/update/delete; `SAAS-SCIM-02` token revocation.

**Template boundary.** Attachment + adapter; not a starter. Later.

---

## 6. Composition recipes

### 6.1 Solo paid SaaS (simplest)

C1: paid SaaS application. C2: web app, API, Postgres, worker/outbox, email provider, payment provider. C3: accounts, billing, entitlements, audit, notifications, screen groups. No organization UI; every user gets a personal organization automatically, so the billing and entitlement tables keep one tenant shape. Use this for a single-player paid tool.

### 6.2 B2B team SaaS

C1: paid SaaS application. C2: customer web app, admin console, API, worker, Postgres, outbox, object storage, providers. C3: accounts, organizations, roles, billing, entitlements, audit, notifications, reports, admin, onboarding. This is the default table-stakes composition.

### 6.3 API-first SaaS

C1: developer platform. C2: API, worker, Postgres, outbox, object storage, providers. C3: accounts, organizations, billing/metering, entitlements, API keys/webhooks, audit, reports, admin. No customer web app required; docs are a static site.

### 6.4 QR/link platform (qrwty target)

C1: QR/link SaaS. C2: owner web app, admin console, API, redirect service, worker, Postgres, cache, object storage, queue, analytics store, CDN/edge, payment/email providers, observability. C3: accounts, organizations, billing, entitlements, audit, notifications, developer API, reports, abuse, custom domains, screen groups.

**qrwty first table-stakes packages:** organizations + roles, audit, notifications, billing + entitlements, abuse, custom domains. Accounts/session already exist; reports and the admin starter follow. This is the shortest path from the current MVP to a sellable SaaS.

### 6.5 Which recipe to start from

| Goal | Start from | Why |
| --- | --- | --- |
| Solo paid tool | Solo paid SaaS | Fewest moving parts |
| Team product | B2B team SaaS | Organizations and roles are the core |
| Developer product | API-first SaaS | Keys/webhooks/metering matter more than screens |
| QR/link product | QR/link platform | Abuse and custom domains are mandatory |

---

## 7. Phasing and dependencies

### 7.1 Dependency graph

```text
saas-core (tenant, money, idempotency, outbox, audit hook, authz)
  ├── accounts hardening
  │     └── organizations
  │           ├── roles/permissions
  │           ├── billing ──> entitlements
  │           ├── audit
  │           ├── notifications
  │           ├── developer-access
  │           └── reports
  ├── custom-domains (also needs organizations + edge)
  └── abuse (also needs organizations + link/QR domain)
        └── admin starter
              └── compliance starter
                    └── sso/scim (later)
```

### 7.2 Recommended build order

1. **`@jeeves/saas-core`** — tenant context, money, idempotency, outbox, audit hook, authz primitives, error/rate-limit helpers.
2. **Accounts hardening** — email verification, password reset, session management, MFA. This is the base for everything.
3. **Organizations** — orgs, memberships, invitations, org switcher, last-owner rules.
4. **Roles/permissions** — fixed roles, `can()`, permission-aware UI.
5. **Audit** — table, hook, read API, export; wire the privileged actions from 2–4.
6. **Notifications** — outbox, email adapter, preferences; billing and invitations need it.
7. **Billing + Stripe adapter** — plans, checkout, webhooks, invoices, state machine.
8. **Entitlements** — plan→entitlement mapping, limits, usage display.
9. **Developer access** — API keys, scopes, rate limits, webhooks.
10. **Reports/exports** — async jobs, object storage, retention.
11. **Admin starter** — support screens, overrides, audit search, retries.
12. **Abuse + custom domains** — for the QR/link product; can be parallel once orgs/billing exist.
13. **Compliance/ops starter** — docs, data lifecycle, backup/restore.
14. **SSO/SCIM** — only after enterprise demand.

### 7.3 What not to build first

- SSO/SCIM before organizations and roles.
- Usage-based billing before fixed plans.
- A separate microservice per capability.
- A generic workflow engine or custom-role editor.
- A custom payment form or card storage.
- Admin impersonation before audit and step-up MFA.
- Custom domains before the domain model and abuse controls.

---

## 8. Acceptance and verification

### 8.1 Test layers

| Layer | What it proves | Where |
| --- | --- | --- |
| Unit | Pure state machines, money, permission matrix, idempotency keys | Runtime package |
| Contract | OpenAPI schemas, examples, error bodies | `rest-api-server` test pack |
| Integration | Postgres constraints, transactions, outbox, migrations | Template conformance (Testcontainers) |
| Browser | Screens, forms, empty/error/permission states, mouse-only | Test pack Playwright |
| Fixed acceptance | The table-stakes invariants in a disposable composed project | `tests/acceptance/<template>/` |
| Security | Tenant isolation, IDOR, CSRF, rate limit, SSRF, signature | Conformance + acceptance |
| Upgrade | Old project regenerates with new template version | Compatibility suite |

### 8.2 Acceptance IDs

Use stable IDs in the fixed suite. Suggested namespaces:

| Prefix | Area |
| --- | --- |
| `SAAS-TENANT-*` | Tenant isolation |
| `SAAS-AUTH-*` | Accounts/sessions |
| `SAAS-ORG-*` | Organizations/members |
| `SAAS-RBAC-*` | Roles/permissions |
| `SAAS-BILL-*` | Billing/plans |
| `SAAS-ENT-*` | Entitlements/quotas |
| `SAAS-AUDIT-*` | Audit |
| `SAAS-NOTIF-*` | Notifications |
| `SAAS-DEV-*` | Developer API/webhooks |
| `SAAS-REPORT-*` | Reports/exports |
| `SAAS-ADMIN-*` | Admin console |
| `SAAS-ABUSE-*` | Abuse |
| `SAAS-DOMAIN-*` | Custom domains |
| `SAAS-ONB-*` | Onboarding |
| `SAAS-OPS-*` | Operations |
| `SAAS-COMP-*` | Compliance |
| `SAAS-METER-*` | Metering |
| `SAAS-SSO-*` / `SAAS-SCIM-*` | Enterprise identity |

Acceptance cases are grouped into fixed suites registered before coding with their service, `operationIds`, `acceptanceIds`, runner and exact dependencies, mirroring the existing `fixedAcceptance` mechanism. Fixed acceptance lives in the generated project and cannot be redefined by an implementation agent. Tests must use deterministic fake providers and disposable data.

### 8.3 Definition of done for a table-stakes package

- [ ] Manifest config is finite, validated and documented; no free-form code/SQL.
- [ ] Runtime package is versioned, immutable and packed as an artifact.
- [ ] Scaffold is project-owned after first write; generated files are deterministic.
- [ ] Generated-owned files are hashed in `jeeves/lock.json`.
- [ ] Migrations are additive or reviewed; destructive changes stop.
- [ ] Test pack passes in a composed project (install, typecheck, tests, compose).
- [ ] Generated project passes the baseline with no implementation tasks for supplied behavior.
- [ ] Supplied behavior needs no implementation-model call; additions remain explicit.
- [ ] Fixed acceptance suite passes.
- [ ] Tenant isolation, idempotency, audit and provider-fake tests pass.
- [ ] Agent guide says exactly what not to edit and where extensions go.
- [ ] CATALOG.md updated from planned to implemented, with limits.
- [ ] Accessibility and mouse-only checks pass.
- [ ] No secrets, PII or provider payloads in logs.
- [ ] Upgrade path and compatibility notes exist.

---

## 9. What not to template

- **A generic identity provider.** Use an adapter for OIDC/SAML later; do not build an IdP.
- **A payment processor or card form.** Use provider-hosted checkout; keep PCI scope out.
- **A generic workflow/automation engine.** Table stakes are bounded; arbitrary workflows are project code.
- **A custom-role editor in the first release.** Fixed roles first; custom roles later.
- **A separate microservice per capability.** Attachments on the application API keep the composition small; split only when load/failure isolation demands it.
- **Provider-specific domain logic.** Stripe IDs, Postmark templates and Cloudflare DNS belong in adapters.
- **Pricing logic in code.** Plans/prices are data; entitlement semantics are project-owned.
- **A generic admin “god mode.”** Support actions are bounded, reasoned and audited.
- **A universal search index.** Search is conditional; Postgres is enough for most small SaaS.
- **Realtime and offline sync.** Conditional; do not burden every app.
- **A full data warehouse.** Start with Postgres; add an analytics store when the query load demands it.
- **SSO/SCIM before product-market fit.** It is an enterprise extension, not SMB table stakes.

---

## 10. Open decisions for Jeeves

1. **Accounts module vs `rest-api-server` session upgrade.** Recommend a versioned `accounts` module composed by `saas-api` that shares the same session runtime, so existing projects keep working and new projects get verification/reset/MFA.
2. **Organizations module vs separate service.** Recommend a `saas-api` module plus `@jeeves/saas-orgs`; one service is enough for the target scale. Split later only for enterprise isolation.
3. **Stripe first, or provider-neutral first?** Recommend a Stripe adapter first with a clean `BillingProvider` interface; Paddle/other adapters later.
4. **Outbox: `durable-events` or a Postgres table?** Recommend a Postgres outbox in `saas-core` for portability; reuse `durable-events` when its bounded semantics fit. Do not require Redis/RabbitMQ for the first version.
5. **Audit storage: Postgres or warehouse?** Postgres first; export to a warehouse later. Audit volume is small for the target market.
6. **Admin console: starter or template?** Starter. It composes APIs and is mostly screens; a runtime template would overfit.
7. **Custom domains: local proof?** Use a local DNS fixture + Caddy/internal CA for tests; production uses an edge adapter. Do not make Let’s Encrypt rate limits part of the test pack.
8. **Tenancy in the structured resource model.** Add `tenancy: "owner" | "organization" | "both"` and an `org_id` column; this is the key change that unlocks B2B SaaS. Keep backward compatibility with owner-scoped resources.
9. **Metering.** Only install when a plan uses metered prices; keep it out of the default composition.
10. **SSO/SCIM.** Defer until at least three enterprise buyers ask; it is a large surface.

---

## 11. qrwty-specific mapping

The current qrwty app already has accounts, owner-scoped QR links, redirects, scan counts, Studio artwork and owner analytics. The first engineering change is the tenancy option in 4.1: without organization-scoped resources, organizations cannot own QR links or client folders. The table-stakes gaps are:

| Gap | Package | Why it matters for qrwty |
| --- | --- | --- |
| Accounts hardening | `accounts` | Email verification, password reset, MFA and session management are missing from the current MVP |
| Organizations, members, roles | `organizations` + authz | Agencies and teams need shared libraries and client folders |
| Billing, plans, entitlements | `billing` + entitlements | The product needs a paid tier, trials, limits and a cancel path |
| Audit | `audit` | Agencies and enterprises need attribution for client work |
| Abuse | `abuse` | A shared QR domain is a phishing target; one incident can break every printed code |
| Custom domains | `custom-domains` | Agencies and brands need their own domains; this is the ownership feature |
| Reports/exports | `reports` | Agencies need client-facing CSV/PDF; customers need data portability |
| Admin console | `saas-admin` starter | Support without direct database access |
| Notifications | `notifications` | Invitations, billing, abuse, exports |
| Compliance | `saas-compliance` starter | DPA, export/delete, retention |

The qrwty recipe should remain the domain-specific layer (QR links, redirects, artwork, scan analytics). The table-stakes packages are generic `saas-api` modules; qrwty composes them. This is exactly the split Jeeves needs: **domain recipe + reusable SaaS foundations**.

If the software factory has already built any of these, treat the package as a verification and standardization exercise: compare the built behavior to the acceptance IDs, extract the reusable parts into the template, and keep qrwty-specific choices in the recipe. Do not rewrite working behavior just to match a proposed table shape.

A minimal sellable qrwty v1 would be:

- Accounts hardening (verification/reset/MFA) + organizations + roles.
- Audit for billing/member/API-key/domain changes.
- Notifications for invitations, billing, abuse and exports.
- Billing + entitlements (Free/Pro/Agency).
- Abuse scanning/quarantine.
- Custom domains with TLS.
- Reports/exports.
- Admin starter.

That is a much smaller, more deterministic build than re-implementing a SaaS in the qrwty recipe.

---

## 12. First packages for Jeeves

Each package is sized for one bounded agent session and one local commit; split a package if its acceptance surface is too large for one session. The order is a dependency order, not a promise of dates.

### P-SaaS-1: `@jeeves/saas-core`

Runtime library: tenant context, money, idempotency, outbox, audit hook, authz, error/rate-limit helpers. No UI. Conformance tests for each primitive. No template yet.

### P-SaaS-2: Accounts hardening

Evolve the session auth into an `accounts` module: email verification, password reset, session list/revoke, MFA (TOTP first), rate limits, no enumeration. Fixed acceptance `SAAS-AUTH-*`.

### P-SaaS-3: Organizations

`organizations` module: orgs, memberships, invitations, org switcher, last-owner, transfer, soft delete. Fixed acceptance `SAAS-ORG-*`. Depends on P-SaaS-2.

### P-SaaS-4: Roles and permissions

`@jeeves/authz` + fixed roles/permission matrix, `can()`, permission-aware UI, API-key scopes later. Fixed acceptance `SAAS-RBAC-*`.

### P-SaaS-5: Audit

`audit` module: append-only table, hook, read API, export, retention. Wire privileged actions from accounts/orgs/roles. Fixed acceptance `SAAS-AUDIT-*`.

### P-SaaS-6: Notifications

`notifications` module + email adapter: outbox, templates, preferences, retries, unsubscribe, delivery events. Fixed acceptance `SAAS-NOTIF-*`. Billing and invitations depend on it.

### P-SaaS-7: Billing and Stripe adapter

`billing` module + `stripe-adapter`: plans, prices, checkout, portal, webhook, invoices, state machine, reconciliation, dunning. Fixed acceptance `SAAS-BILL-*`. Depends on orgs, outbox, notifications, audit.

### P-SaaS-8: Entitlements

`entitlements` module + `@jeeves/entitlements`: generated tables, plan mapping, overrides, limits, usage display, downgrade behavior. Fixed acceptance `SAAS-ENT-*`.

### P-SaaS-9: Developer access

`developer-access` module: API keys, scopes, rate limits, webhook endpoints/deliveries, SSRF protection. Fixed acceptance `SAAS-DEV-*`.

### P-SaaS-10: Reports and exports

`reports` module + worker + local/S3 storage: async jobs, progress, signed downloads, retention, CSV injection. Fixed acceptance `SAAS-REPORT-*`.

### P-SaaS-11: Admin starter

`saas-admin` starter: search, org/subscription view, entitlement override, refund view, audit search, job retry, impersonation. Fixed acceptance `SAAS-ADMIN-*`.

### P-SaaS-12: Abuse and custom domains

Two modules, parallel once orgs/billing exist:
- `abuse` + scanner adapter: scan, quarantine, report, appeal, audit.
- `custom-domains` + edge adapter: DNS verification, TLS, renewal, takeover protection.

### P-SaaS-13: Compliance and ops starters

`saas-compliance` and `saas-ops`: docs, data lifecycle, backup/restore, status page, runbooks. Fixed acceptance `SAAS-COMP-*` / `SAAS-OPS-*`.

### P-SaaS-14: SSO/SCIM

Later, only after enterprise demand: SAML/OIDC, SCIM, role mapping, break-glass. Fixed acceptance `SAAS-SSO-*` / `SAAS-SCIM-*`.

---

## 13. Template author checklist

Before an agent calls a table-stakes package done:

- [ ] I read the relevant section of this document and the Jeeves template contract (`PLAN.md` §8, `packages/template-kit/src/contract.ts`).
- [ ] The package is the right shape: runtime, `saas-api` module, element, starter or planned block — not a new microservice by default.
- [ ] The manifest config is finite, validated, documented and backward-compatible.
- [ ] The runtime package is immutable and packed; generated projects import it by `file:` artifact.
- [ ] `generate.ts` is deterministic and has no network/time/random dependency.
- [ ] Generated-owned, scaffold and project-owned files are separated; the lock covers generated files.
- [ ] The fixed acceptance suite uses deterministic fake providers and disposable data.
- [ ] Tenant isolation, idempotency, audit, CSRF, rate limit and cross-org tests pass.
- [ ] The agent guide names the extension seam and the files agents must not edit.
- [ ] CATALOG.md is updated from planned to implemented with limits.
- [ ] The UI works by mouse, has loading/empty/error/permission states, and passes axe.
- [ ] No secrets, PII or raw provider payloads are logged.
- [ ] The package has an upgrade path and does not silently rewrite project-owned files.
- [ ] The handoff entry records evidence, limits and open questions.

---

## Glossary

- **ARPA** — average revenue per account per month.
- **C1/C2/C3/C4** — Jeeves’s C4-informed design levels: offering, container, component, implementation.
- **Entitlement** — a feature or limit a plan grants.
- **Idempotency key** — a client or event identifier that makes a repeated operation safe.
- **Outbox** — a table of side effects written in the same transaction as a state change, relayed by a worker.
- **RLS** — PostgreSQL row-level security.
- **SCIM** — System for Cross-domain Identity Management.
- **SSO** — single sign-on via SAML or OIDC.
- **Tenant** — the isolation boundary; usually an organization.
- **Webhook** — an HTTP callback signed by the sender and verified by the receiver.

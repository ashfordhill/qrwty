# Individual free and paid accounts

Billing is required in release 1 by the owner's decision. No organizations, seats, custom domains
or enterprise SSO. Guest creation remains available without a card or sign-in. These requirements
apply equally to both builds; Stripe is a recommended provider, not an already connected account.

## Product boundary

Start with a free individual tier and one paid monthly tier. Final price, currency and numerical
limits remain owner decisions. Suggested differentiation: owned-link creation allowance,
analytics lookback/detail and export allowance. All tiers have safe redirects and durable click
recording; do not ration the durability guarantee. Do not break existing published links when a
subscription ends or a quota is exhausted. Deny only the relevant new operation with a useful
upgrade/retry explanation. No automatic overage charges in release 1.

The UI shows exact price, billing interval, limits and cancellation effect before Checkout. Free
registration needs no payment method. A paid user can manage payment details and cancel using a
hosted customer portal. Support the actual subscription lifecycle, not just a pricing screen.
Q00 freezes the entitlement matrix and prices before live billing; Q10a may use explicit test-only
prices. Adding annual plans, trials, coupons or usage billing requires a scoped amendment.

## Service and data ownership

Billing API owns a restricted Billing database with account-to-customer mapping, subscription
state, entitlement revision, webhook inbox, reconciliation jobs and action idempotency records.
Use one logical writer. Stripe is an External API dependency; identity is a verified dependency.
Link API obtains a bounded entitlement grant from Billing API, then enforces exact period usage
and link creation in its own transaction. Account API checks entitlements for gated read/export
features. Session API forwards authenticated billing requests with CSRF protection.

Do not read a browser-supplied price, tier, customer ID or account ID as authority. The server
maps allowlisted product/price IDs to a versioned entitlement policy and derives the owner from
verified identity. A customer mapping cannot be reassigned through a public request. No payment
provider call belongs in the public redirect path.

Billing API may need an Optional identity guard so Stripe can reach the webhook without an OIDC
token. That does **not** make customer operations public: every customer endpoint explicitly
requires verified ownership; webhook authorization is a verified Stripe signature. Internal
entitlement endpoints require workload identity and an allowlisted caller. Check all route modes
in the generated dispatch/auth seam. A route-level generic gap must be fixed before rollout.

## Checkout, webhook and reconciliation rules

- Use hosted Stripe Checkout/Billing and Customer Portal. Keep card data out of QRWTY. Create
  checkout/portal sessions on the server with allowed return URLs and idempotency keys. Repeated
  clicks or network retries cannot create multiple active subscriptions for one account.
- The success return URL only changes the screen to “confirming subscription.” It cannot grant
  paid access. Confirm through verified webhook/reconciliation state; provide retry/polling with
  bounded backoff. Never trust a query parameter such as `paid=true`.
- Verify the webhook signature using the **unaltered raw body bytes**, official SDK, endpoint
  secret and timestamp tolerance before parsing or side effects. Limit body size and rate. The
  currently inspected Jeeves stub receives a parsed body; raw-byte access is capability G13.
- Insert the verified event into a durable inbox, unique by provider event ID, before responding
  2xx. Duplicate delivery succeeds idempotently. Inbox write failure returns a retryable error.
  Processing occurs through a repeat-safe scheduled owner job with leases, not an untracked
  background task that may die after the response.
- Events can arrive out of order. Serialize reconciliation per customer/subscription with a DB
  lease/fencing revision and fetch canonical provider state outside a long-held transaction;
  verify the lease/revision before applying. A late worker cannot overwrite a newer result.
  Timestamp comparison alone is insufficient. Reconcile nightly and on stuck checkout, retry
  with bounds, and retain failed inbox items for repair.
- Implement active, incomplete, past-due, canceled and expired states explicitly. Proposed
  past-due grace is seven days from first unresolved failure, with no extension on duplicate
  events. Cancel-at-period-end preserves paid access through that period, then returns to free.
  Immediate fraud suspension is a separate operator permission. A refund alone must not be
  assumed to imply cancellation; map provider events and support actions explicitly.

Stripe documents raw-body signature verification, retry/duplicate delivery and absent event
ordering guarantees. Use those contracts as the integration boundary.
[Webhook documentation](https://docs.stripe.com/webhooks),
[subscription lifecycle](https://docs.stripe.com/billing/subscriptions/overview).

## Entitlements, limits and outages

Each grant includes account ID, policy/revision, limits, effective start/end and a validity deadline
of at most 60 seconds. Resolve plan changes within that bound. Expired grants fail closed for new
paid-gated operations when Billing API is unavailable; public redirects and ungated free reads
continue. A provider outage alone need not stop grants: use the locally reconciled entitlement
state until its explicit paid-through/grace deadline. Never extend a subscription indefinitely
because Stripe is down.

Link API is authoritative for exact link-creation counters by account and UTC allowance period.
Enforce the grant plus quota in the same transaction as creation/idempotency. Preserve usage
across upgrades/downgrades so plan cycling cannot reset it. Claims of guest links consume the
applicable owned-link allowance atomically, leaving an unclaimed link working if the allowance
is exhausted. Define deletion behavior explicitly: deleting a link does not refund a consumed
creation allowance. Avoid a distributed transaction between Billing and Links.

Downgrade does not erase links or previously collected events. Restrict the visible paid lookback
or new exports per policy, with existing data retained by the common retention contract. Account
deletion must schedule subscription cancellation, private-data cleanup and provider-record
handling; retries cannot restart charges. Freeze necessary billing-record retention separately
from product analytics with the owner before live activation.

## Required artifacts and gates

Q10a implements Checkout/portal/inbox/reconciliation. Q10b implements versioned tier policy,
transactional quotas, lifecycle/error behavior and account deletion coordination. B07a/B07b do
the same independently. Both UI plans include pricing, upgrade confirmation, payment failure,
cancellation and downgraded states. Save the [billing drawing](../../diagrams/billing-lifecycle.svg)
and update it from tested behavior.

Tests use provider sandbox credentials/events: forged signature, modified raw body, wrong
customer, replay/out-of-order events, two concurrent checkouts, lost 2xx response, failed inbox,
lease expiry, delayed webhook, payment failure/grace expiry, cancellation, plan changes during
creation, quota races across replicas and deletion during provider outage. No real cards/charges
or customer emails in tests. Live activation requires the concrete release pack, real price IDs,
merchant account, customer-facing terms and approved spend/cutover scope.

Track payment processing and Billing fees separately from infrastructure. Current pay-as-you-go
Stripe Billing lists 0.7% of Billing volume; processing, local rates and other products can add
fees. Requote for the actual merchant account; do not treat the USD cloud estimates as margin.
[Stripe Billing pricing](https://stripe.com/billing/pricing).

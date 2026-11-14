# Owner decisions, 2026-11-13 (evening)

Given to the execution coordinator in conversation before the run started. They amend this plan,
`AGENTS.md` and the coordinator prompt; **where they conflict, this file wins.** Every worker reads
it. It is a shared requirement amendment: it applies to arm A and arm B alike.

## 1. Cloud is activated within the GCP free trial

- The owner opened a GCP free-trial account with $300 of credit. Project
  `project-f46f6d6a-8e74-42a0-ab1`, billing linked, gcloud installed and authenticated (user and
  application-default credentials) on this machine. The coordinator checked these on 2026-11-13.
- Spend comes **only from the trial credit**. Never upgrade the trial to a paid account, never
  attach another billing account, never buy committed use or a support plan. The first cloud unit
  creates a billing budget with alerts at $10, $25 and $50 (a month) before any other resource.
- The deferred units are back in scope after the local build passes: Q04's probes, Q12a (managed
  services) and Q13 (staging), for arm A. B08a/B09 for arm B follow the same rules once B's local
  pack passes. Q14/Q15's failover, load and regional tests stay deferred: they need a spend
  decision beyond a staging smoke.
- The Cloud SQL 30-day free trial instance is acceptable for staging. It has no backups or SLA,
  so backup/restore and SLA rows are **not run on it**; record them as pending for a real
  instance, never as passed. Memorystore, the load balancer and other hourly resources are fine
  within the credit; record each resource's hourly price before apply and the teardown command.
- Region: `us-central1` unless a needed service isn't offered there.

## 2. Cloudflare serves qrwty.io

- The `qrwty.io` zone is active on Cloudflare's **Free** plan. A scoped API token and the account
  ID are in `~/.config/qrwty/cloudflare.env` (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`).
- Use only free-plan features: DNS, proxy/TLS, the free WAF rules, Workers and static hosting
  within their free limits. No paid plan, add-on or Argo.
- The owner wants the product reachable at `qrwty.io`. That is a preview on test-mode payments and
  a trial database: the site says so on its pricing/billing pages, and no real customer is invited.
  Changing qrwty.io's DNS is authorized for this; record each DNS record created.

## 3. Stripe runs in test mode only

- Test-mode keys are in `~/.config/qrwty/stripe.env` (`STRIPE_SECRET_KEY` = `sk_test_…`,
  `STRIPE_PUBLISHABLE_KEY` = `pk_test_…`). The coordinator checked `livemode=false`.
- Never use or request live keys. The webhook signing secret comes from the endpoint a unit
  creates (staging) or from the Stripe CLI (`stripe listen --api-key …`, local); store it in the
  same folder, never in Git. Products: Payments and Billing (Checkout, subscriptions, customer
  portal). Connect is not used.

## 4. Secrets

Read secrets from `~/.config/qrwty/*.env` (or GCP Secret Manager once staging exists). Never print
a secret, put one in Git, a test fixture, a screenshot, a log, a handoff or a ledger. Reference
them by variable name. Baseline (B) workers get their own copy of these instructions and the same
files; they still never read A's repository or Jeeves.

## 5. Both visual directions are built (Q11, Q12, B08)

- Q11 is **no longer an owner gate**. It publishes both directions as reviewable artifacts on one
  shared layout (the two differ by token set: colour, type, glass, radii, spacing, motion), each
  with the review package of `design-brief.md`.
- Q12 (and B08 from the same frozen assets) implements **both** as switchable skins over one set
  of components, like light/dark. Every UI check runs in each skin × light/dark × desktop/mobile.
- A fresh Fable reviewer picks a **default** skin by the brief's criteria and records why, labelled
  "reviewer's default; the owner may override". This is not owner approval. When the owner
  chooses, a later cleanup unit removes the other skin.

## 6. Review and queue

- Every review unit runs on Fable at xhigh effort. Builders and repairs run on Opus. A switch to
  Fable for builders, if Opus usage runs low, is recorded and applied to matched A/B pairs.
- A reviewer may propose new units (repairs, gaps, missing checks). The coordinator adds them to
  the queue in the state file and runs them; reviewers still don't repair source themselves.

## 7. Git

The coordinator pushes `main` of this repository to `origin` after each accepted unit. Workers
don't push. `qrwty-baseline` has no remote and stays local. Jeeves stays local unless the owner
says otherwise.

## 8. Documentation

The owner will walk through the project after the run. Keep the root README current with real
diagrams (Excalidraw sources and renders), measured tables, how to run each arm locally and how
the staging deployment is reached, plus a short walkthrough of the main flows.

## 9. Amendment, 2026-11-14 evening: the run is cut to what evaluates Jeeves

The owner's aim is to evaluate Jeeves; QRWTY is a test subject that is unlikely to become a
business. This section wins over sections 1, 2, 5, 6 and 8 where they conflict.

- **Out of the run (both arms):** the UI and staging. A: Q11, Q12 and its review, Q12a, Q13.
  B: B08 and its review, B08a, B09. Nothing is provisioned on GCP or Cloudflare; the trial credit
  and the qrwty.io zone stay unused. Section 5 (both skins) no longer applies.
- **Reviews (section 6):** A is reviewed after Q07 and Q08, matching B's reviews after B04 and B05;
  then one backend review per arm at the end (A after Q10b, B after B07b), and a review of the
  final report. No other per-unit reviews. Reviewer-proposed repairs still run.
- **Merged units:** Q10a with Q10b, and B07a with B07b, each one unit and one commit.
- **Jeeves:** batch 2 ends at QG07, QG08, QG09, QG20, then QGR2. QG10, QG18, QG21, QG22, QG23 and
  QG25 move to the post-QRWTY Jeeves backlog.
- **The report (section 8):** a final report replaces the staging walkthrough: backend LOC and
  template share (source-loc-v2, UI excluded), the A/B effort and oracle comparison over the cut
  scope, and the ranked Jeeves gap backlog. The scope change mid-run is a comparison limitation.
- **Jeeves work in parallel:** once A's generation baseline is frozen (Q05), Jeeves may change for
  its own improvement plan. A's later units use only the frozen export and don't read Jeeves plans
  or commits made after Q05.

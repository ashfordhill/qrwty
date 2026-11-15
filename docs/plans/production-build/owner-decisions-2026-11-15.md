# Owner decisions, 2026-11-15: wind QRWTY down to what informs Jeeves

These decisions win over `owner-decisions-2026-11-13.md` §9–§12 where they conflict.

The owner said: "we shouldn't be implementing this deeply if we have enough info for Jeeves improvements."

- **Arm B stops.** No B07a, B07b or B08, and none of the B07 review's units.
  - B-final captures a viewable, sanitized record of the live b.qrwty.io, then tears B's staging down.
  - The project budget and the OpenTofu state bucket stay.
- **Arm A** finishes Q06. It then runs **one live deploy** behind qrwty.io: Q12a and Q13 combined. That puts A's Jeeves-generated app on real Cloud Run, Cloud SQL, Memorystore and Pub/Sub, to surface Jeeves gaps that local tests can't show.
  - The deploy captures the same kind of viewable record, then tears down.
  - Then A stops: no Q07–Q10b and no Q12.
  - The coordinator installed OpenTofu 1.13.2 and the google provider 8.8.1 for it, checksum-verified, under `.scratch/tools/`.
- **QG28 and QG29: yes**, as QGR2 recommended. Each loop stub gets its own subscription, and `migrate.mjs` verifies TLS with the CA file.
- **Jeeves continues:** batch 3, made of A's found gaps plus QG28 and QG29, then the QL plan.
- **The owner wants to see what happened on qrwty.io.** A shared unit publishes a free static "versions" section through the existing Cloudflare Worker. It holds:
  - the design prototype;
  - A's and B's captured records;
  - the diagrams and a timeline;
  - a link to the original landing page, if it can be shown.
- **The owner also wants a concise results view in qrwty's README.** The same unit updates it:
  - backend LOC for A (frozen baseline, plus Q06) and for B, including a like-for-like comparison;
  - effort per arm, from the ledger;
  - the Jeeves gaps found and fixed;
  - the QL plan's estimate.

## Later the same day

- **"Yes for all recommendations."**
  - QG34 / B1: each credential can be read from its own file, through `JEEVES_SECRET_<NAME>_FILE`.
  - B2, B3 and B4: no unit now; QG33 records them as known limits.
  - QG29: the `JEEVES_MIGRATE_*` interpretation stands.
  - Arm B's teardown and arm A's single deploy go ahead as already decided.
- **"Deprioritize testing."** The remaining units use a lighter verification profile. It replaces
  the heavier unit rules of the Jeeves plans for these units:
  - **Every unit:** `pnpm check` and the web build.
  - **e2e:** only when a unit touches studio or web code.
  - **Docker:** at most the one suite or proof most relevant to the change. Flaky results are
    reported, not rerun.
  - **Dropped:** the scratch-clone "new tests fail on HEAD" measurement.
  - **Regeneration proof:** export both fixtures and list the changed paths, with no install or
    build.
  - **Reviews** (QGR3, QLR1) still run, but they re-run only `pnpm check`, plus one proof each if
    they doubt a claim.
  - **Exception:** Q13's live probes are the purpose of that unit, so they stay.

## Evening: finish A with a UI, to play with it

The owner: "let's finish A, along with a UI so we can play with the features … we don't need to be
spending money … this is a business plan on pause."

- **Finish arm A:** sessions and accounts, redirect and clicks, analytics, abuse, billing, quotas,
  and a UI in the Q11 style. Use the lighter checks: build, typecheck, unit tests and a live smoke
  on qrwty.io. No oracle campaigns, no review units and no "records".
- **Regenerate A from today's Jeeves first.** The A/B numbers in the README stay as recorded. This
  becomes the "Jeeves now" version.
- **Live on qrwty.io from the start, on the GCP trial credit only.** The trial never charges the
  card unless it is upgraded, so it never is.
  - Smallest tiers, with Cloud Run at minimum 0 where possible.
  - Auth0 free tier, Stripe **test mode** (test cards), Web Risk free tier.
  - qrwty.io/ becomes the app once the UI lands; `/versions/` stays.
- **Jeeves:** QL work stays paused until the owner picks units. A's new template gaps are recorded,
  not fixed, unless the owner asks.

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

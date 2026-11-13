# QRWTY architecture explanations

Five **proposed** Excalidraw drawings, revision 2, 2026-11-13. They explain the build plan and the application
work outside Jeeves. No drawing is a saved Jeeves project, generated-code manifest or deployed
infrastructure inventory. Q01–Q02 add the real Jeeves artifacts separately.

| Drawing | Editable source | Preview | Question it answers |
| --- | --- | --- | --- |
| System overview | [Excalidraw](system-overview.excalidraw) | [SVG](system-overview.svg) / [PNG](system-overview.png) | How do public links, accounts and analytics fit together? |
| Guest ownership | [Excalidraw](guest-ownership.excalidraw) | [SVG](guest-ownership.svg) / [PNG](guest-ownership.png) | How can a guest create immediately and claim ownership safely later? |
| Redirect failure | [Excalidraw](redirect-failure.excalidraw) | [SVG](redirect-failure.svg) / [PNG](redirect-failure.png) | What keeps working when a cache, database or click pipeline fails? |
| Cloud deployment | [Excalidraw](cloud-deployment.excalidraw) | [SVG](cloud-deployment.svg) / [PNG](cloud-deployment.png) | What does Cloudflare do, what runs regionally, and what recovery still needs proof? |
| Billing lifecycle | [Excalidraw](billing-lifecycle.excalidraw) | [SVG](billing-lifecycle.svg) / [PNG](billing-lifecycle.png) | How do Checkout, signed events, entitlements and downgrade fit together? |

Open the `.excalidraw` file in Excalidraw using its Open command. Shapes/text are native editable
elements, not a flattened screenshot. Sources were constructed with Excalidraw 0.18.0's element
converter and rendered through its own browser export utilities; React 19.0.0 and Vite 6.1.0 were
temporary rendering tools outside the product repo. No production dependency was added. Original
files have no remote image assets or secrets. SVG/PNG were visually inspected and source scenes
reopened in the editor. The verification record is in the planning handoff/evidence.

Style follows the owner's existing Excalidraw sketch and Jeeves lane studies: light blue paper,
dark outlines, rounded named boundaries and restrained semantic colors. Solid arrows show direct
requests/reads/data transfer; dashed arrows show channel delivery. A dashed publisher connection
still waits for a durable acknowledgment before 302. Cloud placement is explanatory, not a new
Jeeves canvas feature. The GCP drawing groups regional managed services, not manually pinned
Cloud Run zones. Billing is an external provider plus app-owned authorization/state logic.

The overview groups Identity/Sessions and Links/cache for legibility; the actual Jeeves inventory
draws them separately. The backend [architecture contract](../plans/production-build/architecture.md)
is more detailed. Version changes to diagrams together with the behavior they explain.
The earlier revision/hashes remain in Git and `docs/evidence/planning/`; current verification is
in [revision 2 evidence](../evidence/plan-revision-2/checks.md).

Additional diagrams are assigned to later units: link state, event lifecycle, UI flow and actual
recovery sequence. Do not make one unreadable master sheet for all four concerns.

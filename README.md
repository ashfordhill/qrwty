# qrwty <!-- omit from toc -->

[qrwty](https://qrwty.io) grew out of a [brainstorm about QR-code tracking](https://github.com/ashfordhill/brainstorm/blob/main/archives/QR%20Code%20Tracking/README.md), which spawned from a [local neighborhood project](https://github.com/ashfordhill/qr-code-tracking). The original niche use case involved hardware: I wanted to record where I installed QR codes using my phone's GPS while I was running around placing posters & QR codes in random spots.

- [Business value?](#business-value)
  - [What about custom hardware?](#what-about-custom-hardware)
- [Research notes](#research-notes)
- [Future moves](#future-moves)

## Business value?

Even while exploring whether QR-code tracking could become a profitable business, I was doubtful:

- The first use case—tracking engagement with posters—felt too niche. 
- As a general QR analytics use case, there are already plenty of existing solutions for that, which puts pressure on pricing for new competitors.

QR-code tracking is already offered by SaaS companies such as:

- [Uniqode](https://www.uniqode.com/)
- [QR.io](https://qr.io/)
- [Hovercode](https://hovercode.com/)

Analytics can make QR codes useful in many settings, including on physical products. 

I am uneasy about competing in a market where success may depend more on winning business deals than on building the best product. Reaching those deals often takes a sales-oriented person with the time and network to build relationships, which is not my forte.

### What about custom hardware?

One possible way for `qrwty` to stand out was custom hardware: print an outdoor-ready thermal label and record its location on the spot, as I wanted to do for the neighborhood tree-poster project. Since a smartphone and a printer can already handle this, custom hardware is not worth exploring.

## Research notes

I asked several frontier AI models to research the business idea. Their semi-slop findings were not compelling enough to change my initial doubts:

- The QR-code SaaS market is crowded.
- An [open-core](./business-analysis/ai-generated-reports-fable-5.1/README.md#g-open-core) model with enterprise hosting *might* be worth exploring.
- Custom hardware appears unnecessary and could distract from the software opportunity.
- Small, local use cases like poster tracking may take more effort to sell and support than they can justify.

## Future moves

Qrwty can still serve as a guinea pig for a software design generation project I'm working on - if a large chunk of the infrastructure can be generated well for a service like this, then great. Further exploration would (hopefully) not take as much time.

## Production build experiment

The [phased build plan](docs/plans/production-build/README.md) defines a public link/QR service
with anonymous quick links, account-owned management and analytics, a real cloud deployment and
two comparable implementations: [with Jeeves](docs/plans/production-build/units.md) and
[without Jeeves](docs/plans/production-build/baseline-units.md).

**Status: planning only.** The application has not been generated, built or deployed. The first
application phase saves the architecture in Jeeves before generating into this repository.
The drawing below is a proposed Excalidraw explanation, not a saved Jeeves diagram or runtime
verification. The actual Jeeves diagram and export will be linked here when Q01–Q02 complete.

![Proposed QRWTY system: public redirects, anonymous/account operations and isolated click analytics](docs/diagrams/system-overview.svg)

[Editable Excalidraw](docs/diagrams/system-overview.excalidraw) ·
[Guest ownership](docs/diagrams/guest-ownership.svg) ·
[Redirect failures](docs/diagrams/redirect-failure.svg) ·
[Cloud deployment](docs/diagrams/cloud-deployment.svg) ·
[All diagram sources](docs/diagrams/README.md)

The [cloud strategy](docs/plans/production-build/cloud-strategy.md) proposes Cloudflare plus
managed regional services and separates launch, large-service load proof and regional recovery.
The [UI brief](docs/plans/production-build/design-brief.md) calls for an original, restrained
Liquid Glass interface, with owner review before full UI implementation.

### Source and effort measurement

Counts are pending, rather than estimated. Backend and UI are deliberately separate. “Template
share” measures retained generated backend source, not the percentage of the whole product or
the time saved. [Counting and comparison protocol](docs/plans/production-build/comparison.md) ·
[Machine-readable status](docs/benchmarks/status.json)

| Source measure | Jeeves-assisted QRWTY | Independent QRWTY |
| --- | ---: | ---: |
| Untouched reusable generated backend baseline LOC | Not generated | Not applicable |
| Retained generated backend LOC | Not measured | Not applicable |
| Backend LOC written after generation / independently | Not measured | Not measured |
| Removed or replaced baseline LOC | Not measured | Not applicable |
| Final backend production LOC | Not measured | Not measured |
| Template share of final backend | Not measured | Not applicable |
| UI source LOC (JS/TS, CSS and markup subtotals) | Not built | Not built |
| Product SQL / infrastructure / scripts / tests | Separate counts pending | Separate counts pending |

| Effort and outcome | Jeeves-assisted QRWTY | Independent QRWTY |
| --- | --- | --- |
| Exact models and execution settings | To be pinned | Same controlled settings |
| Model requests, prompts and tokens | Recording protocol defined; no build run | Recording protocol defined; no build run |
| Template development / application / UI effort | Separate totals pending | Independent effort pending |
| Human review time and failed attempts | To be recorded | To be recorded |
| Provider-reported / estimated model cost | Pending, distinguished | Pending, distinguished |
| Proven traffic tier / cloud cost | Not deployed | Not deployed |
| Recovery, security and maintenance-change results | Not run | Not run |

The plan includes [questions for the owner](docs/plans/production-build/README.md#owner-steering-questions)
on budgets, cloud/geography, guest-link permanence, analytics durability, release scope and the
comparison model. Existing research above remains background; it is not the release checklist.

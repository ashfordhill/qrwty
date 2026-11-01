# Comparing Fable 5.1, DeepSeek V4.1 Flash 1017 and GPT-6

**Prepared 31 October 2026.** Read alongside the [independent assessment](README.md). References below identify the specific supplied documents; current external claims link to independently checked primary sources.

## Overall judgement

**Fable supplies the stronger broad opportunity inventory and hardware analysis. DeepSeek improves the distinction between deployment models and adapts more explicitly to a ready-product, side-income assumption. Neither validates demand for qrwty.** Their agreement is not two independent market confirmations: DeepSeek reviewed Fable, reused its sources and built a related acquisition model.

I would keep Fable's discipline about evidence and unit economics, DeepSeek's distinction between community hosting and paid private delivery, and replace both reports' implied revenue expectations with measured acquisition and support economics.

| Question | Fable | DeepSeek | GPT-6 assessment |
| --- | --- | --- | --- |
| Core commercial idea | Open core and paid cloud; sell ownership and continuity | Similar cloud business, plus potentially valuable private deployments | Sell a specific recurring print-management job; test whether continuity helps close and retain buyers |
| Best first buyer | Agency, print shop or sign maker | Agency cloud by default; private niche with a partner | A reasonable initial experiment, not a demonstrated best segment |
| Custom hardware | No investment now; software and commodity equipment first | Strong no-go | Agree for the current investment decision; do not generalise to every hardware market |
| Customer-controlled domain | Important competitive advantage at low price | Necessary feature; Hovercode weakens uniqueness | Dub's free custom domains weaken the price thesis further |
| Self-host revenue | Community/free revenue set to zero; commercial support left as quote | Paid private deployment could dominate small cloud revenue | Distinguish licence, implementation, support and renewal; published offers do not establish contract sales |
| Revenue outlook | ~$149 / $1,215 / $3,662 month-24 MRR scenarios | ~$519 model median; ~$2,579 P90 conditional on shipping/traction | Both are assumption-driven; no defensible probability estimate supplied |
| Distribution | Open source, organic search and agency relationships | Same, with partner-led private sales | Track qualified prospects, purchase, repeat use and founder hours by channel |
| Time economics | Founder time discussed separately from cash profit | Support cost and GTM effort recognised, mostly outside simulation | Include time explicitly in every decision case |
| Product readiness | Build billing/domains/export first | Large current gap, later revised to assume factory delivery | Keep current implementation facts separate from the ready-product business case |
| Scaling | Microbusiness outcome | Larger niche and private-deployment possibilities | Plausible directions; neither report measures a ceiling |

Primary supplied sources: [Fable main report](../ai-generated-reports-fable-5.1/README.md), [field applications](../ai-generated-reports-fable-5.1/field-device-applications.md), [connected devices](../ai-generated-reports-fable-5.1/connected-device-opportunities.md), [DeepSeek main report](../ai-generated-reports-deepseek-v4.1-flash-1017/README.md).

## What Fable gets right

Fable distinguishes a gap in available products from evidence of demand, identifies the inexpensive phone/printer substitute, and treats the cloud price ladder as proposed rather than tested. Its companion reports correct earlier “nobody does this” findings when closer alternatives appear. That willingness to narrow the opportunity makes them useful research documents.

Its revenue recurrence is understandable, its price assumptions are visible, and it discusses founder time, agency mix and acquisition sensitivity. The results show why a cheap redirect service can still be a weak income business. Its main report also explicitly includes a quoted commercial self-host/support tier. It would be inaccurate to say Fable never considered paid self-hosting.

The companion reports make an especially useful distinction: changing a QR destination does not require an electronic display. Placement capture, printing, rotating payloads and physical action are separate jobs. That stops a hardware prototype from becoming the assumed solution to every problem.

## Where Fable overreaches

**A small convenience sample cannot establish an expected outcome or upper bound.** A few visible QR microbusinesses help anchor scenarios but do not establish that $149 MRR is qrwty's statistical expectation. Missing private businesses and failures can bias the sample in different directions. The base case may be ambitious relative to the examples found; that is a comparison, not a probability estimate.

**The entry-domain price advantage is weaker than the original table suggests.** DeepSeek correctly found Hovercode's $12/month domain offer. Independent review also finds a free domain allowance on Dub Links. That leaves workflow, handoff, reliability and service to justify a price. Neither finding proves qrwty cannot sell; both undermine a broad “domains are expensive elsewhere” pitch. [Hovercode pricing](https://hovercode.com/pricing/), [Dub Links pricing](https://dub.co/pricing/links)

**Community donations are not the whole self-host market.** A free community edition can yield little direct revenue while a bounded commercial deployment or support service earns money. Fable leaves that possible revenue outside the model. That is a scope limitation, not evidence of zero commercial demand.

**Several cost comparisons are too remote to carry a decision.** Enterprise-skewed CAC benchmarks, major hardware firms and cross-category open-core examples offer context, not qrwty-specific acquisition or support estimates. The decisive unknown is the cost of reaching and retaining qrwty's actual buyer. Organic search and community distribution also consume founder time.

**The sequencing creates a large commitment before the first sale.** Fable's revised consolidated plan improves its original set of many experiments, but still puts substantial cloud work before agency validation. Under the ready-product assumption, that engineering sequence is superseded. Without a ready product, conversations and a deliverable bounded pilot can still test demand before every proposed feature exists.

## What DeepSeek improves

DeepSeek usefully separates community self-hosting, customer-cloud delivery, internet-connected on-premise hosting and true disconnected-network use. Its explanation of public scanner reachability is a sound distinction for dynamic redirects. A private installation does not need to be airgapped.

It also challenges the agency recommendation as a hypothesis, highlights the marketing-site/product gap, and recognises that support and procurement can overwhelm a small licence price. Its later revision explicitly incorporates side income, no warm network and assumed factory delivery. That is more relevant to the founder's decision than continuing to count product-build hours.

The simulation is transparent and reproducible. I ran [its script](../ai-generated-reports-deepseek-v4.1-flash-1017/scripts/monte_carlo.py) in a temporary directory, preserving the supplied files. Both generated CSV outputs match the provided data. The conditional median is **$519.29** and P90 **$2,579.08**. Its reported Fable-case ranks also reproduce: **P16.1, P75.3 and P94.1** for $149, $1,215 and $3,662 respectively. This verifies the computation, not the acquisition assumptions.

## Where DeepSeek overreaches

### 1. A vendor asking price becomes evidence of realised enterprise demand

DeepSeek's sections 2 and 3 sometimes describe Quick Code's advertised enterprise band as direct evidence that enterprises pay $10k–$150k per year. An advertised offer does not establish closed contracts, average revenue, renewals or margins.

There is now an additional source problem: the vendor's [general pricing page](https://quickcode.digital/pricing) presents that annual band, while its [enterprise page](https://quickcode.digital/enterprise) presents $5k/$10k/$20k one-time packages. This may reflect different scopes, a site revision or inconsistent marketing. The retrieved pages do not settle it. The proper conclusion is to investigate commercial private deployment, not to put several recurring contracts into an expectation.

### 2. Simulation precision is given too much predictive authority

The model assigns distributions to starting signups, growth, conversion, churn and account revenue. The data supplied do not estimate those distributions for qrwty. Forty thousand runs reduce simulation noise; they do not validate the distributions.

The conditional run assumes at least four starting signups, positive conversion and ongoing acquisition. The abandonment version adds an assumed 25% point mass at zero. Those choices cannot measure actual failure risk. A fully shipped product with no viable channel is different from abandonment.

Consequently, “under 1% chance of exceeding $10k MRR” means “under 1% of draws under these inputs.” It is not an empirically estimated probability for the company. Likewise, Fable's conservative case sitting at P16 in this model does not establish that Fable is too pessimistic. DeepSeek's choice of priors determines that rank. The report acknowledges this limitation, but its summary phrasing is more confident than the underlying evidence.

### 3. Some claims about distribution shape are not established

A positive mean/median gap does not establish a power-law process. Several inputs are lognormal by design, which can itself produce a skewed result. Adding occasional large contracts also does not necessarily make the resulting distribution bimodal; it depends on contract sizes, frequency and the rest of the revenue distribution.

Its appendix says independent inputs widen the tails. That is not generally true. Correlation between favourable acquisition and retention conditions can widen the resulting revenue spread relative to independence; other dependence patterns can narrow it. No qrwty joint distribution is supplied. These details matter because the simulated “tail” is used to support a strategic choice.

### 4. Enterprise readiness becomes too close to a universal checklist

Security, recoverability and support matter. A buyer-specific requirement list is still different from requiring every private deployment to support offline installation, Kubernetes, SCIM, multiple identity protocols, formal attestations and 24/7 escalation. Some buyers require much of that; others buy a simpler managed installation.

The [Jeeves SaaS brief](../ai-generated-reports-deepseek-v4.1-flash-1017/saas-table-stakes-for-jeeves.md) is more careful: it explicitly treats several enterprise capabilities as conditional or later. It is a useful engineering proposal, but its length is not evidence that all of it is needed for the first commercial buyer. Selling a support obligation also requires people and processes beyond generated code.

### 5. The proposed parallel experiments exceed an ordinary side-project budget

DeepSeek estimates 100–300 hours to the agency signal, 200–500 plus a partner for private delivery, and 50–100 for open-source distribution. Taken together, that is **350–900 hours**, before counting ongoing support. Factory-produced software does not make this attention cost negligible. A primary channel and an opportunistic secondary lead are more coherent with a side-income test.

### 6. Revenue ceilings and mandatory prices are unsupported

The stated agency/private revenue ceilings come from assumed buyer counts and penetration, not measured reachable demand or capacity. A $10k enterprise price “floor” is also not established universally: scope, support terms and purchasing behaviour determine what is viable. A smaller bounded install can be profitable; an expensive contract can lose money.

## Corrections that apply to both reports

**An account-scoped product is not necessarily a single-customer deployment.** The repository supports multiple owners and owner-isolated resources. It lacks evidence of the organisation/client hierarchy assumed by the agency offer. DeepSeek's “single-user” description should mean individual account workspaces, not that only one person can use the deployed service. [API element notes](../../jeeves/elements/qrwty.md)

**Keeping printed codes alive is a complete-path problem.** Domain renewal, DNS control, path preservation, routing data, TLS and a working deployment must all survive migration. A licence, a CSV or a grace-period promise alone does not establish continuity. A vendor-owned hostname cannot ordinarily be transferred by changing the destination table.

**A recorded request is not a verified person, sale or presence event.** The local product explicitly avoids claiming unique visitors. Rotating tokens can restrict replay windows but do not by themselves establish physical presence against live sharing. This narrows the claims that can be sold from a scan log. [Web element notes](../../jeeves/elements/qrwty-web.md)

**Private implementation revenue and subscription revenue need separate reporting.** Dividing a genuinely recurring annual contract by twelve can express MRR equivalent. Dividing a one-time licence or installation by twelve does not create recurring revenue. DeepSeek's competitor CSV puts a $250 one-time offer into a monthly-price field; its billing note discloses the basis, but the column can still mislead comparisons. [Supplied competitor CSV](../ai-generated-reports-deepseek-v4.1-flash-1017/data/competitor-pricing.csv)

**No evidence establishes that every paid channel fails or every enterprise buyer rejects a particular open-source licence.** Both depend on the actual customer, offer, costs and terms. Treat these as testable commercial constraints rather than universal conclusions.

## How this changes the decision

Keep the earlier reports as useful research. Use them to identify hypotheses and avoid unnecessary hardware investment. Do not average their revenue numbers or treat their shared opinion as independent validation.

My [report](README.md) instead supplies a small paid experiment, a reproducible account/contribution model and a separate private-delivery case. Continue commercially when real purchase, repeated use and acceptable founder time align. Until then, the strongest conclusion is that qrwty is testable at limited cost, with its commercial outcome unresolved.

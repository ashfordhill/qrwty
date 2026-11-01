# qrwty: test a distribution channel before treating it as a business

**Author: GPT-6 (Codex)** · **Prepared: 31 October 2026** · USD throughout

Independent business analysis, with a review of the Fable 5.1 and DeepSeek V4.1 Flash 1017 reports. This folder is a separate contribution; the earlier reports have not been edited.

## The decision

**qrwty is worth a bounded attempt to earn side income. The evidence does not yet justify choosing it as a substantial business.** The best initial experiment is a hosted service for print shops or small agencies managing long-lived client print, sold with reliable handoff and migration. Private deployment deserves investigation when a buyer or distribution partner brings a specific requirement. Custom hardware should remain outside the commercial plan until someone pays for a job that commodity equipment cannot do adequately.

This recommendation is conditional on a sellable product being available. DeepSeek's revised report records three earlier founder clarifications: the software factory can deliver the product, the goal is side income with optional scale, and there is no warm sales network. I use those as working assumptions inherited from that report, rather than claiming they were reconfirmed in this conversation. The local business-analysis introduction also records reluctance about sales and competition. Both matter: inexpensive software makes an experiment cheaper, but earning revenue still requires reaching buyers and serving them.

My main differences from the two reports are:

1. **Ownership is a useful purchase condition; demand for qrwty remains unproved.** Domain control, export and self-hosting do not establish that a customer will switch or pay.
2. **Published enterprise pricing is weaker evidence than DeepSeek treats it as.** Its pivotal supplier currently shows conflicting annual and one-time enterprise offers. Neither page establishes realised sales or renewals.
3. **Neither report establishes a revenue ceiling or a success probability.** Fable's scenarios and DeepSeek's simulations depend heavily on assumed acquisition. Their precision should not be mistaken for measured demand.
4. **The first scarce resource is founder attention.** A small subscription business can generate cash while compensating sales and support time poorly. My model explicitly shows both cash surplus and surplus after valuing that time.

**The first milestone should be three independent paying businesses and repeated use through a second billing period.** That earns a larger experiment; it does not yet establish product-market fit. A paid private-deployment pilot would justify a separate assessment with its own delivery and renewal economics.

## Reading and supporting files

| File | Purpose |
| --- | --- |
| [comparison.md](comparison.md) | Direct comparison of Fable, DeepSeek and this assessment; specific corrections and disagreements |
| [sources.md](sources.md) | Source register, verification status and limits |
| [scripts/economics.py](scripts/economics.py) | Reproducible, dependency-free scenario arithmetic |
| [data/unit-economics.csv](data/unit-economics.csv) | Contribution per account after assumed support time |
| [data/income-targets.csv](data/income-targets.csv) | Accounts required at different income hurdles |
| [data/channel-summary.csv](data/channel-summary.csv) | Conditional 24-month acquisition scenarios |
| [data/channel-monthly.csv](data/channel-monthly.csv) | Every month and input behind those scenarios |
| [data/private-deployment.csv](data/private-deployment.csv) | Separate private-contract economics |
| [validation.md](validation.md) | Reproduction and project-check results |

## 1. What is established, and what remains a hypothesis

The local project contains owner-scoped QR management, redirects, artwork generation and request-count analytics. Its generated element notes describe those operations explicitly. This is a credible product foundation. The inspected contract and feature directories do not establish the agency subscription, custom-domain or enterprise offering assumed by either report. See the [API notes](../../jeeves/elements/qrwty.md), [web notes](../../jeeves/elements/qrwty-web.md) and [redirect handler](../../services/qrwty/src/features/redirect/index.ts).

That observation describes the inspected repository, not every possible deployment. It also does not override the working assumption that Jeeves can deliver the commercial features. The business decision has two independent questions: can the software be supplied, and can a customer be acquired at an acceptable ongoing cost?

| Proposition | Evidence available | Assessment |
| --- | --- | --- |
| People use physical QR links and want editable destinations | Existing vendor products; founder's field project | Established use case |
| The founder experienced a placement-recording problem | Local introduction and public field notes | Established personal problem |
| Print businesses already buy related QR tools | Vendor offers with agency and team features | Plausible buyer category; qrwty demand unmeasured |
| Ownership causes customers to choose qrwty | No interviews, paid conversions or switching records supplied | Untested |
| Private deployments can command substantial prices | Published supplier offers | An offer exists; realised demand and margins unverified |
| Open source will supply paying cloud customers | Examples in other categories; no qrwty attribution data | Untested channel |
| A custom field device improves the business | Prototype experience and desk research; no paid buyer supplied | Insufficient support |

I could not independently inspect qrwty.io: the web tool could not retrieve it and a direct HTTP request returned 403. The $12/month, $149/year and $499 lifetime offers described by DeepSeek are therefore **reported historical observations**, not independently confirmed current offers. I do not infer that the website is down.

## 2. The market and the actual alternatives

The practical market is not everyone who scans QR codes. It is organisations with a recurring link-management job, a budget owner, and a reason to choose a new supplier. QR payment processing, static generation, marketing links and internal asset systems have different budgets. Adding their market sizes together does not estimate qrwty's reachable revenue.

The current alternatives show why a generic ownership pitch is insufficient:

| Alternative | Independently observed offer | Consequence for qrwty |
| --- | --- | --- |
| Hovercode | $12/month Pro with one custom domain; $39/month Business with ten domains and team/bulk/API tools | A low-cost domain and agency features already have a close substitute |
| Dub Links | Free tier lists QR codes and three custom domains, with usage and retention limits | A custom domain is available even below the proposed paid entry tiers |
| Quick Code | $250 one-time self-host offer; managed from $39/month | QR-first private hosting is already supplied |
| Shlink | Open-source, self-hosted links with a web management app and visit statistics | Technical customers have an established substitute |
| Customer's existing web infrastructure | Cloudflare documents redirect rules, including an allocation on Free | Simple long-lived links may require very little additional software |
| Keep the current vendor or spreadsheet | No migration or new procurement required | Doing nothing must be beaten on practical value |

Sources: [Hovercode pricing](https://hovercode.com/pricing/), [Dub Links pricing](https://dub.co/pricing/links), [Quick Code pricing](https://quickcode.digital/pricing), [Shlink](https://shlink.io/), [Cloudflare redirect availability](https://developers.cloudflare.com/rules/url-forwarding/). These are vendor descriptions, not audited capabilities or checkout tests. Prices and plan boundaries can change.

Both reports' Dub comparisons require particular care: the $81/month offer displayed at the general pricing URL is labelled **Dub Partners**, and should not be treated as the minimum price for standalone QR/link management. Fable discloses the toggle problem, but that number still appears in comparative reasoning. The separate Links page lists a free option and Pro at $27/month in the annual-billing view retrieved for this review. Its free custom domains materially weaken the proposed domain-price advantage. [General pricing](https://dub.co/pricing), [Links pricing](https://dub.co/pricing/links)

For acquisition, distinguish two groups. A business creating new printed material can choose a customer-controlled URL before printing. A business whose existing codes contain another vendor's hostname cannot simply import a CSV and take control of that hostname. Domain control must exist in the printed URL, or the old supplier must cooperate. A migration promise is much more valuable when it preserves the exact hostname and path.

That makes **new print jobs and renewals** a better initial sales moment than indiscriminate attempts to rescue already printed vendor-domain codes. This is an inference from how the redirect works, not measured customer preference.

## 3. Which customer should be tested first?

### A narrow initial customer

Start with an owner or production lead at an independent print/sign shop or small agency that manages recurring client print jobs. Qualify for recurring demand: several client jobs, an existing process for updating links, and responsibility when printed materials fail or change hands.

The job to test is: **“Let us deliver and maintain client QR links, then hand them over safely without reprinting or keeping a subscription on the client's behalf forever.”** Ask for examples: a client leaving an agency, a menu changing, a staff member departing, or an old campaign being reused. Those triggers make the value concrete.

The proposed offer combines client organisation, editable links, export, a customer-controlled domain and a demonstrated handoff. A design studio helps the printing workflow, but good-looking codes alone compete with many established tools. Optional placement capture should be sold only when the shop has a field-placement job to manage.

This is an initial hypothesis, not a finding that agencies are the best market. Agencies can also be difficult customers: they demand many client domains, expect support, can build with existing tools, and may prefer their current supplier. A partner who sends leads is useful only when those leads convert and retain economically.

### Other paths

| Path | Why it might work | Why it should not lead today |
| --- | --- | --- |
| Generic individual cloud users | Short purchase cycle; simple product | Small revenue per account, many free substitutes, acquisition burden |
| Long-lived trails and civic installations | Founder understands physical placement and durability | Budget and recurring-payment evidence remain weak; seasonal demand possible |
| Private deployment | Specific IT policy or integration could support a larger contract | No identified buyer, procurement path or verified recurring demand supplied |
| Paid self-host package for technical SMBs | Bounded licence and installation job could be simple | Free and inexpensive substitutes; update/support scope determines margin |
| Hardware or physical actuation | Could solve a specialised operational job | Adds a different support and reliability business without demonstrated buyer demand |

Fable's companion reports help distinguish placement logging from scanner location. A phone recording where a sign was installed answers a different question from estimating a visitor's city. Neither tells you how many people saw the sign. [Fable field-device report](../ai-generated-reports-fable-5.1/field-device-applications.md)

## 4. What to sell, and how to price the first offer

Test one agency offer at **$49/month**, with an optional **$199 bounded setup service** for an agreed number of links and domains. Treat $49 as a test price, not an optimum established by competitors. The setup service pays for identifiable labour; record it separately from subscription revenue. Do not assume the customer will pay it or include it in the recurring scenarios below.

Keep the first package understandable: client folders, agreed domain/code limits, basic reporting, bulk import/export and a handoff procedure. For the pilot, specify a small limit such as three client domains and 100 live codes; record requests for more. Test $79 only when the buyer values additional domains, client handoffs or service enough to justify it. The scenario model's $79 row shows the economics if that price is accepted; it is not a recommendation to charge more without evidence.

The strongest ownership demonstration is operational:

1. The customer controls the domain account and DNS access.
2. The printed URL uses that domain and a path that can be preserved.
3. Export contains every required hostname, path and destination, with enough metadata to recreate routing.
4. Restore a sample to an alternate deployment and scan the same physical code successfully.
5. Explain cancellation, retention, ongoing hosting and account handoff in plain language.

Open code alone cannot preserve a domain owned by a vanished supplier. Export alone cannot move DNS. A credible exit demonstration is stronger evidence of continuity than a broad “own your codes” promise. This is a proposed product test, not a claim that the current repository provides it.

Price ongoing hosting, updates and support explicitly. A perpetual licence may sell continued use of a version; the actual terms determine ongoing obligations. Neither “lifetime” nor “self-hosted” makes recurring maintenance free. The appropriate licence structure is a separate ownership and commercial decision; neither prior report supplies evidence sufficient to declare one licence mandatory for every buyer.

## 5. Private deployment: investigate the buyer before valuing the contract

DeepSeek makes a valuable distinction between free community installs and paid customer-specific deployments. They can be different businesses. Its evidence becomes too strong when a published price band is described as proof that enterprises pay those amounts.

The discrepancy matters. Quick Code's general pricing page advertises an enterprise range of **$10,000–$150,000+ per year**. Its dedicated enterprise page lists **$5,000, $10,000 and $20,000 one-time packages**, with installation, integration and support scope. The highest package includes a year of priority support. These pages do not resolve renewal price or contract mix. [General pricing](https://quickcode.digital/pricing), [enterprise packages](https://quickcode.digital/enterprise)

The supported conclusion is that a vendor markets substantial private-deployment packages. The unsupported leap is that qrwty can acquire several recurring $20k customers at a known probability or margin. A $20k one-time installation and a $20k annual subscription have different business value.

Ask a prospective buyer what prevents an ordinary cloud product from doing the job, who owns the budget, what integration is needed, and which requirements are actual purchase conditions. Private deployment may need SSO, audit, controlled updates and a recovery runbook. It does not follow that every buyer requires Kubernetes, airgap delivery, SCIM, a particular audit report and round-the-clock support. Scope those with the buyer rather than adopting an entire enterprise checklist first.

Use this **illustrative annual contract** to examine costs, not to forecast sales:

| Input or result | Bounded support | Heavy support |
| --- | ---: | ---: |
| Assumed recurring contract | $20,000/year | $20,000/year |
| Partner share | 20% | 20% |
| Incremental tools/operations | $1,200/year | $1,200/year |
| Support time | 48 hours/year | 120 hours/year |
| First-year delivery / sales time | 24 / 60 hours | 24 / 60 hours |
| Value assigned to time | $50/hour | $50/hour |
| First-year contribution after those costs | **$8,200** | **$4,600** |
| Renewal-year contribution with no new delivery/sales | **$12,400** | **$8,800** |

These contributions exclude shared company overhead, failed opportunities, taxes and extraordinary incidents. Renewal is assumed, not assured. One successful deal can absorb the cost of several unsuccessful pursuits. For example, 200 additional unrecovered sales hours cost another $10,000 at this time value, eliminating the bounded first-year contribution. Price a deployment fee separately if actual setup labour warrants it; do not disguise it as ARR.

The appropriate next step is one scoped, paid pilot through a buyer or an established service partner. A named prospect, budget owner and feasible support agreement would change this recommendation much more than another enterprise feature list.

## 6. Income economics: cash and founder time tell different stories

All inputs in this section are **assumptions**. The point is to expose the hurdle, not to predict which price or support level the market will accept. The 5% fee allowance is a modelling simplification, not a processor or tax quote.

Assume $100/month fixed cash overhead and eight hours/month of general acquisition/operations valued at $50/hour. That creates a $500 monthly hurdle before incremental support. Allow 6 minutes of support per individual account and 15 minutes per agency account per month. Partner rows reserve 20% of subscription revenue for the channel, in addition to 5% fees.

| Offer | Contribution/account after fees, channel and support time | Accounts for $500/month surplus | For $1,500 | For $3,000 |
| --- | ---: | ---: | ---: | ---: |
| $12 individual, direct | $6.40 | 157 | 313 | 547 |
| $49 agency, direct | $34.05 | 30 | 59 | 103 |
| $49 agency, 20% partner | $24.25 | 42 | 83 | 145 |
| $79 agency, 20% partner | $46.75 | 22 | 43 | 75 |

Formula: `accounts = round up((desired surplus + 100 + 8 × 50) / contribution per account)`. “Surplus” here is after assigning a value to ongoing founder time, before tax. It is not take-home income. These are a static installed-base calculation: extra onboarding and sales hours needed to grow the base are excluded here and included in the next section.

The eight hours are a low-overhead assumption, not a capacity guarantee at 100+ accounts. It must be revised upward if prospecting, partner management, incidents or support coordination demand more. At $49 through a partner, increasing support to 30 minutes/account reduces contribution to $11.75 and raises the $500 surplus requirement to **86 accounts**. One hour/account makes contribution negative at that price. A low support rate matters more than nominal software margin.

Cash can still be useful before the time hurdle is cleared. At 30 direct $49 accounts, after 5% fees and $100 fixed cash cost, monthly cash surplus is about **$1,297**. Assigning $775 to 15.5 hours of general work and account support leaves about **$522**. A founder happy with that cash/time exchange may rationally continue. The decision depends on the chosen income and time target, not an abstract SaaS margin benchmark.

## 7. Acquisition scenarios that start with reachable customers

Instead of assuming a growing flow of free signups, start with **40 qualified businesses contacted per month**. This is a founder-capacity assumption, not a researched market size. It requires finding 960 distinct suitable businesses over 24 months or explicitly recording repeat contacts. A named prospect list must eventually substantiate that capacity.

“Contact-to-paid” includes replies, demos, trials and purchase. It is not a conversion rate among people who already agreed to a demo. Assume $49/month, 2% monthly account churn, 20% channel share, 5% fees, $100 fixed cash cost, 15 minutes/account/month support, eight general hours/month and one additional sales/onboarding hour per new payer. The channel share is a conservative allowance for partner-assisted sales; direct acquisition has better arithmetic but may require more founder time.

For general work, eight hours allow roughly six hours for 40 short initial contacts and two hours for administration. Follow-ups, research and content can easily exceed this allowance. The one-hour-per-sale addition is also deliberately visible so actual experience can replace it. No source establishes these rates.

| Conditional scenario | Contact-to-paid | New accounts/month | Active accounts, month 24 | Month-24 MRR | Month-24 cash surplus | Month-24 surplus after time |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| No sales | 0% | 0 | 0 | $0 | −$100 | −$500 |
| Weak channel | 1% | 0.4 | 7.7 | $377 | $182 | −$334 |
| Working channel | 2.5% | 1 | 19.2 | $941 | $606 | −$84 |
| Strong channel | 5% | 2 | 38.4 | $1,883 | $1,312 | $332 |

The names describe hypothetical channel performance, not likelihood. Fractional accounts are scenario averages. The recurrence is `accounts[t] = accounts[t−1] × 0.98 + new accounts[t]`, starting at zero, with new accounts paying immediately. A sales delay would reduce early cash.

The no-sales row exposes a possible outcome rather than recommending two years of unsuccessful outreach. The bounded experiment below would stop or change direction much earlier.

Across 24 months, the working-channel case produces about **$7,106 cumulative cash surplus** but **−$6,927 after valuing time**. The strong-channel case produces about **$16,612 cash surplus** and **−$1,855 after time**. It becomes positive on a monthly economic basis before recovering the accumulated value of earlier effort. See the [full scenario data](data/channel-summary.csv).

**These are not forecasts or probability estimates.** Acquisition can be zero; conversion can be lower; $49 may not clear; agencies may churn differently. Two percent monthly churn retains about 78% of an initial cohort over twelve months, which is a demanding assumption to verify. Setup revenue, free-user costs, taxes, product development, extraordinary outages and additional staff are excluded. Fixed overhead includes a small operating allowance, not an enterprise resilience budget.

Forty contacts and a 2.5% purchase rate do not produce a meaningful income quickly. That is the practical question obscured by a broad market-size estimate. A successful next stage would need higher value per account, lower servicing cost, more efficient acquisition or a partner bringing additional retained customers. Every such improvement needs evidence.

## 8. Distribution and a bounded experiment

No channel is free. Content consumes research and writing time; open-source users consume maintenance and community time; partners need recruitment and enablement. Paid advertising is unattractive at low prices until realised retention and acquisition economics justify a capped test. The evidence does not prove that every paid campaign is impossible, nor that organic acquisition will work.

Run one primary test over **eight weeks, up to 40 founder hours and $300 discretionary cash**, excluding normal product operation. These are suggested decision limits, not newly confirmed founder preferences. Assume the product is ready; if it is not, only offer a clearly scoped pilot that can actually be delivered.

| Stage | Activity | Record and decision |
| --- | --- | --- |
| Weeks 1–2 | Identify 40 suitable shops/agencies; interview 6–8 about their last real job | Existing tool, client count, specific pain, budget owner, next print date; avoid hypothetical enthusiasm |
| Weeks 2–4 | Demonstrate one workflow and exact-URL handoff; offer the same $49 paid pilot to qualified prospects | Offers made, declines and reasons, payment, time per opportunity; limited pilot onboarding only |
| Weeks 4–8 | Deliver and follow use across a second billing period; expand to 80 total qualified contacts if capacity allows | Paid accounts, a second real client job, continued payment, support time and acquisition hours |
| At the limit | Review the recorded funnel and economics | Continue a larger test only if payment, repeated use and a plausible time budget align |

**Positive initial signal:** three independent businesses pay; at least two remain paid through a second billing period and use the service for another job or ongoing client work. At 80 contacts, three sales imply a 3.75% observed contact-to-paid rate, with substantial uncertainty. Paid pilots alone are weaker than retained, repeatedly active customers. An uncharged LOI or a free pilot is not equivalent to payment.

**Reason to stop or change the offer:** no paid account after 80 qualified contacts, or repeated evidence that current alternatives adequately solve the job. This is a spending decision for this segment/channel, not proof that qrwty has no market. Poor targeting, weak delivery and seasonality can also explain failure. Check those explanations before drawing a market-wide conclusion.

**Reason to extend without declaring success:** one or two paying accounts show repeated use, and a specific fix or clearer qualification could materially improve the funnel within another bounded test. Avoid rebuilding the product around several conflicting one-off requests.

Keep a small private-deployment inquiry opportunistic. Follow a concrete introduction or inbound requirement; do not simultaneously start a full enterprise sales motion, an SEO programme, a hardware pilot and a community launch inside the same 40-hour allowance. DeepSeek's proposed parallel tests collectively consume substantial time even when software development is free.

## 9. Hardware, field work and operational trust

The founder's field notes report **89 installed posters and 257 recorded scans**, about **2.9 recorded scans per poster** in aggregate. They also document label fading and an unsuccessful printer experiment. These establish real field experience and low aggregate engagement in that campaign. They do not measure unique visitors, exposure-to-scan conversion, the distribution across posters, or another sector's willingness to pay. [Field project README](https://raw.githubusercontent.com/ashfordhill/qr-code-tracking/main/README.md)

The commercial inference is to avoid a custom device now. Preprinted labels plus phone-based placement recording, or an existing printer, can test the operational job. The media's outdoor durability is a separate requirement from the software and should be evaluated for the specific installation. The failed prototype does not prove that all QR hardware businesses are unviable; the absence of a paying target buyer is the relevant investment constraint.

Fable's connected-device work finds more specialised possibilities: event-driven printing, rotating displays and scan-triggered action. Those change qrwty into an operational integration product. A rotating code can limit reuse of old screenshots; it does not by itself prove physical presence against live sharing. A logged request is not authenticated attendance or payment authorisation. Its proposed experiments should remain distinct from the first subscription offer. [Connected-device report](../ai-generated-reports-fable-5.1/connected-device-opportunities.md)

One local implementation detail matters to the trust proposition: the inspected redirect handler awaits the scan database write before returning the redirect. That means a logging-path failure can prevent successful redirection. It is not evidence that production is failing; it is a dependency to assess before selling continuity or an SLA. Generated acceptance requirements must govern any implementation change. This review changes no application code. [Redirect handler](../../services/qrwty/src/features/redirect/index.ts)

Track redirect availability and latency, restore success, domain renewal ownership, abuse reports and support time. These measure the ongoing service being sold. Request counts are useful basic reporting; avoid promising causal attribution, unique people or revenue lift from them.

## 10. What would change the recommendation?

| New evidence | Change justified |
| --- | --- |
| Several paying agencies repeatedly use the same workflow, with low support time | Invest in that workflow and the channel that acquired them |
| A partner brings retained customers at a measured acceptable commission and time cost | Expand through that partner type |
| A private buyer funds a scoped pilot and identifies procurement and renewal terms | Evaluate a separate private-deployment business case |
| Buyers accept $79+ for measurable ongoing value | Recalculate income targets and test willingness to renew |
| Prospects consistently prefer a one-time package and will pay bounded installation/support fees | Test a licence-and-services offer; report it separately from MRR |
| Field crews fund a workflow that cannot be served adequately with existing equipment | Reopen hardware with documented requirements and paid discovery |
| Interest remains free-only and no channel produces paid use within the agreed limits | Maintain qrwty as a useful project and allocate commercial time elsewhere |

The unresolved founder choices are the desired cash income, available ongoing hours, acceptable support obligations and willingness to do targeted selling. For this report I use a side-income goal, a ready-product assumption and explicit time limits. No clarification was necessary to produce the analysis, and these inputs can be changed without discarding it.

**My recommendation is to buy evidence with a small sales experiment.** qrwty has enough of a product idea to test. Neither another QR feature nor another market-size estimate will answer whether a reachable customer wants to pay for it.

## Method and limits

I reviewed both main reports, Fable's companion conclusions and selected supporting material, DeepSeek's modelling script and SaaS implementation brief, the local business introduction, generated element notes, selected product code and current public primary sources. I reproduced DeepSeek's simulation separately and supply my own deterministic economics. The [comparison](comparison.md), [source register](sources.md) and [validation record](validation.md) distinguish those activities.

There were no customer interviews, pricing experiments, verified qrwty revenue records or access to private customer analytics. This is a decision analysis from documents and public sources, not customer validation. Commercial figures in the new model are conditional assumptions; no empirical success probability, maximum attainable revenue or acquisition valuation is claimed.

# Open-core / self-hosted business model: comparables, benchmarks, hosting costs, buyer

Research date: 2026-10-30. GitHub numbers pulled live from api.github.com on 2026-10-30 (stars, open issues incl. PRs, license SPDX, last push). "Self-reported" = from company; "third-party estimate" = Sacra/Latka etc. (unverified).

## (a) Self-hosted comparables and gap in "dynamic QR + analytics"

### Takeaway
Mature OSS shorteners (Shlink, YOURLS, Kutt, Dub) are actively maintained and Docker-friendly, but only Shlink and Dub have first-class QR; of those only Dub is a commercial hosted business. Dedicated OSS "dynamic QR manager" projects exist but are all tiny (<=106 stars, mostly <30), so there is no dominant self-hostable QR-manager incumbent. The gap is "polished, maintained, QR-first self-hosted product", not "no code exists".

### Cited Findings
- Shlink: 5,392 stars, 25 open issues, MIT, last push 2026-10-24; latest release v5.1.8 (2026-10-21). Docker image is the documented deploy path ("drop the docker image on your container-based infrastructure"). Every short URL gets a QR endpoint (PNG/SVG, size, error correction). No hosted plan found; maintainer is one person (Alejandro Celaya). — [GitHub API](https://api.github.com/repos/shlinkio/shlink), [shlink.io](https://shlink.io/), [selfhosted guide](https://selfhosted-sh.pages.dev/shlink-url-shortener)
- YOURLS: 12,296 stars, 57 open issues, MIT, last push 2026-10-27; release 1.10.6 (2026-08-30). QR only via community plugins; no hosted plan found. — [GitHub API](https://api.github.com/repos/YOURLS/YOURLS), [comparison](https://selfhostyourself.com/categories/url-shorteners-link-tools)
- Kutt: 11,183 stars, 93 open issues, MIT, last push 2026-10-19; release v3.2.6 (2026-07-05). No native QR in core. README now warns kutt.it is NOT owned by the maintainers (domain lost); monetization is donations/sponsor crowdfund only. — [GitHub API](https://api.github.com/repos/thedevs-network/kutt), [README](https://raw.githubusercontent.com/thedevs-network/kutt/main/README.md)
- Polr: 5,092 stars, 216 open issues, GPL-2.0, last push 2024-05-28 (effectively dormant >2 years). — [GitHub API](https://api.github.com/repos/cydrobolt/polr)
- LinkAce (bookmark manager, not a redirector): 3,351 stars, GPL-3.0, last push 2026-10-26, release v2.6.3 (2026-10-21). — [GitHub API](https://api.github.com/repos/Kovah/LinkAce)
- Dub (dubinc/dub): 25,049 stars, 72 open issues, last push 2026-10-27. License: ~99% AGPLv3, `/ee` directories under a commercial Enterprise license; README calls itself "commercial open-source company... Open Core". Self-hosting guide exists (dub.co/docs/self-hosting/guide). Dub positions as "link attribution platform for short links, conversion tracking, and affiliate programs"; 11-50 employees, founded 2022-09-22. — [GitHub API](https://api.github.com/repos/dubinc/dub), [LICENSE](https://raw.githubusercontent.com/dubinc/dub/main/LICENSE.md), [README](https://raw.githubusercontent.com/dubinc/dub/main/README.md), [dub.co/pricing](https://dub.co/pricing)
- Dub pricing page (fetched 2026-10-30): 14-day trial, tabs for "Dub Partners" and "Dub Links". Partners: Business $81/mo (shown with toggle; yearly = 10% discount), Advanced $270/mo, Enterprise custom. Links tiers: Business 120K new links/yr, 3M tracked events/yr, 100 domains, 10 users, custom QR codes included; Advanced 600K links/yr, 12M events/yr, 250 domains, 20 users; Enterprise unlimited. Custom QR codes are a feature of Links plans on all tiers. Free tier is not shown on the page (an aggregator dated June 2026 also says no free tier; older aggregators say free/$25 Pro, i.e. pricing has moved up-market). Links-tab monthly prices were not extractable; the "$81" and "$270" shown appear tied to the Partners toggle. — [dub.co/pricing](https://dub.co/pricing), [FrontDesk Review, June 2026 (aggregator)](https://frontdeskreview.com/software/link-shorteners/dub/)
- Umami (analytics): 39,814 stars, 138 open issues, MIT, last push 2026-10-29; v3.4.1 (2026-10-23). Umami Cloud tiers (umami.is/pricing, fetched 2026-10-30): Hobby $0 (100K events/mo, 1 site, 6-mo retention, community support); Pro $20/mo (1M events included, $0.00003 per extra event, 20 sites, 10 members, 2-yr retention, API); Business $200/mo (10M events, $0.00002 extra, unlimited sites, 5-yr retention, session replay, heatmaps, white-label); Enterprise custom (SAML SSO, SLA). — [GitHub API](https://api.github.com/repos/umami-software/umami), [umami.is/pricing](https://umami.is/pricing)
- Plausible (analytics): 29,729 stars, 52 open issues, AGPL-3.0, last push 2026-10-30; latest tagged release v3.2.1 (2026-05-15). Pricing: third-party aggregators say Starter ~$9/mo for 10k pageviews, with higher tiers disagreeing across sources ($14/$19/$39/$69 for various tiers); plausible.io/pricing is JS-rendered and could not be fetched. Treat as approximate. — [GitHub API](https://api.github.com/repos/plausible/analytics), [Seline summary of aggregators](https://seline.com/blog/plausible-analytics-pricing)
- OSS QR-specific projects found via GitHub search (2026-10-30): Dynesshely/Live-QR 106 stars AGPL (live-stream QR, not a redirect manager); open-qr/openqr 12 stars AGPL (generator is self-hostable, but free dynamic codes/REST/MCP are only on hosted openqr.uk); tuxxin/qr-track 14 stars GPL-3.0 (self-hosted dynamic QR tracking); kspkr/QrForge 5 stars MIT (self-host dynamic codes, privacy-first analytics); QRocodilla/qrocodilla 5 stars MIT (QR studio + shortener, analytics, REST API); canerdogan/quoda 1 star MIT (Cloudflare Workers dynamic QR with analytics, last push 2026-08-05); FloB95/qrcodly 28 stars MIT (last push 2026-10-26); a "PHP Dynamic QR Code" script is said to have 300+ stars (third-party guide, Docker recommended). A $39.99 closed-source "QRForge" source-code product is sold on Selar. — [GitHub search API](https://api.github.com/search/repositories?q=dynamic+qr+code+self-hosted&sort=stars), [Quoda](https://github.com/canerdogan/quoda), [QRcodly](https://github.com/FloB95/qrcodly), [portalzine PHP Dynamic QR](https://portalzine.de/day-24-php-dynamic-qr-code-7-days-of-docker/), [QRForge Selar](https://selar.com/1v61112149)
- Maintainer monetization summary from sources: Shlink - no hosted plan or pricing found (not verified further; the /sponsor page 404s); YOURLS - none found; Kutt - donation/sponsor crowdfund only; Polr - dormant; Dub - full commercial SaaS + enterprise license; Umami - Cloud tiers above.

### Inferences
- Nobody OSS owns "QR-first, dynamic, analytics, Docker, maintained, good UX"; the tools with traction are shorteners where QR is a side feature. Dub is the only funded competitor with QR + analytics, but it has moved to marketing-attribution/affiliate and enterprise pricing, leaving a low-end gap.
- The shorteners with the biggest star counts (YOURLS, Kutt, Shlink) are not businesses; stars there signal demand for free self-hosting, not willingness to pay.

### Gaps
- Shlink/YOURLS sponsorship income (GitHub Sponsors / Open Collective) not retrieved.
- Dub's ARR/open-metrics not found in this pass (search returned no revenue figure); Dub Links per-tier monthly prices unresolved.
- Plausible's current official price list not fetchable; no verification of "PHP Dynamic QR Code" star count.
- No Docker-pull counts collected for any project.

## (b) Open-core business benchmarks

### Takeaway
Disclosed hard numbers are rare. Plausible (self-reported) is the clearest small-team benchmark: bootstrapped, AGPL, ~$1M ARR in 3.5 years, cloud-only monetization, self-host users give almost nothing in donations. No source discloses a self-host-to-paid-cloud conversion rate; the best proxy is Plausible's statement that donations from self-hosters are ~$300/month. Licensing has trended toward more restriction (AGPL, FSL, closed source) after growth.

### Cited Findings
- Plausible: first paid subscriptions May 2019 ($64 MRR); $1M ARR on 2 June 2022 (self-reported; $83,637 MRR, 7,000+ subscribers); released MIT Sept 2019, switched to AGPL Oct 2020 because of "risks associated with a permissive open source license" and corporations that could take advantage. — [Plausible blog "open source SaaS" (self-reported)](https://plausible.io/blog/open-source-saas)
- Plausible: a third-party Substack profile dated June 2026 states ~$3.1M ARR by late 2024 and "most users don't self-host" but gives no percentage and no company source; a search summary says Plausible's about page claims 18,000+ paying subscribers (not independently fetched). — [Tiny Empires (third party)](https://tinyempires.substack.com/p/inside-a-tiny-empire-plausible-analytics)
- Plausible Community Edition: same code as production cloud, AGPLv3, community-supported only (no premium support), some features cloud-only (funnels/revenue goals, ecommerce, APIs reported by comparison pages); company says self-host donations total about $300/month and that the CE restrictions protect the managed service from resellers. — [Plausible CE announcement (via ingest.plausible.io mirror per search result)](https://ingest.plausible.io/blog/community-edition)
- Cal.com: Sacra (third-party estimate) says ARR $2.9M end-2024, $6.2M end-2025, ~$11M Sept 2026; enterprise ~60% of recurring revenue, Platform API usage ~25%; pricing from $12 to $28/user/mo, Platform API $299/mo (500 bookings) and $2,499/mo (5,000); funding $7.4M seed (Dec 2021) + $25M Series A (Apr 2022, $150M post-money). — [Sacra](https://sacra.com/c/cal)
- Cal.com licensing reversal: with v6.4 (reported 17 Apr 2026) the commercial edition moved from source-available to closed source; free code relaunched as MIT "Cal.diy", self-host only and "at user's own risk"; enterprise self-hosters get a private repo; stated reason is AI-tooling security risk. Sacra's page says April 2025 for the same event, which conflicts with AlternativeTo's April 2026 report (likely typo; use 2026). GitHub today: calcom/cal.com 49,568 stars, MIT, 1,586 open issues. — [AlternativeTo](https://alternativeto.net/news/2026/4/cal-com-is-going-closed-source-with-a-major-shift-in-its-license-strategy/), [GitHub API](https://api.github.com/repos/calcom/cal.com)
- PostHog: official docs say MIT Docker Compose self-host is offered but with limited/no commercial support, recommends Cloud for most, and all paid-plan features are Cloud-only. Revenue figures conflict: Sacra $9.5M ARR (Mar 2024), later Sacra page ~$58M/yr (Feb 2026, truncated snippet); Latka $3.3M (2024) is an outlier. Cloud/self-host revenue split not disclosed. GitHub 40,533 stars, 5,119 open issues; license shows NOASSERTION (mixed MIT + ee). — [PostHog self-host docs](https://posthog.com/docs/self-host), [PostHog self-host disclaimer](https://archive.posthog.com/docs/self-host/open-source/disclaimer), [Sacra $58M](https://sacra.com/research/58m-year-hedgehog-of-product-analytics/), [Sacra $9.5M](https://sacra.com/research/posthog-anti-modern-data-stack/), [GitHub API](https://api.github.com/repos/PostHog/posthog)
- n8n: Series C $180M at $2.5B valuation, Oct 2025, led by Accel (Nvidia-backed); ARR ~ $40M reported by FT July 2025 per aggregator; later reported SAP stake at $5.2B (May 2026, single aggregator). GitHub 209,158 stars (license NOASSERTION; fair-code "sustainable use" license not confirmed in this pass). — [Sifted](https://sifted.eu/articles/n8n-hits-2-5bn-valuation), [valueadd VC (aggregator)](https://valueaddvc.com/blog/n8n-valuation-2026-5-2b-40m-arr-and-how-it-compares-to-zapier-and-make), [GitHub API](https://api.github.com/repos/n8n-io/n8n)
- Sentry: moved from BSL to its own Functional Source License (FSL) in Nov 2023; FSL converts to Apache/MIT after 2 years; rationale: BSL's per-product variables made compliance review hard, and to prevent "harmful free-riding" while allowing broad use. GitHub 45,683 stars, NOASSERTION. — [Sentry blog](https://blog.sentry.io/introducing-the-functional-source-license-freedom-without-free-riding), [TechCrunch](https://techcrunch.com/2023/11/20/with-functional-source-license-sentry-wants-to-grant-developers-freedom-without-harmful-free-riding/amp), [GitHub API](https://api.github.com/repos/getsentry/sentry)
- Ghost: nonprofit foundation, 100% self-funded by Ghost(Pro) managed hosting revenue (company statement); ChartMogul case study (undated in snippet) cites ~$750k ARR in an earlier period; Ghost(Pro) launch-era stat: 2,300 customers, ~$175k ARR. No verified 2025 revenue found. MIT license; 55,643 stars. — [ghost.org/open](https://ghost.org/open/), [ChartMogul story](https://chartmogul.com/stories/ghost/), [GitHub API](https://api.github.com/repos/TryGhost/Ghost)
- Umami Cloud and Dub pricing: see section (a).
- GitLab: GitHub mirror gitlabhq/gitlabhq 24,550 stars, NOASSERTION (CE MIT / EE proprietary). Revenue/licence details not researched this pass.

### Inferences
- Open-core stories that have disclosed revenue (Plausible, Ghost) monetize the hosted service and treat self-host as marketing/trust; self-host donations are negligible ($300/mo for Plausible).
- Venture-scale outcomes (Cal.com, n8n, PostHog) rely on enterprise contracts and usage-based platform/API revenue, not small self-serve SMB cloud plans; Cal.com's enterprise share (~60%) is a pattern a sub-$10k-ARR QR tool cannot copy directly.
- Trend: projects restrict (AGPL -> closed, FSL) as they grow; a new entrant can pick AGPL + `ee/` directory (the Dub model) from day one.

### Gaps
- No disclosed self-host to paid-cloud conversion rate found for any company (PostHog, Plausible, Cal.com, Umami, Dub). Do not invent one.
- Umami Cloud revenue, GitLab and Ghost 2025 revenue, Dub ARR, n8n licence text not retrieved. Latka/Sacra/aggregator numbers are unverified estimates.

## (c) Hosting costs and unit economics

### Takeaway
Compute for a small redirect service is trivially cheap: Hetzner shared VMs are ~EUR 5.49/month with 20 TB EU traffic; Cloud Run requests cost $0.40 per million plus CPU/memory; Fly egress is $0.02/GB. Redirects are tiny (~hundreds of bytes), so egress is not the cost driver at 1M-100M/month; database writes for scan logging and ops time are.

### Cited Findings
- Hetzner Cloud (price-list changed several times in 2026: Apr 1 portfolio +30-37%, Jun 15 uneven repricing): CX23 now EUR 5.49/mo (was 3.99); CAX11 (ARM) EUR 5.99 (was 4.49); CX53 EUR 29.49; CPX22 EUR 19.49; CCX13 EUR 42.99; prices ex VAT, excl. IPv4 (EUR 0.50/mo extra). Existing instances keep old price; rescale reprices. Hetzner's own page lists "from" EUR 5.99 cost-optimized / EUR 6.49 regular / EUR 43.49 dedicated and notes some plans "currently not available". — [PrivateDevOps summary of Hetzner price page, 2026-06-15](https://privatedevops.com/news/hetzner-june-2026-cloud-price-increase-what-to-do), [Hetzner cloud page](https://www.hetzner.com/cloud/), [search summary](https://findstack.com/resources/hetzner-price-increase-2026)
- Hetzner traffic: EU servers include 20 TB/mo, US at least 1 TB, Singapore 0.5 TB; overage EUR 1.00 (~$1.20) per TB. — [EgressCost, read 2026-09-30](https://egresscost.com/hetzner)
- Fly.io (docs fetched 2026-10-30; Ashburn): shared-cpu-1x 256MB $2.19/mo, 512MB $3.69, 1GB $6.70; shared-cpu-2x 2GB $13.39; performance-1x 2GB $33; volumes $0.15/GB/mo; dedicated IPv4 $2/mo; shared IPv4 + IPv6 free; certs free for first 10 hostnames, then $0.10/mo each; outbound data $0.02/GB (NA/EU), $0.04 (APAC/Oceania/SA), $0.12 (Africa/India); Managed Postgres from $38/mo (Basic), storage $0.28/GB; support $29/mo Standard. Fly's own example: small web app + Managed Postgres ~ $44/mo. — [Fly.io pricing](https://docs.fly.io/about/pricing)
- Google Cloud Run (fetched 2026-10-30): requests $0.40 per 1M (request-based billing; Tier 1 default), CPU $0.000018 per vCPU-s (instance-based/idle-min table) and memory ~$0.0000025/GiB-s in the services table; free tier 180,000 vCPU-s, 360,000 GiB-s, 2M requests per month (us-central1). Cloud SQL / egress not fetched. — [Cloud Run pricing](https://cloud.google.com/run/pricing)
- Egress benchmarks for comparison: AWS $0.09/GB, Azure $0.087/GB, GCP $0.12/GB first tier, Cloudflare R2 $0.00/GB (verified 2026-09). — [EgressCost](https://egresscost.com/hetzner)

### Inferences (arithmetic, not sourced figures)
- Cloud Run requests alone: 1M ≈ $0.40 (or free under the 2M tier); 10M ≈ $4; 100M ≈ $40, before CPU-seconds (an assumed 20 ms redirect on 1 vCPU ≈ $0.36 per million, roughly doubling the request cost) plus Postgres. So roughly $0.5-$1 per million redirects on serverless compute, excluding the database.
- Egress: a 301/302 response is ~0.5 KB; 100M redirects ≈ 50 GB ≈ $1 on Fly ($0.02/GB) and well inside Hetzner's 20 TB. QR scan landing pages that serve HTML/images are far heavier; user destinations carry the bulk traffic, not the redirect.
- Baseline always-on stack: Hetzner CX23/CAX11 (~EUR 6) + one extra volume/backup, or Fly 2 small machines (~$4-13) + Managed Postgres ($38) = ~$45-55/mo; a self-run Postgres on the same Hetzner box keeps total under ~EUR 10-15/mo for 1M-10M/mo; 100M/mo (~40 req/s average, bursty) fits on a CX53-class box (EUR 29.49) if scan writes are batched.
- Hetzner's 2026 repricing (+30-170%) is a real input risk; budget 30-50% headroom.

### Gaps
- Cloud SQL, Cloud Run egress, CDN (Cloudflare/Bunny) and domain/TLS prices (Let's Encrypt free; domain ~$10-15/yr) not retrieved with citations.
- No measured redirect CPU-cost benchmarks; no real-world cost reports from comparable small services found.

## (d) The buyer: who self-hosts and what they'd pay

### Takeaway
I found no direct evidence (survey or thread) of willingness to pay among self-hosters for QR/redirect tools. Evidence available is indirect: donations are minimal and the paying customers in comparable businesses are teams/enterprises wanting hosted convenience, support, SSO, data residency.

### Cited Findings
- Plausible reports self-hosting donations of ~$300/mo in total, and ships CE without premium support. — [Plausible CE announcement](https://ingest.plausible.io/blog/community-edition)
- Cal.com keeps a self-hosted option mainly as part of its enterprise-compliance offering (private repo for enterprise self-hosters). — [AlternativeTo](https://alternativeto.net/news/2026/4/cal-com-is-going-closed-source-with-a-major-shift-in-its-license-strategy/), [Sacra](https://sacra.com/c/cal)
- Umami Cloud reserves SAML SSO, SLA, onboarding, invoice billing for Enterprise; Dub reserves SAML/SSO, audit logs, Slack support/SLA, dedicated success manager for Advanced/Enterprise. — [Umami pricing](https://umami.is/pricing), [Dub pricing](https://dub.co/pricing)
- Self-hosters compare the shorteners mainly on setup effort ("low" for Shlink/YOURLS/Kutt) and QR availability (Shlink built-in; others plugin/none). — [selfhostyourself.com directory](https://selfhostyourself.com/categories/url-shorteners-link-tools)
- One OSS QR author notes dynamic codes are only as durable as the domain they point at; self-hosting protects only if you own the domain before printing (a durability/continuity pitch for QR). — [DEV Community post by QRcodly author, via search](https://dev.to/flob95/it-started-with-a-birthday-present-why-i-built-an-open-source-qr-code-generator-394i)

### Inferences
- Likely paying segment: agencies/SMBs wanting managed hosting and EU data residency, plus organizations wanting an enterprise licence (SSO, audit logs, support). Homelab/r/selfhosted users are the distribution channel, not the revenue.

### Gaps
- No r/selfhosted or Hacker News threads were retrievable with willingness-to-pay statements (search returned only blog/directory pages). No data on municipalities or EU SMB self-host procurement. Needs a dedicated Reddit/HN pass.

## Known failure modes of open-core (sources)

### Takeaway
Forks by cloud providers and licence-change backlash are real but mostly hit infrastructure projects (Elasticsearch, Redis, Terraform); small apps face low conversion and support burden instead.

### Cited Findings
- Elasticsearch -> AWS OpenSearch (2021 fork of 7.10); Redis licence change -> Valkey (Linux Foundation, backed by AWS/Google/Oracle, within a week); HashiCorp -> OpenTofu (MPL 2.0, Linux Foundation). — [AWS Open Source Blog](https://aws.amazon.com/blogs/opensource/why-aws-supports-valkey/), [Matt Asay via Nordot](https://nordot.app/1147421556457849485), [arXiv study](https://web3.arxiv.org/pdf/2411.04739)
- Counterview (Matt Asay): impact on developers is overstated; "no customer really wants" Valkey/OpenTofu/OpenSearch. — [Matt Asay](https://nordot.app/1147421556457849485)
- Goodwill risk when restricting: Cal.com going closed source drew criticism; Sacra flags it as risk to developer goodwill. — [Sacra](https://sacra.com/c/cal), [AlternativeTo](https://alternativeto.net/news/2026/4/cal-com-is-going-closed-source-with-a-major-shift-in-its-license-strategy/)
- Support burden: PostHog and Plausible both refuse commercial support for self-hosted. — [PostHog disclaimer](https://archive.posthog.com/docs/self-host/open-source/disclaimer), [Plausible CE](https://ingest.plausible.io/blog/community-edition)
- Maintainer fragility: Polr dormant since May 2024 with 216 open issues; Kutt lost its original hosted domain and says kutt.it may be a phishing site. — [GitHub API Polr](https://api.github.com/repos/cydrobolt/polr), [Kutt README](https://raw.githubusercontent.com/thedevs-network/kutt/main/README.md)

### Inferences
- For a QR tool, the practical risks are (1) competitor/reseller hosting the AGPL code (mitigated by AGPL + cloud-only features, as Plausible did), (2) near-zero self-host conversion, (3) trust: a dynamic QR printed on physical media creates a long-lived hosting obligation if you run the cloud.

### Gaps
- No quantified conversion or churn data; no QR-specific failure case studies found.

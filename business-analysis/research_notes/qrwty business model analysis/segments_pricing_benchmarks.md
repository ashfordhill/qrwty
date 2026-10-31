# qrwty: segments, willingness to pay, GTM and financial benchmarks (fact base, researched 2026-10-30)

Method note: ~18 search/fetch calls. Many benchmark numbers come from secondary blogs that cite primary reports (KeyBanc, OpenView, ChartMogul) without linking them; these are flagged "secondary". Primary reports were not retrieved. Vendor-published and self-reported figures are flagged.

## Which 3-4 segments show the strongest evidence of paying for dynamic QR + analytics, and at what price point?

### Takeaway
Direct evidence of segment-level payment is thin in what I could retrieve. The strongest hard evidence is on price points: the market clusters at about $5-$19/mo for entry plans. Restaurants have the largest usage but a consumer-preference headwind; CPG/GS1 is a real structural driver but is mostly enterprise and needs GS1 Digital Link. Segment-by-segment typical code counts and price sensitivity were mostly NOT found (see Gaps).

### Cited Findings
- Competitor entry price points (vendor-published, 2026): Uniqode Essential $9/mo (15 dynamic codes, 60 days analytics); QR Code Generator (QRCG) from $9.99/mo; QR TIGER $7-$89/mo; Flowcode from $5/mo with 14-day trial; Scanova Essential $9/mo; MetriQR $5/$15/$39 per month. Aggregated by a search summary of G2/Capterra/vendor pages, not individually verified — [G2 QR TIGER](https://www.g2.com/products/qr-tiger/pricing), [Scanova cost guide](https://scanova.io/blog/qr-codes-cost-guide), [PricingSaaS MetriQR](https://pricingsaas.com/companies/metriqr), [Capterra QR TIGER](https://www.capterra.com/p/10041460/QR-TIGER/)
- Free tiers are small: one rival-published comparison says QR Code Generator's free tier has 2 dynamic codes and QRStuff's 10 (competitor-biased source) — [QRStuff comparison](https://www.qrstuff.com/compare/qrstuff-vs-qr-code-generator)
- Indie comparable pricing (self-reported via Stripe-verified TrustMRR): QR-Hero free plan = 2 QR codes / 50 scans per month; paid "Hero" plan $19/mo unlimited — [TrustMRR QR-Hero](https://trustmrr.com/startup/qr-hero)
- Restaurants: Ipsos tracker (July 2025) reports 65% of US adults have used a QR menu (42% in Aug 2022); 58% of users would like to return to paper (as relayed by secondary summary) — [search summary citing Ipsos](https://www.duck-hub.com/blog/qr-code-menu-statistics). Toast (POS vendor, Sept 2024, n=850) found 81% prefer physical menus, 1% QR — [Toast](https://pos.toasttab.com/blog/on-the-line/qr-code-menu-insights). Restaurant-side adoption data (e.g. ">85% of restaurants") is weak/vendor-sourced.
- GS1 Sunrise 2027: sources describe end-2027 as the target for retail POS to read 2D codes alongside linear barcodes; accepted 2D formats are QR with GS1 Digital Link URI and GS1 DataMatrix; it is industry-driven, not legally mandated, no fine, and linear codes are not being phased out. All from vendor blogs; GS1.org returned 403 and was not read — [Videojet](https://www.videojet.com/us/homepage/resources/learn/gs1-sunrise-2027.html), [Brady](https://www.bradyid.com/resources/articles/sunrise-2027-gs1-barcode-updates), [Uniqode CPG playbook (vendor)](https://www.uniqode.com/unique-angles/s/playbooks/gs1-qr-codes-cpg-sunrise-2027), [Dynamsoft](https://www.dynamsoft.com/blog/insights/gs1-sunrise-2027-transition-to-2d-barcodes-for-global-commerce/)
- Etsy sellers of QR signs (scan-to-pay, Google review signs, wifi signs, salon signs) are an observable micro-segment of print-product sellers; Etsy keyword "qr code" 2.74M monthly searches (Etsy tool data) — [RankHero](https://www.rankhero.com/keywords/qr-code)

### Inferences
- Defensible candidate segments for a $5-$30 product: (1) restaurants/cafes/salons and other local SMBs (many use cases, price-sensitive, likely to cluster at $9-$19); (2) print shops, sign makers, Etsy sellers and small agencies who resell/bulk-manage codes (pricing ladder to $39+); (3) real estate/events (short-lived campaigns, need editable destination, low code count) — inference only, no data found; (4) small CPG/food brands needing GS1 Digital Link-style resolvers — the only segment with a dated external catalyst, but enterprises dominate and GS1 resolvers have different requirements.
- Restaurants' paper-menu backlash suggests value in "editable destination" (menu swap) rather than QR-as-primary-menu growth.

### Gaps
- No sourced typical code counts per segment, or price-sensitivity data for real estate, events, nonprofits, education, field service, municipalities. No Shopify/Canva/WordPress install counts retrieved. Bitly pricing not retrieved.

## What churn, conversion and CAC assumptions are defensible for a self-serve $5-$30/month product?

### Takeaway
Use monthly logo churn of roughly 4-7% (base ~5%) for a sub-$30 self-serve product; free-to-paid 2-5% (3.7% from one ChartMogul relay); self-serve CAC payback ~6-12 months on typical secondary figures. Indie QR sellers self-report 5-6% churn.

### Cited Findings
- Lenny's Newsletter (Feb 2022, Patrick Campbell/ProfitWell data on ~13,000 SaaS companies): B2C SaaS good 3-5% monthly, great <2%; B2B SMB/mid-market (avg customer <$1K/mo) good 2.5-5%, great <1.5%. Month-1 churn commonly 5-50%. Price-tier table is paywalled — [Lenny's](https://www.lennysnewsletter.com/p/monthly-churn-benchmarks)
- Secondary summaries: SMB SaaS 3-7% monthly logo churn; ChartMogul-cited median ~4.1-4.7% for SMB-heavy SaaS; annual billing cuts churn ~40%; card-based self-serve cohorts churn 2-3x sales-led — [Adam Fard](https://adamfard.com/blog/saas-churn-rate-benchmark), [Kalungi](https://kalungi.com/blog/saas-churn-rate-benchmarks), [Visionary Marketing](https://visionary-marketing.co.uk/blog/saas-churn-benchmarks-2026) (secondary, not verified against ChartMogul)
- ChartMogul/Growth Unhinged/ProductLed Conversion Report (Jan 2026, 200 B2B products): median free-signup-to-paid within six months 8%; ~29% of respondents at 2.5-7.5%, ~25% at 10-15%. Secondary relays give freemium 3.7%, opt-in trial 8.9%, opt-out (card) trial 31.4%; other sources give different values (4%-55% range) — [ChartMogul report](https://chartmogul.com/reports/saas-conversion-report/), [secondary](https://blog.mean.ceo/?p=11198)
- Freemium commonly cited 2-5% (range 1-10%) — [Monetizely](https://www.getmonetizely.com/articles/freemium-conversion-rate-the-key-metric-that-drives-saas-growth-3588c) (secondary)
- Self-serve CAC median ~$700-$940, payback 8-11 months (other blogs 6-12); SMB sales-assisted $1,200-$2,000, payback 8-19 months — [SaaS Hero/Maxio relay](https://www.saashero.net/strategy/maxio-cac-benchmarks-b2b-saas/), [SaaS Hero/Stripe relay](https://www.saashero.net/google-ppc/stripe-cac-benchmarks-b2b-saas/) (secondary, enterprise-skewed; not for a $10 product)
- Gross margin: "pure SaaS median" 82%, private B2B SaaS 75% — [Mean.ceo](https://blog.mean.ceo/b2b-saas-pricing-benchmarks/) (secondary pricing blog)
- Indie QR comparables' self-reported churn: 6% (Flippa listing 12298618) and 5% overall (Flippa 11785340), per listing titles/search summary — [Flippa 12298618](https://flippa.com/12298618-profitable-qr-code-saas-with-98-margins-10-3k-arr-2-000-users-6-churn-scalable-low-overhead-seo-strong-with-ai-search-visibility), [Flippa 11785340](https://flippa.com/11785340-profitable-2-year-old-qr-code-generator-and-biolink-business-huge-potential)

### Inferences
- A $9-$19 plan with ~5% monthly churn implies ~20-month average lifetime and LTV roughly $150-$300 gross-margin-adjusted; this caps affordable CAC to ~$50-$100 (about 3:1 LTV:CAC) — far below the $700-$940 benchmark, so only organic/SEO/marketplace channels are viable. Paid-heavy modelling would not pencil out.
- Dynamic QR codes printed on physical media create switching cost (printed codes break if cancelled), which may lower churn for established customers but also creates a trust issue; no data found.

### Gaps
- Could not retrieve KeyBanc/SaaS Capital/OpenView/Bessemer/Paddle primary reports; the sub-$50/mo churn table in Lenny's is paywalled. Hardware gross margin (30-40%) benchmark not researched or sourced.

## What have small QR/link SaaS businesses actually earned (MRR) and sold for?

### Takeaway
Observable QR micro-SaaS are tiny: tens of dollars to ~$900 MRR. Flippa-listed QR SaaS were around $10K ARR with sale prices not extractable.

### Cited Findings
- QR-Hero (founded Nov 2025): MRR $548, 27 active subscriptions, all-time revenue $6,225, $19/mo plan; Stripe-verified via TrustMRR, not for sale; synced 2026-10-31 — [TrustMRR](https://trustmrr.com/startup/qr-hero)
- CrazyQRCode (founded 2026-06-14): MRR $0, 0 subscriptions — [TrustMRR](https://trustmrr.com/startup/crazyqrcode.md)
- Flippa 12298618 (SOLD; seller Norway, buyer Netherlands): listing title states ~$10.3K ARR, ~2,000 users, 6% churn, 98% margin, SEO-driven; search summary says monthly profit $838 and an MRR field of $29 (inconsistent). Sale price not retrievable (page truncated) — [Flippa](https://flippa.com/12298618-profitable-qr-code-saas-with-98-margins-10-3k-arr-2-000-users-6-churn-scalable-low-overhead-seo-strong-with-ai-search-visibility). Self-reported.
- Flippa 11785340 (SOLD; QR-Kode.no QR generator + biolink; seller Norway, buyer US): search summary says MRR $267, 1,112 active subscribers, 5% churn; price not retrievable — [Flippa](https://flippa.com/11785340-profitable-2-year-old-qr-code-generator-and-biolink-business-huge-potential). Self-reported.
- Another Flippa QR SaaS (13823122, browser-only, "$5 monthly profit") — [Flippa](https://flippa.com/13823122-fully-built-qr-code-generator-saas-platform-13-tools-scanner-runs-entirely-in-the-browser-no-server-no-database-0-running-costs-deploys-in-5-minutes)
- Indie Hackers community statistics (secondary roundup): ~50% of active indie hackers at $0-$1K MRR — [Mean.ceo](https://blog.mean.ceo/?p=11175)

### Inferences
- Realistic year-1 to year-2 outcome for a solo QR SaaS: $0-$1K MRR; ~$10K ARR is the visible "sellable" tier. Revenue multiples cannot be stated from this research.

### Gaps
- No acquire.com/MicroAcquire QR listings found; no sale prices or multiples retrieved; no Indie Hackers QR revenue posts found; TrustMRR QR-Verse page 404.

## How dominant are free generators in search, and what does that imply for acquisition cost?

### Takeaway
I could not retrieve Google volume/difficulty for "qr code generator" itself. Available data is partial (Etsy-keyword data and app-store tracker); treat as a gap.

### Cited Findings
- RankHero "qr code" figures (2.74M searches/mo, KD 34/100, CPC $0.62) are for ETSY search, not Google — [RankHero, updated 2026-09-02](https://www.rankhero.com/keywords/qr-code). An earlier summary quoted $0.58 CPC; the page itself says $0.62.
- "ai qr code generator" ~1,670 searches/mo, CPC $0.80 (tool/source not verified) — search result listing only.
- Competitors win through SEO: the Flippa QR SaaS listing touts "SEO strong with AI search visibility" as its acquisition channel (self-reported).

### Inferences
- Free-tool-dominated SERPs imply SEO against head terms is expensive; niche long-tail ("qr code for menu", "gs1 digital link qr", self-hosted) is the credible route.

### Gaps
- Google keyword volume/KD/CPC for "qr code generator", marketplace install counts (Shopify/WordPress/Canva), Product Hunt, r/selfhosted, print-shop partnership costs: not researched/found.

## What do the FTC/FBI/CISA say about QR phishing, and does it push buyers toward branded/custom domains?

### Takeaway
FTC and FBI warn consumers to check the destination URL and for tampered stickers; neither advice was found to recommend branded domains. CISA guidance not found. Privacy: scan-log IPs are likely personal data under GDPR.

### Cited Findings
- FTC consumer alert (Dec 6, 2023): check the URL for misspellings before opening; do not scan QR codes in unexpected/urgent messages; update phone and use MFA; no statistics — [FTC](https://consumer.ftc.gov/consumer-alerts/2023/12/scammers-hide-harmful-links-qr-codes-steal-your-information)
- FBI IC3 PSA220118 (Jan 2022): criminals tamper with digital and physical QR codes (stickers over originals); verify URL; don't download apps via QR — [IC3](https://www.ic3.gov/PSA/2022/PSA220118). FBI PSA250731 (July 2025): unsolicited packages with QR codes ("brushing") — [IC3](https://www.ic3.gov/PSA/2025/PSA250731)
- A reported "587% increase" in QR phishing (relayed by news; original source not verified) — [ChannelNews](https://www.channelnews.com.au/ftc-warns-about-increased-qr-code-scams/)
- GDPR: IP addresses are personal data since CJEU Breyer (C-582/14, 2016); hashing is disputed; legitimate interest vs consent debated; ePrivacy 5(3) applies to cookie-style tracking; non-EU routing servers imply third-country transfer. All from vendor blogs, EDPB guidance not verified — [Unitag](https://www.unitag.io/blog/european-qr-code-platform-gdpr-dpp-compliance/), [QRPlanet](https://qrplanet.com/blog/article/the-gdpr-qr-code-auditor-is-your-qr-code-provider-really-gdpr-compliant)

### Inferences
- Because government advice is "inspect the URL", a short third-party redirect domain is a trust liability; custom/branded domains and self-hosting are a credible premium/positioning lever, but I found no sourced evidence that buyers pay more for it. EU positioning (no raw IP storage, EU hosting) is a differentiator.

### Gaps
- No CISA guidance, no accessibility sources (WCAG/ADA), no CCPA sources, no evidence on branded-domain demand.

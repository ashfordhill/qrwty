# Hosted dynamic-QR SaaS competitive landscape (research notes, fetched 2026-10-30)

Method caveats: pricing pages were fetched via a summarizing fetch tool on 2026-10-30 (US-based, USD unless noted). Several vendor pages returned 403/404 or ambiguous output, so some figures come from third-party aggregators and are flagged "3P". G2/Capterra/Trustpilot pages were not directly readable except Trustpilot for qr-code-generator.com; other scores come from search snippets and may be stale. No revenue estimates are given where no source exists. Where "monthly" is quoted for annual-only plans, it is the annual-billed monthly equivalent.

## What does an SMB pay per month for 1-50 dynamic codes with analytics ("price for 10 dynamic codes with analytics")?

### Takeaway
For ~10 dynamic codes with scan analytics, the cheapest paid hosted options are about $7-10/month (QR Tiger Regular, Scanova Lite, QRCodeChimp Starter); mainstream brands (Uniqode, Flowcode, Bitly) cost $15-29/month, and QRCodeChimp's free tier covers 10 codes at $0. Most low tiers are annual-only, and every vendor ties code activity to the subscription.

### Cited Findings
Comparable "10 dynamic codes + scan analytics" figure (cheapest plan that fits >=10 codes):
- **QR Tiger**: Regular US$7/month, 12 dynamic codes, unlimited scans, 1 user, 500 API requests/month; page has a Month/Year toggle but annual prices were not shown. Free plan: 3 dynamic codes, 500 scans per code, QR Tiger ads. — [QR Tiger plans page](https://Enterprise.Qrcode-Tiger.com/payment) (fetched 2026-10-30); 3P agreement: [Capterra](https://www.capterra.com/p/10041460/QR-TIGER/)
- **Scanova**: Lite US$9/month billed annually (~$108/yr), 10 codes, unlimited scans. Basic $5/mo (3 codes), Standard $35/mo (50 codes, white-label landing pages), Pro $75/mo (500 codes, 5 users, 1 custom domain), all billed annually; no API below Enterprise. — [Scanova pricing](https://scanova.io/pricing/) (fetched 2026-10-30)
- **QRCodeChimp**: Free forever tier = 10 dynamic codes, 1,000 scans/month, 1 user ($0). Starter US$9.99/mo monthly or $6.99/mo yearly, 50 codes, 10,000 scans/mo. Pro $19.99 / $13.99 yearly, 300 codes. Ultima $49.99 / $34.99, 900 codes, unlimited scans. Page says only USD accepted though INR shown; 15-day refund on first purchase. API/white-label cells on page were ambiguous. — [QRCodeChimp pricing](https://www.qrcodechimp.com/pricing) (fetched 2026-10-30)
- **me-qr**: Free ($0, ads on all codes, up to 10,000 codes created, 1-year analytics); Lite $16.99/mo or $10.50/mo yearly (one ad-free code, 100,000 created codes, 3-yr analytics); Premium $27.99/mo or $15.08/mo yearly (API, ad-free). Page's stated savings do not match its own numbers. Whether free dynamic codes carry limits was not stated. — [me-qr pricing](https://me-qr.com/pricing) (fetched 2026-10-30)
- **Uniqode**: dynamic plans billed annually only; 3P listings give Starter ~$5/mo (3 codes, 25k scans/yr), Lite ~$15/mo (~$180/yr, 50 codes, 500k scans/yr, bulk, forms), Pro ~$49/mo (~$588/yr, 250 codes, 1M scans/yr, API, 90-day analytics), Plus ~$99/mo (500 codes, 3 seats). Uniqode's own page fetch showed Basic $9 / Core $49 labels and said only annual subscriptions exist, conflicting with the 3P list; treat tiers as unconfirmed. — [Tekpon/Fitgap/Hackceleration via search](https://www.hackceleration.com/labs/uniqode-pricing); [Uniqode pricing](https://www.uniqode.com/pricing) (fetched 2026-10-30, ambiguous). Free plan = static codes only; 14-day trial of dynamic.
- **Flowcode**: Free = 2 Flowcodes, analytics for up to 500 scans, 1 seat. Pro Plus $25/mo billed annually (up to 50 codes, analytics up to 6,000 scans, 3-5 seats). Growth $250 (annual only, from 150 codes, 10,000 scans, API + CRM integrations). Enterprise custom. — [Flowcode pricing](https://www.flowcode.com/pricing) (fetched 2026-10-30)
- **Bitly (QR codes)**: Free 2 QR codes/mo (ads), Core $10/mo annual-only ($120/yr) 5 QR/mo, 30-day data; Growth $29/mo ($348/yr) 10 QR/mo, 500 links, 4-month data, custom domain registration included; Premium $199/mo ($2,388/yr) 200 QR/mo, 1-year data. Clicks/scans unlimited. Note: "QR codes per month" is a creation cap, not necessarily the number of live codes. — [Bitly pricing](https://bitly.com/pages/pricing) (fetched 2026-10-30)
- **QR Code Generator Pro (qr-code-generator.com, Bitly-owned)**: Starter 2 dynamic codes / 10,000 scans / 1 user (monthly or annual billing possible); Advanced 50 codes, unlimited scans, 2 users, 3,000 API req/mo (annual only); Professional 250 codes, 5 users, 10,000 API req/mo (annual only). Prices rendered as "EUR -" in the fetch (EUR excl. VAT), so exact prices were NOT captured. 14-day trial no card. — [QRCG pricing](https://www.qr-code-generator.com/pricing/) (fetched 2026-10-30). Trustpilot reviewers cite ~$120 and $220 annual charges (see complaints).
- **QR Code KIT** (3P only; official site not reachable): Free 2 dynamic codes, 100 scans/code/mo; Starter $20/mo yearly or $25 monthly (100 codes, 10k scans/code, bulk); Pro $50 yearly / $65 monthly (1,000 codes, unlimited scans, 10 members, 1 custom domain); Enterprise $120-150 (5,000 codes, SSO, API; sources conflict). — [Toolradar via search](https://toolradar.com/tools/qrcodekit/pricing); [Capterra](https://www.capterra.co.uk/software/1023571/QR-Code-Kit)
- **Delivr** (official page blocked, 3P/search only): trial at $0 with 3 codes and 1,000 views cap; PLUS $25/mo monthly with 100 dynamic codes; PRIME listed ~$50/mo; 10% annual discount; sources disagree on free-forever vs time-limited trial. — [Delivr plans (search snippet)](https://delivr.com/plans); [G2 pricing](https://www.g2.com/products/delivr/pricing)
- **Canva**: official page says it makes static or dynamic codes; 3P reviews say free is static URL-only with Canva logo and dynamic needs paid Pro. — [Canva QR](https://www.canva.com/qr-code-generator); **Adobe Express**: static, URL only per Adobe FAQ, account needed to download per one review. — [Adobe Express](https://www.adobe.com/express/feature/image/qr-code-generator). **Chrome**: free share-menu QR, reportedly static with no analytics (single secondary source, not Google docs). — [MakeUseOf](https://www.makeuseof.com/create-qr-code-chrome-webpage), [Beebom](https://beebom.com/how-create-qr-codes-for-urls-google-chrome)

### Inferences
- Lowest comparable "10 dynamic codes with analytics" figure: $0 (QRCodeChimp free, 10 codes, 1,000 scans/mo), then ~$7 (QR Tiger), ~$9 (Scanova), ~$9.99 monthly / $6.99 annual-equivalent (QRCodeChimp Starter), ~$10.50-16.99 (me-qr), ~$15 (Uniqode Lite, 3P), $25 (Flowcode Pro Plus), $29 (Bitly Growth). Annual cost for a small business therefore ~$84-348.
- A self-hosted product competes against a $7-$29/month anchor; the real pitch is lock-in/continuity, not price.

### Gaps
- Exact QR Code Generator Pro euro prices not captured; Uniqode official tiers unconfirmed; QR Code KIT and Delivr official pages unreachable; Chrome behavior not confirmed from Google docs.

## Custom domain / bring-your-own-domain by vendor and tier

### Takeaway
BYO domain is gated to upper tiers or add-ons nearly everywhere, which is the precise lock-in lever; QR Tiger's own page lists "use your own domain (white label)" even on Regular ($7), the most permissive found.

### Cited Findings
- QR Tiger: "Use your own domain (white label)" listed on Regular, Advanced; "1 white label" on Premium. — [QR Tiger plans](https://Enterprise.Qrcode-Tiger.com/payment) (page text; verify with checkout before relying)
- Scanova: 1 custom domain included on Pro ($75/mo annual); extra domains $120/domain/yr; users +$60/yr each. No domain below Pro. — [Scanova pricing](https://scanova.io/pricing/)
- Uniqode: custom domain only as a $2,000/domain/year add-on on Plus; more included on Business+. — [Uniqode pricing](https://www.uniqode.com/pricing)
- QR Code KIT: 1 custom domain on Pro ($50-65/mo), more at Enterprise (3P). — [Toolradar](https://toolradar.com/tools/qrcodekit/pricing)
- Bitly: custom domain registration "complimentary" with Growth and above. — [Bitly pricing](https://bitly.com/pages/pricing)
- Flowcode: comparison table row "Custom redirect domain: 5" but plan column unclear. — [Flowcode pricing](https://www.flowcode.com/pricing)
- QRCodeChimp: custom domain/white-label marked only on Ultima 2x+ (inferred, unclear). — [QRCodeChimp pricing](https://www.qrcodechimp.com/pricing)
- QR Code Generator Pro: no custom domain mentioned; "Whitelabelling" is a sales-form add-on. — [QRCG pricing](https://www.qr-code-generator.com/pricing/)

### Inferences
- Even with a vendor custom domain, DNS must point at the vendor's servers, so the domain owner can leave only if they can migrate redirect data; a self-hostable stack with an exportable redirect table is the structural differentiator.

### Gaps
- Not verified whether any vendor lets customers export the redirect table / scan history for migration.

## Owners, founding, funding, customer counts, published scale

### Takeaway
Only a few vendors publish hard numbers: Bitly (325k paying customers, $75M ARR at Dec 2021, 10B monthly clicks/scans) and Egoditor (10M+ users); Uniqode disclosed $25M Series A. Most others publish nothing verifiable.

### Cited Findings
- Bitly bought Egoditor GmbH (Bielefeld, Germany; maker of qr-code-generator.com / QR Code Generator PRO) announced 2021-12-01; Bitly then reported 325,000 paying customers, 5M active users, 10B monthly clicks and scans, profitable, >$75M ARR; Egoditor claimed >10M users in 190+ countries. Dealroom's ~$13.5M price estimate is unconfirmed and dated 2022. Bitly owner: Spectrum Equity (Wikipedia). — [TechCrunch](https://techcrunch.com/2021/12/01/bitly-makes-first-acquisition-with-qr-code-leader-egoditor/); [Bitly press](https://bitly.com/pages/resources/press/bitly-emerges-as-global-saas-leader-with-acquisition-of-egoditor); [Wikipedia](https://en.wikipedia.org/wiki/Bitly)
- Uniqode (formerly Beaconstac; rebranded Jan 2024): HQ New York with Bangalore office; $25M Series A led by Telescope Partners with Accel (announced 2023-01-17); total raised reported $27M (Craft) or $29.1M (PitchBook); founding year conflicts (2009 per PitchBook as Mobstac lineage vs parent formed ~2022); ~75 employees in 2023. — [YourStory](https://yourstory.com/2023/01/beaconstac-raises-25-mn-led-by-telescope-partners-accel); [PitchBook](https://pitchbook.com/profiles/company/52125-13); [Craft](https://craft.co/uniqode-phygital)
- Flowcode: founded 2019 (Coverager); Wellfound shows $30M total raised over 11 rounds, CB Insights shows 2 fundings (latest seed March 2024, Allen & Company named); sources conflict; no revenue found. — [Wellfound](https://wellfound.com/company/flow-code/funding); [CB Insights](https://www.cbinsights.com/company/flowcode/financials)
- Bitly Europe is shown under qr-code-generator.com "About us" and footer says it is a Bitly product. — [QRCG pricing](https://www.qr-code-generator.com/pricing/)

### Gaps
- Owner/HQ/founding/funding not found for QR Tiger, QRCodeChimp, Scanova (known Mobstac-adjacent? not verified), QR Code KIT, Delivr, me-qr; Canva/Adobe/Google are large companies (not researched). Scan/code-created counts not found for most vendors.

## Features, security/privacy posture

### Takeaway
Feature sets converge (bulk, landing pages, forms, UTM, API on higher tiers). Compliance claims were not verified from primary sources in this pass.

### Cited Findings
- Uniqode Lite adds bulk creation and QR Code Forms; Pro adds GPS tracking and API (3P). — [Hackceleration](https://www.hackceleration.com/labs/uniqode-pricing)
- QR Code KIT Starter adds bulk creation, page templates (3P). — [Toolradar](https://toolradar.com/tools/qrcodekit/pricing)
- Flowcode includes landing pages, ShortURLs; Growth adds CRM integrations/API. — [Flowcode pricing](https://www.flowcode.com/pricing)
- Scanova Standard+ removes "Powered by Scanova" footer on landing pages. — [Scanova pricing](https://scanova.io/pricing/)
- me-qr and Bitly Free show ads/limits (me-qr ads on all free codes). — [me-qr](https://me-qr.com/pricing)

### Gaps
- GDPR, SOC 2, ISO, GS1 Digital Link support per vendor were not verified (not captured in fetched pages); needs follow-up on trust/security pages.

## Free-tier terms, trial expiry complaints, review scores

### Takeaway
"Free trial then dead codes" is the dominant complaint: QRCG Pro's Trustpilot score is 1.3/5 on 9,341 reviews, driven by codes disabled after trial and billing disputes. Uniqode G2 is ~4.8.

### Cited Findings
- QR Code Generator Pro Trustpilot: 1.3/5 from 9,341 reviews; themes: "free" plans where dynamic codes stop after a short period, unexpected annual renewals, hard-to-find cancel, refund refusals, AI-chatbot support. — [Trustpilot](https://www.trustpilot.com/review/www.qr-code-generator.com)
- QRCG Pro Capterra 2.4/5 (82 reviews); G2 ~2.2-2.4 (24-27 reviews; snapshots vary). — [Capterra](https://www.capterra.com/p/177261/QR-Code-Generator-Pro/reviews/); [G2](https://www.g2.com/products/qr-code-generator-pro)
- Uniqode G2 4.8/5 (469 reviews on one comparison page; SaaSWorthy 4.8 from 400 ratings); no overall Capterra or Trustpilot score captured. — [G2 compare](https://www.g2.com/compare/flowcode-vs-uniqode-qr); [SaaSWorthy](https://www.saasworthy.com/product/uniqode/reviews)
- Scanova: 14-day trial, dynamic codes stop when trial ends. — [Scanova pricing](https://scanova.io/pricing/)
- QR Code Generator PRO: 14-day trial; QRFY: 7-day; QR Tiger free: codes deactivate at 500-scan cap; Uniqode: codes deactivated at subscription end (Trustpilot support reply, Jan 2026). Source is a sponsored "News from Our Partners" article promoting FreeQR (treat as biased but incident quotes cite SiteJabber/Capterra/PissedConsumer/Trustpilot). — [North Penn Now](https://northpennnow.com/news/2026/apr/02/your-qr-code-stops-working-the-moment-you-stop-paying/)
- Capterra reviewer: paid $220 for a year yet code disabled when free trial expired (via same article). SiteJabber: charity gala program code hit an error page after 14-day trial; reactivation $120.
- QR Tiger official: codes "only stop working once the plan expires"; annual plan gives a fixed number of codes with no yearly top-up. — [search snippet of QR Tiger FAQ](https://www.capterra.com/p/10041460/QR-TIGER/)
- Uniqode's own blog claims one missed renewal can deactivate every dynamic code including printed ones (vendor claim). — [Uniqode blog](https://www.uniqode.com/blog/qr-code-basics/qr-codes-expiry)
- No G2/Capterra/Trustpilot scores captured for QR Tiger, Flowcode, Bitly, QRCodeChimp, Scanova, QR Code KIT, Delivr, me-qr.

### Gaps
- Review scores for 8 vendors missing; Reddit/HN threads on "surprise price increases" not found (searches returned vendor blogs, not threads); no specific price-hike incident documented.

## Documented shutdowns / broken printed codes; open-source alternatives recommended

### Takeaway
One documented vendor failure found (SQR, a lifetime-deal QR service reportedly shut down); trial-expiry breakage is widespread but is a business-model feature, not a shutdown. Shlink is the most-cited self-hosted base but is not a QR product itself.

### Cited Findings
- SQR (lifetime-deal QR service on AppSumo): reviewers report plan-change emails after LTD purchase, custom domains removed, then business shut down / sqr.co no longer resolving. — [AppSumo SQR reviews](https://appsumo.com/products/square-qr/reviews/); [AppSumo SQR Q&A](https://appsumo.com/products/square-qr/questions/) (user anecdotes; no primary shutdown notice found)
- Self-hosted candidates: Shlink (MIT, PHP; `/qr-code` endpoint per short URL, editable destination, import from bit.ly/YOURLS); YOURLS (MIT, PHP, click stats, no built-in QR); Dub (AGPL, Next.js). — [selfhosted-sh Shlink](https://selfhosted-sh.pages.dev/shlink-url-shortener); [European Alternatives](https://european-alternatives.eu/category/url-shorteners)
- QR-specific self-host: PHP Dynamic QR Code reported archived; QR Track (Tuxxin, open source); QRForge ($39.99 source code, not OSS); Mini QR (free OSS, static generator). — [QRStuff self-hosted guide](https://www.qrstuff.com/feeds/blog/self-hosted-dynamic-qr-code); [Tuxxin QR Track](https://qr-track.tuxxin.com/compare/hovercode); [QRForge](https://selar.com/1v61112149)
- Non-self-host "no subscription" newcomers: QRever (one-time payment), Truly Free QR, FreeQR. — [Indie Hackers thread](https://www.indiehackers.com/post/no-monthly-fee-for-qr-codes-dynamic-hosted-pages-that-are-stuck-to-a-wall-for-years-hyK0emMYwPvTc7gblo7l)
- QRStuff notes small teams' total self-host cost often exceeds SaaS once DevOps time counted. — [QRStuff](https://www.qrstuff.com/feeds/blog/self-hosted-dynamic-qr-code)

### Inferences
- Gap in market: Shlink/YOURLS give redirects and clicks but no QR-focused UX (QR styling, per-code scan-over-time charts, destination editing for non-technical users); that is qrwty's wedge.

### Gaps
- No Reddit r/selfhosted / r/smallbusiness or Hacker News threads were retrieved (search tool returned none); no confirmed acquisition-driven code breakage (e.g. Bitly/Egoditor integration) found; no price-increase incident with a date/source.

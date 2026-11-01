# Presence-proof stations and the digital stamp rally market (2024-2026)

NOTE: Only ~8 searches succeeded before the search tool rate-limited; no pages were fetched in full. Several findings are search-engine summaries of pages, flagged below. Items not found are in Gaps.

## 1. How big and how priced is the organiser-pays stamp-rally/check-in market, and static QR vs presence-proof hardware?

### Takeaway
Japanese municipal digital stamp rallies are bought as software-service projects, mostly QR and/or GPS, with no evidence of presence-proof hardware. Documented prices: service fees from JPY 30,000/month; one municipal tender capped at JPY 5,000,000 for a QR-based (no GPS) rally. Participation per campaign is typically hundreds to ~7,000.

### Cited Findings
- One vendor-listed service advertises JPY 0 initial fee and JPY 30,000+/month (vendor claim; shown in search summary, vendor not identified) — [biz.ne.jp / search result](https://www.biz.ne.jp/subject/toi_detail.html?tid=947166) (attribution uncertain; verify before use)
- A municipal commissioning call set a total budget cap of JPY 5,000,000 and specified that GPS was not required; stamps acquired by scanning QR codes — [biz.ne.jp tender listing](https://www.biz.ne.jp/subject/toi_detail.html?tid=947166) (search summary; date not confirmed)
- Yokohama proposal materials list QR, quiz and GPS as selectable acquisition methods — [Yokohama City PDF](https://www.city.yokohama.lg.jp/business/kigyoshien/syogyo/shotengai/corabox-shoten.files/0820attoyokohamateiann1.pdf)
- Kobe: GPS stamp is obtainable within 50 m of the set point — [Kobe City PDF, 2026-08-04](https://www.city.kobe.lg.jp/documents/85703/20260804134120.pdf)
- Fukuroi City 2026 spec: dedicated QR scanning is the base method; tourist facilities may use GPS — [Fukuroi spec PDF](https://www.city.fukuroi.shizuoka.jp/material/files/group/46/sutanpurari-_2026_siyousyo.pdf) (search summary; the Fuji-city attribution in the summary was unclear)
- Kagoshima pref: indoor facilities use QR, outdoor statues etc. use GPS — [Kagoshima pref](https://www.pref.kagoshima.jp/ab10/shitashimitanoshimimanabu/r8stmp.html)
- Some services combine GPS and QR (location checked at QR scan) to prevent fraud — vendor claim — [EnjoyTokyo](https://www.enjoytokyo.jp/digitalstamprally/)
- Participation: Gifu "Mi-Trip" industrial tourism rally 5,303 (R5), 4,077 (R6), 7,440 (R7) — [Gifu pref PDF](https://www.pref.gifu.lg.jp/uploaded/life/496872_2836245_misc.pdf)
- Matsumoto region (Nagano) water-story rally R5: 121 participants vs target 50 — [Nagano pref PDF](https://www.pref.nagano.lg.jp/matsuchi/matsuchi-kikaku/documents/r5_09.pdf)
- Kyoto Nishijin rally prior year: 429 participants (counted with >=1 stamp) — [Kyoto City PDF](https://www.city.kyoto.lg.jp/sogo/cmsfiles/contents/0000355/355269/kaito.pdf)
- Kanagawa R6: 256 NFT digital stamps distributed across 3 venues, 30 completers — [Kanagawa PDF](https://www.pref.kanagawa.jp/documents/6377/shiryo.pdf)
- Shizuoka subsidy Q&A: prizes, production and honoraria are eligible costs — [Shizuoka pref PDF](https://www.pref.shizuoka.jp/_res/projects/default_project/_page_/001/062/850/shitsumonkaitou.pdf)

### Inferences
- Organisers (municipalities, tourism boards, shopping streets) pay, often from subsidies; the buyer buys a campaign (software + prizes), not hardware. Static QR on posters/signs is the cheap default; GPS is added for outdoor spots.
- Small campaign sizes (100s-7,000 people) imply low value per campaign, which limits hardware budget.

### Gaps
- Not found: named pricing for SpotTour, Furari, PIAZZA, COCOAR, Lakka, Spotto, Travel Stamp; Taiwan/Korea/China (WeChat mini-program) equivalents; market size in JPY.

## 2. Where does cheating with static codes matter, and what do presence-proof methods look like?

### Takeaway
Rotating/short-lived codes plus geofence/device binding are the documented anti-proxy approach in attendance; evidence is mostly academic/vendor. No evidence found of tourism organisers paying for rotating codes.

### Cited Findings
- 2023 peer-reviewed paper (IJACSA, UEA portal) proposes dynamic QR + geofencing + device IMEI binding for attendance fraud; authors report tested attacks blocked — [UEA research portal](https://research-portal.uea.ac.uk/en/publications/fraud-mitigation-in-attendance-monitoring-systems-using-dynamic-q/)
- Vendor pages claim codes expiring in ~7-30 s (marketing, unverified) — [example](https://gleeful-whisper-cloud.lovable.app/modules/qr-code-attendance)
- Freelancer forum answer: random timing, twice-daily taking, rotating codes; none foolproof — [Freelancer.de](https://www.freelancer.de/projects/data-processing/need-automate-taking-attendance-large)

### Inferences
- Rotating codes defend against screenshot sharing but not a friend remotely relaying a live image; real defence needs a second factor (location/device).

### Gaps
- GPS-spoofing in location games (academic), Zoom/Teams/gym/iClicker/Poll Everywhere rotating-code practice, NFC vs QR evidence, documented photo-of-QR sharing cases: not searched/found.

## 3. Loyalty/visit programs for small venues

### Takeaway
Loopy Loyalty charges USD 25-95/month; the stamp-card category is cheap SaaS.

### Cited Findings
- Loopy Loyalty: Starter $25/mo ($250/yr), Growth $69/mo ($690/yr), Ultimate $95/mo ($950/yr); 15-day trial; no free plan — [Loopy docs](https://docs.loopyloyalty.com/en/articles/803301-what-are-your-pricing-plans), [Loopy pricing](https://www.loopyloyalty.com/pricing); older third-party listings of $15/$39/$50 are outdated — [SaaSWorthy](https://www.saasworthy.com/product/loopy-loyalty/pricing)

### Inferences
- A venue-priced benchmark of ~$25-95/month for software with no hardware.

### Gaps
- Stamp Me, Flok pricing; whether they use static QR, rotating QR or NFC: not found.

## 4. Weatherproof connected stations and cost

### Takeaway
No pricing found; the one data point is Estimote's 2018 LTE beacon.

### Cited Findings
- Estimote LTE Beacon (2018): ~$129 plus a data plan of ~$2/device/month after 3 months — [App Developer Magazine](https://appdevelopermagazine.com/estimote-lte-beacons-hit-the-market/) (search summary)
- Kontakt.io Card Beacon ~$29 (2016-era); Estimote volume pricing by quote — [Estimote forum](https://forums.estimote.com/t/how-much-is-the-estimate-beacon-if-i-order-300/946)

### Gaps
- Eco-Counter prices (search failed, rate-limited); QR stations with counters in parks; any seller of weatherproof connected QR station: not found.

## 5. Sponsored-visit pricing

### Takeaway
Only documented figure: Niantic 2017 cost-per-visit under $0.50 per daily unique visit.

### Cited Findings
- Niantic: sponsors pay under $0.50 per daily unique visit; CPV model — [Game Developer](https://gamedeveloper.com/business/-i-pokemon-go-i-dev-says-sponsored-locations-can-earn-it-nearly-0-50-per-visitor), [TechCrunch 2017-05-31](https://techcrunch.com/2017/05/31/pokemon-go-sponsorship-price)
- An earlier $0.15 figure was reportedly corrected — [PYMNTS](https://pymnts.com/news/2017/niantic-charges-pokemon-go-sponsors-up-to-50-cents-per-visitor)
- ~3,000 McDonald's Japan stores were sponsored in 2016; TechCrunch estimated up to $3M/day at the max rate (estimate) — [TechCrunch](https://techcrunch.com/2017/05/31/pokemon-go-sponsorship-price)

### Inferences
- Those are GPS-verified visits at massive scale; no 2024-2026 rate found.

### Gaps
- Foursquare deals, Snap/Instagram, mall apps: not searched.

## 6. Event/attendance check-in hardware

### Takeaway
Cvent OnArrival is quote-only: annual licence plus per-registrant fee.

### Cited Findings
- OnArrival pricing: annual licence fee + per-registrant fee; discounts for government/nonprofit/education/multi-year — [AWS Marketplace](https://aws.amazon.com/marketplace/pp/prodview-z477xx66z42ai), [Capterra](https://www.capterra.com/p/33227/OnArrival/); a reviewer called it too expensive for standard events (Slashdot/Capterra)

### Gaps
- Planning Center, Breeze, Eventbrite pricing: not found.

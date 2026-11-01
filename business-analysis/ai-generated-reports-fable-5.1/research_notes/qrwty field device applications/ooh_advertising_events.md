# OOH / local advertising attribution with QR codes: market for placement-level engagement data (2024-2026)

Research depth note: ~11 tool calls, mostly search-snippet level (one page fetch each for Oppizi and Uniqode). Many figures are vendor-published and flagged as such. Sections cover the four key questions.

## Who already pays for OOH attribution, and how big is the measurement layer?

### Takeaway
US OOH is a ~$9.5B/yr market, but the audience-measurement layer (Geopath) is tiny relative to spend (<0.05%). Attribution is sold as lift/footfall studies to big advertisers (StreetMetrics, Vistar), not as per-placement scan data for small items.

### Cited Findings
- US OOH revenue reached about $9.46B in 2025, up 3.6% (2024: ~$9.1B); digital was 36.3% of total — [MediaPost/OAAA, 2026](https://www.mediapost.com/publications/article/413543/); 2024 figure and context via [eMarketer](https://www.emarketer.com/content/ooh-revenues-hit--9-5-billion--proving-its-endurance-digital-first-world)
- Format split ($6.72B billboards, $1.68B transit, $491.7M street furniture, $557.9M place-based) is cited by a third-party site claiming OAAA data; not verified against OAAA — [bigboards.io](https://bigboards.io/market/format-mix/)
- Geopath and OOH measurement operate on less than 0.05% of OOH spend (2024 financials) — [OOH Today](https://oohtoday.com/ooh-measurement-is-infrastructure-not-a-feature) (snippet-level, not fetched in full)
- Geopath and OAAA selected Ipsos for a next-generation audience measurement pilot (Advance Measurement System), H2 2026 — [Media4Growth](https://www.media4growth.com/ooh-industry/industry-news/geopath-and-oaaa-advance-next-gen-ooh-measurement-with-ipsos-pilot-82937?amp=1)
- StreetMetrics (vendor press release, Dec 2024) ran a multi-format NYC attribution study with PMG across five media operators (taxi toppers, street-level digital/static, bulletins); reported exposed people 214% more likely to convert. Method is lift/footfall, not QR — [BusinessWire](https://businesswire.com/news/home/20241205222950/en/StreetMetrics-Launches-First-Ever-Multi-Format-Measurement-and-Attribution-Study-for-the-Out-of-Home-OOH-Industry); methods in [StreetMetrics help center](https://intercom.help/streetmetrics-help-center/en/articles/8144858-attribution-overview-faqs)
- Vistar Media (part of T-Mobile Advertising Solutions) sells OTS lift studies with control/test groups and partners with Mira and Happydemics for online-activity/brand measurement — [Advanced Television, Feb 2026](https://www.advanced-television.com/2026/02/18/vistar-media-happydemics-partner-to-enhance-dooh-brand-measurement); [Signmedia](https://www.signmedia.ca/?p=44652)
- AdQuick (vendor) defines DOOH QR engagement rate as scans / verified impressions — [AdQuick](https://www.adquick.com/answers/platforms-tools/how-do-i-evaluate-a-dooh-platforms-qr-code-tracking-performance)

### Inferences
- Paying customers for attribution are large brands/agencies buying study-level lift; per-placement scan data for tiny items is not a recognised paid category in what I found.
- Nobody here published measurement-layer revenue (Geopath/Vistar/StreetMetrics); only the "<0.05% of spend" ratio, which implies a small pool.

### Gaps
- Vendor revenue for Geopath, Vistar, StreetMetrics; share of Lamar/Clear Channel/Outfront ads with QR; programmatic DOOH pricing tied to measured traffic — not found.

## Does any product tie a scan to the exact physical placement at creation time?

### Takeaway
Found none. Dynamic-QR vendors resolve scan location from the scanner's IP (city level), with optional scanner-GPS; the placement is inferred by using one code per placement, not by capturing GPS when the item is posted.

### Cited Findings
- Uniqode (vendor docs): location comes from the IP of the scanner's network via a third-party provider; accuracy "varies by city and country"; VPNs, bots, direct URL visits and republished photos distort it — [Uniqode docs](http://docs.uniqode.com/en/articles/4824948-why-do-i-see-scans-from-places-where-my-qr-code-hasn-t-been-placed)
- Uniqode GPS analytics records the scanner's coordinates (Pro/Plus/Business+ plans), with a "Location Source" column in exports — same doc; [GPS doc](https://docs.uniqode.com/en/articles/3800555-how-to-enable-and-view-gps-analytics-for-qr-codes). GPS needs user permission (so it is the scanner's location, not the poster's)
- A March 2026 comparison blog says Uniqode is city-level only, contradicting Uniqode's docs — [QRMax blog](https://all-blogs-8rl.pages.dev/QRMax.Blog/comparisons--qr-code-analytics-platforms-compared) (competitor-authored; prefer Uniqode docs)
- Generic guidance: most QR location tracking is IP-based (city/region/country); one vendor claims 50-70% city-level and up to 99% country-level accuracy in the US (unverified, vendor blog) — [dev.to](https://dev.to/devrabb/qr-code-location-tracking-how-to-see-where-your-codes-are-being-scanned), [Linkbreakers](https://linkbreakers.com/help/article/does-a-qr-code-show-location-accuracy-limits-and-examples)
- Standard practice for per-placement tracking is a separate dynamic code per placement/city and naming conventions; Bitly's poster guide covers tagging and comparing sites — [Bitly](https://bitly.com/blog/qr-code-poster/)
- Flowcode geo features: could not confirm from any source.

### Inferences
- "Scan location is not placement location" is a documented limitation (Uniqode lists travelers, VPNs, republished photos). Capturing placement GPS at install time appears to be an unserved gap, but absence of evidence from ~3 searches is not proof.
- Per-placement separation today is manual (create a code, label it), which puts the burden on the poster-hanger.

### Gaps
- Flowcode, Bitly feature docs, QR Tiger/Beaconstac placement features not checked directly.

## Scan-per-impression rates documented for QR on posters/OOH

### Takeaway
No rigorous, independent OOH scan-rate study found. Only vendor/blog estimates, which conflict.

### Cited Findings
- Vendor blog (u2l.ai) says posters/flyers/OOH scan rates are lower, averaging "10-18%"; no methodology, and implausible as scans per impression — [u2l.ai](https://u2l.ai/blog/qr-code-offline-marketing.md)
- Linkbreakers (vendor): print ads in magazines/newspapers typically 1-4% scan rate; no billboard figure — [Linkbreakers](https://linkbreakers.com/help/article/qr-code-scan-rate-benchmarks-by-industry)
- Consumer-reach survey: 13% (headline 11% in URL) of Europeans had scanned a QR-enabled outdoor ad (CBS Outdoor, 2012; dated) — [Econsultancy](https://econsultancy.com/11-of-europeans-have-scanned-a-qr-enabled-outdoor-ad/)
- eMarketer tracks CTV QR scan rate as scans / impressions; not OOH — [eMarketer](https://www.emarketer.com/industry-kpis/ctv-qr-code-scan-rate)

### Inferences
- The "1-2%" hypothesis in the brief is not confirmed; 1-4% for print is the only vendor-stated range, and the 10-18% figure should not be used.

### Gaps
- Scans per impression for street posters, flyers, community boards: not found. Per-poster scan counts for churches/farmers markets/nonprofits: not found.

## Would flyer services, event organisers or ad-space owners pay for per-placement data? Pricing evidence

### Takeaway
Flyer distribution already sells GPS proof-of-delivery bundled into the price; QR tracking is mentioned as an optional add-on. Evidence of anyone paying separately for per-placement scan data is absent. Print is cheap, so per-item analytics must be near-free to fit.

### Cited Findings
- Oppizi (vendor) US/Canada flyer pricing: <10,000 flyers $0.23-$1.40 each; 10k-50k $0.13-$0.40; >50k $0.11-$0.25; 1,000-flyer example $760-$1,300. Includes GPS tracking of when/where flyers are handed out, photo/video proof, live updates — [Oppizi](https://oppizi.com/us/en/flyer/how-much-does-a-flyer-campaign-cost-in-the-usa-and-canada/)
- Oppizi (vendor): standard door-to-door mission $120 including tracking system; hand-to-hand 1,000 flyers from $774 in Brisbane; direct mail $0.50-$1/piece; free QR generator; ambassadors can be paid per conversion including QR scans; live ambassador map — [Oppizi search results](https://oppizi.com/us/en/flyer/flyer-distribution-cost-effective/), [Oppizi AU](https://oppizi.com/post/how-much-does-a-trackable-flyer-campaign-cost-in-australia) (snippet-level)
- Blip Billboards (vendor): self-serve DOOH marketplace, pay per display, reports starting around $10-20/day, $0.01 per display claimed, price varies with location, time of day and demand; ~1,300 billboards in US/Canada; recommends QR/vanity URLs for measurement but no scan-based billing found — [Blip](https://www.blipbillboards.com/blog/ultimate-guide-to-billboard-ads-under-dollar100/), [Blip help](https://help.blipbillboards.com/benefits-of-blip), [G2](https://www.g2.com/products/blip-billboards/pricing)
- Print costs (low-quality price guides/vendor pages, snippet-level): 100 full-colour 18x24 posters ~$738 at one shop, 1,000 ~$860; another quotes $3-$12 per 18x24 sheet; flyers $120-$600 per 1,000 (4x6) or ~$0.20 each — [Conquest Graphics](https://conquestgraphics.com/bestsellers/18x24-posters-500-quantity), [PrintKeg](https://www.printkeg.com/blogs/tips/poster-printing-cost), [Rising Sun guide](https://new.risingsunartscentre.org/news/how-much-do-flyers-cost-2026.html) (the last is of doubtful quality)

### Inferences
- Oppizi's GPS proof is placement-level data collected at delivery time, but it serves the distributor-to-client audit, not scan attribution; shows clients value location proof but it is bundled, not priced alone.
- Dynamic pricing by measured engagement exists only for digital screens (Blip); no marketplace found pricing small physical posters/community boards that way.

### Gaps
- Pricing for poster-hanging / guerrilla / sticker services; AdQuick pricing; community board pricing; event-organiser willingness to pay; churches/farmers-market scan data — not found in this pass. Sticker/guerrilla QR campaign data only appeared as a QRStuff vendor blog ([QRStuff](https://www.qrstuff.com/feeds/blog/qr-code-guerrilla-marketing)), not read.

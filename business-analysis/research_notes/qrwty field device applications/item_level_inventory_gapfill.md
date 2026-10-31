# Item-level inventory economics: gap-fill (fetched 2026-10-31)

Method note: WebFetch/WebSearch, ~22 calls. Fetched pages are summarized by a small model, so figures are as reported by the fetch tool. Blocked (HTTP 403): atlasRFIDstore (tags and readers), RFID Journal tag-cost page. Not fetched: Impinj/Avery/Zebra investor materials, Barcodes Inc, InventoryLab, Boxem, WFA/Extensiv/IBISWorld, Brother RJ pages, Progressive Grocer/Supermarket News. Square and Shopify pages did not expose serial number info.

## (1) RFID UHF tag prices and reader prices

### Takeaway
No current (2024-26) primary price list for inlays or readers could be fetched. Only dated RFID Journal figures (about 5-8 cents at very large volume) and vendor/market-research ranges (~$0.05-0.15 high volume) were found. No reader prices were obtained.

### Cited Findings
- RFID Journal (search result summaries, undated/old): 2009 Invengo 5.8-cent inlay at 5M volume; Avery Dennison 7.9 cents earlier; an editor's estimate of ~5 cents at 10M+ and "approximately 7 cents in large volumes" - [Invengo 5.8-cent](https://www.rfidjournal.com/news/invengo-debuts-in-the-u-s-market-with-5-8-cent-inlay/81954/), [RFID Journal Q&A](https://www.rfidjournal.com/question/what-is-the-price-of-rfid-inlays) (snippets only; not fetched)
- 2026 vendor guide: passive UHF inlays $0.05-$0.15 per tag at high volume; a market-research summary projects $0.03-0.05 by 2027 vs ~$0.06-0.08 in 2024 (search-summary, low authority) - [CPCON](https://cpcongroup.com/rfid-chip-cost/), [GII Korea](https://m.giikorea.co.kr/report/qyr1872224-uhf-rfid-inlays-global-market-share-ranking.html)

### Inferences
- Inlay-only price is not the store cost: converting, printing/encoding, and application add to it. Per-store reader/handheld cost remains unsourced.

### Gaps
- atlasRFIDstore tag and handheld-reader pages returned 403; no handheld ($ per unit) or fixed reader prices; no Impinj/Avery/Zebra investor figures.

## (2) FDA FSMA 204 (Food Traceability Rule)

### Takeaway
Covers persons who manufacture, process, pack or hold Food Traceability List foods; records are tied to Traceability Lot Codes (lot-level, not unit-level). Compliance date moved to July 20, 2028. Retail food establishments and restaurants with average annual food sales of no more than $250,000 (3-yr rolling, inflation-adjusted from 2020) are exempt.

### Cited Findings
- Original compliance date Jan 20, 2026; FDA proposed a 30-month extension to July 20, 2028; Congress directed FDA not to enforce before that date. The page's "Getting Started" text still says Jan 20, 2026 (internal inconsistency on the page) - [FDA rule page](https://www.fda.gov/food/food-safety-modernization-act-fsma/fsma-final-rule-requirements-additional-traceability-records-certain-foods)
- "All of the Key Data Elements (KDEs), including the TLC, must be linked to the relevant traceability lot." Rule applies to "persons who manufacture, process, pack, or hold foods" on the FTL, domestic and foreign, whole supply chain. Foods containing listed foods as ingredients are covered if the listed food remains in the same form - same FDA page. The page does not list the FTL foods.
- 21 CFR 1.1305(i): exempt are "retail food establishments and restaurants with an average annual monetary value of food sold or provided during the previous 3-year period of no more than $250,000 (on a rolling basis)", inflation-adjusted with 2020 baseline - [eCFR 1.1305](https://www.ecfr.gov/api/renderer/v1/content/enhanced/current/title-21?part=1&section=1.1305)
- Other exemptions: produce farms with average annual produce sales no more than $25,000 (rolling, inflation-adjusted); shell egg producers with fewer than 3,000 laying hens; direct-to-consumer farm sales - same eCFR page
- Prior note: retailers need not assign TLCs, only keep them (FDA TLC page; see item_level_inventory.md)

### Inferences
- Small grocers under $250k food sales are exempt; most others only need to receive and retain supplier TLC/KDEs at lot level. No unit-level label requirement.

### Gaps
- FTL food list and the partial retail exemptions (e.g., direct purchase from farms) not fetched. The $250k figure is for food sold, not total sales; the inflation-adjusted current value was not found.

## (3) Amazon FBA prep-center software and market size

### Takeaway
PrepBusiness lists $175/mo for up to 5K units/month and supports FNSKU label printing; no location/bin feature mentioned. A software-vendor directory lists 229 US prep centers; no authoritative count.

### Cited Findings
- PrepBusiness: tiers by monthly units: up to 5K = $175/mo; 15K and 25K tiers shown without prices; 25K+ custom; annual billing = two months free (16.6%). "Print FNSKU and shipping labels, straight to your printer." Location not mentioned; a unit is an individual item - [PrepBusiness pricing](https://www.prepbusiness.com/pricing)
- Seller Assistant directory: 229 US prep centers, 83 integrated with its platform (vendor-run directory) - [Seller Assistant](https://www.sellerassistant.app/prep-centers/us/)
- AMZ Prep self-reports 50+ locations in 23 states (marketing claim) - [AMZ Prep](https://amzprep.com/fba-prep-center/)

### Inferences
- A few hundred US prep centers; the niche is small and tools price per unit volume.

### Gaps
- InventoryLab and Boxem/Prep Center Network pricing not fetched; WFA, Extensiv, IBISWorld counts not found.

## (4) SMB POS/inventory tools: prices and serialization

### Takeaway
Lightspeed Retail $89/$149/$289 per month; Shopify POS Pro +$89/location/month; Odoo Standard $24.90 per user/month (promo) with Lots & Serial Numbers as a setting. None of the fetched pages confirmed per-unit serial support for Lightspeed, Shopify or Square.

### Cited Findings
- Lightspeed Retail (X-Series): Basic $89, Core $149, Plus $289 per month; annual billing saves up to 18%; mobile scanner app for counts in all plans; page does not mention serial numbers - [Lightspeed](https://www.lightspeedhq.com/pos/retail/pricing/)
- Shopify: Basic $39, Grow $105, Advanced $399, Plus $2,300/mo (3-yr); POS Pro $89/location/month billed yearly; includes inventory counts, POs, low-stock alerts. Inventory location and serial numbers not mentioned on page - [Shopify POS pricing](https://www.shopify.com/pos/pricing)
- Odoo: One App Free $0; Standard $24.90 and Custom $49.00 per user/month (discounted rates for first 12 months; undiscounted figures $31.10/$38.90 and $61.00/$76.20 appear but are not clearly labeled); Light User $8.90; Standard/Custom include all apps - [Odoo pricing](https://www.odoo.com/pricing)
- Odoo Inventory: tracking by lot requires enabling "Lots & Serial Numbers" under Inventory > Configuration > Settings > Traceability; docs link to a separate serial numbers page and GS1 barcode printing for lots/serials (not read) - [Odoo docs](https://www.odoo.com/documentation/18.0/applications/inventory_and_mrp/inventory/product_management/product_tracking/lots.html)

### Inferences
- Odoo is the only fetched tool with documented lot/serial tracking at low cost, but it is per-user ERP-level.

### Gaps
- Square for Retail plan prices and serial support: pages fetched showed tier names (Free, Plus, Premium) but no prices or serial info. inFlow pricing page fetch failed. Shopify/Lightspeed serial support not confirmed (Lightspeed help center not fetched).

## (5) Labor cost of unit labels / why grocery tracks at SKU level

### Takeaway
Sources are about tag cost vs. margin, not label-application labor; no labor-per-label figure found.

### Cited Findings
- RFID Journal: a 10-cent tag per item would sharply cut profit on low-priced goods and manufacturers do not tag such goods (search-summary) - [RFID Journal](https://www.rfidjournal.com/question/which-consumer-goods-retailers-have-deployed-rfid)
- eWeek (2005): a 30-cent tag on a $1 bunch of bananas makes no sense - [eWeek](https://www.eweek.com/enterprise-apps/item-level-rfid-is-years-away-for-retailers/)
- Notre Dame capstone: unit tag cost has prevented grocery adoption due to low margins - [Notre Dame](https://esteem.nd.edu/experience/capstone-thesis/records/revolutionizing-retail-with-rfid-technology/)
- Food Trade News, Jan 2026, frames grocery RFID as "a question of when, not if" (page not fetched) - [Food Trade News](https://foodtradenews.com/2026/01/13/grocery-rfid-a-question-of-when-not-if/)
- Vendor blog claims of 1-3% grocery margin are unverified.

### Gaps
- No Progressive Grocer/Supermarket News piece or labor-seconds-per-label data fetched.

## (6) Handheld label printers

### Takeaway
Zebra ZQ320 Plus lists around $439-$449 at US resellers (3-inch mobile printer).

### Cited Findings
- ZQ32-A0E02T0-00 $438.90 at Posguys, but Barcodehero marks it discontinued in favor of ZQ32-A0E04T0-00 at about $448.87 (CDW, Barcode Discount) - [Posguys](https://www.posguys.com/Category_0/Product_0/Option_1141795/), [Barcode Discount](https://www.barcodediscount.com/catalog/zebra/zq320-plus.htm), [CDW](https://www.cdw.com/product/zebra-zq320-plus-direct-thermal-mobile-printer/7230947) (search-summary; listings not opened, may be out of date)

### Gaps
- Zebra's own product page returned 404; Brother RJ prices not fetched.

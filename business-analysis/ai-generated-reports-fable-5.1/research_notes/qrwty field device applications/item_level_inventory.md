# Item-level (per-unit) inventory tracking: QR vs RFID vs UPC, regulation, SMB tools (US, 2024-2026)

Method note: ~18 tool calls. Search was rate-limited partway; several searches returned only summaries/snippets, not fetched pages. Many items below are secondary sources or vendor pages and are flagged. Primary pages (GS1 US, FDA, Auburn, Sortly, Amazon Seller Central) were NOT opened directly; confirm before quoting. Today = 2026-10-31.

## (a) How item-level tracking is done today: RFID, 2D barcodes, labor cost

### Takeaway
RFID is the item-level standard in apparel/GM because it supports bulk, no-line-of-sight reads; Walmart requires it for apparel and general merchandise. Grocery stays SKU/lot-level because margins are thin and per-unit label+labor cost exceeds value of most items. 2D barcodes (Sunrise 2027) are about POS capability and richer data on packages, not a unit-tracking mandate. I could not find a reliable current per-tag price or a labor-cost-per-label figure.

### Cited Findings
- Walmart GM RFID playbook (revised Oct 2024): all items in in-scope departments are in scope with no minimum price; tags must be validated/approved via Auburn RFID Lab; 3P Marketplace items out of scope for apparel. (Walmart playbook, hosted by Auburn; via search summary) — [WM RFID GM Playbook](https://htmlscript.auburn.edu/under-development/rfid/_assets/pdf/WM_RFID_GM_Playbook.pdf), [WM RFID Apparel Playbook](https://htmlscript.auburn.edu/under-development/rfid/_assets/pdf/WM_RFID_Apparel_Playbook.pdf)
- Reseller (vendor) claim: Walmart requires RAIN RFID (EPC Gen2v2) tags, 902-928 MHz — [Atlas RFID Store](https://www.atlasrfidstore.com/rfid-insider/walmarts-rfid-expansion-rfid-tag-mandates-for-suppliers/)
- Third-party (vendor, forecast, unverified): 2026 expansion expected to cover most GM categories — [rfidhy.com](https://www.rfidhy.com/walmart-rfid-2026-item-level-tagging-compliance-guide-suppliers/). Dates of the earlier 2022/2025 Walmart waves were not confirmed in my searches.
- Tag price: reseller clearance listings of Avery Dennison/Smartrac paper tags ~$0.05-$0.11 each (unreliable, clearance) — see [Atlas RFID Walmart tags](https://www.atlasrfidstore.com/walmart-rfid-tags). Older: 2012 eWEEK said item-level RFID only paid off for items >= $15 and small-order tags were $0.40+ — [eWEEK](https://www.eweek.com/news/rfid-the-cost-of-being-smart/) (dated). SCDigest: even ~3-cent tags likely too high for grocery — [SCDigest](https://www.scdigest.com/assets/On_Target/10-07-21-3.php?cid=3595) (dated).
- Avery Dennison launched "AD IdentiFresh" RFID inlays for food retail (bakery/meat/deli/produce), sized to standard label dimensions; no pricing disclosed (vendor) — [Pulse](https://www.pulse.bot/retail/blogs/avery-dennison-launches-ad-identifresh-for-food-retail-d93d3ae8-0d10-45c2-9fa6-54cb2a6cc0f9)
- Italian pilot (2 stores + DC, ~60 products case-level tagged): est. ~1.7% of fresh turnover savings — [Unpaywall/journal](https://unpaywall.org/10.3233%2FRFT-120040) (old, case-level not item).
- GS1 US Sunrise 2027: goal that by end of 2027 retailers can scan 2D barcodes at POS and do at least everything 1D does; GS1 DataMatrix and GS1 Digital Link QR can carry GTIN, expiry, serial; linear barcodes are not being retired; GS1 publishes scanner 2D-readiness table and POS guideline. Some trade/vendor blogs overstate this as a mandate. — [RFID Journal](https://www.rfidjournal.com/?p=202857), [NACS Oct 2026](https://convenience.org/stay-current/news/2026/october/5/setting-up-for-sunrise-2027), [GS1 US page (mirror)](https://hn.jakechampion.name/reader/https://www.gs1us.org/industries-and-insights/by-topic/sunrise-2027), [Packaging World](https://www.packworld.com/trends/digital-transformation/article/22943302/live-at-gs1-connects-why-sunrise-2027-wont-be-fully-optional-for-brands)

### Inferences
- A QR-per-unit scheme is technically aligned with GS1 Digital Link/2D direction (serial in the code), but the retail 2D push is brand-applied on packaging, not store-applied.
- QR/line-of-sight scanning means one scan per unit; labor per unit is the dominant cost vs. RFID bulk reads. Break-even logic (RFID needs higher-value items) implies a store-applied QR label ($ label + seconds of labor) only pays for items of meaningful value or regulated/perishable items.

### Gaps
- Current (2024-26) per-inlay RFID prices from Impinj/Avery/Zebra: not found with a citable source. Reader cost and read rates: not found. Labor seconds/cost per applied label: not found. GS1 "2D on grocery items" pilot specifics: not retrieved. Walmart 2022/2025 mandate dates: not confirmed.

## (b) Regulatory drivers: FSMA 204, DSCSA

### Takeaway
FSMA 204 is lot-level (Traceability Lot Codes + KDEs at CTEs), not unit-level, and retailers receive TLCs rather than assign them; enforcement now July 20, 2028. DSCSA is the one true package/unit-level serialization regime, but it is pharma and the label is applied by manufacturers, not retailers/3PL prep.

### Cited Findings
- FSMA 204 compliance date moved from Jan 20, 2026 to July 20, 2028; sources differ on mechanism (FDA 30-month extension vs. Congress' FY2026 Continuing Appropriations Act barring enforcement before that date). Requirements unchanged: TLCs, KDEs, CTEs, records to FDA within 24 hours. — [NC State](https://foodbusiness.ces.ncsu.edu/news/fda-fsma-204-food-traceability-rule-july-20-2028/) (page returned 404 on fetch; from search summary), [Reliable Media](https://reliamag.com/topics/guides/fsma-rule-204-compliance), [Food Logistics](https://www.foodlogistics.com/safety-security/food-safety/article/22955634/midcom-data-technologies-what-fsma-204s-extended-deadline-means-for-food-traceability)
- Retail food establishments and restaurants are not required to assign TLCs (21 CFR 1.1345(b) per FDA guidance); only initial packing/transformation create TLCs; retailers must keep TLC and TLC source info. — [FDA TLC page](https://www.fda.gov/food/food-safety-modernization-act-fsma/traceability-lot-code), [IFPA](https://www.freshproduce.com/resources/supply-chain-management/fda-fsma-204-final-rule)
- Major retailers/distributors have put FSMA 204 into supplier contracts, sometimes before 2028 — [Reliable Media](https://reliamag.com/topics/guides/fsma-rule-204-compliance)
- DSCSA: FDA extended the small-dispenser (<=25 FTE pharmacists/techs) package-level interoperable tracing exemption from Nov 27, 2026 to Nov 27, 2027 (Aug 2026 action, per secondary law-firm/vendor commentary; FDA notice not opened). Large dispensers were due Nov 2025. — [LSPedia](https://www.lspedia.com/blog/the-fda-just-extended-the-small-dispenser-dscsa-exemption-heres-what-you-still-need-to-do), [DLA Piper Jan 2025](https://www.dlapiper.com/en/insights/publications/2025/01/certain-dscsa-deadline-extensions-set-to-eclipse-in-2025), [Inmar](https://www.inmar.com/blog/insights/healthcare/dscsa-2025-enforcement-exemptions-and-expectations)

### Inferences
- Neither rule creates demand for store-applied unique unit labels in grocery; lot-level capture at receiving (scan supplier TLC, GS1 DataMatrix/GLN) is what FSMA 204 needs. A per-unit QR system could serve as a lot-capture and recall tool, a potential angle but not a requirement.

### Gaps
- Small-retailer exemption thresholds (I recall under $250k annual food sales; unverified) and the Food Traceability List scope were not confirmed from the regulation.
- DSCSA detail on unit vs lot for each trading-partner role not pulled from FDA.

## (c) Amazon FBA prep / small 3PL niche

### Takeaway
Amazon ended its US in-house prep/labeling services Jan 1, 2026 (per vendor sources), pushing labeling to sellers and prep centers; third-party prep centers charge about $0.40-$2.00/unit. Per-unit FNSKU labeling is already unit-level work, but FNSKU is per-SKU (not unique per unit). No count of US prep centers found.

### Cited Findings
- Amazon US prep/labeling discontinued Jan 1, 2026 (announced Jul 2025, per vendor/freight blogs) — [FreightFigures](https://www.freightfigures.com/articles/amazon-fba-prep-services-ended-2026), [KL Productions](https://kl-productions.pages.dev/field-guide/amazon-2026-fba-prep-compliance-playbook) (vendor)
- Prep-center per-unit pricing (vendor claims): $1.00-$1.50 (<500 units/mo), $0.75-$1.25 (500-2,500), $0.40-$0.75 (>2,500) — [FreightFigures](https://www.freightfigures.com/articles/amazon-fba-prep-services-ended-2026); Ecom Circles $1.00 base — [Ecom Circles](https://ecomcircles.com/services/warehouse/fba-prep/); Phase V $1.00 (<1,000/mo), $0.80 (1,000-3,000) — [Phase V](https://support.phasev.com/fba-prep-services/)
- Printers (retail listings, undated): Rollo wireless 4x6 ~$279.99 (Walmart.com); Brother QL-810W $169.99, QL-820NWB ~$265-276, QL-1110NWBc ~$325; Zebra ZD421 ~$370-$500 retail — [Walmart label printers](https://www.walmart.com/c/kp/usp-label-printer), [Best Buy ZD421](https://www.bestbuy.com/product/zebra-zd421-direct-thermal-203dpi-4-inch-desktop-label-printer-wired-usb-ethernet-10-100-connectivity-6-ips-zpl-epl-gray/C9YRGSQT7G)

### Inferences
- A handheld printer competes with $170-$500 desktop printers already used; differentiation would be portability/at-shelf use plus software, not label printing per se.

### Gaps
- Number of US prep centers/3PLs: not found. PrepBusiness, Inventory Lab, Boxem pricing and features: not found. Per-label media cost: not found. Amazon's current FNSKU label fee: not confirmed.

## (d) Existing SMB inventory tools

### Takeaway
Tools exist at low prices; Sortly explicitly documents unique QR per individual item. Pricing figures conflict across aggregators.

### Cited Findings
- Sortly: Free (100 items, 1 user); Advanced ~$49/mo list (about $39 annual) per Sortly help; other aggregators show $24-$29 (likely annual/discounted); Ultra ~$74-$149; Premium ~$149-$299; Enterprise custom. Competitor claims prices rise at renewal (biased). — [Sortly plans](https://help.sortly.com/hc/en-us/articles/31329803827867-Current-Sortly-Plans), [Capterra](https://www.capterra.com/p/169199/Sortly-Pro/pricing/), [Airpinpoint (competitor)](https://airpinpoint.com/compare/airtags-vs-sortly)
- Sortly has a how-to for tracking individual items with unique QR codes — [Sortly help](https://help.sortly.com/hc/en-us/articles/40417268344347)
- inFlow: aggregators list ~$129-$874/mo tiers; Software Advice ~$186/mo flat start; serial number add-on $49/mo in one table (unreliable, conflicting) — [Costbench](https://www.costbench.com/compare/inflow-vs-zoho-inventory/), [Software Advice](https://www.softwareadvice.com/inventory-management/inflow-inventory-profile/)
- Zoho Inventory: free tier exists; up to ~$249/mo (aggregator) — [Costbench](https://www.costbench.com/compare/inflow-vs-zoho-inventory/)
- Ezo: from $40/mo for 250 items (QR-item plans) — [Founderjar](https://www.founderjar.com/?p=83510)

### Gaps
- Odoo, Square for Retail, Shopify POS, Lightspeed pricing and serialization/bin location support: not found. Zoho serial tracking inclusion: unconfirmed.

## (e) Benefits evidence and what QR gives up

### Takeaway
Best-known RFID evidence (Auburn/GS1 US) is inventory accuracy 63% to 95% and OOS down up to 50%, mostly apparel/GM and partly vendor-sponsored. No QR-specific benefit data found.

### Cited Findings
- Auburn RFID Lab + GS1 US "Project Zipper": inventory accuracy 63% to 95%, OOS reduced up to 50%, cycle-count time down 96%; 99.9% order accuracy with RFID vs 69% of non-RFID orders having data errors; sample >1M items, 5 retailers, 8 brands. — [Retail Dive](https://www.retaildive.com/news/RFID-100-accurate-ROI-Auburn/539468), [MHL News](https://www.mhlnews.com/global-supply-chain/article/22055318/rfid-enables-nearly-100-order-accuracy-for-retail)
- NRF last published shrink rate: 1.6% of sales FY2022 ($112.1B); NRF stopped the annual shrink report in 2024. — [NRF](https://nrf.com/media-center/press-releases/shrink-accounted-over-112-billion-industry-losses-2022-according-nrf), [Retail Brew](https://www.retailbrew.com/stories/2024/10/10/nrf-pulls-shrink-report-as-it-reevaluates-tools-for-tracking-theft)
- QR needs line-of-sight single scans; RFID reads in bulk — [Founderjar/guides](https://www.founderjar.com/?p=83510) (generic)

### Inferences
- QR gives up bulk reads (cycle counts become item-by-item), the main driver of RFID's 96% count-time cut and accuracy gains; QR's accuracy benefit would depend on scan discipline at each state change.

### Gaps
- Shrink reduction attributable to item-level tracking; any QR-only accuracy study; Auburn primary page not opened.

## (f) SMB willingness to pay; scanner hardware

### Takeaway
Software in this segment clusters at free-$50/mo (Sortly) up to $150-$250/mo (inFlow); no survey of SMB spend found. Zebra TC21/TC26 ~ $500-$800 vs phone camera at no added cost.

### Cited Findings
- Zebra TC21/TC26: listings ~US$810 (TC21, unavailable) and ~EUR 543 (TC26); Zebra's own battlecard (biased) argues phones need sleds or have weaker camera scanning; TC21 IP67 with 1D/2D imager (QR, Data Matrix) — [Advanced Automation](https://www.advanced-automationinc.com/the-price-is-right-zebra-tc21-and-tc26-handheld-computer/), [PTS Mobile](https://www.ptsmobile.com/cat/zebra-tc21-tc26-barcode-scanners.html)

### Gaps
- No SMB willingness-to-pay survey, no documented gap analysis for cheap self-hosted QR-per-unit with handheld printer (key question 4): I found no source either confirming or refuting the gap. Self-hosted offerings were not searched effectively.

# Dynamic QR displays (ESL, e-paper signage, rotating QR): fact base for qrwty

Note: research used ~20 tool calls; several sub-areas are thin (see Gaps). Search-tool summaries were used for some items; primary URLs are given so the writer can verify.

## Q1. ESL market size, leaders, per-label and per-store cost, QR usage, Walmart

### Takeaway
ESL is a ~$2B/yr, low-to-mid-teens-CAGR market dominated by chain-scale vendors (Vusion, Hanshow, Pricer, SoluM); Walmart's all-US-store rollout is the biggest demand driver. Labels are $5-20 each, sold into enterprise deployments, and QR is a secondary feature (product info, DPP/GS1 Digital Link), not the core value proposition.

### Cited Findings
- Analyst 2025 market-size estimates range ~$1.6B-$2.7B; CAGRs ~11%-21% (Expert Market Research $1.61B/21.4%; Knowledge Sourcing $2.19B -> $3.72B 2030, 11.2%; Global Market Insights $2.2B 2025, 335.9M units, 12.7% 2026-35; Mordor $1.97B -> $3.78B 2030, 13.9%; Fortune BI $2.66B 2025, 13.7% to 2034; Roots $2.17B 2025, 15.8%). Syndicated-research figures, methodology varies. — [Expert Market Research](https://www.expertmarketresearch.com/reports/electronic-shelf-label-market), [Knowledge Sourcing](https://www.knowledge-sourcing.com/report/electronic-shelf-label-market), [GMI](https://www.gminsights.com/industry-analysis/electronic-shelf-label-esl-market), [Roots](https://www.rootsanalysis.com/electronic-shelf-labels-market)
- VusionGroup FY2025 (press release 26 Feb 2026, audit still in progress): adjusted revenue ~EUR1,527M (+51%), IFRS revenue EUR1,472M (+54%); adjusted EBITDA EUR277M (18.2% margin). — [Vusion FY2025 PR](https://s203.q4cdn.com/882900163/files/doc_financials/2025/q4/Vusion_PR_FY-2025-Results_vUK.pdf)
- Vusion 2026 guidance: adjusted revenue growth 15-20% at constant FX, including ~40% VAS growth. — [Vusion FY2025 PR](https://s203.q4cdn.com/882900163/files/doc_financials/2025/q4/Vusion_PR_FY-2025-Results_vUK.pdf)
- Walmart: 2023 contract for first phase of 500 stores / ~60M labels (via SES-imagotag/Vusion); June 2024 expansion to 2,300 stores by 2026; Dec 2024 extended to all ~4,600 US stores; one report values the order ~EUR1bn (store counts vary by report). Walmart Mexico Express: 1.7M+ ESLs, completion 2026. — [Vusion](https://www.vusion.com/insights/ses-imagotag-announces-vusion-platform-roll-out-contract-in-walmart-stores-in-u-s/), [Retail Customer Experience](https://www.retailcustomerexperience.com/news/walmart-deploying-vusion-for-digital-shelf-strategy/), [Pulse (Mexico)](https://www.pulse.bot/retail/news/walmart-vusion-to-deploy-connected-store-platform-across-mexico-d28609b3-bf6d-4547-adcc-47489d77204c/)
- Per-label price: roughly $5-20 (small B/W $5-10; color mid-range $10-20); per-store totals $80k-$110k+ with ~10,000 labels; one breakdown: labels $150-450k for a supermarket, rails/network $15-50k, install $20-60k, software $10-40k/yr; some vendors add $0-2/label/month cloud fee. Mostly vendor/reseller blogs, some 2020-22 dated; treat as rough. — [Shopappy](https://shopappy.com/retail/supermarkets-grocers/electronic-shelf-labels-grocery), [Minew](https://minewtag.com/newsinfo433.html), [Kiosketag](https://www.kiosketagscreen.com/info/electronic-shelf-labels-for-small-grocery-stor-103537605.html)
- QR on ESL: Hanshow says its ESLs integrate with PIM and GS1 Digital Link for Digital Product Passport access (vendor claim). Other pages (Delfi, Narmadi, Legoyo) describe QR/NFC on ESL for product details or loyalty offers (vendor/blog claims). — [Hanshow DPP](https://www.hanshow.com/en/news/unlocking-the-future-of-digital-retail-with-hanshows-esls-seamless-integration-for-dpp-access), [Narmadi](https://media.narmadi.com/r/esl-with-nfc-or-qr-code-features), [Delfi](https://www.delfi.com/?p=42869)
- Open-source/hobby route: OpenEPaperLink tags sold on Tindie: 4.2" tag $24 (1-2 units) / $28 (3+), preflashed; 4.3" 3-color $22-25 incl. 2x CR2450; 1.54" 5-pack $35-40; repurposed Hanshow Nebular 2.13"/4.2" tags $19-22 each (as-is, no warranty). Requires an Access Point (ESP32-based Mini-AP). Listings appear 2023-24; one seller says no longer sources displays. Wiki notes some tags need opening/drilling to flash. — [Tindie 4.2" tag](https://www.tindie.com/products/electronics-by-nic/42-epaper-tag-for-openepaperlink), [Tindie 4.3"](https://www.tindie.com/products/electronics-by-nic/openepaperlink-43-epaper-tag), [Tindie Hanshow Nebular 420](https://www.tindie.com/products/youtechitfromhere/openepaperlink-diy-e-ink-screen-nebular-420), [Mini AP v3](https://github.imc.re/nlimper/Mini-AP-v3)

### Inferences
- A QR on a $5-20 ESL is a bonus feature; ESL buyers pay for price automation, so QR analytics/redirect would be a software add-on, not the purchase driver.
- OpenEPaperLink gives a ~$20-30/tag, hobbyist-grade benchmark that already shows the SMB/maker price floor (but with gateway + flashing friction, no support).

### Gaps
- No primary Hanshow/SoluM/Pricer price lists; no independent source on Hanshow/SoluM market share; no evidence found of AliExpress Bluetooth ESL kit prices (not searched directly); no Walmart-confirmed QR use on shelf labels.

## Q2. ESL vendor economics: recurring revenue, margins, business models

### Takeaway
Hardware-dominated: Vusion's recurring VAS is ~EUR83M of ~EUR1.5B revenue (~5-6%), ARR > EUR100M exiting 2025; Pricer's gross margin ~22%. Label-as-a-service exists at the margins (customer pre-financing, SaaS), but economics are mostly hardware sales plus growing software.

### Cited Findings
- Vusion FY2025: VAS revenue ~EUR211M (about doubled, ~14% of revenue vs ~10% in 2024); recurring VAS EUR83M (+45%); recurring VAS exceeded EUR100M ARR in Q4 2025. Recurring VAS includes VusionCloud subscriptions plus SaaS computer vision and analytics (Captana, Belive, Markethub, Memory). — [Vusion FY2025 PR](https://s203.q4cdn.com/882900163/files/doc_financials/2025/q4/Vusion_PR_FY-2025-Results_vUK.pdf); summary also in [Retail Insight Network](https://www.retail-insight-network.com/news/vusion-group-revenue-profit-jump/)
- Vusion reports "variable cost margin" not gross margin: IFRS VCM EUR417M = 28.3% of revenue in 2025; adjusted VCM ~EUR472M vs EUR297M in 2024; H1 2025 adjusted VCM 30.8% (+2.9 pts). Not equal to gross margin (my reading of the PR; the PDF text was extracted via raw parsing, so exact decimals should be verified). — [Vusion FY2025 PR](https://s203.q4cdn.com/882900163/files/doc_financials/2025/q4/Vusion_PR_FY-2025-Results_vUK.pdf), [Vusion H1 2025 PR](https://s203.q4cdn.com/882900163/files/doc_financials/2025/q2/VusionGroup_PR_H1_2025_Results_ENG.pdf)
- Vusion notes hardware cost falls with manufactured volume; PR mentions investments financed by customers (pre-financing) in capex. — same FY2025 PR
- Pricer AB FY2025: net sales SEK 2,147.9M (2024: 2,558.0M); gross profit SEK 476.6M, gross margin 22.2% (22.0%); order intake SEK 1,892.1M (2,918.4M). No recurring-revenue figure found. — [Pricer year-end report](https://www.pricer.com/reports/year-end-report-january-december-2025-pricer-ab)

### Inferences
- Implied revenue per label per year is not reported; at ~$5-20/label hardware amortised over ~5-7 years plus $0-2/label/month cloud fees (vendor-blog claim), recurring per label is on the order of single to low-double-digit dollars/yr at most. This is my estimate, not a reported figure.
- Software/recurring is where growth is (VAS target +40% in 2026) but is still a small minority of revenue.

### Gaps
- No label-count/ARPU disclosure from Vusion; Hanshow (HK-listed) and SoluM (KOSDAQ) filings not retrieved; Pricer recurring share not found.

## Q3. E-paper QR signage products (Visionect/Joan, Papercast, E Ink, QR menu stands)

### Takeaway
Dedicated e-paper signage is priced at hundreds of dollars per unit (Joan 6" ~$749 MSRP; 13" ~$751 reseller), aimed at room booking, not QR. I found no confirmed mainstream e-paper QR table stand product with specs; only an AliExpress listing tagged "e ink qr code".

### Cited Findings
- Visionect Joan 6 Pro MSRP $749; Joan 13 listed $751 at one reseller; older basic 6" model started at EUR449 (undated). Joan 32 is 31.2" E Ink, Wi-Fi, rechargeable battery. — [Visunext/Exertis listing](https://www.exertisalmo.com/productdetails/VISNET/JOAN6PRO%20GRAY), [Tanotis Joan 13](https://www.tanotis.com/products/visionect-joan-13-13-uxga-room-scheduling-e-ink-display-slate-gray), [E-Ink-Info](https://www.e-ink-info.com/visionect-offers-10-end-year-discount-joan-e-ink-display), [16:9/invidis](https://invidis.com/sixteen-nine/2020/12/11/visionect-adds-32-inch-e-paper-cord-free-display-for-workplaces/)
- Printed dynamic-QR table stands are the incumbent: QRStuff advertises updating specials/prices on menu stands without replacing printed cards. — [QRStuff](https://www.qrstuff.com/feeds/service/qr-code-menu-stand)
- AliExpress wiki pages list a WiFi acrylic QR menu stand with "e ink qr code" tag; no specs/prices captured. — [AliExpress wiki](https://www.aliexpress.com/s/wiki-ssr/article/qr-code-table-stand)

### Inferences
- Joan-class devices are 20-30x the cost of a printed stand; a viable SMB product needs to be <$50.

### Gaps
- Papercast bus stop pricing, E Ink outdoor signs, and any restaurant e-paper QR stand with specs were not found (no results from searches).

## Q4. Rotating / time-limited QR and anti-fraud

### Takeaway
Rotating barcodes are proven for ticketing (SafeTix) and payment, but they are rendered on the user's phone/app, not on a standalone display. Government guidance on physical QR fraud focuses on sticker overlays and tampering, and I found no official recommendation for rotating display codes.

### Cited Findings
- Ticketmaster SafeTix: PDF417 barcode refreshes every 15 seconds (per 2024 teardown), so screenshots/prints are invalid; launched 2019 as "refreshes every few seconds". Late-2025 patent suit (EChanging Barcode LLC v. Ticketmaster, SDNY) over rotating encrypted barcodes; status unknown. — [Gigazine](https://gigazine.net/gsc_news/en/20240710-ticketmaster-safetix-ticket), [TechCrunch 2019](https://techcrunch.com/2019/05/16/ticketmaster-put-an-end-to-screenshots-with-new-digital-ticket-technology/amp/), [Digital Music News](https://www.digitalmusicnews.com/2025/11/02/ticketmaster-patent-lawsuit-safetix/)
- FBI IC3 PSA (Jan 2022): criminals tamper with digital and physical QR codes; Austin TX parking stations had fraudulent stickers (>two dozen). 2023 FBI warning: do not scan a code on a sticker or that looks replaced. — [IC3 PSA220118](https://www.ic3.gov/PSA/2022/PSA220118), [13abc 2023](https://www.13abc.com/2023/07/14/fbi-issues-warning-malicious-qr-codes)
- Vendor-style guides recommend auditing physical QR deployments (parking, payments, events) and branded short links with scan monitoring. — secondary: [antiphishers guide](https://antiphishers-com.pages.dev/qr-code-phishing-quishing-2026) (low authority)
- Jan 2026: advisory about Kimsuky using QR codes in spear-phishing emails (email vector, not physical). — [The Register](https://www.theregister.com/2026/01/09/pyongyangs_cyberspies_are_turning_qr/)

### Inferences
- A display that cannot be sticker-overlaid is not what officials recommend; but it does remove the sticker-overlay attack at that location (tamper-evidence/physical-lockdown argument), which is a pitch, not guidance.

### Gaps
- Not found: CISA guidance text on physical QR; Alipay/WeChat refreshing payment-code details; Zoom/transit rotating QR sources.

## Q5. Component-level hardware cost

### Takeaway
Component BOM for a Wi-Fi e-paper QR sign is roughly $25-45 retail-module level (4.2" panel ~$19-35 plus ~$12 ESP32 driver board).

### Cited Findings
- Waveshare e-Paper ESP32 Driver Board: ~$12.33 (LCSC qty 1), ~$11.56 at 100+; 219 SEK (Electrokit); JPY2,739 (Switch Science). — [LCSC datasheet page](https://datasheet.lcsc.com/lcsc/2303281130_Waveshare-e-Paper-ESP32-Driver-Board_C5374679.pdf), [Waveshare](https://www.waveshare.com/e-Paper-ESP32-Driver-Board.htm)
- 4.2" modules: Waveshare 4.2" (G) module $18.99-28.99; (B) module $33.63-34.99; raw (B) panel $23.63-24.99; Openelab 400x300 module $31.49. — [Waveshare e-paper category](https://www.waveshare.com/product/displays/e-paper/epaper-2.htm), [Openelab](https://openelab.com/collections/waveshare-display-e-paper)
- Hanshow Nebular repurposed ESLs at $19-22 and OpenEPaperLink tags at $22-28 (see Q1).

### Inferences
- Retail module prices (no case, battery, enclosure, certification) are ~$30-45; a repurposed ESL or OEPL tag is ~$20-28. Volume BOM would be lower; no source found.

### Gaps
- Waveshare 2.9" and 7.5" prices, battery-life claims, LoRa options not retrieved.

## Q6. SMB demand for changeable QR and current spend

### Takeaway
Printed QR riders and dynamic-QR subscriptions already satisfy "changeable destination"; I found no evidence of SMBs asking for powered changeable-QR displays.

### Cited Findings
- Lowen Sign reusable QR real-estate rider (.090 polyethylene, 6x24"): from $34.90 single unit down to $11.00 each at higher quantities (quantity breaks not captured). — [Lowen Sign](https://lowensign.com/realestatesigns/independent/products/item/12p180qr/real%20estate%20qr%20code%20sign%20rider,%20.090%20polyethylene,%206h%20x%2024w.html)
- Vendors pitch dynamic codes on riders so the code can be repointed (e.g., to a "sold" page) without replacing the sign. — [Bitly](https://bitly.com/blog/qr-codes-for-realtors/), [u2l.ai](https://u2l.ai/blog/qr-codes-for-real-estate)

### Gaps
- No evidence on churches, community boards, farmers markets; no dynamic-QR subscription prices captured.

## Q7. Where a live display is necessary vs a printed dynamic QR, and the SMB gap

### Takeaway
A printed dynamic QR already changes destination server-side. A display adds only capabilities a print cannot give; each is niche for SMBs, and no SMB-priced ESL/e-paper QR product is confirmed.

### Cited Findings
- (Supporting facts in Q3/Q4: printed dynamic codes update destinations without reprint; SafeTix rotates to defeat screenshots; FBI warns of sticker overlay tampering.)

### Inferences
- A display adds: (1) rotating/time-limited payload (presence proof, anti-replay for check-in, attendance, coupons, tips/payments) - only real functional gap; (2) visual content change (price, "sold", countdown, availability) rendered next to the code; (3) multi-code cycling (different QR per audience/slot); (4) offline fallback only if code is cached (a print also works offline-ish; a static redirect needs server); (5) tamper-evidence: replaces an overlay-able sticker with a device, though a device can also be swapped.
- Rotating payload demonstrably needs a live server-controlled display; this is where qrwty's redirect + analytics (token validation, scan logs) would be natural.
- SMB gap: visible price points are ~$20-30 for hobby tags (no support) vs $749 for Joan; ESL vendors target chains. Gap plausibly exists around $30-80 with hosted service, but demand evidence is absent from this research.

### Gaps
- No direct demand evidence; no AliExpress low-cost ESL kit price check; no confirmed existing SMB vendor selling Wi-Fi e-paper QR signs (absence of evidence from limited searching).

# qrwty field device: build vs buy (phone app + Bluetooth printer vs custom Pi-based device)

Note: web search was partly rate-limited and several vendor pages (Zebra, Brother SDK, Niimbot, Toast 10-K tables) were not opened directly. Many prices are retailer snapshots, undated. Items marked ESTIMATE are my arithmetic or judgment, not sourced.

## Q1. Can a phone app + $100-$500 Bluetooth printer do everything the prototype does? What is lost?

### Takeaway
Yes for the core function (capture GPS on the phone, generate a QR, print over Bluetooth). Phone GNSS is as good as or better than the prototype's likely module. The practical constraints are SDK/access (Brother and Zebra have official SDKs; Niimbot and Phomemo rely on reverse-engineered protocols) and iOS web limits (no Web Bluetooth in Safari), so a native or Capacitor app is the realistic path. Lost: one-button speed, integrated ruggedness, and phone-free operation.

### Cited Findings
- Brother's Mobile SDK (Type B) release notes list RJ-2035B, RJ-2055WB, RJ-3035B (and TD/TJ models) for iOS; BLE support was added for RJ-2035B and RJ-3035B only. The PT-P710BT was not in the excerpts seen; its support pages point to the consumer apps (P-touch Design&Print, iPrint&Label), not the SDK. — [Brother SDK release notes](https://support.brother.com/g/s/es/dev/en/mobilesdk/release/index.html); [Brother PT-P710BT support](https://www.brother.co.za/en/support/pt-p710bt/faqs?cate=10047)
- PT-P710BT: Bluetooth, up to 24 mm TZe tape, 20 mm/sec, built-in rechargeable Li-ion, auto-cutter; US price $114.99 (Staples/Quill), MSRP $159.95 (ptouchdirect). — [ptouchdirect](https://www.ptouchdirect.com/ptouch/new-ptp710bt.html); [Staples](https://www.staples.com/brother-p-touch-pt-p710bt-cube-desktop-label-maker-plus-bluetooth/product_24358260)
- Brother RJ-2035B (2-inch, 58 mm, 203 dpi, Bluetooth 5.0/MFi, USB): $380.00 at Barcodes Inc and CompSource (US). It is mainly a receipt/mobile printer; some retailers list it as a label printer (e.g., 48 mm label variant). — [Barcodes Inc](https://www.barcodesinc.com/brother/part-rj2035b.htm); [fleetnetwork.ca](https://fleetnetwork.ca/products/brother-ruggedjet-go-rj-2035b-mobile-direct-thermal-printer-portable-receipt-print-usb-serial-bluetooth-5-0-near-field-rj2035b.html)
- Zebra ZQ320 Plus: US prices ~$375-$600 (Barcode Discount $448.87-$566.99; CDW $448.87 sale / $598.49 list; Walmart $375). Outdoor variants exist. — [Barcode Discount](https://www.barcodediscount.com/catalog/zebra/zq320-plus.htm); [CDW](https://www.cdw.com/product/zebra-zq320-plus-dt-printer/7230947)
- Zebra Link-OS Multiplatform SDK covers Android, iOS, .NET MAUI, Java (desktop), and Weblink websockets for printing from phones/tablets. — [Zebra TechDocs](https://techdocs.zebra.com/link-os/latest/)
- Niimbot: no official developer SDK/API found in search; the only official product is the NIIMBOT app. Community libraries (NiimBlueLib, niimbluelib; a Web Bluetooth driver validated on B1, B1 Pro, M2-H) self-describe as unaffiliated/educational. — [pkgstats niimbot-web-bluetooth](https://www.pkgstats.com/pkg:niimbot-web-bluetooth); [NiimBlueLib README](https://unpkg.com/@mmote/niimbluelib@0.0.1-alpha.38/README.md)
- NiimBlue browser app uses Web Bluetooth/Serial; works in Chromium browsers, not Firefox/Safari; an Android Capacitor build exists. — [niimblue docs index](https://docsearch.algolia.com/mcp/docs/repo/multimote/niimblue); [niimblue connecting docs](https://printers.niim.blue/interfacing/connecting/)
- Niimbot prices (EU retailer, EUR): B1 46.49, B21 Pro 60.49, B21S 64.49-71.99; B21S US listing $60. B21 is 203 dpi, max 48 mm label width, 1200 mAh Li-ion (B21S). — [aio.lv B1](https://aio.lv/en/product--niimbot-b1-grey--11251584.md); [aio.lv B21 Pro](https://aio.lv/en/product--niimbot-1ac23031601--11422987.md); [aio.lv B21S](https://aio.lv/en/product--niimbot-b21s-black--11381131.md); [ezonelb B21S](https://ezonelb.com/product/niimbot-b21s-smart-label-printer-bluetooth-thermal-label-maker-portable-2-inch-wide-rechargeable-battery-compatible-with-android-pc-black)
- Phomemo: M110 max print width 48 mm (label 20-50 mm), 1200 mAh; M220 up to 72 mm print / 80 mm label, 2200 mAh (third-party listing). M110 $51.99 on phomemo.com (June 2026 tracker, MSRP shown $96). No official SDK found in these results. — [Phomemo M220 vs M110](https://phomemo.com/blogs/phomemo-news-2/phomemo-m220-vs-m110-which-portable-label-printer-is-right-for-you); [frontdeskreview](https://frontdeskreview.com/product/label-makers/phomemo-m110/)
- Safari/iOS does not support Web Bluetooth; Bluefy is a third-party iOS browser that adds it (HTTPS needed; reviewer reports trouble with local 192.168.x.x addresses). — [Beaconzone](https://www.beaconzone.co.uk/blog/browser-support-for-web-bluetooth/); [Bluefy App Store](https://apps.apple.com/app/id1492822055)
- Phone GNSS: built-in smartphone GNSS typically errs by several meters; dual-frequency (L1/L5) phones since 2018 can reach sub-meter in good conditions; cm-level (RTK/PPP) needs corrections and usually external hardware. — [Inside GNSS](https://insidegnss.com/?p=181674); [Sensors 2019 PPP on smartphone (PMC)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6539034/); [Single-baseline RTK on phones (PMC)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6806615/)
- Informal test found an iPhone XR overstated its accuracy radius badly (low-quality source). — [Medium](https://medium.com/@importanttech/we-tested-mobile-gps-gnss-accuracy-and-found-some-surprising-results-b9ec35873e2e)
- SparkFun ZED-F9P RTK breakout (the cm-level option) is $259.95 retail. — [SparkFun](https://www.sparkfun.com/sparkfun-gps-rtk-sma-breakout-zed-f9p-qwiic.html)

### Inferences
- A $50-$120 consumer printer (Niimbot/Phomemo/PT-P710BT) plus phone covers prototype functionality for posters/inventory/scavenger hunts; $375-$600 Zebra/Brother mobile printers add SDK stability, rugged/outdoor variants, and wider media.
- For a web-app-only product, iOS is the blocker (no Web Bluetooth in Safari); a thin native/Capacitor wrapper or vendor SDK is needed. Niimbot/Phomemo paths depend on unofficial protocols (risk of firmware/app lock changes).
- Phone GNSS (several meters, sub-meter on dual-frequency) matches or beats a $20-40 standalone module; only RTK-grade modules (~$260 for ZED-F9P board, plus corrections) beat it, and that is overkill for a QR label location tag.
- Lost vs custom device: single-button print, no phone dependence, gloves/rain operation, and a fixed bundled media/GPS workflow (ESTIMATE).

### Gaps
- Zebra ZQ511/ZQ220 Plus prices and Epson LW-PX specifics not found (search rate-limited).
- Exact IP/drop ratings, battery runtime, and weatherproof-media compatibility for each printer not verified from vendor datasheets.
- No existing "print label with location" consumer app identified.
- Whether Brother Print SDK formally supports PT-P710BT unverified (Brother's SDK matrix not fully read).
- Adafruit Ultimate GPS price not found.

## Q2. Integrated rugged devices (Zebra TC2x/TC5x etc.): why enterprises pay $1,000-2,500

### Takeaway
Rugged scanner-computers cost ~$1,000 (TC22) to ~$2,300-2,900 (TC53) at US resellers, buying ruggedization, enterprise OS support, imagers, and fleet management; they are still not printers, so a printer is an additional purchase.

### Cited Findings
- TC22 8-pin Android mobile computer: $1,035 (RFID4U). — [RFID4U](https://rfid4ustore.com/zebra-mobile-computer/?page=2)
- TC53: CDW $2,281.79-$2,733.99; Barcode Giant $2,884.70; Staples $2,300.86; some TC53 listings $1,672.60 vs MSRP $2,415. — [CDW](https://www.cdw.com/product/zebra-tc53-se55-imager/7039906); [Barcode Giant](https://www.barcodegiant.com/zebra/tc53.htm?p=1); [Staples](https://www.staples.com/zebra-tc53-mobile-computer-tc5301-0t1e7b1b00-na/product_IM1690F44)
- A reseller blog (April 2026) frames TC53 as ~40% premium over TC22 and says TC22 covers most light indoor needs (marketing source). — [ZPS Store](https://www.zpsstore.com/blog/-zebra-tc22-vs-tc53-is-the-40-enterprise-premium-worth-the-investment/)

### Inferences
- Honeywell CT-series and Zebra printer+computer bundles not researched; assume similar pricing tiers (unverified).
- A custom qrwty device at <$400 retail would undercut rugged computers but is not comparable on enterprise features.

### Gaps
- Honeywell CT-series prices, Zebra all-in-one bundles, and rationale (warranty, 3-5 year lifecycle, MDM) not sourced.

## Q3. Cost of a 500-unit custom device and implied retail price

### Takeaway
Core BOM is cheap (Pi Zero 2 W class), but 2026 memory-driven Pi price increases hit Pi 4/5, not the Zero line (as of the Feb 2026 announcement). The big unit-cost drivers are certification amortization, enclosure, battery/printer mechanism, and support, not the compute board. All-in per-unit figures below are ESTIMATES.

### Cited Findings
- Raspberry Pi memory-driven increases (Feb 2, 2026): 2GB +$10, 4GB +$15, 8GB +$30, 16GB +$60 for Pi 4/5, CM4/CM5; 1GB Pi 4 stays $35, 1GB Pi 5 $45; Pi Zero, Pi 3 and older not expected to change (several years of LPDDR2 inventory). — [Raspberry Pi news](https://www.raspberrypi.com/news/more-memory-driven-price-rises/)
- Further increases through 2026: reported rounds in Dec 2025, Feb, Apr 1 and Oct 1, 2026; Oct round raised 2GB Pi 5 to $77.50 and Pi 4 2GB to $67.50; one source says LPDDR4 cost up sevenfold year over year as of April 2026. — [OMG Ubuntu (Oct 2026)](https://www.omgubuntu.co.uk/2026/10/raspberry-pi-2gb-costs-how-much-now/amp); [Tom's Hardware](https://www.tomshardware.com/raspberry-pi/component-shortages-drive-raspberry-pi-prices-up-by-up-to-23-percent-escalating-lpddr4-lpddr5-costs-trigger-the-third-price-hike-of-the-year). Sources disagree on 8GB/16GB Pi 5 numbers ($130/$220 vs $205 for 16GB); verify on raspberrypi.com.
- FCC: using a pre-certified module, host Part 15B testing ~$1,500-$5,000 (one guide totals $2,500-$5,500); custom RF $8,000-$20,000+; one SparkFun post cites $4,000 for Part 15C of a Bluetooth module; a real Part 15B ESP32 test cost $1,900. Consultant/blog sources, rough. — [compliancetesting.com](https://compliancetesting.com/fcc-certification-faqs/fcc-certification-cost/); [SparkFun](https://news.sparkfun.com/3124); [markready](https://markready.pages.dev/learn/fcc-certification-cost)
- JLCPCB assembly fees: ~$7/job + $1.50 stencil + $0.0015/joint (small-run, forum-sourced); no 500-unit quote found. — [pamfinds guide](https://pamfinds.pages.dev/guides/best-pcb-assembly-services/); [Medium JLCPCB](https://medium.com/pocasi/jlcpcb-assembly-service-2113d7b0cec8)
- ZED-F9P RTK board $259.95 (above).

### Inferences (ESTIMATES, not sourced)
- Unit BOM guess for Pi-based printer device: Pi Zero 2 W/CM-class compute ~$15-35, GNSS ~$15-40, thermal printer mechanism/module ~$25-60, battery+charger ~$10-20, display+buttons ~$10-25, enclosure (injection/3D print, IP-rated) ~$10-40 => $85-220.
- Certification (pre-certified module route) ~$5,000-$15,000 incl. testing/SIG declaration, amortized over 500 units => ~$10-30/unit; plus assembly/test/shipping/warranty ~$20-50 => all-in ~$120-300/unit.
- Hardware-margin norms (40-60% gross margin for accessory hardware; or breakeven-plus if subscription-subsidized) imply ~$200-600 retail, which overlaps the $50-$600 off-the-shelf printer range without app-store reach.

### Gaps
- No Seeed Fusion / PCBWay 100-1,000-unit quotes; IP-rated enclosure costs; thermal print module prices (e.g., 58 mm mechanisms); CE costs; Adafruit GPS price; current Pi Zero 2 W price after any 2026 changes.

## Q4. Label media for outdoor use and cost per label

### Takeaway
Outdoor placement requires thermal transfer (ribbon) polyester/vinyl, not direct thermal (which fades in sun). Zebra rates Z-Ultimate 4000T polyester up to 3 years outdoors; 8000T polyolefin tag up to 2 years. Consumer direct-thermal rolls (Niimbot/Phomemo) are indoor-grade. Per-label cost: cheap for paper, much higher for outdoor polyester + ribbon (ESTIMATE).

### Cited Findings
- Zebra Z-Ultimate 4000T: thermal transfer gloss polyester, permanent acrylic adhesive, up to 3 years outdoors, to 300F, UL/cUL recognition with compatible resin ribbon. — [Deploy Depot](https://deploydepot.ca/products/zebra-z-ultimate-4000t-multipurpose-label-10023059); [CDW 2000T](https://cdw.com/product/zebra-z-ultimate-2000t-labels-glossy-5000-labels/4103943)
- Zebra 8000T Tuff 7.0 mil polyolefin tag: up to ~2 years outdoors. — [Barcode Planet](https://www.barcodeplanet.com/zebra/8000t-tuff-7-0-mil.htm)
- Z-Perform 1000T is paper (indoor). — [Digitec](https://www.digitec.ch/en/s1/product/zebra-z-perf-1000t-70x30mm-70-mm-label-rolls-39574283)
- Brother TZe 24 mm x 8 m laminated tape ~$24-$29 (TZe-251 $28.99 Staples; TZe-S651 strong adhesive $25.99). — [Staples](https://www.staples.com/brother-p-touch-laminated-label-tape-1-x-26-2-black-on-white-tze251/product_24629111); [Walmart TZe](https://www.walmart.com/c/kp/tzes)
- Brother DK paper rolls: DK-1209 $25.98/800 (~$0.03 each), DK-1247 $25.48/180 (~$0.14 each) (per-label is derived). — [Bluedog Ink](https://www.bluedogink.com/brother-labels.html?page=6)

### Inferences
- ESTIMATE: TZe laminated 24 mm tape at ~$26/8 m, a 50 mm label uses ~5-6 cm waste included => ~$0.17-0.20 per 50 mm label; laminated TZe is marketed as water/chemical resistant but no outdoor-life rating was found.
- ESTIMATE: outdoor polyester + resin ribbon likely $0.05-$0.20 per small label at volume; I did not find per-roll counts to confirm.

### Gaps
- No datasheet-confirmed outdoor lifespan for TZe or Niimbot/Phomemo media; no confirmed per-roll label counts/prices for Z-Ultimate; Brother weatherproof RJ/DK roll compatibility with RJ-2035B not verified.

## Q5. How comparable companies split hardware vs subscription

### Takeaway
Payments/POS companies subsidize hardware (often negative gross margin) to win recurring revenue; asset-tracking SaaS (GoCodes) sells software by flat subscription with low-cost tags as consumables. Figures below partly from secondary sources.

### Cited Findings
- Toast FY2025: hardware+professional services revenue about $180M (down ~10%) with strongly negative gross profit (secondary data; cost ~ $400M cited by one analysis); subscription revenue ~$936M, gross profit ~$672M (~72%). Column labels in the source were jumbled; verify against the 10-K. — [Toast 10-K FY2025 (SEC)](https://www.sec.gov/Archives/edgar/data/1650164/000165016426000057/tost-20251231.htm); [stockanalysis](https://stockanalysis.com/stocks/tost/financials/metrics/); [panabee](https://www.panabee.com/news/toast-earnings-2025-annual)
- Block/Square: 2025 Square gross profit $3.9B (+9%); hardware and processing costs each cut ~2 points off Q4 growth; hardware margin not extracted. Q4 2024 hardware revenue $31.1M (-4.3%). — [Block 10-K FY2025](https://www.sec.gov/Archives/edgar/data/1512673/000162828026012254/xyz-20251231.htm); [Motley Fool transcript](https://www.fool.com/earnings/call-transcripts/2026/02/27/block-xyz-q4-2025-earnings-call-transcript)
- GoCodes: flat annual plans, not per tag: Standard $500/yr (200 assets, 3 users), Premium $1,000 (500 assets), Premium Elite $1,750 (1,000), Professional $2,500 (2,000); light-duty labels free from Premium; metal tags at wholesale; extra user blocks $400/yr; add-ons API $1,080/yr, work-offline $350/yr (FitGap, may be dated). — [GoCodes pricing](https://gocodes.com/prices/); [Capterra](https://www.capterra.com/p/130048/GoCodes-Asset-Management/pricing/); [FitGap](https://us.fitgap.com/products/012007/gocodes-asset-tracking)

### Inferences
- Pattern: hardware is a loss leader or breakeven; value sits in the subscription (70%+ GM). qrwty, with no payments take rate, has no equivalent to Toast's fintech revenue to subsidize hardware, so cheap third-party printers + software subscription is the lower-capital fit (ESTIMATE/judgment).
- Munbyn/Niimbot app-locked printer economics (razor/blade via consumables) not researched.

### Gaps
- Exact Toast/Square hardware gross margin percentages from filings not extracted; SumUp not researched; Munbyn/Niimbot consumable lock-in margins not found.

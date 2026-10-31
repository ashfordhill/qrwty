# Small-fleet connected hardware + software subscription economics (solo founder, 50-2,000 devices, 2024-2026)

Research date: 2026-10-31. Research was ~21 tool calls, mostly web-search snippets; few primary pages were fetched. Source quality is flagged per item. Items marked ESTIMATE are my arithmetic, not sourced figures.

## 1. All-in cost per unit at 200 and 1,000 units (Pi Zero / ESP32 device with display or printer)

### Takeaway
No published bill of materials for a comparable product was found. The fixed costs that must be amortised are cited below (certification roughly $2.5k-5.5k with a pre-certified module; enclosure tooling roughly $4k-12k or $0 with off-the-shelf boxes). A small-run crowdfunded ESP32 board came out at about 30 GBP cost per unit and sold for $99. Per-unit board and display costs are NOT sourced here (see Gaps).

### Cited Findings
- Raspberry Pi memory-driven price rises (2 Feb 2026) hit Pi 4, Pi 5, CM4 and CM5 with 2GB or more: 2GB +$10, 4GB +$15, 8GB +$30, 16GB +$60. 1GB models were unchanged (Pi 4 $35, Pi 5 $45). Older products (Zero, Pi 3) were stated to see no change. Raspberry Pi calls the situation "ultimately a temporary one". — [Raspberry Pi news, 2 Feb 2026](https://www.raspberrypi.com/news/more-memory-driven-price-rises/)
- Further increases followed: a second round on 1 April 2026 (CM4/CM5 listed at +$11.25 to +$100 depending on RAM; 16GB CM5 at $100 increase), and an October 2026 +$12.50 on 2GB Pi 4/Pi 5, with 2GB CMs spared. Secondary reports only; the "multi-year contract" explanation is speculation. — [Gigazine, Apr 2026](https://www.gigazine.net/gsc_news/en/20260402-raspberry-pi-price-increases); [OMG Ubuntu, Oct 2026](https://www.omgubuntu.co.uk/2026/10/raspberry-pi-2gb-costs-how-much-now/amp); [Tom's Hardware](https://www.tomshardware.com/raspberry-pi/raspberry-pi-5-price-increases-drastically-as-ai-shortage-bites-16gb-version-now-usd205-second-price-increase-in-three-months-over-70-percent-more-expensive-than-original-msrp)
- JLCPCB official assembly price page (updated Sep 2025 per search summary): economic assembly setup $8; standard setup $25 single-side / $50 double-side; stencil $1.50 economic, $7.86 / $15.72 standard; placement $0.0016 per joint (1-50,000 joints). 90% of assembly orders finish within 24-48h (excludes PCB fab and shipping). — [JLCPCB PCB assembly price](https://jlcpcb.com/help/article/pcb-assembly-price); [JLCPCB assembly FAQ](https://jlcpcb.com/help/article/pcb-assembly-faqs)
- Enclosure tooling (vendor marketing, mixed assumptions): single-cavity P20 mould for a small two-part electronics enclosure $4,000-10,000; multi-cavity/hardened $12,000-30,000+; one low-volume source says injection moulding is cost-optimal above roughly 5,000 units/year; hardened-steel moulds $20,000-100,000. Off-the-shelf catalogue enclosure is the lowest upfront cost option but no IP65 prices were found. — [DEV Community (sourcing agent)](https://dev.to/china-sourcing-agents/injection-mold-tooling-costs-for-electronics-enclosures-16dl); [Team Rapid Tooling](https://www.teamrapidtooling.com/injection-molding-cost-1000-10000-parts-a-680.html); [Formlabs](https://formlabs.com/blog/injection-molding-cost/)
- FCC: a host product using a pre-certified module needs only Part 15B (unintentional radiator) testing via SDoC. Cost figures conflict by source: $800-2,000 (15B alone) and $2,500-5,500 (total with module path), $660 at an overseas lab, $1,900 for an ESP32-WROOM BLE sensor at a New Hampshire lab (forum anecdote). "60-80% saving" claim is unverified vendor marketing. Sources are mostly lab/vendor marketing; markready.pages.dev is internally inconsistent. — [Compliance Testing LLC](https://compliancetesting.com/fcc-certification-faqs/fcc-certification-cost/); [Digi modular approval](https://www.digi.com/Support/knowledge-base/fcc-modular-approval); [Element checklist](https://www.element.com/resources/articles/fcc-ised-radio-module-checklist); [CEL](https://www.cel.com/blog/product-level-fcc-certification-steps/)
- UN 38.3 (battery shipping): approx. $1,500 per model for testing in one vendor document (16 packs + 25 cells); another seller says about $500; labs quote per project; lead times 1-8 weeks; 8 batteries per test group for packs under 12 kg. Very rough. — [Kiwa](https://www.kiwa.com/en/services/testing/battery-testing/); [AA Portable Power](https://aaportablepower.com/UN383test.html)
- Worked crowdfunding example: ESP32-S3 Rainbow (Crowd Supply). Total COGS 8,565.66 GBP for 300 ordered / 280 sellable = 30.60 GBP per unit; founder wanted 49.99 GBP, forced to $99; campaign/platform fees about $18.76 per item; distributor (Mouser) wants 40-60% markup; rule of thumb minimum 2.5x COGS. Single founder's blog, who says some costs are missing. — [atomic14 blog, 21 Jul 2025](https://atomic14.com/2025/07/21/crowd-funding-retro)
- Crowd Supply guide: price floor on even a trivially cheap board is about $10-20 per unit; small batches can cost 10x per unit vs large batches (engineer's post). — [Crowd Supply pricing guide](https://crowdsupply.com/guide/pricing-products)
- BusKill campaign: target price reachable only at more than 10,000 units; at under 1,000 units sold for $99. — via [lavx.hu summary](https://news.lavx.hu/article/the-brutal-economics-of-hardware-crowdfunding-why-your-99-dev-board-barely-breaks-even) (secondary)

### Inferences
- ESTIMATE, fixed costs per unit: certification $2,500-5,500 spread over 200 units = $12.50-27.50 each; over 1,000 units = $2.50-5.50 each. Injection tooling $4,000-12,000 over 200 = $20-60 each; over 1,000 = $4-12 each. Off-the-shelf enclosure removes this line but adds a per-unit box cost (not sourced).
- ESTIMATE: a founder should budget roughly $25-90 per unit of amortised NRE (cert + tooling) at 200 units, falling to roughly $7-18 at 1,000, before BOM, assembly, shipping, support and RMA. Combined with the 2.5x COGS rule of thumb and the Rainbow example (30 GBP COGS to $99 retail), a small connected device with display realistically lands at $80-150 retail if sold at hardware margin. These are my estimates, not sourced.
- Pi 4/5/CM pricing is volatile in 2026; a Pi Zero 2 W or ESP32 design avoids the memory surcharge.

### Gaps
- No cited BOM prices for Pi Zero 2 W (current list price), ESP32 modules, displays, thermal printers, batteries. Not retrieved.
- No MacroFab/PCBWay/Seeed Fusion quote pages retrieved; no PCBA per-unit quotes at 100-1,000 units; no lead-time data for full builds beyond JLCPCB assembly turn-time.
- No IP65 catalogue enclosure prices; no CE/UKCA or UL 62368-1 cost data (search returned none).

## 2. Monthly per-device cost a subscription must cover (connectivity + fleet management + support)

### Takeaway
Connectivity and fleet tooling are cheap relative to support: published rates run about $0.3-2 per month for cellular data and $0-6 per month for fleet management, versus a per-device annual price of $1,500-3,000 for commercial cameras. For a low-data LTE-M or Wi-Fi device, infrastructure is probably $1-5 per device per month; support cost is not documented.

### Cited Findings
- 1NCE: lifetime flat rate, 500MB + 250 SMS for 10 years: EUR 10 at launch (2018), now listed as EUR 12 (EU page) or USD 15 (Asia-Pacific/Singapore price list); excludes VAT and SIM/shipping. That is roughly $0.10-0.15 per month if amortised over 10 years. — [1NCE EU FAQ](https://1nce.com/en-eu/support/faq/what-is-included-in-the-1nce-lifetime-fee-are-there-any-additional-costs-to-be-taken-into); [1NCE 500 MB feature page](https://1nce.com/en-eu/1nce-connect/features/500-mb-data-volume); [1NCE Singapore price list](https://a.storyblok.com/f/335000/x/cfc1ac4a9d/1nce_pte_ltd_price_list_en.pdf)
- Hologram (current per search summary): $0.03/MB + $1 monthly recurring per SIM + $3 SIM; developer SIM free at 1MB/month. An older $0.40/month plan rose (community post cites $1.50). LTE-M-specific Hologram pricing not found. — [Hologram pricing docs](https://docs.hologram.io/guides/troubleshooting/2023-sim-and-data-pricing); [Hologram pricing](https://hologram.io/pricing/)
- Soracom: Europe 25MB LTE-M plan EUR 0.38/month first year then EUR 0.32 (undated search summary); US flat-rate bundles from about $1/month (2021 announcement). Verify live. — [Soracom EU plan](https://www.soracom.io/planx3-eu); [Soracom 2021 press release](https://soracom.io/press-releases/soracom-introduces-new-iot-connectivity-pricing-2021/)
- Golioth (official pricing page): $0.25 per active device per month ("Connect"); OTA bandwidth $0.0095/MB; logs/time-series $0.001/MB retained; no tiers; $50 free credit; up to 10% off with prepaid annual contracts. — [Golioth pricing](https://www.golioth.io/pricing)
- Particle: Free (100 devices), Basic $299/month per 100-device block (about $2.99/device), Plus $599/block (about $5.99/device). — [Particle pricing](https://particle.io/pricing) (via search snippet; toolradar listing June 2026)
- balena and Mender: figures conflict between aggregators (balena $159/month Prototype plan or $2-3 per device per month reported); Mender open source is free. Not verified against vendor pages. — [Mender blog](https://mender.io/blog/the-simplicity-of-menders-pricing-approach); [G2 balena](https://www.g2.com/products/balena/pricing)
- Home Assistant Cloud: started at $5/month in 2018; third-party listings say from $6.50/month. — [Home Assistant blog 2018](https://git.sebastienjean.net/jeans/home-assistant.io/src/commit/76f11cf79c31fc338fc016dd8d4e2d45c56f8e2a/source/_posts/2018-09-17-thinking-big.markdown) (mirror); [home-assistant.io/cloud](https://www.home-assistant.io/cloud/)

### Inferences
- ESTIMATE: Wi-Fi device with a managed fleet tool: about $0-0.50/month (Golioth $0.25 plus small OTA use; Mender OSS self-hosted at cost of a small VPS). LTE-M device: add $0.3-2/month for data. Total infrastructure roughly $0.5-3/month, up to about $6 if on Particle Plus.
- The subscription must therefore cover support and RMA risk, not infrastructure. If the fleet is 200 devices at $5-10/month, revenue is $12k-24k/year, so infrastructure is a small fraction of price; the break-even constraint is the founder's time.
- Provisioning and device-identity pain (captive portals, BLE provisioning) was not researched with citations (see Gaps).

### Gaps
- Support-hours-per-device benchmarks and cost not found.
- Outdoor solar + battery power costs not researched (no search run).
- Wi-Fi provisioning, device identity/security basics: no sources gathered.
- Mender/balena official per-device prices not confirmed.

## 3. Hardware vs subscription price structures and margins at comparable businesses

### Takeaway
Comparable vendors split into: subsidised hardware with software/payments earning the margin (Toast), device plus multi-year contract (Flock, Samsara), and low-cost hardware with high recurring revenue. Disclosed margins are rare; Toast's hardware line loses money.

### Cited Findings
- Flock Safety: third-party guides put the standard Falcon LPR camera at about $2,500-3,000 per camera per year plus $250-350 install; a Riverside County agreement describes a $500 discount versus a $3,000 standard rate; a Village of Grafton memo reportedly shows a $500 increase on 1 Jan 2024; older 2023 documents list $2,500 plus $650 implementation. Flock does not publish prices. — [Riverside County contract](https://media.rivcocob.org/proceeds/2023/p2023_10_31_files/03.36001.pdf); [South Lebanon OH agreement](https://southlebanonohio.org/download/legislation/2023_resolutions/2023-52-Flock-Camera-5-Year-Agreement-with-Flock-Group-Inc.pdf); [Safe & Sound guide](https://getsafeandsound.com/blog/flock-safety-pricing/); [Sacra](https://sacra.com/c/flock-safety/)
- Samsara (not published; third-party estimates, several from competitor Airpinpoint): software $27-45 per vehicle per month on 3-5 year contracts, hardware $99-148 per vehicle, install $50-150, dashcam licence about $55 per month extra. — [Tech.co review](https://tech.co/fleet-management/samsara-fleet-management-review); [Airpinpoint](https://airpinpoint.com/compare/samsara-pricing); [Costbench](https://costbench.com/software/fleet-management/samsara/)
- Toast FY2025 10-K: subscription services revenue $936M (+33%); fintech $5,037M (+24%); hardware and professional services $180M (-10%); total $6,153M. Third-party data (StockAnalysis, unverified vs filing) shows hardware and professional services gross profit around -$220M (FY2025) and -$170M (FY2024); Panabee calls hardware a loss leader (analyst inference). — [Toast FY2025 10-K](https://www.sec.gov/Archives/edgar/data/1650164/000165016426000057/tost-20251231.htm); [StockAnalysis](https://stockanalysis.com/stocks/tost/financials/metrics/); [Panabee](https://www.panabee.com/news/toast-earnings-2025-annual)
- Crowd Supply distributor markup 40-60% and campaign fees about $18.76 of $99 (see Section 1).

### Inferences
- The two profitable patterns for a tiny company are: (a) price hardware at 2.5x COGS or more and add a modest subscription; (b) enterprise-style multi-year contracts with a high annual price per device, which Flock-type pricing shows is $2,000+ per year when the value is high. A $5-10/month subscription is orders of magnitude below these.
- Not found: Square/SumUp, Lime, Tile/AirTag, Eco-Counter price structures; Pimoroni, MNT, Seeed reTerminal, Flipper margin disclosures; indie hardware gross-margin surveys. I did not search these, so say so rather than assume.

### Gaps
- Gross margins disclosed by indie hardware makers: none retrieved.
- Eco-Counter, Square, SumUp, Lime, Tile price structures: not researched.
- Toast hardware gross margin from the 10-K itself unverified.

## 4. Does BYOD + paid software (Home Assistant Cloud / OctoEverywhere) produce revenue?

### Takeaway
Yes in structure, but no revenue figures were found. Nabu Casa says it is profitable and funded only by Cloud subscriptions and hardware sales; OctoEverywhere is community-funded via Supporter Perks. Neither discloses revenue or subscriber counts in sources found.

### Cited Findings
- Nabu Casa: "profitable, has no external investors, and our only funding comes from people subscribing to Home Assistant Cloud and buying Home Assistant hardware." Home Assistant is used by over two million households (a user count, not subscribers). Reported rename to Home Assistant Link on 2 Oct 2026 (German and Spanish press; pricing unchanged; not independently verified). — [Home Assistant blog 2018 mirror](https://git.sebastienjean.net/jeans/home-assistant.io/src/commit/76f11cf79c31fc338fc016dd8d4e2d45c56f8e2a/source/_posts/2018-09-17-thinking-big.markdown); [State of the Open Home 2025](https://community.home-assistant.io/t/2-million-homes-strong-state-of-the-open-home-2025/878546); [tink.de](https://www.tink.de/blog/nabu-casa-home-assistant-cloud-wird-link/)
- The State of the Open Home 2025 post gives no Nabu Casa revenue, subscriber or hardware sales figures; it says a large share of Nabu Casa profit funds the Open Home Foundation and mentions 39 or 56 full-time staff (the post contradicts itself). Voice Preview Edition called "a pretty big hit" with no number. — [State of the Open Home 2025](https://community.home-assistant.io/t/2-million-homes-strong-state-of-the-open-home-2025/878546)
- OctoEverywhere: funded by Supporter Perks; monthly price rose $1 after 21 May 2024 because of processor and service costs; third-party listing from $3.99/month; Obico lists OctoEverywhere at about $5/month (competitor marketing). Obico Premium $83.88/year ($6.99/month annual billing). — [OctoEverywhere blog](https://blog.octoeverywhere.com/service-pricing-changes/); [Obico pricing guide](https://www.obico.io/de-DE/blog/is-obico-free-pricing-guide/)
- No evidence retrieved for WLED or OpenEPaperLink revenue.

### Inferences
- BYOD software subscriptions in the $4-7/month range exist and survive (Nabu Casa since 2018), but their scale rests on very large free user bases (2M+ households). A niche vendor would need a comparably large installed base; revenue evidence is absent so this cannot be quantified.

### Gaps
- Nabu Casa revenue or paying subscriber counts; OctoEverywhere/Obico revenue; WLED, OpenEPaperLink monetisation: not found.

## 5. Support, failure and why small hardware companies fail

### Takeaway
Evidence is anecdotal. Cash-cycle and unit-economics failures dominate commentary; Pi field failures cluster around SD card corruption on power loss.

### Cited Findings
- Commentary: hardware failures are cash-cycle failures (tooling, inventory, freight paid before sales); profitable-per-unit firms still need to finance stock; manufacturers require partial payment upfront. Statistics are weak: the Loot-Drop summary of 59 failed hardware startups reports 27.1% ran out of cash (methodology unverified); CB Insights 38% figure is all startups, secondhand. — [Hackster 13 reasons](https://www.hackster.io/news/13-reasons-why-hardware-startups-fail-and-how-to-make-sure-yours-doesn-t-2594afe97d3a); [Loot-Drop](https://www.loot-drop.io/deep-dive/hardware); [Medium cash flow](https://medium.com/startups-and-investment/hardware-startups-you-need-to-understand-cash-flow-20da7018c77d)
- Pi field failures: filesystem corrupts on power loss, Pi boots read-only, and the device silently stops working. Mitigations: overlay/read-only root, USB or eMMC boot, UPS HAT; industrial SLC card claims unverified. Read-only mounts can also come from I/O faults. — [DEV Community field lessons](https://dev.to/ranaweerasupun/deploying-production-systems-on-raspberry-pi-lessons-from-the-field-1i4k); [Industrial Monitor Direct](https://industrialmonitordirect.com/blogs/knowledgebase/preventing-raspberry-pi-sd-card-corruption-in-industrial-iot-systems); [openHAB forum](https://community.openhab.org/t/corrupt-filesystems-every-2-3-month/13057/20)

### Inferences
- A subscription priced for remote recovery (watchdog, A/B updates, read-only root) is the mitigation to design in; no RMA rate was sourced so budget a placeholder (ESTIMATE, uncited) and flag it as an unknown in the report.

### Gaps
- No Bolt, Dragon Innovation, HAX or CB Insights primary reports retrieved; no RMA rates; no eMMC field failure data; no UL 62368-1 or CE/UKCA cost data.

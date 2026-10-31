# Operator-side QR/app payment evidence, Lime economics, fleet/software prices, BYOD revenue (gap-fill, fetched 2026-10-31)

Method: ~22 tool calls. Pages marked [FETCHED] were opened directly (WebFetch returns a model summary, not raw text, so treat figures as read-through-summary). [SEARCH] = search snippet only. Many target pages (Campspot, Dockwa, Hamilton, Cryptopay, myTurn, Luxer One, Parcel Pending, CSC, ShinePay, Coin Laundry Association) returned no prices, 403/404, or were not reached ("not fetched").

## 1. Operator-side evidence (what operators pay, complaints)

### Takeaway
Little primary operator pricing surfaced. Only laundry (anecdotes) and self-storage (one trade-article figure) gave anything. Campground, marina, car wash, tool library and makerspace operator fees: not found.

### Cited Findings
- Noke smart entry (Janus): "roughly $200 to $300 per smart lock", covering product, installation and tenant mobile app; no Noke membership plan mentioned (the membership tiers in that article belong to DaVinci Solutions). Article undated; link points to the Sept 2025 issue. [FETCHED] — [Modern Storage Media](https://digital.modernstoragemedia.com/?p=231976)
- A search snippet attributed to the same page claimed "$13.90 per lock, $20/month membership, 20 locks max". The fetch contradicted this (those belong to DaVinci). Do not use the $13.90 figure. — [Modern Storage Media](https://digital.modernstoragemedia.com/?p=231976)
- Janus STORLOCAL study (Janus-hosted, vendor): operators can charge tenants e.g. $5/month after-hours or $15/month 24-hour access. [SEARCH] — [Janus PDF](https://www.janusintl.com/hubfs/STORLOCAL-Securing%20Profits%20with%20Noke%CC%84%20Smart%20Entry%20System.pdf)
- Tenant Turner claims its Seros devices cost $3.50/device/month vs $5/month for "other smart access systems". Vendor claim. [SEARCH] — [Tenant Turner](https://pages.tenantturner.com/seros)
- Laundromat operators (Planet Laundry feature, since moved to Coin Laundry Association's Full Cycle): one owner says "Transaction fees definitely are real, but customer convenience is king" and app users "seem to spend more"; another calls "credit card processing fees ridiculous". Card processing averages 1.5-3% of sale per the article. [SEARCH snippet; full page not read, redirect to laundryassociation.org/fullcycle/ not followed] — [Planet Laundry p=12220](https://planetlaundry.com/?p=12220)
- Consumer complaint: a Speed Queen app reviewer called the pay step a waste of time that existed to save the owner card fees. Aggregator; weak. [SEARCH] — [justuseapp](https://justuseapp.com/en/app/1235121730/speed-queen/reviews)
- Campspot pricing page: no prices shown. [FETCHED] — [Campspot](https://www.campspot.com/pricing). Dockwa pricing: 403. myTurn pricing: 404. Not fetched: Hamilton, Cryptopay, CSC/Hercules/LaundryCard/ShinePay owner fees, Luxer One, Parcel Pending, Coin Laundry Association articles.

### Inferences
- The "complaint about fees" evidence is limited to laundry owners who accept fees as the cost of convenience; no lock-in complaint found for any category.

### Gaps
- Operator costs and quoted fee/lock-in complaints for car wash, campground, marina, tool library, makerspace; laundry owner-side % and hardware; locker pricing. All not obtained.

## 2. Lime / Bird / lockers

### Takeaway
Lime's FY2025 S-1 numbers are profitable at the adjusted level and give per-vehicle-per-day revenue; per-ride revenue and unlock fee were not found. Bird and locker pricing not found.

### Cited Findings
- Lime FY2025 (from S-1 filed May 2026, via trade coverage): revenue $886m (one spot says $887m), adjusted EBITDA $218.1m (+42%), adjusted gross margin ~53%, operating income $70.4m, net loss $59.3m (~$99m non-cash convertible-note fair-value loss), FCF $103.8m, 325,137 vehicles at year-end, $7.47 revenue per vehicle per day (vs $6.80 in 2024), ~$1.3k fully landed vehicle cost with ~12-month payback, ~19m riders, 3.8m MAU, 72% pay-as-you-go / 28% LimePass/Prime. [FETCHED, secondary] — [micromobility.io](https://micromobility.io/news/886m-230-cities-and-an-ipo-filing---inside-limes-s-1)
- Same coverage reports >1 billion lifetime rides and ~230 cities in 29 countries at 31 Dec 2025. [SEARCH] — [micromobility.io](https://micromobility.io/news/886m-230-cities-and-an-ipo-filing---inside-limes-s-1)
- Lime 2024 (official release, not fetched, 403): $810m gross bookings, $686m net revenue, adjusted EBITDA >$140m, >200m rides. [SEARCH snippet] — [BusinessWire 18 Feb 2025](https://www.businesswire.com/news/home/20250218624910/en)
- Techleap reports 2025 revenue $886m vs $686m 2024 and $59m loss. [SEARCH] — [Techleap](https://finder.techleap.nl/news/feed/lime-files-for-ipo-despite-59m-loss-in-2025-as-revenue-climbs-to-886m)

### Inferences
- $7.47/vehicle/day is revenue, not profit; with ~53% adjusted gross margin the per-vehicle gross profit is about $4/day (my arithmetic).

### Gaps
- Per-ride revenue, unlock fee, per-minute rate (not in the fetched coverage; S-1 itself not fetched). Bird. Luxer One/Parcel Pending pricing.

## 3. Fleet/software and Stripe prices (vendor pages, fetched)

### Takeaway
Confirmed: balena is costly at small scale ($159/mo for 30 devices), Mender Basic $34/mo for 50, Golioth $0.25/device/mo, Particle $299/100 devices. AWS IoT Core connectivity is pennies per device-year.

### Cited Findings
- balena: Free $0 (10 devices); Prototype $159/mo (30 devices, +$3 each); Pilot $329/mo (60 devices, +$2); Production $1,439/mo (110 devices, +$2). Annual: $1,720 / $3,588 / $15,588. [FETCHED] — [balena pricing](https://www.balena.io/pricing)
- Mender: Open Source free; Basic $34/mo up to 50 devices; Professional $291/mo up to 250; Enterprise custom; >2,000 devices contact sales. [FETCHED] — [Mender pricing](https://mender.io/pricing)
- Golioth (confirmed): Connect $0.25 per active device/month; Fleet Control (OTA) $0.0095/MB; Pipelines $0.0080/MB; logs and time-series $0.001/MB retained; Location $0.005/request; $50 free credit; up to 10% off prepaid annual. The Teams $299/mo tier in the earlier note was not on this page. [FETCHED] — [Golioth pricing](https://www.golioth.io/pricing)
- Particle (confirmed): Free up to 100 devices (100K data ops/mo); Basic $299/mo per 100-device block (720K ops); Plus $599/mo per block (5M ops). [FETCHED] — [Particle pricing](https://www.particle.io/pricing/)
- AWS IoT Core: connectivity $0.08 per million minutes ("$0.042 per device per year" for 24/7); messages $1 per million (first billion; the page showed Ireland example, US East rate not listed; 5 KB metering); rules $0.15 per million (Canada example); 12-month free tier: 2.25M connect-minutes, 500K messages, 250K rules. [FETCHED] — [AWS IoT Core pricing](https://aws.amazon.com/iot-core/pricing/)
- Stripe Terminal: 2.7% + 5c domestic in-person; Reader M2 $59, S700/S710 $299, T600 $329; Tap to Pay +$0.10/auth. Online: 2.9% + 30c; Payment Links/Checkout included at no extra charge on standard pricing (custom domain $10/mo). [FETCHED] — [Stripe pricing](https://stripe.com/pricing)
- Stripe PCI: the Integration security guide says low-risk integrations send card data "directly to Stripe without it passing through your servers"; it names no SAQ type. The Stripe PCI guide says Checkout and Elements host card inputs in a Stripe-domain iframe, "so your customers' card information never touches your servers," and that this meets "PCI eligibility for the SAQ A". It does not address Payment Links. [FETCHED, summarised] — [Stripe security guide](https://docs.stripe.com/security/guide); [Stripe PCI guide](https://stripe.com/guides/pci-compliance)

### Inferences
- Stripe Terminal for unattended QR vending is not needed; Checkout via QR is cheaper per transaction on a fixed fee (30c vs 5c, 2.9% vs 2.7%) but needs no reader ($59-329). Break-even depends on ticket size (my arithmetic).
- At 200 devices: balena Production ~ $1,439 + 90x$2 ~ $1,619/mo (~$8/device); Mender Professional $291/mo (~$1.46); Golioth $50/mo; Particle 2 blocks Basic $598/mo ($2.99). (arithmetic from the above)

### Gaps
- AWS US East message rate; Payment Links SAQ A statement; PCI SSC text.

## 4. BYOD-software revenue evidence

### Takeaway
No subscriber counts or revenue found for Nabu Casa, OctoEverywhere, WLED or OpenEPaperLink.

### Cited Findings
- Nabu Casa: job listing states it "is profitable, has no external investors, and our only funding comes from people subscribing to Home Assistant Cloud and buying Home Assistant hardware"; Open Home newsletter says 30+ employees (unverified). Cloud reportedly renamed Home Assistant Link on 2 Oct 2026 (German/Spanish press). No subscriber or revenue figure in results. [SEARCH] — [Nabu Casa about](https://nabucasa.com/about/); [tink.de](https://www.tink.de/blog/nabu-casa-home-assistant-cloud-wird-link/). The State of the Open Home 2025 blog URL I guessed returned 404 (not fetched; the earlier note's forum link is the same post).
- OctoEverywhere supporter page: "100% community funded", "20+ Supporter Perks"; no prices or user counts on the fetched page. [FETCHED] — [OctoEverywhere](https://octoeverywhere.com/supporter)
- WLED creator GitHub Sponsors tiers $2-$120/month; sponsor count not obtained. WLED ~15,077 stars (third-party tracker), 312 contributors. OpenEPaperLink ~1,363 stars, created Dec 2022 (mid-2025 snapshot). [SEARCH] — [GitHub Sponsors Aircoookie](https://www.github.com/sponsors/Aircoookie); [ecosyste.ms OpenEPaperLink](https://awesome.ecosyste.ms/projects/github.com%2FOpenEPaperLink%2FOpenEPaperLink)

### Gaps
- Printful-like analog with numbers; all revenue figures above.

## 5. Small Pi/ESP32 device + subscription with disclosed sales

### Takeaway
Only Pimoroni (hardware only, old) surfaced. No Pi-hole, Tindie or subscription-device unit/revenue disclosure found.

### Cited Findings
- Pimoroni investor page: turnover £2.75m in year 4 (up 75%) from £15,000 seed; flagship products "well over 250,000 units"; undated (likely ~2016). Pibow case 175,000 units by Sept 2016 per history page. [SEARCH] — [Pimoroni /invest](https://pimoroni.com/invest); [Pimoroni history](https://pimoroni.com/history)
- Datanyze estimates Pimoroni revenue $2.9m, 15 staff (aggregator, low confidence). [SEARCH] — [Datanyze](https://datanyze.com/companies/pimoroni/356492282)

### Gaps
- Not searched or not found: Crowd Supply/Kickstarter post-campaign updates, Indie Hackers, Tindie stats, Pi-hole, Ubiquiti-like SMB devices with disclosed units.

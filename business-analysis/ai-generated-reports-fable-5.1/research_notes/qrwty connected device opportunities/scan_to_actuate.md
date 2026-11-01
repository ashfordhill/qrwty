# Scan-to-actuate systems (QR -> server -> connected device acts): categories, platforms, SMB gaps, regulatory (US, 2024-2026)

Method note: 16 searches and 3 fetches. Most figures come from search-result summaries, reseller pages and trade/vendor blogs, not primary price lists. Only the Hologram pricing page, the Stripe security guide and the Cantaloupe 10-K excerpt were opened directly. Each claim is tagged [VENDOR], [RESELLER], [THIRD-PARTY], [ANECDOTE] or [PRIMARY]. Many specifics were not found; see Gaps.

## Q1. In which categories is device + QR + per-transaction already proven, and what do incumbents charge (monthly + per-transaction + hardware)?

### Takeaway
The model is proven at scale in vending/unattended retail (Cantaloupe: 1.28M active devices), laundry (CSC app scans a machine QR), EV charging, micromobility and car wash. Incumbents mostly take roughly 3.5-6% per transaction plus a small monthly device fee plus hardware. Smart lockers and access control are sold per unit or per door and are quote-based, with no QR-take-rate model.

### Cited Findings
- Cantaloupe FY2025 (FYE 6/30/2025): 1.28M active devices (1.22M prior year) and 34,896 active customers (31,466 prior year). Revenue streams are subscription, transaction processing and equipment. "The majority of customers pay a monthly service fee plus a blended percentage rate on transaction volumes." Equipment is sold, financed, or provided via the monthly bundled "Cantaloupe ONE" subscription. Agreements are generally cancellable on 30 days' notice. [PRIMARY] [Cantaloupe 10-K FY2025, SEC](https://www.sec.gov/Archives/edgar/data/896429/000162828025041775/ctlp-20250630.htm). Only the first 100k of 246k characters were read, so revenue by stream and take rate were not verified from the filing.
- Cantaloupe revenue about $303M (+13%) and $3.4B transaction dollar volume in FY2025. [THIRD-PARTY search summary of the 10-K headline; not verified from the filing text]
- Cantaloupe take rate of about 5.27% in Q1 FY25, up from 4.84% in FY22, attributed to micro-markets and smart stores. This is an investor Substack estimate, not a filing figure. [THIRD-PARTY] [P14 Capital](https://p14capital.substack.com/p/long-ctlp-cantaloupe-inc)
- Nayax reseller-quoted pricing, with no official rate card found:
  - 5.95% on vends of $5 or less, and 2.5% + $0.10 above $5.
  - Other resellers quote 3.5% + $0.20 and 3.0% + $0.20.
  - Cashless-only plans run about $7.95-$9.99/month, with a $30 activation per device at some resellers.
  - Dynamic QR is generated on the reader screen and static QR is reusable. No separate QR rate was found.
  [RESELLER] [candymachines.com Nayax pros/cons](https://www.candymachines.com/pros-and-cons-of-using-nayax), [Nayax U QR terminology](https://nayax-u.nayax.com/article/qr-payments-terminology-payments-101-2074), [vmfsusa Nayax guide](https://vmfsusa.com/blogs/business/nayax-vending-card-reader-guide)
- PayRange (Bluetooth/phone payments for vending, laundry and amusement):
  - FAQ lists 3.95% US (4.25% Canada), 5.25% for amusement, plus a $0.02 PICS fee per transaction. An inbound-leads page instead says 3.49% + $0.02.
  - BluKey hardware is $79.95 on the FAQ, or $59.95 + $20 service bundle on the leads page. Trade press reported BluKey at $79 and BluKey Plus at $99 after a price increase. BluKey Connect (monitoring) is $299.95 + $4.95/location/month.
  - An industry average of 6-7% per transaction is cited, and Crane advertises 5.4%.
  - The two PayRange pages conflict; verify on payrange.com. [VENDOR] [PayRange FAQ](https://shop.payrange.com/?p=4303), [PayRange leads page](https://payrange.com/inbound-calls), [Vending Market Watch price increase](https://vendingmarketwatch.com/technology/news/12188964/payrange-announces-price-increases-for-blukey-and-blukey-plus-products)
- Kisi door access (QR/mobile unlock, visitor passes) does not publish prices. Vendr estimates are inconsistent:
  - $50-80/door/month (1-5 doors), $40-70 (5-20 doors), $30-60 (20+ doors).
  - Median annual spend is about $5.1-5.25k, range about $1.4k-$18.7k.
  - Month-to-month costs 15-30% more than annual.
  - Kisi's own blog cites an industry range of $600-$1,600/year per door for door licenses.
  [THIRD-PARTY] [Vendr Kisi](https://www.vendr.com/buyer-guides/kisi), [Kisi cost blog](https://www.getkisi.com/blog/breakdown-of-access-control-system-installation-costs)
- Smart parcel lockers are quote-based:
  - An undated Multifamily Executive piece says base models from Parcel Pending, Package Concierge and Luxer One cost $6k-$20k plus a monthly fee. [THIRD-PARTY] [MFE](https://www.multifamilyexecutive.com/technology/luxer-one-offers-affordable-alternative-to-package-lockers_o)
  - Luxer One said in 2020 financing was available "as affordable as $249/month". [VENDOR, 2020]
  - A generic buyer's guide says $10,000+ for a system. [THIRD-PARTY] [Click n Collect](https://clickncollect.com/blog/how-much-do-smart-lockers-cost)
  - A "2026 Parcel Pending" page showing $15k-$60k base plus $3k-$25k install looks low quality; do not rely on it.
- Micromobility: Lime and Bird unlock is about $1 (Bird $1-1.50) plus about $0.15-0.52/min depending on city. [THIRD-PARTY rental-guide, not company-sourced] [Levy Electric guide](https://levyelectric.com/resources/how-much-do-lime-bird-scooters-cost-complete-pricing-guide). The only unit-economics model found is a ~2018 Bird Santa Monica estimate of about $16/day/scooter on 5.5 trips/day, which is outdated. [THIRD-PARTY] [Oversharing substack](https://oversharing.substack.com/p/scooters-might-actually-have-good-unit-economics)
- EV charging: QR-start without an app exists.
  - EV Connect launched app-free QR charging. [VENDOR] [EV Connect](https://www.evconnect.com/blog/ev-charging-without-app-qr-code/)
  - The Open Charge Alliance published a June 2026 whitepaper on QR payments via OCPP 2.0.1/2.1. [VENDOR/standards body] [OCA](https://openchargealliance.org/?p=280845)
  - ChargePoint and Cariqa announced ad hoc QR payments (Aug 2026), pricing not found. [TRADE PRESS] [electrive](https://electrive.com/2026/08/26/chargepoint-and-cariqa-partner-on-qr-code-payments)
  - Small-operator back-ends: askacharge.com is reportedly EUR 20/month per brand with 0% software commission and QR with no app or account (Europe-oriented). [THIRD-PARTY listing] [Capterra](https://www.capterra.com.au/software/1105333/askacharge-com). OpenCPO is open-source (Apache 2.0), OCPP 1.6/2.0.1, with a QR-start driver web app. [THIRD-PARTY listing] [ecosyste.ms](https://awesome.ecosyste.ms/projects/github.com%2Fopencpo%2Fopencpo)
- Laundry: the CSC ServiceWorks CSCPay app lets users scan a machine QR, view the balance and add funds (Apple Pay, Google Pay, card). Owner-side fee terms were not found. [VENDOR app listing] [App Store](https://apps.apple.com/app/id1368674385)
- Car wash: QR/cashless add-ons exist (Coinless, Dencar QR Pay Station, RinsePay, ShinePay, Swash). Coinless earns subscription + transaction fees; Dencar is described as owner-installable. Fee levels not found. [VENDOR/trade] [Dencar](https://www.carwash.com/dencar-qr-pay-station/), [Coinless](https://coinlessmobile.com/onboarding)
- QR order-at-table (me&u/Mr Yum): me&u merged with Mr Yum in Sept 2023. No official per-order fee found. A 2021 Square post said no upfront or subscription fees. Customers on ProductReview.com.au report fees of about 1.05-1.6% charged at the table. [ANECDOTE] [ProductReview](https://www.productreview.com.au/listings/me-u), [Square AU](https://squareup.com/au/en/the-bottom-line/inside-square/mr-yum-integration-au)

### Inferences
- Pattern is validated as a "payment + telemetry" take-rate business in vending and laundry. The scan-to-actuate step is secondary to payment in incumbent pricing.
- Access control and lockers monetise through per-door or per-unit SaaS rather than per-scan fees. A per-scan-logged QR product competes on a different axis.
- The dynamic-QR-on-device vs static-QR-sticker distinction matters. Static QR + server is the cheaper SMB design, with the device acting only on server command.

### Gaps
- No primary Nayax, Cantaloupe or Seed rate cards; no Cantaloupe equipment/subscription per-device figures (10-K MD&A not read past 100k chars).
- No Toast, me&u or ParkMobile/Flowbird operator pricing; no Lime/Bird filing economics (Lime's 2025-26 financials not searched); no CSC/Hercules/LaundryCard owner fees; no Luxer One current price per bank; no Brivo/Openpath prices; no equipment-rental kiosk or printing-kiosk data; no parking research at all.

## Q2. Where are small operators paying high platform fees or lacking a self-hostable option, with evidence?

### Takeaway
Evidence is thin and mostly anecdotal. Fee levels of roughly 4-6% (Nayax, PayRange, Cantaloupe) versus 2.9% + $0.30 on plain Stripe are verifiable; direct operator complaints are sparse. Open-source and self-hostable options exist only in EV charging (OpenCPO) and hobby QR-lock projects.

### Cited Findings
- Planet Laundry feature: a Ferndale, WA owner reports 73% app adoption; a McCandless, PA operator calls card processing fees "ridiculous" and says ATM revenue offsets them. [ANECDOTE in trade press] [Planet Laundry](https://planetlaundry.com/?p=12220)
- RV park operator on a mobile-home forum who switched laundry to app payment said sales dropped sharply and wished they had kept coin; a commenter suggested keeping coin alongside. [ANECDOTE, single thread] [Mobile Home University forum](https://forum.mobilehomeuniversity.com/t/wahsing-machines-shinepay-or-other-cashless-solution/31301)
- A consumer guide (Gerald, which promotes its own cash-advance app) estimates laundromat card readers cost $200-$400 per machine plus install. Unverified. [THIRD-PARTY, biased] [Gerald](https://joingerald.com/learn/banking--payments/pay-laundry-costs-with-credit-card)
- Cantaloupe's customers can cancel on 30 days' notice, which suggests switching is possible. [PRIMARY] [10-K](https://www.sec.gov/Archives/edgar/data/896429/000162828025041775/ctlp-20250630.htm)
- Open-source/self-host options found:
  - OpenCPO (EV), see above.
  - TheIoTProject: Flutter app showing virtual keys as QR codes, Python scanner on a Raspberry Pi with a 12V relay. An ESP32 version is in progress and its state should be checked. [THIRD-PARTY hobby] [Electromaker](https://www.electromaker.io/project/view/theiotprojectkey-scanner), [GitHub](https://github.com/theiotproject)
  - Academic ESP8266 QR-lock prototype (ABUAD 2024). A 2021 thesis found MicroPython QR decoding on ESP32 was not feasible with the libraries tried. These are camera/reader-on-device designs, a different architecture from phone-scans-sticker.
- No evidence found for campground, marina, self-storage, makerspace or tool-library operators; I found no operator-level forum evidence for them in the searches run.

### Inferences
- Fee arbitrage (about 4-6% incumbent vs about 2.9% + $0.30 plus own SaaS fee) is the plausible wedge, but the "10-15% fees" premise in the brief was not found for any hardware-payment incumbent; me&u-style order fees and app-store-style cuts were not substantiated.
- No ready self-hostable "scan sticker -> Stripe -> relay" product was found in these searches. This absence is consistent with a gap but is not proof.

### Gaps
- Reddit (r/vending, r/laundromat), VendingConnect and similar forums were not retrievable; searches returned no direct threads. No quantified complaint data on fees. No community tool-library/makerspace tooling (e.g., Sharetribe-like, Cobot, Nexudus) was checked.

## Q3. What does a minimal connected actuator cost per unit, and what are ongoing connectivity/fleet costs per device per month?

### Takeaway
Wi-Fi relay boards are cheap (tens of dollars). Cellular adds module cost plus about $1/month/SIM at low data volumes on Hologram. Fleet/cloud costs at SMB scale can be near zero on free tiers. Verified figures are few.

### Cited Findings
- Hologram self-service (page fetched directly): $0.03/MB, $1/month per SIM, $3 per SIM card, $0.19 per outbound SMS; custom plans have no published prices; LTE-M is not mentioned on the page. [PRIMARY] [Hologram pricing](https://www.hologram.io/pricing/). An archived 2023-24 page listed $0.10/MB US with the same $1/month. [THIRD-PARTY/archive] [Hologram docs](https://docs.hologram.io/guides/troubleshooting/2023-sim-and-data-pricing)
- Soracom: older US tiers $0.073/MB (first 250MB) down to $0.047/MB (1-5GB); Europe 25MB for EUR 0.38/month in the first year. Dates unclear. [THIRD-PARTY/older vendor blog] [Soracom](https://soracom.io/improve-iot-roi-with-low-data-volume-pricing-from-soracom/)
- KinCony ESP32 cellular relay boards: KC868-A2 (2-ch, 4G) from $40, KC868-A8S (8-ch GSM) from $75, A16S from $140. Cellular band (not clearly LTE-M) unspecified. [VENDOR] [KinCony](https://shop.kincony.com/collections/kc868-ax)
- SIMCom Cat-1bis modules about $18-20 each at qty 1 (TME); no LTE-M module price found. [RESELLER] [TME](https://www.tme.com/us/en-us/katalog/m2m-gprs-lte-5g-modules_113195/params/b375_interface/p1535410_sim/)
- Fleet/cloud: Golioth has a free individual tier and a Teams tier reported at $299/month; AWS IoT Core is pay-per-message with no per-message rates captured; balena prices not obtained. [THIRD-PARTY] [toolradar Golioth](https://toolradar.com/tools/golioth/pricing), [AWS IoT pricing](https://aws.amazon.com/iot/pricing/)

### Inferences
- A QR scan-and-unlock device sends a few KB per event, so even at $0.03/MB the cellular data cost is cents per month; the $1/month SIM fee dominates. Back-of-envelope, not a cited figure.
- Wi-Fi-only deployments avoid connectivity cost but depend on site Wi-Fi.
- Enclosure, power supply and lock/actuator hardware costs were not researched; the all-in per-unit BOM is therefore unknown.

### Gaps
- Balena, Golioth and AWS per-device rates not verified from primary pages; no LTE-M-specific data plan price; no enclosure/PSU/solenoid costs; no Particle or Soracom current prices; no Wi-Fi-only ESP32 relay prices beyond cellular ones.

## Q4. Is "QR -> hosted checkout -> server -> device acts" reproducible by small vendors without PCI burden? (plus ADA / unattended rules)

### Takeaway
Yes for card data: using Stripe-hosted or Stripe-tokenized integrations keeps card numbers off your servers, but the merchant still attests annually and carries some page-security duties. ADA and unattended-payment rules are unresolved by my searches.

### Cited Findings
- Stripe states PCI is a shared responsibility; Stripe is a PCI Level 1 Service Provider, and the business "must do so in a PCI-compliant manner, and annually attest". Low-risk integrations "securely collect and transmit payment information directly to Stripe without it passing through your servers, reducing your PCI obligations"; handling PANs directly can mean 300+ controls. Stripe stores no SAQ type on this page. [PRIMARY] [Stripe security guide](https://docs.stripe.com/security/guide)
- Redirect to hosted checkout (checkout.stripe.com) is widely described as SAQ A-eligible. Elements/embedded flows are reported variously as SAQ A or A-EP. [THIRD-PARTY blogs; not from PCI SSC] [cside](https://cside.com/blog/can-you-use-stripe-for-pci-dss)
- Claim that the 2025 PCI DSS 4.0 requirements 6.4.3 and 11.6.1 apply to hosted checkout merchants loading scripts could not be confirmed against PCI SSC. [UNVERIFIED] [cside](https://cside.com/blog/does-stripe-make-you-pci-compliant-6-4-3-11-6-1)
- Stripe says verify webhook signatures and use TLS 1.2+ on payment pages. [PRIMARY] same Stripe guide.
- ADA: one accessibility vendor blog says no law requires QR codes, but once used they fall under accessibility obligations. The Kiosk Manufacturer Association has a 14-point ADA checklist; no source stated QR-only is prohibited or that cash must be offered. [THIRD-PARTY] [PageLoot](https://pageloot.com/blog/top-industries-using-ada-compliant-qr-codes/), [KMA via PRNewswire](https://prnewswire.com/news-releases/kiosk-association-kma-announces-new-ada-accessibility-and-emv-initiatives-301228384.html)

### Inferences
- The architecture (static QR -> Stripe Checkout -> signed webhook -> command to device) leaves the vendor handling no PANs, so the PCI burden should be limited to SAQ A, subject to confirming current SAQ A criteria with the acquirer.
- Webhook-to-actuation introduces non-PCI risks: replay, double-vend, failure-after-payment and refunds, which are product design issues rather than compliance ones.
- A fallback (keypad, staff call, cash or card alternative) reduces ADA exposure; this is judgment, not legal advice.

### Gaps
- No PCI SSC SAQ A text read; no state unattended-payment, weights-and-measures (for dispensing) or card-network "unattended terminal" rules found; no ADA Standards / DOJ guidance on QR-only access; no Section 508/ WCAG-for-kiosk source; no unattended-payment specifics for EV charging (e.g., NEVI ad hoc card-reader requirement) were checked.

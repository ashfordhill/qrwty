# Presence-proof gap-fill: stamp-rally pricing, outdoor hardware, cheating, SaaS pricing, sponsored visits

Method note: ~20 calls. Fetched pages are marked "fetched"; search-summary-only items are marked. Not found / not fetched items are in Gaps. Dates are as stated on pages; many pages show none.

## 1. Japanese digital stamp-rally platform pricing and municipal budgets

### Takeaway
Fetched vendor pages show two price points: LY Corp "the stamprally" (LINE mini app) at JPY 98,000 initial + JPY 150,000+/month (about JPY 500k-700k per campaign), and Decentral "らくらくラリー" at JPY 40,000/month with no initial fee listed. All use QR and GPS; none mention NFC. Municipal data found is voucher-scale (Sendai JPY 2.1bn) rather than stamp-rally software spend.

### Cited Findings
- the stamprally (LY Corporation, LINE mini app package): initial fee from JPY 98,000; monthly from JPY 150,000. Examples (tax incl., approx.): 1 month/10 spots/1,000 people about JPY 500,000; 2 months/30 spots/2,000 people about JPY 600,000; 3 months/50 spots/3,000 people about JPY 700,000. Methods: QR, GPS, on-screen physical stamp, LINE touch, riddle; NFC not mentioned. Page undated (fetched) — [LYC Biz](https://www.lycbiz.com/jp/service/line-mini-app/package/the-stamprally)
- らくらくラリー (Decentral Inc., Kyoto), press release 2026-05-29: monthly plan (31+ days) JPY 40,000/month; spot plan (30 days or less) JPY 60,000; no initial fee listed; QR, GPS and new keyword authentication; NFC not mentioned (fetched) — [PR TIMES](https://prtimes.jp/main/html/rd/p/000000004.000181685.html)
- EDWARD (LINE mini app) stamp-rally function: initial fee covers LINE mini-app application and basic set-up; monthly fee includes up to 3,000 friends, then +JPY 5,000 (ex tax) per additional 3,000; LINE OA cost separate. Search-engine summary only; amounts of initial/monthly not captured — [newscast.jp](https://newscast.jp/smart/news/5267641) (not fetched)
- Sendai "仙台まちいこ" (city announcement 2022-10-18): QR-scan stamps at 1,826 participating stores (as of 20 Oct); 4 stamps in an area earn JPY 2,000 in digital vouchers, up to JPY 20,000 per person; planned issuance budget JPY 2.1 billion; period 2022-10-20 to 2023-02-28; no GPS mentioned; participant (customer) count not given (fetched) — [Sendai City](https://www.city.sendai.jp/sesakukoho/gaiyo/shichoshitsu/kaiken/2022/10/18megutoku2.html)
- Earlier note's municipal data stands (Gifu 4,077-7,440 participants; JPY 5,000,000 tender cap, QR no GPS) — see presence_proof_stamp_rallies.md.

### Inferences
- Software price per campaign runs roughly JPY 40k/month to JPY 500-700k per campaign, i.e. well under JPY 1M; a presence-proof hardware add-on would need to fit inside the same budget or be pitched as a prize/voucher-linked integrity feature.
- Vouchers (Sendai) show the largest money flows are incentives, where fraud pressure is highest, not the software fee.

### Gaps
- SpotTour, Furari, ラリーズ, COCOAR, PIAZZA pricing not fetched (search returned only a SpotTour PDF on cycling-ehime.com, unread). No municipal procurement doc with both JPY budget and participant count beyond earlier notes.

## 2. Outdoor connected station hardware

### Takeaway
Only dated trail-counter prices found (2017, 2021); no product found sold as a weatherproof QR check-in/scan-point station. Counter pricing is roughly USD 4-5.5k per unit plus about USD 35/month data.

### Cited Findings
- TRB 2017 parks deck: Eco-Counter with Pyro-Box about USD 4,000; additional counters about USD 550 each (unclear which vendor) — search summary of [TRB Smith 2017 PDF](https://onlinepubs.trb.org/onlinepubs/Conferences/2017/Parks/Smith.pdf); PDF fetched but unreadable text layer, so unverified
- MORPC Central Ohio Trail WG packet (2021): Urban Post Multi with direction 10 ft USD 5,450 one-time plus automatic data transmission service USD 35/month — search summary of [MORPC packet](https://morpc.org/wordpress/wp-content/uploads/2021/08/08-19-21-COG-Trail-Development-WG-Meeting-Packet.pdf) (not fetched)
- Eco-Counter's current Pyro-Box Evo page lists no price; install about 30 min, batteries up to 2 years (search summary) — [Eco-Counter](https://www.eco-counter.com/produits/pyro-evo-range-en/)
- MORPC 2023 Columbus pilot summary fetched: no prices — [MORPC](https://www.morpc.org/2023/wp-content/uploads/2023/08/Columbus-Eco-Counter-Pilot-Summary-INT-Final-FULL.pdf)
- Outdoor QR reader hardware: EvTrack EVT-QR-Vandal-01 is IP67 vandal-resistant but a gate reader, not a visitor-phone scan point (search summary) — [EvTrack](https://www.evtrack.com/products/qr-code-readers/evt-qr-vandal-01)
- Japanese search 「QRチェックインスタンド 屋外 防水 太陽光」 found no product matching (search result summary).

### Inferences
- A connected, solar, rotating-code station at under about USD 500 hardware would undercut professional counters by roughly 10x; counters demonstrate that USD 35/month data is accepted by public agencies.

### Gaps
- TRAFx, Otto, TrailSense current prices; solar+LTE-M enclosure kit pricing; any weatherproof QR scan-point product: not found.

## 3. Cheating with static QR / GPS spoofing

### Takeaway
GPS spoofing in Pokemon Go is well documented in press and one Aalborg thesis; no peer-reviewed prevalence figure found. Static-QR sharing cases were not found beyond earlier notes.

### Cited Findings
- Aalborg University master's thesis (2017), mixed methods: some Pokemon GO players manipulate phone GPS to remove the location element; opinions on whether this is cheating vary (search summary) — [AAU](https://projekter.aau.dk/playing-pokemon-go-from-the-couch-why-do-people-cheat-in-location-based-games-c6a4afd4.html)
- Fan-site poll suggesting 20-25% of players spoof; poll flagged as unreliable (voters not realising anonymity) — [PokemonGoHub](https://pokemongohub.net/post/news/poll-confirms-20-pokemon-go-players-use-gps-spoofing/)
- Methods reported: software-defined radio (HackRF) spoofing, and phones strapped to drones — [rtl-sdr.com](https://www.rtl-sdr.com/cheating-at-pokemon-go-with-a-hackrf-and-gps-spoofing/), [Aus Review](https://www.theaureview.com/games/gps-spoofing-drones-and-ubers-pokemon-go-fans-are-determined-to-get-out-of-walking/)
- Niantic responded with soft bans; earlier Ingress bans for spoofing (search summary) — [Tom's Guide](https://www.tomsguide.com/us/pokemon-go-gps-spoofing-cheating,news-23022.html) (fetch returned only title; not verified)

### Inferences
- Any GPS-based presence claim is defeatable; physical-token or proximity (BLE/NFC/rotating code) evidence is a stronger differentiator, at higher cost.

### Gaps
- Documented static-QR photo-sharing/attendance fraud cases in major press; peer-reviewed spoofing prevalence.

## 4. SaaS check-in / loyalty pricing pages

### Takeaway
Stamp Me is USD 49-100/month; Planning Center Check-Ins has a free tier (10 daily check-ins); Breeze USD 72/month; Eventbrite takes per-ticket fees. All fetched except Flok and Cvent.

### Cited Findings
- Stamp Me (fetched, undated): Lite USD 49/mo (limited-time), Pro USD 79/mo, Elite USD 100/mo (struck-through 199); also GBP 39/49/129, EUR 29/49/169; 30-day free trial. Methods: merchant console, stamp code, Onestamps (single-use alphanumeric/QR), StampTag and StampPod "tap & go" (NFC likely, page does not say) — [Stamp Me](https://www.stampme.com/pricing)
- Planning Center Check-Ins (fetched): Free tier 10 daily check-ins, USD 0; higher tiers not shown by the fetch (slider); currency code unstated — [Planning Center](https://www.planningcenter.com/pricing)
- Breeze ChMS (fetched): USD 72/month, no setup fee, 30-day trial; bundle USD 119; texts 250 free then USD 10 per 500; check-in listed as a feature — [Breeze](https://www.breezechms.com/pricing)
- Eventbrite (fetched): free events no fee; paid tickets 3.7% + USD 1.79 per ticket service fee plus 2.9% payment processing; Pro email add-on from USD 15/mo; "$" currency unspecified — [Eventbrite](https://www.eventbrite.com/organizer/pricing/)
- Cvent OnArrival: quote only, annual licence + per-registrant (earlier notes).

### Inferences
- Venue-facing benchmark is USD 25-100/month; event check-in is monetised per attendee or ticket, a better analogue for a per-scan model.

### Gaps
- Flok pricing (flok.com/pricing 404); Cvent OnArrival not fetched.

## 5. Sponsored-location and paid check-in pricing

### Takeaway
Niantic's Sponsored Location Program (now Scopely-hosted page) is temporarily suspended, US-only, with no public prices; the only number remains the 2017 CPV under USD 0.50.

### Cited Findings
- Program page (fetched, undated, footer 2012-2026): temporarily suspended, applications closed, US only; up to 30 locations per business, additional ones "incur subscription fees" (no amounts); standard = PokeStop, premium = Gym; visible within about 0.3 mi but only players within 40-50 m count as an engaged visit; aggregate analytics only — [Scopely/Niantic](https://explore.scopely.com/sponsoredlocations)
- 2017 CPV: under USD 0.50 per daily unique visit — [Game Developer](https://gamedeveloper.com/business/-i-pokemon-go-i-dev-says-sponsored-locations-can-earn-it-nearly-0-50-per-visitor)

### Inferences
- The payment unit is a verified visit within 40-50 m; this supports a price anchor of cents per verified visit.

### Gaps
- Foursquare check-in specials economics, Yelp Check-In Offers, Google Maps local offers: not searched (call budget).

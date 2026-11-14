Self-test PASSED: 51/51 cases matched; deliberate faults detected 34/34.

| Case | Row | Deliberate fault | Expected | Observed | Failed checks |
| --- | --- | --- | --- | --- | --- |
| A01-good | A01 | none | passed | passed | - |
| A01-qr | A01 | QR encodes the destination instead of shortUrl | failed | failed | PNG decodes to shortUrl; SVG decodes to shortUrl |
| A02-good | A02 | none | passed | passed | - |
| A02-new-body | A02 | a repeated idempotency key returns a different body (new slug) | failed | failed | concurrent bodies identical; replay after restart; changed body with same key |
| A02-no-conflict | A02 | the same key with another destination is accepted | failed | failed | changed body with same key |
| A03-good | A03 | none | passed | passed | - |
| A03-overwrite | A03 | a forced slug collision overwrites the existing route | failed | failed | forced collision outcome; existing slug unchanged |
| A04-good | A04 | none (browser step blocked until UI names are frozen) | blocked | blocked | - |
| A04-expiry | A04 | a claim proof is accepted after 24 h | failed | failed | claim at 24 h + 1 s |
| A05-good | A05 | none | passed | passed | - |
| A05-two-winners | A05 | two accounts both win one claim proof | failed | failed | exactly one winner; loser gets claim_consumed; loser body has no private field; loser repeat |
| A05-leak | A05 | the losing claim's 409 names the owner | failed | failed | loser body has no private field |
| A06-good | A06 | none | passed | passed | - |
| A06-foreign | A06 | another account's link is returned with 200 | failed | failed | foreign read; foreign edit; foreign delete; Bob's link untouched; Bob's cursor exists |
| A06-guest | A06 | an invalid session cookie on create becomes a guest 201 | failed | failed | revoked session on create; invalid session cookie on create |
| A06-unknown-cookie | A06 | a session cookie the server never issued is ignored, so a garbage cookie on create becomes a guest 201 (a revoked cookie is refused with 401 and cleared) | failed | failed | invalid session cookie on create |
| A07-good | A07 | none | passed | passed | - |
| A07-no-412 | A07 | concurrent PATCH ignores If-Match | failed | failed | one PATCH wins; PATCH without If-Match |
| A07-stale | A07 | one replica keeps serving the old route | failed | failed | edit: no old result after 3 s; edit: every replica converged; disable: no old result after 3 s; disable: every replica converged; delete: no old result after 3 s; delete: every replica converged; block: no old result after 3 s; block: every replica converged |
| A08-good | A08 | none | passed | passed | - |
| A08-expiry | A08 | 302 for 3 s after expiresAt | failed | failed | no 302 after expiry; 410 after expiry |
| A09-good | A09 | none | passed | passed | - |
| A09-location | A09 | an altered Location (query reordered) | failed | failed | accept order and case kept |
| A09-301 | A09 | 301 instead of 302 | failed | failed | accept unchanged; accept order and case kept; accept escapes kept; accept path case kept; accept fragment kept; accept scheme and host lower-cased; accept default port removed; accept IDN to A-label; accept http kept; accept exactly 8,192 bytes; HEAD matches GET; encoded CR LF in the query; query not forwarded |
| A09-no-store | A09 | missing Cache-Control: no-store | failed | failed | no-store unchanged; no-store order and case kept; no-store escapes kept; no-store path case kept; no-store fragment kept; no-store scheme and host lower-cased; no-store default port removed; no-store IDN to A-label; no-store http kept; no-store exactly 8,192 bytes; HEAD matches GET |
| A09-head | A09 | HEAD emits a click event | failed | failed | HEAD has no event header; HEAD emits no event |
| A09-private | A09 | http://127.0.0.1/ accepted as a destination | failed | failed | rejected corpus |
| A09-query | A09 | the short URL's query is forwarded | failed | failed | encoded CR LF in the query; query not forwarded |
| A10-good | A10 | none | passed | passed | - |
| A10-duplicates | A10 | duplicate deliveries are counted twice | failed | failed | recordedAttempts; filteredClicks |
| A10-synthetic | A10 | synthetic GETs are counted in customer totals | failed | failed | recordedAttempts; filteredClicks |
| A14-good | A14 | none | passed | passed | - |
| A14-alg-none | A14 | an alg:none token is accepted on a guarded route | failed | failed | every forged token is 401 |
| A16-good | A16 | none | passed | passed | - |
| A16-report-blocks | A16 | public reports alone block the link | failed | failed | reports alone change nothing; operator lookup |
| A16-non-operator | A16 | a non-operator reaches operator routes | failed | failed | non-operator 404 |
| A17-good | A17 | none | passed | passed | - |
| A17-no-limit | A17 | guest creation is never limited | failed | failed | bounded admission (IPv4); useful 429; IPv6 /64 is one key |
| A17-per-address | A17 | IPv6 addresses in one /64 are separate keys | failed | failed | IPv6 /64 is one key |
| A18-good | A18 | none (placeholder-credential start check not declared by the double) | blocked | blocked | - |
| A18-501 | A18 | the CSV export returns 501 not implemented | failed | failed | no 501 or not implemented |
| A20-good | A20 | none | passed | passed | - |
| A20-bad-signature | A20 | a webhook with a bad signature is accepted | failed | failed | wrong signature; one byte changed after signing |
| A20-duplicate | A20 | a duplicate event ID is stored twice | failed | failed | no second effect |
| A24-good | A24 | none | passed | passed | - |
| A24-early-302 | A24 | 302 sent before the event is published | failed | failed | every 302 event is captured for the right link; 302 only after the publish; bots are present |
| A24-fail-open | A24 | 302 when the publish failed | failed | failed | every 302 event is captured for the right link; 302 only after the publish; bots are present |
| F03-good | F03 | none (consume-side proxy not separate in the double) | blocked | blocked | - |
| F03-fail-open | F03 | 302 without a confirmed event during publisher faults | failed | failed | no 302 without a confirmed event |
| F01-inprocess-stampede | F01 | a per-process route cache hides an unbounded database fallback: once it is cleared while the shared cache is down, every hot redirect makes one database query | failed | failed | refuse: no stampede; stall: no stampede; break: no stampede |
| F06-small-bound-unbounded-queue | F06 | declares a publisher queue bound of 4 and an admission bound of 16 but enforces neither, so every request waits in an unbounded queue and memory grows past the limit | failed | failed | memory bounded |

Self-test PASSED: 4/4 cases matched; deliberate faults detected 3/3.

| Case | Row | Deliberate fault | Expected | Observed | Failed checks |
| --- | --- | --- | --- | --- | --- |
| A06-good | A06 | none | passed | passed | - |
| A06-foreign | A06 | another account's link is returned with 200 | failed | failed | foreign read; foreign edit; foreign delete; Bob's link untouched; Bob's cursor exists |
| A06-guest | A06 | an invalid session cookie on create becomes a guest 201 | failed | failed | revoked session on create; invalid session cookie on create |
| A06-unknown-cookie | A06 | a session cookie the server never issued is ignored, so a garbage cookie on create becomes a guest 201 (a revoked cookie is refused with 401 and cleared) | failed | failed | invalid session cookie on create |

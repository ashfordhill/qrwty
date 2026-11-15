With v1.5's `oracle/src/client/session.ts` (SHA-256 `520b53629995ea57d23fec6c0d7a8a703362c8ab1885f27b0c798aacb9443bab`) in a scratch copy of the v1.6 oracle; everything else is v1.6.

Self-test FAILED: 0/1 cases matched; deliberate faults detected 0/1.

| Case | Row | Deliberate fault | Expected | Observed | Failed checks |
| --- | --- | --- | --- | --- | --- |
| signin-lockout | A14 | the adapter's password is stale, and the issuer answers a refused login with its form again and locks the identifier after 3 refused posts: the oracle must post once, fail the sign-in with the refusal, and never post again | failed | failed (issuer: login posts oracle-alice 11; refused oracle-alice 11; locked oracle-alice; OVER LIMIT; refusal reason missing) | row completed |

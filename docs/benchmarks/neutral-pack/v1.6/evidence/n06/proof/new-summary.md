With v1.6's code: the two new cases, taken from the full self-test (selftest/selftest-summary.md).

| Case | Row | Deliberate fault | Expected | Observed | Failed checks |
| --- | --- | --- | --- | --- | --- |
| signin-lockout | A14 | the adapter's password is stale, and the issuer answers a refused login with its form again and locks the identifier after 3 refused posts: the oracle must post once, fail the sign-in with the refusal, and never post again | failed | failed (issuer: login posts oracle-alice 1; refused oracle-alice 1; locked none) | row completed |
| signin-mapped-identifier | A06 | none for an oracle that signs in with the mapped identifiers: the issuer accepts email addresses only (one shared email-only connection), so the fixed names oracle-alice and oracle-bob are refused | passed | passed (issuer: login posts oracle-bob-822153@selftest.example 1, oracle-alice-822153@selftest.example 2; refused none; locked none) | - |

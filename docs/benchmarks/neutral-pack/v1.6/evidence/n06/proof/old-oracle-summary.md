With v1.5's whole `oracle/src/` and `oracle/adapter.schema.json` in a scratch copy, under v1.6's self-test harness and double. v1.5's schema accepts only the fixed names and one password variable, so the scratch `selftest/run.ts` gives `signin-mapped-identifier` that identity (one changed line: `identity: false` instead of `identity: mapped`); the issuer double still knows only the mapped email addresses.

Self-test FAILED: 0/2 cases matched; deliberate faults detected 0/1.

| Case | Row | Deliberate fault | Expected | Observed | Failed checks |
| --- | --- | --- | --- | --- | --- |
| signin-lockout | A14 | the adapter's password is stale, and the issuer answers a refused login with its form again and locks the identifier after 3 refused posts: the oracle must post once, fail the sign-in with the refusal, and never post again | failed | failed (issuer: login posts oracle-alice 11; refused oracle-alice 11; locked oracle-alice; OVER LIMIT; refusal reason missing) | row completed |
| signin-mapped-identifier | A06 | none for an oracle that signs in with the mapped identifiers: the issuer accepts email addresses only (one shared email-only connection), so the fixed names oracle-alice and oracle-bob are refused | passed | failed (issuer: login posts oracle-bob 11; refused oracle-bob 11; locked oracle-bob; OVER LIMIT) | row completed |

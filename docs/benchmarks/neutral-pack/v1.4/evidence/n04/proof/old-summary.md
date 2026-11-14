With v1.3's `oracle/src/rows/F01.ts` and `oracle/src/rows/F06.ts` in a scratch copy of the v1.4 oracle.

Self-test FAILED: 0/2 cases matched; deliberate faults detected 0/2.

| Case | Row | Deliberate fault | Expected | Observed | Failed checks |
| --- | --- | --- | --- | --- | --- |
| F01-inprocess-stampede | F01 | a per-process route cache hides an unbounded database fallback: once it is cleared while the shared cache is down, every hot redirect makes one database query | failed | passed | - |
| F06-small-bound-unbounded-queue | F06 | declares a publisher queue bound of 4 and an admission bound of 16 but enforces neither, so every request waits in an unbounded queue and memory grows past the limit | failed | passed | - |

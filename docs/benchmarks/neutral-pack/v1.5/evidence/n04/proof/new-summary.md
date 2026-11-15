With v1.4's code: the two new cases as the full self-test reported them.

| Case | Row | Deliberate fault | Expected | Observed | Failed checks |
| --- | --- | --- | --- | --- | --- |
| F01-inprocess-stampede | F01 | a per-process route cache hides an unbounded database fallback: once it is cleared while the shared cache is down, every hot redirect makes one database query | failed | failed | refuse: no stampede; stall: no stampede; break: no stampede |
| F06-small-bound-unbounded-queue | F06 | declares a publisher queue bound of 4 and an admission bound of 16 but enforces neither, so every request waits in an unbounded queue and memory grows past the limit | failed | failed | memory bounded |

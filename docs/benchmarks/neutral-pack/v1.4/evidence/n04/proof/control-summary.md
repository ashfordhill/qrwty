Scratch controls, not pack cases. v1.4's F01 and F06 against the double in `good` mode (declared and enforced bounds; per-process cache refreshed by a database read):

Self-test PASSED: 2/2 cases matched; deliberate faults detected 0/0.

| Case | Row | Deliberate fault | Expected | Observed | Failed checks |
| --- | --- | --- | --- | --- | --- |
| F01-good-control | F01 | none (scratch control, not a pack case) | passed | passed | - |
| F06-good-control | F06 | none (scratch control, not a pack case) | passed | passed | - |

F01 against an adapter whose `faultPoints` omits `clear-route-caches` (case expectation changed to `blocked` in that scratch copy only):

Self-test PASSED: 1/1 cases matched; deliberate faults detected 0/0.

| Case | Row | Deliberate fault | Expected | Observed | Failed checks |
| --- | --- | --- | --- | --- | --- |
| F01-inprocess-stampede | F01 | a per-process route cache hides an unbounded database fallback: once it is cleared while the shared cache is down, every hot redirect makes one database query | blocked | blocked | - |

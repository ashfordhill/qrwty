Run oracle-a-20261115T112010-6ccdcd, arm a, commit 5065dded267e79bd5bf18a6d1b8542094ee59064

Totals: failed 3, blocked 2, passed 2

| ID | Status | Checks (passed/failed/blocked/not run) | Started | Ended | Notes |
| --- | --- | --- | --- | --- | --- |
| A02 | failed | 1/6/0/0 | 2026-11-15T11:20:10.963Z | 2026-11-15T11:21:27.644Z |  |
| A03 | blocked | 0/0/1/0 | 2026-11-15T11:21:27.644Z | 2026-11-15T11:21:27.644Z |  |
| A09 | failed | 0/15/0/0 | 2026-11-15T11:21:27.644Z | 2026-11-15T11:21:27.684Z |  |
| F07 | blocked | 0/0/2/0 | 2026-11-15T11:21:27.684Z | 2026-11-15T11:21:27.684Z | live-arm row: needs replicas in separate containers; composes A02, A05, A07 and A22 |
| R01 | passed | 3/0/0/0 | 2026-11-15T11:21:27.685Z | 2026-11-15T11:23:53.200Z | live-arm row: runs the arm's own production configuration validator and build |
| R02 | passed | 2/0/0/0 | 2026-11-15T11:23:53.201Z | 2026-11-15T11:23:53.201Z | live-arm row: reads the arm's limitation inventory; the behaviour itself is exercised by the A and F rows; that production clients really run against local stor |
| R03 | failed | 41/1/0/0 | 2026-11-15T11:23:53.201Z | 2026-11-15T11:24:36.847Z | live-arm row: needs the arm's production images and lifecycle commands |

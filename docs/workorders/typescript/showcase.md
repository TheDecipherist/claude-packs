# Ten wins in 2.0

Each one was measured on the same Mac before and after, with the same command or the same thing end to end. The 1.9 side is the tree the work started from. Every line points at a row of the report that holds the number and the file it came from.

## 1. A release, from commit to npm

**Before:** about 937 s. The gate ran every test file, and nearly all of the time was the gate. <!-- row: T-d -->
**After:** 29.5 s for a one-hook change, on a local registry. <!-- row: T-d -->
**Factor:** 31.8 times faster, about 32 times. <!-- row: T-d -->

## 2. The gate for a one-hook change

**Before:** 188.3 s, 5 of 87 test files. <!-- row: T-b -->
**After:** 12.9 s, 2 of 372 test files. The picker now follows imports, so a small change reaches only the tests it touches. <!-- row: T-b -->
**Factor:** 14.6 times faster. <!-- row: T-b -->

## 3. What a project waits on hooks, over a real log

**Before:** 1,647.4 s summed over 5,583 events of a real project's log, replayed on the 1.9.0 tree. <!-- row: T-g2, W11.1-4 -->
**After:** 214.6 s with the proxy and the resident runner. <!-- row: T-g2 -->
**Factor:** 7.7 times less waiting. Against the log as it was recorded under load (1,107.4 s) it is 5.2 times. <!-- row: T-g, T-g2 -->

## 4. Stop, at the slow end

**Before:** 6,067 ms at p95 over 124 Stops. <!-- row: T-g3 -->
**After:** 76.9 ms. <!-- row: T-g3 -->
**Factor:** 78.9 times faster. The median went from 279 ms to 54.2 ms, 5.1 times. <!-- row: T-g3 -->

## 5. A Bash call, at the slow end

**Before:** 733 ms at p95 over 2,190 Bash calls. <!-- row: T-g4 -->
**After:** 47.9 ms. <!-- row: T-g4 -->
**Factor:** 15.3 times faster. The median went from 105 ms to 33.9 ms, 3.1 times. <!-- row: T-g4 -->

## 6. Node processes started

**Before:** 21,384 over the same events. <!-- row: W11.1-5 -->
**After:** 5,305, the heartbeat alone. This one is derived, not counted, and the report says so. <!-- row: W11.1-5 -->
**Factor:** 4.0 times fewer. <!-- row: W11.1-5 -->

## 7. CPU spent in hooks

**Before:** 1,737.1 s on the 1.9.0 tree. <!-- row: W11.1-4 -->
**After:** 147.0 s, 61.1 s in the clients and 85.9 s in the daemon. <!-- row: W11.1-4 -->
**Factor:** 11.8 times less. <!-- row: W11.1-4 -->

## 8. An update

**Before:** 4.6 s with the cache warm. <!-- row: T-f -->
**After:** 1.14 s. <!-- row: T-f -->
**Factor:** 4.0 times faster. <!-- row: T-f -->

## 9. The status line

**Before:** 67 ms a render, 3.0 s of CPU a minute. <!-- row: T-i -->
**After:** 26.6 ms a render served live from the daemon, 0.6 s of CPU a minute. <!-- row: T-i -->
**Factor:** 2.5 times faster, 5.0 times less CPU. <!-- row: T-i -->

## 10. Hook waiting across a real project's feature tasks

**Before:** 2,740.8 s over 14,588 events of 38 agents, replayed on the 1.9 tree. <!-- row: W11.1-6 -->
**After:** 528.2 s. <!-- row: W11.1-6 -->
**Factor:** 5.2 times less. <!-- row: W11.1-6 -->

# w10b-soak report: W10b items 1 and 2

Branch `work/2.0.0-ts-w10b-soak`, pushed. Status: DONE_WITH_CONCERNS. The soak ran for its 60 minutes, alone, through the governor at
priority 0.3 (`governed.mjs --for other --want 4`, which runs the command under taskpolicy -b), at **4 clients** (the first run was at 8; it
was restarted at 4 because the machine was overloaded, per the lead). Evidence: `build/evidence/W10b/` in the main checkout
(`samples.jsonl` 120 rows, `summary.md`, `events.log`, `differences.jsonl`, `heap-{15,35,55}.heapsnapshot`, `leaks.txt`, `gate.txt`);
`W10b-run1/` is the first 60-minute run (before the zombie fix), `W10b-stop/` a 10-minute run that proves the clean stop,
`W10b-children/` the diagnostic run that found the zombies.

## 1. The soak (second 60-minute run, `build/evidence/W10b/summary.md`)

| line | measured | meets |
|---|---|---|
| 120 samples | 120 | yes |
| events | 29,779 played (1,420 of them compared) against over 200,000 | NO: under taskpolicy -b and the governor's 4 clients the replay ran 8 events/s, not 56; the rate was not the daemon's limit |
| verdict differences, daemon against the TypeScript runner | 0 differing exit codes of 1,420; 1 text difference | see below |
| heap slope, last segment (daemon from minute 30, 51 samples over 25 min, forced GC) | 0.01 MB per 10 min | yes (line 1) |
| old daemon gone after the kit update | 16 s (first run 22 s) | yes (idle window 15 min) |
| file descriptors | 2 workers: 125 to 127 in two different daemons, the one after kill -9 126; 8 workers: 138 to 142 in all three | yes, back to the start at the same worker count (the summary table's "127 against 136" compared 2 workers with 6) |
| child processes of the daemon (not the sampler, not git looks) | 0 or 1 at every 5-minute mark, max 1 | yes (first run: 54 by minute 60, see 2) |
| workers after one was ended (through the inspector) | 8 against 8 before | yes |
| sampler Go heap (memstats) | 0.7 to 3.5 MB; sampler RSS 10 to 15 MB; killed at minute 50, a new one followed | yes |
| daemon RSS at the end | 227 MB with 8 workers after 29,000 events | NO against the lead's 150 MB at 8; 85 to 100 MB at 2 workers (line 100): met |
| left behind after `daemon stop` | the 60-minute run's daemon did not stop and was killed (see 3); in the 10-minute run: nothing | see 3 |

The one text difference: the daemon cut stage-guard at its time limit (a planted `git add -A` under load) and git-guard refused the same
command with the same law, exit 2 in both; the TypeScript runner's text names stage-guard. The first 60-minute run had 23 differences, all
from (a) the daemon's `not judged by X (over time)` message inside a JSON answer (13) and (b) the governor's routing hook printing the
load figures of that moment (10); the compare now removes both before comparing (`scripts/soak-client.mts`, `verdictOf`).

## 2. Leaks found and fixed

- **Zombie children of the daemon, 54 an hour** (first run, `W10b-run1/samples.jsonl`; `W10b-children/` shows them `<defunct>`, parent the
  daemon). Cause: git-guard's detached refresh (`lib/stop-look.mts`) was started by `startGroup` from a worker thread; when the pool
  recycles the worker and ends its groups, no thread is left to collect the child's exit. Fix: `startOrphan` in `lib/child-group.mts`
  starts it through `sh -c '"$0" "$@" &'`, so its parent is init; the group is still registered with the pool and ended with it. Test
  `test/unit/hooks-lib/child-group-orphan.test.mts`: a worker is ended while its child lives; `startGroup` leaves a zombie (the planted
  leak), `startOrphan` none and the group can still be killed. Second run: no zombies.
- **Daemon stop stalled for over 10 s** in every run that took heap snapshots and ended a worker. Cause: the probe's own inspector session
  (NodeWorker.enable) stayed attached; with it closed first the daemon stopped in 5 s of the soak's end and left nothing
  (`W10b-stop/events.log`). A probe artifact, not a daemon fault; `soak.mts` now closes the session before it stops. The 60-minute
  evidence still shows the stalled stop, so that run's "left behind" line is the probe's.

## 3. Leak checks, planted (`test/integration/soak-leaks.test.mts`, `build/evidence/W10b/leaks.txt`)

The daemon runs in the test process from a copy of the hooks folder with one line of leak in `serveEvent`; 20 then 300 more events,
forced collection, `/dev/fd`, timers after the stop, files after the stop. Clean: heap +0.0 MB, descriptors +0, timers left 0, files left 0.
Planted array (64 KB an event): heap +13.9 MB, red on its line only. Unclosed file: descriptors +300, red on its line only. Interval left
running: timers left 1, red on its line only. Lines: 5 MB, 3 descriptors, 0 timers, 0 files.

## 4. Heap snapshots

`summary.md` lists the top 10 growing constructors, minute 15 to 55 (different daemons: the update and the kill -9 are between) and 35
to 55 (the same daemon). Both are code and strings in the low hundreds of KB and counts, the V8 flags' lazily compiled code, nothing that
grows with events (the forced heap is 6.7 MB at minute 15 and 55).

## 5. Files and gates

Changed this turn: `packs/base/hooks/lib/child-group.mts`, `packs/base/hooks/lib/stop-look.mts` (+ manifest and noop pin: exactly those
two files), `scripts/soak*.mts`, `scripts/replay-lib.mts`, `proxy/sample_memstats.go`, the tests above. `npm run check` 0; `counts --check`
0; the gate (`npm run test:changed`, `build/w10b-soak-gate.txt`) had one red, the emitted files not built, fixed by `npm run build`, then
repo-lint 27/27 and noop+counts 14/14 green; git-guard selftest OK; Go test for the memstats line red then green.

## 6. Decisions and open

- Compared 1 event in 20 plus planted refusals, not all of them. The heap slope is on the last daemon segment after 5 minutes.
- Open: events 29,779 against 200,000 (the rate under taskpolicy -b); the RSS line of 150 MB at 8 workers (227 MB here, 8 workers busy);
  the 60-minute run was not repeated with the probe closed before the stop (the 10-minute run shows the clean stop).
- No daemon, sampler, client or scratch process is left (`ps` checked).

# pool: the daemon's pool at 2, grown to 8 (W8 item 2 as changed 2026-11-12)

## What was made
- `resident/pool.mts`: `PoolOptions.now` (the idle clock, default `Date.now`) and `growEveryMs` (default 500 ms); `Pool.reap()` (the timer's own sweep, callable under a planted clock).
- `resident.mts` / `resident/options.mts`: `--pool` is now the most workers (default 8, was min(16, cores)); new `--warm` (default 2, never past `--pool`), carried by a re-exec; pool idle time 2 minutes (was 10); recycle after 500 events unchanged. The log line says `N workers (at most M)`.
- Selftests that need a fixed pool pass `--warm` with `--pool`; `resident-load` and `resident-sampler` do too.
- `live-event-speed.test.mts`: POOL 8, 128 rounds (1,024 events), idle bound 100 MB, grown bound 250 MB (see below).

## Tests (red then green)
Red output: `build/evidence/pool/red.txt`; green: `build/evidence/pool/green.txt` (36 pass).
- resident-parts: pool starts 2, grows to 8 under concurrent events and never past, fell back to 2 after a planted 2-minute idle (not at 119 s). Red: grew short of 8 / no `reap`.
- wire-owner: defaults warm 2, pool 8, idle 120000 ms; `--warm` kept by re-exec; start never past the most. Red: undefined fields.

## Numbers (`build/evidence/pool/live.txt`, test/integration/live-event-speed.test.mts, scratch install, 300 files, 25 MB transcript)
- Bash p50 6 ms (p95 19), Write p50 40 ms (p95 60): under 20 and 110. Met.
- Idle at 2 warm: 95 to 97 MB by ps (83 MB by the daemon's own count), under 100. Met (narrowly).
- After 1,024 events with the pool grown to 8 (status: workers 8): 226 MB by ps, 175 MB by the daemon's count. The 150 MB line is NOT met. The same run with the pool held at 2: 128 MB by ps. So each grown worker holds about 15 MB; the floor with 8 is about 226 MB on this fixture until a worker gets lighter (rss work). The test bound is therefore 250 MB, an honest hold, not the order's 150.

## For the lead: d-31's numbers
Pool 2 warm / 8 max / 2 idle minutes / 500 events; idle 97 MB; 8 workers after 1,024 events 226 MB (ps); Bash 6 ms, Write 40 ms p50. The 150 MB line needs about 75 MB less across 6 grown workers (12 MB each) or a lower max.

## Files
packs/base/hooks/resident.mts, resident/{pool,options,selftest-events,selftest-rig,selftest-status}.mts, test/hooks/base/resident-parts.test.mts, test/unit/lib/wire-owner.test.mts, test/integration/{live-event-speed,resident-load,resident-sampler}.test.mts, packs/manifest-2.0.0.json and test/fixtures/noop/pinned-manifest.json (regenerated: the changed resident files).

## Open
- 150 MB with the pool at 8 (above). Growth is one worker per 500 ms under queueing, so 8 is reached only under sustained load.
- No refusals met.

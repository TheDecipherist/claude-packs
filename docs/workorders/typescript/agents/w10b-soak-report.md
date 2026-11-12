# w10b-soak report: W10b items 1 and 2, built; the 60-minute soak not run

Branch `work/2.0.0-ts-w10b-soak`. Status: NEEDS_CONTEXT. The coordinator stopped the soak (W8.8's load governor comes first); the lead
resumes this agent after it is installed, to run the soak at 4 clients under `taskpolicy -b`, alone. Per the earlier message the soak is
to be restarted at 4 clients because the machine was overloaded (load 15 at the start); the 8 clients of the order were only used in a
4-minute smoke run.

## 1. What is built

- `scripts/soak.mts` (driver), `soak-client.mts` (one client), `soak-probe.mts` (one sample row), `soak-inspect.mts` (V8 inspector
  reach: forced-GC heap, heap snapshots, one worker ended, constructor diff), `soak-actions.mts` (update, kill -9, stop, left-behind),
  `soak-summary.mts` (verdict table). Run: `node scripts/soak.mts --minutes 60 --clients 4 --rate 56` (the full-order values are
  `--clients 8`); evidence goes to `build/evidence/W10b/`. The scratch is `build/w10b-scratch` (init of the bandwarp pack set,
  a repo with a bare remote), never another project.
- `scripts/replay-lib.mts`: the scratch builder, payloads and settings command that `replay-play.mts` carried, taken out so the soak
  and the replay share them (replay-play now imports them; it ran again and printed its tables).
- `proxy/sample_memstats.go` (+ a no-op for other systems): SIGUSR1 makes the sampler print `memstats heapAlloc= heapSys= goroutines=`
  to stderr, which the daemon copies into its log; the soak reads the sampler's Go heap from there. Go test
  `TestMemstatsAnswersSIGUSR1`: red without the handler (`build/evidence/W10b/go-memstats-red.txt`), green under `-race`
  (`go-memstats-green.txt`).
- `test/unit/lib/soak-summary.test.mts`: the leak verdicts planted (a heap growing 0.5 MB a minute is red on the slope line, a flat one
  green; a left-behind file is red). The daemon-level leak plants (an unclosed file, an interval left running, in a copy of the
  daemon's hooks folder) and their short integration tests are NOT written yet.

## 2. Measured so far (a 4-minute smoke run, 8 clients, 24 events/s, a sample every 10 s; `build/evidence/W10b-smoke/`)

- 46 samples written, the lifecycle steps all ran: update at 1/3 (new lock, old daemon gone in 1 s), kill -9 (gone in 1 s; fds 155
  against 154 at the start), one worker ended through the inspector (workers back to 16), sampler killed. Heap after a forced
  collection was 7.3 MB flat. Sampler Go heap read: 0.7 to 2.4 MB. 5,284 events, 268 compared with the TypeScript runner, 0 differences
  (76 refusals seen, from planted `git add -A`).
- Daemon RSS was 218 MB at the start and 235 to 315 MB at the end of 4 minutes under 8 clients on a loaded machine: over 250 MB
  there. Not a verdict (4 minutes, load 15), but the d-31 line may be missed; the full run decides.
- Finding: after the smoke run `daemon stop` printed "pid did not stop" for a daemon with 3 node processes left (git-guard
  `--refresh-stop` children and the daemon), which I killed by hand; not diagnosed.
- The child-process count after kill -9 was 3 against 1 at the start (verdict line says within 2): the detached git-guard refresh
  children come and go, so that line needs a settle time or a count of the daemon's own children.

## 3. Decisions (unattended, recommended choices)

- Verdict comparison is 1 in 20 events plus a planted refusing event every fifth comparison, not all 200,000 (a TypeScript runner per
  event would cost more than the soak). A daemon answer that only says `not judged by X (over time)` on stdout is counted apart, the
  exit code and refusal text still compared.
- Heap slope is taken on the last daemon segment after 5 minutes of warm-up: the update (minute 20) and kill (minute 30) mean no
  one daemon lives the last 40 minutes. Heap snapshots at 15, 35 and 55; the 15 to 55 diff spans different daemons, 35 to 55 is the same one.
- A kit update that leaves the lock's hash unchanged gets a field added to the lock so a new daemon is named; the run says so.

## 4. Open

The 60-minute run and its 120 samples; the daemon-level leak plants and tests; items 3 and 4 are not mine. Processes: `ps` shows none
of the soak left (daemon, sampler, clients, scratch children all ended).

## 5. Files

`scripts/soak*.mts`, `scripts/replay-lib.mts`, `docs/workorders/typescript/probes/replay-play.mts`, `proxy/sample.go`,
`proxy/sample_memstats.go`, `proxy/sample_nomemstats.go`, `proxy/sample_test.go`, `test/unit/lib/soak-summary.test.mts`, `build.md`.

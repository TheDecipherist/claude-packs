# kwb205 report: a hook past its deadline takes its children with it (KWB-205)

## Made
- `packs/base/hooks/lib/child-group.mts`: `startGroup` (spawns detached, so the child leads its own process group, and tells a listener its pid),
  `killGroup(pid)` (`process.kill(-pid, 'SIGKILL')`), `killGroups()`, `watchGroups`.
- Daemon: the worker reports each group (`group` message in `resident/messages.mts`, `worker.mts`); the pool keeps them per worker slot and kills them
  when the worker is dropped, exits (and is replaced) or the pool closes. New `Pool.abandon(jobs)` kills the groups of the jobs running on a worker.
  `resident/event.mts` `judgeAll` abandons every judge still running when the event is answered (deadline, or the grace after a refusal). The hook then
  ends by itself and its late line is logged as before.
- TypeScript runner `run-hooks.mts`: `killGroups()` after each hook. Selftest rig `lib/selftest.mts` `runHook`: the hook run is detached and its group
  killed afterwards, so a spinner a hook leaves is gone.
- `packs/base/pack.json` tests rows; `packs/manifest-2.0.0.json` (`node scripts/counts.mts`) and `test/fixtures/noop/pinned-manifest.json`
  (`node scripts/noop-pin.mts`) regenerated. The pin had 99 differences, most from earlier branches' hooks, not from this change.

## Plants (test/hooks/base/hook-children.test.mts; each teardown kills its spinner with `pkill -f <tag>` and asserts 0 left)
1. Pool: a planted hook starts `sh -c 'while :; do :; done'` through `startGroup`; `abandon` leaves 0 processes alive.
   Red: `build/evidence/kwb205/red-1.txt` (before the lib existed) and `red-2-kills-removed.txt` (kills removed from the pool: 2 failed). Green: 3 of 3.
2. Closing the pool takes the child with it (same red as 1).
3. Rig: a hook file leaves an unref'd spinner and exits; `runHook` leaves 0. Red: `red-3-rig.txt` (kill disabled, 1 failed).

## Numbers and gates
- `npm run check`: exit 0. `node scripts/counts.mts --check`: green after `node scripts/counts.mts`.
- `npm run test:changed -- --base origin/work/2.0.0-typescript` (`build/kwb205-gate.txt`): 660 of 664. The 4 reds: the noop pin (3 tests; fixed by
  `noop-pin`, rerun 5 of 5) and git-guard's selftest "kept Stop look ... within about a second of GitHub" (a timing case, 98 s under load; rerun of
  test/hooks/base/git-guard.test.mts 15 of 15 green).
- Existing tests that plant a spinner: `grep -rn 'while :' test packs` found none (resident-sampling uses fake process rows; the `setInterval` sleepers
  in daemon-cli and statusline-daemon tests are already stopped in their teardown).

## Open
- [gap] Hook code that spawns children without `startGroup` (git-run's `spawnSync`, run-claudes, run-remotes, about 59 sites) is not covered; they are short or carry their own timeout.
- [gap] The TypeScript runner has no deadline of its own (the proxy client answers at the deadline), so it kills a hook's groups only when the hook ends.
- [gap] A group started in the instant of the deadline can be reported to the main thread after `abandon` (the tests nap 100 ms); it is then killed at the worker's drop or close.
- No wrong refusal met.

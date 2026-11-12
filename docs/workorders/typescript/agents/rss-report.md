# rss report: the daemon's memory budget (KWB-201's open part)

Branch `work/2.0.0-ts-rss` (worktree `.claude/worktrees/rss`), pushed. Status: DONE_WITH_CONCERNS. W8's "under 250 MB with 16 workers after
1,000 events" is **not reached**. The daemon went from 731 MB to 320 MB on the scratch copy of the kit's install, and from 993 MB to 326 MB
in the test rig. The floor and what holds it are in section 3.

## 1. How it was measured

- Scratch: `build/rss-scratch/kit` is a `git clone` of this worktree with its install updated from this worktree's packs
  (`bin/claude-packs.mjs update`, emitted `.mjs`). It runs in its own cache folder with the host's proxy binary, and has a 25 MB transcript
  whose prompt is its first line, the shape of an unattended run. The kit's repo is 760 sources and 581,626 duplicate windows.
- Events: 1,000 live-like events through the picker (`sh .claude/hooks/bin/hook-proxy 60`, stdin JSON, `CLAUDE_PROJECT_DIR`), 16 at once.
  The mix in 16: Read 3, Pre Bash 4, Post Bash 2, Pre Write 2, Post Write 1 (the file really written), Pre Edit 2, Post Edit 1, Stop 1.
  The daemon's RSS comes from `ps` every 48 events and 2 s after the last one.
- Per worker: the scratch's `resident.mjs` points at a wrapper (`build/rss-probe/worker-wrap.mjs`). Each worker writes its V8 heap, its
  external memory and the hooks it ran to a file every second. The main thread's heap comes from the daemon's pid file, and `vmmap -summary`
  and `heap` were run on the live daemon.
- Probes and their scripts: `build/evidence/rss/probe/` (`setup.sh`, `refresh.sh`, `measure.sh <label>`, `live.mts`, `per-hook.mts`,
  `iso.mts`, `main-index.mts`). Each run's output is in `build/evidence/rss/<label>.{out,csv,workers,hooks,vmmap}`.

## 2. Numbers (scratch kit, 1,000 events, 16 at once; `bash build/rss-probe/measure.sh <label>`)

| state | RSS after (peak) | workers | wall p50 | evidence |
|---|---|---|---|---|
| trunk code | 731 MB (806) | grew to 20 | 377 ms | base-1.* |
| trunk code, Stop events replaced by Read | 461 MB (541) | 17 | 463 ms | nostop.* |
| + size-over-speed V8 flags | 609 MB (631) | 22 | 93 ms | v8flags.csv |
| + the turn read by bytes | 375 MB (394) | 20 | 100 ms | turn-flags.* |
| + the pool held at 16 | 362 MB (365) | 16 | 85 ms | max16.* |
| + duplicate windows in typed arrays (**shipped**) | **320 MB** (320) | 16 | 83 ms | dupcompact.* |
| tried: a hook on at most 4 workers, 2 s spread wait | 360 MB (no gain) | 16 | 83 ms | spread4-wait2000.* |
| tried: a hook on at most 2 workers | 326 MB (no gain) | 16 | 83 ms | spread2.* |
| tried: no worker recycling | 333 MB (no gain) | 16 | 84 ms | norecycle.* |

The test rig (`test/integration/live-event-speed.test.mts`: js-ts fixture, 300 sources, 25 MB transcript, 1,024 events 16 at once,
Bash, Write and every 8th a Stop) gave 993 MB on the trunk code (red, `build/evidence/rss/live-rss-red.txt`) and 326 MB on this branch
(green, `build/evidence/rss/live-rss-green.txt`). The live speed case in the same run: Bash p50 2 ms, Write p50 13 ms (bounds 20 and 110).

## 3. What held the memory, and what holds it now

- **Stop: 270 MB.** making-check and making-check-count each read the whole turn with `lastTurn`. That is 25 MB of an unattended run's
  transcript decoded to one string, split and parsed (213 MB of RSS per worker in `per-hook.out`), and a large free block stayed resident
  in malloc (`MALLOC_LARGE (empty)` 140 MB in `vmmap-base.txt`).
- **The main thread's duplicate index: 55 MB of heap.** It was a `Map` of 568K hashes to windows, and half the keys and values were
  boxed numbers over 2^31.
- **Isolates.** 16 idle workers that load nothing hold 115 MB (`empty-hold`: V8 76, malloc 23, page tables 11.5). Each worker that has
  run hooks holds about 8 to 10 MB of V8 heap. Any one hook brings in most of `hooks/lib` with it: with the flags, 16 workers × 0 hooks
  is 139 MB, × 1 hook 178, × 3 194, × 6 202, × all 23 hooks 264 to 277 (`iso-flags.txt`). Holding a worker to fewer hooks saves little
  once it holds one.
- **Now (320 MB, `dupcompact.vmmap`):** footprint 295 MB = V8 regions 166 + malloc small 73 (48 MB live per `heap`, about 1,060 module
  wraps in 17 isolates) + malloc large 18 + page tables 28. The main thread's heap is 39 MB (the indexes about 28, with about 8 MB of
  typed arrays outside it). The 16 workers' heaps are about 150 MB together.
- **The floor:** 16 node isolates that have loaded `hooks/lib` hold about 200 MB on their own (`iso`, 6 hooks each, the flags on).
  The main thread with the kit's two indexes holds about 67 MB (`main-index.mts` with the flags). That is about 270 MB before any
  event's garbage, so 250 MB with 16 live workers is not reachable by tuning. It needs one of: fewer than 16 live workers (the order's
  number), a smaller `hooks/lib` graph per worker (most hooks import most of the lib), or the duplicate and repetition indexes
  out of the process.

## 4. What changed (each seen red first)

1. **The turn is read back to its prompt by bytes** (`packs/base/hooks/lib/lines-back.mts` new: `eachLineBack`; `turn.mts` `turnEntries`).
   Only the lines a turn is made of become strings: an assistant entry, or a result with `"is_error":true`. Inside a JSON string every quote
   is escaped, so neither `"assistant"` nor `"is_error":true` can match text inside a string. `last-prompt.mts` now walks with the same
   `eachLineBack` (its old loop was taken out first; template-law refused the second copy, rightly), and `promptOfBytes` moved to `prompt-of.mts`.
   - Test: `test/unit/hooks-lib/turn.test.mts`, "a 30 MB turn of tool results is read without decoding them". Red: 52,774,139 bytes
     decoded (`build/evidence/rss/turn-red.txt`). Green: under 1 MB, 149 calls found, and the refused call left out
     (`turn-green.txt`, 13 of 13 with last-prompt and making-check-turn). Also a new case: a prompt on the last line gives an empty
     turn, and a file with no prompt is all one turn.
2. **Duplicate windows in typed arrays** (`packs/base/hooks/resident/dup-windows.mts`). Windows are bucketed by hash into `keys`
   (Uint32Array), `wins` (Float64Array) and `starts`, filled by a count pass and a fill pass, so each bucket keeps file and token order and
   the first COMMON + 1 windows are the same ones as before. A changed file is marked dead in the arrays and its windows go to a small side
   map. The arrays are built again when the side map or the dead files pass an eighth of them.
   - Test: `test/unit/hooks-lib/index-cost.test.mts`, "the duplicate index costs the main thread under 40 bytes a window" (heap plus
     array buffers, after gc). Red: 75 bytes a window over 453,000 (`dup-windows-red.txt`). Green: under 40 (`dup-windows-green.txt`).
     The existing "asks by window hash" case gained a file changed back, found again through the side map. On the kit: heap +55 MB
     to +12 MB (plus 8 MB of typed arrays).
3. **Size-over-speed V8 flags** (`resident.mts` `SMALL_V8`: `--optimize-for-size --no-turbofan --no-maglev --no-sparkplug`). The daemon
   sets them with `v8.setFlagsFromString` before its pool starts, so every worker isolate gets them. At run time `--lite-mode` and
   `--jitless` do nothing, and these four do (`iso-flags.txt`). Scratch: 731 to 609 MB. Cost: the main thread builds the kit's duplicate
   index in 1.1 to 1.8 s instead of 0.25 s, once per daemon, on the first Pre Write. Hooks measured no slower: Bash p50 2 ms, Write p50 13 ms.
4. **The pool is held at its size** (`resident.mts`: `max: o.pool`, was `Math.max(32, o.pool)`). A 16-wide burst grew it to 20 to 22
   workers at about 10 MB each, and the growth was kept for the 10-minute idle time. Scratch: 375 to 362 MB.
5. **The test that holds it**: `test/integration/live-event-speed.test.mts`. The RSS case now also drives Stop events (every 8th), and
   its bound went from 650 to 380 MB. Red on the trunk's code: 993 MB (`live-rss-red.txt`, run with the five daemon files of
   `origin/work/2.0.0-typescript` put back, a WIP commit `e68219b` and its undo `91188d0`). Green: 326 MB. The warm pool's bound of
   250 MB is kept (177 MB measured).

## 5. Choices made (nobody to ask)

- 16 workers stay warm, with no growth past 16. Rejected: warm 4 or 8 growing to 16. The order measures with 16 alive, so it gives the
  same number after a burst and only lowers the idle figure.
- The four flags, with `--no-sparkplug` kept as measured. Keeping Sparkplug costs about 4 MB over 16 workers (268 vs 264) and builds
  the index in 1.25 s instead of 1.8 s. That is a cheap change if the first Write's wait matters more.
- Affinity (SPREAD 2 or 4 with a long spread wait) was measured and not kept: no gain, and a risk to latency. `SPREAD_WAIT_MS` is back at 50.
- The manifest `packs/manifest-2.0.0.json` was regenerated by `node scripts/counts.mts`. It lists `lines-back.mjs`, and many hooks lib
  hashes changed in this build, files I did not touch among them. Several agents change it, so the lead should regenerate it after the merges.

## 6. Refusals

Marked right: e970e78e, 8b3efe09, 3420a035, 7ff1e9b0 (code-shape, long probe lines), 8ad5ad02 (no-find), 3452b8b4 (template-law, the
walker written before the old copy was taken out), 40f7d1fe (git-guard, stash over uncommitted work). Marked **wrong: ffde4621
(template-law)**. A `cp` inside `build/rss-scratch`, a git-ignored scratch clone of the repo kept for measuring, was refused as a copy of
`packs/base/hooks/resident/worker.mts`. template-law counts the files of an ignored folder as the repo's code. Proposed: the repetition
index skips git-ignored paths, or at least the layout's build folders. I did not fix it, because it is outside this brief.
git-guard also refused a `git checkout` restoring files I had just planted for the red run. It was right by its law, and I made a WIP
commit and an undo commit.

## 7. Files

- New: `packs/base/hooks/lib/lines-back.mts`.
- Changed: `packs/base/hooks/lib/turn.mts`, `last-prompt.mts`, `prompt-of.mts`, `packs/base/hooks/resident.mts`, `resident/dup-windows.mts`,
  `test/unit/hooks-lib/turn.test.mts`, `test/unit/hooks-lib/index-cost.test.mts`, `test/integration/live-event-speed.test.mts`,
  `packs/manifest-2.0.0.json`, `build.md` (making line), `docs/workorders/typescript/agents/rss.json`, this report.
- No type in `types.d.mts` was needed.

## 8. Gate

- `npm run check`: exit 0. `node scripts/counts.mts --check`: exit 0 after `node scripts/counts.mts`.
- `npm run test:changed -- --base origin/work/2.0.0-typescript`, on the committed work (`build/rss-gate.txt`): 35 of 350 files chose
  197 tests, 194 passed and 3 failed. All 3 are in `test/integration/noop.test.mts` (stellix, sub37, full-stack update): the pin
  `test/fixtures/noop/pinned-manifest.json` did not match the installed files. Six of the files are this branch's (`lines-back.mjs` new;
  `last-prompt`, `prompt-of`, `turn`, `resident`, `resident/dup-windows` changed). The other 32 were already stale on the trunk: for
  example, the trunk's emitted `lib/files.mjs` hashes e6682597…, the same as the kit's own install, while the pin says 00288b6e…
  (`build/evidence/rss/noop-pin-check.txt` lists all of them). I read the list and pinned it with `node scripts/noop-pin.mts`.
  The rerun of `noop.test.mts` passed 5 of 5 (`build/evidence/rss/noop-green.txt`). Only the failed file was run again.

## 9. Open

- [gap] 250 MB with 16 live workers (section 3). The next measures to take: a smaller `hooks/lib` import graph per hook, and the
  indexes out of the daemon's heap.
- [gap] template-law reads files under a git-ignored build folder as the repo's code (refusal ffde4621, section 6).
- [deferred] (rss, unattended: the lead merges several branches that touch them) `packs/manifest-2.0.0.json` and the noop pin are
  regenerated here, so expect conflicts. After the merges, regenerate both (`node scripts/counts.mts`, `node scripts/noop-pin.mts`).
- [deferred] (rss: measured, not taken) keep Sparkplug (drop `--no-sparkplug`). The first Write's index build would take 1.25 s instead
  of 1.8 s, for about 4 MB over 16 workers.

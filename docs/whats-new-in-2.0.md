# What's new in 2.0

2.0 is the same kit with a different engine. The code is strict TypeScript, and a project's hooks no longer start a new Node process for every call. One resident runner per project answers every hook event, behind a small Go client, so a Bash call that used to wait on seven Node processes now makes one quick call. Releasing the kit is one command. Most of what you wait on got faster. A few things got slower, and they are listed further down with their numbers.

Every number below was measured on one Mac, before and after, with the same command or the same thing end to end. The 1.9 side is the tree the work started from (1.9.0 never went to npm, so it is a copy of that commit). Each line carries a hidden pointer to the row of `docs/workorders/typescript/report.md` that holds the number and the file it came from.

## What changed for a project

**Hooks wait much less.** Over a replay of 5,583 events from a real project's log, the summed wait for hooks fell from 1,647.4 s on the 1.9.0 tree to 214.6 s. <!-- row: T-g2, W11.1-4 -->

**The slow end moved most.** Stop at p95 went from 6,067 ms to 76.9 ms. A Bash call at p95 went from 733 ms to 47.9 ms. <!-- row: T-g3, T-g4 -->

**Far fewer processes.** Node processes started over the same events: 21,384 before, 5,305 now. That second number is derived from the heartbeat, not counted, and the report says how. Hook CPU fell from 1,737.1 s to 147.0 s. <!-- row: W11.1-4, W11.1-5 -->

**Hooks run side by side.** The hooks of one event run in a pool that starts with 2 warm workers and grows on demand to 8. <!-- row: W11.1-9 -->

**A live status line.** The runner serves it, and it ticks every second. A render took 67 ms before and takes 26.6 ms now. CPU for the status line went from 3.0 s a minute to 0.6 s. <!-- row: T-i -->

**A Go sampler.** It reads CPU, memory and stray processes per session and agent, and a watchdog flags a process spinning with no parent. It costs about one millisecond of CPU per snapshot. There is no wider number on it here, so none is claimed.

**TypeScript for the kit, and for JavaScript projects.** The kit's own code is strict TypeScript with the language server shipped as a plugin, so Claude can jump to a definition and list callers. Type errors on the converted files went from 3,742 to 0. `init` gives a JavaScript project TypeScript, a strict `tsconfig.json` and the language server, and refuses a new `.js` file. <!-- row: W2-1 -->

**Packs from one template.** Every pack is built from one template and checked against it. The README's tables, the site's counts and the performance graph are generated from the packs and the measurements, so they cannot drift. The eight configuration files of 919 lines became one shared file of 40 lines plus eight deltas of 142 lines in all. <!-- row: W7-1 -->

**A load governor.** `claude-packs load ask` says how much of the machine a job may use right now. Tests, builds and fuzzers wait for their share, and the last 20 % of the cores is never handed out. In a replay of the heaviest wave of this work, the highest load was 11.95 against a ceiling of 13. <!-- row: W8.8-2 -->

## What changed for working on the kit

**The release is one command.** `npm run release major` gates, bumps, lands, publishes, tags and writes the GitHub release. On a local registry a one-hook release took 29.5 s from commit to npm. It took about 937 s before. <!-- row: T-d -->

**A change reaches only its tests.** The gate for a one-hook change went from 188.3 s to 12.9 s. <!-- row: T-b -->

**Smaller things.** An update with a warm cache went from 4.6 s to 1.14 s. A warm init plus doctor went from 9.1 s to 1.95 s. <!-- row: T-f, T-e2 -->

## What did not get better

Each of these is a measured miss, kept as it was and not tuned at the end. Further tuning is for 2.0.1.

- The gate for a change to a core lib went from 19.0 s to 59.6 s, 3.1 times slower. The picker now finds 13 test files that reach the lib where the old one found 2. <!-- row: M-1 -->
- A cold init plus doctor went from 34.0 s to 39.7 s, and `doctor --fresh` from 29.8 s to 38.5 s. There are more hooks and more selftests to run. <!-- row: M-2 -->
- The TypeScript runner alone, for one Bash event, went from 90 ms to 123 ms. With the Go client it is 38 ms. <!-- row: M-3 -->
- The prompt event went from 47 ms to 77 ms. One hook, `reuse-hint`, spends 46 ms of it. Against the 1.9.0 tree on the same replay, which took 128 ms, it is faster. <!-- row: M-4 -->
- A live Bash call measured wall to wall is 28.9 ms against a goal of 20 ms. The daemon's own line reads 7 ms, and 9 ms of the wall number is the cost of starting any shell. <!-- row: M-5 -->
- The live status line render is 26.6 ms against a goal of 15 ms. <!-- row: M-6 -->
- The daemon's memory after 1,000 events with 8 workers is 180 MB by `ps` against a goal of 150 MB. It reads 139 MB by the daemon's own count, 89 MB when idle. A long soak at load 15 read 226.9 MB. <!-- row: M-7 -->
- The package grew from 0.84 MB to 6.95 MB packed, because it now ships the four Go binaries, 14.8 MB of the 17.2 MB unpacked. <!-- row: M-8 -->
- The TypeScript runner alone is no faster than 1.9 on a scripted feature task: 2,587 ms against 2,662 ms. The gain on that task comes from the proxy. <!-- row: M-9 -->
- The 60-minute soak played 29,779 events, short of the 200,000 aimed for, because the machine's load rule kept it on the slow cores. <!-- row: M-10 -->
- On the five-task test below, one task did not match the original. <!-- row: M-11 -->
- The whole test suite takes longer than before: 753 s for 637 tests, now a median of 982 s for 1,326. The goal of 180 s is not met. <!-- row: M-12 -->

## The same work, handed to the new kit

Five real tasks that agents did on 1.9 were handed, word for word, to an agent on the 2.0 kit. Four of the five lost no gate. Over the five, turns went from 987 to 877, and hook waiting from 98 s to 17 s. Cached reads nearly doubled, 121,193,982 to 233,726,278. <!-- row: W11.0-2 -->

The fifth, a UI look task, passed 2 of 5 gates against the original's 5 of 5, in every run. The original pooled the four sides of a card and held one row out. The new runs kept the stricter per-side measure and left the dark themes' depth rows red. No hook caused it, and it needs a decision about the measure. <!-- row: W11.0-4, M-11 -->

One run per task is a sample, not a proof. <!-- row: W11.0-7 -->

## Moving to 2.0

Run `npx --no-install @thedecipherist/claude-packs update` in each project, then `doctor --strict`. The update rebuilds only the kit's own entries in `settings.json`, folds older per-hook entries into one per event and leaves a project's own hooks alone. The Go binary for the machine is copied once into your cache, shared by every project. A machine with no binary for its system uses the TypeScript runner through the same `sh` picker.

## What is not proved

Windows natively (the kit runs there only through WSL), the proxy under WSL, on a shared Linux box and on a macOS older than Go's minimum, Node 22.0 to 22.17, and npm's one-time-password prompt. Language servers other than TypeScript's are not done either. <!-- row: N-2 -->

---
name: load
description: Use when about to start a test run, a build, a fuzzer, an install or an agent, or a wave of agents, or when the machine is slow, the load is high, or a brief says to ask before a heavy command.
---

# Ask the load governor before anything heavy, and use its answer (one job: the machine is never maxed out)

Every session, agent and project on the machine shares one budget of cores. The governor keeps it: the slots jobs hold together (60 % of the cores by default) and a ceiling on the 1-minute load (70 %). The last 20 % of the cores is never granted, whatever any setting says: it is the system's and the person's at the machine. Four agents that each ran their own tests and a fuzzer once took an 18-core machine to load 43. Asking costs one node start; guessing costs the user their machine.

<constraints>
Always do:
1. Ask before every heavy command (a test run, a build, a fuzzer, an install, the soak) and before starting an agent or a wave:
   `node .claude/tools/load.mjs ask --for test|build|fuzz|agent|install` (in the kit itself, `node bin/claude-packs.mjs load ask ...`; anywhere the kit is installed, `npx --no-install @thedecipherist/claude-packs load ask ...`). Add `--want N` for a job that needs N cores whole; add `--json` to read it in a script.
   Ask at your priority: `--priority P` (0 to 1), or `CLAUDE_PACKS_PRIORITY` in the environment, which `buildq` and `governed` read too; 0.5 when neither is set. P is the most of the budget the job may hold (0.3 of a 10-core budget is 3 cores, never less than 1). Waiting jobs are served highest priority first, a waiting job's priority rises 0.1 every 5 minutes, and when the load stays over the ceiling the lowest priority job is paused first. The answer names the priority it answered for.
2. Use the priority the brief gives you; a lead sets it from the order: work other steps wait on (the critical path) 0.6 and up, the lead's own merge gate 0.8, verification nothing waits on (soaks, fuzzing, re-measuring, reports) 0.2 to 0.3.
3. Read the one line and do what it says:
   - `you may use 3 cores now (tests: CLAUDE_PACKS_TEST_CORES=3; builds: -j3; fuzz: -parallel=2; agents: 1 more); load 9.2 of 18, ceiling 13, 2 jobs running`: start the job with exactly those settings (the test cores, the `-j`, the fuzzer's `-parallel`), and start no more agents than it says.
   - `wait: load 14.1 over the ceiling 13; 0 cores free; ask again after the running test ends`: start nothing heavy. Do light work (reading, writing, a single test file) and ask again when it says.
4. Hold what you use for as long as you use it, when the job is not run through `governed` or `buildq` (which take and free for you): `load take N --for KIND` prints a grant id and its settings; `load free <id>` when the job ends. A grant whose holder is gone is freed by itself on the next read, so a killed job never keeps its cores.
5. Size a wave by the answer: the agents a lead starts at once are at most what `ask --for agent` says, and each agent's brief gives it its share (the test cores from the answer).
6. Start every heavy job at a low OS scheduling class as well (`taskpolicy -b` on macOS, `nice -n 15` elsewhere) when the project's brief asks for it.
7. Read the status line's `GOV used/budget` field: `queued` means jobs are waiting their turn (never stuck), `paused` means the watchdog stopped the lowest priority job while the load was over the ceiling, and resumes it when the load falls.

Never do:
- Start a heavy job without asking, or with more cores than the answer gave (`-j` of the machine, every test file at once, a fuzzer at its default worker count).
- Poll `load ask` in a sleep loop: a governed job waits in the queue inside its own call, and a lead asks again only when the answer says.
- Raise the budget in a project: `.claude/layout.json` `"guards": { "governor": { "budget": N } }` may only lower it. The machine's own budget is the user's, in `~/.config/claude-packs/governor.json` (`{ "budget": 0.6, "ceiling": 0.7 }`, a share or a count).
- Free a grant you did not take.
</constraints>

## The answer, as data

`load ask --json` gives `go` (may start now), `priority` (what it answered for, aged while it waited), `free` (cores free now), `grant` (what a take would get), `settings` (`env`: `CLAUDE_PACKS_TEST_CORES`, `CMAKE_BUILD_PARALLEL_LEVEL`, `CTEST_PARALLEL_LEVEL`, `MAKEFLAGS`, `GOMAXPROCS`; `flags`: the kind's own `--test-concurrency=N`, `-jN` or `-parallel=N`), `load`, `budget` (`cores`, `slots`, `ceiling`), and the jobs `running`, `queued` and `paused`. Exit 0 is go, 1 is wait, 2 is a wrong word.

# gov-core: W8.8 items 0, 0b, 1, 2 and 6 (the load governor's owner, `load`, priorities, buildq on it, the status line)

Branch `work/2.0.0-ts-gov-core`, from `origin/work/2.0.0-typescript` (merged in again at 85644ea, which added item 0b and the 80 % hard
limit to the order while this work ran; both are done here).

## The API for gov-route (`packs/base/hooks/lib/governor.mts`; everything is exported from there)

```ts
type JobKind = 'test' | 'build' | 'fuzz' | 'agent' | 'install' | 'other';
interface GovernorHost { env: Env; home: string; cores: number; load: () => number; now: () => number; alive: (pid: number) => boolean }
function machineHost(env?: Env): GovernorHost;          // the real machine; CLAUDE_PACKS_GOVERNOR_{DIR,CORES,LOAD} plant it for a test
interface Budget { cores: number; slots: number; ceiling: number }
function budgetOf(host: GovernorHost, project?: string): Budget;   // 60 % slots, 70 % ceiling, both never over 80 % (HARD_SHARE)

interface Request { kind?: JobKind; priority?: number; want?: number; project?: string; pid?: number; upTo?: number }
interface Answer { go: boolean; kind: JobKind; priority: number; free: number; grant: number; settings: JobSettings; load: number;
  budget: Budget; used: number; running: number; queued: number; paused: number; line: string }
function ask(host: GovernorHost, request?: Request): Answer;     // read only, no lock, no write

interface TakeRequest extends Request { pid: number; pgid?: number | null; command?: string; ticket?: string | null }
interface Grant { id: string; kind: JobKind; slots: number; priority: number; pid: number; settings: JobSettings; line: string }
type TakeResult = { ok: true; grant: Grant } | { ok: false; answer: Answer };
function take(host: GovernorHost, request: TakeRequest): TakeResult;   // under the lock; refused = wait (answer.line says why)
function free(host: GovernorHost, id: string): boolean;               // a grant or a queue ticket
function queueUp(host: GovernorHost, request: Request & { pid: number }): string;   // a ticket: the waiter counts as queued
function leaveQueue(host: GovernorHost, ticket: string): boolean;
function inFlight(host: GovernorHost): GovernorState;                 // { jobs: Job[]; waiting: Waiter[] }, stale ones dropped
function setPaused(host: GovernorHost, id: string, at: number | null): boolean;    // the watchdog marks a job paused / running
function pauseOrder(jobs: readonly Job[]): Job[];    // running jobs, lowest priority first (newest first among equals)
function resumeOrder(jobs: readonly Job[]): Job[];   // paused jobs, highest priority first
interface Job { id; pid; pgid: number | null; kind; slots; priority; project; start; pausedAt: number | null; command }

interface JobSettings { slots: number; env: Record<string, string>; flags: string[]; agents: number; words: string }
function settingsFor(kind: JobKind, slots: number): JobSettings;   // governor-settings.mts
```

`settingsFor(kind, n).env` holds `CLAUDE_PACKS_TEST_CORES`, `GOMAXPROCS`, `CMAKE_BUILD_PARALLEL_LEVEL`, `CTEST_PARALLEL_LEVEL` and
`MAKEFLAGS=-jN` for every kind; `flags` is the kind's own: test `--test-concurrency=N`, build `-jN`, fuzz `-parallel=max(1, N-1)`,
the rest none. To cut a command's own `-j`, reuse `capJobs(args, n)` in `core-budget.mts`.

How `governed` should wait (what buildq does, `packs/synth-creator/tools/buildq.mts` `grantFor`): `take`; on refusal `queueUp` once
for a ticket, then `take({ ...request, ticket })` every 500 ms (`napSync`, governor-store.mts) until granted; `free(grant.id)` in a
`finally`. A ticket's priority ages while it waits, so a low job is never starved.

## What I made

1. **The owner** (item 1), split by job, each under 160 lines: `governor.mts` (the API), `governor-budget.mts` (the machine, the
   budget, `~/.config/claude-packs/governor.json` `budget`/`ceiling` as a share up to 1, a count, or `"60%"`; a project's
   `layout.json` `guards.governor.budget` may lower, never raise), `governor-policy.mts` (the answer, priorities), `governor-store.mts`
   (one `jobs.json` in `$XDG_CACHE_HOME/claude-packs/governor/`, else `~/.cache/claude-packs/governor/`; every change under a
   mkdir lock holding its pid, a dead holder's or a 2 s-held lock broken; written by rename; a job or waiter whose pid is gone is
   dropped on every read), `governor-settings.mts` (`settingsFor`).
2. **`claude-packs load ask|take|free|jobs`** (item 0), `packs/base/tools/load.mts`, installed as `.claude/tools/load.mjs`. `--for`,
   `--want`, `--priority`, `--pid`, `--json`; exit 0 go/granted/freed, 1 wait/refused, 2 usage. `bin/claude-packs.mts` is now a
   dispatcher: `load` goes to the tool before the rest of the command loads; everything else is `lib/cli.mts` (the old bin body,
   moved with `git mv`, imports fixed). Lines as the order wrote them, with the priority at the end:
   `you may use 3 cores now (tests: CLAUDE_PACKS_TEST_CORES=3; builds: -j3; fuzz: -parallel=2; agents: 1 more); load 9.2 of 18, ceiling 13, 0 jobs running; priority 0.5`
   and `wait: load 14.1 over the ceiling 13; 0 cores free; ask again in a minute (...); priority 0.5`.
3. **Priorities** (item 0b): `--priority P` or `CLAUDE_PACKS_PRIORITY` (buildq reads it too), default 0.5; P of the budget is the
   most a job holds (at least 1); a want is cut to it. Waiters are ordered by aged priority (+0.1 per 5 min waited), ties by
   arrival; a caller is granted only from what is left after every waiter ahead of it has its share held. The last 20 % of the
   cores is never granted (slots and ceiling both clamped to `floor(0.8 x cores)`, no setting passes it).
4. **The build queue folded in** (item 2): buildq takes a governor grant (`upTo` its KWB-111 core budget, at its priority), waits in
   the governor's queue, frees in `finally`, and starts the job with the grant's settings; `--status` prints the governor's
   `N of M slots taken`. `build-slots.mts` (the slot folders under `BUILDQ_DIR`, `BUILDQ_SLOTS`) and its unit test are retired;
   `run-discovery.mts` reads the governor's job pids for "a buildq job waiting". buildq's tests kept, on the governor.
5. **The status line** (item 6), `packs/base/tools/statusline-governor.mts`: `GOV used/budget`, `N queued`, `N paused`, and a job paused
   over 10 minutes named in red; nothing when idle. It reads without the lock.
6. **The `load` skill** in base (`packs/base/skills/load/SKILL.md`, 4,600 characters), `load` in `prompts/help.txt` (and so the
   README's command table), `CLAUDE.md`'s installer line.
7. Every test process gets its own governor folder and a planted idle load (`test/fresh-tmp.mts`), so no test waits on the machine
   or touches the user's `~/.cache`.

## Measured

| What | Number | Command, evidence |
| --- | --- | --- |
| `load ask`'s answer, in process, median of 20 | well under 50 ms (the test asserts < 50; the test's own run printed 2.9 ms for all 20 cases' test) | `test/integration/load-ask.test.mts`, "answers in under 50 ms" |
| `node bin/claude-packs.mjs load ask`, whole process, p50 of 21 | 77 ms, beside a bare `node -e 0` at 70 ms (load 6.5) | `build/evidence/gov-core/load-ask-wall.txt` |
| the rest of the command, for scale | `list` 109 ms | same file |

The whole-process number does not meet 50 ms on this Mac today: a bare node start alone was 60 to 70 ms at the load the run was
under. The governor adds about 7 to 10 ms to node's start (the dispatch skips the rest of the CLI, about 30 ms). Under 50 ms
process wall would need a non-node path (the Go proxy, or the daemon answering `load ask` over its socket); that is open.

## Plants, red then green (each output under `build/evidence/gov-core/`)

| Plant | Red | File |
| --- | --- | --- |
| the slots used ignored | two takes over the budget, a gone pid, take without want | `red-no-budget.txt`, `red-load-no-budget.txt` |
| no stale rule | a grant whose pid is gone | `red-no-stale.txt`, `red-load-no-stale.txt` |
| no load ceiling | the answer line, wait under load | `red-no-ceiling.txt`, `red-load-no-ceiling.txt` |
| no `CLAUDE_PACKS_TEST_CORES` in the settings | a job granted 3 slots | `red-no-test-cores.txt` |
| first-in-first-served off (before 0b) | the queue | `red-no-fifo.txt` |
| project cap ignored | the budget's file and the project's cap | `red-no-project-cap.txt` |
| `bin` without the `load` dispatch | six of seven CLI cases | `red-load-no-command.txt` |
| a 60 ms ask | the 50 ms answer | `red-load-slow-answer.txt` |
| no hard limit | the last 20 % never granted | `red-no-hard-limit.txt` |
| no priority cap | `--priority 0.3` granted at most 3 | `red-no-priority-cap.txt` |
| arrival order only | the higher priority granted first | `red-no-priority-order.txt` |
| no aging | the 15-minute waiter granted | `red-no-aging.txt` |
| newest paused first | the lowest of three paused first | `red-newest-paused-first.txt` |
| `--priority` not passed | the CLI priority case | `red-load-no-priority.txt` |
| buildq on its old slot folders | granted cores, a planted grant, two builds one after the other | `red-buildq-own-slots.txt` |
| the status line without the field | the governor field | `red-statusline-no-governor.txt` |

Green: `test/unit/hooks-lib/governor.test.mts` 16 of 16; `test/integration/load-ask.test.mts` 8, `test/tools/synth-creator/buildq.test.mts`
6, `test/integration/kf-new-projects.test.mts` and `test/tools/base/statusline.test.mts` together 41 of 41.

## The gate

`npm run check` exits 0; `node scripts/counts.mts --check` exits 0 (after `node scripts/counts.mts`: base's skill count 15 to 16,
the site's 95 to 96 skills, the README's command row for `load`, all generated); `node scripts/noop-pin.mts` pinned, every difference
read: the governor's new files (`governor*.mjs`, `tools/load.mjs`, `tools/statusline-governor.mjs`, `skills/load/SKILL.md`), the
changed `buildq.mjs`, `statusline.mjs`, `run-discovery.mjs`, and `build-slots.mjs` gone (`build/evidence/gov-core/noop-pin.txt`).
`npm run test:changed -- --base origin/work/2.0.0-typescript` at `CLAUDE_PACKS_TEST_CORES=3` under `taskpolicy -b`, output in
`build/gov-core-gate.txt`: 1,011 tests, 1,008 pass, 3 fail, all three in `test/repo-lint.test.mts`:
  1. gate 11 and 12, `governor-budget.mts`: `machineHost`'s `process.env` default (a process global in a hook module). Mine; fixed
     (the caller passes its environment; every caller already did).
  2. "base names no synth word": base's `pack.json` row for `governor.mts` named synth-creator's buildq test. Mine; fixed (the row
     dropped it; buildq's test stays on synth-creator's own `tools/buildq.mts` row).
  3. gate 4, `scripts/soak-summary.mts: Verdict`, a second shared shape: not this branch's; it came with the base's w10b-soak merge
     (6367f02) and is red on `origin/work/2.0.0-typescript` as it is. [gap] for the lead.
  Re-run of the failed file only (`build/gov-lint.txt`): 1 and 2 green; 3 still red (the base's); and one new red, "nothing in the
  kit names the bare npx form", which reads `build/gov-core-gate.txt` itself: the gate's own output, an ignored file the briefs say to
  write there, holds a test title that quotes the form. [gap] in that lint (it reads ignored files under `build/`), not in the
  code; not logged in `workflow-bugs.md`, which this agent may not change.

## Choices made with nobody to ask

- A want is all or nothing (cut to the priority's share), so "two takes over the budget, the second refused" holds; a take with no
  want gets what is free up to its share and its kind's size (`DEFAULT_WANT`, or `upTo`).
- A plain `load take` from a shell is held by the nearest `claude` process above it (one `ps` call, only on take), else its parent,
  so a grant outlives the tool call and is freed when the session ends; `--pid` overrides.
- `agents: N more` counts an agent's own work at 3 cores (`AGENT_WORK_CORES`, the order's test cores per agent), so 3 free cores say
  1 more as in the order's example; starting an agent still holds 1 slot (item 4 is gov-route's).
- A setting of exactly 1 is a share (100 %), so the order's "planted budget of 100 %" clamps to 80 %; a count is a number over 1.
- `coreBudget` (KWB-111) stays as the most one build or test run may ask for; the governor decides how much of it is granted now.
  `test-changed`'s own concurrency is unchanged (gov-route's `governed` takes the grant for a test run).
- The live load is `os.loadavg()[0]` (W8.7's sampler records no load average; it is the same kernel number).
- The generated README rows and the site count were written by `node scripts/counts.mts` as the brief asks, though the wave rules
  say not to change `README.md`: only the generated tables moved.

## Refusals met

All right, none wrong: `template-law` twice on my own first draft of `governor-store.mts` (two parsers of the same shape; made one
`entryOf`), and on names that already exist (`readState` in `resident/state.mts`, `placeOf` in synth-creator's `time-state.mts`;
renamed `liveState`, `queuePlace`); `shell-traps` on a BSD `sed -i ''` (GNU sed here). Not marked with `logs mark`: the logs are the
main checkout's, which this agent does not write.

## Files

`bin/claude-packs.mts`, `lib/cli.mts` (moved from bin), `packs/base/hooks/lib/governor{,-budget,-policy,-settings,-store}.mts`,
`packs/base/tools/load.mts`, `packs/base/tools/statusline-governor.mts`, `packs/base/tools/statusline.mts`,
`packs/base/hooks/lib/run-discovery.mts`, `packs/base/hooks/lib/build-slots.mts` (removed), `packs/synth-creator/tools/buildq.mts`,
`packs/base/skills/load/SKILL.md`, `packs/base/pack.json`, `prompts/help.txt`, `CLAUDE.md`, generated `README.md`, `site/index.html`,
`packs/manifest-2.0.0.json`, `test/fixtures/noop/pinned-manifest.json`; tests `test/unit/hooks-lib/governor.test.mts`,
`test/integration/load-ask.test.mts`, `test/tools/synth-creator/buildq.test.mts`, `test/tools/base/statusline.test.mts`,
`test/integration/kf-new-projects.test.mts`, `test/unit/hooks-lib/scanners.test.mts`, `test/unit/hooks-lib/build-slots.test.mts`
(removed), `test/governor-plant.mts`, `test/fresh-tmp.mts`.

## Open

- [gap] `load ask`'s whole-process wall is node's start plus about 8 ms (77 ms p50 here); under 50 ms needs an answer without a node start.
- [deferred] (the brief: gov-route's, in turn) `governed`, the routing hook, the agent slot and the watchdog's pause (items 3 to 5) on the API above; the brief
  template's priority field and the lead's use of `load ask` are the lead's.
- [deferred] (this agent's choice, recorded above: gov-route's `governed` wraps them) `quiet-test.mts` and `scripts/test-changed.mts` still size themselves by `coreBudget`; once `governed` wraps them they run inside a
  grant.

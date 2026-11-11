# Review 1 of the typescript work order (before it runs)

Read 2026-11-11 against `workorder.md` at db817a9 (d-1 to d-10, W0 to W11), `PROMPT.md`, `CLAUDE.md`, the ten surveys, the
`write-a-workorder` skill and the 17 open rows of `workflow-bugs.md`. Code was spot-checked where a claim matters; each check is
named where it is used. Counts: 24 gaps, 17 contradictions, 15 Done when clauses that cannot be measured as written. Section 9
gives the five changes to make first.

Spot checks that hold: `lib/packs.mjs` `JUNK` is `/^(__pycache__|\.DS_Store)$|\.pyc$/` and `walk` copies every other extension;
`scripts/test-changed.mjs` exports `selftestsOf`. Spot checks that do not hold, or that the order misses: the picker's `graph`
reads `/\.(mjs|js)$/` and tests `^test\/.*\.test\.mjs$`, and `scripts/changed-functions.mjs` reads only `.mjs|.js`, so the picker
does not see a `.mts` file; `lib/packs.mjs` `CLAUDE_DIRS` is `['rules','checks','hooks','tools']`, so nothing under
`packs/base/bin/` is ever installed; `package.json` `test` is `test/*.test.mjs` and has no devDependencies;
`.claude/hooks/kit-lock.mjs` imports `../../lib/kit-lock.mjs` and `../../packs/base/hooks/lib/writes.mjs`; the kit repo has no
`node_modules/@thedecipherist`; `bugs.md` does not exist; `lib/` and `packs/base/hooks/lib/` both have `layout`, `shape` and
`run-status`; `HOOK_EXPORT` in `lib/settings.mjs` reads the installed file's text; the kit's own rule `unattended-runs.md` says
"Stop only for what cannot be undone or leaves the project: publishing, ... writing to another repo"; no pack registers a
`SessionEnd` hook today; Go 1.27.0 is installed at `/opt/homebrew/bin/go`.

## 1. Gaps: survey facts no step owns

Every numbered finding was walked. Most findings have an owner (types W2.4, owners W2.5/W3/W4, Python W3.3/W4.3, `requires` W4,
tiers W5, picker W6, template W7, generators W7.4, budgets W8, release W9, CARRY rows W10/W11). The ones below have none.

| # | Survey and finding | Why it matters | Where it belongs |
|---|---|---|---|
| G1 | other-packs 1: pack hooks import `./lib/glob.mjs` and similar, which resolve only in the merged install; sound-design's tools import audio-core's `wav`/`spectrum` | `tsc` cannot resolve these imports in `packs/<pack>/`, so `npm run check` never reaches 0. d-4's "unit tests import the `.mts`" also fails at run time for every pack lib that imports a base lib | W1.2 measures it; W2.1 adds `rootDirs` (or `paths`) mapping each `packs/*/hooks` onto base's, plus a gate that every emitted import resolves in an install |
| G2 | cli-lib 2, constraint 4: the picker and `changed-functions` see only `.mjs`/`.js` | Every "merged with the tests its changes reach green" from W2 to W5 picks nothing for a `.mts` change. Every gate passes without testing anything | W2 (see O1) |
| G3 | tooling 5 and d-5: TypeScript enforced in projects (devDependencies, `tsconfig.json`, LSP declaration, `typescript-only` check, doctor red) | No step from W0 to W11 builds d-5. Instruction (5) is half delivered | a new step after W7 (see section 9) |
| G4 | tooling 4: a fresh clone has no emit | A worktree under `.claude/worktrees/` has no `node_modules` and no emitted `.mjs`; after W4.4, `bin/claude-packs.mjs` is not there until a build. No agent brief says `npm ci && npm run build` | W2 constraint plus every agent brief |
| G5 | tooling 3: one server per extension, first registered wins; the global `typescript-lsp` plugin is enabled and fails with ENOENT | The kit's plugin can lose to it. Nobody turns it off. Enabling a repo-local plugin needs a marketplace entry, and a session loads plugins only when it starts | W1.1 probes the same loading route W2.8 uses; turn off the global server in the kit's settings |
| G6 | other-packs 2: heredoc stripping (8 copies), quote blanking (4), command splitting (7), `installedPackages` (2) | Not in W3.1's list of owners, and instruction (2) asks for these | W3.1 list (`shell-lex` owns them) |
| G7 | cli-lib 1: `lib/scan` imports `isSecretFile` from a hook and `lib/repo-weight` imports from `repo-litter`; cycles scan to fix-plan, and sync to found-folders to scan | A hook's exports are a hidden API, and the cycles stay | W4 slice 4 |
| G8 | cli-lib 1 and 3: `loadCustomPacks` runs `git fetch` on `doctor`, `list`, `lock`; doctor runs checks that are the same for a whole kit version (`lesson-checks --selftest` with no cache, the shape-symmetry selftest, skill length, manifests) and 6 identical `git ls-files` | This is project time under instruction (7), and W8 does not list it | W8.4 |
| G9 | runtime-cost 8: one `event` log line per runner, a hard stop per event, a timing line for `update` | W8's Done when measures "by the same log line, per event", and no step creates that line | W8.1 |
| G10 | repeats 2: the kit's own laws find 15 `hook-catch-must-not-allow`, 12 lookup-chain and 1 field-map hits in the kit | A senior reviewer would fix these (instruction 2) | W3/W4 with the conversion |
| G11 | cli-lib 7, configurations 8 row 7: CLAUDE.md says "There is no build or lint step", gives the `.mjs` hook form, and names invariant test files that W5 renames | No step updates CLAUDE.md, the README commands, or the authoring skills (`prove-a-hook`, `add-lesson-check`, `skill-writing`) | W10, or each step that changes one |
| G12 | tests 7 and d-4: the `npm test` glob, and test emit | The `test` script is never changed. W2.1 puts `test` in the emit with no `outDir`, so `.test.mjs` twins appear beside `.test.mts` | W2.1: `test/` is `noEmit` (a second tsconfig) and the script globs `test/**/*.test.mts` |
| G13 | configurations 8: copies 16, 18 to 25, 28 (planner text, "Real at 1.6.0", status-line sample 1.8.0, token-cost FAQ, the work-order rules held in three places, the `status.json` shape in prose, the `run.sh` copies) | 22 of 29 are held by nothing; d-8 takes about 15 | W7.4 or listed open in W11 |
| G14 | tests 3: `json-ratchet`, the `kf-refusals` 14/15 totals, `names-sweep` 2000, the `base-neutral` moved list | These are hand numbers, and the user asked for fewer tests | W5.5 |
| G15 | open-work 3 and 2: KWB-155's twin test fires on the order's own worktrees; KWB-166 is never closed; the KWB-134 plant is not taken | The baseline goes red on the run's own worktrees | W0.5 note; close KWB-166 at W9 |
| G16 | repeats 4: `dup.mjs` `real` and `project.mjs` `real` differ for a path that does not exist | W3's "`real` 3 to 1" changes behaviour, which the order's own constraint forbids | W3.1: decide it, test it red first, write a KWB |
| G17 | base-hooks 4: selftests make about 390 runner spawns, and git-guard about 100 processes | No step targets selftest time; an uncached Mac doctor took 166 s | W6 or W8.4 |
| G18 | pack-content 4: no hook or tool template; `new-pack` scaffolds no hook | Instruction (4) covers every kind | W7.1 |
| G19 | repeats 4, other-packs 4: `global/` keeps its own `isDir`, `projectRoot` and selftest loop | Slice 5 says nothing | W4 slice 5: one global helper module |
| G20 | cli-lib 6: `import(pathToFileURL(...))` of installed modules returns `any` | No declared module interface, so strict typing hides `any` | W2.4 |
| G21 | base-hooks 1: `look-gate` and `skill-first` import their selftest module on every run | Every event pays for it | W4 slice 1 |
| G22 | d-10's evidence: the prototype is in the session scratchpad `proxy/` | It will vanish, and W8 builds from it | copy it to `docs/workorders/typescript/probes/` at W0 |
| G23 | d-2 with W2.4: a module that holds only types emits an `export {};` `.mjs` | `types.mjs` gets installed into every project and enters the lock | `JUNK` skips it, or types live in a `.d.mts` |
| G24 | CLAUDE.md layout: `.claude-plugin/`, `proxy/` and `build/` are not folders in `.claude/layout.json` | "A new folder goes into layout.json first" | W0 |

## 2. Contradictions

| # | Between | Quote / path | Resolve by |
|---|---|---|---|
| X1 | PROMPT and W9 | PROMPT: "Land it once, when every step is done". W9.1 lands inside `npm run release`, W9.2 lands three times, W9.3 publishes, and W10/W11 then run after the landing | One landing and one publish, after W10. W9 measures without publishing (section 9) |
| X2 | PROMPT and the kit's rules | PROMPT: "Never stop". `unattended-runs.md`: stop for "publishing ... writing to another repo". CLAUDE.md: "A publish still needs the user's yes". W9 publishes four times and W8/W9 write to bandwarp | PROMPT names publishing and bandwarp as the one sanctioned exception with the user's yes written in, or lists both open at the end |
| X3 | constraints, W4 and the `suite-once` hook | Constraint: the full suite runs only at "W0, W5, W6"; W4's Done when also asks for the whole suite. `suite-once` refuses `npm test` unless "the prompt that started the turn asks for one". The run's prompt is "Run docs/workorders/typescript/PROMPT.md" | `run.sh`'s prompt for those sessions says "run the full suite", or the hook learns a work-order allowance (with its test). Add W4 to the constraint |
| X4 | "Never change ... installed file names" (only W8 excepted) and W2.5, W3.3, W4.3, W7.2, d-10 | new installed libs (`git-run`, `files`, `hash`, `source-exts`, `types`), `house.py` and `browser-guard.py` removed, rules merged, `hover-state` renamed, `--profile` taking a path, `resident.mts`, the binaries | List every planned change in the constraint, each with its noop manifest entry |
| X5 | d-5 and CLAUDE.md "What switches on" and the never-overwrite contract | d-5: at `update`, write devDependencies and `tsconfig.json` and turn doctor red. CLAUDE.md: "Never make a new law silently switch on in existing projects"; the kit writes only `.claude/`, the CLAUDE.md block and settings | d-5 applies at `init`; existing projects get it through `enable` |
| X6 | d-2, W2.1 and W6.2 | d-2: `kit-lock.mjs` "keeps working". W2.1 excludes `.claude`. W6.2 says "`kit-lock.mts` converted", which nothing would then emit. kit-lock also imports source-tree files that W3 makes gitignored emit | kit-lock imports the installed `.claude/hooks/lib/writes.mjs` and `lib/kit-lock` through an emitted path, plus a tsconfig entry for `.claude/hooks/kit-lock.mts` |
| X7 | W5 against W7 and W2.6 | W5: "0 removed", and the constraint "drop a test (W5 compares names)". W7: "each of the 5 tests it replaces is deleted". W2.6/W5.5 fold 11 (e) files into one | The name diff allows a listed set of renames and removals; name the 5 |
| X8 | d-6 and W5.1 | d-6: "mirroring the source path". W5.1: `test/unit/lib/NAME` for both `lib/` and hook libs. `layout`, `shape` and `run-status` exist in both | `test/unit/hooks-lib/NAME` (as the tests survey says), or the full mirror |
| X9 | W3 and W4 | W3's Done when counts "git runners 6 to 1, payload parses 4 forms to 1, hashes 9 to 1"; most copies live in hooks and tools that W4 converts. W3.3 deletes `house.py` while `browser-guard.py` needs it until W4 slice 3 | Counts move to W4's Done when. `house.py` goes in the same commit as browser-guard's port |
| X10 | PROMPT and the kit repo | `npx @thedecipherist/claude-packs workorder check` fetches npm's 1.8.2, not the branch. The `npx --no-install ... logs mark` and `status` forms fail ("npx canceled"). PROMPT says log bugs in `bugs.md`, which the kit does not have | Use `node bin/claude-packs.mjs` after `npm run build`; use `workflow-bugs.md` only |
| X11 | constraint and CLAUDE.md Branches | Slices are `work/typescript-SLICE` from the order's branch. CLAUDE.md: `work/<version>-<topic>` from fetched `origin/main` | Record a decision, `work/2.0.0-ts-SLICE` |
| X12 | d-10 and CLAUDE.md crash policy | d-10: with no daemon, "failing open as the crash policy already does". CLAUDE.md: the crash policy will "refuse a tool call once, say so" | Never let an event pass unjudged (R1) |
| X13 | d-10 against itself | "One node process per checkout and session", and also "one per checkout"; "stop at SessionEnd" kills a daemon that a second session in the same checkout still uses; no pack registers `SessionEnd` today | Per checkout, with a reference count of live sessions; register `SessionEnd` in the matcher table |
| X14 | W8.2 and the installer | binaries "under `packs/base/bin/`"; `CLAUDE_DIRS` copies only rules, checks, hooks, tools | `packs/base/hooks/bin/<os>-<arch>/`, with only the machine's binary installed |
| X15 | W8.1 and today's settings | `heartbeat` is `"async": true` and `idle-wake` is `asyncRewake`, so one blocking entry cannot hold them. A single `*` entry per event starts a blocking process on tools that start none today (Glob, Grep, WebFetch in a base-only project) | One entry per event and distinct matcher union; async hooks keep their own entry |
| X16 | W8.2 and the kit | "builds the four binaries through the build queue": the build queue is synth-creator's `buildq`, and the kit installs only base | Plain `go build`, with `CGO_ENABLED=0`, in `scripts/` |
| X17 | W2.6's gate and d-10 | "0 hand-written ... source" in a converted folder against `proxy/client.go` | Name Go as the one exception, in its own folder, with its own gate (`go vet`, the client selftest) |

## 3. Done when clauses that cannot be measured as written

| # | Step | As written | Write instead |
|---|---|---|---|
| U1 | W0.5, W6 | "no-find.mjs touched: today 9 files, 139 s to 1,456 s" | Those are git-guard's numbers (tests survey 7). Measure no-find at W0 and hold W6 to that measured figure |
| U2 | W1, W2 | "the `LSP` tool answers ..." | The session in which the plugin was enabled cannot see it. Measure in a child `claude -p` started after the settings change, and keep the raw replies |
| U3 | W2 | "the six gates pass" | W2.6 lists ten; name them |
| U4 | W2.6 | "an `.mts` newer than its `.mjs`" | Checkout resets mtimes. Build into a temporary folder and compare bytes |
| U5 | W3 | copy counts | Cannot be met at W3 (X9). Move them to W4, counted per folder by a script kept in `scripts/` |
| U6 | W4 | "the tests the picker reaches green" | Always green while the picker cannot see `.mts` (G2) |
| U7 | W5 | "161 `init` call sites ... by the tests survey's scan rerun" | That script is in a scratchpad. Commit the counter as a repo-lint rule |
| U8 | W5 | "wall under 300 s on this Mac" | Give the load (no other agents, load average recorded) and take the median of 2 runs. 300 s also uses the whole release budget (R6), so aim for 180 s |
| U9 | W8 | "50 Stops on bandwarp", "a day's log of bandwarp with its agents running" | bandwarp is paused and is another repo. Use a replay: a fixture with seven worktrees, unpushed branches and a bare remote, 50 Stops fired through the installed proxy, and the tool mix of bandwarp's `hooks.log` replayed against an install with bandwarp's pack set |
| U10 | W8 | "`init` plus `doctor` ... under 60 s" | Name the configuration and the cache state. The survey's own budget is 10 s cached and 40 s uncached for synth-creator plus audio-core |
| U11 | W8 | each proxy call "under 20 ms ... without the hooks' own work" | No log field separates proxy time from hook time. The client logs its own wall time per call |
| U12 | W9 | "three releases under 300 s" | What do they publish? Three irreversible npm versions. Time `release --dry-run` plus a local registry (`verdaccio`) for the three, then make the one real 2.0.0 publish |
| U13 | W9 | "status line reading 2.0.0" | The text `statusline.mjs` prints for a recorded payload |
| U14 | W10 | "that behaviour was kept" | Name the test that holds each CARRY row's behaviour |
| U15 | W6 | "`npm pack` size and `tsc` build time recorded" | Set a ceiling, or say it is only recorded |

## 4. Ordering

- O1. Teach the picker `.mts` (graph, test glob, changed functions, `docs/**` with KWB-131's plant) in W2. Without it, every merge
  gate from W2 to W6 is empty. W6.1 then refines it.
- O2. Make the tsconfig resolve the merged install (G1) at W1.2, where it is sized. If it is found at W4 slice 3, the whole of
  W3's typing of pack-facing libs is redone.
- O3. Move `house.py`'s removal to W4 slice 3 (X9). After W3 merges, any gpu-painter install is broken until then.
- O4. The per-version noop manifest (W7.4) is used by W5.3 ("noop against the per-version manifest") and by W6's picker
  ("the noop integration test"). Move it into W5.
- O5. d-10 is the riskiest design in the order and is proved last. Move a probe into W1: seven concurrent clients, a 1.7 s Stop
  hook in flight, a lock change during an event, the daemon killed during an event. Measure the head-of-line wait.
- O6. The hook interface d-10 needs (re-entrant, `hook(text, ctx)` with root, layout, git state and log handed in) should be
  fixed in W2.4's types and met while W3/W4 convert each hook. W8.1 as written touches all 45 hooks a second time, after W5 has
  rewritten their tests.
- O7. W8.1 changes `settings.json` for every project after W5 has rewritten the tests that assert settings (`house`,
  `hook-timing`, the noop fixtures). Decide the settings shape before W5, or accept a second rewrite.
- O8. `npm pack` with an install from the tarball (W6.3) belongs in W2's pilot. A per-folder `.gitignore` acts as `.npmignore` in
  a subfolder and can drop emitted `.mjs` from the tarball. A package with no hooks would otherwise be found at W6.
- O9. W8.2 needs the Go binaries for its tests, but they are built "by the release" (W9). Build them in `scripts/` at W8, and give
  W0 a Go row and a `go version` check.
- O10. After every merge into the order's branch, run `npm run build` and `update --dir .`. Otherwise the kit's own hooks (kit-lock
  in particular, X6) run stale or missing code.

## 5. Parallel conflicts

- W3 (three agents per layer): `types.mts` (each agent adds shapes), `.gitignore` (the ignore line "added per folder"),
  `workflow-bugs.md` (each agent takes "the next" KWB number, so two agents write the same id), the noop lists.
  Fix: the lead alone edits `types.mts`, `.gitignore` and the KWB ids. Agents ask for an id and propose a type in their branch.
- W4 (six slices):
  | File | Slices | Hole |
  |---|---|---|
  | `lib/settings.mts` (`RETIRED`), `lib/switches`, `lib/doctor`, `lib/packs` (`.py` branches, `requires` refusal) | 3 and 4 | 3 merges before 4 but needs 4's code |
  | `packs/base/hooks/git-guard.mts` exported law and `synth-creator/hooks/stage-guard.mts` | 1 and 3 | right order; say it |
  | `hook-log.mts` `runAsHook` options (by-hand flags) | 1, 3, 5 | W3 owns the file and it is already merged |
  | `test/worktree-cases-*.mjs` against the new `worktreeCase` exports, and `test/worktrees.test.mjs`'s completeness test | 1, 3, 6 | the invariant breaks in between |
  | `scripts/test-changed.mts` (slice 5) | gates of 1 to 4 | the gates run the blind picker (O1) |
  | `.gitignore`, `types.mts`, `workflow-bugs.md`, `CHANGELOG.md`, noop lists, `package.json` | all | as in W3 |
- W5 (four agents, "split by name into four even groups"): the split is by input file, but the output is by tier. git-guard's
  refusals come from `kf-refusals`, `kf-fail-open`, `routes`, `house`, `sub37-wb` and `other-projects`, so four agents write
  `test/hooks/base/git-guard.test.mts` at once. `fixtures/installs.mts` and `repo-lint.test.mts` are shared. Split by output path
  (unit; hooks by pack; tools plus integration), and give one owner to fixtures and lint.
- W7: (a) the template makes `tests`, `requires` and `fits` always present in every `pack.json`; (b) adds `fits` and a per-hook
  `order` to every `pack.json`. Both write all 39 manifests. (c) generates README tables while (a) renames skills and merges rules,
  which changes the counts. W7 gives no merge order. Give (b) the manifests, run (a) after it, and run (c) last.
- W8: "(1) and (2) in parallel, merged in that order", yet (2)'s daemon loads (1)'s `hooks.json` table and runner. Both edit the
  settings writer and `run-hooks`. Make them sequential.

## 6. Missing plants

| Step | New gate or test with no planted fault |
|---|---|
| W4 | a hook in the `runAsHook` form that loses `export const hook` (`HOOK_EXPORT` then stops folding it into the runner, so it gets a process of its own); a hook with no `worktreeCase`; stage-guard after it calls git-guard |
| W5 | the fixture copier (a copy with a stale absolute path must fail); the baseline name diff (a deleted test must show red) |
| W6 | the picker missing a transitive importer (plant a fault in a lib; the picked set must go red); the cache keyed per hook plus imports (a changed transitive import must miss the cache); the `docs/**` row (KWB-131 asks for its plant) |
| W7 | `counts --check` (a wrong README number); every code file named in `tests` (a pack file with no key); the noop manifest (an unlisted changed file) |
| W8 | git-guard's Stop cache: a ref changes and the cached "all pushed" must not be served. This is the plant that matters most, because a stale cache lets unpushed work through. Also: git state file staleness; a project's own hook inside an event entry kept by the migration (KWB-26); the daemon under concurrency; an installed binary without its executable bit; an update during a live daemon |
| W9 | release refuses on a red gate; release refuses on an empty CHANGELOG section |
| W2.6 | the emit-current gate as rewritten (U4) |

## 7. Risks the order underrates

- R1, d-10 failing open. The first event of every session, and every event after a daemon crash, passes unjudged: a secret
  staged, a push to main, a write outside the layout. Where no daemon answers, the client should run the TypeScript runner of W8.1
  for that event (85 ms, as today) while it starts the daemon detached. It should never exit 0 unjudged.
- R2, d-10 concurrency. Hooks are synchronous (`execFileSync('git')`, jscpd), so one Node process judges one event at a time.
  Seven agents share one daemon per checkout. A git-guard Stop (1.7 s median, 7.8 s p95) or a jscpd call blocks every agent's
  PreToolUse behind it. Claude Code's timeout kills the Go client, not the work in the daemon, so the queue grows. Fixes: a small
  worker pool (`worker_threads` or child processes) with a per-event deadline, and the heavy work (git-guard's Stop, time-guard's
  scans) moved off the event path. The 16 ms figure was measured with one client.
- R3, d-10 and updates. ESM modules cannot be unloaded, so "a reload when the lock hash changes" has to be an exit and a respawn,
  checked per event by a `stat` of the lock. Events in flight finish on the old code. An `update` that rewrites `.claude/hooks/lib`
  while the daemon imports lazily gives mixed versions. A daemon that outlives `npm i` of a new kit keeps running old law until its
  first event. kit-fresh's "update first" gives no proof that the daemon restarted. Plant all three.
- R4, d-10 and other state: a socket left by a crash or reboot; the 104-byte path; a daemon per checkout while agents work in
  `.claude/worktrees/*` (the key must be `CLAUDE_PROJECT_DIR`, with the judged root still taken from each payload's `cwd`); the
  status line now depending on the daemon; macOS clearing temp files. The security is adequate (socket mode 600 in the user's cache
  folder). The daemon should still refuse a payload whose `cwd` is outside its checkout.
- R5, Go against the TypeScript mandate. The user asked for Go as a proxy, so it is in scope. Record it as d-10's one exception in
  W2.6's gate and in the README. Go also becomes a dev dependency for anyone who works on the kit and runs W8's tests (the
  binaries are gitignored and built). Four 3 MB binaries in every tarball are also new weight. Pin Go in `docs/versions.md`.
- R6, the five-minute release. A gate over a large diff is the whole suite, and W5's target is 300 s, so 2.0.0's own release
  cannot meet five minutes. Only small releases can. The Mac's program starts are slow, and measurements made while bandwarp agents
  run are noise. npm publish may need an OTP; if it does, it is a person step, which `write-a-workorder` forbids inside a step.
- R7, d-2 emitting beside the source. This is right for the installer (the dist alternative rewrites 14 lib imports, bin, global,
  kit-lock and the copier). Its failure modes are fresh worktrees (G4), merges that delete a tracked `.mjs` the build has not yet
  replaced (kit-lock crashes on every tool call: X6, O10), a subfolder `.gitignore` acting on `npm pack` (O8), and tests emitted
  twice (G12).
- R8, d-4. Unit tests import `.mts` while projects run the emitted `.mjs`. A difference between them goes unseen unless the hook
  tier runs the emit; d-4 says it does, so hold that by a test. The gap is the merged-install imports (G1).
- R9, d-3, the LSP. `tsc --lsp` is "in progress" upstream and was proved only to answer `initialize`. The fallback needs
  `typescript-language-server`, whose engines field says Node >=22.22.2, against the projects' `>=22` (d-5). The global plugin clash
  is unaddressed (G5).
- R10, one runner per event (W8.1). It changes `settings.json` in every project at `update`: settings matchers move into
  `hooks.json`, `unfold` (KWB-26) must still keep the project's own hooks, and `hook-proof`, `coverage`, `kitHookScripts` and the
  `SCRIPT`/`NODE_HOOK` regexes all read commands from settings. X15 makes it a cost regression for base-only projects.
- R11, Node 22 in projects. The emitted `.mjs` needs no type stripping, so the floor holds. W6.3 tests only 22.23.3, so 22.0 to
  22.17 is untested. `@types/node` 22 stops new API use only if the kit pins it below the dev Node, which is 26.
- R12, kit-fresh after the version jump. Every 1.x project is told "update first", and an unattended `run.sh` refuses to start
  until it updates. Each throwaway publish in W9.2 triggers this again (U12). Publish no prerelease to `latest`.
- R13, bandwarp. It is paused, and its own memory says its agents wait for the kit. At 2.0.0, its next session refuses until
  `update`. That update migrates its settings (W8.1) and installs the daemon. The order's W8/W9 also write to bandwarp, which its
  own laws require on a branch per step, with `build.md` IN PROGRESS. The order should do no work in bandwarp. It should list "update
  bandwarp" as the user's first action after 2.0.0, with the commands, and replay bandwarp's logs (U9) instead.
- R14, the line limit. Typing adds lines: `shape` 274, `version-pin-guard` 284, `names-sweep` 267, `making-check` 253 and
  `time-guard` 249 will cross 300 or the 250 split line. Each split adds installed files (X4) and noop entries.

## 8. The user's instructions

| # | Instruction | Delivered by | Falls short |
|---|---|---|---|
| 1 | "convert the entire kit properly to typescript with LSP support ... methodically" | W2 to W5, W6.5 | `.claude/hooks/kit-lock.mjs` is excluded (X6); `site/js/page.js` is excluded; the LSP is unproved beyond `initialize` (R9); the merged-install imports (G1) stop "properly" |
| 2 | "follow all best practices and DRY as a senior developer" | W2.5, W3.1, W4, W10 | the shell helpers (G6), the hidden hook API and cycles (G7), the kit's own law hits (G10), global's copies (G19) |
| 3 | "all packs ... DRY ... shared helpers ... easy way to track and test what changes per commit so tests and publish stage can be reduced" | d-6, d-7, W5, W6 | the picker stays blind until W6 (G2, O1); the hand-number tests stay (G14) |
| 4 | "a pack should have a template that follows the exact same writing style every time" | W7.1, W7.2 | style checks (R7, S7, S3, S4, R1) are only ratcheted, and there is no hook or tool template (G18). A new or changed file should pass the whole set, with the ratchet only for untouched files |
| 5 | "make sure that both typescript and LSP is enforced and a dependency of the kit going forward" | W0.4, W2.6, W2.8 | d-5 has no step (G3); the kit has no write-time refusal of a new `.mjs`, only a test (the survey recommends hook, check and doctor) |
| 6 | "not take any longer than at max 5 min to publish ... committed, on main, npm published" | W9 | measured by throwaway publishes (U12); a large release cannot meet it (R6) |
| 7 | "all checks done by claude-packs when installed in someone's project have the same time constraint" | W8 (d-9, d-10) | `scan`, `doctor --fresh` and the doctor constant checks (G8) have no budget; measured on bandwarp (U9); d-10's concurrency (R2) |
| 8 | a kit that speeds up its own development and publishing | W6, W9, the selftest cache | no budget for the kit's own `update --dir .` plus doctor loop; no selftest speed target (G17) |

## 9. Verdict: the five changes, in order of damage prevented

1. Make W2 prove the foundation that every parallel step stands on: the picker reads `.mts` (O1); the tsconfig resolves the
   merged install (G1, O2); `test/` is not emitted and the test script globs `.mts` (G12); every agent brief runs `npm ci && npm
   run build` in its worktree (G4); kit-lock imports nothing gitignored (X6); `npm pack` installs the pilot from the tarball (O8).
   Without this, W3 to W5 run for days behind gates that test nothing.
2. Fix d-10 before W8 starts, and probe it in W1 (O5): never fail open (R1); a worker pool with a per-event deadline, and the
   heavy hooks off the event path (R2); exit and respawn on a lock change, with plants (R3); a reference-counted daemon per
   checkout and a registered `SessionEnd` (X13); the binary installed from `hooks/bin/<os>-<arch>/` with its executable bit proved
   (X14); built in `scripts/` with Go pinned at W0 (X16, O9). Move re-entrancy and the `hook(text, ctx)` interface into W2.4 and the
   W3/W4 conversions (O6). Make W8.1 and W8.2 sequential.
3. Rewrite W9 and PROMPT's landing (X1, X2, X3, U12): one landing and one real 2.0.0 publish after W10; the three timed releases
   use `--dry-run` against a local registry; publishing is the one stop the PROMPT names, unless the user writes the yes in; the
   full-suite sessions get a prompt `suite-once` accepts; no writes to bandwarp (R13), with its update listed for the user and its
   load replayed for W8 (U9).
4. Fix the parallel splits (section 5): W5 by output path; one owner for `pack.json` in W7, plus a merge order; W4's lib changes
   (`RETIRED`, `requires`) in slice 4 merged before slice 3; the lead alone edits `types.mts`, `.gitignore` and KWB ids; move
   `house.py`'s removal to browser-guard's commit (X9) and W3's counts to W4 (U5).
5. Give d-5 a step of its own, opt-in for existing projects (X5), with the kit's own write-time `typescript-only` refusal and the
   global LSP plugin turned off (G3, G5). Settle the contradictions in the constraint list: the installed-name changes (X4), the
   test renames and removals (X7), and the unit-test paths (X8).

# Changelog

## 0.9.3 (2026-11-01)

- The shape reader's "seen in:" / "example:" test is linear: a long row of dashes (a 75-dash comment in a CMakeLists) made its regex
  backtrack exponentially and hung `shape scan`, shape-law and brief-guard (KWB-6: 202 characters took 109 s). test/example-line.test.mjs.
- making-check's limit of three identical send-backs holds when the host delivers each send-back as a new turn (KWB-7).

## 0.9.2 (2026-11-01)

- brief-guard excuses a declared constant read by name (the number rule's third form), as well as a `seen in:` / `example:` line; a
  selector still does not excuse an instance in a brief (KWB-4). Selftest 17 cases.
- An install adds `.claude/usage.log` (brief-guard's refusal counter, a local log) to the project's .gitignore, so a step's save never
  stops on it (KWB-4). test/gitignore.test.mjs.
- making-check judges each write against its own checkout's build.md, manifest and layout, not the session's working folder: a lead
  in the main checkout writing in a worktree was sent back for a making line that was there (KWB-5). test/worktrees covers it.

## 0.9.1 (2026-11-01)

- layout: `keepWorktrees` (build-sweep's never-swept worktrees, 0.8.0) is project-owned and kept through `update`; the first update after
  0.8.0 dropped it, as 0.7.2 dropped `buildOutput`. test/layout-owned.test.mjs covers it (red without the fix), and a new test fails
  when any layout key the kit's hooks or tools read is neither written by the layout builder nor project-owned, so a third key cannot be lost.

## 0.9.0 (2026-11-01): the shape law

**What this prevents** (KWB-1): a day lost to a hard-coded instance. One spec sentence named "slot 2"; it spread through 9 agent
briefs and about 50 tests into code that knew slot 2, and the instance checks, scoped to the engine folders, let the world and the
space code through. From this release whether a thing is ONE or MANY is written down before it is built, every check reads it, and
no folder list decides what is checked.

- `design/shape.json` per synth: every concept once, `one` (a frozen id) or `many` (N instances of one shape, reached only by its
  generator or a loop), with its generator, selectors (named rules that pick an instance) and declared constants (a named instance with
  a reason). `new` and a synth's `init` write an empty one; doctor fails a synth without one, or with a row that breaks the contract.
- The number rule (`lib/shape.mjs`, one reader for every hook): a literal instance in code, test, doc, brief or making line is an
  example (a `seen in:` / `example:` line), a selection rule (a selector in the manifest) or a declared constant (read by name);
  anything else is refused with "example, rule, or constant?". `claude-packs shape scan` lists every finding in a repo.
- Hook `shape-law` (write-time, every write route, every folder but the manifest's `exclude`): refuses an instance literal, a test that
  drives one instance, an unlisted selector and an instance type with no manifest row. It replaces the engine-scoped
  `no-instance-index-literal` and `no-instance-id-literal` checks (retired; `update` removes them). Selftest 31 cases.
- Hook `brief-guard` (PreToolUse on Agent; writes to docs/ and inbox/): a brief, spec or recipe names an instance only on a `seen in:`
  or `example:` line; the refusal quotes the manifest row and the fix; refusals counted per concept in .claude/usage.log. Selftest 15.
- Gate `shape_symmetry`, generated at configure time from the manifest (`claude-packs symmetry gen --cmake|--list`, run by
  `.claude/tools/shape-symmetry.mjs`): every instance has the same members, every one of the N·(N-1)/2 pairs swaps the same; a many
  concept with no symmetry commands is red until it has them. Red on a planted missing member and a planted swap difference. It
  replaces the instances-by-index swap check.
- Hook `making` (UserPromptSubmit, 62 words; 77 with the echo): what are you making, each concept's shape, a new concept's row first, a
  brief naming an instance is wrong, a thing used twice is one parameterized function; when the prompt names an instance it echoes
  "you named X: building for all <shape>, X is the reproduction". doctor prints its cost (about 107 tokens per prompt, estimated).
- Hook `making-check` (Stop): the concepts written this turn match the `making:` line and have manifest rows, the writes passed
  once-only, and an override cites a law file line (shape.json, the spec, docs/laws.md) or an overnight Decisions entry; otherwise
  the turn is sent back, naming what is missing (after three identical send-backs the findings go to the user). Selftest 24.
- Hook `once-only` (write-time, every write route): a new block that nearly repeats code already in the repo (jscpd 5.4.2; 6 lines or
  50 tokens; C++, Python, JS) is refused with the existing location and the fix (call it, or extract one function both call). doctor
  prints the repo's duplicate count; `claude-packs dup scan` lists them. Selftest 17.
- build-step and subagent-dispatch: a step that introduces a concept adds its shape.json row as its first commit; briefs quote the row.
- shape-law, brief-guard, once-only, making and making-check are on by default (`onByDefault`); `update` switches them on.
- `npm run test:changed` (`scripts/test-changed.mjs`): runs only the tests that reach the changed files, with the fresh-tmp preload,
  printing why each was chosen; the full `npm test` stays the release gate (KWB-2).
- version-pin-guard (global): reads a `cd`'s target before `npm install`, and no longer reads "npm install" inside a heredoc (KWB-3;
  takes effect after `claude-packs global add`).

## 0.8.0 (2026-11-01)

- build-sweep (base, opt-in; SessionStart and SubagentStop): removes the build output of agent worktrees under `.claude/worktrees`
  that have been quiet for 2 hours (no source change to depth 3, nothing written at the top of the build folder), in the background.
  Never sources, never a worktree itself, never the main checkout's build. Warns at session start when the disk has under 40 GB free.
  `node .claude/hooks/build-sweep.mjs --now [--dry-run]` sweeps by hand. Worktree builds had filled a 2 TB disk (283 GB and 642 GB in
  two projects). Selftest: 9 cases (a quiet worktree's out/ and build-* go, sources and a look-alike folder stay, a worktree edited or
  building keeps its build, the main checkout keeps its build, a dry run removes nothing).
- doctor (and so init and update) runs the hooks' selftests 4 at a time with 180 s each (CLAUDE_PACKS_SELFTEST_JOBS, _S), and names a
  selftest killed for time as timed out (it said "fails its selftest" with no output). Found when the suite failed a different 1 to 5
  init tests on every release since 0.7.1; the main cause of those was the runs themselves: they called `node --test` directly instead
  of `npm test`, which skips test/fresh-tmp.mjs, so doctor read the shared system temp folder (other tests' repos, a planted token).
  Releases are tested with `npm test` from now on. test/doctor-timeout.test.mjs (seen red without the fix).
- house-control-behaviours and prove-control: a choice control (dropdown, select, menu) opens its list on a press and never steps to
  the next value; every control of every page is walked in the real window on a loaded patch, not only on INIT (B-210, B-211 in the project that found it).
- build-sweep never sweeps the newest finished build (the one most likely being played) or a worktree named in layout.json
  "keepWorktrees" (a sweep had removed the build being played); selftest 11 cases, both kept cases seen red when planted.

## 0.7.4 (2026-11-01)

- time-guard: an agent's claim on a worktree lapses after 15 quiet minutes as well as when it is known to have stopped. The agent-cap state that said "stopped" is no longer written, so a finished agent kept its worktree for ever and a successor could not reuse its build (Stellix WB-81). Selftest: a successor after 16 quiet minutes takes the worktree; the first agent coming back finds it taken.

## 0.7.3 (2026-11-01)

- layout: `buildOutput` is a project-owned key, kept through `update` (0.7.2 dropped it on the first update); test/layout-owned.test.mjs.

## 0.7.2 (2026-11-01)

- build-guard: a quoted note or title that names the test runner is not a test run (`step.py save "... ctest ..."`, `--take '...'`,
  `git commit -m`); quoted text is masked before the width and light-agent checks, keeping its length so `-R '<pattern>'` is still read
  (Stellix WB-78).
- protect-vendor: layout.json `buildOutput` names the build output (default `build/**`), so a project whose build lives in `out/` can
  write its own `build/` (a report, pictures); `build/_deps` stays vendored either way (Stellix WB-79).

## 0.7.1 (2026-10-31)

- gpu-frame-bench: step 2 reads GPU time from Dawn timestamp queries (the painter is Dawn/WebGPU); it said GL timer queries, left from the OpenGL painter (found in Stellix's install).

## 0.7.0 (2026-10-31): the two 0.6.0 lines, merged

Two sessions each released a claude-packs 0.6.0 on 2026-10-31, from different bases: main's line (from 0.5.0) and the
`work/0.5.1-instances` line (from 0.5.2). 0.7.0 is their merge, with every test of both lines passing on it.

- **Both lines kept:** main's shared selftest library (`hooks/lib/selftest.mjs`) and its nested-repo `checkoutRoot`, and
  this line's write-route reader (`hooks/lib/writes.mjs`, `shell-writes.mjs`). Hooks both lines changed carry both: main's
  selftests and this line's routes.
- **One git-guard, in Node.** `git-guard.mjs` keeps main's token law (always on) and takes the house laws from the
  Python git-guard, switched on per project (`guards.git.house`; the trunk refusal with `guards.git.refuseTrunk`).
- **Every kit hook is Node:** git-guard, build-guard, time-guard, tims-asks, idle-wake (base), gnu-shell and shell-traps
  (global) are ported, each with its selftest. One is left: `browser-guard.py` (gpu-painter). Its port waits until Stellix
  runs 0.7.0, because Stellix's installed browser-guard refuses writing a file that holds the selftest's planted launch
  samples (probed: exit 2 on `browser-guard.mjs`; it exempts only its own Python file name).
- **`claude-packs new <name>`** scaffolds a project (the house files, a git repo on a `work/` branch) and installs the
  kit. It replaces the global new-project skill; the global part is exactly three pieces.
- **One session changes the kit at a time:** `.claude-packs-lock` at a checkout's root, and the repo's own
  `.claude/hooks/kit-lock.mjs` (committed `.claude/settings.json`), which refuses every write route while another
  session's lock is in any checkout of the repo. The release merge removes the lock.
- Settings entries of the Python forerunners (`git-guard.py`, `build-guard.py`, `time-guard.py`, `tims-asks.py`,
  `idle-wake.py`) and of project copies of `shell-traps` and `gnu-shell` are retired on update; a Node hook counts as
  "had" when the project ran its forerunner, so it stays on without an `enable` line.

## 0.6.0, main's line (2026-10-31): fixes from Sub37's first install (WB-1 to WB-4)

- **WB-2** `checkoutRoot` counts a nested `.git` only when it is a git worktree of this repo, so a FetchContent clone
  under `build/_deps`, a vendored repo or a submodule is judged by the project (protect-vendor refuses edits there again).
- **WB-1** coverage walks `.claude/skills`, `.claude/rules` and `.claude/agents`, so rules on the `claude` concept no
  longer look dead in `doctor --strict`.
- **WB-3** new base hook `git-guard.mjs` refuses `push -u`, `remote add/set-url`, `clone`, `submodule` and `config` with a
  token-bearing URL; doctor sweeps `.git/config` of the project, nested repos and `layout.siblings` for a token.
- **WB-4** `--selftest` for folder-law, frozen-files, protect-vendor, spec-lock, realtime-guard, param-id-lock and
  no-shipped-images, on `hooks/lib/selftest.mjs`; doctor runs every hook's selftest in parallel.
- `npm test` preloads `test/fresh-tmp.mjs`, so each test process has its own temp folder.

## 0.6.0, this line's (2026-10-31): the instances rule, Stellix's house tooling, opt-in hooks, write routes, a global part of three

- **Instances (0.5.1):** identical containers by index, different things by ID (Stellix B-178): the rule, two lesson checks
  and the `prove-instances-identical` skill. **0.5.2:** CLAUDE.md names claude-packs as the source of truth.
- **Moved from Stellix, project-neutral** (a project's values in `layout.json` "guards"): git-guard, time-guard, tims-asks,
  idle-wake, build-guard (base); browser-guard and the no-opengl checks (gpu-painter); copy-and-prove (audio-core) and
  build-step (base) skills; the rules hooks-and-gates, plan-and-logs, copy-trees-read-only; copy-tree-guard merged into
  protect-vendor (folders of kind "copy"); from source-guard: file-size-guard counts scripts and CMake, no-shipped-images
  takes `guards.images`, one-seeded-random catches what source_rules caught, `no-code-after-midline-comment`.
- **Opt-in:** tims-asks and idle-wake wait for `"enable"`; `update` switches on a hook or check new to a project only when
  its layout enables it, and prints what it switches on and what it holds back before it changes anything.
- **WB-69, every route:** every guard that refuses a write covers Write, Edit, MultiEdit, NotebookEdit and the shell
  (`>`, `>>`, `tee`, `sed -i`, `cp`, `mv`, a heredoc into a file); `test/routes.test.mjs` tries each route on each guard.
- **Global part of three:** latest-versions (with version-pin-guard), gnu-shell, shell-traps. Global by design: they fix
  this machine's shell for Claude, not any project's rules.
- **Fixes:** version-pin-guard read `2>&1` as a package and a `$&` in an Edit's new_string as a pattern; `update`
  re-created `.pack-new` for a file that is the pack's own version; `doctor --strict` counted git-ignored build output.

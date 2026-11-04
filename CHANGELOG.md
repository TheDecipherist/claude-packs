# Changelog

## 0.10.1 (2026-11-03)

The hover law (Tim, 2026-11-03; the kit half of Stellix B-261): "Controls dont have a hover state ... all controls and screens that
has points that can be interacted with needs to not only change the cursor to what the interaction is but also some kind of small
effect on whats actually hovered."

- Rule `hover-every-pressable` (gpu-painter, concept `ui`) and `web-hover-every-pressable` (full-stack, concept `ui`, now the
  `channel` folder): every element the pointer can act on has a cursor naming its interaction and a small visible effect on the
  hovered thing itself; the hover follows the press's own hit test (one function, never a second list); the disabled look is only
  for what is truly disabled.
- Skill `hover-state` (gpu-painter, full-stack): how to add the hover to a new control and how to prove it with a hover walk
  (the pointer over every pressable item; the cursor and the drawn pixels change; the ring round it does not; it returns to rest;
  the faults planted so the gate is seen red). Cites Stellix's `tools/gates/hover_gate.sh` and
  `lib/app/gates/editor_hoverwalk_read.h` as the worked example.
- Check: `layout.json` `"gates": { "hover": "<command>" }` (a project-owned key, kept by every update). doctor is red when the hover
  rule is installed, a file stands under its paths and no hover gate is declared, or the declared command names a file that is not
  there; `"none: <reason>"` declines with its reason. A fresh project with no UI code yet stays green (`doctor --strict` on a fresh
  install of each configuration is unchanged). The Stellix profile declares `bash tools/gates/hover_gate.sh`.
- `test/hover.test.mjs`: 7 tests, red on 0.10.0, green.

## 0.10.0 (2026-11-03)

Configurations (Tim, STEP 3: "Today the kit is one configuration pretending to be general. Build it as data."; KWB-31).

- `configurations/<name>/config.json`: a kind of project as data: its packs (`always`, `choose`, `default`), its layout template
  (the folders `init` creates), `hookOrder` (its hooks' order per settings entry), `sourceFiles` (what doctor's coverage counts
  as source) and the `preamble` (the house rules of the CLAUDE.md block). `init --config <name>` stores it in layout.json
  `"configuration"`; `update` applies that one (an install that names none gets the smallest configuration that takes its
  packs, and writes it); `config <name> [--dry-run]` lists what changes (packs, rules, hooks, checks, skills, preamble, template
  folders), then switches; `configs` lists them; doctor prints the configuration and fails on an unknown one or a pack outside it.
- Three configurations: `base` (universal engineering only; the kit's own repo is on it), `synth-creator` (everything installed
  before; Stellix and Sub37) and `full-stack` (Fastify + Next.js).
- base holds only universal engineering: git-guard, file-size-guard, folder-law, placement-law, the shape law (shape-law,
  brief-guard, making, making-check, once-only, shape-symmetry), lesson-checks, and two new laws. Everything synth-specific
  moved, byte for byte, to the new `synth-creator` pack (installed only by that configuration): build-guard, time-guard,
  spec-lock, frozen-files (+ freeze.mjs), protect-vendor, stage-guard, build-sweep, idle-wake, tims-asks; the rules
  debug-by-measurement, done-means-fresh-evidence, hooks-and-gates, copy-trees-read-only; the build-step skill.
  realtime-checks.mjs moved to audio-core beside realtime-guard. The synth examples left in base (src/dsp, Voice.cpp, "sounds",
  synth.git) were made neutral; test/base-neutral.test.mjs refuses a synth word (sound, panel, patch, voice, DSP, synth) in base.
- `secrets-guard` (base, KWB-33): no .env, key file or credentials file staged (`git add`, also `-f`, and `-A`/`.` while one is
  not ignored); no literal GitHub, Anthropic, OpenAI, AWS, Slack or Stripe key, private key block or connection-string password
  written into a file; no .env written while git does not ignore it. Rule: secrets-never-committed.
- `untrusted-boundary` (base, KWB-34): a model call (Anthropic, OpenAI, AI SDK) added to a JS, TS or Python file that has no
  per-call SHA-256 boundary (`wrapUntrusted(...)`) and no `untrusted: none` line is refused. Rule: untrusted-content-boundary.
- A rule may state one hook's law (`# hook: <file>` in its frontmatter): it is held back, left out or switched on with that hook.
  Both new laws are on in a new project and held back in one that had base before (name them in `"enable"`).
- `full-stack` pack: `stack-guard` (no express or vite in a package.json, an import or an install; no zod below 4),
  `schemas-only` (z.object only in the schemas folder; env.ts excepted), and ten rules per folder: the stack, thin routes,
  handlers, one database gateway with chain keys first, one error contract, Zod 4 schemas, env.ts shapes only, health and
  correlation id and remote_ip on every log line with helmet and rate-limit behind isProd, multistage Dockerfile, inject() tests.
  Layout template: packages/core/src/schemas, api/src/{routes,handlers,adapters,auth}, api/test, channel.
- doctor's coverage reads what is source from the configuration (`sourceFiles`): TypeScript and JavaScript in full-stack (KWB-32).
- `planner-skills [--out <dir>]` (KWB-35): one project-layout skill body per configuration, from its layout template, packs and
  preamble.
- Stellix and Sub37: update in synth-creator makes what 0.9.15 made, the `"configuration"` key aside: the same settings.json,
  CLAUDE.md and file set; content changes only in the base files made neutral (test/noop.test.mjs, fixtures from both projects).
- Tests: configs (8), base-neutral (2), base-laws (2), noop (3), full-stack (3), configurations (5); each seen red on 0.9.15.

## 0.9.15 (2026-11-03)

- The kit lock is a lease (KWB-29): `.claude-packs-lock` carries `started_at` and `last_seen`; the holder's kit-lock hook (now on
  every tool call) renews `last_seen` at most once a minute, and a holder whose hooks are another project's (a Stellix lead and
  its agents) renews it by working: its transcript or a subagent's, written later, counts as seen. No renewal for 30 minutes
  and the lease is stale: the next session that writes or commits takes it over, logged in `.claude/kit-lock.log` (who held it,
  branch, since, last seen, by whom). A live lease is never taken or deleted; `lock release --force` is the only way, and says
  so. Nothing prints "since undefined": a lock with no start reads "start unknown". `lock status` prints held since, last seen
  and live or stale; `lock take [--branch <b>]` takes the lock for a session whose hooks are not the kit's. The lock and its
  log are runtime state, ignored by git (renewing a committed lock would dirty the tree every minute).
- kit-lock guards commits, merges and releases only (KWB-30): `git commit`, `merge`, `pull`, `cherry-pick`, `revert`, `am`,
  `rebase`, `git tag <name>`, `npm version`, `publish`, `pack`, and removing another session's live lease. Editing files and
  `git push` of commits that exist pass whoever holds the lock (a push in a command that also wrote a log in the repo was
  refused).
- Tests: test/lock-release.test.mjs, four new (a lease 31 min old taken over and logged, 29 min held; the holder's activity renews it,
  throttled; "start unknown", never "undefined"; a push passes and a commit, merge, tag and npm release are refused while
  another live session holds the lock), each seen red on 0.9.14.

## 0.9.14 (2026-11-03)

- The kit is a project like any other (KWB-26): its own `.claude/` carries the base pack (`.claude/layout.json` names the kit's
  folders, the house git laws and the trunk refusal on), so every base hook judges work on the kit, kit-lock beside them, and
  `doctor --strict` passes on it.
- git-guard, two house laws (KWB-26): a `git commit` is refused while the branch has commits that are on no GitHub branch (the
  first commit of a new branch passes, the next waits for its push; a push earlier in the same command counts), naming the
  commits and the push with the token named; the end of a session (Stop) is refused while any local branch is ahead of GitHub or
  missing there, listing them with one push command and never offering a delete (three identical refusals end the session, the
  list going to the user). GitHub's heads come from `git ls-remote` (protocol v0, one request; the token from the environment or
  ~/.env as a header in the child's environment, never on the command line or stored). The last look is kept in the git dir and
  only ever lets work through: anything it would refuse is looked up live, so a push seconds ago counts at once and a commit or
  Stop the last look clears makes no network call. GitHub out of reach (offline, no token): a warning, and the work goes ahead.
  git-guard is registered on Stop in the base pack.
- settings: the runner folds in only a hook that exports `hook(text)`; any other node hook keeps its own entry (the kit's
  kit-lock was folded in and failed as exit 1, so it never refused). An update unfolds a runner command into one entry per hook
  before it rebuilds the kit's entries, so a project's own hook in it is kept (it was dropped). kit-lock exports `hook`.
- Every doc, hook message, rule, skill and command text names the kit as `npx --no-install @thedecipherist/claude-packs ...`
  (KWB-28: a bare `npx claude-packs` in a project without node_modules downloaded and ran an unrelated public package).
- Tests: test/kit-guards.test.mjs (own hooks through init and two updates; the kit's own install and doctor --strict; no kit
  command, hook, skill or doc deletes a branch), test/npx-name.test.mjs (no bare `npx claude-packs` anywhere in the kit).

## 0.9.13 (2026-11-03)

- gnu-shell works on Linux as well as macOS (KWB-27): on Linux the system tools are GNU already, so no Homebrew is looked for and
  nothing says the tools are BSD; `~/.claude/bin` still goes first on the Bash tool's PATH, a zsh session is still warned on every
  command, and the shell is still checked for bash 5 (any bash 5). macOS is unchanged. The selftest fakes each bash version instead
  of reading the machine's `/bin/bash`, so `global doctor` and `npm test` pass on Linux (they failed there on "Apple's bash 3.2").
- CLAUDE.md for working on the kit itself.

## 0.9.12 (2026-11-03)

- Hook timing (KWB-24): every installed hook writes one line per call to `.claude/hooks.log` (ISO time, event, hook, ms, exit
  code, tool), through one helper per language (`hooks/lib/hook-log.mjs`, `hooks/lib/house.py` `log_hook`); the log is cut to
  its newest half past 256 KB and is git-ignored. `doctor` prints each hook's median and worst over its last 100 calls, and a
  hook whose MEDIAN is over 500 ms is a red check (the median is what every call pays; the worst is printed, never judged: one
  call on a loaded machine is a spike, not the hook's cost).
- One node process per settings entry: `hooks/run-hooks.mjs` runs every kit node hook of an entry in turn (each hook exports
  `hook(text)`; its stdout and stderr are caught, its timing line written; the runner exits 2 when any hook refused). settings.json
  names the runner and its hooks (`node ".../run-hooks.mjs" .claude/hooks/a.mjs ...`); an async hook (idle-wake) and the Python
  hook keep their own entries. Every hook still runs on its own, and every selftest's hook calls go through the runner. Measured
  on a copy of Stellix (load 14 to 25): the 15 hooks on a Bash rm, 1676 ms wall and 3468 ms one by one before, 423 ms and 777 ms
  after; no hook process over 500 ms median.
- once-only keeps an index (per source file, the hashes of its 20-token windows, in the temp folder, keyed by modification time
  and size): built once (1.7 s on Stellix's 752 sources), then only files that changed are read again (a walk that stats, about
  100 ms). The index finds candidates, looser than jscpd so it holds every clone jscpd finds (measured: all 55 files jscpd flags on
  Stellix); jscpd then confirms on those files alone, so a write is refused when jscpd over the repo would refuse it, and a write
  with no candidate never starts jscpd. making-check judges the turn's writes the same way, with one git diff for all its files.
- making-check reads the transcript from its end (1 MB, more only when the turn's prompt is further back): 1.7 s to 4 ms on a
  277 MB transcript. A transcript over 512 MB could not be read at all before, so making-check judged nothing in those sessions.
  The branch comes from the HEAD file, not a git process.
- time-guard: the controller's scan of every worktree (a git status in each: over a minute for Stellix's 125 worktrees, killed at
  the hook's timeout before it saved, so every call scanned again) runs in its own background process; its finding is told on the
  next call, once. An agent's own worktree is looked at once a minute, not on every call.
- `claude-packs lock status` and `lock release [--force]` (KWB-25): each checkout's kit lock, its holder, branch, start and
  whether the session is live (its pid runs, or its transcript was written in the last 15 min). release takes away the caller's
  own lock or a gone session's; another live session's lock stays unless --force. The lock's form is extensible
  (`version`, `holder: { session, pid }`, `branch`, `started_at`, with the old keys beside them); the old form is still read.

## 0.9.11 (2026-11-03)

- lib/shape.mjs back under 300 lines (0.9.10 took it to 301, past a project's line limit); a test now holds every installed file to 300 lines.

## 0.9.10 (2026-11-03)

- shape-law and brief-guard judge what a write adds by what each finding names (concept, instance, reason), not by its line's
  text: a line that was there, then edited or moved (a bug row closed and moved to Fixed with its cause), names nothing new; a
  second copy of a literal is still refused (KWB-23).

## 0.9.9 (2026-11-03)

- shape-law reads a multi-word all-caps label as a control's name, not an instance: "AIM EFFECTS 100" (a value) and "a NOTES MONO
  oscillator" (a setting) are let through; a single role word ("the PAD slot") and "SLOTS 2" are still refused. A number past a
  concept's count is a value, not an instance ("slot 40 ms") (KWB-22).

## 0.9.8 (2026-11-03)

- protect-vendor reads a layout key `writeOnce` (globs): evidence a command leaves. A new file there may be written by any route;
  an existing one is never overwritten, edited, appended to, moved or deleted (KWB-21). A project that listed its evidence folder
  under `protected` (every write refused, so no evidence could be added) moves it to `writeOnce`.

## 0.9.7 (2026-11-02)

- The shell reader (every hook that judges a shell write) reads a path through the variables the command set earlier
  (`S=/tmp/x; cat > $S/a.md`), so a write outside the project is no longer judged as `<project>/$S/a.md` (KWB-18).
- Several shell writes to one file in one command (`sed -i A f && sed -i B f`) are judged as one change: once-only no longer
  reads them as two copies of the file (KWB-13).
- making-check judges the concepts of code writes only: docs, briefs, build/, inbox/ and notes are not judged (KWB-19).

## 0.9.6 (2026-11-02)

- making-check reads a making line's concepts with bracketed text stripped first, nested brackets too, so a ";" inside a shape
  ("slot (many, 4; slotId(i, field))") no longer ends the list and turns "4" into an unknown concept (KWB-17).

## 0.9.5 (2026-11-02)

- build-guard takes `build.sh build <one target>`: the single word is read as a build folder only when it is a path or a folder that
  exists; a target name builds that target (KWB-14; Stellix WB-90, WB-95).
- shape-law's role-name check leaves a gate's verdict word before a concept word alone ("FAIL slot 2"; KWB-15).

## 0.9.4 (2026-11-01)

- The write hooks judge an inline program that writes files (python3 -c / a heredoc, node -e, perl -e/-i, ruby -e/-i): its open-for-write,
  write_text, shutil, fs.writeFileSync and the like are writes to their paths, with the new content where the program states it (KWB-8:
  agents had made whole fixes through Python and the hooks never saw them). Script files and `-m` modules are not judged as writes.
- The no-code-after-midline-comment check stays on one line; a line-end comment followed by a `return` or a call is no longer refused (KWB-9).
- design/shape.json `"values"`: plain value types the new-type check skips (KWB-10).
- design/shape.json `"names"` on a concept: its instances' identity names (a planet's kind: the DELAY planet); the role-name check allows a
  listed name and still refuses an unlisted one (KWB-12: different things by ID).
- The release steps fast-forward the local main as well as the remote (KWB-11).

## 0.9.3 (2026-11-01)

- The shape reader's "seen in:" / "example:" test is linear: a long row of dashes (a 75-dash comment in a CMakeLists) made its regex
  backtrack exponentially and hung `shape scan`, shape-law and brief-guard (KWB-6: 202 characters took 109 s). test/example-line.test.mjs.
- making-check's limit of three identical send-backs holds when the host delivers each send-back as a new turn (KWB-7); its selftest names
  its sessions per run, so repeated runs in one temp folder no longer add to each other's counts).

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

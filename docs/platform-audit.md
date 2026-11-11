# The kit on Linux, macOS and Windows: the audit and what is left

Work order for 1.9.0 (branch `work/1.9.0-platforms`, KWB-152). The user, 2026-11-11: "you need to go over all bash commands and
verify what works on windows vs mac and fix all of them in one go". Every fix gets a test that runs it the way the other system
would (a planted platform, a planted PATH), seen red before the fix, and the kit's suite must be green on the Mac.

## Done on this branch

- The status line asks git once a render (`git status --porcelain=v2 --branch`, in `statusline-work.mjs` `gitState`), and not
  again while the repo's index, HEAD and fetched refs are unchanged, for up to 30 s.
- From 1.8.x, unreleased: `buildq` builds yield with `nice` on every core, never macOS's efficiency cores alone (KWB-149); a job
  alone takes the whole core budget (KWB-150); the heartbeat hook; `no-find` (KWB-154); the status line itself.

## The kit's suite on the Mac: 598 passed, 22 failed (2026-11-11, at 1.8.2-agents)

The log is `~/projects/claude-packs/.mac-suite-1.log` on the Mac. Fix them in this order, the first error first, then run again:

1. `base and the base configuration name no synth word`: fixed on this branch (run-tree.mjs's example rows).
2. `git-guard at Stop, fired from a worktree, refuses while its landing left the main checkout behind (KWB-96)`.
3. `on Linux with a display, a window goes to a virtual one, and Wayland is not left open beside it`: a Linux-only case run on macOS.
4. Sixteen `prove-a-bank` cases (`a planted fault fails bank-loudness, and only it` and the rest, `a bank that meets the gate`,
   `a render the gate needs and the bank lacks fails as not measured`): one cause most likely, read the first.
5. `a 0.5.x project updated to 0.6.0 switches on nothing new it did not enable, and update prints the list`.
6. `KF-17: a count passed to a call is told from an instance by the declared parameter` (16 s), `shape-law: every real refusal
   marked wrong passes` (176 s), `new <name> scaffolds the project, installs the kit and starts it on a work/ branch` (236 s): slow,
   and failing; on the Mac every program start costs about 30 times the PC's (security agents; see below).

## The audit: every place the kit runs a program (read from the files, 2026-11-11)

The five worst, by how often times how badly:

1. **Processes per tool call.** Each settings entry is its own `node`: a Bash call starts 4 PreToolUse entries (heartbeat, the
   write group, the Bash group, Read|Bash) and 2 PostToolUse (heartbeat, look-gate), and `global add` 2 more: 8 per Bash call, 4 per
   Write, 3 per Read. Fix: one runner entry per event, each hook's matcher passed to `run-hooks`, which runs the hooks a call
   matches; the heartbeat inside it (one file write).
2. **The status line**: was node plus 3 git every second (fixed, above); still `ps` plus `lsof` over every process every 30 s on
   the Mac: give `lsof` only the pids `ps` picked.
3. **shell-traps and gnu-shell**: `shell-traps` refuses `sed -i ''`, `stat -f` and `date -r` always, so on a Mac without
   Homebrew's GNU tools it refuses the correct BSD forms (and `gnu-shell` then says to write them). `global add` never sets the
   Bash tool's shell (`env.CLAUDE_CODE_SHELL`), so it stays zsh with only a warning; `BASH` assumes `/opt/homebrew` (an Intel Mac
   has `/usr/local`). Fix: refuse a BSD form only where the GNU build is first on PATH (`gnu-shell`'s `prefix()`/`gnubin`); `global
   add` sets the shell to a bash 5 it finds; the env-file line adds `setopt sh_word_split nonomatch` under zsh.
4. **quiet-test on macOS** polls the front app every 300 ms with 2 `lsappinfo` calls, plus a `ps` walk when it changes: about 7
   programs a second for a whole test run. Poll once a second, with one `lsappinfo front`. On Windows, `spawn('npm')` without a
   shell fails on `.cmd` (Node 22): `shell: true` on win32.
5. **Windows doctor is red**: 18 selftests take a path from `new URL(import.meta.url).pathname` (`/C:/…` on Windows: use
   `fileURLToPath`); `secrets-guard`'s selftest spawns `touch`, others `sh -c` fakes; `python3` by name (`py -3` on win32). So
   `workorder check` refuses every run on Windows.

The rest:

- `shell-writes.mjs` `findGnuSed`/`afterText`: without GNU sed, a `sed -i` edit is not judged at all (unread-writes only says
  so): do a plain `s///` in JS; cache the sed lookup across processes.
- `agents-held.mjs` `parentOf`: `ps` per parent; no `ps` on Windows (fails open; `run.sh` sets the variable): skip on win32.
- `time-guard.mjs`: `ps -axo` once a minute, git status and log per worktree; its `/.claude/worktrees/` regexes never match `\`
  paths: make `\` `/` at entry; guard `processTable` on win32.
- `git-guard` + `lib/pushed.mjs`: about 8 git calls per `git commit` (rev-parse, remote get-url, config twice, ls-remote cached,
  cat-file, log): one `git for-each-ref` with `%(upstream:track)` replaces most.
- `dup.mjs` `findJscpd` (once-only): `.bin/jscpd` is a shim on Windows, PATHEXT ignored, mixed separators: `require.resolve` the
  real binary, `path.join`.
- `chart-first.mjs`: `git ls-tree -r -l HEAD` per source write: cache by HEAD.
- `browser-guard.py` + `lib/house.py`: a Python hook; macOS without the Command Line Tools opens an install dialog for `python3`,
  Windows often has none: port to `.mjs`, in the runner.
- `buildq.mjs`: `spawnSync(command[0])` without a shell: `.cmd` fails on Windows. `test-verdict.mjs`: `bash -c`. `shape-symmetry.mjs`:
  `shell: true` is dash on Debian, bash 3.2 on macOS, cmd on Windows: say POSIX sh or run `bash -c`. `build-sweep.mjs` `du -sk`:
  0 GB on Windows (use an `fs` walk). `vst3host/build.sh`: not on Windows (say so in `bounce-a-plugin`).
- The CLI: `doctor`, `global`, `hook-proof`, `symmetry-doctor` start `'node'` and `'python3'` by name: `process.execPath`, `py -3`.
  `scripts/release.mjs`: `npm`/`gh` without a shell (the kit's own release only).
- Templates and docs: `run.sh` and `run-a-workorder` step 4 start the runner with no detach (it dies with its terminal; macOS has no
  `setsid`): a `workorder start` command with `spawn(..., { detached: true })`, output to the logs, on all three. `pdf-to-md`
  SKILL.md uses `pgrep -fc` (no `-c` on macOS, no `pgrep` on Windows) in an `until` poll loop (which `long-work-in-the-background`
  forbids). `a-control-is-proved-through-its-input.md` says `xvfb-run -a` (Linux only): point at `quiet-test.mjs`.

## The Mac itself

An M5 Max, 18 cores, 128 GB, with CrowdStrike Falcon, JAMF, Kolide and Code42. `~/projects` is excluded from their scanning, so work
there costs little; outside it every file is checked. Starting any program costs about 30 times the PC's (100 starts of
`/usr/bin/true`: 3.9 s against 0.14 s; 20 `git` calls: 2.0 s against 0.07 s), so the number of programs a hook or a test starts is
what makes the kit slow there. Whether moving the tests' temp folder from `/var/folders` into `~/projects` helps is not measured yet
(one try on a busy Mac was noise).

## Also open, for the same release

- KWB-147, a contributor's patch (`guards.git.pushNeedsYes`): `~/projects/bandwarp/tmp/kwb-147-push-needs-yes.patch` on the PC, two
  commits from `git format-patch`; apply with its author kept, renumbered (KWB-147 is taken), merged by hand where it meets this
  branch's `noop.test.mjs` and `workflow-bugs.md`.
- `claude-packs report` (system info on every crash note), `CONTRIBUTING.md` with PR and issue templates, `claude-packs contribute`
  (a project's edited kit file sent upstream as a pull request on the user's yes).
- KWB-151 (the C++ pack compiles every source under each compiler family the project ships on), KWB-153 (a test has no memory or
  time limit), KWB-154's refusal now `no-find`, KWB-147 (git-guard and a worktree's `node_modules` link).
- 1.8.1's landing check passed 593 of 594 (the one failure is fixed here); release once, after this sweep, with 1.8.x folded in.

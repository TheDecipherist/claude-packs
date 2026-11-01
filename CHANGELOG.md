# Changelog

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

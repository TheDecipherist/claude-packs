# @thedecipherist/claude-packs

Per-project Claude Code rules, lesson checks, hooks and skills for The Decipherist's JUCE synths. Everything installs into the project's own `.claude/` (and nested skill folders). The only things that go into `~/.claude` are the three global pieces (`global add`, below).

## Packs

| Pack | For | Rules | Checks | Hooks | Skills |
|---|---|---|---|---|---|
| `base` | every project (always installed) | 11 | 3 | lesson-checks, folder-law, placement-law, spec-lock, protect-vendor (vendored code and copy trees), file-size-guard, frozen-files, stage-guard, git-guard, build-guard, time-guard; opt-in: tims-asks, idle-wake | add-lesson-check, pressure-test-skill, prove-instances-identical, build-step |
| `audio-core` | any JUCE synth or effect | 40 | 8 | realtime-guard, param-id-lock | juce-realtime-audit, measure-tone, copy-and-prove, … (+ tone-report tool, `.clang-tidy`) |
| `gpu-painter` | GPU-drawn UI on Dawn (Metal / D3D12) | 14 | 6 | browser-guard | gpu-frame-bench, gpu-golden-check, gpu-golden-update, gpu-lifecycle-stress, gpu-capture |
| `stellix` | the Stellix spec laws | 5 | 5 | no-shipped-images | – |

The projects on the kit: Stellix (`init audio-core gpu-painter stellix --profile stellix`) and Sub37 (`init audio-core --profile sub37`).

## Commands

```
npx claude-packs init <pack...>     install packs, create the layout folders
npx claude-packs add <pack...>      add packs
npx claude-packs remove <pack...>   remove packs (files you edited are kept)
npx claude-packs update             re-sync installed packs from this version
npx claude-packs doctor             verify paths, folders, hooks, checks
npx claude-packs survey             print the prompt that writes docs/project.md
npx claude-packs list               show the packs
npx claude-packs lock status|release [--force]   the kit repo's lock: who holds it, live or not; release a gone session's
```

## Hooks are timed, and run in one process per entry (0.9.12)
- Every hook writes one line per call to `.claude/hooks.log` (time, event, hook, ms, exit code, tool; git-ignored, kept under
  256 KB). `doctor` prints each hook's median and worst over its last 100 calls; a median over 500 ms is a red check.
- settings.json runs the kit's node hooks of one entry through `.claude/hooks/run-hooks.mjs`, one node process for all of them
  (`node ".../run-hooks.mjs" .claude/hooks/a.mjs .claude/hooks/b.mjs`). Each hook still runs on its own (`node .claude/hooks/a.mjs`).
- once-only judges a write against an index of the repo kept between calls (only changed files are read again); jscpd confirms
  only a write the index flags.

## How it decides where things apply
- **`.claude/layout.json` is the one source of truth.** It names every folder (`src/audio`, `src/world`, `src/painter`…) and every concept (audio, dsp, world, painter, shaders, ui, params, records, tests, bench, build).
- **Rules** declare their concepts (`# concepts: dsp, world`); their `paths:` are generated from the layout. Move a folder in layout.json, run `update`, and every rule follows.
- **Lesson checks** resolve their concepts at runtime from the same file.
- **The folder-law hook** refuses new source files outside the layout folders.
- **CLAUDE.md** gets a generated "Project layout" section between `<!-- claude-packs:start -->` markers, in `<constraints>` form.
- **Skills** for one area go into that folder's nested `.claude/skills/` (the GPU skills in `src/painter/`), so they only appear once Claude works there.

## It never overwrites your work
- Your own files in `.claude/` are left alone. If a pack file has the same name, the pack's version is saved beside it as `<file>.pack-new`.
- A pack file you edited is kept on every update. The new version goes beside it as `<file>.pack-new`. `--force` replaces edited pack files, never your own files.
- In `CLAUDE.md`, only the marked section is written; everything else is yours.
- In `settings.json`, only this package's hooks are changed; your hooks and settings stay. A malformed `settings.json` stops the run before anything changes.
- `layout.json` keeps your edits; new packs only add folders and concepts.
- `CLAUDE.md`, `settings.json`, `layout.json` and the lock are backed up to `.claude/.claude-packs-backup/` before every run (last 5 kept; the folder is added to `.gitignore`).
- Files that leave a pack are removed only if you never edited them.

## Tailoring to a real repo
1. In the project, run `npx claude-packs survey` and give the printed prompt to Claude Code. It writes `docs/project.md`: the real folder tree, where every concern lives, how the code is written, the existing Claude setup, and a proposed `layout.json`.
2. Bring project.md back. The packs' layout, concepts, rules and skill triggers get tuned to it.

## Install from the tarball
`npm i -D ./thedecipherist-claude-packs-0.7.0.tgz`, then `npx claude-packs init …`. Needs Node 22+. `npm test` runs the end-to-end tests.

A new project: `npx claude-packs new <name> [--packs audio-core,gpu-painter] [--profile <name>] [--dir <parent>]` makes the
folder, the house files (`CLAUDE.md`, `build.md`, `bugs.md`, `workflow-bugs.md`, `docs/versions.md`, `.gitignore`), a git
repo on a `work/` branch, and installs the kit into it (it was the `new-project` skill; it is a kit command now).

## The global part: exactly three pieces

```
npx claude-packs global add      # ~/.claude/skills/latest-versions, hooks/claude-packs/version-pin-guard.mjs (+ lib/shell-writes.mjs),
                                 # hooks/gnu-shell.mjs, hooks/shell-traps.mjs
npx claude-packs global doctor
npx claude-packs global remove   # removes only what it installed and you did not edit
```

Everything else in this package is per project (Tim, 2026-10-31). The global part is exactly three pieces, and `global add` installs nothing else:

1. **latest-versions** (the skill and its `version-pin-guard` hook), because "look up the newest release before you pin anything" applies to every project, including new ones that have no packs yet.
2. **gnu-shell** (SessionStart: bash 5 and the GNU tools first on the Bash tool's PATH, `~/.claude/bin` first, a warning on every command in a zsh session) and
3. **shell-traps** (PreToolUse on Bash: the BSD flags, unsplit zsh words and `;`-chained destructive steps that cost time on this Mac).

Global by design: they fix this machine's shell for Claude, not any project's rules.

`build-guard` (every compile and test run through the machine-wide build queue) is a base-pack project hook, not global. `new-project` is not global either: it is the kit command `claude-packs new`; a copy already in `~/.claude/skills/new-project` is left as it is. `global add` replaces the settings entries of the hand-installed Python forerunners (`~/.claude/hooks/shell-traps.py`, `gnu-shell.py`) with the Node hooks and leaves those files where they are; delete them by hand.

- **Skill `latest-versions`**: before Claude chooses, adds, pins or upgrades any dependency, tool, SDK, Action or base image, it fetches the current stable release from a primary source. It records the result in the project's `docs/versions.md`, one row per dependency: name, latest stable, date checked, source URL, version used and decision.
- **Hook `version-pin-guard`** (PreToolUse on Write/Edit/MultiEdit/Bash): it refuses a new or changed pin unless that dependency's row was checked within 14 days (`VERSION_GUARD_DAYS` overrides the 14).
  - It reads: `package.json`, CMake (`FetchContent_Declare`, `CPMAddPackage`, `ExternalProject_Add`), `requirements*.txt`, `pyproject.toml`, `Cargo.toml`, `go.mod`, Dockerfile `FROM`, and GitHub Actions `uses:`.
  - It also catches `npm/pnpm/yarn/bun add|install`, `pip/uv/poetry install|add`, `cargo add` and `go get`.
  - `node ~/.claude/hooks/claude-packs/version-pin-guard.mjs --selftest` proves it.

It never overwrites: an existing `~/.claude/skills/latest-versions/SKILL.md` that you wrote is kept, and the package copy goes beside it as `.pack-new`. Your `settings.json` keeps everything that isn't one of these three. A hook already there that is byte for byte the package's is taken over, and its settings entry is never doubled.

## Micro rules, skills and hooks harvested from MDD, mddkit and superpowers (0.2.0)

Each item does one job and loads only where its paths match.

| Kind | Name | From | What it does |
|---|---|---|---|
| hook | `file-size-guard` | mddkit (made blocking) | refuses an edit that would grow a source file past `layout.maxFileLines` (300); shrinking is always allowed |
| hook | `stage-guard` | MDD v1 bug | refuses `git add -A/./--all`, `commit -a`, and staging `.env`/keys (off in the Stellix profile: house git-guard) |
| hook | `git-guard` | Sub37 WB-3 (0.6.0) | refuses a git command that would write a token URL into git config (`push -u`, `remote add/set-url`, `clone`, `config`) |
| hook | `frozen-files` | mddkit test-freeze | refuses edits to files on `.claude/state/frozen.json` |
| tool | `freeze.mjs on "<why>" <globs>` / `off` | mddkit | freezes the test, golden renders and fingerprints that define "fixed" |
| tool | `test-verdict.mjs [--red a,b] [-R re] [-- cmd]` | mddkit mdd-test, MDD red gate | runs the tests and prints only the JSON verdict (exit 0 = as required, 1 = real failure, 2 = runner broken); full log in `.claude/state/last-test.log` |
| rule | `bug-fix-starts-red` | MDD, superpowers TDD | reproduce as a failing test first, freeze it, fix to green |
| rule | `debug-by-measurement` | superpowers, MDD ownership default | measure, one hypothesis, one change; stop after 3 failed fixes |
| rule | `done-means-fresh-evidence` | superpowers | no "done" without this turn's verdict; agent reports are claims |
| rule | `open-items-tagged` | mddkit | every open item is `[deferred]` or `[gap]` |
| rule | `skill-writing` | superpowers | one job, "Use when…" triggers, under 8,000 characters, mechanical = hook |
| rule | `subagent-dispatch` | superpowers SDD | name the model, pass files, four statuses, no self-review |
| rule | `control-reaches-every-surface` | mddkit entry surfaces | host, editor, patch, init, MIDI and undo, each proven |
| rule | `one-formula-per-value` | MDD data-flow | one mapping function shared by DSP and display |
| rule | `boundary-tests-cross-the-boundary` | mddkit | audio↔UI handoffs tested from both sides at once |
| skill | `trace-parameter` | MDD data-flow trace | host → snapshot → smoothing → DSP → sound, and → widget → text |
| skill | `prove-control` | mddkit | evidence table per surface of one control |
| skill | `pressure-test-skill` | superpowers writing-skills | runs a scenario without and with a skill, 3× each |

`doctor` now also fails a skill over 8,000 characters or whose description doesn't start with "Use when", and runs the new hooks' selftests.

## Working across projects (0.2.1)

You often roll a lesson out to many projects from one session. Nothing here may get in the way:

- **This project's hooks judge only this project's files.** Every hook checks `insideProject()` (`hooks/lib/project.mjs`) first, and Bash checks ignore commands that `cd`/`git -C` into another folder. `test/other-projects.test.mjs` fires every hook at edits in a sibling project and requires that none block.
- **Access to sibling projects.** `layout.siblings` (the Stellix profile sets `["../"]`) is merged into `permissions.additionalDirectories` in `.claude/settings.json`, so reading and editing `../sub37`, `../echofold`… needs no extra prompts. Claude Code applies it after you accept the folder's trust prompt once. Entries you add yourself are never removed.
- **Roll package updates out everywhere:** `npx claude-packs update-all ~/projects/*` updates and doctors every project that already has claude-packs, and skips the rest. Each project's own edits and `.pack-new` rules apply as usual.
- **What still applies everywhere, by design:** the global `version-pin-guard` (it reads the *target* project's own `docs/versions.md`), `stage-guard` (stage by name in any repo), and `git-guard` (a token is never stored in any repo's config; the house git laws, where switched on, hold in every repo a command reaches).
- **The other project's own laws** only run when the session is in that project. For real code work there, `/cd ../sub37` (Claude Code 2.1.246+ loads that project's hooks and rules) or open a session there; edits made from here skip its hooks.

## The firm structure: what goes where (0.3.0)

Rules fire by path, so the structure is what makes them fire. Three layers keep it firm:

1. **Stated, every turn.** `layout.json` has `kinds`: each kind of thing (audio entry, DSP block, engine, parameters, editor, bank, panel, GPU code, shader, tests, docs…) with the one folder it goes in. The CLAUDE.md "Project layout" block lists them as `<what> → <folder>`, inside `<constraints>`.
2. **Enforced, every write.** `folder-law` refuses a new source file outside the layout. `placement-law` refuses a kind in the wrong place: by file name (`*.wgsl`, `factory.csv`, `panel.json`, `*_test.cpp`) or by content an edit adds (`processBlock(`, `wgpu…(`, `paint(Graphics&)`). The message says where it goes and which rules load there.
3. **Proven, on demand.** `npx claude-packs doctor` notes rules that match no file and source files no rule covers; `doctor --strict` fails on either. Run it once the skeleton builds, and after any move.

A tailored project (the Stellix profile) carries its own `kinds`. Edit `kinds` and `folders` in `layout.json`, then `update`.

**New projects:** `claude-packs new <name>` lays the structure down before the first file and installs the kit; then `latest-versions` for every pin, `doctor`, and `doctor --strict` once it builds. For a synth unit, synthkit's `new_synth.py` makes the code tree first, and `claude-packs new` (or `init`) follows on it.

## Lessons from the Stellix build (0.4.0)

| Kind | Name | What it does | From |
|---|---|---|---|
| fix | every hook | judges a file against its own checkout (`checkoutRoot`), so worktree files are measured from the worktree, not the main checkout | Stellix WB-41, WB-55: folder-law refused every new file in an agent worktree, and agents routed new code into unrelated files |
| test | `worktrees.test.mjs` | folder-law and file-size-guard inside a real git worktree; fails on 0.3.0 | same |
| CLAUDE.md | constraints | a blocking hook is a red check: stop, report, fix the hook first; a refused command fails the step; never route around a block; cite anchors, never line numbers | WB-55, WB-60, the silent refused write, GUARD_OK |
| rule | `house-control-behaviours` | double click to default, fine drag, wheel, value readout, no focus, one undo step, in the shared piece | B-163 |
| rule | `ui-matches-reference-look` | analyse and gate the look (glow, surfaces, control parts, spacing, overlap, contrast), identical repeated components, the user's picture stop | B-161 |
| rule | `references-use-anchors` | cite `{#anchor}` or symbol names, never line numbers | 189 seed references moved by one spec line |
| skill | `new-panel-control` | the one procedure for adding a control | |
| skill | `analyse-reference-look` | measure a reference picture into numbers before building | B-161 |

The cross-project project guard Stellix carried (WB-64) is not in this package and never should be: README "Working across projects".

## Worktrees for every hook, and the Sub37 profile (0.5.0)

| Kind | Name | What changed |
|---|---|---|
| fix | `param-id-lock` | scans and locks the edited file's own checkout and skips `.claude/`, so a worktree's copy can no longer hide an id main dropped, and a worktree's new ids go into its own lock |
| fix | `lesson-checks` | reads checks and layout from the file's own checkout |
| fix | `spec-lock` | a shell command that writes a worktree's spec is refused like one that writes main's |
| fix | `no-shipped-images` | an image written into a worktree's code folders is refused |
| fix | `version-pin-guard` (global) | reads `docs/versions.md` from the checkout the pin is written in; `CLAUDE_PROJECT_DIR` is only the fallback. Run `npx claude-packs global add` to install it |
| fix | layout readers | a worktree with its own `layout.json` is judged by it, else by main's (`claudeRoot`) |
| test | `worktrees.test.mjs` | runs every installed hook in a real git worktree, and fails when a hook is added without a worktree case |
| test | `structure.test.mjs` | locks in the CLAUDE.md block rules, the control, look and anchor rules, and both skills |
| profile | `sub37` | `init audio-core --profile sub37`: the synthkit template's tree as it is (docs/project.md answer b). Flat `src/` is the app folder, `src/engine` the audio code, probes stay in `tools/`, `design/reference` is read-only |
| layout | `paramIds` | `{ "extensions", "patterns" }` tells `param-id-lock` where ids are written when they are not `ParameterID` literals. Sub37 reads its generated header and the binding ids in `panel/bindings.json`. Then run `node .claude/hooks/param-id-lock.mjs --init` once |
| fix | placement-law `editor` kind | matches the out-of-class form a .cpp uses (`void Panel::paint (juce::Graphics& g)`) as well as `void paint (...)`. An install whose layout.json holds the old pack pattern gets the new one on `update`; a pattern the project wrote is kept |

## 0.7.0: the two 0.6.0 lines, merged

Two sessions each released a 0.6.0 (CHANGELOG.md has both). 0.7.0 is their merge: Sub37's first-install fixes (below,
"Fixes from Sub37's first install") and the house tooling from Stellix (this section). Every kit hook is Node now, one
`git-guard.mjs` holds both lines' git laws, and `claude-packs new <name>` scaffolds a project. One session changes the kit
at a time: the repo's own `.claude/hooks/kit-lock.mjs` refuses writes while another session's `.claude-packs-lock` is there.

## The house hooks, skills and rules move into the kit (0.6.0, this branch's line)

claude-packs is the source of truth for every rule, check, hook and skill used to build synths (Tim, 2026-10-31). What
Stellix carried by hand that is not about Stellix alone now ships here, each made project-neutral. A project's own values
go in `layout.json` under `"guards"`; every key has a house default.

| Kind | Name | Pack | What it does | Project values (`guards.<name>`) |
|---|---|---|---|---|
| hook | `git-guard.mjs` | base | main's token law always (no token stored in git config, Sub37 WB-3); with `house: true` the house git laws: no `add -A`/`commit -a`, no undo over a dirty tree, no rebase/amend/force/`--no-verify`/branch delete, a push names the owner's repo and the token variable, every `gh` names the token, no token pasted, nothing under `~/firmware` staged; the trunk refusal (no commit on main/master) only when `refuseTrunk` is true | `git`: `house` (false), `owner` (TheDecipherist), `tokenVar` (PERSONAL_GITHUB_TOKEN), `trunks`, `refuseTrunk` (false), `neverStage`, `safeRestore`, `branchStart`, `accountNote` |
| hook | `build-guard.mjs` | base | every compile and test run through the machine-wide build queue (`buildq` or the project's wrapper); no polling loops; agents build only what their change needs | – |
| hook | `time-guard.mjs` | base | tells the caller when a call, a build, a ctest, a probe, a panel export, a headless Chrome or a wait loop runs long, or an agent's worktree goes unsaved; refuses a pgrep wait loop that can never end (a heredoc body is text, not a loop) | `time`: `probePattern`, `saveCommand` |
| hook | `tims-asks.mjs` | base, **opt-in** | after a compaction, Tim's asks of the last day back in the context, with a ledger of which are done (beside the project's own memory folder) | – |
| hook | `idle-wake.mjs` | base, **opt-in** | after 15 minutes of silence, wakes the session with its open asks (Stop, asyncRewake) | – |
| hook | `build-sweep.mjs` | base, **opt-in** | removes the build output (layout `buildOutput`, default `build/**`) of agent worktrees quiet for 2 hours; never sources, never the main checkout's build; warns at session start under 40 GB free (SessionStart, SubagentStop; `--now [--dry-run]` by hand) | – |
| hook | `shape-law.mjs` | base | the number rule at write time, every folder: an instance of a MANY concept is an example, a selector or a declared constant from design/shape.json | `shape scan` |
| hook | `brief-guard.mjs` | base | a brief, spec or recipe names an instance only on a `seen in:` / `example:` line (Agent prompts, docs/, inbox/) | – |
| hook | `once-only.mjs` | base | refuses a near-duplicate of code already in the repo (jscpd), naming where it lives | `dup scan` |
| hook | `making.mjs` | base | at each prompt: what are you making, each concept's shape; echoes an instance the prompt named | – |
| hook | `making-check.mjs` | base | at each stop: the making line matches what was written, every concept has a row, overrides cite a law | – |
| tool | `shape-symmetry.mjs` | base | the generated gate: every instance the same members, every pair swaps the same | `symmetry gen`, `symmetry run` |
| hook | `protect-vendor.mjs` | base | **merged with Stellix's copy-tree-guard**: a folder of `"kind": "copy"` is read-only like vendored code; only git and the sanctioned copy tools get through | `copy`: `tools` |
| hook | `browser-guard.py` | gpu-painter | a natively drawn app never starts a browser; judges writes only inside its own project. The one Python hook left: its Node port waits until Stellix runs 0.7.0, because Stellix's installed browser-guard refuses writing a file that holds its selftest's planted launch samples (probed: exit 2 on `browser-guard.mjs`; it exempts only `browser-guard.py`) | `browser`: `pictureCommand` |
| hook | `no-shipped-images.mjs` | stellix | its scope is now the project's | `images`: `guarded`, `allowed` |
| hook | `file-size-guard.mjs` | base | also counts shell scripts, CMake and GLSL (Stellix's source rule did) | `maxFileLines` |
| check | `no-opengl`, `no-opengl-link` | gpu-painter | no GL call, header, JUCE OpenGL module or framework link | – |
| check | `no-code-after-midline-comment` | base | a `//` mid-line that swallows the statements after it (Stellix WB-25) | – |
| check | `one-seeded-random` | stellix | now also catches `mt19937` without `std::`, the distributions, `Random` objects, `SecRandomCopyBytes`, `RAND_bytes` | – |
| rule | `hooks-and-gates`, `plan-and-logs`, `copy-trees-read-only` | base | selftests run from plants, faults logged first; the plan and logs never rewritten; copy trees by kind | – |
| skill | `build-step` (base), `copy-and-prove` (audio-core) | | one step on its own branch; copy, prove identical, then change | – |

### Nothing new switches on unless the project chose it

- `init` and `add` bring every hook and check of the packs named, except the opt-in ones (`tims-asks`, `idle-wake`, `build-sweep`).
- `update` brings a hook or check that is NEW to the project (not in its lock, not on disk, not run by its `settings.json`) only when `.claude/layout.json` `"enable"` names it, e.g. `"enable": ["hooks/git-guard.mjs", "hooks/tims-asks.mjs", "checks/no-opengl.json"]`. What the project already had stays on (a Node hook counts as had when the project ran its Python forerunner, e.g. `git-guard.py`).
- `update` prints both lists before it changes anything: `switching on (new to this project): …` and `held back, not switched on: …`.
- git-guard's trunk refusal is a setting, `"guards": { "git": { "refuseTrunk": true } }`, off by default.

### Every write guard covers every route (WB-69)

A guard that refuses a write refuses it by every tool that can write: Write, Edit, MultiEdit, NotebookEdit, and the shell
(`>`, `>>`, `tee`, `sed -i`, `cp`, `mv`, `rm`, a heredoc into a file, …). They all judge `hooks/lib/writes.mjs`, which reads
the shell through `hooks/lib/shell-writes.mjs` (a `sed -i` is run for real on a copy, in GNU sed's `--sandbox`, so its result
is exact). This covers folder-law, placement-law, protect-vendor (vendored code and copy trees), frozen-files, spec-lock,
file-size-guard, lesson-checks, realtime-guard, no-shipped-images, param-id-lock, browser-guard and, globally,
version-pin-guard. `test/routes.test.mjs` tries every route against each one. One consequence: a shell redirect into a
read-only path is refused like a tool write (`> build/log.txt` in a project whose `build/` is vendored output).

### Upgrade notes

- **A project whose history is on main** (Sub37 today) takes none of the house git laws until it works on branches.
  The order: first move to the house branch flow (`tools/step.py` or the kit's `build-step` skill, a `work/` branch per step),
  then enable git-guard (`"enable": ["hooks/git-guard.mjs"]` if it does not have it), its house laws and the trunk refusal
  (`"guards": { "git": { "house": true, "refuseTrunk": true } }`). Until then git-guard does only the token law it had.
- A project that carried these hooks by hand: delete its own copies first, or name them in `"enable"`. An identical copy is
  taken over; a different one gets the package's version beside it as `.pack-new`.
- Settings entries for `copy-tree-guard.py` (merged into protect-vendor), `shell-traps` and `gnu-shell` (global by design),
  and the Python forerunners `git-guard.py`, `build-guard.py`, `time-guard.py`, `tims-asks.py`, `idle-wake.py` (Node now)
  are retired from a project's `settings.json`, and `update` says so.
- A settings entry that runs a script some pack ships is the package's; every other entry is the project's own and stays.
- A concept entry `"kind:copy"` expands to every folder of that kind.
- **Fixes:** `version-pin-guard` no longer reads `2>&1` (or any redirection) as a package, and takes an Edit's `new_string`
  literally; `update` takes over an installed file that is byte for byte the pack's version (a taken `.pack-new`, a
  project's identical hand copy) and records it in the lock instead of writing `.pack-new` again; `doctor --strict` skips
  git-ignored files (build output such as `out/**`) and counts the project's `.claude/` files for rules that fire there;
  `doctor` runs every hook's selftest.

## Fixes from Sub37's first install (0.6.0, main's line)

Sub37's `workflow-bugs.md` WB-1 to WB-4. Each has a test in `test/sub37-wb.test.mjs` that was seen failing before the fix.

| # | Kind | Name | What changed |
|---|---|---|---|
| WB-2 | fix | `checkoutRoot` | a file's checkout is the project itself, or a git worktree of it (a `.git` *file* whose gitdir lies in this repo's `worktrees/`). Any other nested `.git` (FetchContent's `build/_deps/juce-src`, a vendored repo, a submodule) is part of the project, so `protect-vendor` refuses edits inside it again |
| WB-1 | fix | coverage | walks `.claude/skills`, `.claude/rules` and `.claude/agents` (also nested ones), so rules on the `claude` concept no longer look dead in `doctor --strict`. Worktrees, hooks and state under `.claude/` stay out |
| WB-3 | hook | `git-guard` | refuses a git command that would store a token URL in git config: `push -u`/`--set-upstream` to a URL with `user:secret@`, `$VAR@` or a bare token, `remote add`/`set-url`, `clone`, `submodule`, `config`. Pushing to a token URL without `-u` stores nothing and is allowed. It judges every git call, in any folder. The refusal masks the token |
| WB-3 | doctor | token sweep | reads `.git/config` of the project, every nested repo (four levels down) and every repo in `layout.siblings`, and fails on a URL carrying a secret or a bare GitHub token. It names the key and masks the token |
| WB-4 | selftests | every hook | `folder-law`, `frozen-files`, `protect-vendor`, `spec-lock`, `realtime-guard`, `param-id-lock` and `no-shipped-images` gained `--selftest`. Each builds a throwaway project (`hooks/lib/selftest.mjs`) and runs the hook as Claude Code does, so nobody probes a hook by pasting a payload into a shell command. `doctor` runs every hook's selftest, in parallel, and notes a hook without one |
| | test | `npm test` | each test process gets its own empty temp folder (`test/fresh-tmp.mjs`), so doctor's sibling sweep never reads the system temp folder |

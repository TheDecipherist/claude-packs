# @thedecipherist/claude-packs

Per-project Claude Code rules, lesson checks, hooks and skills for The Decipherist's JUCE synths. Everything installs into the project's own `.claude/` (and nested skill folders). Nothing ever goes into `~/.claude`.

## Packs

| Pack | For | Rules | Checks | Hooks | Skills |
|---|---|---|---|---|---|
| `base` | every project (always installed) | – | – | lesson-checks, folder-law, spec-lock, protect-vendor | add-lesson-check |
| `audio-core` | any JUCE synth or effect | 35 | 8 | realtime-guard, param-id-lock | juce-realtime-audit, measure-tone (+ tone-report tool, `.clang-tidy`) |
| `gpu-painter` | GPU-drawn UI on Dawn (Metal / D3D12) | 14 | 4 | – | gpu-frame-bench, gpu-golden-check, gpu-golden-update, gpu-lifecycle-stress, gpu-capture |
| `stellix` | the Stellix spec laws | 5 | 5 | no-shipped-images | – |

Tabula: `init audio-core`. Stellix: `init audio-core gpu-painter stellix`.

## Commands

```
npx claude-packs init <pack...>     install packs, create the layout folders
npx claude-packs add <pack...>      add packs
npx claude-packs remove <pack...>   remove packs (files you edited are kept)
npx claude-packs update             re-sync installed packs from this version
npx claude-packs doctor             verify paths, folders, hooks, checks
npx claude-packs survey             print the prompt that writes docs/project.md
npx claude-packs list               show the packs
```

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
`npm i -D ./thedecipherist-claude-packs-0.4.0.tgz`, then `npx claude-packs init …`. Needs Node 22+. `npm test` runs the end-to-end tests.

## The one global piece: latest-versions

```
npx claude-packs global add      # ~/.claude/skills/latest-versions + hooks/claude-packs/version-pin-guard.mjs
npx claude-packs global doctor
npx claude-packs global remove   # removes only what it installed and you did not edit
```

Everything else in this package is per project. This is the exception, because "look up the newest release before you pin anything" applies to every project, including new ones that have no packs yet.

- **Skill `latest-versions`**: before Claude chooses, adds, pins or upgrades any dependency, tool, SDK, Action or base image, it fetches the current stable release from a primary source. It records the result in the project's `docs/versions.md`, one row per dependency: name, latest stable, date checked, source URL, version used and decision.
- **Hook `version-pin-guard`** (PreToolUse on Write/Edit/MultiEdit/Bash): it refuses a new or changed pin unless that dependency's row was checked within 14 days (`VERSION_GUARD_DAYS` overrides the 14).
  - It reads: `package.json`, CMake (`FetchContent_Declare`, `CPMAddPackage`, `ExternalProject_Add`), `requirements*.txt`, `pyproject.toml`, `Cargo.toml`, `go.mod`, Dockerfile `FROM`, and GitHub Actions `uses:`.
  - It also catches `npm/pnpm/yarn/bun add|install`, `pip/uv/poetry install|add`, `cargo add` and `go get`.
  - `node ~/.claude/hooks/claude-packs/version-pin-guard.mjs --selftest` proves it.

It never overwrites: an existing `~/.claude/skills/latest-versions/SKILL.md` that you wrote is kept, and the package copy goes beside it as `.pack-new`. Your `settings.json` keeps everything that isn't this hook.

## Micro rules, skills and hooks harvested from MDD, mddkit and superpowers (0.2.0)

Each item does one job and loads only where its paths match.

| Kind | Name | From | What it does |
|---|---|---|---|
| hook | `file-size-guard` | mddkit (made blocking) | refuses an edit that would grow a source file past `layout.maxFileLines` (300); shrinking is always allowed |
| hook | `stage-guard` | MDD v1 bug | refuses `git add -A/./--all`, `commit -a`, and staging `.env`/keys (off in the Stellix profile: house git-guard) |
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
- **Access to sibling projects.** `layout.siblings` (the Stellix profile sets `["../"]`) is merged into `permissions.additionalDirectories` in `.claude/settings.json`, so reading and editing `../tabula`, `../echofold`… needs no extra prompts. Claude Code applies it after you accept the folder's trust prompt once. Entries you add yourself are never removed.
- **Roll package updates out everywhere:** `npx claude-packs update-all ~/projects/*` updates and doctors every project that already has claude-packs, and skips the rest. Each project's own edits and `.pack-new` rules apply as usual.
- **What still applies everywhere, by design:** the global `version-pin-guard` (it reads the *target* project's own `docs/versions.md`), and `stage-guard` (stage by name in any repo).
- **The other project's own laws** only run when the session is in that project. For real code work there, `/cd ../tabula` (Claude Code 2.1.246+ loads that project's hooks and rules) or open a session there; edits made from here skip its hooks.

## The firm structure: what goes where (0.3.0)

Rules fire by path, so the structure is what makes them fire. Three layers keep it firm:

1. **Stated, every turn.** `layout.json` has `kinds`: each kind of thing (audio entry, DSP block, engine, parameters, editor, bank, panel, GPU code, shader, tests, docs…) with the one folder it goes in. The CLAUDE.md "Project layout" block lists them as `<what> → <folder>`, inside `<constraints>`.
2. **Enforced, every write.** `folder-law` refuses a new source file outside the layout. `placement-law` refuses a kind in the wrong place: by file name (`*.wgsl`, `factory.csv`, `panel.json`, `*_test.cpp`) or by content an edit adds (`processBlock(`, `wgpu…(`, `paint(Graphics&)`). The message says where it goes and which rules load there.
3. **Proven, on demand.** `npx claude-packs doctor` notes rules that match no file and source files no rule covers; `doctor --strict` fails on either. Run it once the skeleton builds, and after any move.

A tailored project (the Stellix profile) carries its own `kinds`. Edit `kinds` and `folders` in `layout.json`, then `update`.

**New projects:** the global `new-project` skill (installed by `claude-packs global add`) lays the structure down before the first file: synthkit's `new_synth.py` for a unit, then `claude-packs init`, `latest-versions`, `doctor`, and `doctor --strict` once it builds.

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

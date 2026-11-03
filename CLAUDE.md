# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`@thedecipherist/claude-packs` ("the kit"): an npm CLI (Node 22+, ESM) that installs per-project Claude Code rules, lesson checks, hooks and skills into a *target* project's own `.claude/` (JUCE synths: realtime audio, DSP, Dawn GPU painter, Stellix). It is the source of truth for every law used to build synths: a fix to a hook, rule, check or skill that every synth uses is made here, with its test, and projects take it with `npx --no-install @thedecipherist/claude-packs update`. Nothing goes into `~/.claude` except `global add`, which installs exactly three pieces (latest-versions + `version-pin-guard`, `gnu-shell`, `shell-traps`).

## Commands

```
npm test                       # the full suite and the release gate. Always via npm: it preloads test/fresh-tmp.mjs
npm run test:changed           # only the tests covering files changed since the base (prints why each was picked)
node scripts/test-changed.mjs --dry-run [--base <ref>]
node --import ./test/fresh-tmp.mjs --test test/shape.test.mjs                     # one file
node --import ./test/fresh-tmp.mjs --test --test-name-pattern "<name>" test/*.test.mjs   # one test
node packs/base/hooks/<hook>.mjs --selftest   # every hook has one; doctor runs them all
node bin/claude-packs.mjs init audio-core --dir <scratch>   # try an install; then `doctor --dir <scratch> [--strict]`
node bin/claude-packs.mjs lock status|release [--force]      # the kit lock (below)
```

Never run `node --test` without the `fresh-tmp.mjs` preload: tests then share the system temp folder and fail at random (KWB-2). There is no build or lint step. Run `npm install` first: `jscpd` (an optional dependency, the `once-only` hook's detector) must be in `node_modules`, or every test that installs packs fails at doctor's `once-only`/`making-check` selftests.

## Architecture

**Installer** (`bin/claude-packs.mjs` → `lib/`). `lib/sync.mjs` runs an install: validate `settings.json` → back up → `buildLayout` (`layout.mjs`) → decide what switches on (`switches.mjs`) → copy pack files (`packs.mjs`) → remove dropped files → merge hooks into settings (`settings.mjs`) → regenerate rule `paths:` (`rules.mjs`) → write the CLAUDE.md block (`claude-md.mjs`) → write the lock (`manifest.mjs`). `doctor.mjs` verifies an install (selftests, coverage, hook timing, token sweep). `new.mjs` scaffolds a project; `shape-cli.mjs`, `symmetry-doctor.mjs`, `once-only-report.mjs` back the `shape`, `symmetry` and `dup` commands.

**Packs** (`packs/{base,audio-core,gpu-painter,stellix}/`): content copied into target projects. `pack.json` declares `folders`, `concepts`, `kinds`, `hooks` (merged into settings), `optIn` and `skillsIn`. `rules/`, `checks/`, `hooks/`, `tools/` go to `.claude/`; skills go to `.claude/skills/` or a layout folder's nested `.claude/skills/`.

**Hooks run inside the target project**, so they import only from `packs/base/hooks/lib/`, never from `lib/`. Shared logic the CLI also needs lives in the hooks lib and `lib/` re-exports it (e.g. `lib/shape.mjs`). Key hook libs:
- `project.mjs`: `insideProject()` (never judge a sibling project's files; `commandLeavesProject` for `cd`/`git -C`), `checkoutRoot()`/`claudeRoot()` (judge a file from its own checkout and that checkout's `layout.json`, because agents work in git worktrees under `.claude/worktrees/` while `CLAUDE_PROJECT_DIR` points at main).
- `writes.mjs` + `shell-writes.mjs` + `program-writes.mjs`: `writesOf(payload)` returns every file a tool call writes by any route (Write, Edit, MultiEdit, NotebookEdit, shell redirects, `sed -i`, `cp`/`mv`, heredocs, inline python/node/perl programs). A write guard judges these, so it covers every route at once (`test/routes.test.mjs`).
- `hook-log.mjs`: each hook does `export const hook = main` and ends with `if (isMain(import.meta.url)) process.exit(--selftest ? selftest() : await asHook('<name>', main))`. `settings.json` runs all node hooks of one entry in one process via `run-hooks.mjs`, which calls each `hook(text)` and logs timing to `.claude/hooks.log`. `doctor` fails a hook whose median is over 500 ms.
- `selftest.mjs`: `scratchProject`, `runHook`, `verdicts`: a selftest builds a throwaway project and runs the hook through the runner, as Claude Code would. Prove hooks this way, never by pasting payloads into a shell command.

**`.claude/layout.json` (in the target) is the single source of truth.** `folders` name paths; `concepts` map to folder names or globs; `kinds` say what goes where (CLAUDE.md block + `placement-law`). Rules declare `# concepts:` in frontmatter and get `paths:` generated. Keys the project owns (`files`, `protected`, `writeOnce`, `disable`, `enable`, `commands`, `siblings`, `guards`, `maxFileLines`, `paramIds`, …) survive every update. `"complete": true` layouts (`profiles/*.layout.json`, via `--profile`) get no default pack folders.

**What switches on** (`lib/switches.mjs`): `init`/`add` bring a pack's hooks and checks except its `optIn` ones. `update` brings a hook or check *new* to the project only if `layout.json` `"enable"` names it. Never make a new law silently switch on in existing projects.

**Never-overwrite contract:** the lock stores a hash per managed file. A user's same-named or edited file is kept and the pack version goes beside it as `<file>.pack-new`. Only the kit's own hooks are rebuilt in `settings.json`, and only the `<!-- claude-packs:start/end -->` block in a project's CLAUDE.md is written.

**The shape law** (`hooks/lib/shape.mjs`, `shape-law`, `brief-guard`, `making`, `making-check`, `once-only`, `tools/shape-symmetry.mjs`): a project's `design/shape.json` declares each concept as one or many. Code, docs and briefs may name an instance of a "many" concept only as an example, a selector or a declared constant, never as a bare literal (origin: KWB-1, "slot 2").

## Invariants the tests hold

- `test/worktrees.test.mjs`: every installed hook has a `CASES` entry proving it judges a worktree file by the worktree. A new hook without one fails the suite.
- `test/file-size.test.mjs`: every installed `.mjs`/`.py`/`.sh` stays within 300 lines (projects' own `file-size-guard` refuses longer). Split before you pass it.
- `test/other-projects.test.mjs`: no hook blocks an edit in a sibling project.
- `doctor`: a skill's `description:` starts with "Use when" and the skill is under 8,000 characters; every lesson check's `bad` is caught and its `good` passes.

## Authoring pack content

- **Rule:** frontmatter `# concepts: a, b` + `paths:` (generated), a one-line `#` title stating the law, body in `<constraints>` with `Always do:` / `Never do:`.
- **Lesson check** (`checks/*.json`): `id`, `why`, `rule`, `globs`/`concepts`, `exclude`, `pattern`, optional `code: true` (comments/strings blanked), `bad`, `good`. It blocks only edits that *add* a match.
- **Hook:** register in `pack.json` (and `optIn` if it should not switch on by default), judge writes via `writesOf`, check `insideProject` and `checkoutRoot`/`claudeRoot`, exit 2 with the reason on stderr to refuse, export `hook`, add a `--selftest` that plants the fault and the correct case, and add its worktree case. A hook's selftest must be seen red without the fix.
- Cite `{#anchor}`s or symbol names in docs and rules, never line numbers.

## Working on the kit itself

- **Kit lock:** one session changes the kit at a time. `.claude/hooks/kit-lock.mjs` (this repo's only registered hook, not part of any pack) takes `.claude-packs-lock` on a session's first write and refuses writes while another live session holds it in any checkout. The lock is committed on the work branch, and the release merge removes it.
- **Branches:** work goes on `work/<version>-<topic>` branches started from the *fetched* `origin/main`, pushed from the first commit. A release fast-forwards both local and remote `main` (KWB-11, KWB-26).
- **Workflow faults:** log a fault in a hook, tool or test run in `workflow-bugs.md` (`KWB-n`, with a timestamp) *before* fixing it, and close it with cause, fix and the test that catches it. Tests and code comments cite the KWB/WB ids they lock in.
- **Release:** bump `package.json`, add a `CHANGELOG.md` entry (and a README section for user-facing changes), and gate it with the full `npm test`.
- **Pins:** a dependency added or pinned needs a fresh row in `docs/versions.md` (the global `version-pin-guard` enforces this).

<!-- claude-packs:start -->
<!-- Generated by claude-packs from .claude/layout.json. Edit that file and run `npx --no-install @thedecipherist/claude-packs update`; edits here are replaced. -->
## Project layout

<constraints>
Always do:
- Put every kind of thing in its one place. The rules, checks and skills for it load only there:
  - the kit's tests → `test/`
  - versions and notes → `docs/`
- The other folders:
  - `bin/`: the claude-packs command (bin/claude-packs.mjs)
  - `global/`: the global part: latest-versions, gnu-shell, shell-traps (global add)
  - `lib/`: the command's library: sync, settings, layout, doctor, the kit lock
  - `packs/`: the packs a project installs: rules, checks, hooks, skills, tools (base, audio-core, gpu-painter, stellix)
  - `profiles/`: tailored seed layouts shipped in the package (stellix, sub37)
  - `prompts/`: prompts the command prints (survey.md)
  - `scripts/`: the kit's own development scripts (test-changed.mjs); never shipped
- Ask the user before inventing a new folder. A new folder goes into `.claude/layout.json` first.
- When a hook, check or guard blocks work that is correct, stop and report its exact message. A blocking hook is a red check: fix the hook first, with a selftest, then continue.
- When a command is refused or fails, the step fails loudly. Never report a refused write or a failed command as done.
- claude-packs (`~/projects/claude-packs`) is the source of truth for every rule, check, hook and skill used to build synths. A fix to one of them, or a lesson that should hold in every synth, is made there with its test, committed, pushed and released as a new version, then taken in with `npx --no-install @thedecipherist/claude-packs update`, so every synth gets it. A project edits its installed copy only to try a fix before it goes into the kit.

Never do:
- Create source files outside these folders, or put a kind of thing anywhere but its place. The folder-law and placement-law hooks refuse both.
- Put drawing code in audio or world folders, or audio and world logic in the painter or UI folders.
- Edit files in `.claude/rules`, `.claude/checks` or `.claude/hooks` to get past a block. Fix the code, or ask the user to change the law.
- Route around a block: no override variables, no writing through the shell after a refusal, no parking files in a scratchpad, no putting new code into an unrelated existing file.
- Point at a document by line number. Cite a fixed anchor (`{#id}`) or a symbol name; lines move.
</constraints>

## Project commands

Skills and checks run these; use them, not the raw tools:
- test: `npm test`
- test-one: `node --import ./test/fresh-tmp.mjs --test test/<name>.test.mjs`
- test-changed: `npm run test:changed`
- doctor: `node bin/claude-packs.mjs doctor --strict`

Installed packs: base.
<!-- claude-packs:end -->

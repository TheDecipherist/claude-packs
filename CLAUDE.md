# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`@thedecipherist/claude-packs` ("the kit"): an npm CLI (Node 22+, ESM) that installs per-project Claude Code rules, lesson checks, hooks and skills into a *target* project's own `.claude/`, for any project. It holds code to what a senior engineer would accept, and stops repetition before it is written. A project is one configuration (`base`, `cpp`, `go`, `node`, `python`, `rust`, `full-stack`, `synth-creator`) plus the packs its code needs: `suggest` reads them from the project, `init --auto` installs them, `scan` finds what is already wrong on a copy, and `fix` makes that a work order. The kit is the source of truth for every law: a fix to a hook, rule, check or skill is made here, with its test, and projects take it with `npx --no-install @thedecipherist/claude-packs update`. Nothing goes into `~/.claude` except `global add`, which installs exactly three pieces (latest-versions + `version-pin-guard`, `gnu-shell`, `shell-traps`).

The kit is for everyone: no file names one person (`test/no-personal-name.test.mjs`). Write "the user", or "the author" in the writing pack, and they/them. State a reason itself, never who asked for it.

## Commands

```
npm test                       # the full suite: only when the user asks for a full run (suite-once refuses it otherwise). Always via npm: it builds, then preloads test/fresh-tmp.mts
npm run test:changed           # while working: the tests covering files changed since the base (prints why each was picked); with -- --base origin/main, the gate before landing and before a release
node scripts/test-changed.mjs --dry-run [--base <ref>]
node --import ./test/fresh-tmp.mts --test test/shape.test.mjs                     # one file
node --import ./test/fresh-tmp.mts --test --test-name-pattern "<name>" test/*.test.mjs   # one test
node packs/base/hooks/<hook>.mjs --selftest   # every hook has one; doctor runs them all
node bin/claude-packs.mjs init audio-core --dir <scratch>   # try an install; then `doctor --dir <scratch> [--strict]`
node bin/claude-packs.mjs suggest|scan|fix --dir <project>  # what it needs; what is wrong, on a copy; the work order
node bin/claude-packs.mjs lock status|release [--force]      # the kit lock (below)
```

Never run `node --test` without the `fresh-tmp.mts` preload: tests then share the system temp folder and fail at random (KWB-2). Sources are TypeScript (`.mts`); `npm run build` emits the `.mjs` beside them (ignored by git), and `npm run check` type-checks the kit and its tests. Run `npm install` first: `jscpd` (an optional dependency, the `once-only` hook's detector) must be in `node_modules`, or every test that installs packs fails at doctor's `once-only`/`making-check` selftests.

## Architecture

**Installer** (`bin/claude-packs.mjs` → `lib/`). `lib/sync.mjs` runs an install: resolve the configuration → validate `settings.json` → back up → `buildLayout` (`layout.mjs`) → decide what switches on (`switches.mjs`) → copy pack files (`packs.mjs`) → remove dropped files → merge hooks into settings (`settings.mjs`) → regenerate rule `paths:` (`rules.mjs`) → write the CLAUDE.md block (`claude-md.mjs`) → write the lock (`manifest.mjs`). `doctor.mjs` verifies an install (selftests, coverage, hook timing, token sweep, hover and page gates, hook-proof); a passed selftest is remembered by hash until the hook changes (`selftest-cache.mjs`, `--fresh` runs them all). `new.mjs` scaffolds a project; `shape-cli.mjs`, `symmetry-doctor.mjs`, `once-only-report.mjs` back the `shape`, `symmetry` and `dup` commands; `custom-packs.mjs` backs `new-pack` and `add --from`.

**Before an install** (`lib/scan.mjs`, `scan-detect.mjs`, `suggest.mjs`, `repeats.mjs`, `fix-plan.mjs`): `recommend` in `scan-detect.mjs` picks the configuration (the language most files are in) and one row per pack says what evidence recommends it. `suggest` prints that, and `init --auto` installs it. `scan` copies the project to a temp folder, installs there, runs every check and writes a report and `claude-packs-scan.json` beside the copy, so the project is never written to. `repeats.mjs` lists copies, near copies and functions made again, and `repo-weight.mjs` what the repo carries that is not source. `fix` turns the last scan into `.claude/fix-plan.md`, in the order to work it.

**Configurations** (`configurations/<name>/config.json`, `lib/configs.mjs`, `lib/config-cli.mjs`): a kind of project as data: its packs (`always`, `choose`, `default`), its layout template, `hookOrder` (the order of its hooks per settings entry), `sourceFiles` (what doctor's coverage counts as source) and the `preamble` of the CLAUDE.md block. `layout.json` `"configuration"` names a project's; `update` applies it; an install that names none gets, in order, the configuration with a chosen pack by default, the one with no folder layout of its own, the smallest (`inferConfig`). A configuration's own packs (its `always` list: `synth-creator`; `full-stack` with `http-api`, `fastify`, `zod`, `docker`; `writing` and `hook-proof` in every one) come with it and are never written in the lock's `packs`. A configuration is a composition: what holds for any project goes in a pack anyone can take, and a pack named for a configuration holds only that choice. base holds only universal engineering; `test/base-neutral.test.mjs` refuses a synth word in it.

**Packs** (`packs/*/`; `bin/claude-packs.mjs list` shows them and the presets): content copied into target projects. Languages: `cpp`, `js-ts`, `python`, `shell`, `go`, `rust`. Stacks: `http-api`, `fastify`, `zod`, `dynamic-data`, `content-site`, `react`, `web`, `html-ui`, `mongo`, `postgres`, `docker`, `nginx`, `ci`, `websocket`, `multi-tenant`, `host-agent`, `ai`, `stored-text`, `ui-craft`, `tui`, `shell-hooks`. Synths: `audio-core`, `gpu-painter`, `stellix`, `reverse-engineering`, `midi`, `sound-design`, `instrument-shell`. `pack.json` is a manifest like a `package.json` (`version`, `type` stock or custom, `author`, `license`, `repository`, `engines`; `lib/pack-manifest.mjs` checks it) and declares `folders`, `concepts`, `kinds`, `hooks` (merged into settings), `optIn` and `skillsIn`. `rules/`, `checks/`, `hooks/`, `tools/` go to `.claude/`; skills go to `.claude/skills/` or a layout folder's nested `.claude/skills/`.

**Hooks run inside the target project**, so they import only from `packs/base/hooks/lib/`, never from `lib/`. Shared logic the CLI also needs lives in the hooks lib and `lib/` re-exports it (e.g. `lib/shape.mjs`). Key hook libs:
- `project.mjs`: `insideProject()` (never judge a sibling project's files; `commandLeavesProject` for `cd`/`git -C`), `checkoutRoot()`/`claudeRoot()` (judge a file from its own checkout and that checkout's `layout.json`, because agents work in git worktrees under `.claude/worktrees/` while `CLAUDE_PROJECT_DIR` points at main).
- `writes.mjs` + `shell-writes.mjs` + `program-writes.mjs`: `writesOf(payload)` returns every file a tool call writes by any route (Write, Edit, MultiEdit, NotebookEdit, shell redirects, `sed -i`, `cp`/`mv`, heredocs, inline python/node/perl programs). A write guard judges these, so it covers every route at once (`test/routes.test.mjs`).
- `languages.mjs`: one row per language (how to blank comments and strings, where a statement ends, what is not code, how a function is defined). `languageOf(ext)`; a new language is one row, with a sample in `test/every-language.test.mjs`.
- `code-shapes.mjs`, `elements.mjs`, `near-copies.mjs`, `function-shapes.mjs`, `repo-index.mjs`: the repetition reader. Statements and markup with names, numbers and strings stripped become shapes (`setup`, `run`, `rows`, `markup`); `parametersOf` says what differs between two copies; `nearCopy` finds a stretch that matches in order with lines changed; `repoIndex` keeps each file's shapes, statements and definitions in the temp folder, read again only for what moved. `template-law` judges a write against it, `reuse-hint` reads it at the prompt, `code-shape` uses `functionsOf`.
- `content.mjs`: `isContent(rel, layout)`. A folder of published text holds samples, never the project's code: code laws skip it, writing laws (`prose` checks) read it, and `scan` and `suggest` list it apart. Under a code root (`src/`, `app/`, ...) the same word is code.
- `git-adds.mjs`: the `git add` calls in a command, for `secrets-guard` and `repo-litter`.
- `event-log.mjs`, `hook-log.mjs`: logs are never cleared. `appendRotated` moves a full log to `.claude/logs/`. `logCall` records every call in `events.jsonl`, every crash in `crashes.jsonl` and every refusal in `refusals.jsonl` with its reason, so `lib/logs.mjs` can judge hooks on evidence. `secret-patterns.mjs` masks what is logged.
- `crash-policy.mjs`, `unread-writes.mjs`: what the runner does when a hook crashes (refuse a tool call once, say so, log it in `crashes.jsonl`), and when no hook could read what an inline program wrote to source.
- `hook-log.mjs`: each hook does `export const hook = main` and ends with `if (isMain(import.meta.url)) process.exit(--selftest ? selftest() : await asHook('<name>', main))`. `settings.json` runs all node hooks of one entry in one process via `run-hooks.mjs`, which calls each `hook(text)` and logs timing to `.claude/hooks.log`. `doctor` fails a hook whose median is over 500 ms.
- `selftest.mjs`: `scratchProject`, `runHook`, `verdicts`: a selftest builds a throwaway project and runs the hook through the runner, as Claude Code would. Prove hooks this way, never by pasting payloads into a shell command.

**`.claude/layout.json` (in the target) is the single source of truth.** `folders` name paths; `concepts` map to folder names or globs; `kinds` say what goes where (CLAUDE.md block + `placement-law`). Rules declare `# concepts:` in frontmatter and get `paths:` generated. Keys the project owns (`files`, `protected`, `writeOnce`, `disable`, `enable`, `commands`, `siblings`, `guards`, `maxFileLines`, `paramIds`, …) survive every update. `"complete": true` layouts (a seed file given to `--layout` or `--profile`; the tests' two are in `test/fixtures/profiles/`) get no default pack folders.

**What switches on** (`lib/switches.mjs`): `init`/`add` bring a pack's hooks and checks except its `optIn` ones. `update` brings a hook or check *new* to the project only if `layout.json` `"enable"` names it. Never make a new law silently switch on in existing projects.

**Never-overwrite contract:** the lock stores a hash per managed file. A user's same-named or edited file is kept and the pack version goes beside it as `<file>.pack-new`. Only the kit's own hooks are rebuilt in `settings.json`, and only the `<!-- claude-packs:start/end -->` block in a project's CLAUDE.md is written.

**The shape law** (`hooks/lib/shape.mjs`, `shape-law`, `brief-guard`, `making`, `making-check`, `once-only`, `tools/shape-symmetry.mjs`): a project's `design/shape.json` declares each concept as one or many. Code, docs and briefs may name an instance of a "many" concept only as an example, a selector or a declared constant, never as a bare literal (origin: KWB-1, "slot 2").

## Invariants the tests hold

- `test/worktrees.test.mjs`: every installed hook has a `CASES` entry proving it judges a worktree file by the worktree. A new hook without one fails the suite.
- `test/file-size.test.mjs`: every installed `.mjs`/`.py`/`.sh` stays within 300 lines (projects' own `file-size-guard` refuses longer). Split before you pass it.
- `test/other-projects.test.mjs`: no hook blocks an edit in a sibling project.
- `doctor`: a skill's `description:` starts with "Use when" and the skill is under 8,000 characters; every lesson check's `bad` is caught and its `good` passes.
- `test/readme.test.mjs`: the README has every pack with its true counts, every configuration, preset and command, and every hook base installs.
- `test/no-personal-name.test.mjs`: no file names a person.
- `test/check-speed.test.mjs`: every lesson check gets through a large file within its budget, so a pattern that backtracks across a file fails here (KWB-43).
- `test/every-language.test.mjs`: every row of the language table has a copy matched and comments ignored.
- `test/noop.test.mjs`: an `update` on a real project's old install changes only what is listed. A new or changed installed file goes in its lists.

## Authoring pack content

- **Rule:** frontmatter `# concepts: a, b` + `paths:` (generated), a one-line `#` title stating the law, body in `<constraints>` with `Always do:` / `Never do:`. A rule that states one hook's law may carry `# hook: <file>` instead: it is held, left out and switched on with that hook, and with no `# concepts:` it loads everywhere.
- **Lesson check** (`checks/*.json`): `id`, `why`, `rule`, `globs`/`concepts`, `exclude`, `pattern`, optional `code: true` (comments and strings blanked), `strings: true` (comments only) or `language: "rust"` (that row's own blanker, with `notInTests: true` to leave out tests in the same file), `mode` (`forbid`, `require`, `needs`), `whenDep` (a dependency's major version), `kind` (how `scan` files it), `replaces` (narrower checks a wider one stands in for), `bad`, `good`. It blocks only edits that *add* a match. A new pack's check names `globs`, since a concept may come from a pack the project lacks. Measure a new check on a real repo and read the hits before it ships.
- **Hook:** register in `pack.json` (and `optIn` if it should not switch on by default), judge writes via `writesOf`, check `insideProject` and `checkoutRoot`/`claudeRoot`, exit 2 with the reason on stderr to refuse, export `hook`, add a `--selftest` that plants the fault and the correct case, and add its worktree case. A hook's selftest must be seen red without the fix.
- Cite `{#anchor}`s or symbol names in docs and rules, never line numbers.

## Working on the kit itself

- **Kit lock:** one session lands work on the kit at a time. `.claude/hooks/kit-lock.mjs` (this repo's own hook, not part of any pack; on every tool call) takes `.claude-packs-lock` on a session's first write or commit, and refuses another session's commits, merges and releases (`npm version`/`publish`/`pack`, `git tag`) while its lease is live in any checkout; edits and pushes of existing commits pass (KWB-30). The lock is a lease (KWB-29): `started_at` and `last_seen`, renewed at most once a minute by the holder's hook calls, or by its transcript when the holder's hooks are another project's (a Stellix lead: take it with `lock take`); 30 min without renewal and it is stale, and the next session's work takes it over, logged in `.claude/kit-lock.log`. A live lease is never deleted: `lock release --force` is the only way. The lock and the log are runtime state, ignored by git.
- **Branches:** work goes on `work/<version>-<topic>` branches started from the *fetched* `origin/main`, pushed from the first commit. A release fast-forwards both local and remote `main` (KWB-11, KWB-26).
- **Workflow faults:** log a fault in a hook, tool or test run in `workflow-bugs.md` (`KWB-n`, with a timestamp) *before* fixing it, and close it with cause, fix and the test that catches it. Tests and code comments cite the KWB/WB ids they lock in.
- **Release:** bump `package.json`, add a `CHANGELOG.md` entry, keep the README a current front page (it describes the kit as it is; release history goes in `CHANGELOG.md` and `docs/history.md`), and gate it with `npm run test:changed -- --base origin/main` on the committed work; the full `npm test` runs only when the user asks. Then, on `main` after the landing, `npm run release` (`scripts/release.mjs`) makes the npm package, the tag and the GitHub release, its notes the version's `CHANGELOG.md` section; it refuses off `main`, on a dirty tree or a `main` GitHub lacks, and skips any step already done, so a stopped release is finished by running it again. `--dry-run` says what it would do. A publish still needs the user's yes.
- **Pins:** a dependency added or pinned needs a fresh row in `docs/versions.md` (the global `version-pin-guard` enforces this).

<!-- claude-packs:start -->
<!-- Generated by claude-packs from .claude/layout.json. Edit that file and run `npx --no-install @thedecipherist/claude-packs update`; edits here are replaced. -->
## Project layout

<constraints>
Always do:
- Put every kind of thing in its one place. The rules, checks and skills for it load only there:
  - the kit's tests → `test/`
  - versions and notes → `docs/`
  - the planner skills a person uses in claude.ai → `planner/`
- The other folders:
  - `.claude-plugin/`: the kit's Claude Code plugin declaration: the TypeScript language server (lspServers)
  - `bin/`: the claude-packs command (bin/claude-packs.mjs)
  - `configurations/`: the configurations: one config.json per kind of project (its packs, layout template, hook order, preamble)
  - `docs/workorders/typescript/probes/`: the typescript order's probes: the daemon prototype and review-2's probe scripts
  - `global/`: the global part: latest-versions, gnu-shell, shell-traps (global add)
  - `lib/`: the command's library: sync, settings, layout, doctor, scan, suggest, fix, the kit lock
  - `packs/`: the packs a project installs: rules, checks, hooks, skills, tools (list shows them)
  - `prompts/`: prompts the command prints (survey.md, scan-review.md)
  - `proxy/`: the Go hook proxy's client (the one hand-written non-TypeScript source) and its tests
  - `scripts/`: the kit's own development scripts (test-changed.mjs); never shipped
  - `site/`: the web page: the design, and the numbers a test holds true; never shipped in the npm package
  - `test/fixtures/profiles/`: the seed layout profiles used by tests (--profile takes a path)
  - `test/hooks/`: hook tests: test/hooks/PACK/HOOK.test.mts
  - `test/integration/`: integration flows that install on purpose: test/integration/FLOW.test.mts
  - `test/tools/`: tool tests: test/tools/PACK/TOOL.test.mts
  - `test/unit/`: unit tests: test/unit/lib/NAME.test.mts and test/unit/hooks-lib/NAME.test.mts
- Ask the user before inventing a new folder. A new folder goes into `.claude/layout.json` first.
- When a hook, check or guard blocks work that is correct, stop and report its exact message. A blocking hook is a red check: fix the hook first, with a selftest, then continue.
- When a command is refused or fails, the step fails loudly. Never report a refused write or a failed command as done.
- claude-packs (`@thedecipherist/claude-packs`) is the source of truth for every rule, check, hook and skill this project's configuration installs. A fix to one of them is made in the kit, with its test, and comes here with `npx --no-install @thedecipherist/claude-packs update`. A project edits its installed copy only to try a fix before it goes into the kit.

Never do:
- Create source files outside these folders, or put a kind of thing anywhere but its place. The folder-law and placement-law hooks refuse both.
- Edit files in `.claude/rules`, `.claude/checks` or `.claude/hooks` to get past a block. Fix the code, or ask the user to change the law.
- Route around a block: no override variables, no writing through the shell after a refusal, no parking files in a scratchpad, no putting new code into an unrelated existing file.
- Point at a document by line number. Cite a fixed anchor (`{#id}`) or a symbol name; lines move.
</constraints>

## Project commands

Skills and checks run these; use them, not the raw tools:
- test: `npm test`
- test-one: `node --import ./test/fresh-tmp.mts --test test/<name>.test.mjs`
- test-changed: `npm run test:changed`
- doctor: `node bin/claude-packs.mjs doctor --strict`

Installed packs: base.
<!-- claude-packs:end -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`@thedecipherist/claude-packs` ("the kit"): an npm CLI (Node 22+, ESM, written in TypeScript) that installs per-project Claude Code rules, lesson checks, hooks and skills into a *target* project's own `.claude/`, for any project. It holds code to what a senior engineer would accept, and stops repetition before it is written. A project is one configuration (`base`, `cpp`, `go`, `node`, `python`, `rust`, `full-stack`, `synth-creator`) plus the packs its code needs: `suggest` reads them from the project, `init --auto` installs them, `scan` finds what is already wrong on a copy, and `fix` makes that a work order. The kit is the source of truth for every law: a fix to a hook, rule, check or skill is made here, with its test, and projects take it with `npx --no-install @thedecipherist/claude-packs update`. Nothing goes into `~/.claude` except `global add`, which installs exactly three pieces (latest-versions + `version-pin-guard`, `gnu-shell`, `shell-traps`).

The kit is for everyone: no file names one person (`test/repo-lint.test.mts`, "no file names a person"). Write "the user", or "the author" in the writing pack, and they/them. State a reason itself, never who asked for it.

## Commands

```
npm run build                  # tsc -b: emits the .mjs beside every .mts (ignored by git); `npm test` and `npm run prepare` run it first
npm run check                  # tsc --noEmit over the kit and over its tests: strict, no any, no silenced error
npm test                       # the full suite: only when the user asks for a full run (suite-once refuses it otherwise). Always via npm: it builds, then preloads test/fresh-tmp.mts
npm run test:changed           # while working: the tests covering files changed since the base (prints why each was picked); with -- --base origin/main, the gate before landing and before a release
node scripts/test-changed.mjs --dry-run [--base <ref>]
node --import ./test/fresh-tmp.mts --test test/counts.test.mts                     # one file
node --import ./test/fresh-tmp.mts --test --test-name-pattern "<name>" "test/**/*.test.mts"   # one test
node scripts/counts.mts [--check]  # writes the README's tables, the site's counts, docs/rules-without-checks.md, docs/versions.md's used column and the manifest; --check exits 1 when any differs
node packs/base/hooks/<hook>.mjs --selftest   # every hook has one (the emitted file; build first); doctor runs them all
node bin/claude-packs.mjs init audio-core --dir <scratch>   # try an install; then `doctor --dir <scratch> [--strict]`
node bin/claude-packs.mjs suggest|scan|fix --dir <project>  # what it needs; what is wrong, on a copy; the work order
node bin/claude-packs.mjs lock status|release [--force]      # the kit lock (below)
```

Never run `node --test` without the `fresh-tmp.mts` preload: tests then share the system temp folder and fail at random (KWB-2). Develop on Node 22.18 or newer: it runs a `.mts` file directly (type stripping), which the scripts and the unit tests rely on; the package itself runs on Node 22 from the emitted `.mjs`. Every source is strict TypeScript (`.mts`): the hand-written `.mjs`, `.js` and `.py` are gone, and `test/repo-lint.test.mts` holds that (no `any`, no `@ts-ignore`, no `.mjs` beside a converted folder, shared shapes defined once in `packs/base/hooks/lib/types.d.mts`). The one exception is the Go hook proxy's client in `proxy/`, hand-written Go with its own tests, built by `scripts/build-proxy.mts`. Run `npm install` first: `jscpd` (an optional dependency, the `once-only` hook's detector) must be in `node_modules`, or every test that installs packs fails at doctor's `once-only`/`making-check` selftests.

## Architecture

**Installer** (`bin/claude-packs.mts` → `lib/`). `lib/sync.mts` runs an install: resolve the configuration → validate `settings.json` → back up → `buildLayout` (`layout.mts`) → decide what switches on (`switches.mts`) → copy pack files (`packs.mts`) → remove dropped files → merge hooks into settings (`settings.mts`) → regenerate rule `paths:` (`rules.mts`) → write the CLAUDE.md block (`claude-md.mts`) → write the lock (`manifest.mts`). `doctor.mts` verifies an install (selftests, coverage, hook timing, token sweep, hover and page gates, hook-proof); a passed selftest is remembered by hash until the hook changes (`selftest-cache.mts`, `--fresh` runs them all). `new.mts` scaffolds a project; `shape-cli.mts`, `symmetry-doctor.mts`, `once-only-report.mts` back the `shape`, `symmetry` and `dup` commands; `custom-packs.mts` backs `new-pack` and `add --from`.

**Before an install** (`lib/scan.mts`, `scan-detect.mts`, `suggest.mts`, `repeats.mts`, `fix-plan.mts`): `recommend` in `scan-detect.mts` picks the configuration (the language most files are in) and one row per pack says what evidence recommends it. `suggest` prints that, and `init --auto` installs it. `scan` copies the project to a temp folder, installs there, runs every check and writes a report and `claude-packs-scan.json` beside the copy, so the project is never written to. `repeats.mts` lists copies, near copies and functions made again, and `repo-weight.mts` what the repo carries that is not source. `fix` turns the last scan into `.claude/fix-plan.md`, in the order to work it.

**Configurations** (`configurations/shared.json` and `configurations/<name>/config.json`, `lib/configs.mts`, `lib/config-merge.mts`, `lib/config-cli.mts`): a kind of project as data, one shared base with a delta per configuration. It holds its packs (`always`, `default`; the packs it may take are the ones whose `pack.json` `fits` names it), its layout template, `sourceFiles` (what doctor's coverage counts as source) and the `preamble` of the CLAUDE.md block. The order of its hooks is the packs': each hook row's `order` in `pack.json`. `layout.json` `"configuration"` names a project's; `update` applies it; an install that names none gets, in order, the configuration with a chosen pack by default, the one with no folder layout of its own, the smallest (`inferConfig`). A configuration's own packs (its `always` list: `synth-creator`; `full-stack` with `http-api`, `fastify`, `zod`, `docker`; `writing` and `hook-proof` in every one) come with it and are never written in the lock's `packs`. A configuration is a composition: what holds for any project goes in a pack anyone can take, and a pack named for a configuration holds only that choice. base holds only universal engineering; `test/repo-lint.test.mts` ("base and the base configuration name no synth word") refuses a synth word in it.

**Packs** (`packs/*/`; `bin/claude-packs.mjs list` shows them and the presets): content copied into target projects. `pack.json` is a manifest like a `package.json` (`version`, `type` stock or custom, `author`, `license`, `repository`, `engines`; `lib/pack-manifest.mts` checks it) and declares `fits`, `requires`, `tests`, `folders`, `concepts`, `kinds`, `hooks` (merged into settings, each with its `order`), `optIn` and `skillsIn`. `rules/`, `checks/`, `hooks/`, `tools/` go to `.claude/`; skills go to `.claude/skills/` or a layout folder's nested `.claude/skills/`. The README's pack table is written from them (`node scripts/counts.mts`); `README.md` lists every pack and `list` shows each one's version.

**Hooks run inside the target project**, so they import only from `packs/base/hooks/lib/`, never from `lib/`. Shared logic the CLI also needs lives in the hooks lib and `lib/` re-exports it (e.g. `lib/shape.mts`). Key hook libs:
- `project.mts`: `insideProject()` (never judge a sibling project's files; `commandLeavesProject` for `cd`/`git -C`), `checkoutRoot()`/`claudeRoot()` (judge a file from its own checkout and that checkout's `layout.json`, because agents work in git worktrees under `.claude/worktrees/` while `CLAUDE_PROJECT_DIR` points at main).
- `writes.mts` + `shell-writes.mts` + `program-writes.mts`: `writesOf(payload)` returns every file a tool call writes by any route (Write, Edit, MultiEdit, NotebookEdit, shell redirects, `sed -i`, `cp`/`mv`, heredocs, inline python/node/perl programs). A write guard judges these, so it covers every route at once (`test/hooks/routes.mts`).
- `languages.mts`: one row per language (how to blank comments and strings, where a statement ends, what is not code, how a function is defined). `languageOf(ext)`; a new language is one row, with a sample in `test/unit/hooks-lib/languages.test.mts`.
- `code-shapes.mts`, `elements.mts`, `near-copies.mts`, `function-shapes.mts`, `repo-index.mts`: the repetition reader. Statements and markup with names, numbers and strings stripped become shapes (`setup`, `run`, `rows`, `markup`); `parametersOf` says what differs between two copies; `nearCopy` finds a stretch that matches in order with lines changed; `repoIndex` keeps each file's shapes, statements and definitions in the temp folder, read again only for what moved. `template-law` judges a write against it, `reuse-hint` reads it at the prompt, `code-shape` uses `functionsOf`.
- `content.mts`: `isContent(rel, layout)`. A folder of published text holds samples, never the project's code: code laws skip it, writing laws (`prose` checks) read it, and `scan` and `suggest` list it apart. Under a code root (`src/`, `app/`, ...) the same word is code.
- `git-adds.mts`: the `git add` calls in a command, for `secrets-guard` and `repo-litter`.
- `event-log.mts`, `hook-log.mts`: logs are never cleared. `appendRotated` moves a full log to `.claude/logs/`. `logCall` records every call in `events.jsonl`, every crash in `crashes.jsonl` and every refusal in `refusals.jsonl` with its reason, so `lib/logs.mts` can judge hooks on evidence. `secret-patterns.mts` masks what is logged.
- `crash-policy.mts`, `unread-writes.mts`: what the runner does when a hook crashes (refuse a tool call once, say so, log it in `crashes.jsonl`), and when no hook could read what an inline program wrote to source.
- `hook-log.mts`: a hook is `export const hook: Hook = (event, ctx) => ...` and ends with `if (isMain(import.meta.url)) await runAsHook(import.meta.url, '<name>', hook, selftest)`. `settings.json` runs all node hooks of one entry in one process via `run-hooks.mjs`, which builds the `ctx` and calls each `hook(event, ctx)`, and logs timing to `.claude/hooks.log`. `doctor` fails a hook whose median is over 500 ms.
- `selftest.mts`: `scratchProject`, `runHook`, `verdicts`: a selftest builds a throwaway project and runs the hook through the runner, as Claude Code would. Prove hooks this way, never by pasting payloads into a shell command.

**`.claude/layout.json` (in the target) is the single source of truth.** `folders` name paths; `concepts` map to folder names or globs; `kinds` say what goes where (CLAUDE.md block + `placement-law`). Rules declare `# concepts:` in frontmatter and get `paths:` generated. Keys the project owns (`files`, `protected`, `writeOnce`, `disable`, `enable`, `commands`, `siblings`, `guards`, `maxFileLines`, `paramIds`, …) survive every update. `"complete": true` layouts (a seed file given to `--layout` or `--profile`; the tests' two are in `test/fixtures/profiles/`) get no default pack folders.

**What switches on** (`lib/switches.mts`): `init`/`add` bring a pack's hooks and checks except its `optIn` ones. `update` brings a hook or check *new* to the project only if `layout.json` `"enable"` names it. Never make a new law silently switch on in existing projects.

**Never-overwrite contract:** the lock stores a hash per managed file. A user's same-named or edited file is kept and the pack version goes beside it as `<file>.pack-new`. Only the kit's own hooks are rebuilt in `settings.json`, and only the `<!-- claude-packs:start/end -->` block in a project's CLAUDE.md is written.

**The shape law** (`hooks/lib/shape.mts`, `shape-law`, `brief-guard`, `making`, `making-check`, `once-only`, `tools/shape-symmetry.mts`): a project's `design/shape.json` declares each concept as one or many. Code, docs and briefs may name an instance of a "many" concept only as an example, a selector or a declared constant, never as a bare literal (origin: KWB-1, "slot 2").

**Generated, never hand-kept** (`scripts/counts.mts`, `counts-facts.mts`, `counts-tables.mts`, `counts-render.mts`): the README's five tables between its `<!-- generated:NAME:start/end -->` markers (packs, configurations, presets, commands from `prompts/help.txt`, the hooks base installs), the site's six `data-count` numbers, `docs/rules-without-checks.md`, the `used` column of `docs/versions.md`, the status-line sample's version, the planner's version line and `packs/manifest-<version>.json` (the files an update leaves in each old project of `test/fixtures/noop`). Change the source and run `node scripts/counts.mts`, never the generated text; the "What it does" cell of a base hook is the one hand-written part of a table, and a new hook has none until someone writes it.

## Invariants the tests hold

- `test/integration/worktrees.test.mts` (with `test/worktree-cases-packs.mts`, `test/worktree-cases-commands.mts`): every installed hook has a case proving it judges a worktree file by the worktree. A new hook without one fails the suite.
- `test/repo-lint.test.mts`: every installed hook, check and tool file stays within 300 lines, and every `.mts` it is built from (projects' own `file-size-guard` refuses longer; split before you pass it); no file names a person; every lesson check gets through a large file within its budget, so a pattern that backtracks across a file fails here (KWB-43); the gates that hold the TypeScript conversion.
- `test/hooks/base/other-projects.test.mts`: no hook blocks an edit in a sibling project.
- `doctor`: a skill's `description:` starts with "Use when" and the skill is under 8,000 characters; every lesson check's `bad` is caught and its `good` passes.
- `test/counts.test.mts`: `node scripts/counts.mts --check` is green, so the README's tables, the site's counts and the docs are what the packs and configurations hold; a wrong number planted in any is red.
- `test/unit/hooks-lib/languages.test.mts`: every row of the language table has its extensions and a name no other row has, and a copy matched and comments ignored.
- `test/integration/noop.test.mts`: an `update` on a real project's old install leaves the files `packs/manifest-<version>.json` lists. A new or changed installed file shows as a line of that file's diff (`node scripts/counts.mts`), to be read and kept.
- `test/kit-docs.test.mts`: this file names no `.mjs` hook form and no test file that no longer exists.

## Authoring pack content

- **Rule:** frontmatter `# concepts: a, b` + `paths:` (generated), a one-line `#` title stating the law, body in `<constraints>` with `Always do:` / `Never do:`. A rule that states one hook's law may carry `# hook: <file>` instead: it is held, left out and switched on with that hook, and with no `# concepts:` it loads everywhere.
- **Lesson check** (`checks/*.json`): `id`, `why`, `rule`, `globs`/`concepts`, `exclude`, `pattern`, optional `code: true` (comments and strings blanked), `strings: true` (comments only) or `language: "rust"` (that row's own blanker, with `notInTests: true` to leave out tests in the same file), `mode` (`forbid`, `require`, `needs`), `whenDep` (a dependency's major version), `kind` (how `scan` files it), `replaces` (narrower checks a wider one stands in for), `bad`, `good`. It blocks only edits that *add* a match. A new pack's check names `globs`, since a concept may come from a pack the project lacks. Measure a new check on a real repo and read the hits before it ships.
- **Hook:** a `.mts` file in the pack's `hooks/`, registered in `pack.json` (with its `order`, and in `optIn` if it should not switch on by default), exporting `hook(event, ctx)` and ending on `runAsHook`; judge writes via `writesOf`, check `insideProject` and `checkoutRoot`/`claudeRoot`, exit 2 with the reason on stderr to refuse, add a `selftest` that plants the fault and the correct case, name its test in the pack's `tests`, and add its worktree case. A hook's selftest must be seen red without the fix.
- Cite `{#anchor}`s or symbol names in docs and rules, never line numbers.

## Working on the kit itself

- **Kit lock:** one session lands work on the kit at a time. `.claude/hooks/kit-lock.mjs` (this repo's own hook, not part of any pack; on every tool call) takes `.claude-packs-lock` on a session's first write or commit, and refuses another session's commits, merges and releases (`npm version`/`publish`/`pack`, `git tag`) while its lease is live in any checkout; edits and pushes of existing commits pass (KWB-30). The lock is a lease (KWB-29): `started_at` and `last_seen`, renewed at most once a minute by the holder's hook calls, or by its transcript when the holder's hooks are another project's (a Stellix lead: take it with `lock take`); 30 min without renewal and it is stale, and the next session's work takes it over, logged in `.claude/kit-lock.log`. A live lease is never deleted: `lock release --force` is the only way. The lock and the log are runtime state, ignored by git.
- **Branches:** work goes on `work/<version>-<topic>` branches started from the *fetched* `origin/main`, pushed from the first commit. A release fast-forwards both local and remote `main` (KWB-11, KWB-26).
- **Workflow faults:** log a fault in a hook, tool or test run in `workflow-bugs.md` (`KWB-n`, with a timestamp) *before* fixing it, and close it with cause, fix and the test that catches it. Tests and code comments cite the KWB/WB ids they lock in.
- **Release:** bump `package.json`, add a `CHANGELOG.md` entry (release history lives there, and `docs/history.md` points to it), run `node scripts/counts.mts` so the README and the site carry the new numbers, and gate it with `npm run test:changed -- --base origin/main` on the committed work; the full `npm test` runs only when the user asks. Then, on `main` after the landing, `npm run release` (`scripts/release.mts`) makes the npm package, the tag and the GitHub release, its notes the version's `CHANGELOG.md` section; it refuses off `main`, on a dirty tree or a `main` GitHub lacks, and skips any step already done, so a stopped release is finished by running it again. `--dry-run` says what it would do. A publish still needs the user's yes.
- **Pins:** a dependency added or pinned needs a fresh row in `docs/versions.md` (the global `version-pin-guard` enforces this, and `node scripts/counts.mts` keeps the row's `used` cell equal to `package.json`).

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

Installed packs: base, js-ts.
<!-- claude-packs:end -->

# Work order: typescript

Written 2026-11-11 from a ten-part survey of the kit (`docs/workorders/typescript/survey/*.md`: typescript-tooling, base-hooks,
other-packs, cli-lib, tests, repeats, pack-content, configurations, runtime-cost, open-work) and the user's instructions of the same
day: "we should 1000% use typescript everywhere humanly possible ... and LSP ... convert the entire kit properly to typescript with LSP
support. then fix the publish stage for speed after"; "it needs to be done methodically"; "we must follow all best practices and DRY as
a senior developer would do this"; "all packs should use DRY and include shared helpers and modules for everything and made in a super
easy way to track and test what changes per commit so tests and publish stage can be reduced as much as humanly possible"; "a pack
should have a template that follows the exact same writing style every time"; "make sure that both typescript and LSP is enforced and
a dependency of the kit going forward"; "it should not take any longer than at max 5 min to publish claude-packs, and that means
committed, on main, npm published"; "all checks done by claude-packs when installed in someone's project have the same time
constraint".

**What this is.** `@thedecipherist/claude-packs` (the kit) is 279 hand-written `.mjs` files (25,594 lines) and two Python files with
no type anywhere, while its own `js-ts` pack tells projects to write strict TypeScript. This order makes the kit what it asks of others:
every source file strict TypeScript (`.mts`), built by TypeScript 7's native compiler into the plain `.mjs` that projects receive
unchanged; one owner for every helper (a git runner, a JSON read, a payload parse, a hook's tail) instead of the 4 to 22 copies the
survey counted; a test layout where a changed file's tests are a path function, so a one-hook change runs in seconds; packs written
from one template and held to it by a gate; the counts, tables and lists the kit keeps by hand generated from the packs; the
language server working on the kit for Claude Code's `LSP` tool; the checks a project pays per tool call held to a budget, run through a Go proxy to one resident node process; and a
release that goes from a commit to npm in under five minutes. Finished looks like: 0 hand-written `.mjs`, `.js` or `.py` source in
the kit; `tsc --noEmit` 0 errors under the strict set; 0 `any` and 0 suppressed errors; every shape defined once; the whole suite
green with every test of the baseline still present; `LSP` answering definitions, references and call hierarchy on the `.mts`; a
one-hook gate under 60 s and a release under 300 s, both measured; a project's Bash call waiting on 2 proxy calls of under 20 ms each, not 9 node processes of about 85 ms.

**The position.**
- *Known (measured 2026-11-11):* TypeScript 7.0.2 compiles the current 105-file sample in 0.55 s cold and 0.10 s warm and reports
  1,849 errors on it (about 1,500 are untyped parameters; about 230 are real shape errors); the whole tree is about 1.7 times that.
  Node refuses to run `.mts` under `node_modules`, so the shipped CLI and the hooks a project runs must be emitted `.mjs`; Node strips
  types by default from 22.18 (the kit's dev tree runs `.mts` directly; its `engines` stays `>=22` for projects). Claude Code's `LSP`
  tool starts `typescript-language-server --stdio` from PATH through its official `typescript-lsp` plugin; that server (6.0.3) does
  not work with TypeScript 7.0.2 (no `tsserver.js`) and does with 6.0.2; TypeScript 7 has its own server, `tsc --lsp --stdio`, which
  answered an `initialize` request and nothing more was probed. The installer copies every file under a pack's `rules`, `checks`,
  `hooks`, `tools` and `skills` with no extension filter, and `package.json` `files` ships `packs` and `lib` whole. The suite: 620
  tests, 26 min wall; installs are 99.7 % of its seconds; one `init` plus doctor costs 14 s; `audio-core` is installed 40 times a run;
  `house.test.mjs` alone sets 92 % of the wall. A project's Bash call starts 9 node processes (about 1 s, 46 % of it process start-up);
  git-guard at Stop has a median of 1.7 s because it asks GitHub live. 29 hand-kept copies of facts (counts, tables, orders), 22 held by
  no test. 266 of 735 pack content files would fail a strict conformance gate today.
- *Not known yet (W1 settles each by a probe with a number):* whether `tsc --lsp` serves Claude Code's `LSP` tool for definitions and
  references on `.mts`, or the kit must carry `typescript-language-server` with TypeScript 6 beside TypeScript 7 for the build; whether
  a project's `node_modules/.bin` is on the PATH the tool uses; `tsc`'s time and error count on the whole tree; whether copying a
  cached install into a test keeps its absolute paths valid.
- *Cannot be proved here:* Windows natively (the kit runs on Windows only through WSL: the user, 2026-11-11); hosts other than Claude
  Code; a release's wall time on another machine (this Mac's program starts cost about 30 times a Linux box's).

**The sources.**
- The kit: `~/projects/claude-packs` (this repo, branch `work/2.0.0-typescript`); `CLAUDE.md`; `workflow-bugs.md`;
  `docs/platform-audit.md`; `docs/versions.md`; the ten survey files under `docs/workorders/typescript/survey/`, each claim with its
  path, which every step below cites by file name.
- TypeScript 7.0: https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/ (defaults, removed options, no JS API in 7.0),
  https://github.com/microsoft/typescript-go (the LSP server), https://www.typescriptlang.org/tsconfig/.
- Node: https://nodejs.org/api/typescript.html (type stripping, `node_modules` refused, erasable syntax only).
- Claude Code: https://code.claude.com/docs/en/plugins/code-intelligence.md and manifest-reference.md (an LSP server is declared by a
  plugin's `.lsp.json`: `command`, `extensionToLanguage`, `${CLAUDE_PROJECT_DIR}` substituted; the official `typescript-lsp` plugin).
- Timing: `~/projects/claude-packs-notes/.mac-suite-1.log` (the suite), the session's `gate-1.9.0-4.txt` (a gate), bandwarp's
  `.claude/hooks.log` (89,746 hook timings over 4 h 13 min with seven agents).

**The foundation.** Reused, never written again: the installer's pipeline (`lib/sync.mjs` and what it calls), the hook runner
(`packs/base/hooks/run-hooks.mjs`), the selftest library (`packs/base/hooks/lib/selftest.mjs`), the JSON helper (`json.mjs`), the
repetition readers (`elements`, `code-shapes`, `near-copies`, `repo-index`, `languages`), the test helpers (`test/kit-cli.mjs`,
`test/worktree-rig.mjs`, `test/fresh-tmp.mjs`), the test picker (`scripts/test-changed.mjs`, whose import graph and `selftestsOf` are
already exact), the release script (`scripts/release.mjs`), kit-fresh and the selftest cache. They are converted and given one owner
per helper; behaviour stays unless a step says it changes.

**Models.** The conversion of a large JS tree is done behind a compiler that refuses `any`, leaves of the import graph first, shared
shapes before their users, each slice green before the next starts (survey base-hooks: 7 layers, 6 hubs, 21 leaves). The test layout is
the tests survey's three tiers (unit, hook, integration) plus one repo lint. Not taken: a big-bang rewrite, `// @ts-nocheck`, `any` as a
crutch, a `dist/` mirror that would rewrite every path import (14 lib files, `bin`, `global`, the kit's own install: survey cli-lib
section 2), shipping `.mts` to projects, or a second build of the same code.

<constraints>
Always do:
- Work the steps in order; inside a step, slices run in parallel only where the step says so, each agent in its own worktree under
  `.claude/worktrees/SLICE` on a branch `work/typescript-SLICE` (SLICE the slice's name) from `work/2.0.0-typescript`, merged back in the order the step
  gives, each merge with the tests its changes reach (the picker) green.
- Prove each step's "done when" by running it, and keep the evidence in `build/evidence/W0/` to `build/evidence/W11/` (the step's folder) (ignored by git; the progress line
  names the file and the number).
- Give every new gate a planted fault that turns it red, and show it red.
- Type everything strictly: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`,
  `verbatimModuleSyntax`, `isolatedModules`, `erasableSyntaxOnly`, `useUnknownInCatchVariables` (W2's tsconfig). `unknown` and a
  narrowing where a value's shape is not known (a payload, a parsed file), never `any`. No `enum`, no `namespace`, no parameter
  properties (Node strips only erasable syntax).
- Define every shared shape once, in `packs/base/hooks/lib/types.mts` (the hook event payload and each tool's `tool_input`, a write,
  the layout, the lock, `design/shape.json`, a pack manifest, a configuration, settings.json's hook groups, the selftest verdict row,
  a git result) or beside the one module that owns it, exported; import it everywhere else. A second definition of the same shape is a
  fault (W2's gate).
- Give every helper one owner, as the repeats and base-hooks surveys list them (section "The owners" under W3), and take every copy
  out in the same commit that converts the file holding it. A copy with one line changed is still a copy (`template-law`,
  `once-only` hold the kit to it).
- Keep behaviour: a conversion changes types and owners, not what the code does. Where typing shows a real bug, log it in
  `workflow-bugs.md` first (`KWB-` and its number), fix it in its own commit with its test seen red, and say so in the progress line.
- Keep every file under 300 lines (`file-size-guard`, which W2 makes read `.mts`); split by what the code does.
- Record each decision in `docs/workorders/typescript/decisions.md` as it is made (`d-n`: the question, the options, the choice,
  why); the ones this order already takes are listed under "Decisions taken by this order" and get their rows at W0.
- After every finished item, one line in `docs/workorders/typescript/progress.md`: `- YYYY-MM-DD W3.2: what, evidence, commit` (the step and item). After every finished step, `docs/workorders/typescript/status.json` as the PROMPT says.
- Stage by name, commit with `-- ` and the paths by name, push every commit; never rebase, amend or force. Every build and test through the
  project's commands (`npm run build`, `npm run check`, `npm run test:changed`, `npm test` only where a step names it).

Never do:
- Commit an emitted `.mjs` (git ignores them from W2 on), `node_modules`, a secret, or a file under `test/fixtures` that holds a
  person's path.
- Use `any`, `as any`, `// @ts-ignore`, `// @ts-expect-error`, `// @ts-nocheck`, or a non-null `!` where a check could stand.
- Change what a project receives or how it runs it: installed file names (`.claude/hooks/*.mjs`, `.claude/hooks/lib/*.mjs`,
  `.claude/tools/*.mjs`), `pack.json` hook commands, the Node 22 floor; except where W8 changes settings on purpose (one runner per
  event) with its migration.
- Weaken a test to pass a conversion, drop a test (W5 compares names), or mark a step done that was not measured.
- Run the whole suite on the run's own initiative, except where a step's Done when names it (W0, W5, W6).
- Leave a decision open: take the recommended choice, record it, go on.
</constraints>

## Decisions taken by this order (recorded as d-1 to d-10 at W0; the user may overturn any)

- **d-1 The branch.** `work/2.0.0-typescript` from `work/1.9.0-platforms` (every fix of 2026-11-11, unreleased, KWB-147 and 155 to 167).
  1.9.0 is not published separately; its CHANGELOG section folds into 2.0.0 (survey open-work section 1).
- **d-2 The emit layout.** A `.mts` source emits its `.mjs` beside it, in the same folder (`rewriteRelativeImportExtensions`), the
  `.mjs` ignored by git and built by `npm run build`; the installer skips `.mts`, `.d.mts` and `.map` (one filter in `lib/packs.mjs`
  `JUNK`), and `package.json` `files` excludes them. Why: every path import in `lib` (14 files), `bin`, `global`, the kit's own
  `.claude/hooks/kit-lock.mjs`, `proveHooks` and the global copier keeps working; the installed files are byte for byte what `tsc`
  wrote; the tooling survey's `dist/` option would rewrite every one of those paths and copy the content files twice (survey
  typescript-tooling section 4, cli-lib section 2, other-packs section 4). The failure modes it names (a stale or missing emit) are
  held by `pretest`, `prepack`, `prepare` running the build and by W2's gate that the emit is current.
- **d-3 The dependencies.** Kit `devDependencies`: `typescript` 7.0.2 (the build and `--noEmit` check) and `@types/node` at the newest
  22.x (so no code uses an API Node 22 lacks). The language server: decided by W1's probe between `tsc --lsp --stdio` (one
  dependency) and `typescript-language-server` 6.0.3 with TypeScript 6.0.2 aliased beside 7 (two); the recommended choice is `tsc --lsp`
  if it answers definitions and references on `.mts` through the `LSP` tool, else the pair. The kit ships its LSP declaration as a
  Claude Code plugin folder (`.claude-plugin/plugin.json` with `lspServers`, `command` under `${CLAUDE_PROJECT_DIR}/node_modules/.bin`),
  enabled in the kit's own `.claude/settings.json`, so a session in the kit needs no global install. `typescript` is not a runtime
  dependency of the package: what ships is `.mjs`.
- **d-4 What the tests import.** Unit tests (`.test.mts`, run by node's type stripping) import the `.mts` sources, so the `LSP` and the
  compiler see the test as a reference and a changed function picks its tests exactly. The hook tier runs each hook's emitted `.mjs`
  (its `--selftest`, as a project runs it) and the integration tier installs the package, so the shipped code is what is proved. The
  kit's own dev needs Node 22.18 or newer (stated in CLAUDE.md); projects keep `>=22`.
- **d-5 TypeScript enforced in projects.** A project with the `js-ts` pack (and the `node` and `full-stack` configurations) gets, at
  `init` and `update`: `typescript` and the language server as devDependencies (versions from the kit's own pinned ones), a
  `tsconfig.json` with the strict set where it has none, the LSP plugin declaration, and a new check `typescript-only` that refuses a
  new `.js`, `.mjs` or `.cjs` source file (a planted `.mjs` seen red); `doctor` is red when such a project lacks `typescript` or the
  LSP declaration. Other languages' servers (clangd for `cpp`) are listed open at the end, not built here.
- **d-6 The test tiers.** `test/unit/` mirroring the source path (`test/unit/lib/sync.test.mts` for `lib/sync.mts`; one module, no spawn), `test/hooks/`
  by pack and hook (`test/hooks/base/git-guard.test.mts`: the hook's selftest, its worktree case exported by the hook, its refusals
  on a fixture copy), `test/tools/` by pack and tool (`test/tools/sound-design/prove-a-bank.test.mts`), `test/integration/` by
  flow (`test/integration/install.test.mts`; few, each installs on purpose), `test/repo-lint.test.mts` (one tree walk). Fixtures: one install per
  configuration built once per run and copied per test (`test/fixtures/installs.mts`). From the tests survey section 7.
- **d-7 The change-to-tests map.** A path function first (the mirrored tiers), then `pack.json` `tests` (every code file of a pack a
  key, asserted by a test) and `requires` (sound-design needs audio-core), then the import graph of the `.mts` for libs; the hook
  selftest cache keyed per hook plus its own transitive imports (not all of `hooks/lib`). Names and quoted basenames are no longer a
  rule. From the base-hooks survey section 7 and other-packs section 7.
- **d-8 Generated, never hand-kept.** The README's pack, hook, configuration, preset and command tables, the site's six counts, the noop
  lists (replaced by a per-version manifest of installed files and hashes), `docs/rules-without-checks.md`, `docs/versions.md`'s rows:
  one generator, `scripts/counts.mts`, run by the release; the tests that held the numbers become one `--check` that the generated
  text equals the file. From the configurations survey section 8 (29 copies) and the tests survey section 3.
- **d-9 Runtime in a project.** One runner process per event as the first step (the matcher table decided inside it, the heartbeat
  a file write in it), git-guard's Stop verdict cached and capped at 1 s, a per-session git state file read by every hook that asked
  git, doctor holding each hook per event (not pooled) to a budget. From the runtime-cost survey section 8.
- **d-10 A resident runner behind a Go proxy (the user, 2026-11-11: "use go as a proxy ... it somehow kept node open and every
  request from a hook went to go then to node ... we keep the best of both worlds. we still use typescript. hooks are just run through
  go as a proxy").** Every hook stays TypeScript. One node process per checkout and session holds the hooks loaded once and answers
  events over a unix socket; the command Claude Code starts per event is a small Go client (one file, under 100 lines) that forwards
  stdin to the socket and returns the verdict and exit code; with no daemon it says so once and starts one detached, failing open as
  the crash policy already does for a hook that cannot run. Measured on this Mac, 2026-11-11, with a prototype (the session's
  scratchpad `proxy/`): 16 ms per event through the proxy against 85 ms for a fresh node runner, the same six Bash-group hooks, the
  planted `find /` refused and a plain `ls` allowed, 92 requests answered by one process; a native start costs 5 to 7 ms here, a
  node start 57 ms. What it costs: Go as a build-time dependency of the kit (the client shipped as binaries for darwin-arm64,
  darwin-amd64, linux-amd64 and linux-arm64, about 3 MB each, built by the release), a daemon's lifecycle (start at SessionStart,
  stop at SessionEnd and after an idle hour, restart when the lock's hash changes after an update, one per checkout, a socket under
  the user's cache folder with a short path: macOS allows 104 bytes), the socket mode 600, and hooks that are re-entrant (no
  module-level state that one event leaves for the next: the base-hooks survey section 6 lists `ROOT` read at import,
  `process.env` edited by agents-held, `process.stderr.write` reassigned, module singletons). The one-runner-per-event step stays
  first because it is what makes the daemon's work table and is the fallback where no binary fits.

---

## W0. Set up

The kit installs itself from its own packs (`update --dir .`); this block names what it runs.

```claude-packs
configuration: base
packs: base
```

1. The branch `work/2.0.0-typescript` from `work/1.9.0-platforms`, pushed (done: the order's first commit); d-1 to d-10 written to
   `docs/workorders/typescript/decisions.md`.
2. Merge `origin/work/1.9.1-admiral-skill` (5e19ef5: the `admiral` pack with one skill; survey open-work section 5, the one live branch)
   into the order's branch: one copy where the README row and site counts overlap, its CHANGELOG line under 2.0.0, the skill gains the
   rule "watch a session with get_replies(since) or watch(), not wait_for_reply on one message" with its "When it will not connect"
   row (A reply never arrives | it answers another chat's message | read the session, not the message); the pack is kept and gets its
   tests at W5 like every pack.
3. The four stale open rows closed in `workflow-bugs.md` (KWB-154, 124, 120, 116: done already, survey open-work section 2), as their
   own commit.
4. Versions, with their rows in `docs/versions.md` (`latest-versions`): `typescript` 7.0.2 and `@types/node` 22.x newest, pinned in
   `package.json` as devDependencies; the language server's row after W1 decides it.
5. The baseline, the "before" of the comparison the user asked for ("a comparison run to the new 2.0 kit with go and typescript vs
   the old kit"): every number below measured on this Mac on the branch's first commit, by the method named, into
   `build/evidence/W0/baseline.md`, so W11 can measure the "after" the same way: (a) the whole suite once (`npm test`, the one full run
   this order allows before W5): tests, pass, fail, each failing test's name, wall; (b) a one-hook gate (`test:changed` with
   `packs/base/hooks/no-find.mjs` touched): files picked, wall; (c) a one-lib gate (`lib/layout.mjs` touched); (d) a release rehearsal
   (`npm run release --dry-run` after the gate, the steps by hand that it does not do, timed from the commit to what would be the
   publish); (e) `init --config synth-creator cpp audio-core` plus `doctor` into a fresh folder, with the selftest cache empty and
   then warm; (f) `update` in bandwarp's checkout (read-only elsewhere: its log's own timing); (g) a project's events from bandwarp's
   `.claude/hooks.log`: node processes per Bash, Write, Read and Stop, p50 and p95 per event, Stop's p50 and p95; (h) one Bash event
   through the runner and its six hooks, 10 starts timed (85 ms today); (i) the status line: a render's wall and the CPU a minute;
   (j) `tsc`'s build time (0 before: no build); (k) `npm pack` size and file count.
**Done when:** `docs/workorders/typescript/decisions.md` holds d-1 to d-10; the admiral pack is on the branch with its skill rule and
`npm run test:changed` green for the merge; the four rows are closed; both version rows exist and `package.json` pins them;
`build/evidence/W0/baseline.md` holds all eleven measurements (a) to (k), each with its command and its number; every failing
baseline test is named in `progress.md` with its reason.

## W1. Find out, before building (the riskiest first)

1. The language server: in a scratch Claude Code plugin folder inside the repo (`.claude-plugin/`), declare `tsc --lsp --stdio` from
   `node_modules/.bin` for `.mts`/`.ts`; convert one small leaf to `.mts` in a scratch copy and ask the `LSP` tool for `goToDefinition`,
   `findReferences` and `incomingCalls` on it. Record what answered. If references or definitions fail, do the same with
   `typescript-language-server` 6.0.3 and `typescript` 6.0.2 beside 7.0.2 (`"typescript": "npm:@typescript/typescript6"`,
   `"@typescript/native": "npm:typescript@7.0.2"` as the 7.0 announcement recommends). Decide d-3's open half, with the numbers.
2. The whole tree under TypeScript 7: `tsc --noEmit` with `allowJs`, `checkJs` and the strict set over every `.mjs` of `bin`, `lib`,
   `global`, `scripts`, `packs`; the wall time and the error count per folder and per code (the sizing of the conversion).
3. The emit, end to end, on two files (`packs/base/hooks/lib/json.mjs` and `project.mjs`): converted to `.mts` with `readText` moved
   out of `shell-writes` so `json` is a leaf (survey base-hooks section 1); `tsc` emits the `.mjs` beside them; `node bin/claude-packs.mjs
   init` into a scratch project installs the emitted files only (no `.mts`); their importers and `doctor --strict` run there; the
   hash in the lock equals `sha256` of the emitted file.
4. The fixture copy: one `init --config base` into a folder, copied to a second folder, `doctor --strict` and three hooks fired in the
   copy; which absolute paths in `settings.json`, the lock and the hooks' state break, and the rewrite the copier needs (survey tests
   section 7, risks).
5. The kit's readers blind to `.mts` (survey repeats section 5: `elements.mjs` CODE and MARKUP, `dup.mjs` SOURCE, `shape-code.mjs` CODE,
   `file-size-guard.mjs` SOURCE, `.cts` in the same four) confirmed by a probe write of a `.mts` through `once-only` and
   `file-size-guard`.

**Done when:** `docs/workorders/typescript/findings.md` holds: the `LSP` tool's answers for the three operations under each server
tried (the server chosen, with its reasons, and d-3 completed in `decisions.md`); `tsc`'s wall time and error count per folder on the
whole tree; the two-file install with 0 `.mts` in the scratch project's `.claude/` and `doctor --strict` OK there; the copied
install's `doctor --strict` OK after the rewrite the copier needs, listed path by path; the four readers' probe results (a `.mts` write
unseen today, each).

## W2. The foundation

1. `tsconfig.json` at the root: `module` and `moduleResolution` `nodenext`, `target` `es2023`, the strict set of the constraints,
   `rewriteRelativeImportExtensions`, `types: ["node"]`, `rootDir` `.`, no `outDir` (d-2), `include` `bin lib global scripts packs test`
   (`.mts`), `exclude` `node_modules`, `.claude`, `test/fixtures`, `site`. `package.json` scripts: `build` (`tsc -b`), `check`
   (`tsc --noEmit`), `pretest` and `prepack` and `prepare` run `build`; `engines` unchanged; `files` gains `!**/*.mts`,
   `!**/*.tsbuildinfo`.
2. `.gitignore`: `*.mjs` under `bin`, `lib`, `global`, `scripts`, `packs/*/hooks`, `packs/*/tools` and `test` is emitted and ignored
   (the hand-written ones are removed slice by slice; until a folder is converted its `.mjs` stay tracked: the ignore rule is added per
   folder as its last `.mjs` goes); `scripts/clean-emitted.mts` removes an emitted `.mjs` whose `.mts` is gone and runs in `build`.
3. The installer filter (d-2): `JUNK` in `lib/packs.mjs` skips `.mts`, `.d.mts`, `.map`, `.tsbuildinfo`; `global.mjs`'s `FILES` and
   `selftest-cache.mjs`'s `filesUnder` likewise; a test installs a pack whose folder holds a planted `.mts` and finds 0 in `.claude/`.
4. The shared types: `packs/base/hooks/lib/types.mts` with the shapes the constraints list, each field documented from the surveys'
   field tables (base-hooks section 5, cli-lib section 6), the selftest verdict row as `[label, unknown, unknown]`, the git result as
   one type (`{ ok, out, err, code }`).
5. The owners that do not exist yet, written typed and unit-tested before any slice converts onto them: `git-run.mts` (one git runner,
   one result type, an `identity` option for the selftests' commits), `files.mts` (`put`, `ensureDir`, `isDir`, `readText` with its
   8 MB cap, `walk` with the one junk filter, `scratchDir`), `hash.mts` (`shortHash`), `source-exts.mts` (one table of source
   extensions per language with `.mts` and `.cts`, read by `elements`, `dup`, `shape-code`, `file-size-guard`, `folder-law`,
   `coverage`), `run-as-hook` in `hook-log.mts` (the tail every hook writes today, with `--selftest` and the by-hand flags), `childError`
   in `files.mts`, `HOOK_FILE` regex in `packs.mts`; `selftest.mts`'s `runHook` returns the full spawn result; `json.mts` a leaf.
6. The gates, in `test/repo-lint.test.mts`, each seen red on its plant: `tsc --noEmit` 0 errors (a planted wrong type); 0 `any`,
   `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck` in sources (a planted `any`); 0 hand-written `.mjs`/`.js`/`.py` source in a folder
   marked converted (a planted stray `.mjs`); every shape of `types.mts` defined once (a planted second `interface Lock`); the emit is
   current (an `.mts` newer than its `.mjs` with no build); `file-urls` (KWB-163) reads `.mts`; the existing lints (no personal name,
   bare npx, synth word in base, file size by `layout.maxFileLines`) fold in; one tree walk for all.
7. The readers read `.mts` (item 5's `source-exts.mts`), each with a probe write through `once-only` and `file-size-guard` seen judged.
8. The LSP declaration the kit ships (d-3 as W1 decided): the plugin folder, enabled in the kit's `.claude/settings.json`; `LSP`
   answers on `types.mts`.
9. The pilot: `json.mts`, `project.mts`, `files.mts`, `git-run.mts` converted and in use by their first importers; built, installed into
   a scratch project, every unit and hook test that reaches them green.

**Done when:** `npm run check` exits 0 on the converted files; the six gates pass and each was seen red; a fresh install carries the
emitted pilot files byte for byte what `tsc` wrote and 0 `.mts`, with `doctor --strict` OK there; `once-only` and `file-size-guard`
judge a `.mts` write; the `LSP` tool answers definition, references and incoming calls for `readJson` on `json.mts` (listed in the
evidence); `npm run build` under 2 s warm on this Mac.

## W3. The core: `packs/base/hooks/lib`, by layer

Everything imports it, so it goes first and alone, in the import layers the base-hooks survey lists (L0 21 leaves, L1 10, L2 7, L3 8,
L4 7, L5 5, L6 2, then `run-hooks`). Three agents at once per layer, the files of a layer split evenly, each layer merged and green
before the next starts (a file imports only converted files).

1. Each file converted to `.mts` with explicit parameter and return types, every shape from `types.mts`, every copy of a helper
   replaced by its owner (the surveys' lists: four `git` signatures, the payload parsed four ways, `readText` twice, `real` three
   times, `esc` three times, nine short hashes, eight temp-folder makers, `ROOT` read five ways, `verdicts` hand-rolled six times).
2. The layering faults fixed as the layer is reached: `json` a leaf (W2), `hook-log` no longer importing `layout` and `event-log`
   for one key (survey base-hooks section 1).
3. `house.py` ported to `house.mts` with its selftest; nothing in base is Python after it.
4. `run-hooks.mts` last, typed on `types.mts`'s event and hook module interface (`hook(text)` returning a number, or a promise of one).

**Done when:** 0 `.mjs` or `.py` source left in `packs/base/hooks/lib` (the lint gate, the folder marked converted); `npm run check` 0
errors; every base hook's selftest green on the emitted lib (`doctor --fresh` in a scratch install: 0 problems); the unit tests of the
lib green; the copies taken out counted in the evidence against the surveys' lists (git runners 6 to 1, payload parses 4 forms to 1,
`real` 3 to 1, hashes 9 to 1, temp folders 8 to 1).

## W4. The slices, in parallel

Six agents at once, each its own worktree and branch, merged in this order when each one's Done when holds: (1) base hooks (26,
`packs/base/hooks/*.mjs`); (2) base tools (9, `packs/base/tools`); (3) the other packs' hooks, libs and tools (39 files across
audio-core, cpp, full-stack, gpu-painter, instrument-shell, postgres, reverse-engineering, sound-design, stellix, synth-creator,
ui-craft, zod; `browser-guard.py` ported to `.mts` on `judgeEvent` and `writesOf`, its `python3` settings entry retired in
`lib/settings.mts` `RETIRED`); (4) `lib/` (45) and `bin/`; (5) `global/` (3 hooks and its lib stub) and `scripts/` (4); (6) the test
helpers and fixtures (`test/kit-cli.mts`, `worktree-rig.mts`, `fresh-tmp.mts`, `fixtures/installs.mts` from W1.4's rewrite, the
`write`/`bash`/`transcript`/`withLayout`/`git`/`lockOf` helpers the tests survey lists).

Each slice, as it converts: every hook on `runAsHook` with the by-hand flags as options (18 of 26 base hooks are in the form today;
the differing ones listed in base-hooks section 3 and other-packs section 3); every hook exports `worktreeCase` beside `selftest`
(d-6); `stage-guard` calls git-guard's exported law instead of its own copy; `sound-design/pack.json` gains `requires: ["audio-core"]`
and the installer refuses a pack whose requirement is absent; `lib`'s 28 raw JSON reads, 8 git runners, 4 walkers and 7 layout
readers onto their owners (survey cli-lib section 4); `bin`'s `opts` bag typed; `catch` sites typed through `childError`; every
`process.argv[1]` compare onto `isMain`; `test-verdict`'s `--help` no longer runs the suite (KWB-123, red first).

**Done when:** for each slice, 0 `.mjs`/`.js`/`.py` source left in it (the lint gate per folder); `npm run check` 0 errors after its
merge; its hooks' selftests and worktree cases green on emitted code; the tests the picker reaches green; after the last merge, the
whole suite's counts equal or better than W0's baseline with every difference named; `python3` appears in no installed `settings.json`
(a scratch install of gpu-painter); `init sound-design` alone refuses with the requirement named (a test).

## W5. The tests: three tiers and one install per configuration

Four agents, the 87 test files split by name into four even groups, each test re-homed by d-6 and converted to `.test.mts`:

1. Unit: `test/unit/lib/NAME.test.mts` for every `lib/` module (NAME its file name) (18 have none today: `sync`, `switches`, `manifest`, `claude-md`,
   `backup` among them; survey tests section 6.1) and for every hook lib with logic of its own; imports the `.mts` (d-4).
2. Hook: `test/hooks/PACK/HOOK.test.mts` for all 45 hooks (PACK and HOOK their names): the selftest, the exported worktree case, and the refusals that today
   sit in `kf-refusals` (27), `kf-fail-open` (20), `routes` (18), `rust-pack` (19), `lookup` (12), `review-packs` (22), `audio-packs`
   (17), `structure`, `micro`, `logging`, `instances`, `shape`, `once-only`, `cpp-pack`, `content-sites`, `every-language`, `rust-dry`,
   `sub37-wb`, `other-projects`, `kit-guards`, `install-fixes`, fired on a fixture copy; `test/tools/PACK/TOOL.test.mts` for the 25
   tools (tone-report, freeze and multi-find get their first).
3. Integration: about 18 flows that install on purpose (install, update, noop against the per-version manifest, doctor and its cache
   and timeout, new, scan, workorder and its check, global, release, worktrees and twins, hook-proof, hook-timing, configurations,
   other-projects, custom-packs, kit-lock, test-changed), each on the fixtures; `house.test.mjs` split so no file sums over 60 s.
4. Fixtures: `test/fixtures/installs.mts` builds each of about 14 configurations once per run by the `fresh-tmp` hand-off and a build
   lock, `fixture(name)` returns a copy with W1.4's path rewrite; `holdsEachCase`'s 27 installs become one all-packs fixture; the 20
   files under `test/fixtures/noop/` stay as the seed of the noop integration test; the two profiles move to `test/fixtures/profiles/`
   and `--profile` takes a path.
5. `test/repo-lint.test.mts` takes the 11 reader tests (W2.6) and the generated-artefact checks (W7).

**Done when:** 0 `.test.mjs` left; `npm run check` 0 errors over the tests; the whole suite green with every test of W0's baseline
present by name (a list diff in the evidence: added and renamed, 0 removed); 161 `init` call sites down to under 40 (the fixture builds
plus the deliberate installs, counted by the tests survey's scan rerun); no test file over 60 s summed in the suite log; the suite's
wall under 300 s on this Mac.

## W6. The kit, end to end, and the change-to-tests map

1. The picker (`scripts/test-changed.mts`) on d-7: the path function for the tiers, `pack.json` `tests` and `requires`, the `.mts`
   import graph for libs, changed functions read from `.mts`; the selftest cache keyed per hook plus its transitive imports and kept in
   `~/.cache/claude-packs`; `docs/**` reaches the repo lint (KWB-131). Measured on three real diffs against the W0 baseline picker.
2. The kit's own install (`update --dir .`): the emitted hooks and tools in `.claude/`, `kit-lock.mts` converted, `doctor --strict` OK.
3. The npm package: `npm pack`, 0 `.mts` in the tarball, installed into a fresh project under `node_modules`, `init --config node`
   and `doctor --strict` OK there with Node 22 semantics (the `@types/node` 22 check and a run under the oldest Node 22 the machine has).
4. kit-fresh after the conversion (survey open-work section 6): its selftest and `--check` green on the emitted file; the `work/` version-prefix
   rule reads 2.0.0.
5. The `LSP` tool on the kit: definition, references and call hierarchy for one function of each layer (`readJson`, `writesOf`,
   `sync`), listed.
6. One-hook and one-lib gates timed: `no-find.mts` touched, `layout.mts` touched.

**Done when:** each of the six measured in `build/evidence/W6/`; the one-hook gate under 60 s and the one-lib gate under 90 s on this
Mac (from 139 s to 1,456 s and 56 s to 529 s at W0); the picker picks for a hook change its own test, its selftest and the noop
integration test and nothing else (listed); `npm pack` size and `tsc` build time recorded against W1.

## W7. Packs from one template, and the hand-kept facts generated

Three agents in parallel on disjoint files: (a) the pack content, (b) the configurations, (c) the generators.

1. The template, one canonical form per kind, from the pack-content survey section 4 (rule: `# concepts:` + `paths:` or `# hook:`, one H1
   under 110 characters, a reason paragraph, `<constraints>` with `Always do:` and `Never do:`, `## Check` naming the checks that point
   at it; check: the field order, `exclude` from one shared default, `kind`, `code`/`strings`/`language` stated, `good` a real fix;
   skill: `description` "Use when", `# Title (one job: ...)`, `<constraints>`, `## Output`, references cited by file name; pack.json: the
   required fields and `concepts`, `folders`, `hooks`, `skillsIn`, `tests`, `requires`, `fits` always present); `new-pack` and a new
   `add-lesson-check` command scaffold from it (the generator fills `exclude`, `rule`, `kind`, runs the lesson selftest), in
   `lib/pack-template.mts`.
2. The conformance gate `test/pack-content.test.mts` over every pack: the hard set now (R2, R3, R4, C1, C4, S1, S2, S5, P1, P2, P5, P6 of
   the survey's section 5) and the rest ratcheted (a stored number that may only fall); the content fixed to the hard set: 3 unclosed
   `<constraints>`, 1 check with no rule, 10 descriptions, 1 hook in the wrong pack, the 17 js-ts rules in the old form rewritten into
   the template (the kit's own TypeScript rules first), the two skills both named hover-state (gpu-painter's and ui-craft's) given one name each, the five `*-repeats-become-templates` rules made one
   base rule with per-language references, `ui-matches-reference-look` and `page-matches-reference-look` one rule.
3. The configurations (survey configurations sections 1, 2, 8): one base configuration with per-configuration deltas (the 64 identical
   preamble lines once, the shared folders and kinds once); `hookOrder` deleted for a per-hook `order` in `pack.json`; `choose` replaced
   by `fits` on each pack; the three work-order templates on `{{kit}}`; `claude-ai-skill` retired for `planner-skills`.
4. The generators (d-8): `scripts/counts.mts` writes the README's five tables between markers, the site's six `data-count`s, the
   per-version manifest of installed files and hashes that noop reads, `docs/rules-without-checks.md`, `docs/versions.md`'s rows
   from `package.json`; `--check` fails when the file differs from the generation; `history.md` cut to a pointer; `ui-craft-sources.md`
   into its pack.

**Done when:** the conformance gate passes with its hard set and each hard check was seen red on a plant; the ratchet file holds the
remaining counts (from 266 files failing today) and a test refuses a rise; `new-pack` and `add-lesson-check` scaffold a pack that passes
the gate (a test); 8 configuration files hold under 60 lines of deltas each over one base; `counts --check` is green and each of the 5
tests it replaces is deleted; 0 literal `npx` kit commands in templates and planner text outside `kitCommand`; every pack's `tests`
names every code file in it (a test).

## W8. What a project pays per tool call

From the runtime-cost survey (section 8's budgets) and d-10. Measured on bandwarp's `.claude/hooks.log` and on a fresh install, by the
same log line, per event. Two agents in parallel on (1) and (2), merged in that order; (3) and (4) after.

1. One runner per event, in TypeScript: `settings.json` gets one entry per event; the runner reads a table the install writes
   (`.claude/hooks/hooks.json`: hook, events, matcher, timeout, async, order) and decides the matcher itself; the heartbeat is a file
   write inside it; `update` migrates an existing project's entries (noop's manifest records the change). Hooks made re-entrant: `ROOT`
   and the layout read per event from the payload's `cwd`, no `process.env` edits, no reassignment of `process.stderr.write` (the runner
   captures output per hook), no module singleton that outlives an event; a test runs two events of different checkouts through one
   runner process and sees each judged by its own checkout.
2. The resident runner and the Go proxy (d-10): `packs/base/hooks/resident.mts` (the daemon: the socket, one hook table loaded once,
   each event answered with the exit code and stderr, a reload when the lock hash changes, exit after an idle hour or at SessionEnd)
   and `proxy/client.go` in the kit (the client: connect, forward stdin, half-close, return the verdict; no daemon: say so, start one
   detached, exit 0); the release builds the four binaries through the build queue and `files` ships them under `packs/base/bin/`; the
   install picks the binary for the machine and writes `settings.json` entries that run it (one per event), falling back to the
   TypeScript runner of (1) where no binary fits; Go's version looked up and pinned with its row (`latest-versions`); the selftest of the
   client (a planted stale socket, a planted dead daemon, a planted path over 104 bytes) and of the daemon (a planted hook that throws,
   a planted lock change) each seen red.
3. The heavy hooks: git-guard at Stop served from a cache keyed by remote URL plus the sorted local branch tips (60 s, invalidated by a
   ref change), the live look capped at 1 s with the existing "not checked" note, a detached refresh after a push or commit; a
   per-session git state file (HEAD, branch, dirty list, keyed by the mtimes the status line already uses) kept by the resident runner
   and read by `chart-first`, `look-gate`, `suite-once`, `stage-guard`, `repo-litter`; `time-guard`'s scans detached; `lesson-checks`
   compiled at update by the lock hash.
4. Doctor holds each hook per event (not pooled) to the budget table: Pre Bash 100/250 ms p50/p95, Pre Write 120/300, Post 60/150,
   Prompt 80/150, SessionStart 150/300, Stop 200/1,000, per hook 10/50, worst 200; the status line served by the resident runner's state
   (its render under 80 ms, a refresh every 5 s); the selftest cache per hook plus imports in `~/.cache/claude-packs`.

**Done when:** a Bash call waits on 2 proxy processes (from 7 node runners), counted in a fresh install's settings and seen in its log,
each under 20 ms on this Mac without the hooks' own work (from 85 ms); a Write 2 (from 4); the proxy's and the daemon's selftests
green with every plant seen red; an install on a machine with no fitting binary runs the TypeScript runner of (1) and passes the same
tests; Stop's p50 under 200 ms and p95 under 1,000 ms over 50 Stops on bandwarp (from 1,880 and 7,785); no hook over its budget in a
day's log of bandwarp with its agents running; `doctor` red on a planted hook that sleeps 300 ms at one event (seen red); `init` plus
`doctor` in a fresh project under 60 s and `update` under 60 s on this Mac; the re-entrancy test green.

## W9. The release in five minutes

1. `npm run release` with `patch`, `minor` or `major` does the whole of it: the gate (`test:changed --base origin/main` on committed work), the bump
   in `package.json` and the lockfile, the CHANGELOG heading from "unreleased" to the version and date (refusing an empty section), the
   generators (W7.4), the landing (fetch, merge `origin/main` into the branch, the branch into `main`, push `main`, fast-forward the main
   checkout), `npm publish`, the tag, the GitHub release; each step skipped when done, `--dry-run` prints the plan; refusals as today.
2. Measured three times: a one-hook change, a one-lib change, a content change; each from the command to `npm view` showing the version.
3. 2.0.0 released by it: the CHANGELOG's 2.0.0 section (1.9.0 folded in with KWB-165 to 167 and the admiral pack), `main` on GitHub,
   npm's `latest` (no prerelease on `latest`: kit-fresh compares three numbers).

**Done when:** each of the three releases under 300 s wall on this Mac, in `build/evidence/W9/`; 2.0.0 on npm and `main` equal to
GitHub's; bandwarp updated to it with `doctor --strict` OK and its status line reading 2.0.0.

## W10. Before calling it finished

Read the finished work as a senior engineer would: a type that says less than it could (`unknown` left where a shape is known), a
helper two slices wrote twice, a test that lost an assertion, a file over 250 lines, a hook over its budget, a pack file the template
gate ratchets instead of fixes, and the open rows of `workflow-bugs.md` (survey open-work: the 11 CARRY rows) against what the order
changed.

**Done when:** every finding is written in `progress.md` with its fix or why it stays, 0 left blank; the CARRY rows each say which step
touched their files and that behaviour was kept.

## W11. The report, with the comparison

1. The "after": every measurement of W0.5 (a) to (k) taken again on the finished kit, by the same command on the same machine, into
   `build/evidence/W11/after.md`; where a command changed (the release is now one command), the same thing measured end to end.
2. `docs/workorders/typescript/report.md`: the comparison table first (one row per measurement, before, after, the ratio), then what was
   converted (files and lines per folder, before and after), the owners made and the copies removed (counts against the surveys), what
   is proved and how, the bugs typing found (each KWB), what is not done (other languages' LSP, the CARRY rows, Windows natively), and
   what the kit did well and badly with counts from `logs`.

**Done when:** the comparison table has all eleven rows with a before, an after and a ratio, each after measured in this step (its
evidence file named); each of the report's 9 sections holds at least one number or a stated reason there is none (0 blank);
`npm run check` exits 0 and `test/repo-lint.test.mts` is green on the final tree; the report is pushed and
`docs/workorders/typescript/DONE` names the commit.

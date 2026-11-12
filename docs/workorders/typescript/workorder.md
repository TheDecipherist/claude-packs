# Work order: typescript

Written 2026-11-11 from a ten-part survey of the kit (`docs/workorders/typescript/survey/*.md`: typescript-tooling, base-hooks,
other-packs, cli-lib, tests, repeats, pack-content, configurations, runtime-cost, open-work), an independent review of the first
draft (`docs/workorders/typescript/review-1.md`: 24 gaps, 17 contradictions, 15 unmeasurable clauses), a second review of the Go
proxy and the resident runner with its own probes (`docs/workorders/typescript/review-2-go.md`: 62 rows, 13 that break every call;
both folded in below, each row cited where it lands) and the user's instructions of the same day: "we should 1000% use typescript everywhere humanly possible ... and LSP ... convert the entire kit
properly to typescript with LSP support. then fix the publish stage for speed after"; "it needs to be done methodically"; "we must
follow all best practices and DRY as a senior developer would do this"; "all packs should use DRY and include shared helpers and
modules for everything and made in a super easy way to track and test what changes per commit so tests and publish stage can be
reduced as much as humanly possible"; "a pack should have a template that follows the exact same writing style every time"; "make sure
that both typescript and LSP is enforced and a dependency of the kit going forward"; "it should not take any longer than at max 5 min
to publish claude-packs, and that means committed, on main, npm published"; "all checks done by claude-packs when installed in
someone's project have the same time constraint"; "use go as a proxy ... it somehow kept node open and every request from a hook went to
go then to node ... we still use typescript. hooks are just run through go as a proxy"; "like a promise all for hooks ... if any of them
says exit 2 it stops"; "a comparison run to the new 2.0 kit with go and typescript vs the old kit".

**What this is.** `@thedecipherist/claude-packs` (the kit) is 279 hand-written `.mjs` files (25,594 lines) and two Python files with
no type anywhere, while its own `js-ts` pack tells projects to write strict TypeScript. This order makes the kit what it asks of others:
every source file strict TypeScript (`.mts`), built by TypeScript 7's native compiler into the plain `.mjs` that projects receive
unchanged; one owner for every helper (a git runner, a JSON read, a payload parse, a hook's tail, the shell lexer) instead of the 4 to
22 copies the survey counted; a test layout where a changed file's tests are a path function, so a one-hook change runs in seconds;
packs written from one template and held to it by a gate; the counts, tables and lists the kit keeps by hand generated from the packs;
the language server working on the kit for Claude Code's `LSP` tool; TypeScript and the server enforced in the kit and in the projects
whose configuration is JavaScript; a project's hooks run in parallel inside one resident process behind a small Go proxy, so a tool
call waits on two 7 ms starts instead of seven 85 ms ones; and a release that goes from a commit to npm in under five minutes.
Finished looks like: 0 hand-written `.mjs`, `.js` or `.py` source in the kit (Go's one client the named exception); `tsc --noEmit` 0
errors under the strict set; 0 `any` and 0 suppressed errors; every shape defined once; the whole suite green with every test of the
baseline present by name or listed as a replaced one; `LSP` answering definitions, references and call hierarchy on the `.mts` from a
fresh session; a one-hook gate under 60 s and a small release under 300 s, both measured; a project's Bash call waiting on 2 proxy
calls; 2.0.0 on npm with the before-and-after table in the report.

**The position.**
- *Known (measured 2026-11-11):* TypeScript 7.0.2 compiles the current 105-file sample in 0.55 s cold and 0.10 s warm and reports
  1,849 errors on it (about 1,500 untyped parameters, about 230 real shape errors); the whole tree is about 1.7 times that. Node
  refuses `.mts` under `node_modules`, so the shipped CLI and the hooks a project runs must be emitted `.mjs`; Node strips types by
  default from 22.18 (the kit's dev tree runs `.mts` directly; `engines` stays `>=22` for projects). Claude Code's `LSP` tool starts
  `typescript-language-server --stdio` from PATH through its official `typescript-lsp` plugin, which is enabled on this machine and
  fails with ENOENT; that server (6.0.3) does not work with TypeScript 7.0.2 and does with 6.0.2; TypeScript 7 has its own server,
  `tsc --lsp --stdio`, proved only to answer `initialize`. The installer copies every file under a pack's `rules`, `checks`, `hooks`,
  `tools` and `skills` (`lib/packs.mjs` `CLAUDE_DIRS`, `JUNK`) with no extension filter, and `files` ships `packs` and `lib` whole.
  Pack hooks import `./lib/x.mjs` files that exist only in the merged install, never in `packs/PACK/` (other-packs section 1). The
  picker (`scripts/test-changed.mjs`) and `changed-functions.mjs` read only `.mjs` and `.js`. The suite: 620 tests, 26 min wall;
  installs are 99.7 % of its seconds; one `init` plus doctor costs 14 s; `audio-core` is installed 40 times a run; `house.test.mjs`
  alone sets 92 % of the wall. A project's Bash call starts 9 node processes; a native process start costs 5 to 7 ms here, a node start
  57 ms, one node runner with six hooks 85 ms; the prototype resident runner behind a Go client answered the same six hooks in 16 ms
  with correct verdicts; a worker thread with all 37 of bandwarp's hooks imported starts in 22 ms and holds 5 to 10 MB; a 1 MB payload
  passes the socket whole; two overlapping events captured through `process.stderr.write` cross their refusals (review-2 section 0);
  `process.chdir` throws in a worker; `shell-writes.mjs` and `idle-wake.mjs` do work at import; a stale socket makes the prototype
  client exit 0, which Claude Code never reports; npm sets no quarantine flag on a binary, and Go's linker ad-hoc signs darwin/arm64,
  so a binary edited after the link is killed; git-guard at Stop has a median of 1.7 s because it asks GitHub live. Matching hooks
  of one event already run in parallel in Claude Code (hooks.md), so a summed median overstates today's cost; the baseline measures
  wall. 29 hand-kept copies of facts, 22 held
  by no test. 266 of 735 pack content files would fail a strict conformance gate today. Go 1.27.0 is installed.
- *Not known yet (W1 settles each by a probe with a number):* whether `tsc --lsp` serves the `LSP` tool for definitions and
  references on `.mts` from a fresh session, or the kit must carry `typescript-language-server` with TypeScript 6 beside 7; how the
  compiler resolves the merged-install imports of pack hooks; `tsc`'s time and error count on the whole tree; what a copied install
  needs rewritten; the daemon under eight clients racing to start it, a 1.7 s hook in flight, a kit update and a kill mid-event; the
  round trip of a repetition-index query from a worker to the main thread.
- *Cannot be proved here:* Windows natively (the kit runs on Windows only through WSL: the user, 2026-11-11); hosts other than Claude
  Code; Node 22.0 to 22.17 (none installed); a release's wall time on another machine (this Mac's program starts cost about 30 times a
  Linux box's); npm's OTP prompt, if the account has one, which is a person's step and stays outside every timed release; the proxy
  binary on a macOS older than Go's minimum, on a shared Linux box with another user, or under WSL (the `sh` picker falls back to
  the TypeScript runner on each; stated as not proved in the report).

**The sources.** The kit (`~/projects/claude-packs`, branch `work/2.0.0-typescript`), `CLAUDE.md`, `workflow-bugs.md`,
`docs/platform-audit.md`, `docs/versions.md`, the ten surveys and the review under `docs/workorders/typescript/`, each claim with its
path. TypeScript 7.0: https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/ , https://github.com/microsoft/typescript-go ,
https://www.typescriptlang.org/tsconfig/ . Node: https://nodejs.org/api/typescript.html . Claude Code: https://code.claude.com/docs/en/hooks.md
(the hook contract: stdin JSON, exit 0 and 2, stderr, JSON on stdout, timeouts), https://code.claude.com/docs/en/plugins/code-intelligence.md
and manifest-reference.md (an LSP server is a plugin's `lspServers`: `command`, `extensionToLanguage`, `${CLAUDE_PROJECT_DIR}`). Timing:
`~/projects/claude-packs-notes/.mac-suite-1.log`, the session's `gate-1.9.0-4.txt`, bandwarp's `.claude/hooks.log` (89,746 timings over
4 h 13 min with seven agents; read once into a replay fixture at W0, never written to). The daemon prototype and review-2's probes:
copied at W0 into `docs/workorders/typescript/probes/proxy/` (`daemon.mjs`, `client.go`, `probe-daemon.mjs`, `probe-two.mjs`,
`probe-workers.mjs`, `probe-worker-body.mjs`).

**The foundation.** Reused, never written again: the installer's pipeline (`lib/sync.mjs` and what it calls), the hook runner
(`packs/base/hooks/run-hooks.mjs`: its output merge and crash policy), the selftest library (`packs/base/hooks/lib/selftest.mjs`), the
JSON helper (`json.mjs`), the shell lexer (`shell-lex.mjs`, `command-prefix.mjs`), the repetition readers (`elements`, `code-shapes`,
`near-copies`, `repo-index`, `languages`), the test helpers (`test/kit-cli.mjs`, `test/worktree-rig.mjs`, `test/fresh-tmp.mjs`), the
picker (`scripts/test-changed.mjs`: its import graph and `selftestsOf`), the release script (`scripts/release.mjs`), kit-fresh and the
selftest cache. Converted and given one owner per helper; behaviour stays unless a step says what changes and why.

**Models.** The conversion of a large JS tree is done behind a compiler that refuses `any`, leaves of the import graph first, shared
shapes before their users, each slice green before the next starts (base-hooks: 7 layers, 6 hubs, 21 leaves). The test layout is the
tests survey's three tiers plus one repo lint. Shipping a Go binary through npm is done the way TypeScript 7 ships its own compiler.
Not taken: a big-bang rewrite, `// @ts-nocheck`, `any` as a crutch, a `dist/` mirror that would rewrite every path import (cli-lib
section 2), shipping `.mts` to projects, a second build of the same code, a client that lets an unjudged event through, a daemon per
session (one session's end would kill the others' laws), output captured by reassigning a process stream (it crosses under two
events), one hook that both judges and records (a refused write would be recorded), a per-platform optional npm package per binary
(a lockfile written on one OS omits another's), a binary committed into every project's git (d-13).

<constraints>
Always do:
- Work the steps in order; inside a step, slices run in parallel only where the step says so, each agent in its own worktree under
  `.claude/worktrees/SLICE` on a branch `work/2.0.0-ts-SLICE` from `work/2.0.0-typescript` (d-11), started with `npm ci && npm run
  build` so the emitted `.mjs` exist there, merged back in the order the step gives, each merge with the tests the picker reaches
  green, and after every merge into the order's branch `npm run build && node bin/claude-packs.mjs update --dir .` so the kit's own
  hooks run the new code.
- Prove each step's "done when" by running it, and keep the evidence in `build/evidence/W0/` to `build/evidence/W12/` (ignored by git;
  the progress line names the file and the number). A timing is taken with no other run on the machine, with the load average
  recorded, as the median of two runs.
- Give every new gate a planted fault that turns it red, and show it red; the plants each step names are the least.
- Type everything strictly: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`,
  `verbatimModuleSyntax`, `isolatedModules`, `erasableSyntaxOnly`, `useUnknownInCatchVariables` (W2's tsconfig). `unknown` and a
  narrowing where a value's shape is not known, never `any`. No `enum`, no `namespace`, no parameter properties.
- Define every shared shape once, in `packs/base/hooks/lib/types.d.mts` (the hook event payload and each tool's `tool_input`, a write,
  the layout, the lock, `design/shape.json`, a pack manifest, a configuration, settings.json's hook groups, the selftest verdict row,
  the git result, the hook interface, the declared interface of each installed module the CLI imports dynamically) or beside the one
  module that owns it, exported; import it everywhere else. A second definition of the same shape is a fault (W2's gate). Only the
  lead edits `types.d.mts`, `.gitignore`, `package.json`, `CHANGELOG.md` and hands out KWB numbers; an agent proposes a type or asks
  for a number in its report.
- Give every helper one owner, as the repeats, base-hooks and other-packs surveys list them (W2.5 and W3), and take every copy out in
  the same commit that converts the file holding it. A copy with one line changed is still a copy.
- Keep behaviour: a conversion changes types and owners, not what the code does. Where typing shows a real bug, or an owner's merge
  would change a result (the two `real` helpers differ for a path that does not exist), log it in `workflow-bugs.md` first (`KWB-`
  and the number the lead gives), decide it with its test seen red, and say so in the progress line.
- Keep every file under 300 lines (`file-size-guard`, reading `.mts` from W2); split by what the code does; typing lengthens
  `shape`, `version-pin-guard`, `names-sweep`, `making-check` and `time-guard` past the line, so each is split as it is converted.
- Record each decision in `docs/workorders/typescript/decisions.md` as it is made (`d-` and its number: the question, the options,
  the choice, why); d-1 to d-13 below get their rows at W0.
- After every finished item, one line in `docs/workorders/typescript/progress.md`: `- 2026-11-12 W3.2: what, evidence, commit`
  (the step and item). After every finished step, `docs/workorders/typescript/status.json` as the PROMPT says.
- Stage by name, commit with `-- ` and the paths; push every commit; never rebase, amend or force. Every build and test through the
  project's commands (`npm run build`, `npm run check`, `npm run test:changed`, `npm test` only where a step names it, in a session
  whose prompt asks for the whole suite).
- Run the kit's own command as `node bin/claude-packs.mjs` after a build, never `npx` (the published 1.8.2 is not this tree). Faults
  go to `workflow-bugs.md` (the kit has no `bugs.md`).

Never do:
- Commit an emitted `.mjs`, a `.tsbuildinfo`, a built binary, `node_modules`, a secret, or a file under `test/fixtures` that holds a
  person's path.
- Use `any`, `as any`, `// @ts-ignore`, `// @ts-expect-error`, `// @ts-nocheck`, or a non-null `!` where a check could stand.
- Change what a project receives except as listed here, each with its entry in the per-version manifest (W5.4): the new base libs
  (`git-run`, `files`, `hash`, `source-exts`, the hook table `hooks.json`), `browser-guard.py` and `house.py` replaced by `.mts`
  ports, the duplicated hover skill renamed in one pack, the five `*-repeats-become-templates` rules made one, `ui-matches-reference-look` folded into
  `page-matches-reference-look`, `--profile` taking a path, `resident.mjs`, the `sh` picker `.claude/hooks/bin/hook-proxy`, the hook
  table `hooks.json` generated from the packs, `once-only`'s index update moved to PostToolUse, `refreshInterval` 5, and W8's settings
  shape. Installed names otherwise stay (`.claude/hooks/*.mjs`, `.claude/hooks/lib/*.mjs`, `.claude/tools/*.mjs`); the Node 22 floor
  stays; no binary is written into a project (d-13).
- Weaken a test to pass a conversion, or drop a test outside the replaced set W5 lists, or mark a step done that was not measured.
- Run the whole suite on the run's own initiative: only where a step's Done when names it (W0, W4, W5, W6, W12), from a session
  whose prompt asks for it (`run.sh` passes it; W0.6 proves `suite-once` accepts that prompt).
- Write into bandwarp or any other project: its log is read once into a fixture at W0; its update is the user's step after 2.0.0.
- Publish, except at W12 with the user's yes written into the PROMPT; the timed releases of W9 use `--dry-run` and a local registry.
- Leave a decision open: take the recommended choice, record it, go on.
</constraints>

## Decisions taken by this order (recorded as d-1 to d-13 at W0; the user may overturn any)

- **d-1 The branch.** `work/2.0.0-typescript` from `work/1.9.0-platforms` (every fix of 2026-11-11, unreleased). 1.9.0 is not published
  separately; its CHANGELOG section folds into 2.0.0 (open-work section 1).
- **d-2 The emit layout.** A `.mts` source emits its `.mjs` beside it (`rewriteRelativeImportExtensions`), the `.mjs` ignored by git and
  built by `npm run build`; the installer skips `.mts`, `.d.mts`, `.map` and `.tsbuildinfo` (`JUNK`); `files` excludes them; a per-folder
  `.gitignore` is never used (it would act on `npm pack`). Why: every path import in `lib` (14 files), `bin`, `global` and the kit's own
  install keeps working, and the installed files are byte for byte what `tsc` wrote; the `dist/` option rewrites every one of those paths
  and copies the content files twice (typescript-tooling 4, cli-lib 2). Its failure modes are held by `pretest`, `prepack` and `prepare`
  running the build, by every worktree starting with a build, and by W2's gate that the emit is current (built into a temporary folder
  and compared byte for byte). `test/` is not emitted: a second `tsconfig.test.json` with `noEmit`, and the test script globs
  `test/**/*.test.mts`. A module that holds only types is a `.d.mts`, so nothing empty is installed.
- **d-3 The dependencies.** Kit `devDependencies`: `typescript` 7.0.2 (build and `--noEmit`), `@types/node` at the newest 22.x; Go pinned
  by version for the proxy's build (a build-time dependency of the kit; the binaries ship, Go does not). The language server: decided by
  W1's probe between `tsc --lsp --stdio` (one dependency) and `typescript-language-server` 6.0.3 with TypeScript 6.0.2 aliased beside 7
  (two); the recommended choice is `tsc --lsp` if it answers definitions and references on `.mts` through the `LSP` tool in a fresh
  session, else the pair. The kit ships its LSP declaration as a Claude Code plugin folder (`.claude-plugin/plugin.json` with
  `lspServers`, `command` under `${CLAUDE_PROJECT_DIR}/node_modules/.bin`), enabled in the kit's `.claude/settings.json`, with the global
  `typescript-lsp` plugin disabled there (one server per extension, the first wins). `typescript` is not a runtime dependency of the
  package: what ships is `.mjs`.
- **d-4 What the tests import.** Unit tests (`.test.mts`, run by node's type stripping) import the `.mts` sources, so the `LSP` and the
  compiler see each test as a reference. The hook tier runs each hook's emitted `.mjs` as a project runs it, and the integration tier
  installs from the packed tarball, so the shipped code is what is proved; one test holds d-4 by asserting that a hook's emitted
  verdict equals its source's on the same event. The kit's own dev needs Node 22.18 or newer (CLAUDE.md says so); projects keep `>=22`.
- **d-5 TypeScript enforced in projects (its own step, W8).** At `init`, a project whose configuration is `node` or `full-stack`, or
  that takes the `js-ts` pack, gets `typescript` and the language server as devDependencies (the kit's own pinned versions), a strict
  `tsconfig.json` where it has none, the LSP plugin declaration, and the `typescript-only` check (lesson-checks, globs `**/*.{js,mjs,cjs}`
  under the project's source folders, refusing a write of a new one; a planted `.mjs` seen red); `doctor` is red when such a project
  lacks `typescript` or the declaration. An existing project takes it through `enable` (CLAUDE.md: no new law switches on silently).
  Other languages' servers (clangd for `cpp`) are listed open at the end.
- **d-6 The test tiers.** `test/unit/lib/NAME.test.mts` for `lib/NAME.mts`, `test/unit/hooks-lib/NAME.test.mts` for
  `packs/PACK/hooks/lib/NAME.mts` (the two trees share names: `layout`, `shape`, `run-status`), `test/hooks/PACK/HOOK.test.mts`,
  `test/tools/PACK/TOOL.test.mts`, `test/integration/FLOW.test.mts`, `test/repo-lint.test.mts`; fixtures: one install per configuration
  built once per run and copied per test. From the tests survey section 7.
- **d-7 The change-to-tests map.** A path function first (the tiers), then `pack.json` `tests` (every code file of a pack a key) and
  `requires`, then the `.mts` import graph for libs; the hook selftest cache keyed per hook plus its own transitive imports; `docs/**`
  reaches the repo lint (KWB-131). Names and quoted basenames are no longer a rule.
- **d-8 Generated, never hand-kept.** The README's five tables, the site's six counts, the per-version manifest of installed files that
  replaces noop's lists, `docs/rules-without-checks.md`, `docs/versions.md`'s rows, the status-line sample and the planner's version
  lines: one generator, `scripts/counts.mts`, run by the release; the tests that held the numbers become one `--check`.
- **d-9 Runtime in a project.** One runner process per event first (the matcher table decided inside it), git-guard's Stop verdict
  cached and capped at 1 s, a per-session git state file, doctor holding each hook per event (not pooled) to a budget; doctor's checks
  that are constant per kit version (lesson-checks' and shape-symmetry's selftests, skill lengths, manifests) cached by the kit's
  version, and `loadCustomPacks` fetched only by `init`, `add`, `update`. From the runtime-cost survey section 8 and review G8.
- **d-10 A resident runner behind a Go proxy, hooks in parallel (the user, 2026-11-11; review-2 sections 1 to 4).** Every hook stays
  TypeScript. *One daemon per project folder* (the `realpath` of `CLAUDE_PROJECT_DIR`), shared by every session and agent there (a
  worktree agent's `CLAUDE_PROJECT_DIR` is the main checkout; its `cwd` is the worktree), never per session: one session's end must
  not take the others' laws. It holds the hooks loaded once and answers events over a unix socket whose name is a hash of the user id,
  the project's realpath, the lock's hash and node's path, in a folder of mode 700 (`$XDG_RUNTIME_DIR/claude-packs/` where set, else
  `~/Library/Caches/claude-packs/` on macOS or `~/.cache/claude-packs/` on Linux and WSL; `/tmp/claude-packs-UID/` when the path would
  pass 100 bytes); so a kit update, another project or another node means another daemon by construction, and the old one exits when
  idle. *The client* is a small Go program Claude Code starts per event: it reads the lock, computes the socket name, connects, sends
  one framed request `{v, env, cwd, ppid, deadline}` and then stdin, reads one framed reply `{code, stdout, stderr}`, writes stdout
  then stderr byte for byte and exits with the code. *Never fail open silently:* with no daemon, a stale socket, a reply cut short or
  a deadline missed, the client runs the TypeScript runner of W8.1 on the same event itself (judged, 85 ms as today) and starts a
  daemon behind it, detached in its own session, cwd `/`, env reduced to `HOME`, `PATH` and the cache folder, under an exclusive lock
  file (`wx`, holding the pid) with a `ready` pipe, so eight racing clients make one daemon; it fails open only when node itself cannot
  start, and then says so in a `systemMessage`. *Per-event context:* every hook receives a `ctx` (`projectDir`, `cwd`, `env`,
  `sessionPid`, `now`) built from the client's request, never the daemon's own `process.env`, `cwd` or `ppid` (eleven hooks freeze
  `ROOT` at import today; agents-held and time-guard walk the ppid chain); the daemon loads hooks only from the folder its hash names,
  and a request whose `projectDir` is another folder is answered by the TypeScript path. *Judges and recorders:* a hook is a judge
  (`parallel`, writes nothing, proved by a write trap in its selftest) or a recorder (`serial`, refuses nothing), never both; a Write's
  judges run at once in a pool of 2 warm worker threads (grown on demand to 8, retired after 2 idle minutes, recycled after 500
  events), the main thread doing only socket I/O, framing, the table, the repetition index (queried by message) and every state-file
  and timing write; after the first exit 2 the daemon waits up to 30 ms for the rest and returns every refusal sorted by table order,
  so the same call reads the same; recorders that record the call itself (the event log, the heartbeat) run for every call, updaters
  (`once-only`'s index, at PostToolUse) only when the verdict was 0; a hook finishing after the reply is logged `late`; a worker that
  exits is replaced and its hook counted as a crash; a daemon exits after 15 idle minutes (hook events only; status-line requests do
  not count), re-execs after 24 h or 400 MB RSS between events, logs to `daemon-HASH.log` in the cache folder. `async` and
  `asyncRewake` hooks (`heartbeat`, `idle-wake`) keep their own settings entries and never go through the daemon. Trust is as today: a
  project's committed hooks run for that project only. Measured on this Mac with the prototype: 16 ms an event against 85 ms, 92
  events judged right; a loaded worker 22 ms and 5 to 10 MB. Go's client is the one hand-written non-TypeScript source, in `proxy/`
  with its own gate (`go vet`, `hook-proxy --selftest` against fake daemons it starts in-process).
- **d-13 Where the binaries live.** Four binaries (darwin-arm64, darwin-amd64, linux-amd64, linux-arm64) built by `scripts/build-proxy.mts`
  with `CGO_ENABLED=0 -trimpath -buildvcs=false -ldflags "-s -w"` (about 2 MB each, reproducible: two builds of one source give one
  sha256; nothing edits a binary after `go build`, since Go's linker ad-hoc signs darwin and macOS kills an edited one), shipped in the
  tarball under `packs/base/hooks/bin/OS-ARCH/`. A project receives no binary: the entry runs `.claude/hooks/bin/hook-proxy`, a POSIX
  `sh` line that picks by `uname -sm` and `exec`s `~/.cache/claude-packs/bin/KIT-VERSION/OS-ARCH/hook-proxy` (or the macOS cache
  folder), else `exec node .claude/hooks/run-hooks.mjs`; `init`, `update` and `doctor` copy the machine's binary into that cache by
  copy-then-rename (never in place). Why: projects commit `.claude/` (bandwarp tracks 398 files there), so one platform's binary in it
  breaks every hook on the PC under WSL, and four of them are 8 MB in every project's git per update; a clone on a machine that never ran
  the kit uses the TypeScript runner, judged and slow, and `doctor` says which path is live. The per-platform optional-package route is
  not taken (review-2 5.1).
- **d-11 Slice branches.** `work/2.0.0-ts-SLICE` from the order's branch (CLAUDE.md's `work/VERSION-TOPIC` form, from the order's branch
  rather than the trunk because the order's branch is the trunk of this work).
- **d-12 Replaced tests.** The name diff of W5 allows exactly the replaced set it lists (the 11 reader files into `repo-lint`, the 5
  count tests into `counts --check`, the hand-number assertions of `json-ratchet`, `kf-refusals`' totals, `names-sweep`'s 2000,
  `base-neutral`'s moved list); every other baseline test is present by name.

---

## W0. Set up

The kit installs itself from its own packs (`update --dir .`); this block names what it runs.

```claude-packs
configuration: base
packs: base
```

1. The branch `work/2.0.0-typescript` from `work/1.9.0-platforms`, pushed (done); d-1 to d-13 written to
   `docs/workorders/typescript/decisions.md`; the folders this order adds (`.claude-plugin/`, `proxy/`, `packs/base/hooks/bin/`,
   `test/unit/`, `test/hooks/`, `test/tools/`, `test/integration/`, `test/fixtures/profiles/`, `docs/workorders/typescript/probes/`) in
   `.claude/layout.json` first; the daemon prototype and review-2's four probe scripts copied from the session's scratchpad into
   `probes/proxy/`.
2. Merge `origin/work/1.9.1-admiral-skill` (5e19ef5: the `admiral` pack with one skill; open-work section 5, the one live branch; the
   PC session asked and the user said yes in the Mac session, 2026-11-11) into the order's branch: one copy where the README row and
   site counts overlap, its CHANGELOG line under 2.0.0, the skill gains the rule "watch a session with get_replies(since) or watch(),
   not wait_for_reply on one message" with its "When it will not connect" row (A reply never arrives | it answers another chat's message
   | read the session, not the message); the pack is kept and gets its tests at W5.
3. The four stale open rows closed in `workflow-bugs.md` (KWB-154, 124, 120, 116: done already, open-work section 2), as their own
   commit; KWB-166 stays open until W9 measures the release.
4. Versions, with their rows in `docs/versions.md` (`latest-versions`): `typescript` 7.0.2 and `@types/node` 22.x newest pinned in
   `package.json` as devDependencies; Go's current stable looked up and pinned with its row, `go version` checked at W8; the language
   server's row after W1 decides it.
5. The baseline, the "before" of the comparison the user asked for: every number below measured on this Mac on the branch's first
   commit, by the method named, into `build/evidence/W0/baseline.md`, so W11 can measure the "after" the same way: (a) the whole suite
   once (`npm test`, the one full run before W4): tests, pass, fail, each failing test's name, wall; (b) a one-hook gate
   (`test:changed` with `packs/base/hooks/no-find.mjs` touched, then with `git-guard.mjs` touched): files picked, wall for each;
   (c) a one-lib gate (`lib/layout.mjs` touched); (d) a release rehearsal (`npm run release --dry-run` after the gate, the steps by hand
   that it does not do, timed from the commit to what would be the publish); (e) `init --config synth-creator cpp audio-core` plus
   `doctor` into a fresh folder, with the selftest cache empty and then warm; (f) `update` on a copy of that install; (g) a project's
   events from bandwarp's `.claude/hooks.log`, read once into `test/fixtures/replay/bandwarp-hooks.jsonl` with every path and name
   replaced: node processes per Bash, Write, Read and Stop, and each event's wall (its first hook line to its last, since Claude Code
   already runs an event's hooks in parallel; never a sum of medians, review-2 1.12) as p50 and p95 per event, Stop's p50 and p95; (h) one Bash event through the
   runner and its six hooks, 10 starts timed (85 ms today); (i) the status line: a render's wall and the CPU a minute; (j) `tsc`'s build
   time (0 before: no build); (k) `npm pack` size and file count; (l) `doctor --fresh` on (e): the selftests' wall.
6. `suite-once` accepts the prompt `run.sh` passes for a full-suite session ("Run docs/workorders/typescript/PROMPT.md; this session runs
   the whole suite where a step's Done when names it"): proved by one planted `npm test` from that prompt allowed and one from the
   plain prompt refused; if the hook refuses the first, that is a KWB, fixed in the hook with its selftest before the baseline runs.

**Done when:** `decisions.md` holds d-1 to d-12; `.claude/layout.json` names the ten folders; `probes/proxy/` holds the prototype; the
admiral pack is on the branch with its skill rule and `npm run test:changed` green for the merge; the four rows are closed; the three
version rows exist and `package.json` pins two of them; `build/evidence/W0/baseline.md` holds all twelve measurements (a) to (l), each
with its command, its load average and its number; the replay fixture holds 0 paths or names of the user (a grep); every failing
baseline test is named in `progress.md` with its reason; `suite-once`'s two planted runs behaved as written.

## W1. Find out, before building (the riskiest first)

1. The language server, measured where the tool runs: a plugin folder `.claude-plugin/` declaring `tsc --lsp --stdio` from
   `node_modules/.bin` for `.mts` and `.ts`, enabled in `.claude/settings.json` with the global `typescript-lsp` plugin disabled; one
   small leaf converted to `.mts` in a scratch copy of the repo; a child session (`claude -p`, started after the settings change) asked
   for `goToDefinition`, `findReferences` and `incomingCalls` on it, its raw replies kept. If references or definitions fail, the same
   with `typescript-language-server` 6.0.3 and `typescript` 6.0.2 beside 7.0.2. Decide d-3's open half with the numbers.
2. The whole tree under TypeScript 7 and the merged-install problem: `tsc --noEmit` with `allowJs`, `checkJs` and the strict set over
   every `.mjs` of `bin`, `lib`, `global`, `scripts`, `packs`, the wall time and the error count per folder and per code; then the
   tsconfig that resolves a pack hook's `./lib/x.mjs` and a tool's `../hooks/lib/x.mjs` onto base's (`rootDirs`, or `paths`), proved on
   `packs/zod/hooks/schemas-only.mjs` and `packs/sound-design/tools/prove-a-bank.mjs`: 0 unresolved imports.
3. The emit, end to end, on two files (`json.mjs` and `project.mjs`, with `readText` moved out of `shell-writes` so `json` is a leaf):
   converted, emitted beside, `npm pack`, the tarball installed into a fresh project under `node_modules`, `init` from it carrying the
   emitted files only (0 `.mts`), their importers and `doctor --strict` green there, the lock's hash equal to `sha256` of the emitted
   file.
4. The fixture copy: `init --config base` into a folder, copied to a second folder, `doctor --strict` and three hooks fired in the copy;
   every absolute path in `settings.json`, the lock and the hooks' state that breaks, and the rewrite the copier needs.
5. The daemon (d-10), on the prototype in `probes/proxy/`, each with a number: eight clients racing to start it against no daemon
   (daemons started, events judged); a hook that sleeps 1.7 s in a worker while six other clients ask (the head-of-line wait on the
   main thread); a hook that prints JSON on stdout (an `additionalContext` at SessionStart) forwarded whole through a framed reply; the
   lock file changed during an event (what the next event runs, by the socket's name); the daemon killed during an event (what the
   client returns: a judged verdict from the TypeScript path, never exit 0); a stale socket file; a socket path of 101 bytes; a
   repetition-index query from a worker to the main thread by message (its round trip in ms on bandwarp's index size); a daemon started
   from a client with `CLAUDE_PACKS_UNATTENDED=1`, then an interactive client's event (judged by its own env). The 1 MB payload and the
   crossed stderr are settled already (review-2 section 0) and are not probed again.
6. The kit's readers blind to `.mts` (repeats section 5: `elements.mjs` CODE and MARKUP, `dup.mjs` SOURCE, `shape-code.mjs` CODE,
   `file-size-guard.mjs` SOURCE, `.cts` in the same four) confirmed by a probe write of a `.mts` through `once-only` and
   `file-size-guard`.

**Done when:** `docs/workorders/typescript/findings.md` holds, with numbers: the `LSP` tool's raw replies for the three operations under
each server tried in the child session, and d-3 completed in `decisions.md`; `tsc`'s wall time and error count per folder on the whole
tree, and the two merged-install files resolving with 0 errors under the chosen tsconfig; the two-file tarball install with 0 `.mts` in
the project's `.claude/` and `doctor --strict` OK; the copied install's `doctor --strict` OK after the rewrite, listed path by path; the
nine daemon probes each with its number (one daemon from eight racing clients, the head-of-line wait in ms, the stdout JSON byte for
byte, the behaviour on lock change, kill, stale socket and long path, the index query's round trip, the unattended-then-interactive
pair); the four readers' probe results.

## W2. The foundation

1. `tsconfig.json`: `module` and `moduleResolution` `nodenext`, `target` `es2023`, the strict set, `rewriteRelativeImportExtensions`,
   `types: ["node"]`, `rootDir` `.`, no `outDir`, the merged-install mapping W1.2 proved, `include` `bin lib global scripts packs` and the
   kit's own `.claude/hooks/kit-lock.mts`, `exclude` `node_modules`, `test`, `site`, the probes; `tsconfig.test.json` with `noEmit` for
   `test/`; `package.json`: `build` (`tsc -b`), `check` (`tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.test.json`), `test`
   globbing `test/**/*.test.mts`, `pretest`, `prepack` and `prepare` running `build`; `files` gains `!**/*.mts`, `!**/*.d.mts`,
   `!**/*.tsbuildinfo`; `engines` unchanged.
2. `.gitignore`: the emitted `.mjs` of a converted folder (the rule added by the lead as a folder's last hand-written `.mjs` goes), the
   `.tsbuildinfo`, the built binaries; `scripts/clean-emitted.mts` removes an emitted `.mjs` whose `.mts` is gone and runs in `build`.
3. The installer filter (d-2): `JUNK` in `lib/packs.mjs` skips `.mts`, `.d.mts`, `.map`, `.tsbuildinfo`; `global.mjs`'s `FILES` and
   `selftest-cache.mjs`'s `filesUnder` likewise; a test installs a pack whose folder holds a planted `.mts` and finds 0 in `.claude/`.
4. The shared types, `packs/base/hooks/lib/types.d.mts`, with the shapes the constraints list, each field from the surveys' tables
   (base-hooks section 5, cli-lib section 6); the hook interface `hook(event, ctx)` returning a `Verdict` or a promise of one, where `HookContext`
   is `{ projectDir, cwd, env, sessionPid, now }` plus the layout, the git state and a logger, built per event from the client's request
   (review-2 8.1), and `Verdict` is `{ code, stdout, stderr }`: a hook returns it instead of printing or exiting (what d-10's daemon
   needs; every hook meets it as W3 and W4 convert it); the hook table row (`hook`, `events`, `matcher`, `timeout`, `async`, `order`,
   `role: judge | recorder`); the declared interfaces of the installed modules `lib` imports dynamically (`layout`, `glob`, `hook-log`,
   `lesson-checks`), so no `import()` result is `any`.
5. The owners that do not exist yet, written typed and unit-tested before any slice converts onto them: `git-run.mts` (one git runner,
   one result type, an `identity` option, `cwd` and `env` required arguments with no default to the process's own, review-2 8.5), `files.mts` (`put`, `ensureDir`, `isDir`, `readText` with its 8 MB cap, `walk` with the one
   junk filter, `scratchDir`, `childError`), `hash.mts` (`shortHash`), `source-exts.mts` (one table of source extensions per language with
   `.mts` and `.cts`, read by `elements`, `dup`, `shape-code`, `file-size-guard`, `folder-law`, `coverage`), `runAsHook` in `hook-log.mts`
   (the tail every hook writes, with `--selftest` and the by-hand flags as options), `HOOK_FILE` in `packs.mts`, `shell-lex.mts` owning
   heredoc cutting, quote blanking, command splitting and `installedPackages` (other-packs section 2: 8, 4, 7 and 2 copies);
   `selftest.mts`'s `runHook` returning the full spawn result; `json.mts` a leaf.
6. The picker reads `.mts` (review O1, else every gate from here to W6 tests nothing): `graph`, the test glob, `changed-functions` and
   `selftestsOf` on `.mts`; the `docs/**` row with KWB-131's plant; a planted change to a `.mts` picks its test.
7. The gates, in `test/repo-lint.test.mts`, twelve, each seen red on its plant: (1) `npm run check` 0 errors (a planted wrong type); (2) 0
   `any`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck` in sources (a planted `any`); (3) 0 hand-written `.mjs`/`.js`/`.py` source in a
   folder marked converted, `proxy/` excepted (a planted stray `.mjs`); (4) every shape of `types.d.mts` defined once (a planted second
   `interface Lock`); (5) the emit is current: built into a temporary folder and compared byte for byte with the tree (a planted edit of a
   `.mts` with no build); (6) `file-urls` (KWB-163) reads `.mts`; (7) no personal name; (8) no bare `npx`; (9) no synth word in base;
   (10) file size by `layout.maxFileLines` over `.mts`; (11) no process global in a hook or hook-lib module outside its `isMain` tail:
   `process.env`, `process.cwd()`, `process.ppid`, `process.exit`, `process.chdir`, `process.stdout`, `process.stderr`, `console.*`
   (a planted line; review-2 8.2); (12) no work at import: a module's top level only declares, and its tail is
   `if (isMain(import.meta.url))` (a planted top-level call; review-2 2.8); one tree walk for all. Gates 11 and 12 start red on the
   unconverted folders and go green folder by folder as W3 and W4 mark them converted.
8. The readers read `.mts` (item 5's `source-exts.mts`), each with a probe write through `once-only` and `file-size-guard` seen judged.
9. The LSP declaration the kit ships (d-3 as W1 decided): the plugin folder, enabled in the kit's `.claude/settings.json`, the global
   plugin disabled; `LSP` answers on `types.d.mts` from a child session.
10. The pilot: `json`, `project`, `files`, `git-run` converted and in use by their first importers; `.claude/hooks/kit-lock.mts`
    importing the installed `.claude/hooks/lib/writes.mjs` and an emitted `lib/kit-lock.mjs` (never a gitignored source path); built;
    `npm pack`; the tarball installed into a scratch project; every unit and hook test that reaches them green; `update --dir .` in the
    kit and a tool call judged by the kit's own hooks after it.

**Done when:** `npm run check` exits 0 on the converted files; the twelve gates pass on the converted folders and each was seen red; a planted `.mts` change picks its
test through the picker (listed); a fresh install from the packed tarball carries the emitted pilot files byte for byte what `tsc` wrote
and 0 `.mts`, with `doctor --strict` OK there; `once-only` and `file-size-guard` judge a `.mts` write; the `LSP` tool answers definition,
references and incoming calls for `readJson` on `json.mts` in a child session (the replies in the evidence); the kit's own `update
--dir .` passes and a tool call in the kit is judged by `kit-lock` after it; `npm run build` under 2 s warm on this Mac.

## W3. The core: `packs/base/hooks/lib`, by layer

Everything imports it, so it goes first and alone, in the import layers the base-hooks survey lists (L0 21 leaves, L1 10, L2 7, L3 8,
L4 7, L5 5, L6 2, then `run-hooks`). Three agents at once per layer, the files of a layer split evenly, each layer merged and green
before the next starts (a file imports only converted files).

1. Each file converted to `.mts` with explicit parameter and return types, every shape from `types.d.mts`, every copy of a helper
   replaced by its owner (the surveys' lists: four `git` signatures, the payload parsed four ways, `readText` twice, `real` three times,
   `esc` three times, nine short hashes, eight temp-folder makers, `ROOT` read five ways, `verdicts` hand-rolled six times, the shell
   helpers of W2.5); the kit's own law hits in the file fixed as it is converted (repeats section 2: `hook-catch-must-not-allow` 15,
   lookup chains 12, field map 1); the two `real` helpers decided as a KWB with its test red first.
2. The layering faults fixed as the layer is reached: `json` a leaf (W2), `hook-log` no longer importing `layout` and `event-log` for
   one key; `look-gate` and `skill-first` loading their selftest module only under `--selftest`.
3. Re-entrancy met as each file is converted (d-10, review-2 sections 1 and 2): no `ROOT` read at import (`project.mts` takes `ctx`),
   no `process.env`, `process.cwd()`, `process.ppid` or `process.exit` outside the `isMain` tail, no `process.stderr.write` or
   `process.stdout.write` reassignment (output is the returned `Verdict`), no work at import (`shell-writes`' `realpathSync(argv[1])`
   and `idle-wake`'s top-level `process.exit(await main())` go under `isMain`), no memo without a key that holds the file's mtime
   (`hook-log`'s `limits`, `shell-writes`' `gnuSed`, any `layout.json` read), no module singleton that outlives an event; every git and
   child spawn takes `ctx.cwd` and `ctx.env`; gates 11 and 12 go green on the folder. A test runs two events of different checkouts
   through one runner process and sees each judged by its own checkout, then a third whose `cwd` is a worktree and `projectDir` the
   main; a test imports every base hook in a worker thread with stdin closed and sees none exit or throw.
4. `house.py` stays until W4 slice 3 ports `browser-guard.py` (they go in one commit); `run-hooks.mts` last, typed on the hook interface,
   its `capture` gone (a hook's output is its `Verdict`), its `mergeOut` capping the merged text at 9,000 characters with a line naming
   what was cut (Claude Code cuts at 10,000; a plant of 30 hooks saying 500 characters each).

**Done when:** 0 `.mjs` source left in `packs/base/hooks/lib` but `house.py` (the lint gate, the folder marked converted); `npm run
check` 0 errors; every base hook's selftest green on the emitted lib (`doctor --fresh` in a scratch install: 0 problems); the unit tests
of the lib green under `test/unit/hooks-lib/`; the three re-entrancy tests green and gates 11 and 12 green on the folder; the `real`
KWB closed with its test.

## W4. The slices, in parallel

Six agents at once, each its own worktree and branch, merged in this order when each one's Done when holds: (4) `lib/` and `bin/`
first (its `RETIRED`, `requires`, `.py` branches and `HOOK_FILE` are what the other slices need; the hidden hook API and the import
cycles of cli-lib section 1 removed: `scan` and `repo-weight` take their helpers from a lib, not a hook); then (1) base hooks (26,
`git-guard` exporting its law); then (3) the other packs' hooks, libs and tools (39 files; `browser-guard.py` ported to `.mts` on
`judgeEvent` and `writesOf` and `house.py` deleted in the same commit, its `python3` settings entry retired; `stage-guard` calling
git-guard's exported law; `sound-design/pack.json` `requires: ["audio-core"]` and the installer refusing a pack whose requirement is
absent; `test-verdict`'s `--help` no longer running the suite, KWB-123, red first); then (2) base tools (9); then (5) `global/` (3 hooks
on one small global helper module, since global cannot import the hooks lib) and `scripts/` (4); then (6) the test helpers
(`test/kit-cli.mts`, `worktree-rig.mts`, `fresh-tmp.mts`, `fixtures/installs.mts` with W1.4's rewrite, the `write`, `bash`, `transcript`,
`withLayout`, `git`, `lockOf` helpers the tests survey lists; the worktree-case files rebuilt on each hook's exported `worktreeCase`).

Each slice, as it converts: every hook on `runAsHook` with the by-hand flags as options and on the `hook(event, ctx): Verdict`
interface, meeting W3.3's re-entrancy list; every hook exports `worktreeCase` beside `selftest`; every hook's `pack.json` row carries
`role: judge | recorder` and `async`, so W8.1's `hooks.json` is generated (d-8), and a judge's selftest runs under a write trap that
fails it if it writes a file (review-2 2.12); `once-only` split in slice (1) into its judge (PreToolUse, parallel) and its index update
(PostToolUse, serial, recording only a write that happened; review-2 2.10); `agents-held`, `own-processes` and `time-guard` reading
`ctx.env` and `ctx.sessionPid`, never the process's own (review-2 1.5, 1.6); `lib`'s 28 raw JSON reads, 8 git runners, 4 walkers and 7
layout readers onto their owners; `bin`'s `opts` bag typed; `catch` sites typed through `childError`; every `process.argv[1]` compare
onto `isMain`. Plants: a hook that loses `export const hook` (the settings writer must still fold it, or refuse); a hook with no
`worktreeCase` (the completeness test red); a hook with no `role` (the table generator refuses); a planted judge that writes a file
(its selftest red); `stage-guard` after the change refusing `git add -A` (seen); a Write refused by `folder-law` leaving `once-only`'s
index unchanged, and the same text written later not refused as a copy.

**Done when:** for each slice, 0 `.mjs`/`.js`/`.py` source left in it (the lint gate per folder); `npm run check` 0 errors after its
merge; its hooks' selftests and worktree cases green on emitted code; the tests the picker reaches green (the picker now reads `.mts`);
the copies taken out counted per folder by `scripts/count-copies.mts` against the surveys' lists (git runners 22 definitions to 1,
payload parses 22 hand copies to 0, hook tails 33 to 0, `isMain` by hand 11 to 0, heredoc cutting 8 to 1); after the last merge, the
whole suite's counts equal or better than W0's baseline with every difference named; `python3` appears in no installed `settings.json`
(a scratch install of gpu-painter); `init sound-design` alone refuses with the requirement named (a test).

## W5. The tests: three tiers and one install per configuration

Four agents, split by what they write, not by what they read (review section 5): (a) the unit tier, (b) the hook tier by pack, (c) the
tools and integration tiers, (d) the fixtures, the repo lint and the per-version manifest; (d) merges first, then (a), (b), (c).

1. Unit: `test/unit/lib/NAME.test.mts` for every `lib/` module (18 have none today: `sync`, `switches`, `manifest`, `claude-md`, `backup`
   among them) and `test/unit/hooks-lib/NAME.test.mts` for every hook lib with logic of its own; imports the `.mts` (d-4).
2. Hook: `test/hooks/PACK/HOOK.test.mts` for all 45 hooks: the selftest, the exported worktree case, and the refusals that today sit in
   `kf-refusals` (27), `kf-fail-open` (20), `routes` (18), `rust-pack` (19), `lookup` (12), `review-packs` (22), `audio-packs` (17),
   `structure`, `micro`, `logging`, `instances`, `shape`, `once-only`, `cpp-pack`, `content-sites`, `every-language`, `rust-dry`, `sub37-wb`,
   `other-projects`, `kit-guards`, `install-fixes`, fired on a fixture copy; one test per hook asserts the emitted verdict equals the
   source's (d-4); `test/tools/PACK/TOOL.test.mts` for the 25 tools (tone-report, freeze and multi-find get their first).
3. Integration: about 18 flows that install on purpose (install from the tarball, update, noop against the per-version manifest, doctor
   and its cache and timeout, new, scan, workorder and its check, global, release, worktrees and twins, hook-proof, hook-timing,
   configurations, other-projects, custom-packs, kit-lock, test-changed), each on the fixtures; `house.test.mjs` split so no file sums
   over 60 s.
4. Fixtures and the manifest: `test/fixtures/installs.mts` builds each of about 14 configurations once per run by the `fresh-tmp`
   hand-off and a build lock, `fixture(name)` returns a copy with W1.4's rewrite (a plant: a copy with a stale absolute path fails);
   `holdsEachCase`'s 27 installs become one all-packs fixture; the per-version manifest of installed files and hashes
   (`packs/manifest-2.0.0.json`, written by `scripts/counts.mts`) replaces noop's 37 lists, the noop test comparing an install against
   it (a plant: an unlisted changed file); the two profiles move to `test/fixtures/profiles/` and `--profile` takes a path; the hand
   numbers go (d-12): `json-ratchet`'s cap becomes a lint on added lines, `kf-refusals` asserts each fixture row, `names-sweep` compares
   to its generator, `base-neutral`'s moved list is deleted. The daemon under test (review-2 6.2): the suite sets `CLAUDE_PACKS_CACHE`
   to the run's temp folder (sockets, pid files, logs) and `fresh-tmp`'s teardown stops every daemon under it; a test that wants the
   TypeScript path sets `CLAUDE_PACKS_DAEMON=off`; after the suite, 0 `resident.mjs` processes under that cache (a repo-lint assertion,
   red on a planted test that leaves one).
5. `test/repo-lint.test.mts` takes the 11 reader tests (W2.7) and the generated-artefact checks (W7); the install-site counter of the
   tests survey committed as a lint rule.

**Done when:** 0 `.test.mjs` left; `npm run check` 0 errors over the tests; the whole suite green with every baseline test present by
name or in d-12's replaced set (a list diff in the evidence: added, renamed, replaced, 0 removed otherwise; a plant: a deleted test shows
red); `init` call sites under 40 by the committed counter (from 161); no test file over 60 s summed in the suite log; the suite's wall
under 180 s on this Mac, median of two runs, load recorded; the fixture copier's plant seen red.

## W6. The kit, end to end, and the change-to-tests map

1. The picker (`scripts/test-changed.mts`) on d-7: the path function for the tiers, `pack.json` `tests` and `requires`, the `.mts`
   import graph for libs, changed functions read from `.mts`; the selftest cache keyed per hook plus its transitive imports and kept in
   `~/.cache/claude-packs`; plants: a planted fault in a lib must turn the picked set red; a changed transitive import must miss the
   cache; the `docs/**` row's plant. Measured on three real diffs against W0's picker.
2. The kit's own install (`update --dir .`): the emitted hooks and tools in `.claude/`, `kit-lock.mts`, `doctor --strict` OK.
3. The npm package: `npm pack`, 0 `.mts` in the tarball, installed into a fresh project under `node_modules`, `init --config node` and
   `doctor --strict` OK there under the oldest Node 22 the machine has (its version recorded; 22.0 to 22.17 listed untested).
4. kit-fresh after the conversion (open-work section 6): its selftest and `--check` green on the emitted file; the `work/` version
   prefix rule reads 2.0.0.
5. The `LSP` tool on the kit from a child session: definition, references and call hierarchy for one function of each layer
   (`readJson`, `writesOf`, `sync`), the replies listed.
6. Timed: the one-hook gates (`no-find.mts`, `git-guard.mts` touched) and the one-lib gate (`layout.mts`), against W0's (b) and (c);
   `doctor --fresh`'s selftests against W0's (l).

**Done when:** each of the six measured in `build/evidence/W6/`; the one-hook gates under 60 s and the one-lib gate under 90 s on this
Mac (against W0's measured figures for the same files); the picker picks for a hook change its own test, its selftest and the noop
integration test and nothing else (listed); `npm pack` under 4 MB without the binaries and under 16 MB with them, and `tsc`'s build
under 2 s warm; `doctor --fresh`'s selftests under 60 s on this Mac (the selftests make about 390 runner spawns today).

## W7. Packs from one template, and the hand-kept facts generated

Three agents, merged in this order: (b) the manifests, then (a) the content, then (c) the generators.

(b) The manifests: one agent owns all 39 `pack.json` files: `tests` (every code file of the pack a key), `requires`, `fits` (replacing
the configurations' `choose` lists), a per-hook `order` (replacing synth-creator's `hookOrder`, which already lacks 14 hooks), `concepts`,
`folders`, `hooks`, `skillsIn` always present; the configurations become one base with per-configuration deltas (the 64 identical
preamble lines once, the shared folders and kinds once); the three work-order templates on `{{kit}}`; `claude-ai-skill` retired for
`planner-skills`.

(a) The content: the template, one canonical form per kind, from the pack-content survey section 4, for every kind (rule, check, skill,
hook, tool, pack.json); `new-pack` and a new `add-lesson-check` command scaffold from it (`lib/pack-template.mts`: the generator fills
`exclude`, `rule`, `kind`, runs the lesson selftest, and scaffolds a hook on `runAsHook` with its selftest and worktree case); the
conformance gate `test/pack-content.test.mts`: every new or changed file passes the whole set, an untouched file passes the hard set
(R2, R3, R4, C1, C4, S1, S2, S5, P1, P2, P5, P6 of the survey's section 5) and the rest is a ratchet (a stored number that may only fall);
the content fixed to the hard set: 3 unclosed `<constraints>`, 1 check with no rule, 10 descriptions, 1 hook in the wrong pack, the 17
js-ts rules in the old form rewritten into the template (the kit's own TypeScript rules first), the two skills named hover-state given
one name each, the five `*-repeats-become-templates` rules made one base rule with per-language references, `ui-matches-reference-look`
folded into `page-matches-reference-look`.

(c) The generators (d-8): `scripts/counts.mts` writes the README's five tables between markers, the site's six `data-count`s, the
per-version manifest (W5.4), `docs/rules-without-checks.md`, `docs/versions.md`'s rows from `package.json`, the status-line sample and
the planner's version lines; `--check` fails when the file differs from the generation (a plant: a wrong README number); the remaining
hand copies of the configurations survey's table (29 rows) each generated or listed open in W11; `history.md` cut to a pointer;
`ui-craft-sources.md` into its pack; the kit's own documents updated: CLAUDE.md (the build step, the hook form, the invariant test names,
Node 22.18 for dev, the Go exception), the README's commands, the authoring skills `prove-a-hook`, `add-lesson-check`, `skill-writing`.

**Done when:** every pack's `tests` names every code file in it (a test, red on a planted pack file with no key); the conformance gate
passes with its hard set, each hard check seen red on a plant, and the ratchet file holds the remaining counts (from 266 files failing
today) with a test refusing a rise; `new-pack` and `add-lesson-check` scaffold a pack that passes the whole gate (a test); 8 configuration
files hold under 60 lines of deltas each over one base; `counts --check` is green, its plant seen red, and each of the 5 tests it
replaces is deleted; 0 literal `npx` kit commands in templates and planner text outside `kitCommand`; CLAUDE.md names no `.mjs` hook form
and no test file that no longer exists (a grep).

## W8. What a project pays per tool call, and TypeScript enforced in projects

Sequential: (1), then (2), then (3), then (4), then (5).

1. One runner per event, in TypeScript (d-9): `settings.json` gets one blocking entry per event with the union of its matchers (a
   base-only project starts nothing on a tool none of its hooks judge), `async` and `asyncRewake` hooks (`heartbeat`, `idle-wake`)
   keeping their own entries for good (`throughRunner` in `lib/settings` already keeps them out; review-2 1.10); the runner reads the
   table the install generates from the packs' `pack.json` rows (`.claude/hooks/hooks.json`: hook, events, matcher, timeout, async,
   order, role) and decides the matcher itself; it builds the `HookContext` per event from its own process (the daemon builds it from
   the client's request) and calls each hook's `hook(event, ctx)`; `update` migrates an existing project's entries, keeping the
   project's own hooks (KWB-26's plant); the runner writes one `event` line per event to the log beside the per-hook lines, its `ms`
   from the event's arrival to its reply, never `performance.now()` (review-2 1.7), with `queue` and `source` (`runner`, `daemon`,
   `proxy`) fields; `hook-proof`, `coverage`, `kitHookScripts` and the settings regexes read the table. A test changes `layout.json`
   between two events through one runner process and sees the second judged by the new one (review-2 2.6).
2. The resident runner and the Go proxy (d-10, d-13), in four parts, each with its own commit and tests:
   - *The protocol* (`packs/base/hooks/lib/proxy-wire.mts`, shared by daemon, client selftest fakes and the TypeScript fallback):
     a length-prefixed JSON request `{v, env, cwd, ppid, deadline}` followed by stdin's bytes, a length-prefixed JSON reply `{code,
     stdout, stderr}`; stdout forwarded byte for byte, plain text too (SessionStart and UserPromptSubmit add plain stdout as context);
     a reply that is not a whole record is a crash, never exit 0; a request over 64 MB is answered by the TypeScript path; the daemon
     answers by the client's deadline (the entry's timeout minus 1 s) with what has arrived and a "not judged by X (over time)" line,
     recorded in the crash log (review-2 1.1, 1.2, 1.9, 1.11).
   - *The daemon* (`packs/base/hooks/resident.mts`, split by job under `resident/`: `socket`, `pool`, `event`, `index`, `state`,
     `lifecycle`): the socket in d-10's folder with d-10's name, refused when the folder is not the user's at mode 700; the hook table
     loaded once from the folder its hash names, only the hooks the table marks for it (never `async`); the worker pool of 2
     warm, grown on demand to 8, retired after 2 idle minutes (bandwarp's log: 90 % of busy time one event at a time, 99 % at most
     two, never more than 5 at once; the user: "we never need 16"), recycled after 500 events, a worker that exits replaced and its hook counted a
     crash; the main thread doing only socket I/O, framing, the table, the repetition index (a worker asks it by message for the
     candidate lines of the added text, never for the index) and every state-file (`writeJson` by rename) and timing write (workers
     return `{hook, ms, code}`, the main thread appends the event's lines in one write and owns rotation); judges at once, the first
     exit 2 waited on for up to 30 ms more and every refusal returned sorted by table order; recorders of the call for every call,
     updaters only on a 0 verdict; a hook finishing after the reply logged `late`, its exit 2 counted against it by `logs`; the
     exclusive start lock (`wx` with the pid), the `ready` pipe, the socket unlinked only after a failed connect; 15 idle minutes on
     hook events only, re-exec after 24 h or 400 MB RSS between events, `uncaughtException` and `unhandledRejection` logged and
     survived, output to `daemon-HASH.log` rotated by `appendRotated`; `SessionEnd` does nothing; a pid file `run-discovery` skips;
     `claude-packs daemon status|stop` reading it (review-2 sections 2 and 3).
   - *The client* (`proxy/client.go`, `proxy/main_test.go`): reads the lock, names the socket, connects, sends the request and stdin,
     writes the reply's stdout then stderr, exits with its code; on no daemon, a stale socket, a cut reply or a missed deadline it runs
     `node .claude/hooks/run-hooks.mjs` on the same stdin (judged) and starts the daemon behind it under the lock, `detached`, cwd `/`,
     env reduced to `HOME`, `PATH` and the cache folder; node from `PATH` as settings does today; fails open only when node cannot
     start, in a `systemMessage`; `hook-proxy --selftest` runs its plants against fake daemons it starts in-process (a stale socket, a
     close after 3 bytes, a reply past the deadline, a 104-byte path, no node on `PATH`), and doctor runs it like a hook selftest
     (review-2 1.3, 3.2, 3.7, 5.6, 6.1).
   - *The build and the install* (d-13): `scripts/build-proxy.mts` builds the four binaries with `CGO_ENABLED=0 -trimpath
     -buildvcs=false -ldflags "-s -w"` in parallel, the Go build cache in `~/.cache/claude-packs/go`, skipped when `client.go`'s hash and
     Go's version equal the last build's, `codesign -v` checked on the darwin two; `npm run build` builds the host's client only when Go
     is on `PATH` (without it the kit's own install uses the TypeScript runner and doctor says which path is live); `files` ships them
     under `packs/base/hooks/bin/OS-ARCH/`; the install writes the `sh` picker `.claude/hooks/bin/hook-proxy` (by `uname -sm`, with Go's
     minimum OS checked, else `exec node .claude/hooks/run-hooks.mjs`) and copies the machine's binary into the user's cache by
     copy-then-rename, never in place (review-2 3.5, 3.6, 5.1 to 5.5, 5.8).
   The daemon's selftests, each seen red: a hook that throws; a lock change mid-event (the next event on a new daemon, a planted message
   change seen); a kill mid-event (the client's verdict judged); eight clients racing to start (one daemon pid, eight judged); a worker
   held 2 s while another event answers in under 50 ms; two hooks sleeping 100 ms each in one event seen under 150 ms; two refusing
   hooks at 5 and 20 ms both returned, in table order, every run; two serial hooks keeping their order; a planted judge that writes a
   file (the table check red); a planted hook calling `process.exit(0)` (the event answered, the pool size kept); a hook rejecting a
   promise after returning (daemon alive, logged); 1,000 events across a forced rotation (line count equals hooks run); 10,000 events
   (RSS flat within 50 MB); a request naming another project's folder (not judged by that folder's hooks); the folder at mode 755 (the
   daemon refuses, the client takes the TypeScript path); the `sh` picker under a planted `uname` printing `Linux x86_64` on this Mac
   (the TypeScript runner answers); two `update`s in a row on this Mac with the client run after each (no `Killed: 9`); a binary with a
   planted byte change (the release check red); two builds of one source with one sha256. `go vet` and `go test ./proxy/...` in the repo
   lint.
3. The heavy hooks: git-guard at Stop served from a cache keyed by remote URL plus the sorted local branch tips (60 s, invalidated by a
   ref change), the live look capped at 1 s with the existing "not checked" note, a detached refresh after a push or commit; the
   per-session git state file (HEAD, branch, dirty list, keyed by the mtimes the status line already uses) kept by the resident runner
   and read by `chart-first`, `look-gate`, `suite-once`, `stage-guard`, `repo-litter`; `time-guard`'s scans detached; `lesson-checks`
   compiled at update by the lock hash.
4. Doctor holds each hook per event (not pooled) to the budget table: Pre Bash 100/250 ms p50/p95, Pre Write 120/300, Post 60/150,
   Prompt 80/150, SessionStart 150/300, Stop 200/1,000, per hook 10/50, worst 200 (a plant: a hook that sleeps 300 ms at one event, seen
   red); the constant checks of d-9 cached by kit version; `loadCustomPacks` only on `init`, `add`, `update`; `scan` and `doctor --fresh`
   given their own budgets (60 s and 120 s on this Mac); doctor holding hooks to the budget on hook `ms` and the event on `proxy` wall,
   naming a full pool (queue p95 over 20 ms) rather than a hook, and saying the running daemon's hash when it is not the lock's; the
   status line asking the socket with a 50 ms deadline, never starting a daemon and not resetting its idle timer, and when the daemon
   is down rendering from its own files with a `hooks: slow path` marker (its render under 80 ms; `refreshInterval` 5 in
   `packs/base/pack.json`, migrated by `update`; review-2 6.3, 6.4, 7.1, 7.2); the selftest cache per hook plus imports in
   `~/.cache/claude-packs`.
5. TypeScript enforced in projects (d-5): `init` for `node`, `full-stack` and `js-ts` writes the devDependencies, the strict
   `tsconfig.json` where none exists, the LSP plugin declaration and the `typescript-only` check; `doctor` red without `typescript` or the
   declaration; an existing project takes it through `enable`; the kit's own repo refuses a new `.mjs` source at write time through the
   same check.

6. The status line served by the daemon (the user, 2026-11-12: "It should be the go proxy that maintains and updates the
   statusbar ... more frequent updates so it never seems like any of the lines are stuck ... next to the claude-packs version
   number there should be a red dot if it is out of date"), after KWB-201's fix: the daemon keeps the status as events arrive
   (each session's and agent's start, last tool and its start time, last commit, stop; the order's progress; the kit version),
   never rebuilt per render from files, worktrees, transcripts or `ps`; `hook-proxy status` (the Go client) asks the socket with a
   50 ms deadline and prints the answer, and with no daemon prints the TypeScript status line's own render marked `slow path`;
   `refreshInterval` 1, migrated by `update`; every live line carries a ticking clock (its tool and how long it has run, `Bash
   0:42`) so it changes every render, and a line with no event for 2 minutes turns yellow and says `quiet 2m`, a stopped one leaves
   the list, and one with no event of any kind for 5 minutes and no CPU or process of its own (W8.7's sampler) is removed as
   abandoned (it returns on its next event), so the list can never go stale while a long command keeps its agent listed (the user,
   2026-11-12: "if an agent is in the middle of work its cpu/mem/processes would reflect that"); a SessionStart clears the list, and a live agent of any session returns on its next event; a red dot beside the version when npm's latest is newer than the project's own `package.json` version, read from
   kit-fresh's cached look that the daemon refreshes at most hourly (no render waits on the network; a `work/` version ahead of
   npm shows no dot).

7. A resident Go sampler for CPU, memory and processes (the user, 2026-11-12: "a go agent would also be able to actually
   monitor, cpu, processes and memory better"), first as a probe: on this Mac with `CGO_ENABLED=0`, what a raw system call reads per
   process (CPU time, resident memory, parent, working folder) and at what cost, against `ps`; on Linux from `/proc`; the result and
   the choice in `decisions.md` (if macOS needs cgo, the Mac falls back to `ps` and says so). Then `hook-proxy sample`, started and
   stopped with the daemon, one snapshot every 2 s kept in the daemon: each process's CPU and memory, its owner (a session by its
   `claude` process tree, an agent by its worktree folder; an agent in its lead's folder is attributed to the lead); the status line
   shows CPU and memory per session and agent; W8.6's abandonment reads it; a watchdog flags in the status line and the log, and
   with `guards.watchdog.stop` set stops, a process whose parent is gone that holds a core for 60 s (the 49 orphaned spinners of
   2026-11-11) and a test run above the kit's test cap.

**Done when:** a Bash call waits on 2 proxy processes (from 7 node runners) and a Write on 2 (from 4), counted in a fresh install's
settings and seen in its log, each proxy call under 20 ms on this Mac by the `proxy` line's wall (from 85 ms); a Write event's wall
under 110 ms p50 and a Bash event's under 20 ms, against W0's (g) measured wall for the same events (wall to wall, never a sum); the
daemon's and the client's selftests green with every plant seen red, eight racing clients making one daemon, and a `rm -rf` PreToolUse
refused on the very first event of a session with no daemon; an install with no binary in the cache runs the TypeScript runner through
the `sh` picker and passes the same tests; the daemon's RSS under 150 MB with its pool at 8 after 1,000 events, and under 100 MB idle at 2; W0's replay fixture played
through an install with bandwarp's pack set gives Stop p50 under 200 ms and p95 under 1,000 ms over its 51 Stops (from 1,880 and 7,785)
and no hook over its budget; `doctor` red on the sleeping plant and naming the pool on a planted full pool; `init --config
synth-creator cpp audio-core` plus `doctor` under 40 s uncached and 10 s cached, and `update` under 30 s, on this Mac; the status line
renders in under 80 ms with the marker when no daemon runs, and `workIn` counts 0 processes for a running daemon; a `node` project from
`init` holds `typescript` and the declaration, a planted `.mjs` write in it is refused, and `doctor` is red when `typescript` is removed
from it; `hook-proxy status` renders in under 15 ms p50 over 100 renders on this Mac, the TypeScript render's time stated beside it;
a planted agent shows its tool with a clock that differs between two renders a second apart, turns `quiet 2m` after a planted
2-minute silence, is gone after a planted 5-minute silence and back on its next event, and leaves the list on its stop; a planted
SessionStart empties the list and a live agent's next event brings it back; the red dot shows on a planted older install and not on the kit's own `work/`
version; a planted network outage leaves the render under 15 ms; the sampler's probe recorded with its numbers and its decision; one
snapshot under 5 ms of CPU on this Mac (or the `ps` fallback's cost stated); a planted agent running a 10-minute command with no
event stays listed past 5 minutes and is removed 5 minutes after its processes end; a planted orphan spinning for 60 s is flagged
(and stopped with the guard set), seen red first; the daemon and the sampler together under 300 MB.

## W8.8. The load governor: everything heavy runs through it, so a machine is never maxed out

The user, 2026-11-12: "we need something that controls load in the kit that everything 'runs through' so you can never max out a
machine" (the same day this run's own agents, tests, fuzzers and soak reached load 43 and 47 on 18 cores); "it should be something
where you or agents ask before they start. how much can I use and it simple gets a straight answer based on current load". Before
W10b's soak runs.

0. The front door is a question with a straight answer: `claude-packs load ask` (and `ask --for test|build|fuzz|agent` with an
   optional `--want N`) prints one line and the same as JSON with `--json`, from the governor's budget and the live load: `you may
   use 3 cores now (tests: CLAUDE_PACKS_TEST_CORES=3; builds: -j3; fuzz: -parallel=2; agents: 1 more); load 9.2 of 18, ceiling
   13, 2 jobs running` or `wait: load 14.1 over the ceiling 13; 0 cores free; ask again after the running test ends`; `load take N
   --for KIND` reserves and prints a grant id with what it may use, `load free ID` returns it (a grant whose pid is gone is freed
   on read). The lead asks before every wave and every heavy job and sizes them by the answer; every agent brief's first lines say
   to ask before each heavy command and use the answer; the `load` skill says how. Items 3 and 4 below are the safety net for a
   command that did not ask: it is routed through the same governor anyway.
0b. Priority (the user, 2026-11-12: "give an agent in the order a priority its allowed to request. So if it says something like I
   am priority 0.3 then it can get max 3 cores ... it should be prioritized by what work is required before other things"): every
   ask and take carries `--priority P` (0 to 1, default 0.5): P is the most of the budget the job may hold (0.3 of a 10-core budget
   is at most 3 cores); asks waiting together are served highest priority first, each given its share of what is free; when load
   stays over the ceiling, the lowest priority job is paused first (not the newest), the highest last; a waiting job's priority rises
   0.1 every 5 minutes it waits, and every granted job holds at least 1 core, so none starves; the last 20 % of the cores
   is never granted, for the system and the person at the machine (the user: "we can never use the last 20%. thats reserved for
   the system and you"): a hard limit, not a default; no setting can raise it. The lead sets each agent's priority in its brief from the order:
   work other steps wait on (the critical path) high (0.6 and up), the lead's own merge gate highest (0.8), verification nothing
   waits on (soaks, fuzzing, re-measuring, reports) low (0.2 to 0.3); the brief template carries the field, and `load ask` prints the
   priority it answered for.
1. One owner, `packs/base/hooks/lib/governor.mts`, with the machine's budget in the user's cache folder (shared by every session,
   agent and project on the machine): slots = 60 % of the cores by default, never more than 80 % (`~/.config/claude-packs/governor.json` `budget`, a share
   or a count; a project's layout may lower it, never raise it), a load ceiling (default 70 % of the cores, never above 80 %), the jobs in flight in a
   lock-guarded file (each with its pid, process group, slots, project and start), a stale job (pid gone) freed on read.
2. The build queue folds into it: `buildq`'s slot and core budget become the governor's (its callers and its tests kept, its own
   state file retired), one owner for "how many cores may this job use".
3. `governed` (`.claude/tools/governed`, through the resident runner when it is up): asks for slots by the job's weight, waits in a
   queue while slots or live load (W8.7's sampler; `vm.loadavg` when the sampler is down) say no, quietly inside its own tool call
   with one line of its state on stderr every 30 s (never a turn spent polling); then starts the command in its own process group
   under `taskpolicy -b` on macOS (`nice -n 15` elsewhere) with the concurrency it was granted set for it (`-j`, `CMAKE_BUILD_PARALLEL_LEVEL`,
   `CLAUDE_PACKS_TEST_CORES`, `GOMAXPROCS`, `-parallel` on `go test -fuzz`, `--test-concurrency`), frees its slots on exit (and on a
   kill, by the stale rule), and exits with the command's own code.
4. The `PreToolUse` Bash hook routes heavy commands through `governed` by `updatedInput` (one table of heavy forms with their
   weights: builds by `cmake --build`, `make`, `ninja`, `go build`, `cargo build`; tests by `npm test`, `npm run test:changed`,
   `node --test`, `ctest`, `go test`, `pytest`; fuzzers; `npm ci` and installs; the soak and replay scripts); a command already
   governed, a pipe whose heavy part is not first, or a light command is left alone. The `Agent` tool's start asks the governor for
   an agent slot (1 slot each), so a wave cannot start more agents than the budget fits; a run with nobody there still holds its
   agents in the foreground (agents-held).
5. The ceiling's guarantee, in the watchdog (W8.7): when the 1-minute load stays above the ceiling for 30 s, the newest governed
   job's process group is paused (SIGSTOP), and resumed (SIGCONT) when load falls under the ceiling less 10 %; the oldest job is
   never paused; a job paused over 10 minutes is named in the status line and the log; pausing, never killing.
6. The status line shows the governor: slots in use of the budget, jobs queued, jobs paused.

**Done when:** `test/unit/hooks-lib/governor.test.mts`, `test/tools/base/governed.test.mts`,
`test/hooks/base/governor-route.test.mts` and `test/integration/load-ask.test.mts` are green with 0 failures, each case seen red on
its plant: `load ask` answers in under 50 ms with the cores, the per-kind settings and the load, and says wait under a planted load
over the ceiling; two `load take` grants that together exceed the budget are refused for the second until the first is freed;
a grant whose pid is gone is freed on the next ask; a `--priority 0.3` take on a 10-core budget is granted at most 3 cores; of two
asks waiting, the higher priority is granted first; under a planted load over the ceiling, the lowest priority of three running
jobs is paused first and the highest last; a planted low-priority ask waiting 15 minutes rises to its aged priority and is granted;
the last 20 % of the cores is never granted and a setting that asks for more is clamped to 80 % (a planted budget of 100 %); two planted heavy jobs whose
weights exceed the budget run one after the other, never together; a job granted 3 slots runs with `CLAUDE_PACKS_TEST_CORES=3` and
`-j3`; a killed job's slots are freed on the next read; a planted `npm test`, `cmake --build` and `go test -fuzz` are each rewritten
through `governed`, and `ls`, a governed command and a pipe whose heavy part is not first are not; an agent start past the budget
waits; a planted spinner job that holds load over the ceiling for 30 s is paused and resumed when it falls, the oldest job never
paused; the build queue's own tests green on the governor. Measured on this Mac with the budget at its default: this order's own
heaviest wave replayed (three test runs and a fuzzer started together) keeps the 1-minute load under the ceiling (13 on 18 cores)
for its whole run, sampled every 5 s into `build/evidence/W8.8/`, with its wall time stated against the ungoverned one.

## W9. The release in five minutes (measured without publishing)

1. `npm run release` with `patch`, `minor` or `major` does the whole of it: the gate (`test:changed --base origin/main` on committed
   work; a red gate refuses, a plant), the bump in `package.json` and the lockfile, the CHANGELOG heading from "unreleased" to the
   version and date (an empty section refuses, a plant), the generators (W7), the proxy build (the four builds in parallel, skipped
   when `client.go` and Go are unchanged, `codesign -v` on the darwin two: a planted byte change refuses; review-2 5.2, 5.5), the
   landing (fetch, merge `origin/main` into the branch, the branch into `main`, push `main`, fast-forward the main checkout), `npm
   publish`, the tag, the GitHub release; each step skipped when done; `--dry-run` prints the plan with each step's wall; `--registry`
   points `publish` at a local registry.
2. Measured three times on a local registry (`verdaccio` in a scratch folder, started and stopped by the test), each from the command to
   `npm view` on that registry showing the version: a one-hook change, a one-lib change, a content change; the whole-suite case (a
   change that touches every pack) measured once and stated, since it cannot meet five minutes on this Mac (W5's suite target is 180 s).
3. KWB-166 closed with the measurement.

**Done when:** each of the three releases under 300 s wall on this Mac against the local registry, in `build/evidence/W9/`, with the
four proxy builds' wall inside it stated; the three refusal plants seen red; the whole-suite release's time stated; `npm run release --dry-run` on the order's branch prints the plan for
2.0.0 with 0 refusals.

## W10. Before calling it finished

Read the finished work as a senior engineer would: a type that says less than it could (`unknown` left where a shape is known), a
helper two slices wrote twice, a test that lost an assertion, a file over 250 lines, a hook over its budget, a pack file the template
gate ratchets instead of fixes, and the open rows of `workflow-bugs.md` (the 11 CARRY rows) against what the order changed, each with
the test that holds its behaviour.

**Done when:** every finding is written in `progress.md` with its fix or why it stays, 0 left blank; each CARRY row names the step that
touched its files and the test that holds the behaviour it describes.

## W10b. The resident runner and the Go proxy under stress (the user, 2026-11-12: "we gotta really really stress/press/test the resident runner and go proxy for DRY, best practices and memory leaks especially")

After KWB-201 and W8.6 and W8.7 are closed, before W11 measures anything. Runs one at a time, on the cap, with the load recorded.

1. A soak, run alone with no agent or test run beside it: a planted project with the synth-creator pack set, 4 concurrent clients replaying `test/fixtures/replay/bandwarp-hooks.jsonl`
   at its real mix, for 60 minutes (over 200,000 events), with a kit update (a new lock) at minute 20, a `kill -9` of the daemon
   at minute 30, a worker killed at minute 40 and the sampler killed at minute 50; sampled every 30 s into `build/evidence/W10b/`:
   the daemon's RSS and V8 heap used (after a forced GC), its open file descriptors, its worker count, its child processes, the
   sampler's RSS and Go heap (`runtime.MemStats`), the socket files and pid files in the cache folder, and every event's verdict
   compared with the TypeScript runner's on the same event.
2. Leak checks, each with a planted leak seen red first: the heap's slope over the last 40 minutes under 1 MB per 10 minutes (a
   planted array that grows per event); file descriptors and child processes back to their start after each kill (a planted
   unclosed file); no worker, socket file, pid file or timer left behind after the daemon exits (a planted interval); the old
   daemon gone within its idle window after the kit update; heap snapshots at minute 15 and 55 diffed, the top 10 growing
   constructors listed in the evidence with what each is.
3. The protocol under abuse: Go's native fuzzing of the client's frame reader and the TypeScript fuzzing of `proxy-wire`'s
   parser (truncated frames, a length over the cap, bad JSON, a zero length, 1 MB of garbage), 10 minutes each, 0 crashes and 0
   hangs, every input answered by the TypeScript path or a refusal, never exit 0 unjudged; `go test -race` over the client and the
   sampler; `go vet` and `staticcheck` (its version pinned with its row) clean.
4. DRY and best practices, read by an agent that did not write the code, briefed with the code and not with this order's
   conclusions: one owner for each of framing, the socket name, the cache folder, the lock hash, the deadline and the process-group
   kill across `resident/`, `proxy-wire.mts`, `proxy/*.go` and the sampler (a constant shared by Go and TypeScript generated from one
   table, never written twice); every error path closed (sockets, workers, children, files); no global state outside the main
   thread's owners; each finding fixed or recorded with why it stays.

**Done when:** the soak's evidence holds the 120 samples and the verdict comparison with 0 differences; each leak check's numbers
meet the line above and each plant was seen red; the fuzzers ran their 10 minutes each with 0 crashes and 0 hangs; `go test
-race`, `go vet` and `staticcheck` are clean; the review's findings are each fixed or written with why, and every shared constant
has one source (a check, red on a planted second copy); the daemon's RSS meets its budget at the end of the soak.

## W11. The report, with the comparison

1. The "after": every measurement of W0.5 (a) to (l) taken again on the finished kit, by the same command on the same machine, into
   `build/evidence/W11/after.md`; where a command changed (the release is one command, the project's events go through the proxy), the
   same thing measured end to end.
2. `docs/workorders/typescript/report.md`: the comparison table first (one row per measurement, before, after, the ratio); then
   a before-and-after section for every step W0 to W10 (the user, 2026-11-12: "keep a detailed comparison report of before and
   after on all steps so we can showcase how sick version 2.0 gets"), each row a number from that step's `build/evidence/` with its
   file named (gate times per changed file, the suite's wall and its slowest file, init and update and doctor cold and cached, the
   hook wall per event and per tool through the runner and the proxy, Stop's p50 and p95 on the replay, the replay's summed hook
   wait, its mean per event, per prompt and per tool call, the node processes started and the hook CPU (every total a sum over
   the real events, never a median times a count), the hook waiting per feature task (bandwarp's event log grouped by its
   `agent` id, each kind of task's calls times the real cost of a call, before and after) and one scripted feature task (a knob
   added to a planted panel and a gain changed in a planted DSP block, the same tool calls in the same order) timed end to end on
   1.9 and on 2.0, the release's wall per
   kind of change, npm pack's size, tsc's build, the copies removed per helper, the files and lines per folder, the pack files
   passing the template, the hand-kept facts now generated, the faults found by typing), the targets missed in their own rows with
   the reason; then a showcase page `docs/workorders/typescript/showcase.md`, the ten biggest wins as before, after and the factor,
   its copy through `tim-writing` (it is public: the README's 2.0 section and the GitHub release notes are made from it); then what
   was converted (files and lines per folder, before and after), the owners made and the copies removed (counts against the surveys),
   what is proved and how, the bugs typing found (each KWB), what is not done (other languages' LSP, the CARRY rows, Windows natively,
   WSL and a shared Linux box for the proxy, an older macOS than Go's minimum, Node 22.0 to 22.17, npm's OTP, the hand copies left),
   the user's first actions after 2.0.0 (bandwarp's update: the commands, what its settings migration does, the daemon it gets, the
   binary that lands in the user's cache and the PC's own `update` under WSL), and what the kit did well and badly with counts from
   `logs`.

**Done when:** the comparison table has all twelve rows with a before, an after and a ratio, each after measured in this step (its
evidence file named); every step W0 to W10 has its before-and-after section with at least three numbered rows, each citing its
evidence file (a check: 0 rows without a file that exists); `showcase.md` holds ten wins, each traced to a row of the report; each of the report's 9 sections holds at least one number or a stated reason there is none (0 blank); `npm run
check` exits 0 and `test/repo-lint.test.mts` is green on the final tree; the report is pushed.

3. `docs/whats-new-in-2.0.md` (the user, 2026-11-12: "a detailed whats-new-in-2.0.md report"), public, its copy through
   `tim-writing` before it is written: what 2.0 is in one paragraph; what changed for a project (TypeScript with the LSP, the Go
   proxy and the resident runner, hooks in parallel, the status line served live, the Go sampler and its watchdog, TypeScript
   enforced in JavaScript projects, the pack template, the generated counts); what changed for working on the kit (the
   change-to-tests map, the release in one command); every number from W11's report with its evidence file, the targets missed
   said plainly; what a project does to move to 2.0 (`update`, what its settings migration does, what lands in the user's cache);
   what is not proved (Windows natively, WSL for the proxy, Node 22.0 to 22.17).
4. The README's performance graph (the user: "a graph that shows high level performance increases and where it counts and
   matters"): an SVG made by `scripts/counts.mts` from W11's evidence (never drawn by hand), one horizontal bar pair per measure
   that a user feels (the wait per turn, Stop at p95, a release from commit to npm, the gate for a one-hook change, a Bash call's
   hooks live, `doctor` cached, `update` warm), before and after on one row with the factor written at the end, a light and a dark
   file shown through an HTML picture element, its colours and marks from the `dataviz` skill; a plain table of the same numbers under it for
   readers without images; `counts --check` red when the graph and the evidence disagree (a plant).

**Done when (items 3 and 4):** `whats-new-in-2.0.md` exists with every section above, every number traced to a row of the report
(a check: 0 numbers without one); the README shows the graph in both themes and the table under it; a planted change to one
evidence number turns `counts --check` red until the graph is generated again.

## W12. Land and publish 2.0.0 (the one stop)

The one landing and the one publish, after W11: the CHANGELOG's 2.0.0 section (1.9.0 folded in with KWB-165 to 167 and the admiral
pack), the README rewritten for 2.0.0 (what the kit is now: TypeScript with the LSP, the Go proxy and the resident runner, hooks in
parallel, the release in five minutes, the new commands, the before-and-after numbers of W11), its copy through `tim-writing` before
it is written and its tables from `scripts/counts.mts`, then `npm run release major` for real, with the user's yes written into the
PROMPT before this step runs (written 2026-11-11). No prerelease on `latest` (kit-fresh compares three numbers).

**Done when:** `counts --check` green on the new README and every number in it traced to W11's evidence or the generator; 2.0.0 on
npm (`npm view` shows it) and `main` on GitHub equal to the local `main`; the tag and the GitHub release exist;
`docs/workorders/typescript/DONE` names the commit; bandwarp is untouched (its `git status` in the evidence, 0 changes).

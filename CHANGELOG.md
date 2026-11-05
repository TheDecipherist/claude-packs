# Changelog

## 0.34.0 (2026-11-05)

Trying to reverse engineer a real machine from nothing found what no test had: the pack could not reach a new project.

- The base configuration offers `reverse-engineering`. A new project has no code to read, so it was given plain `base`, and `add reverse-engineering` was refused: nobody starting from a ROM and a manual got any of it.
- `names-sweep --banked` reads a ROM larger than the CPU's address space. It tries each bank at each window. A negative `--base` used to crash it.

## 0.33.0 (2026-11-05)

- New base skill `pdf-to-md`: a PDF is read with docling, which keeps tables as tables. It says how to spot a download that is not a PDF and a scan with no text, and leaves images out: 79 KB and 37 seconds on an 87-page manual, against 2.2 MB and 114 seconds by default.

## 0.32.0 (2026-11-05)

Six more real repos were read with the kit, and it was wrong about them in ways no test had seen.

- `suggest` and `scan` read a project as it is. The kit's own files in `.claude/` are no longer evidence: `audio-thread-realtime-safe.md` had counted as reverse-engineering notes because the name holds `-re`. A reverse-engineering project is known by `[FW]` findings and its disassemblers, MIDI by what the code does, and a configuration named in `layout.json` stands.
- A long identifier is no longer a secret: control names in panel JSON were reported as keys, 11,410 of them in one repo. A key's random part runs unbroken.
- A build folder is known by what the build leaves, whatever it is called. `scan` leaves it out and reports it: one repo held 1,663 tracked build files, 43% of the repo.
- `names-sweep` reports where names sit densest, so a common word elsewhere does not hide the table; tries names with vowels dropped; wants most gaps to agree before calling a stride; says when an image looks compressed or encrypted and to stop; and reads three bytes per 16-bit word.
- New rule `addresses-name-their-space`. `names-first`, `menu-map`, `gather-sources`, `bank-census` and `findings-are-withdrawn-in-place` corrected against what these repos and two bug logs record, including where 0.31.0 said too much.
- `no-rom-table-literal` reads decimal tables, and `firmware-out-of-git` knows `.lst`, `.wiz`, `.mfw` and `.raf`.
- Reverse-engineering rules load where the work is: research notes and tools as well as code, through concepts. They were scoped to code files alone, so they did not load in research notes, and their hand-written paths hid stray files from `doctor`. Only `names-before-code` loads at launch, because it applies before any file is opened.

## 0.31.0 (2026-11-05)

0.30.0 was written from the playbook, without the two repos where this work was done and documented. Read against them and run on their real images, it was missing most of the method, and its tool could not read one of the updates it was meant for.

- `names-sweep` searches a name as a display prints it: squeezed and cut to a column. On a real image that took the names read from 10 to 142 of 226.
- It tries both bit orders of 7-to-8 packing. Roland's order was missing, so a real OS update read as nothing; it now reads through the packing its research recorded.
- It keeps a message's short last group and drops a trailing checksum. Without them an update read names while 63% of its bytes were wrong; with them the eight files of a real update decode to the EPROM, 524,288 of 524,288.
- It reports a pool: names in one unbroken printable run, to be read whole because a name that fills its field has no terminator.
- One or two names reading no longer counts as proof. They can read by chance, and the tool says so and exits 1.
- `names-first` adds name pools and value blobs, completing a manual's cut lists from the firmware, using a list's item count, pairing N names with N numbers to find a unit, and proving a table across images. It warns against the manual's prose order and against tables built by walking its names.
- New skill `menu-map`: the tree from the manual's sections, joined by its own display drawings, with both mismatch lists: on a page but in no dump, and in the patch map with no page.

## 0.30.0 (2026-11-05)

The reverse-engineering pack held the audit rules and almost none of the finding techniques, and the fastest one was missing: a machine has to print what it calls things, so its names are in the image as text.

- New skill `names-first` and rule `names-before-code`: the manual's names (patches, arp patterns, delay and reverb programs, menus, parameters) are listed and searched for before any disassembly.
- New tool `names-sweep`: searches an image for those names as stored and through every wrapping the rebuilds met (an EPROM pair, a set high bit, swapped and reversed words, 7-bit packing, nibbles, each sysex message opened behind its own header, a custom character set). It reports the wrapping, each group's stride and order, the pointer table, and the entries past the manual's list. A name that reads proves the unwrapping, and when none reads it says what was searched.
- Measured on a real EPROM: 255 of a manual's factory patch names read as stored, 222 of 254 in the manual's order, which locates the factory bank with no disassembly. One real OS update file reads under none of the 118 wrappings, and the tool says so.
- `gather-sources` puts the names first, and `re-deliverables` keeps the names file.

## 0.29.0 (2026-11-04)

The kit could not say which of its hooks work. `hooks.log` cut itself to 16 hours, a refusal left no reason or file, and only the shape hooks counted what they refused: 89 refusals on one project against a handful ever written down.

- Logs are never cleared. A log past 1 MB moves whole to `.claude/logs/` under a dated name, and stays there (`guards.logs.maxKb`). This holds for `hooks.log`, `usage.log` and the new logs, from Node and from Python.
- Every call is a line of `.claude/logs/events.jsonl`: session, agent, working folder, event, tool, the file or command or prompt, and each hook's time, exit code, reason and output. Secrets are masked, and file contents are not kept, only their size.
- Every refusal and crash is also a line of `refusals.jsonl`, with an id, branch, commit, kit version and the hash of the hook that decided.
- New `logs` command: per hook, over all the history, calls, refusals, verdicts, and how often the same file then passed. `logs refusals [--hook <h>] [--open]` lists them, and `logs mark <id> right|wrong "<why>"` records a verdict.
- New base rule `refusals-are-judged`.

## 0.28.0 (2026-11-04)

Four packs from the playbook of rebuilding classic machines from their firmware. Most of their laws come from failures that passed every test: nine units deaf to the transport, 272 of 625 presets silently on defaults, 15 algorithms on one DSP path.

- `reverse-engineering`: two sources before naming, a source tag on every law and a ledger for what was tuned by ear, a negative names what was scanned, every term of a sum accounted for, findings withdrawn in place. The `gather-sources`, `bank-census`, `tripwire-the-law` and `re-deliverables` skills, and the `firmware-out-of-git` hook, with small named test fixtures allowed.
- `midi`: the law of clock and sync, with the full reference beside the `clock-probe` skill; sysex as records that round-trip byte for byte; imports that count every loss. Nine checks.
- `sound-design`: algorithms are data, neutral is exact, the meter before the engine, tests off the easy point. The `choose-observable`, `measure-reverb`, `spread-probe` and `measure-a-law` skills.
- `instrument-shell`: sessions stay loadable, a collapse keeps every route, quiet says why, seams are declared. The `hit-the-painted-control` and `gates-from-commit-one` skills.
- A project declares `guards.instrument.kind`, `reproduction` or `original`, and `oscillators-bandlimited` follows it: on a reproduction the machine is the spec.
- `cpp` gains `cpp-builds-everywhere`, with `cpp-no-zero-size-array` and `cpp-m-pi-not-standard`. `repo-litter` refuses `:Zone.Identifier` files, which break a Windows checkout. `ci` gains `generated-files-have-no-diff`, and `a-control-is-seen-to-fire` the laws on injected faults.
- Most of the new checks found little on four real repos, so they guard against regressions. They did find ROM tables in source, a raw struct in a session blob, and a hard-coded key anchor. One check was dropped after 213 false hits.

## 0.27.0 (2026-11-04)

From the scan of a content-heavy site, the first of its kind, where the kit judged published text as code.

- Content folders. `isContent` (`hooks/lib/content.mjs`) is one rule for the whole kit: `articles/`, `blog/`, `posts/`, `content/`, `tutorials/`, `examples/` and `samples/` hold text and samples, unless they sit under a code root. `template-law`, `code-shape`, `once-only`, `file-size-guard` and the code checks leave them alone at the write; the writing laws still read them. On that site, 50 "secrets" in code became 0, and 973 sample hits left the count. `guards.content` adds a project's own.
- `scan` reports code first and public text last, and `suggest` takes no evidence from samples. It now finds plain HTML sites, which got no UI pack before.
- `no-time-or-date` is opt-in, and leaves articles alone even when on: dates there are the subject. A date that is a fact is fine; the rule now refuses invented ones.
- A placeholder password in a connection string is no longer a secret.
- New `content-site` pack: complete page heads, one source per page, defended public forms, sized media, and the `publish-a-page` skill.
- New base hook `repo-litter`: `git add` of a file over 10 MB, a working screenshot in the repo root, or a debug dump is refused. `scan` reports the repo's weight. Held back in existing projects.
- New checks in `http-api`: `failure-is-not-empty` (an empty 200 when the database is down) and `csp-not-switched-off`. `api-path-versioned` now reads paths like `/adminTools/api/`: every API is versioned, an internal one too.
- `hmac-over-reserialised-body` no longer fires on a plain proxy forward. `scan --prompt` now asks whether CLAUDE.md and the README still tell the truth.

## 0.26.0 (2026-11-04)

- New `dynamic-data` pack, from the post-mortem of a 20-year CMS and its successor's design: one definition drives every surface, definitions are validated data, the engine enforces and the UI reflects, every dynamic surface has a boundary, fields have owners, saves are patches, a fact is stored once, imports drop nothing, a list is a saved query, and a new tenant costs one document. Ten rules, nine checks and the `design-a-definition` skill. It finds little on the three repos measured, which are not definition-driven; its checks are proved by their examples, drawn from that system's real faults.
- API versioning in any framework: `api-path-versioned`, `next-api-route-versioned` and `client-calls-a-version` in `http-api`, the `apis-are-versioned` rule and the `change-an-api` skill. Only Fastify routes were judged before, and nothing covered a breaking change inside a version.
- `full-stack` is split. Most of its rules held for any project, so they moved to packs anyone can take: the layered API laws to `http-api`, `tests-use-inject` to `fastify`, `dockerfile-multistage` to `docker`, the schema laws and `schemas-only` to a new `zod` pack, and the hover law into `ui-craft`'s `pointer-feedback`. The `full-stack` pack is now only the stack choice. The configuration always takes `http-api`, `fastify`, `zod` and `docker`, and `js-ts` by default: it could not take `fastify` before.
- `replaces` on a check: a wider check stands in for a narrower one, so a project with both sees a hit once.

## 0.25.1 (2026-11-04)

- The README is a front page for everyone: what the kit does, how to start, every pack, configuration, preset, command and base hook. The notes from earlier releases moved to `docs/history.md`. `test/readme.test.mjs` fails when the page falls behind.
- CLAUDE.md is up to date with the scan, suggest and fix commands, the language table and the invariants the tests hold.
- The licence holder is TheDecipherist, and the `humanize` skill no longer carries one employer's context.

## 0.25.0 (2026-11-04)

Every language, and repetition stopped before it is written: AI writes the same thing over and over, in any language.

- One language table (`hooks/lib/languages.mjs`) feeds the statement reader: C and C++, JS and TS, Python, shell, Go, Rust, Java, C#, Scala, Dart, Kotlin, Swift, Ruby, PHP, Lua. A new language is one row. In shell the command and its flags are the shape, and its arguments are what differs.
- `template-law` catches more at the write. Near copies: most of a stretch of statements matches another file in order, with lines changed, so no stretch is exact. Re-made functions: a compound name the repo already defines (`escapeHtml`, `parse_config`). Plain words and names in many files are left alone. On the kit it finds no near copy; on the real repos measured, every near copy read was real.
- New hook `reuse-hint`, at the prompt: when a prompt's words name a function the repo has, what exists goes in front of it, before a line is drafted. Six at most, and nothing when nothing matches. New to a project, so held back until `enable` names it.
- New `python` and `shell` packs and a `python` configuration: rules, 19 checks, and `python-extract-template` and `shell-extract-template`. `js-ts` gains `js-repeats-become-templates`. The presets are `python-app` and `shell-tools`, and language packs can be chosen in every configuration that holds code.
- New `suggest` command and `init --auto`: the configuration and packs a project needs, read from its own files, with the evidence, so nobody picks them by hand. The configuration follows the language most of its files are in.
- New `fix` command and `fix-from-scan` skill: the last scan as a work order, `.claude/fix-plan.md`, in the order to work it, every finding a box. `scan` also lists near copies and functions made again.
- No person is named: rules, skills, hooks, comments and logs say "the user", and the writing pack is about the author's voice, whoever that is. `test/no-personal-name.test.mjs` holds it. The hook that repeats what the user asked is now `user-asks`, and the voice rule is now `direct-voice`; an `enable` list with the old name still works. Stock packs' author is `claude-packs`.
- Packs from senior reviews of three real repos, which found the worst faults had no check (one customer reading another's data, a guard that passed on an empty list, a password in a log): new `http-api` (any framework: every record tied to its caller, guards fail closed, validated input, safe credentials, SSRF, webhooks) with the `secure-a-route` skill; `react`; `multi-tenant` with `prove-tenant-isolation`; `websocket`; `host-agent` (root on other people's machines); `go` with a `go` configuration; and `ci`. `suggest` finds each from the project's files.
- New checks in `cpp` from the review of a large C++ repo: faults only in the test build (`cpp-no-getenv-in-product`), mutable statics and globals, `using namespace` in a header, `atoi`, unchecked `fwrite`, clamp before cast, typed pi, `const_cast`, float loop counters, a hardened test build, and rules on thread contracts, header hygiene and running static analysis. `base` gains `lookup-over-ternary-chains`, `stub-reports-success` and `test-skip-on-failed-setup`; `js-ts`, `mongo`, `docker`, `web` and `html-ui` gain checks too.
- New hook `code-shape`: a write that adds a line over 120 columns of code, a line with more than two statements, a function over 50 statements or over 6 parameters is refused; what stands is judged only if it gets worse. One repo's 300-line limit was being beaten by width: 21% of its code lines held two or more statements. Limits are in `guards.codeShape`. Held back in existing projects. The kit itself runs it with looser limits for now: its own lines are wider than the default.
- Kit faults those reviews found: `blankCode` read a `//` inside a string as a comment, so every check on strings or code could miss what followed a URL. `sh-strict-mode` could never fire. A private key header with no body is no longer a secret, a key under a custom prefix or in a `.private` file is. `file-size-guard` counts `.inc`, `.inl`, `.ipp` and `.tpp`. The clang-tidy header filter matched nothing on absolute paths. A check can state its `kind`, and `whenDep` limits one to a dependency's major version.
- Noise cut from what was read as false: `no-express-no-vite` and its rule moved to `full-stack`, since they are one stack's choice; `json-only-through-helper`, `ui-no-eyebrow`, `switch-is-a-table`, `no-shell-string-interpolation`, `client-no-api-key`, `stored-text-through-renderer`, `child-process-error-handler` and others tightened; a duplicate pair of checks no longer counts one line twice.
- KWB-43: `client-no-server-import` looked across the whole file at every position, so one scan never finished. `test/check-speed.test.mjs` holds every check to a budget.
- KWB-44: a shell write to a path in a variable was judged as if inside the project.

## 0.24.0 (2026-11-04)

Anything repeated becomes a template, in C++ above all ("we need to thoroughly do c++", "anything you find that is repeated should have something that makes it reuseable and template like", "maybe make a specific c++ pack"). Measured on Stellix: 523 files, 51,492 lines.

- `template-law` reads statements, not lines (`lib/code-shapes.mjs`). It now sees many statements on one line, and three kinds of repeat in code: an object set up field by field, a run of statements with one shape (a copied helper, whole or in part), and one call repeated with other arguments (a table written as code). Data tables, includes, imports, macros and JS template strings are not statements here. On Stellix it finds 302 repeats, 950 copies, where 0.23.0 found 10 and 68. Of 26 sampled by reading, none was a false match and 3 were borderline. A hook call there takes about 100 ms warm, 520 ms cold.
- A refusal says what to do: what the repeat should become, what differs between the copies (the template's parameters), and to take the copies out first. `scan` lists every repeat the same way, and in `claude-packs-scan.json`.
- A copy with the same name in another file now counts: 20 `bd` descriptors were invisible to 0.23.0 because they shared a name. Folders of kind `copy` and `guards.templates.exclude` are left alone.
- New `cpp` pack and `cpp` configuration: `cpp-repeats-become-templates`, `cpp-gates-share-one-reader`, `cpp-find-with-the-library` (with its check) and the `cpp-extract-template` skill. `synth-creator` offers it by default, the `synth` preset takes it, and `scan` recommends it for C++ sources.
- New base skill `make-it-a-template`, and the check `one-walk-per-template`: a test or gate that presses, clicks or drags every instance of a template is refused. On Stellix it finds the one such walk, in the press gate. New to a project, so held back until `enable` names it.
- The hover gate covers `ui-craft`: doctor is red for web UI code with no hover gate. `hover-state` moved from `full-stack` to `ui-craft`, which `full-stack` takes.
- The kit's own repeats are gone: selftests call `verdicts`, and the making-check limit cases share `sendBacks`.

## 0.23.0 (2026-11-04)

template-law (anything "component" used more than once is a template, enforced, in html, c++ and apps).

- New base hook `template-law`: a write that adds an element built by hand, in the shape of one already in this file or another of the checkout, is refused. It strips names and text (lib/elements.mjs), so copies that once-only cannot see look the same: markup by tags, attribute names and nesting (HTML, JSX, Vue, Svelte, template strings), and code by the members set on one object in a row (a C++ control, a widget). Using a component, a `.map()`, data rows and one object used twice are left alone; `one-off: <reason>` on a line marks a real exception. A new hook: held back in an existing project until `enable` names it. On AdmiralMCP's 175 files it finds 3 shapes, in 111 ms, and none in the kit.
- `scan` reports elements built by hand more than once. dispatch-once takes its walk from the shared lib.

## 0.22.1 (2026-11-04)

- One template, all the way through: `house-control-behaviours`, `prove-control`, `hover-state` and `hover-every-pressable` still asked to walk every control. They now walk one per template and every one-off, and prove the rest by a table read that each is built from its template and wired, which is what catches a control wired to nothing. `pointer-feedback`: the hover lives in the template.

## 0.22.0 (2026-11-04)

The depth of ui-craft (everything in taste-skill is useful; a hovered element says so; anything used twice is one template, tested once).

- Rules: `pointer-feedback`, `screen-answers-one-question`, `data-tells-the-truth`, `apps-are-not-pages`, `page-holds-its-frame`, `pictures-do-a-job`; deeper `motion-is-rare`, `survives-real-data`, `interface-copy`, `no-generated-look`, `type-space-colour`.
- Skills: `app-screen`, `chart-choice`, `page-critique`, `redesign-page`, `build-from-reference`, `write-the-page`. Tool `page-measure` for a `prove-page` gate, proved in real Chrome.
- Twelve checks from taste-skill's lint rules, and `no-ts-enum` and `test-name-says-behaviour` in js-ts.
- `test-the-template-once` (base): behaviour is tested on the template, once; a structural pass proves the instances are that template. `instances-by-index`, `subagent-dispatch` and `prove-instances-identical` say so.
- `shape_symmetry` scales: over 8 instances `members` compares each with the first and `swap` takes a spread of 8, so 1,000 instances cost under 20 swaps, not 499,500.
- `scan` lists secret-shaped text in test files apart. docs/rules-without-checks.md lists the rules no regex can hold. README: the packs table from the manifests, credits.

## 0.21.0 (2026-11-04)

Custom packs (if a person makes something for their employer's internals, it should be easy to make a repo and share it with their team).

- `new-pack <name> [--repo <git-url>]`: a ready repository for a team's own packs (`packs/<name>/`, a manifest, an example rule, check and skill).
- `add <name> --from <git-url>`: fetches the repository to a cache, never runs it, checks the manifest, and installs the pack in any configuration. The lock records its url and commit, so a
  teammate's checkout restores the same pack; `update` pulls the newest. Access is the git host's. A custom pack's hooks stay off until the project's `"enable"` names them.

## 0.20.0 (2026-11-04)

What a real install found (AdmiralMCP on 0.14.0, its build/kit-review-plan.md Phase 5).

- Bugs: `entry-registers-shutdown` read its signal names with strings blanked, so handlers never counted; `no-nested-ternary` missed `a ? b : c ? d : e`; `no-swallowed-errors`
  missed `.catch(() => ({}))`.
- The lock records the kit version. git-guard: `guards.git.ghAuth: "cli"` for a machine where gh is logged in; `guards.git.trunkNeedsYes` so neither a commit nor the session's end waits on a
  trunk only the owner pushes.
- Checks that missed what they exist for: `driver-outside-gateway` (accessor functions), `no-db-in-route-file` and `origin-from-config-not-host` (`ui/`), `no-inline-client-script`,
  `stored-text-through-renderer` (more fields, `esc(a ?? b)`), `no-latest-base` (`--platform`), `dockerignore-has-the-basics` (`**/` forms).
- Tuned: `line-under-200-chars` and `json-only-through-helper` leave tests, scripts and templates alone; `no-express-no-vite` allows vitest and the word; `lookup-over-if-chains` skips null guards;
  `model-call-needs-boundary` takes an imported boundary; `mongoclient-cached-and-named` takes a module cache; `copy-needs-chown-with-user`, `user-bytes-need-disposition`, `docker-exec-form` on HEALTHCHECK.
- `no-find-reads` and `reads-aggregate-writes-bulk`: a `find` that sorts or limits in the database is fine; the check is for unbounded reads.
- Rules that named files a project may not have say to create them. kit-lock adopts its own lease after a session id change (KWB-40). The shape `ids` (KWB-16) and a row's `senses` (KWB-20).

## 0.19.0 (2026-11-04)

The pack manifest (pack.json says if a pack is stock or custom, has a git url, fields like a package.json, and who made it).

- Every `pack.json` now carries `name`, `version`, `description`, `type` (`stock` or `custom`), `author`, `license`, `homepage`, `repository` (`type`, `url`, optional
  `directory`), `keywords` and `engines` (`claude-packs`, the lowest kit version it works on). `lib/pack-manifest.mjs` checks them; doctor checks the installed packs;
  `list` shows version, type and author. The kit's own packs start at 1.0.0.

## 0.18.0 (2026-11-04)

hook-proof (whenever a hook is supposed to exit 2 and it exits 0, it is caught). Only exit 2 blocks, so a guard fails open and in silence.

- doctor is red for a hook no settings entry runs, and for a hook that crashed since it last changed (its exit code in `.claude/hooks.log`): those calls were not
  judged, and went through. A hook killed at its timeout leaves no line and is not seen.
- New pack `hook-proof`, in every configuration: rule `a-refusal-is-exit-2`, skill `prove-a-hook`, and five checks on hook files and settings:
  `hook-exit-1-does-not-block`, `hook-catch-must-not-allow`, `hook-no-or-true`, `hook-command-no-pipe`, `hook-refusal-on-stderr`.
- A work branch never needs a yes to push; only the trunk can, and only where a project's CLAUDE.md says so ("a project should not need a yes before pushing, only to main"): `finished-work-lands`, `land-branch`, `git-right-first-time`.

## 0.17.0 (2026-11-04)

ui-craft and landing.

- New pack `ui-craft` (build the UI/UX additions from the best public skills; docs/ui-craft-sources.md says what came from each): ten rules (forms, motion,
  real data, URL state, touch, dates and numbers, interface copy, type and space, the generated look, the rendered page), skills `ui-code-review` and
  `prove-page`, twelve checks. A check blocks only what is objective or what the sources agree on. The `node-ui` and `next-app` presets bring it; node
  and full-stack take it (full-stack by default); `scan` recommends it for a UI.
- `layout.json` `"gates": { "a11y": "<command>" }`: doctor is red for UI code with no page gate, as for hover; `"none: <reason>"` declines.
- `design-direction` reviews the plan against the brief; `design-review` says which findings are law and which taste, and judges the production build.
- Rule `finished-work-lands` and skill `land-branch` (base: whenever a work branch is finished it is merged into main and pushed).

## 0.16.0 (2026-11-04)

Scan (a real install's review found security bugs that could have been very bad in production, so a project owner should get that review before choosing to install anything).

- `claude-packs scan [--out <file>]`: copies the project (what git tracks or would track; never .env, key files, node_modules or build output) to a temp
  folder, installs the recommended configuration and packs there, runs every check over every file with the secret patterns, the line limit
  and coverage, and writes a report and every hit beside the copy. The project, its .git included, is never written to. The recommendation
  gives its evidence per pack (lib/scan-detect.mjs). A hit is reported as a candidate; a secret by file and line, never its value.
- `scan --prompt` prints the review brief (prompts/scan-review.md) for what no check can see: reviewers by concern (security, runaway work, work that
  disappears, platform and operations), read-only, on the copy, every finding marked measured, read in the code, or claim.
- lesson-checks exports `loadChecks` and `hitsOf`, with line numbers.
- Fix: `no-find-reads` had `\bollection\b` for `collection`, so `collection.find(q)` got through; found by a real install's review.

## 0.15.0 (2026-11-04)

Writing (whatever goes public, a manual, a md file, a reply, reads and is formatted properly; split humanize into small pieces).

- New pack `writing`, in every configuration's `always` packs. Nine rules on public text (README, `*.mdx`, docs/manual, docs/guide, manual,
  content, blog, posts, articles, drafts; internal specs, logs and briefs stay plain): `cut-the-padding`, `rhythm-like-talk`, `no-stock-language`,
  `no-scaffolding`, `no-time-or-date`, `ascii-no-em-dash`, `write-from-your-own-corner`, `direct-voice`, `no-cargo-cult`.
- Ten one-job skills: `humanize` (the last pass), `reply-stance`, `should-i-reply`, `reply-moves`, `reddit-post`, `pick-subreddit`, `reddit-title`,
  `argument-post`, `launch-post`, `post-voice`.
- Eleven lesson checks for the tells a regex can see, held back in existing projects until `enable` names them.
- lesson-checks: `"prose": true` (lib/prose.mjs) leaves frontmatter, code, comments, link targets and URLs out, so `npm test -- x` is no double dash.

## 0.14.1 (2026-11-04)

- The project is under the MIT license: LICENSE at the root; package.json and the lock say MIT (they said UNLICENSED).

## 0.14.0 (2026-11-04)

Stored text (UIs render what comes from a database with \r correct, code highlighted and markdown parsed).

- New pack `stored-text`: rule `stored-text-renders-once` (one renderer, `stored-text.*`: normalise line endings; markdown with raw HTML off;
  highlight fenced code by language on the server; sanitize last; a terminal's lone `\r` overwrites its line; a visible backslash-r is a
  write bug, fixed at the source), skill `render-stored-text` (how to build it, and the fixture row that proves it), and four checks:
  `stored-text-renderer-complete` (needs mode: the renderer does all four jobs), `stored-text-libs-only-in-renderer`,
  `no-raw-html-from-data` (`dangerouslySetInnerHTML`, `innerHTML`, `v-html` take only the renderer's output) and
  `stored-text-through-renderer` (a `content`, `body`, `markdown` or `transcript` field straight into markup; it reads names, not data
  flow; a `plain text:` comment marks a field that is plain).
- The `node-ui` and `next-app` presets bring it; the node and full-stack configurations take it (full-stack by default).
## 0.13.1 (2026-11-04)

- git-guard: a commit in a Claude agent's isolated worktree (.claude/worktrees/agent-*) is not refused for its branch being ahead of
  GitHub: the harness refuses pushes there, so the lead pushes the branch; Stop still holds every branch to GitHub (KWB-42).

## 0.13.0 (2026-11-04)

The time laws (KWB-41: "Anything like tests that consume a ton of time that could/should be avoided should have a small skill or rule or both").

- doctor remembers a passed selftest (lib/selftest-cache.mjs) by the hash of the hook, hooks/lib, the runner, node, the detector and the
  project's guards: an unchanged hook is not proved again (7.5 s to 1.9 s per doctor, on every init, update and test). A failure is never
  remembered; `doctor --fresh` runs them all. `npm test` keeps one memory per run.
- Hook `suite-once` (base): a whole-suite command (`npm test`, a bare `ctest`, the project's `commands.test`) is refused on uncommitted
  work: the whole suite runs once, as the gate before landing. Named tests and changed-only runs pass. Rule `test-only-what-changed`,
  skill `pick-tests`. New to a project, so held back until `enable` names it; the kit runs it on itself.
- `test:changed`: a version bump alone chooses no test; a pack other than base chooses only the tests that bring it in, by name, preset
  or configuration (nginx 29 of 35 files to 6).
- Rules behind the hooks that cost the most turns, each installed with its hook: `git-right-first-time`, `reuse-before-writing`,
  `making-line-first`, `split-before-the-limit`, `long-work-in-the-background` (synth-creator). Skill `build-through-the-queue`.

## 0.12.0 (2026-11-04)

The v8 additions (claude-packs-kit-v8-additions.zip: the web side of mddkit), merged by hand on top of 0.11.0.

- fastify: security is one `isProd` switch (mddkit http-security's iron rule), not "always on": rule `security-one-switch` and
  checks `sec-headers-present` (needs mode: `Fastify(` needs `helmet`), `no-trust-proxy-true`, `no-err-message-to-client` replace
  `security-always-on` and `security-not-behind-node-env` (deleted). `one-error-body` cites the new rule. Rules
  `credentials-and-input` and `three-layers` with checks `no-regexp-from-input`, `password-needs-slow-hash`,
  `secrets-compared-constant-time`, `api-routes-versioned`, `no-db-in-route-file`.
- New packs: `web` (Next.js/React: accessibility, styles in stylesheets, Tailwind 4, one UI-primitives module, web performance,
  production build, client boundaries; 7 rules, 20 checks, skills design-direction, design-review, pick-rendering-mode,
  preflight-build, seo-audit), `tui` (1 rule, 5 checks, skill build-tui), `nginx` (nginx-production and modsecurity-tuning;
  7 checks, skill waf-rollout). The node configuration takes them.
- js-ts: rule `one-logger`, check `tsconfig-flags` (strict, noUncheckedIndexedAccess, verbatimModuleSyntax). ai: rule
  `llm-pipeline-security`, check `model-output-validated`.
- Presets: eight (`next-app`, `node-cli` and `edge` added).
- docker's per-service compose checks arrived already in the kit (0.11.0): the same JSON, the kit's formatting kept.
- Not taken: the zip's lib/packs.mjs beyond its PRESETS block (the kit's is newer). `seo-audit` has no `checks.md` beside it
  (mddkit's references/checks.md was not in the zip; the skill says so and falls back).

## 0.11.0 (2026-11-04)

The v7 additions (claude-packs-kit-v7-additions.zip, merged by hand: the kit's own files kept wherever the zip's were older).

- Dispatch laws in base, for C++ and JS/TS: rules `lookup-over-if-chains` (three branches on one value are a lookup),
  `field-map-over-if-runs` (three ifs on one object's fields are a field table and one loop) and `behaviour-lives-with-its-kind`
  (each kind owns its behaviour in one object, table or class, chosen once). Checks `lookup-over-if-chains` (also catches ifs in a
  row that each return on the same value, the act-line renderer's shape the zip's version missed) and `field-map-over-if-runs`.
  Hook `dispatch-once`: a write that adds a `switch` on a kind another code file of the same checkout already switches on is
  refused; every write route, worktree-aware, through the runner, with a selftest (seen red on a planted fault). The rules' hot-loop
  exception points at audio-core's `per-sample-code-inlinable`; their examples name no synth word (base-neutral).
- lesson-checks: `mode: "needs"` (when `pattern` appears, every regex in `needs` must too; a write is refused only for a need it
  newly leaves missing), ported into the kit's lesson-checks; the modes are one table.
- Seven new packs: `js-ts` (22 rules, 22 checks), `mongo` (5, 16), `fastify` (3, 8), `ai` (1, 3), `docker` (3, 21, skill
  `docker-diagnose`), `shell-hooks` (1, 4), `html-ui` (1, 4). Configuration `node` takes them (base always; init takes js-ts).
- Presets: `init node-api` (js-ts, mongo, fastify, ai, docker), `node-ui` (js-ts, mongo, fastify, html-ui, docker), `mcp-server`
  (js-ts, mongo, ai, shell-hooks), `node-lib` (js-ts), `synth` (audio-core); `list` shows them. A preset's configuration is the
  smallest one that takes its packs.
- docker: `compose-service-needs-init` and `compose-service-needs-healthcheck` judge each service, not the file: a compose file where
  only one service has `init: true` (or a healthcheck) is refused, naming the service that lacks it.
- base's `js` concept is scoped like `cpp` (src/, tests/, test/), so doctor's coverage still finds a source file outside the
  structure; full-stack maps it to its code folders. js-ts's own `js` concept stays repo-wide.
- The kit's own if-chains are tables: the WAV reader (one reader per encoding, chosen once per file), the glob matcher, freeze.mjs,
  version-pin-guard's manifest parsers and git-guard's token-storing subcommands. Left as they are: shell-writes.mjs's tokenizer
  (character and operator dispatch with control flow in each branch; a table would not make it clearer).
- The kit runs the three new laws on itself (layout `enable`).
- Not taken from the zip, the kit's being newer: lesson-checks.mjs, lib/packs.mjs, bin/claude-packs.mjs (presets merged in),
  coverage, project.mjs, placement-law, file-size-guard, version-pin-guard, prove-control, subagent-dispatch and three tests; the
  synth-creator pieces 0.10.0 moved out of base (frozen-files, stage-guard, freeze, two rules) stay out; the global `new-project`
  skill stays the `new` command (the global part is three pieces).

## 0.10.1 (2026-11-03)

The hover law (2026-11-03; the kit half of Stellix B-261): "Controls dont have a hover state ... all controls and screens that
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

Configurations (STEP 3: "Today the kit is one configuration pretending to be general. Build it as data."; KWB-31).

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
  spec-lock, frozen-files (+ freeze.mjs), protect-vendor, stage-guard, build-sweep, idle-wake, user-asks; the rules
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
- **Every kit hook is Node:** git-guard, build-guard, time-guard, user-asks, idle-wake (base), gnu-shell and shell-traps
  (global) are ported, each with its selftest. One is left: `browser-guard.py` (gpu-painter). Its port waits until Stellix
  runs 0.7.0, because Stellix's installed browser-guard refuses writing a file that holds the selftest's planted launch
  samples (probed: exit 2 on `browser-guard.mjs`; it exempts only its own Python file name).
- **`claude-packs new <name>`** scaffolds a project (the house files, a git repo on a `work/` branch) and installs the
  kit. It replaces the global new-project skill; the global part is exactly three pieces.
- **One session changes the kit at a time:** `.claude-packs-lock` at a checkout's root, and the repo's own
  `.claude/hooks/kit-lock.mjs` (committed `.claude/settings.json`), which refuses every write route while another
  session's lock is in any checkout of the repo. The release merge removes the lock.
- Settings entries of the Python forerunners (`git-guard.py`, `build-guard.py`, `time-guard.py`, `user-asks.py`,
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
- **Moved from Stellix, project-neutral** (a project's values in `layout.json` "guards"): git-guard, time-guard, user-asks,
  idle-wake, build-guard (base); browser-guard and the no-opengl checks (gpu-painter); copy-and-prove (audio-core) and
  build-step (base) skills; the rules hooks-and-gates, plan-and-logs, copy-trees-read-only; copy-tree-guard merged into
  protect-vendor (folders of kind "copy"); from source-guard: file-size-guard counts scripts and CMake, no-shipped-images
  takes `guards.images`, one-seeded-random catches what source_rules caught, `no-code-after-midline-comment`.
- **Opt-in:** user-asks and idle-wake wait for `"enable"`; `update` switches on a hook or check new to a project only when
  its layout enables it, and prints what it switches on and what it holds back before it changes anything.
- **WB-69, every route:** every guard that refuses a write covers Write, Edit, MultiEdit, NotebookEdit and the shell
  (`>`, `>>`, `tee`, `sed -i`, `cp`, `mv`, a heredoc into a file); `test/routes.test.mjs` tries each route on each guard.
- **Global part of three:** latest-versions (with version-pin-guard), gnu-shell, shell-traps. Global by design: they fix
  this machine's shell for Claude, not any project's rules.
- **Fixes:** version-pin-guard read `2>&1` as a package and a `$&` in an Edit's new_string as a pattern; `update`
  re-created `.pack-new` for a file that is the pack's own version; `doctor --strict` counted git-ignored build output.

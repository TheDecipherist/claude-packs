# @thedecipherist/claude-packs

Rules, checks, hooks and skills that hold Claude Code to what a senior engineer would accept, installed per project. A rule tells Claude the law, a hook refuses the write before it reaches the disk, and a skill walks the fix. Everything lives in the project's own `.claude/`, so a team gets it from the repo.

## Start here

Install the package in the project (Node 22+), from a tarball made with `npm pack` in this repo:

```
npm i -D ./thedecipherist-claude-packs-<version>.tgz
```

Then four commands:

```
npx --no-install @thedecipherist/claude-packs suggest      # which packs this project needs, and why
npx --no-install @thedecipherist/claude-packs init --auto  # install exactly that
npx --no-install @thedecipherist/claude-packs scan         # everything already wrong, on a copy of the project
npx --no-install @thedecipherist/claude-packs fix          # the scan as a work order: .claude/fix-plan.md
```

Then tell Claude to work through `.claude/fix-plan.md`. The `fix-from-scan` skill says how.

`scan` is safe to run before installing anything: it works on a copy in a temp folder and never writes to the project. `suggest` only reads file names and `package.json`.

## What happens when Claude writes code

1. **At the prompt.** `making` asks what is being made and what it reuses. `reuse-hint` shows functions the repo already has when the prompt names them, before a line is drafted.
2. **Before the first write.** The step's `making:` line goes in `build.md`: what, which concepts, what it reuses.
3. **At every write.** Hooks judge what the tool call would write, by any route: Write, Edit, a shell redirect, `sed -i`, `cp`, a heredoc, an inline script. A refusal is exit 2 with the reason, and the file never changes.
4. **At the end of the turn.** `making-check` compares what was written with what was said.
5. **Before landing.** The whole suite runs once, on committed work, and `land-branch` merges and pushes.

Four kinds of thing do the work:

| Kind | What it is | Lives in |
|---|---|---|
| Rule | A short law, loaded only for the files it applies to | `.claude/rules/` |
| Lesson check | A pattern with a `bad` and a `good` example. It refuses only an edit that adds a match, so old code can be fixed at its own pace | `.claude/checks/` |
| Hook | Code that judges a tool call and can refuse it | `.claude/hooks/` |
| Skill | One job's steps, loaded when the situation fits | `.claude/skills/` |

## Repetition is stopped before it is written

AI writes the same thing over and over, so the kit works on it at three points. `reuse-hint` puts what exists in front of Claude at the prompt. The `making:` line makes it say what it reuses. `template-law` refuses at the write, comparing code with names, numbers and strings stripped, so a copy with other names reads the same:

| What it catches | What the refusal says to make |
|---|---|
| Markup built by hand again (HTML, JSX, Vue, Svelte, template strings) | One component |
| An object filled in field by field again | One factory function |
| A run of statements with one shape, whole or in part | One function, with what differs as parameters |
| A near copy: most of a stretch matches another file, in order, with lines changed | One function |
| One call repeated with other arguments | One table and one loop |
| A function the repo already has, under the same compound name | Call it, or name it for its job |

A refusal names the copies and lists what differs between them, which are the template's parameters. `make-it-a-template` walks the change, with a skill per language for the forms it has. A real exception says so above it: `one-off: <reason>`.

One language table reads C, C++, Objective-C++, JS, TS, Python, shell, Go, Rust, Java, C#, Scala, Dart, Kotlin, Swift, Ruby, PHP and Lua. A new language is one row in `packs/base/hooks/lib/languages.mjs`. A folder of kind `copy`, or a glob in `guards.templates.exclude`, is left alone.

Anything used more than once is one template, and it is tested once. `test-the-template-once` says how: test the behaviour on one instance, and prove the rest are that template with a read of the table. `one-walk-per-template` refuses a test that presses every instance.

## Code stays small in every direction

`code-shape` refuses a write that adds a line over 120 columns of code, a line with more than two statements, a function over 50 statements or over 6 parameters. `file-size-guard` holds a file to 300 lines. Code that already stands is judged only if it gets worse. Limits are in `layout.json`: `"guards": { "codeShape": { "maxLineChars": 120, "maxStatementsPerLine": 2, "maxFunctionStatements": 50, "maxParameters": 6, "exclude": [] } }` and `"maxFileLines"`.

## Packs

`list` shows every pack and preset, with its version and author. `base`, `writing` and `hook-proof` come with every configuration.

| Pack | For | Rules | Checks | Hooks | Skills |
|---|---|---|---|---|---|
| `ai` | Code that calls a model: untrusted input, explicit keys, model ids | 2 | 4 | 0 | 0 |
| `audio-core` | Any JUCE synth or effect: realtime safety, DSP quality, state, parameters | 40 | 8 | 2 | 7 |
| `base` | Universal engineering, in every configuration | 21 | 7 | 18 | 7 |
| `ci` | CI workflows: every language run, tools pinned, permissions stated | 2 | 2 | 0 | 0 |
| `content-site` | Sites that publish: complete page heads, one source per page, defended forms, sized media | 4 | 3 | 0 | 1 |
| `cpp` | Any C++ project: templates, thread contracts, headers, casts, static analysis | 10 | 14 | 0 | 1 |
| `docker` | Dockerfiles, Compose and Swarm | 5 | 24 | 0 | 1 |
| `dynamic-data` | Definition-driven systems: a CMS, an admin generator, a low-code platform | 10 | 9 | 0 | 1 |
| `fastify` | Fastify servers | 6 | 15 | 0 | 0 |
| `full-stack` | The stack choice: Fastify and Next.js only | 1 | 1 | 1 | 0 |
| `go` | Go: errors handled, wrapped and never discarded | 1 | 2 | 0 | 0 |
| `gpu-painter` | GPU-drawn UI on Dawn, with no OpenGL | 15 | 6 | 1 | 6 |
| `hook-proof` | A hook that should refuse does refuse | 1 | 5 | 0 | 1 |
| `host-agent` | Software that runs as root on machines it does not own | 1 | 7 | 0 | 0 |
| `html-ui` | Server-rendered HTML: every value escaped | 2 | 5 | 0 | 0 |
| `http-api` | Any HTTP server, in any framework: records tied to their caller, guards that fail closed, versioned routes, three layers | 9 | 31 | 0 | 2 |
| `instrument-shell` | Instruments on a shared shell: sessions that still load, panels that keep every route | 5 | 1 | 0 | 2 |
| `js-ts` | JavaScript and TypeScript | 27 | 35 | 0 | 0 |
| `midi` | Clock, sync and sysex, right on the wire and in the audio | 5 | 9 | 0 | 2 |
| `mongo` | MongoDB with the native driver | 6 | 18 | 0 | 0 |
| `multi-tenant` | One system, many customers: no role crosses a tenant | 1 | 2 | 0 | 1 |
| `nginx` | NGINX in front of containers | 2 | 7 | 0 | 1 |
| `python` | Python: templates, errors, resources, safe subprocess calls | 2 | 11 | 0 | 1 |
| `react` | React: failed requests, effects, accessible controls | 2 | 6 | 0 | 0 |
| `reverse-engineering` | Rebuilding a machine from firmware, manuals and banks: the machine's own names first, two sources before naming, every law sourced | 8 | 4 | 1 | 6 |
| `shell` | Shell scripts: strict mode, quoting, shared functions | 2 | 9 | 0 | 1 |
| `shell-hooks` | Shell and Node hooks for Claude Code | 1 | 4 | 0 | 0 |
| `sound-design` | Sound proved by measuring audio: algorithms as data, neutral is exact, the meter first | 6 | 5 | 0 | 4 |
| `stellix` | Laws of one synth project | 5 | 5 | 1 | 0 |
| `stored-text` | Text from a database reaches the page through one renderer | 1 | 4 | 0 | 1 |
| `synth-creator` | The synth-creator configuration's own laws | 5 | 0 | 9 | 2 |
| `tui` | Terminal UIs | 1 | 5 | 0 | 1 |
| `ui-craft` | Application and page design in any web stack | 16 | 24 | 0 | 9 |
| `web` | Web UI: Next.js, HTML, CSS, Tailwind | 8 | 22 | 0 | 5 |
| `websocket` | WebSocket services: identity from the connection | 1 | 3 | 0 | 0 |
| `writing` | Text that goes public reads like a person wrote it | 9 | 11 | 0 | 10 |
| `zod` | Zod 4 schemas written once, in one folder | 2 | 0 | 1 | 0 |

## APIs are versioned, in any framework

`http-api` holds every route under `/api/v<N>/`: `api-path-versioned` reads mounts and routes in any framework, `next-api-route-versioned` reads Next.js route files, and `client-calls-a-version` reads the calls. `apis-are-versioned` says what a version promises: a published version only grows, and a breaking change is a new one with the old kept working behind `Deprecation` and `Sunset` headers. `change-an-api` walks a change. `/health`, auth callbacks and webhooks are left out, since the platform or the provider owns those paths.

## Configurations

A project is one configuration: a kind of project, as data in `configurations/<name>/config.json`. It holds the packs (`always`, `choose`, `default`), the folder template `init` creates, the order of its hooks, what doctor counts as source, and the house rules of its CLAUDE.md block. `.claude/layout.json` `"configuration"` names the project's. With none named, the install takes the configuration that has a chosen pack by default.

| Configuration | For | `init` adds by default |
|---|---|---|
| `base` | Universal engineering only, for a project no other configuration fits | nothing |
| `cpp` | Any C++ project that is not a synth | `cpp` |
| `go` | Go projects | `go` |
| `node` | A Node.js or TypeScript service, web app, CLI, library or MCP server | `js-ts` |
| `python` | Python projects | `python` |
| `full-stack` | A Fastify API and a Next.js web app, with one schemas folder and one database gateway. It fixes a folder layout, so it is offered and never assumed. It always takes `full-stack`, `http-api`, `fastify`, `zod` and `docker` | `js-ts`, `stored-text`, `ui-craft` |
| `synth-creator` | JUCE synths and effects | `cpp`, `audio-core` |

```
npx --no-install @thedecipherist/claude-packs configs                     list them: packs, counts, folder template
npx --no-install @thedecipherist/claude-packs init --config <name>        install one
npx --no-install @thedecipherist/claude-packs config <name> [--dry-run]   switch; prints what changes first
```

## Presets

`init <preset>` installs the packs a stack needs.

| Preset | Packs |
|---|---|
| `node-api` | `js-ts`, `http-api`, `mongo`, `fastify`, `ai`, `docker` |
| `node-ui` | `js-ts`, `http-api`, `mongo`, `fastify`, `html-ui`, `stored-text`, `ui-craft`, `docker` |
| `next-app` | `js-ts`, `http-api`, `react`, `mongo`, `web`, `stored-text`, `ui-craft`, `ai`, `docker` |
| `mcp-server` | `js-ts`, `mongo`, `ai`, `shell-hooks` |
| `node-cli` | `js-ts`, `tui` |
| `node-lib` | `js-ts` |
| `edge` | `nginx`, `docker` |
| `synth` | `cpp`, `audio-core` |
| `synth-rebuild` | `cpp`, `audio-core`, `reverse-engineering`, `midi`, `sound-design`, `instrument-shell` |
| `python-app` | `python`, `shell`, `docker` |
| `shell-tools` | `shell` |
| `go-app` | `go`, `shell`, `docker`, `ci` |

## Commands

Each is `npx --no-install @thedecipherist/claude-packs <command>`, with `--dir <project>` for another folder.

| Command | What it does |
|---|---|
| `suggest` | The configuration and packs this project needs, with the evidence |
| `scan [--out <file>]` | On a copy: what to install and everything already wrong. `scan --prompt` prints the review brief for what checks cannot see |
| `fix [--from <scan.json>] [--out <file>]` | The last scan as a work order, `.claude/fix-plan.md`; scans first if there is none |
| `init [pack...] [--auto]` | Install packs or a preset. `--auto` takes what `suggest` finds; `--config`, `--profile` and `--layout` choose the start |
| `add <pack...> [--from <git-url>]` | Add packs, a team's own included |
| `remove <pack...>` | Remove packs; files you edited are kept |
| `update` | Re-sync installed packs from this version |
| `update-all <dir...>` | Update every listed project that has the kit |
| `logs` | Which hooks earn their place: calls, refusals and verdicts per hook. `logs refusals`, `logs mark <id> right\|wrong "<why>"` |
| `doctor [--strict] [--fresh]` | Verify the install: paths, hooks, selftests, checks' own examples, hook timing |
| `new <name>` | A new project: the house files, a git repo on a work branch, the kit installed |
| `new-pack <name> [--repo <git-url>]` | A new repository for a team's own pack |
| `list` | The packs and presets |
| `configs` | The configurations |
| `config <name> [--dry-run]` | Switch configuration |
| `planner-skills [--out <dir>]` | One project-layout skill body per configuration |
| `survey` | Print the prompt that makes Claude write `docs/project.md` for tailoring |
| `shape scan` | Every instance literal in the repo, against `design/shape.json` |
| `symmetry gen\|run` | The generated gate: every instance has the same members, and every pair swaps the same |
| `dup scan` | Every duplicated block, by file |
| `global add\|remove\|doctor` | The global part, below |
| `lock status\|take\|release` | This repo's own lock, for work on the kit |

## The hooks every project gets

| Hook | When | What it does |
|---|---|---|
| `making` | Prompt | Asks what is being made and what it reuses |
| `reuse-hint` | Prompt | Shows functions the repo already has when the prompt names them |
| `lesson-checks` | Write | Runs the installed lesson checks on what a write adds |
| `template-law` | Write | Refuses a copy, a near copy or a function made again |
| `once-only` | Write | Refuses a duplicate of code as written |
| `code-shape` | Write | Refuses wide lines, packed lines, long functions, long parameter lists |
| `file-size-guard` | Write | Refuses a source file past its line limit |
| `dispatch-once` | Write | Refuses a `switch` on a kind already switched on in another file |
| `folder-law` | Write | Refuses a new source file outside the layout |
| `placement-law` | Write | Refuses a kind of thing in the wrong folder |
| `shape-law` | Write | Refuses a literal instance of a many concept |
| `brief-guard` | Write | Refuses a brief that names a fixed instance |
| `secrets-guard` | Write | Refuses a secret in code, or a secret file in git |
| `untrusted-boundary` | Write | Refuses a model call with outside text and no per-call boundary |
| `git-guard` | Bash | Refuses a token in git config, and with `house: true` the git laws: stage by name, no rebase or force, branches from the fetched trunk |
| `suite-once` | Bash | Refuses the whole test suite on uncommitted work |
| `repo-litter` | Bash | Refuses `git add` of a big file, a working screenshot in the root, or a debug dump |
| `making-check` | Stop | Sends a turn back when what it wrote is not what it said |

Packs add their own: `realtime-guard` and `param-id-lock` (`audio-core`), `stack-guard` (`full-stack`), `schemas-only` (`zod`), `firmware-out-of-git` (`reverse-engineering`), `browser-guard` (`gpu-painter`), `no-shipped-images` (`stellix`), and the `synth-creator` set: `build-guard`, `time-guard`, `spec-lock`, `frozen-files`, `protect-vendor`, `stage-guard`, and the opt-in `build-sweep`, `idle-wake` and `user-asks`.

Every hook is timed to `.claude/hooks.log`, and `doctor` is red for a median over 500 ms. Nothing is ever cleared: a log past 1 MB moves to `.claude/logs/` under a dated name (`"guards": { "logs": { "maxKb": 1024 } }`). A hook that crashes lets a call through, so `doctor` is red for that too, and the `hook-proof` pack holds hooks to exit 2. Hooks of one entry run in one Node process, through `run-hooks.mjs`.

## Instruments, proved in the audio

Four packs carry what rebuilding classic machines from firmware taught, and most of it is about failures that pass every test: units deaf to the transport, presets silently on defaults, a list of algorithms behind one DSP path.

`reverse-engineering` starts from the machine's own names: `names-sweep` searches an image for what the manual prints, in the forms a display uses and through every wrapping met so far, and reports the record size, the order, the pools and the tables; `menu-map` joins every parameter to the page that reaches it. It needs two sources before anything is named, a source tag on every law and a debt ledger for what was tuned by ear, and it keeps firmware out of git. `midi` holds the law of clock and sync, and treats a program as records that round-trip byte for byte. `sound-design` proves sound by measuring audio. `instrument-shell` keeps sessions loadable and panels reachable. `init synth-rebuild` takes them all.

A project says what it is, in `"guards": { "instrument": { "kind": "reproduction" } }` or `"original"`, because the laws differ: on a reproduction the machine is the spec, aliasing and all.

## Published text is not code

A content folder (`articles/`, `blog/`, `posts/`, `content/`, `tutorials/`, `examples/`, `samples/`) holds text and samples. The writing laws read it. The code laws, `template-law`, `code-shape`, `once-only` and `file-size-guard` leave it alone, and `scan` lists what it finds there apart, so a tutorial's compose file is never a project fault and a sample key never heads the report. Under a code root the word means nothing: `src/app/blog/page.tsx` is code. `"guards": { "content": ["<glob>"] }` adds a project's own.

Dates are facts in an article. The `no-time-or-date` check is opt-in, for an author who wants none in posts, and even then it leaves articles alone.

## Knowing which hooks earn their place

A bug log only records the refusals somebody complained about, so it cannot say whether a hook works. The kit records them all. Every call is a line of `.claude/logs/events.jsonl`: the session, the tool, the file or command, and each hook's time, exit code and reason. Every refusal and crash is also a line of `refusals.jsonl`, with an id, the branch and commit, the kit's version and the hash of the hook that decided. Secrets are masked, and file contents are not kept.

`logs` adds it all up, over every rotated file. `logs mark <id> right|wrong "<why>"` records a verdict. The logs stay out of git by default.

## Where things apply

- **`.claude/layout.json` is the one source of truth.** It names every folder and concept, and what goes where. Move a folder there, run `update`, and every rule follows.
- **Rules** declare their concepts (`# concepts: dsp, world`); their `paths:` are generated from the layout.
- **Lesson checks** resolve their concepts from the same file. `whenDep` limits a check to a dependency's major version.
- **CLAUDE.md** gets a generated "Project layout" section between `<!-- claude-packs:start -->` markers.
- **Skills** for one area go into that folder's nested `.claude/skills/`, so they only appear once Claude works there.
- **Hooks judge only this project's files**, and a file in a git worktree by that worktree.
- **`doctor --strict`** fails on a rule that matches no file and a source file no rule covers.

## It never overwrites your work

- Your own files in `.claude/` are left alone. If a pack file has the same name, the pack's version goes beside it as `<file>.pack-new`.
- A pack file you edited is kept on every update, with the new version beside it. `--force` replaces edited pack files, never your own files.
- In `CLAUDE.md`, only the marked section is written. In `settings.json`, only this package's hooks change. A malformed `settings.json` stops the run before anything changes.
- `layout.json` keeps your edits, and the keys a project owns survive every update.
- `CLAUDE.md`, `settings.json`, `layout.json` and the lock are backed up to `.claude/.claude-packs-backup/` before every run.
- Files that leave a pack are removed only if you never edited them.

## Nothing new switches on unless you chose it

A hook or a check refuses work, so a new one never appears in a project by surprise.

- `init` and `add` bring every hook and check of the packs named, except the opt-in ones.
- `update` brings a hook or check new to the project only when `.claude/layout.json` `"enable"` names it, as in `"enable": ["hooks/template-law.mjs"]`.
- `update` prints both lists before it changes anything: what is switching on, and what is held back.

## Custom packs: share your own with your team

```
npx --no-install @thedecipherist/claude-packs new-pack acme-internal --repo git@git.acme.example:team/acme-internal.git
# edit packs/acme-internal/, push it, then in any project:
npx --no-install @thedecipherist/claude-packs add acme-internal --from git@git.acme.example:team/acme-internal.git
```

A pack is rules, checks, hooks and skills in a folder, in a repository of your own. `update` pulls the newest, and the lock records the commit, so teammates get the same pack. Hooks from a custom pack stay off until `"enable"` names them.

A `pack.json` is a manifest like a `package.json`. `name`, `version`, `description`, `type`, `author`, `license` and `repository.url` are required, and `type` is `stock` for the packs in this package and `custom` for anyone else's:

```json
{
  "name": "acme-internal",
  "version": "1.2.0",
  "description": "What it is for.",
  "type": "custom",
  "author": "Acme Platform Team <platform@acme.example>",
  "license": "UNLICENSED",
  "repository": { "type": "git", "url": "git@git.acme.example:platform/claude-packs-acme.git" },
  "engines": { "claude-packs": ">=0.19.0" }
}
```

## Fitting a real repo

Run `survey` and give the printed prompt to Claude Code. It writes `docs/project.md`: the real folder tree, where every concern lives, and how the code is built. The layout, concepts and rules are then tuned to it. A new project starts with `new <name>`.

## Working across projects

- This project's hooks judge only this project's files, so an edit in a sibling project is never refused.
- `layout.siblings` adds sibling folders to `permissions.additionalDirectories`.
- `update-all ~/projects/*` updates and doctors every project that has the kit, and skips the rest.

## The global part: exactly three pieces

```
npx --no-install @thedecipherist/claude-packs global add
npx --no-install @thedecipherist/claude-packs global doctor
npx --no-install @thedecipherist/claude-packs global remove   # removes only what it installed and you did not edit
```

Everything else in this package is per project. `global add` installs these into `~/.claude` and nothing else:

1. **latest-versions**, a skill and its `version-pin-guard` hook. Before Claude adds or pins a dependency, it looks up the current release, because that applies to every project. The hook refuses a pin whose row in `docs/versions.md` is over 14 days old.
2. **gnu-shell**: bash 5 and the GNU tools first on the Bash tool's PATH on macOS and Linux, with a warning in a zsh session.
3. **shell-traps**: refuses BSD flags, unsplit zsh words and `;`-chained destructive steps.

Global by design: they fix this machine's shell for Claude, not any project's rules.

## Working on the kit

`CLAUDE.md` is the guide. `CHANGELOG.md` has every release, and [docs/history.md](docs/history.md) keeps the notes from earlier versions, with upgrade notes for old installs. `npm test` runs the whole suite, and `test/readme.test.mjs` fails when this page falls behind the packs, the configurations or the commands.

## Credits

The kit learned from [superpowers](https://github.com/obra/superpowers) (MIT), mddkit and MDD, Vercel's Web Interface Guidelines (MIT), Anthropic's frontend-design (Apache 2.0), Impeccable (Apache 2.0), taste-skill and imagegen-skills (MIT). [docs/ui-craft-sources.md](docs/ui-craft-sources.md) says what came from each UI source.

## License

MIT. See [LICENSE](LICENSE).

# @thedecipherist/claude-packs

[![npm version](https://img.shields.io/npm/v/@thedecipherist/claude-packs)](https://www.npmjs.com/package/@thedecipherist/claude-packs) [View on npm](https://www.npmjs.com/package/@thedecipherist/claude-packs)

AI coding agents make the same small mistakes again and again, and every fix costs a turn and tokens. claude-packs installs guardrails into a project's `.claude/` folder: **rules** that tell Claude Code how this kind of project is done, and **hooks** that refuse a bad write before it reaches the disk.

You install once. From then on Claude Code reads the rules and meets the hooks in every session, with nothing to run or remember. The files live in the repo, so the whole team gets them.

It works on a project in any language. The machine needs Node 22, because the hooks are Node scripts, and the project itself can be Rust, Python, Go, C++ or anything else.

## Getting started

Claude Code on its own is fast, and it forgets. Each session starts cold, the same mistakes come back, code gets written twice, and "done" means it says it's done. The kit gives a project what a good team has:

- **Mistakes stop at the write.** A hook refuses a bad write before it reaches the disk, and says why. You don't find it in review, because it never landed.
- **Nothing gets written twice.** Copies, near copies and functions made again are refused, with what differs between them, so repetition turns into one template.
- **The project remembers.** The plan, the bugs and the decisions live in plain files in the repo, so a new session picks up where the last one stopped.
- **Every bug makes it stronger.** A bug starts with a test that fails for it, and the fix can become a check that refuses that mistake from then on.
- **"Done" gets measured.** A step finishes on a test or a number. A gate is seen to fail on a planted fault before anyone trusts it.
- **You can see what works.** Every call and refusal is logged, so you can tell which hooks earn their place.
- **It can build on its own.** Give it a work order and it runs session after session with nobody there, deciding as it goes and writing down every choice. A whole plugin, firmware map to finished panel, was rebuilt this way overnight.

There are three ways in:

| You have | Do this |
|---|---|
| A brand new idea | `new <name>` sets up the folders, the plan, the bug logs, git and the kit |
| An existing repo | `suggest`, then `init --auto`, then `scan` and `fix` for what is already wrong |
| A big job to hand over | `workorder <name>`, write the steps, and [let it build on its own](#let-it-build-on-its-own) |

The commands are in [Start here](#start-here).

### From an idea to a finished app

Write the plan first, then the design, then hand both to Claude Code.

1. **Add the walkthrough to claude.ai, once.** `npx @thedecipherist/claude-packs claude-ai-skill` writes `workorder-writer.zip`. Upload it in claude.ai under Settings, Capabilities, Skills. It belongs to no pack and no project installs it: it is the planning half, and it lives in claude.ai.
2. **Write the work order in claude.ai, with Fable on High.** Say "I want to make a work order". The walkthrough interviews you stage by stage: what you are making, what it does, what you have, how it looks, how it is built. It researches between questions and gives a recommendation with every choice. It starts from the kit's template (a rebuild of a hardware instrument gets the rebuild template), and holds the order to the kit's laws while you write it, so the build is never refused for something the plan asked for. Get your app, idea or product as finished as you can. Plan in claude.ai, not Claude Code: claude.ai is great at research, and Claude Code is eager to start coding.
3. **Make the design once the work order is complete.** The walkthrough writes an AI image prompt for each screen. With the OpenArt connector in claude.ai, it offers to make the mock-ups for you; without it, take the prompts to [openart.ai](https://openart.ai). Use the Nano Banana Pro model, which works very well for this, and make every mock-up 16:9, so every screen resizes and scales the same way. Go again until each one looks right.
4. **Hand both to Claude Code.** `npx @thedecipherist/claude-packs new <name>`, then `workorder <name>` inside it (with `--template rebuild` for a rebuild) for the runner files. Save the finished order over `docs/workorders/<name>/workorder.md` and the pictures in `design/reference/`, named for the screen each shows. Then tell Claude Code: `Start from docs/workorders/<name>/workorder.md and the design in design/reference/`. The `start-from-a-workorder` skill reads the order the way the run will and lists any gaps before a line of code is written. It measures each picture with `analyse-reference-look`, and then the build starts: you can watch it, or [let it run on its own](#let-it-build-on-its-own).

## See it work

A new Rust crate, and one command:

```
$ npx @thedecipherist/claude-packs init --auto
Packs: base, rust. 151 files managed, 22 rule paths refreshed.

$ git status --short
?? .claude/
?? CLAUDE.md
?? clippy.toml
```

Then Claude tries to write this into `src/parser.rs`:

```rust
pub fn parse(text: &str) -> u32 {
    text.parse::<u32>().unwrap()
}
```

The hook refuses it, and the file is never written. Claude gets this back:

```
BLOCKED by lesson-checks in src/parser.rs: this edit brings back a known bug.
  [rust-unwrap-in-library] A failure the caller could handle becomes a panic with no reason. Return it with `?`, or say why it cannot happen with `.expect("...")`.
      text.parse::<u32>().unwrap()
      see .claude/rules/rust-errors-are-returned.md
```

Claude reads the reason, returns a `Result`, and the write goes through. Nobody had to catch it in review.

## How you use it

**1. Install, once.** One command writes the rules and hooks into `.claude/`. The npm package is only the installer and updater: what does the work is the files it leaves in your project.

**2. Work as usual.** Use Claude Code the way you already do. It reads `.claude/` at the start of every session, and the hooks run on every write.

When a new version comes out, `update` brings it in. Nothing new switches on unless you chose it.

## Start here

In a Node project, add the kit as a dev dependency, so the team gets the same version:

```
npm i -D @thedecipherist/claude-packs
npx --no-install @thedecipherist/claude-packs suggest      # which packs this project needs, and why
npx --no-install @thedecipherist/claude-packs init --auto  # install exactly that
npx --no-install @thedecipherist/claude-packs scan         # everything already wrong, on a copy of the project
npx --no-install @thedecipherist/claude-packs fix          # the scan as a work order: .claude/fix-plan.md
```

In any other project there is no `package.json` to add it to, so leave out `--no-install` and npx fetches the kit:

```
npx @thedecipherist/claude-packs suggest
npx @thedecipherist/claude-packs init --auto
```

Then tell Claude to work through `.claude/fix-plan.md`. The `fix-from-scan` skill says how.

A brand new project starts with `new <name>`: the house files, a git repo and the kit in one step. On an existing repo, the install adds the top-level folders your source is in to the layout, so the rules reach your code wherever it lives, and `folder-law` keeps new code inside those folders from then on.

`scan` is safe to run before installing anything: it works on a copy in a temp folder and never writes to the project. `suggest` only reads file names and dependency files.

## Install one pack

You don't have to take what `suggest` finds. Name the pack yourself:

| You want | Command |
|---|---|
| One pack, in a project with nothing installed yet | `init mongo` |
| Several packs at once | `init rust docker ci` |
| One more pack, in a project that already has the kit | `add docker` |
| A pack out again | `remove docker` |
| A stack's whole set | `init rust-app` (see [Presets](#presets)) |
| To see what there is | `list` |

Each of these goes after `npx @thedecipherist/claude-packs`, or `npx --no-install @thedecipherist/claude-packs` where the kit is a dev dependency.

A few things are worth knowing:

- **`base` always comes too.** It holds the hooks that run every pack's checks, so no pack works alone. `writing` and `hook-proof` come with every configuration as well.
- **A pack has to fit the project's configuration.** `add` refuses one that doesn't, and lists what fits. `config <name>` switches.
- **In a folder with no code yet,** name the configuration, or the kit has to guess it from the pack: `init mongo --config node`. In a project with code, `init <pack>` uses the configuration `suggest` finds.

## What is whose

Some of what you will see in `.claude/` is Claude Code's own, and some only works through the kit's hooks:

| Part | Whose | What it does |
|---|---|---|
| `CLAUDE.md` | Claude Code | Read at the start of every session |
| `.claude/rules/` | Claude Code | Short laws. One with `paths:` loads only when Claude touches a matching file |
| `.claude/skills/` | Claude Code | Steps for one job. The description is always loaded, the body when it is needed |
| `.claude/settings.json` | Claude Code | Registers the hooks |
| `.claude/hooks/` | The kit | The scripts Claude Code runs on a tool call |
| `.claude/checks/` | The kit | Patterns the `lesson-checks` hook reads |
| `.claude/layout.json` | The kit | Which folder holds what |
| `.claude/tools/` | The kit | Helpers its skills and gates run |
| `.claude/claude-packs.lock.json` | The kit | What is installed, with a hash per file |

## What a project keeps

Claude forgets between sessions, so everything worth keeping lives in files. `new <name>` starts them, and the rules keep them true:

| File | What it holds | Why it helps |
|---|---|---|
| `CLAUDE.md` | How this project works, read at every session's start | Claude starts each session knowing the layout and the laws |
| `build.md` | The plan: what is in progress, each step's `making:` line, and a log of what landed | Work resumes from the file, and a step is ticked only when it was measured |
| `bugs.md` | Every bug, logged before it is fixed, then closed with its cause, its fix and the test that now catches it | The same bug can't quietly come back |
| `workflow-bugs.md` | Faults in the process itself: a hook, a tool, a test run | The workflow improves too, with the evidence written down |
| `docs/versions.md` | Each dependency, with its latest version and when that was checked | No pinned version comes from memory |
| `design/shape.json` | Each concept, as one or many | "Slot 2" never gets hard-coded where there are four slots |
| `.claude/hooks.log` | Each hook's time on every call | `doctor` goes red for a hook that got slow |
| `.claude/logs/events.jsonl` | Every tool call and what each hook said | `logs` shows which hooks earn their place |
| `.claude/logs/refusals.jsonl` | Every refusal with its reason, then a verdict: right or wrong, and why | Wrong refusals get found and fixed, so the laws improve on evidence |
| `.claude/logs/crashes.jsonl` | Every hook that crashed | A broken guard can't fail quietly |

Logs are never cleared: a full one moves to `.claude/logs/` under a dated name. So the project keeps its own history, and a lesson from one bug can become a [lesson check](#add-your-own-rule) that holds for good.

## How it is tested

The kit is strict about what counts as proof:

- **A bug fix starts red.** Write the smallest test that shows the bug and see it fail for that reason, then fix the code (`bug-fix-starts-red`).
- **A test has to be able to fail.** A gate is shown red on a planted fault, a mistake put in on purpose. A test that can't fail proves nothing.
- **Anything used twice is tested once.** Behaviour is tested on the template, with one quick pass proving every instance really is that template (`test-the-template-once`).
- **While working, run only what the change reaches.** The `pick-tests` skill picks them, so a small change never costs a full run.
- **The gate before landing is the tests the branch's changes reach; the whole suite runs only when the user asks.** `suite-once` refuses a whole-suite run otherwise, so it can't be run again and again in place of thinking.
- **Finished work lands.** Green work is merged to the trunk and pushed in the same turn (`land-branch`), and it isn't called landed until the remote agrees.
- **The guards are tested too.** Every hook has a `--selftest`, every lesson check proves its `bad` and `good` example, and `doctor` runs them all.

## Let it build on its own

A work order is a written brief that a project can build from with nobody there. It suits anything that takes many sessions: a new product, a port, a big migration, a rebuild from a spec.

```
npx @thedecipherist/claude-packs workorder billing
```

That writes three files to `docs/workorders/billing/`:

| File | What it is |
|---|---|
| `workorder.md` | The steps. This is the part you write |
| `PROMPT.md` | How to run: take the recommended choice, never stop to ask, record every decision, resume from `progress.md` |
| `run.sh` | Starts session after session until the work is done |

`--template` picks the steps it starts from: `generic` (the blank ones, and the default), `plugin` (a new synth or effect, with the house's decisions written in: the stack, the gates and the chart first, the parameter table before any DSP, one step per sound part, the panel from the approved render, presets, the audit, a named list of hosts) or `rebuild`. The template is a choice, never read from the project's configuration, since a new synth and a rebuild share one. `workorder <name> --template rebuild` writes the steps of a hardware instrument rebuilt as a plugin: the sources, the firmware map, a blind second pass in Ghidra, the firmware run as the oracle, the parameter layer, the engine, the panel drawn in code, the gates and a report. Four rebuilds taught it, and its `[if ...]` steps fit an analogue voice, a digital engine or a real unit you can record.

Write the steps with Claude, and the `write-a-workorder` skill keeps them honest. What makes one work:

- **Say what finished looks like,** and what is known and not known, so no report claims more than the work shows.
- **List every source by path.** A run can't ask where something is.
- **Put proof before what depends on it:** find out, prove it, then build on it.
- **End every step with "Done when:"** and a number or a test. "Works" can't be measured, so it can't finish.

```markdown
## W2. The import

1. Read every record in `data/orders.csv` into the schema of W1.
2. Reject a bad row by name, with its line number. Never skip one silently.

**Done when:** all 41,206 rows of the sample load, the 12 known bad rows are each rejected with the right reason, and a planted bad row turns the test red.
```

Before it runs, `workorder check billing` reads the order the way the run will and refuses what would stop it halfway, naming each: a placeholder left in angle brackets, a step whose "Done when" holds no number and no path to a test, a skill it names that the project has not installed (with the pack that brings it), and a red `doctor --strict`. An order with no install block gets a warning. `run.sh` and `PROMPT.md` run it before the first session and start nothing on a refusal.

An order carries its own set-up as one fenced block with the info string `claude-packs`, in the kit's own keys: `configuration` and `packs` as `init` takes them, and the layout keys a project owns (`enable`, `looks`, `guards`, `commands`, ...). `init --from docs/workorders/billing/workorder.md` installs from it: the configuration and packs, then those keys written into `.claude/layout.json`, then an update. `new <name> --from <order>` does the same for a new project. A key the kit does not read is refused by name, and nothing is installed.

````markdown
```claude-packs
configuration: synth-creator
packs: cpp, audio-core, instrument-shell, midi, sound-design
looks:
  - name: panel
    reference: design/reference/panel.png
    code: ["src/ui/**"]
```
````

To run it, type `Run docs/workorders/billing/PROMPT.md` in Claude Code and watch, or leave it going with `bash docs/workorders/billing/run.sh`. Everything lands in files as it goes: `progress.md` line by line, `decisions.md` with each choice so you can overturn it, `bugs.md`, and a report with counts at the end. If a session ends, the next one picks up from `progress.md`, and it stops on a `DONE` file.

**Read `run.sh` before you use it.** It runs Claude with permission prompts off, because nobody is there to answer. The hooks still judge every write, but use it only on a project you trust, in a repo you can roll back.

To change a run in progress, edit its `PROMPT.md` and commit it. A run won't act on an instruction it can't trace to its order or to you, so a file dropped beside it is ignored on purpose.

## Questions

**Do I need a Node project?** No. Node 22 has to be on the machine, and that's all. The kit has configurations for C++, Go, Python, Rust and Node, and `base` for anything else.

**Which Claude apps does it work in?** Claude Code, in the terminal and the IDE extensions. Hooks and rules don't work in Claude Desktop or a normal Claude chat: neither reads a project's `.claude/` folder.

**What does it cost in tokens?** A Rust install loads about 3,300 tokens when a session starts: the `CLAUDE.md` block, 10 rules with no `paths:` and 22 skill descriptions. The `making` hook adds about 107 tokens to each prompt, and `doctor` prints that figure for your project. Rules with `paths:` and full skills load only when they are needed. The other hooks run outside the model, so they cost nothing unless they refuse.

**Global or per project?** Per project. Claude Code also reads `~/.claude` for every project and `CLAUDE.md` from parent folders, and the project's own files are the most specific. The kit writes to `~/.claude` only if you run `global add`, which installs [three shell pieces](#the-global-part-exactly-three-pieces).

**Is it for one person or a team?** Both. The files live in the repo, a dev dependency pins the version, and a team can keep [its own packs](#custom-packs-share-your-own-with-your-team) in its own git repo.

**Can I turn a check off?** Yes: name it in `layout.json` `"disable"`, as in `"disable": ["checks/rust-unwrap-in-library.json"]`, and run `update`.

## Add your own rule

Found a mistake Claude keeps making? Start in the project.

**1. Write the rule.** A short file in `.claude/rules/`, and `paths:` says when it loads:

```markdown
---
paths:
  - "src/billing/**"
---

# Money is integer cents

<constraints>
Always do:
- Store and pass money as `i64` cents.

Never do:
- Use `f32` or `f64` for an amount.
</constraints>
```

**2. Enforce it, if you want a refusal.** A rule tells Claude. A lesson check stops the write. Add `.claude/checks/money-no-float.json`, with an example of each side, which `doctor` proves:

```json
{
  "id": "money-no-float",
  "why": "A float cannot hold 0.10 exactly, so amounts drift.",
  "rule": ".claude/rules/money-is-integer-cents.md",
  "globs": ["src/billing/**"],
  "pattern": "\\b(?:amount|price|total)\\s*:\\s*f(?:32|64)\\b",
  "bad": "pub struct Line { price: f64 }",
  "good": "pub struct Line { price_cents: i64 }"
}
```

**3. Share it when it applies everywhere.** Your own files survive every `update`. When a rule holds for every project you have, move it into [a pack of your own](#custom-packs-share-your-own-with-your-team).

## Words

| Word | What it means |
|---|---|
| Pack | A folder of rules, checks, hooks and skills for one subject: `rust`, `mongo`, `docker` |
| Configuration | A kind of project: which packs fit it, its folders, and what counts as source. A project has one |
| Preset | A named list of packs, so `init rust-app` installs four at once |
| Profile | A ready-made `layout.json` for a known project shape, taken with `init --profile` |
| Layout | `.claude/layout.json`: which folder holds what, and which rules apply where |
| Rule | A short law in `.claude/rules/`. It tells Claude, and refuses nothing |
| Lesson check | A pattern with a `bad` and a `good` example. It refuses an edit that adds a match |
| Hook | A script Claude Code runs on a tool call. It can refuse the call |
| Skill | The steps for one job, loaded when the job comes up |
| Plant | A fault put in on purpose, to prove a hook or a gate catches it |

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

Each language keeps its own sense. In Rust a trait method must repeat, and a method lives in its type, so only a free function can be made again by name. A `match` that does work is good Rust in any number of files, since the compiler holds each to every variant: the lint set denies `_ =>` so it can, and `dispatch-once` refuses only a lookup table written outside its enum.

Anything used more than once is one template, and it is tested once. `test-the-template-once` says how: test the behaviour on one instance, and prove the rest are that template with a read of the table. `one-walk-per-template` refuses a test that presses every instance.

## Code stays small in every direction

`code-shape` refuses a write that adds a line over 120 columns of code, a line with more than two statements, a function over 50 statements or over 6 parameters. `file-size-guard` holds a file to 300 lines. Code that already stands is judged only if it gets worse. Limits are in `layout.json`: `"guards": { "codeShape": { "maxLineChars": 120, "maxStatementsPerLine": 2, "maxFunctionStatements": 50, "maxParameters": 6, "exclude": [] } }` and `"maxFileLines"`.

## Packs

`list` shows every pack and preset, with its version and author. `base`, `writing` and `hook-proof` come with every configuration.

| Pack | For | Rules | Checks | Hooks | Skills |
|---|---|---|---|---|---|
| `ai` | Code that calls a model: untrusted input, explicit keys, model ids | 2 | 4 | 0 | 0 |
| `audio-core` | Any JUCE synth or effect: realtime safety, DSP quality, state, parameters | 52 | 12 | 2 | 8 |
| `base` | Universal engineering, in every configuration | 25 | 8 | 22 | 13 |
| `ci` | CI workflows: every language run, tools pinned, permissions stated | 2 | 2 | 0 | 0 |
| `content-site` | Sites that publish: complete page heads, one source per page, defended forms, sized media | 4 | 3 | 0 | 1 |
| `cpp` | Any C++ project: templates, thread contracts, headers, casts, static analysis | 11 | 14 | 1 | 2 |
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
| `postgres` | PostgreSQL: migrations that never stop traffic, values always bound, no database wiped by mistake | 5 | 10 | 1 | 1 |
| `python` | Python: templates, errors, resources, safe subprocess calls | 2 | 11 | 0 | 1 |
| `react` | React: failed requests, effects, accessible controls | 2 | 6 | 0 | 0 |
| `rust` | Rust: errors returned, unsafe proved, async never blocks, clippy as the gate, every repeat one template | 6 | 9 | 0 | 3 |
| `reverse-engineering` | Rebuilding a machine from firmware, manuals and banks: the machine's own names first, two sources before naming, every law sourced | 10 | 4 | 1 | 9 |
| `shell` | Shell scripts: strict mode, quoting, shared functions | 2 | 9 | 0 | 1 |
| `shell-hooks` | Shell and Node hooks for Claude Code | 1 | 4 | 0 | 0 |
| `sound-design` | Sound proved by measuring audio: algorithms as data, neutral is exact, the meter first, an offline VST3 renderer, and comparing with the real machine | 7 | 7 | 0 | 7 |
| `stellix` | Laws of one synth project | 5 | 5 | 1 | 0 |
| `stored-text` | Text from a database reaches the page through one renderer | 1 | 4 | 0 | 1 |
| `synth-creator` | The synth-creator configuration's own laws | 8 | 3 | 10 | 2 |
| `tui` | Terminal UIs | 1 | 5 | 0 | 1 |
| `ui-craft` | Application and page design in any web stack | 17 | 24 | 0 | 9 |
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
| `rust` | Rust crates and workspaces | `rust` |
| `full-stack` | A Fastify API and a Next.js web app, with one schemas folder and one database gateway. It fixes a folder layout, so it is offered and never assumed. It always takes `full-stack`, `http-api`, `fastify`, `zod` and `docker`; a project can choose `go`, `web`, `host-agent` and `shell-hooks` too, for a Go agent on its hosts and web pages beside the API | `js-ts`, `stored-text`, `ui-craft` |
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
| `rust-app` | `rust`, `shell`, `docker`, `ci` |

## Commands

Each is `npx @thedecipherist/claude-packs <command>`, or `npx --no-install @thedecipherist/claude-packs <command>` with the kit as a dev dependency. `--dir <project>` runs it on another folder.

| Command | What it does |
|---|---|
| `suggest` | The configuration and packs this project needs, with the evidence |
| `scan [--out <file>]` | On a copy: what to install and everything already wrong. `scan --prompt` prints the review brief for what checks cannot see |
| `fix [--from <scan.json>] [--out <file>]` | The last scan as a work order, `.claude/fix-plan.md`; scans first if there is none |
| `init [pack...] [--auto]` | Install packs or a preset. `--auto` takes what `suggest` finds; `--config`, `--profile` and `--layout` choose the start; `--from <workorder.md>` installs a work order's install block |
| `add <pack...> [--from <git-url>]` | Add packs, a team's own included |
| `remove <pack...>` | Remove packs; files you edited are kept |
| `update` | Re-sync installed packs from this version |
| `update-all <dir...>` | Update every listed project that has the kit |
| `logs` | Which hooks earn their place: calls, refusals and verdicts per hook. `logs refusals`, `logs mark <id> right\|wrong "<why>"`, `logs crashes`, `logs clear <hook>\|all fixed\|superseded "<why>"` |
| `doctor [--strict] [--fresh]` | Verify the install: paths, hooks, selftests, checks' own examples, hook timing, and that a test answers each rule whose Check names one |
| `new <name>` | A new project: the house files, a git repo on a work branch, the kit installed; `--from <workorder.md>` installs from a work order's install block |
| `workorder <name>` | A work order in `docs/workorders/<name>`: the steps, the prompt that runs them, and a runner; `--template` picks the steps: `generic` (the default), `plugin` or `rebuild` |
| `workorder check <name>` | Before a run: refuses a placeholder left, a step with no measured Done when, a skill not installed, a red doctor |
| `claude-ai-skill` | `workorder-writer.zip`: the guided work order interview, a skill to upload to claude.ai |
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
| `dispatch-once` | Write | Refuses a `switch` on a kind already switched on in another file. In Rust, a second lookup table on an enum, outside the enum |
| `folder-law` | Write | Refuses a new source file outside the layout |
| `placement-law` | Write | Refuses a kind of thing in the wrong folder |
| `shape-law` | Write | Refuses a literal instance of a many concept |
| `brief-guard` | Write | Refuses a brief that names a fixed instance |
| `secrets-guard` | Write | Refuses a secret in code, or a secret file in git |
| `untrusted-boundary` | Write | Refuses a model call with outside text and no per-call boundary |
| `git-guard` | Bash | Refuses a token in git config, and the git laws: stage by name, no rebase or force, branches from the fetched trunk. A new install has them; an older project adds `"enable": ["guards/git-house"]` |
| `suite-once` | Bash | Refuses the whole test suite unless the user's prompt asks for a full run |
| `look-gate` | Bash, after a build | Names the reference looks a branch's code changed after a build, and refuses to land the branch without a passing look report for each |
| `skill-first` | Read, Bash | Refuses a read of a schematic, a service manual, a data sheet or a design reference until its skill is loaded, where that skill is installed |
| `repo-litter` | Bash | Refuses `git add` of a big file, a working screenshot in the root, or a debug dump |
| `inside-the-project` | Write, Bash | Refuses work for the project done outside it: a worktree added or moved beside the project, and any write, `cd` or `git -C` into a checkout of the same repo kept outside it, where no other hook can see |
| `agents-held` | Agent | Refuses an agent started in the background in a session with nobody there (`claude -p`, a work order's runner): the session's end would stop it mid-work |
| `making-check` | Stop | Sends a turn back when what it wrote is not what it said |

Packs add their own: `realtime-guard` and `param-id-lock` (`audio-core`), `stack-guard` (`full-stack`), `schemas-only` (`zod`), `firmware-out-of-git` (`reverse-engineering`), `db-wipe-guard` (`postgres`), `browser-guard` (`gpu-painter`), `no-shipped-images` (`stellix`), and the `synth-creator` set: `build-guard`, `time-guard`, `spec-lock`, `frozen-files`, `protect-vendor`, `stage-guard`, `chart-first`, and the opt-in `build-sweep`, `idle-wake` and `user-asks`.

Every hook is timed to `.claude/hooks.log`, and `doctor` is red for a median over 500 ms. Nothing is ever cleared: a log past 1 MB moves to `.claude/logs/` under a dated name (`"guards": { "logs": { "maxKb": 1024 } }`). A hook that crashes lets a call through, so `doctor` is red for that too, and the `hook-proof` pack holds hooks to exit 2. Hooks of one entry run in one Node process, through `run-hooks.mjs`.

## Instruments, proved in the audio

Four packs carry what rebuilding classic machines from firmware taught, and most of it is about failures that pass every test: units deaf to the transport, presets silently on defaults, a list of algorithms behind one DSP path.

`reverse-engineering` starts from the machine's own names: `names-sweep` searches an image for what the manual prints, in the forms a display uses and through every wrapping met so far, and reports the record size, the order, the pools and the tables; `menu-map` joins every parameter to the page that reaches it. It needs two sources before anything is named, a source tag on every law and a debt ledger for what was tuned by ear, and it keeps firmware out of git. A schematic, a service manual or a data sheet is read through `read-a-circuit-diagram`, and `skill-first` refuses a read of one until that skill is loaded. A picture of the machine's own screen, from an owner's manual or a test-mode page, is read through `read-a-screen-image`: every string exactly, its font, colour and position, and the gesture that reaches it. `midi` holds the law of clock and sync, and treats a program as records that round-trip byte for byte. `sound-design` proves sound by measuring audio, `vst3host` bounces any VST3 with no DAW or audio device, so a plugin can be measured from a script (`bounce-a-plugin` says how), and `compare-to-the-machine` sets a build beside a recording of the real thing, matching each patch by the name on its display. `instrument-shell` keeps sessions loadable and panels reachable. `init synth-rebuild` takes them all.

A project says what it is, in `"guards": { "instrument": { "kind": "reproduction" } }` or `"original"`, because the laws differ: on a reproduction the machine is the spec, aliasing and all.

## Published text is not code

A content folder (`articles/`, `blog/`, `posts/`, `content/`, `tutorials/`, `examples/`, `samples/`) holds text and samples. The writing laws read it. The code laws, `template-law`, `code-shape`, `once-only` and `file-size-guard` leave it alone, and `scan` lists what it finds there apart, so a tutorial's compose file is never a project fault and a sample key never heads the report. Under a code root the word means nothing: `src/app/blog/page.tsx` is code. `"guards": { "content": ["<glob>"] }` adds a project's own.

Dates are facts in an article. The `no-time-or-date` check is opt-in, for an author who wants none in posts, and even then it leaves articles alone.

## Knowing which hooks earn their place

A bug log only records the refusals somebody complained about, so it cannot say whether a hook works. The kit records them all. Every call is a line of `.claude/logs/events.jsonl`: the session, the tool, the file or command, and each hook's time, exit code and reason. Every refusal is also a line of `refusals.jsonl`, and every crash a line of `crashes.jsonl`, with an id, the branch and commit, the kit's version and the hash of the hook that decided. Secrets are masked, and file contents are not kept.

`logs` adds it all up, over every rotated file. `logs mark <id> right|wrong "<why>"` records a verdict. The logs stay out of git by default.

A hook that crashes has judged nothing. On a tool call the runner refuses the call once and says so, and the same call again goes through, logged, so a broken hook can never stop the write that fixes it. `doctor` stays red for the crash until the hook changes or `logs clear` records why it is over.

## Where things apply

- **`.claude/layout.json` is the one source of truth.** It names every folder and concept, and what goes where. Move a folder there, run `update`, and every rule follows.
- **Rules** declare their concepts (`# concepts: dsp, world`); their `paths:` are generated from the layout.
- **Lesson checks** resolve their concepts from the same file. `whenDep` limits a check to a dependency's major version.
- **CLAUDE.md** gets a generated "Project layout" section between `<!-- claude-packs:start -->` markers.
- **Skills** for one area go into that folder's nested `.claude/skills/`, so they only appear once Claude works there.
- **Hooks judge only this project's files**, and a file in a git worktree by that worktree.
- **`doctor --strict`** fails on a rule that matches no file and a source file no rule covers.
- **`doctor`** fails on a live rule whose Check names a test nothing answers to. A test answers with `proves: <rule>` in it, or `layout.json` `"ruleTests"` points the rule at a file or declines it with `"none: <reason>"`. At the end of an install this is a note.

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

The kit learned from [superpowers](https://github.com/obra/superpowers) (MIT), mddkit and MDD, Vercel's Web Interface Guidelines (MIT), Anthropic's frontend-design (Apache 2.0), Impeccable (Apache 2.0), taste-skill and imagegen-skills (MIT), for Rust from [BeautifulRust](https://github.com/morganlinton/BeautifulRust) (MIT) and [rust-skills](https://github.com/leonardomso/rust-skills) (MIT), and for Postgres from [squawk](https://squawkhq.com/docs/rules) (MIT and Apache 2.0), [strong_migrations](https://github.com/ankane/strong_migrations) (MIT), [pg-aiguide](https://github.com/timescale/pg-aiguide) (Apache 2.0) and the PostgreSQL wiki's [Don't Do This](https://wiki.postgresql.org/wiki/Don't_Do_This). [docs/ui-craft-sources.md](docs/ui-craft-sources.md) says what came from each UI source.

## License

MIT. See [LICENSE](LICENSE).

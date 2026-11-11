# @thedecipherist/claude-packs

[![npm version](https://img.shields.io/npm/v/@thedecipherist/claude-packs)](https://www.npmjs.com/package/@thedecipherist/claude-packs) [View on npm](https://www.npmjs.com/package/@thedecipherist/claude-packs) | [GitHub](https://github.com/TheDecipherist/claude-packs) | [Releases](https://github.com/TheDecipherist/claude-packs/releases)

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

1. **Add the planner to claude.ai, once.** `npx @thedecipherist/claude-packs planner-skills --zip dist/` writes one zip per skill: `workorder-writer` (the interview), `start-a-build` (the hand-over), `ui-mockup` (the design pictures), and `design-a-preset` and `synth-cost` from their packs, as the build has them. Upload each in claude.ai ([Installing the skills in claude.ai](#installing-the-skills-in-claudeai)). The planning half lives in claude.ai; no project installs these three.
2. **Write the work order in claude.ai, with Fable on High.** Say "I want to build a synth". The interview goes in nine stages, shown at every step: what you are making, what it does, what you have, how it looks, how it is built, the steps, the pictures, the check, the set-up. Every question is one of two: what are you making, and what makes it done. It researches between questions, recommends with every choice, turns the sounds you want into what the synth needs (`design-a-preset`), keeps a running cost against the CPU budget (`synth-cost`), starts from the kit's template (`plugin`, `rebuild` or `generic`) and writes the order's install block. Plan in claude.ai, not Claude Code: claude.ai is great at research, and Claude Code is eager to start coding.
3. **Make the design once the order is complete.** `ui-mockup` writes the prompt for each screen in bands, renders it with the OpenArt connector when claude.ai has it (else you take the prompt to [openart.ai](https://openart.ai)), with Nano Banana Pro, every picture 16:9, iterated until you like it, and approves a render only when it passes six checks: counts, depth, alignment, readability, live parts, clutter. The panel is never prototyped in HTML: the picture is the design, and the build draws it in code.
4. **Hand it to Claude Code.** `start-a-build` prints every command filled in: `new <name> --from <order>` (the kit installed from the order's install block), `workorder <name> --template <t>` for the runner files, the order saved over `docs/workorders/<name>/workorder.md`, the pictures in `design/reference/`, and `workorder check <name>`, which refuses an order that cannot finish. Then type `Run docs/workorders/<name>/PROMPT.md` in Claude Code, or [let it run on its own](#let-it-build-on-its-own).

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

## The status line

Every project with the kit shows, under the prompt, what is working and where it is:

```
claude-packs 1.9.0 | opus md | CTX 41% (1.0M) | 5h 38% | 7d 81%
⎇ work/panel ✱3 ↑1↓0 | Edit src/ui/Panel.cpp | $ npm run test:changed
BANDWARP               ███████████░░░░░░░░░  55%  34 of 76 items left, 4 agents, checked 8s ago
  > dsp        > W3b The cluster             ██████░░░░  60%  ♥ 12s ⚙ 13 proc · 1.3 cpu · 322M ram        WRITE src/dsp/Comb.cpp
  > panel      > W8 The main panel           ██░░░░░░░░  20%  ♥ 4m  ⚙ 17 proc · 2.3 cpu · 1.5G ram queued ⟳ RUN cmake --build
```

The first field is the kit version the project runs. Then the model and its effort (red if a fallback swapped it from the one you pinned), the context used, and the 5h and 7d quotas on a subscription or the session's cost on API billing. The second line is the branch, the last tool and the last shell command.

Below them is every unattended run on the machine, per project and per agent, the same numbers as `status`. A project's percent counts each agent's own progress, so it moves with every item an agent finishes, not only when the lead merges. Each agent's row then says, in columns that stand under each other:

| Symbol | What it says |
|---|---|
| `♥ 12s` | its last heartbeat: the hooks record every tool call the agent makes, before and after, so this is how long ago its last one was. `♡` means the project's install has no heartbeat hook yet |
| `⚙ 13 proc · 1.3 cpu · 322M ram` | what really runs in its worktree now: processes, cores, memory. `queued`: its build waits for a slot of the build queue. `⚙ 0 proc`: nothing runs there, it is thinking or reading |
| `READ`, `WRITE`, `RUN`, `AGENT` | its last action and what it worked on; `⟳` while that call still runs |

An agent turns red when it is stuck by the evidence: no tool call for 5 minutes, or a call that still runs with nothing working in its worktree. The runs are checked in the background every 30 seconds, so the bar never waits.

`init` and `update` wire it (`.claude/tools/statusline.mjs`) into `.claude/settings.json` where the project has no status line; one you already have is kept. `"disable": ["tools/statusline.mjs"]` in `layout.json` takes it out.

A run on another machine shows here too. List the machines in `~/.config/claude-packs/remotes.json`:

```json
{ "remotes": [ { "name": "mac", "ssh": "mac", "dir": "~/projects/shop" } ] }
```

`ssh` is the host as your `~/.ssh/config` names it, with a key, since nothing waits for a password. `dir` is a project on that machine whose kit answers. Each refresh asks every machine for its `status --json`, so its processes, cores and memory are measured there, and its rows read `MAC: SHOP`. A machine that cannot be reached gets a red row that says so.

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

`status` shows where each run stands, every so many minutes with `--watch 15`:

```
BANDWARP                 [█████████░░░░░░░░░░░]  47%   40 of 76 items left, 4 agents
  > dsp        > W3b The cluster          [████░░░░░░]  40%   SPACING modes against the reference
  > panel      > W8 The main panel        [██░░░░░░░░]  20%   the screen markers
```

The unit is the item: a step's numbered items plus one for its Done when. A run keeps `status.json` beside its order and each agent keeps `agents/<name>.json` in its own worktree, as `PROMPT.md` tells them; an order without them is counted from its `progress.md` lines.

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

The `run-a-workorder` skill holds the run's half: the check before the first session, how to start it and leave it, what to watch, and how to change it. To change a run in progress, edit its `PROMPT.md` and commit it. A run won't act on an instruction it can't trace to its order or to you, so a file dropped beside it is ignored on purpose.

## Installing the skills in claude.ai

```
npx @thedecipherist/claude-packs planner-skills --zip dist/
```

writes `dist/<skill>.zip` for each of the five skills, each its `SKILL.md` and its reference files and nothing else. In claude.ai, upload each zip as a skill (Settings, then the skills section; the place varies by plan, so follow the app). Start a chat and type "I want to build a synth". If `workorder-writer` does not start the interview, its description did not match; open an issue with the sentence you typed. `claude-ai-skill` writes the interview's zip alone.

`planner-skills` with no flag prints them, and the project-layout skill per configuration; `--out <dir>` writes those. The planner's skills live in the kit's `planner/` folder, and the two pack skills come from their packs as they are, so a law changed in its pack is the planner's at the next bundle.

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

<!-- generated:packs:start -->
| Pack | For | Rules | Checks | Hooks | Skills |
|---|---|---|---|---|---|
| `admiral` | Driving a Claude Code session on another machine through AdmiralMCP: the channel set up and proved, one instruction per message, its events read as data, both sessions kept in step. | 0 | 0 | 0 | 1 |
| `ai` | Code that calls a model: SHA-256 boundaries on untrusted input, explicit keys, model ids from config. | 2 | 4 | 0 | 0 |
| `audio-core` | Any JUCE synth or effect: realtime safety, DSP quality, state, parameters, performance. | 52 | 12 | 3 | 8 |
| `base` | Universal engineering every configuration gets: the git laws, the line limit, the folder and placement laws, the shape law (shape-law, brief-guard, making, making-check), once-only, lesson checks, secrets-guard and the untrusted-content boundary. | 28 | 8 | 28 | 15 |
| `ci` | CI: every language in the repo is built and tested, actions and tools are pinned, and permissions are stated. | 2 | 2 | 0 | 0 |
| `content-site` | Sites that publish: blogs, docs and marketing pages. | 4 | 3 | 0 | 1 |
| `cpp` | Any C++ project: what is repeated becomes a template, in the forms C++ has for it (a factory, a shared header, a table and a loop, a class template), gates and probes share one reader, and the library does the finding. | 10 | 14 | 1 | 2 |
| `docker` | Dockerfiles, Compose and Swarm: exec form, init, non-root, pinned bases, healthchecks, secrets, swarm-safe compose. | 5 | 24 | 0 | 1 |
| `dynamic-data` | Systems driven by definitions: a CMS, an admin generator, a low-code platform. | 10 | 9 | 0 | 1 |
| `fastify` | Fastify servers: security always on, trust config not headers, Zod at every route, streams and hijacks handled. | 6 | 15 | 0 | 0 |
| `full-stack` | The full-stack configuration's stack choice: Fastify and Next.js only (stack-guard). | 1 | 1 | 1 | 0 |
| `go` | Go: errors are handled, wrapped and never discarded on a state change, and context goes first. | 1 | 2 | 0 | 0 |
| `gpu-painter` | GPU-drawn UI on Dawn (Metal on Mac, Direct3D 12 on Windows), drawn natively: no OpenGL, no browser. | 15 | 6 | 1 | 6 |
| `hook-proof` | A hook that should refuse does refuse: exit 2 is the only block, a crash or a swallowed exit lets the call through, and nothing is proved until it is seen red. | 1 | 5 | 0 | 1 |
| `host-agent` | Software that runs as root on machines it does not own: updates are verified, secrets stay off the command line, system files are replaced atomically, and generated config is escaped. | 1 | 7 | 0 | 0 |
| `html-ui` | Server-rendered HTML (template strings, views): every value escaped, no inline style or script, safe links. | 2 | 5 | 0 | 0 |
| `http-api` | Any HTTP server, in any framework: every route ties a record to its caller, guards fail closed, input is validated, secrets are compared and stored safely, and what a route returns gives nothing away. | 9 | 31 | 0 | 2 |
| `instrument-shell` | Instruments built on a shared shell: quiet states explain themselves, sessions stay loadable, a collapsed panel keeps every route, and what is painted is what is hit. | 7 | 1 | 0 | 3 |
| `js-ts` | JavaScript and TypeScript: strict types, no any, errors never swallowed, every promise handled, process lifecycle, schemas as the one source of truth, JSON only through one helper. | 27 | 35 | 0 | 0 |
| `midi` | MIDI that is right on the wire and in the audio: clock is a pulse stream, sync is a mode, and a program can be several sysex records that round-trip byte for byte. | 5 | 9 | 0 | 2 |
| `mongo` | MongoDB with the native driver: one client, one gateway, aggregation reads, bulkWrite writes, safe deletes. | 6 | 18 | 0 | 0 |
| `multi-tenant` | One system, many customers: no role crosses a tenant, every query carries the tenant key, and isolation is proved with a second tenant. | 1 | 2 | 0 | 1 |
| `nginx` | NGINX in front of containers: Docker DNS resolver, keepalive, stdout logs, headers with always, CSP, ModSecurity/CRS tuning. | 2 | 7 | 0 | 1 |
| `postgres` | PostgreSQL: migrations that never stop traffic, values always bound, types that say what they hold, and no database wiped by mistake. | 5 | 10 | 1 | 1 |
| `python` | Python projects: what is repeated becomes a template in the forms Python has for it, errors are handled where they can be, resources are closed, subprocess and network calls are safe. | 1 | 11 | 0 | 1 |
| `react` | React: a failed request says so, a slow response never overwrites a newer one, effects are not used for derived state, and controls have names. | 2 | 6 | 0 | 0 |
| `reverse-engineering` | Rebuilding a machine from its firmware, manuals and sound banks: two sources before naming anything, every law carries its source, a negative names what was scanned, every term of a sum is accounted for, and firmware stays out of git. | 10 | 4 | 1 | 9 |
| `rust` | Rust: errors returned, unsafe proved, async never blocks, clippy as the gate. | 5 | 9 | 0 | 3 |
| `shell` | Shell scripts: strict mode, quoted arguments, shared functions in one sourced file, tables and loops, and programs kept out of heredocs. | 1 | 9 | 0 | 1 |
| `shell-hooks` | Shell and Node hooks for Claude Code: portable, anchored, quoted, one prelude, JSON by a tool. | 1 | 4 | 0 | 0 |
| `sound-design` | Sound that is proved by measuring audio: algorithms are data, neutral is exact, the meter is suspected before the engine, and tests sit off the easy point. | 7 | 7 | 0 | 7 |
| `stellix` | Stellix spec laws: the world, determinism, generated reset, no shipped images. | 5 | 5 | 1 | 0 |
| `stored-text` | Text from a database reaches the page through one renderer: line endings normalised, markdown parsed, code highlighted, HTML sanitized. | 1 | 4 | 0 | 1 |
| `synth-creator` | The synth-creator configuration's own laws, installed with it and never by another: the build queue (build-guard), the time watch, the spec lock, frozen fixes, read-only vendored code and copy trees, staging by name, the session watches (idle-wake, user-asks, build-sweep), and the rules and skill a synth build lives by. | 8 | 3 | 10 | 2 |
| `tui` | Terminal UIs (Ink + React or raw-mode Node): alternate screen, resize ordering, width as state, raw mode restored on every exit. | 1 | 5 | 0 | 1 |
| `ui-craft` | Application and page design in any web stack: forms, motion, states, navigation, touch, copy, type and space, the look of generated UI, and a rendered-page gate. | 16 | 24 | 0 | 9 |
| `web` | Web UI (Next.js, HTML, CSS, Tailwind 4): accessibility, one primitives module, styles in stylesheets, performance, production build, client boundaries. | 8 | 22 | 0 | 5 |
| `websocket` | WebSocket services: identity comes from the connection, each message is authorised, and a connection map survives a reconnect. | 1 | 3 | 0 | 0 |
| `writing` | Text that goes public reads like a person wrote it: cadence, voice, stance for replies, structure for posts. | 9 | 11 | 0 | 10 |
| `zod` | Zod 4 schemas written once, in one folder, and imported everywhere (schemas-only), with the environment shaped in one env.ts. | 2 | 0 | 1 | 0 |
<!-- generated:packs:end -->

## APIs are versioned, in any framework

`http-api` holds every route under `/api/v<N>/`: `api-path-versioned` reads mounts and routes in any framework, `next-api-route-versioned` reads Next.js route files, and `client-calls-a-version` reads the calls. `apis-are-versioned` says what a version promises: a published version only grows, and a breaking change is a new one with the old kept working behind `Deprecation` and `Sunset` headers. `change-an-api` walks a change. `/health`, auth callbacks and webhooks are left out, since the platform or the provider owns those paths.

## Configurations

A project is one configuration: a kind of project, as data in `configurations/<name>/config.json`. It holds the packs (`always`, `choose`, `default`), the folder template `init` creates, the order of its hooks, what doctor counts as source, and the house rules of its CLAUDE.md block. `.claude/layout.json` `"configuration"` names the project's. With none named, the install takes the configuration that has a chosen pack by default.

<!-- generated:configurations:start -->
| Configuration | For | `init` adds by default |
|---|---|---|
| `base` | Universal engineering only: the git laws, the line limit, the folder and placement laws, the shape law, once-only, making, secrets and the untrusted-content boundary. | nothing |
| `cpp` | Any C++ project that is not a synth: universal engineering and the cpp pack, with what is repeated made one template. | `cpp` |
| `full-stack` | A web service: a Fastify API and a Next.js web app in one repo, Zod 4 schemas in one shared folder, one database gateway, one error contract. | `js-ts`, `stored-text`, `ui-craft` |
| `go` | Go projects: universal engineering and the go pack. | `go` |
| `node` | A Node.js or TypeScript service, web app, CLI, library, MCP server or edge proxy: base, plus the packs its stack needs (js-ts, mongo, fastify, ai, docker, shell-hooks, html-ui, web, tui, nginx). | `js-ts` |
| `python` | Python projects: universal engineering and the python pack. | `python` |
| `rust` | Rust projects: universal engineering and the rust pack. | `rust` |
| `synth-creator` | JUCE synths and effects units: realtime audio, the sound engines, the Dawn GPU painter, Stellix. | `cpp`, `audio-core` |
<!-- generated:configurations:end -->

```
npx --no-install @thedecipherist/claude-packs configs                     list them: packs, counts, folder template
npx --no-install @thedecipherist/claude-packs init --config <name>        install one
npx --no-install @thedecipherist/claude-packs config <name> [--dry-run]   switch; prints what changes first
```

## Presets

`init <preset>` installs the packs a stack needs.

<!-- generated:presets:start -->
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
<!-- generated:presets:end -->

## Commands

Each is `npx @thedecipherist/claude-packs <command>`, or `npx --no-install @thedecipherist/claude-packs <command>` with the kit as a dev dependency. `--dir <project>` runs it on another folder.

<!-- generated:commands:start -->
| Command | What it does |
|---|---|
| `new <name>` | A new project in `<dir>`/`<name>`: the house files (CLAUDE.md, build.md, bugs.md, workflow-bugs.md, docs/versions.md), a git repo on a work/ branch, the kit installed |
| `workorder <name>` | A work order in docs/workorders/`<name>`: the steps, the prompt that runs them with nobody there, and a runner that starts session after session |
| `workorder check <name>` | Before a run: refuses a placeholder left, a step whose Done when has no number or test path, a skill named that is not installed (with the pack to add), and a red doctor --strict |
| `status` | Every unattended run alive on this machine: each project with a progress bar, each agent with its step and its bar, and how much is left; --dir `<project>` [--order `<name>`] for one project, running or not; --watch `<minutes>` to print it again every so many minutes |
| `init [pack...]` | Install packs or presets (e.g. init node-api; list shows them); base is always included and create the layout folders |
| `add <pack...>` | Add packs to an existing install |
| `new-pack <name> [--repo <git-url>] [--hook]` | A new repository for a team's own pack, from the kit's template, ready to edit and push; --hook adds an example hook on the hook contract, with its selftest and its worktree case |
| `add-lesson-check <id> --why <reason> --rule <rule.md> --globs <a,b> --pattern <regex> --bad <code> --good <code>` | One lesson check from the template: fills exclude and kind (--kind), proves that bad is caught and good passes, and names the check in its rule; into .claude/ of --dir, or packs/`<name>`/ with --pack `<name>` |
| `remove <pack...>` | Remove packs (files you edited are kept) |
| `update` | Re-sync installed packs from this package version, in the project's configuration |
| `configs` | List the configurations: what each installs, its packs and its folder template |
| `config <name>` | Switch this project to another configuration; prints what changes first |
| `planner-skills [--out <dir>]` | One project-layout skill body per configuration, from its layout template (printed, or written to `<dir>`/`<configuration>`/project-layout/SKILL.md), and the claude.ai skills |
| `update-all <dir...>` | Update every listed project that already has claude-packs (e.g. update-all ~/projects/*); folders without it are skipped |
| `doctor [--strict] [--fresh]` | Verify the install (paths, folders, hooks, checks' own examples); a hook's selftest that passed is not run again until the hook changes (--fresh runs them all); --strict also fails when a rule matches no file or a source file is covered by no rule |
| `shape scan` | Every instance literal in the repo (code, tests, docs, briefs), by file and concept, with a count, against design/shape.json; exit 1 when any |
| `scan [--out <file>]` | Before installing anything: on a copy of the project, what to install and every issue the checks find; the project is never touched. scan --prompt prints the review brief for what checks cannot see |
| `suggest` | Which configuration and packs this project needs, read from its own files, with the evidence |
| `fix [--from <scan.json>] [--out <file>]` | The last scan as a work order for Claude, .claude/fix-plan.md; scans first if there is none |
| `logs` | Which hooks earn their place: calls, refusals and verdicts per hook, over all the history |
| `survey` | Print the prompt that makes Claude write docs/project.md for tailoring |
| `list` | Show available packs |
| `symmetry gen --cmake <out.cmake> \| --list` | The generated gate shape_symmetry: one test per many concept in design/shape.json (add_test lines a CMakeLists includes at configure time, or plain lines) |
| `symmetry run <concept>` | That gate for one concept: every instance the same members, every pair swaps the same |
| `dup scan` | Every duplicated block (jscpd, the once-only hook's detector), listed by file |
| `lock status\|take [--branch <b>]\|release [--force]` | The claude-packs repo's kit lock, a lease, in each checkout: who holds it, since when, last seen, live or stale (30 min without renewal); take takes it for this session (a stale one is taken over and logged); release takes away your own lock or a stale one, never a live lease without --force |
| `global add\|remove\|doctor` | The global part, exactly three pieces: latest-versions (skill and version-pin-guard), gnu-shell, shell-traps, in ~/.claude (never overwrites; --home `<dir>` to target another home) |
<!-- generated:commands:end -->

## The hooks every project gets

<!-- generated:base-hooks:start -->
| Hook | When | What it does |
|---|---|---|
| `heartbeat` | Every call | Records what each agent did last and when, for the status line; refuses nothing |
| `inside-the-project` | Write, Bash | Refuses work for the project done outside it: a worktree added or moved beside the project, and any write, `cd` or `git -C` into a checkout of the same repo kept outside it, where no other hook can see |
| `lesson-checks` | Write, Bash | Runs the installed lesson checks on what a write adds |
| `file-size-guard` | Write, Bash | Refuses a source file past its line limit |
| `placement-law` | Write, Bash | Refuses a kind of thing in the wrong folder |
| `folder-law` | Write, Bash | Refuses a new source file outside the layout |
| `shape-law` | Write, Bash | Refuses a literal instance of a many concept |
| `brief-guard` | Write, Bash, Agent | Refuses a brief that names a fixed instance |
| `brief-guard-count` | Write, Bash, Agent | Logs each brief the brief guard refused |
| `once-only` | Write, Bash | Refuses a duplicate of code as written |
| `secrets-guard` | Write, Bash | Refuses a secret in code, or a secret file in git |
| `untrusted-boundary` | Write, Bash | Refuses a model call with outside text and no per-call boundary |
| `dispatch-once` | Write, Bash | Refuses a `switch` on a kind already switched on in another file. In Rust, a second lookup table on an enum, outside the enum |
| `template-law` | Write, Bash | Refuses a copy, a near copy or a function made again |
| `code-shape` | Write, Bash | Refuses wide lines, packed lines, long functions, long parameter lists |
| `agents-held` | Agent | Refuses an agent started in the background in a session with nobody there (`claude -p`, a work order's runner): the session's end would stop it mid-work |
| `git-guard` | Bash, Stop | Refuses a token in git config, and the git laws: stage by name, no rebase or force, branches from the fetched trunk. A new install has them; an older project adds `"enable": ["guards/git-house"]` |
| `kit-fresh` | Bash, Session start | Says when the project runs a kit older than npm's, with the update command, and holds a run with nobody there until it is updated; in the kit's own repo, names newer work and refuses a commit until it is merged; offline, says what it could not check |
| `suite-once` | Bash | Refuses the whole test suite unless the user's prompt asks for a full run |
| `no-find` | Bash | Refuses `find`, `bfs`, `fd`, `locate` and `mdfind` unless the user's prompt asks for one: every location is named in the order and the layout |
| `repo-litter` | Bash | Refuses `git add` of a big file, a working screenshot in the root, or a debug dump |
| `look-gate` | Bash, After Bash | Names the reference looks a branch's code changed after a build, and refuses to land the branch without a passing look report for each |
| `skill-first` | Read, Bash | Refuses a read of a schematic, a service manual, a data sheet or a design reference until its skill is loaded, where that skill is installed |
| `making-check` | Stop | Sends a turn back when what it wrote is not what it said |
| `making-check-count` | Stop | Counts the times a turn was sent back, so a repeat is known |
| `making` | Prompt | Asks what is being made and what it reuses |
| `reuse-hint` | Prompt | Shows functions the repo already has when the prompt names them |
| `once-only-index` | After Write, Write, Write, Write, Bash | Adds the written code to the copy index, only for a write that went through |
<!-- generated:base-hooks:end -->

Packs add their own: `realtime-guard`, `param-id-lock` and `settings-layer` (`audio-core`; every plugin has a settings layer with the standard settings, and its standalone no JUCE Options button), `stack-guard` (`full-stack`), `schemas-only` (`zod`), `firmware-out-of-git` (`reverse-engineering`), `db-wipe-guard` (`postgres`), `browser-guard` (`gpu-painter`), `no-shipped-images` (`stellix`), and the `synth-creator` set: `build-guard`, `time-guard`, `spec-lock`, `frozen-files`, `protect-vendor`, `stage-guard`, `chart-first`, and the opt-in `build-sweep`, `idle-wake` and `user-asks`.

Every hook is timed to `.claude/hooks.log`, and `doctor` is red for a median over 500 ms. Nothing is ever cleared: a log past 1 MB moves to `.claude/logs/` under a dated name (`"guards": { "logs": { "maxKb": 1024 } }`). A hook that crashes lets a call through, so `doctor` is red for that too, and the `hook-proof` pack holds hooks to exit 2. Hooks of one entry run in one Node process, through `run-hooks.mjs`.

## Instruments, proved in the audio

Four packs carry what rebuilding classic machines from firmware taught, and most of it is about failures that pass every test: units deaf to the transport, presets silently on defaults, a list of algorithms behind one DSP path.

`reverse-engineering` starts from the machine's own names: `names-sweep` searches an image for what the manual prints, in the forms a display uses and through every wrapping met so far, and reports the record size, the order, the pools and the tables; `menu-map` joins every parameter to the page that reaches it. It needs two sources before anything is named, a source tag on every law and a debt ledger for what was tuned by ear, and it keeps firmware out of git. A schematic, a service manual or a data sheet is read through `read-a-circuit-diagram`, and `skill-first` refuses a read of one until that skill is loaded. A picture of the machine's own screen, from an owner's manual or a test-mode page, is read through `read-a-screen-image`: every string exactly, its font, colour and position, and the gesture that reaches it. `midi` holds the law of clock and sync, and treats a program as records that round-trip byte for byte. `sound-design` proves sound by measuring audio, `vst3host` bounces any VST3 with no DAW or audio device, so a plugin can be measured from a script (`bounce-a-plugin` says how), and `compare-to-the-machine` sets a build beside a recording of the real thing, matching each patch by the name on its display. `instrument-shell` keeps sessions loadable and panels reachable, and holds a menu system as one route table: `route-table.mjs check` finds a press with two outcomes, a page nothing reaches, a page with no way back, an input that silently does nothing and a window that never closes, and `route-table.mjs mermaid` draws each branch of the menu from the table. What a layer hides does no work: under an opaque settings page or pop-up nothing is drawn, ticked or animated, while the sound goes on, and `prove-hidden-is-idle` counts it. `init synth-rebuild` takes them all.

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

The kit learned from [superpowers](https://github.com/obra/superpowers) (MIT), mddkit and MDD, Vercel's Web Interface Guidelines (MIT), Anthropic's frontend-design (Apache 2.0), Impeccable (Apache 2.0), taste-skill and imagegen-skills (MIT), for Rust from [BeautifulRust](https://github.com/morganlinton/BeautifulRust) (MIT) and [rust-skills](https://github.com/leonardomso/rust-skills) (MIT), and for Postgres from [squawk](https://squawkhq.com/docs/rules) (MIT and Apache 2.0), [strong_migrations](https://github.com/ankane/strong_migrations) (MIT), [pg-aiguide](https://github.com/timescale/pg-aiguide) (Apache 2.0) and the PostgreSQL wiki's [Don't Do This](https://wiki.postgresql.org/wiki/Don't_Do_This). [packs/ui-craft/SOURCES.md](packs/ui-craft/SOURCES.md) says what came from each UI source.

## Disclaimer

The kit is provided as is, with no warranty, and what you build with it is yours to answer for. It ships no firmware, manuals or recordings: you must have the right to use every source a project reads. Reverse engineering in the kit is for learning and interoperability; check the law and the licences that apply to you before you use anything you learn from someone else's code, and never copy it. Tools the kit points to, Ghidra among them, are other people's projects under their own licences, and their output is a claim to prove, not a fact. Product names belong to their owners. This is not legal advice. The full text is in [DISCLAIMER.md](DISCLAIMER.md).

## License

MIT. See [LICENSE](LICENSE).

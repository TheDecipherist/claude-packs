# Review: `write-a-workorder` against the synth skills

Read on 2026-11-09 from `TheDecipherist/claude-packs` at `9436b22`. The skill is `packs/base/skills/write-a-workorder/SKILL.md` (the installed copy in `.claude/skills/` is identical). The command behind it is `lib/workorder.mjs`, the templates are `prompts/workorder/{workorder.md,PROMPT.md,run.sh}`, and the only real order in the repo is `docs/workorders/admiral-fleet/`.

## The one-line verdict

The skill is a good law for an expert author and a wall for a beginner. It tells you *what a good brief must contain* (position, sources, foundation, models, measured "done when", planted faults) and nothing about *what those are for a synth*. Every piece of knowledge a beginner lacks already exists in the kit's synth packs or in your head, but the skill never points at any of it, and nothing connects "I want to build a synth" to it.

## What the skill is today

| Part | What it does | Who can use it |
|---|---|---|
| `workorder <name>` command | Writes three files with the name and date filled in. 26 lines; no questions asked, nothing project-specific | Anyone |
| `workorder.md` template | Five prose sections in angle brackets (what, position, sources, foundation, models), a constraints block, W0 set-up, W1-W2 placeholders, W3 review, W4 report | An author who already knows the project, its sources and the house foundation |
| `write-a-workorder` skill | 12 "Always" and 4 "Never" about brief quality; one example step (a CSV import) | Same |
| `PROMPT.md` + `run.sh` | The unattended runner. Solid: resume from `progress.md`, decisions recorded, `BLOCKED BY KIT`, usage-limit wait, DONE file | Anyone, once the order is written |

The runner side is finished. The authoring side is where a beginner stops: the template asks them to write "the position" and "the foundation" of a synth build in angle brackets.

## What a beginner cannot answer, and where the answer already lives

| Template asks | A beginner knows | The answer already exists in |
|---|---|---|
| **What this is / finished looks like** | "a synth that sounds like X and looks like Y" | Nothing turns that sentence into a measurable finish |
| **The position** (known / unknown / unprovable) | Nothing | For a house synth it is nearly constant: synthcore gives clock and keys, synthkit gives the skeleton, the sibling synths give proven parts |
| **The sources** | A picture, maybe a recording, maybe a hardware name | `gather-sources`, `source-checklist`, `analyse-reference-look`, `compare-to-the-machine` all exist and are never named |
| **The foundation** (reuse, never rewrite) | Nothing | `timing-from-synthcore` rule; `copy-and-prove` skill; `copy-trees-read-only` rule; your own rule "finished things are shared components" |
| **Models** (earlier work to learn from) | Nothing | Your standing rule: check Solera, MegaSynth, SuperSynth, Arcturus first. Not in the kit anywhere |
| **Step order** | Nothing | Your house order (Mermaid chart → working UI → engine) is in memory only; the kit has no synth step order |
| **Done when: a number or a test** | Cannot name one | `measure-tone`, `measure-reverb`, `spread-probe`, `clock-probe`, `hit-the-painted-control`, `prove-control`, `gpu-golden-check`, `editor-frame-bench` each define a measurement; the skill's one example is a CSV row count |
| **Which packs/skills the order needs** | Does not know packs exist | `configurations/synth-creator/config.json` knows; the order never checks that a skill it names is installed |
| **Presets / banks** | "make it have good sounds" | Nothing in the kit makes a preset. `spread-probe` measures a finished bank; `preset-design-law` lives only as a claude.ai skill, outside the kit |
| **Panel / look** | "like this picture" | `analyse-reference-look`, `new-panel-control`, `ui-matches-reference-look` exist; `synth-design-law` (the house look) lives only as a claude.ai skill, outside the kit |

## The synth skills, grouped by the step they would prove

This is the step library the kit already has, which the work-order skill should be assembling from instead of asking the author to invent steps.

**Start a unit**
- `new-project` (base): layout before the first file; `new <name> --config synth-creator`
- `gates-from-commit-one` (instrument-shell): "Use when starting a new instrument": clock, render reproduces, round trip, spread, hit test, each seen red
- `lib/new.mjs` comment: "A synth or effects unit is made by synthkit's `new_synth.py` first". The skill never says this

**Sources and references**
- `gather-sources`, `source-checklist`, `names-first`, `menu-map`, `bank-census`, `read-a-screen-image`, `read-a-circuit-diagram`, `re-deliverables`, `tripwire-the-law` (reverse-engineering)
- `analyse-reference-look` (base): a picture into numbers before any page is built; `skill-first` enforces it on `references/` and `mockups/`
- `does-it-sync` (midi): how the real machine slaves

**Panel and controls**
- `new-panel-control`, `prove-control`, `trace-parameter` (audio-core)
- `hit-the-painted-control` (instrument-shell)
- `hover-state`, `gpu-golden-check`, `gpu-golden-update`, `gpu-frame-bench`, `gpu-capture` (gpu-painter)
- `editor-frame-bench` (audio-core)

**Sound**
- `measure-tone`, `copy-and-prove`, `juce-realtime-audit` (audio-core)
- `measure-reverb`, `measure-a-law`, `choose-observable`, `bounce-a-plugin`, `compare-to-the-machine` (sound-design)
- `clock-probe` (midi)

**Presets**
- `spread-probe` only. No skill makes a preset or a bank, names it, or says what a pad or a pluck is

**Running the build**
- `build-step` (synth-creator): one branch per step via `tools/step.py`, `build.md`, `bugs.md`
- `build-through-the-queue`, `pick-tests`, `test-quietly`, `land-branch`, `prove-instances-identical`

## Problems beyond "it assumes an expert"

1. **Two step systems for one synth.** `build-step` tracks steps in `build.md` through `tools/step.py start/save/finish`. The work order tracks `W<n>` steps in `workorder.md` and `progress.md`. `PROMPT.md` says to read both and work on `work/W<n>-<topic>` branches, while `build-step` makes branches through `step.py`. Nothing says the W steps *are* the `build.md` steps. An expert reconciles this by hand; a beginner's run will keep two ledgers or pick one.
2. **An order can name skills that are not installed.** The admiral-fleet order names `analyse-reference-look`, `land-branch`, and nothing checks at write time that `.claude/skills/<name>/SKILL.md` exists in the project. Step 11 ("check doctor --strict is OK") does not cover it.
3. **No route from intent to the skill.** The description triggers on "nobody there", "many sessions", "work order". A beginner says "build me a synth" or "I want a plugin that does X". That sentence should land here, and the skill-first table has no row for it.
4. **The foundation is rewritten per order although it is constant per configuration.** Every synth order will say synthcore, synthkit, eproms rack, the sibling synths. That is configuration data, like `preamble` in `config.json`, not prose for each author.
5. **Review is expert-only.** The admiral-fleet order has a "Changes on review" block written by you. A beginner cannot review a brief in this form. They can answer "the synth will be called X, it will have these 6 sections, these 20 sounds, and look like your picture; yes or no?"
6. **The law for the look and the sounds is outside the kit.** `synth-design-law` and `preset-design-law` are claude.ai skills. A run on the Mac never sees them, so a beginner's order has no house look and no house preset law to follow, however good the steps are.
7. **The skill mixes two jobs.** Points 1-10 are "write the brief"; 11-12 are "start and change a run". Your own micro-skill rule says one thing per skill, so usage counts can show which part misfires.

## What "super beyond easy" has to mean

A person who knows nothing about synths should be able to type one sentence and answer a handful of plain questions, each with a default, and get a complete order that a run can finish. Everything else is decided by the configuration and recorded. Concretely:

**The user's whole job**

```
> I want to build a synth

What kind?                       [1] a new synth  [2] an effect  [3] a copy of a real machine  [4] add to an existing one
Name?                            (any word; can change later)
Do you have a picture of how it should look?   (drop it in references/, or "no": the house look is used)
Do you have a recording or a real machine it should sound like?   (path, or "no")
Which sounds should it come with?   e.g. pads, basses, plucks, leads, keys   (default: 8 of each, 40 total)
Anything it must NOT do or contain?  (default: none)

Here is what you will get: ... (ten lines, plain words)
Build it?  [yes]
```

Everything the template asks for in angle brackets is then filled from the configuration and the answers, never typed by the user.

## Proposed changes, in the order to make them

### 1. Split the skill in two (base)

- `write-a-workorder`: points 1-10, the law of a good brief. Unchanged in substance, shortened.
- `run-a-workorder`: points 11-12 plus the "to change a run in progress" rule. Triggers on "start the order", "leave it running", "change the running order".

### 2. Per-configuration work-order templates (`lib/workorder.mjs`)

`prompts/workorder/<configuration>/workorder.md`, chosen by `layout.json` `"configuration"`, falling back to the generic one. The synth-creator template carries the foundation, the models, the forbidden list and the W0 as fixed text:

- Foundation: synthcore for tempo, MIDI clock, QWERTY and focus (`timing-from-synthcore`); the skeleton from synthkit's `new_synth.py`; testing in the standalone from the eproms rack; sibling synths read through `copy-and-prove` only.
- Models: "check how Solera, MegaSynth, SuperSynth or Arcturus did it before deciding something new", with what not to take (never their design, never sound code that is not yet global).
- Forbidden: hardware, brand and machine names in anything that ships (`copy-trees-read-only` already says this); presets by position; parameter ids changed.
- W0 fixed: `new_synth.py`, `claude-packs new --config synth-creator`, `gates-from-commit-one`, `doctor --strict`, the Mermaid chart of the whole synth committed before any UI code.

### 3. A step library, assembled by answers (`prompts/workorder/synth-creator/steps/*.md`)

One file per proven step, each already carrying the skills it runs and a "done when" that is a number from that skill. The interview picks and orders them. The house order is baked in: chart → UI → engine → presets → audit → report.

| Step | Skills it names | Done when (already a number) |
|---|---|---|
| Chart | (Mermaid of every module and route) | every panel section and every audio route appears once in the chart; the chart is committed before W2 |
| Panel from reference | `analyse-reference-look`, `new-panel-control`, `prove-control`, `hit-the-painted-control` | every control in the reference numbers is hit at its own centre; golden image score ≥ the gate; double-click returns each control to its default |
| Oscillators | `measure-tone`, `copy-and-prove` where a house oscillator is taken | THD, DC and alias figures within `measure-tone`'s budget for every waveform at 3 pitches; output level identical across types within 0.5 dB |
| Filter | `copy-and-prove` from Solera, `measure-tone` | the copy measures IDENTICAL to its source; sweep LP→BP→HP→notch with no level drop beyond the house figure |
| Envelopes | `copy-and-prove` from MegaSynth, `trace-parameter` | attack/decay/release times measured in audio match the displayed values within the tolerance |
| Effects | `measure-reverb`, `measure-a-law` | decay time within tolerance at 3 settings; send and direct routes measure different |
| Clock and keys | `clock-probe`, `does-it-sync` | the unit follows tempo in its audio at 3 BPMs; QWERTY plays while the window has focus |
| Presets | *(needs `preset-design-law` in the kit, see 5)*, `spread-probe` | the asked count exists, every name is original, `spread-probe` says the bank really differs, INIT is the stated neutral |
| Realtime and frame | `juce-realtime-audit`, `editor-frame-bench` | zero audit findings; editor frame time within budget |
| Review and report | (the generic W3/W4) | as today |

Each step's text is the kit's, so the beginner never writes one. A kind of unit picks its subset: an effect skips oscillators and envelopes; a replica adds the reverse-engineering steps (`gather-sources`, `source-checklist`, `names-first`, `bank-census`, `compare-to-the-machine`) in front of the chart.

### 4. A beginner-facing skill in `synth-creator`: `plan-a-synth`

One job: turn "I want a synth" into a finished order. Description: "Use when someone asks to build, make or create a synth, an effect, a plugin, a replica of a real machine, or to add a part to one, and no work order exists yet." It:

1. Asks the six questions above, each with its default, and nothing else. Taste questions only (name, look, sounds); every engineering choice is the configuration's.
2. Runs `workorder <name>` with the synth template, fills the angle brackets from the answers, assembles the steps from the library.
3. Writes `docs/workorders/<name>/summary.md`: ten lines of plain words, what the user will get, no kit vocabulary. That is the review the beginner can do.
4. Runs the pre-flight (point 6 below) and prints the one sentence to start it.

This also gives you the intent routing you want: `plan-a-synth` fires on "build me a synth", `write-a-workorder` on "write the brief for", `run-a-workorder` on "start it". Three counters, three skills.

### 5. Bring the house laws for look and sound into the kit

- `synth-design-law` → rules in `audio-core` (or a `house-look` pack), path-scoped to panel, theme and spec files, exactly as your rule "design laws should be path rules on the right folders, not skills" says.
- `preset-design-law` → a `sound-design` skill `design-a-preset` plus a `presets-are-named-and-neutral` rule. Without this there is no preset step a run can follow, and "presets" is in the title of what you asked for.

### 6. A pre-flight the command runs, not the author (`lib/workorder.mjs` + a test)

Before printing "To watch it, type…", the command checks and refuses on:
- a skill named in `workorder.md` that is not in `.claude/skills/` of the project (names the missing pack to `add`);
- an angle bracket left in `workorder.md`;
- a step with no `**Done when:**` line, or one whose line has no digit and no test path;
- `doctor --strict` red.

`test/workorder.test.mjs` gets each as a planted fault seen red. This makes point 11 of the skill structural, which is where you want laws.

### 7. One ledger for steps

Decide, in the synth template's W0, that the W steps are written into `build.md` as its steps, and that `build-step`'s `step.py start W2 "..."` is how a W step's branch is made. Then `PROMPT.md`'s "work on `work/W<n>-<topic>`" line is replaced by "start each step with `step.py start`". One system, and `build-step`'s whole proof chain (save, check, finish --proof) applies to a work order for free.

## Smaller things seen on the way

- `write-a-workorder` point 11 says "check that `doctor --strict` is OK and the first step can start" but gives no way to check that the first step can start. Point 6 of this review is that way.
- The template's W0 "Run `doctor --strict`" assumes the kit is installed; `new-project` is never named. For a beginner W0 must start from an empty folder.
- `PROMPT.md` says "Read … `CLAUDE.md` and `build.md`"; a non-synth project made with `workorder` alone has no `build.md`. The synth template should say what creates it (`claude-packs new`).
- The one example step in the skill is a CSV import. In a kit whose main configuration is synth-creator, the example should be a synth step with a measured finish, or the skill should point at the step library.
- `spread-probe`'s trigger ("when a bank is finished") is the only preset-related trigger in the kit. Until point 5 lands, a run asked for presets has no law to run.

## Suggested order of work

1. Split the skill (1) and add the pre-flight with its tests (6): small, base-only, no new design.
2. Per-configuration templates (2) and the step library (3): data files plus a few lines in `workorder.mjs`.
3. `plan-a-synth` (4): the interview, built on 2 and 3.
4. Bring the look and preset laws in (5): the only piece that needs content written, not moved.
5. One ledger (7): a change to `PROMPT.md`'s template and `build-step`, measured on the next real synth order.

Each is its own work order on the kit, from the kit's repo, as you set on 2026-11-08.

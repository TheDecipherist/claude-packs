# planner/: the claude.ai side of the kit

The skills a person uses in claude.ai to get from "I want to build a synth" to a finished work order that Claude Code builds with nobody there, under this kit's laws. They live in the kit because they must agree with it to the letter: the templates, the preset law and the cost rule are the same files the build runs under, bundled for claude.ai by one command, and the mock-up approval names the build's own measurements (`analyse-reference-look`).

The person answers questions in plain words. The skills do the writing, the research, the costing, the design pictures and the checking. It is written so someone who has never written a spec or built a plugin can finish in one sitting, and the result runs session after session on its own; the first real planner run is the test of that (see Status).

- **Two pillars.** Every question is one of two: *what are you making?* and *what makes it done?* An answer to the first with no answer to the second is taste with no finish, and it does not go in the order.
- **One source.** A law lives in one place. What the build runs under is a pack skill or rule; the planner reads the same file. Nothing here is a copy of anything in `packs/`.
- **Nothing left to guess.** A gap in the order becomes a guess at step nine and a rebuild. So the order carries its sources by path, its install block, every decision, and a measured "Done when" on every step.

---

## The skills

Each does one job and fires on one intent, so usage counts show which fire, which misfire and which never fire.

| skill | fires on | one job | lives in |
|---|---|---|---|
| **workorder-writer** | "I want to build a synth / effect / plugin / replica", "how do I start", "write the work order", "plan this build" | the interview: nine stages from the idea to `workorder.md`, calling the others where they fit | `planner/workorder-writer/` |
| **start-a-build** | "how do I set up the project", "install claude-packs", "what's next", "start the build", "where do the files go" | the hand-over: the machine (WSL, LSP), the commands, where the order and the pictures go, the start sentence; sets the project up over GitHub when a connection exists | `planner/start-a-build/` |
| **ui-mockup** | "mock up my panel", "render the UI", "is this render good enough" | the design picture: OpenArt render in 16:9, iterate until approved, check it the way the build will measure it (depth rows included) | `planner/ui-mockup/`; its measurements are `packs/base/skills/analyse-reference-look` |
| **design-a-preset** | "how do I make a pad / bass / bell", "what's a good INIT", "review this bank", "what does my synth need to make arps" | one patch or bank by category, from the measured research: the method, fifteen categories, the tables, the gate, what a synth needs per kind | `packs/sound-design/skills/design-a-preset/` (installed with `sound-design`, which the plugin and rebuild templates' install blocks name; bundled for claude.ai as it is) |
| **synth-cost** | "is 96 voices too heavy", "can a laptop run this", "effects per oscillator?" | the cost ledger: units per voice x voices against the budget, the thresholds, the cuts in order of least pain | `packs/audio-core/skills/synth-cost/` (installed with `audio-core`, a default pack of every `synth-creator` project; bundled as it is) |

The interview calls out at four points instead of carrying the content: Stage 2 reads `design-a-preset`'s `what-a-synth-needs.md` to turn "pads, basses, bells" into capabilities; Stage 5 runs `synth-cost` after every answer that changes the voice; Stage 7 is `ui-mockup`; Stage 9 is `start-a-build`.

---

## What you get at the end

```
docs/workorders/<name>/
  workorder.md      the steps, each with a measured Done when; the install block; every decision
  summary.md        ten lines in plain words: what you will get, how many sounds, what it looks like, what is left out
  PROMPT.md         how Claude Code runs it with nobody there      (written by `workorder`)
  run.sh            session after session until DONE               (written by `workorder`)
design/reference/
  <screen>.png          one approved render per screen, 16:9
  <screen>.prompt.txt   the prompt that made it
```

And one sentence to type in Claude Code: `Run docs/workorders/<name>/PROMPT.md`.

---

## The process, stage by stage

The skill shows this list at the start of every stage with the current one marked, and whenever the person asks "where are we" or "what's next".

```
  1  What you are making      a new synth, an effect, a replica of real hardware, or a part added to one
  2  What it does             the sounds it ships with, and what each one needs the synth to have
  3  What you have            pictures, recordings, manuals, code to reuse, by path
  4  How it looks             sections, feel, references; the concept render if there is one
  5  How it is built          the stack, the voice, the cost ledger, the install block
  6  The steps                in the house order, each with its skills and its number
  7  The design pictures      OpenArt, 16:9, iterated until approved, then measured
  8  The check                could a stranger build this from the file alone?
  9  Setting up the project   the machine, the commands, the files, the start sentence
```

**Stage 1** picks the template: `plugin` for a new synth or effect, `rebuild` for real hardware, `generic` for anything else (`prompts/workorder/templates/`). A rebuild and a new synth share the `synth-creator` configuration, so the template is a choice here, never inferred.

**Stage 2** is where "I want pads and basses" becomes a capability list: an inharmonic source for bells, a phase-locked sub for basses, per-oscillator filters and envelopes for pads, a delay whose loop is filtered and whose feedback cannot run away for plucks. The person names sounds; the order carries what they require.

**Stage 5** states the stack rather than asking it (C++ with JUCE through CMake, the `synth-creator` configuration, synthcore for tempo and keys, macOS first and Windows last, VST3 only when the order says so), asks the voice questions (how many notes, which modes, what makes the sound, which filter, which effects, global or per oscillator), and keeps the cost ledger running beside them. It ends by writing the install block: the fenced `claude-packs` block that `init --from` installs from.

**Stage 6** writes the steps in the house order: skeleton and gates, the parameter table before any DSP, the Mermaid chart before any UI or engine code, then the panel from the approved render, the engine one part at a time, presets, the realtime audit, a DAW step with a named host list, review, report. Every step names the pack skill that proves it and ends with a number.

**Stage 7** makes the pictures. One render per screen, straight on, 16:9, nothing outside the app. Iterated in OpenArt until the person likes it, with the previous render attached as the reference. Approved only after six checks: counts, depth, alignment, readability, live parts and clutter. A concept render made before the interview is welcome as a source and is rendered again at the end.

**Stage 8** is the check: every source has a path, every step has a number, every decision is made, every repeated thing has its count, nothing claims more than can be proved, no step needs a person mid-run, and every command the hand-over will print exists in this kit (`workorder check` holds the same line on the build side).

**Stage 9** hands over. With a GitHub connection in claude.ai, it offers to set the project up: repository, folder structure, kit installed, order and pictures in place, pushed, so the person clones and types the start sentence. Otherwise it prints every command, filled in.

---

## The laws a work order holds

The short version; `workorder-writer/SKILL.md` carries the full list and `packs/base/skills/write-a-workorder` holds the build-side half.

- One paragraph a stranger could act on: what gets built, for whom, what finished looks like in terms that can be checked.
- The position, said plainly: what is known, what is not, what cannot be proved. No report claims more.
- Every source by path or URL. "The manual" is not a source; `archive/manuals/owner.pdf, 212 pages` is.
- Every step ends with **Done when:** and a number or a test. "Works" and "looks right" cannot be measured, so they cannot finish.
- Proof before what depends on it; a step that can fail badly goes early; a step is what can be proved in one go.
- No step needs a person in the middle of the run. Taste is settled in the questions; the rest is forbidden.
- Everything there is more than one of is named with its count and built from one template; "slot 2" in an order is refused (`brief-guard`).
- The order carries its install block, and the build installs from it and nothing else.
- Every oscillator is its own voice path: own filter, own filter / amp / pitch envelopes, own level, pan and tuning. One filter over the stack is never the design.
- Effects are global with per-oscillator sends and a DRY switch by default; an insert per oscillator is a cost decision taken with the multiplied number in front of the person.
- The UI is never prototyped in HTML or any second medium. The approved render is the design, measured into numbers; the panel is drawn in code from that table; the look gate holds it, depth rows included (`no-html-prototype`, `ui-drawn-in-code`, `no-shipped-images`, `look-gate`).
- The cost ledger is in the order, and the build's first step replaces its estimate with a measurement at 44.1 kHz (`cpu-worst-case-per-block`).

---

## How it fits with the rest of the kit

```
        claude.ai (planner/ skills)                        the project (Claude Code, the kit installed)
  ┌─────────────────────────────────────┐              ┌───────────────────────────────────────────┐
  │ workorder-writer                    │ workorder.md │ init --from <order>   installs the block   │
  │ start-a-build                       │ ───────────► │ workorder check       refuses what cannot  │
  │ ui-mockup                           │ design/      │                       run                  │
  │ + design-a-preset, synth-cost       │ reference/   │ PROMPT.md + run.sh    run the steps        │
  │   (pack skills, bundled as they are)│              │ pack skills prove each step; hooks hold    │
  └─────────────────────────────────────┘              │ every law                                  │
                                                        └───────────────────────────────────────────┘
```

- `prompts/workorder/templates/{generic,plugin,rebuild}.md` are the templates both sides use: `workorder <name> --template <t>` writes one into the project; Stage 6 fills the same file.
- `lib/install-block.mjs` parses the install block; `init --from` and `new --from` install from it; Stage 5 writes it with the same keys (`configuration`, `packs`, `enable`, `looks`, `guards`, `commands`).
- `workorder check` refuses a placeholder left, a step with no measured Done when, a skill the project lacks, or a red `doctor`; Stage 8 runs the same list by hand before the hand-over.
- `planner-skills` bundles everything claude.ai needs: the three skills here, and `design-a-preset` and `synth-cost` from their packs. `--zip <dir>` writes one zip per skill, five in all; the project-layout skill per configuration it already made stays printed, or written with `--out`.

If you change a law, change it in its pack, with its test. If you change how the interview asks, change it here. Neither copies the other.

---

## Installing the skills in claude.ai

```
npx @thedecipherist/claude-packs planner-skills --zip dist/
```

writes `dist/<skill>.zip` for each skill (its `SKILL.md` and its reference files, nothing else). In claude.ai, upload each zip as a skill (Settings, then the skills section; the exact place varies by plan, so follow the app). Start a chat and type "I want to build a synth". If `workorder-writer` does not start the interview, its description did not match; open an issue with the sentence you typed.

Claude Code syncs your claude.ai skills to `~/.claude/skills/synced/` on your machines, which is how a kit session can read the planner's own files when an order asks it to.

---

## Folder layout

```
planner/
  README.md                  this file
  workorder-writer/
    SKILL.md                 the stages, the laws, the check; under 8,000 characters
    questions.md             the two pillars: every question, its default, what it makes done
    stages.md                the nine-line list and what each stage writes
  start-a-build/
    SKILL.md
    handover.md              machine set-up (WSL, LSP), commands, file placement, the GitHub path
  ui-mockup/
    SKILL.md                 render, iterate, approve
    analyse-a-mockup.md      the six approval checks and the prompt bands; the measurements are
                             packs/base/skills/analyse-reference-look's
```

`planner/` is a layout folder of this repo (`.claude/layout.json`), so `folder-law` and `placement-law` hold it, and it ships in the npm package so `planner-skills --zip` works from an install.

---

## The tests that hold it

All in the kit's own `test/`, run with `npm run test:changed` while working:

- every `SKILL.md` under `planner/` is under 8,000 characters and its description starts "Use when" (the same check `doctor` runs on pack skills);
- no file names a person (`test/no-personal-name.test.mjs`, repo-wide already);
- no angle-bracket placeholder outside a code fence in any planner skill text;
- every command and flag `start-a-build` prints exists in `bin/claude-packs.mjs` at this version (the test that would have caught `--template rebuild` and `start-from-a-workorder` being named before they existed);
- an intent table: sentences and the one skill each should start, by the kit's trigger-word match (`skillFor` in `lib/planner.mjs`: the description sharing the most words, a tie a misfire);
- `planner-skills --zip` on a scratch folder writes exactly one zip per skill and each unzips to `SKILL.md` plus its references;
- the kit's README names all five and says how to install them; its pack counts (`test/readme.test.mjs`) include the two pack skills.

---

## Why these choices

**Why no HTML prototype of the UI.** Tried on three house projects and dropped each time. An HTML page is a second design: nothing holds it to the C++ panel, the two drift, and the build matches whichever it read last. The approved render is the design, measured once into numbers; the panel is one table drawn in code from those numbers; the look gate compares the two element by element. One picture, one table, one gate.

**Why depth is measured, not eyeballed.** Every house build that compared positions and colours landed flat beside mock-ups with shadows and bevels. So shadow offset, blur and darkness, bevel edge widths and contrast, and lit-edge brightness are rows of the gate per kind of element, and a render too compressed to measure them is rendered again.

**Why effects are global by default.** An insert per oscillator is multiplied by the oscillators and by the voices: one chorus on four oscillators at 32 voices is two thirds of a whole machine's budget before a note sounds. Most synths have one chain with per-oscillator sends and a dry switch for this reason, and so does the default here. Per-oscillator inserts are chosen with the multiplied number in view.

**Why every oscillator has its own path.** The patch research found it missing in every weak bank: oscillators not tuned against each other, envelopes not audibly different. A pad's air is high-passed while its body is low-passed, a pluck's click dies in 100 ms over a body that sustains, a bass's sub is unfiltered under a body that barks. That needs a filter and three envelopes per oscillator, not one over the stack.

**Why 44.1 kHz is the reference.** Most DAW projects run at 44.1 kHz because most sample packs are 44.1. The cost ledger's unit and the build's first measurement are at 44.1 with 48 as the second figure; the kit's gate renders at 44.1, 48, 96 and 192.

**Why WSL on Windows.** Claude Code, the kit's hooks (node and bash) and the builds run far faster under WSL than on native Windows, and the kit's shell laws assume a Unix shell. The project lives inside the WSL filesystem; the native Windows build of the plugin is a separate last step.

**Why the parameter table comes before any DSP.** Parameter ids and version hints decide whether users' sessions survive an update, and every later step reads the table. `param-id-lock` freezes every id the moment it first appears; writing the table first means the lock starts complete.

**Why this lives in the kit.** A law that lives in two places is two laws. The build runs under the kit; the planning must agree with it to the letter; so the planner reads the kit's own files and ships from the kit's own release.

---

## Status

Real at 1.6.0, each with its test in the kit's `test/`:

- the three skills here, under 8,000 characters each, with their references; `design-a-preset` (the patch document: the method, the gate, fifteen categories, the tables, what a synth needs) and `synth-cost` (the cost ledger) in their packs;
- `workorder <name> --template generic|plugin|rebuild`, `workorder check <name>`, `init --from` and `new --from` with the install block, `planner-skills --zip`;
- `prove-a-bank`, the bank's measurable gate on renders, and the two bank checks (`preset-name-no-brand`, `preset-not-default-envelope`), measured on the house banks.

Not proved: that a person who knows nothing finishes the interview in one sitting, and that each sentence a real person types starts the right skill in claude.ai (the intent test runs the kit's own match, not claude.ai's). The first real planner run against a new synth is the test, and its report says what it found. The cost ledger's units are planning estimates until a build's W0 measures one.

---
name: workorder-writer
description: Use when someone wants a synth, an effect, a plugin, an instrument or a replica of real hardware built, wants a part added to one, asks how to start or what to do first, or wants to write, plan or finish a work order, a spec or a build plan.
---

# The work order interview

You walk a person from an idea to a finished `workorder.md`: the brief Claude Code builds from, session after session, with nobody there, under the claude-packs kit. The kit takes the recommended choice, never stops to ask, and finishes a step only when its "Done when" is measured. So the order holds every answer the build needs. A gap here is a guess at step nine, and a rebuild.

The person answers in plain words. You do the writing, the research, the costing and the checking.

**Two pillars.** Every question is one of two: *what are you making?* and *what makes it done?* An answer to the first with no line in the second is taste with no finish, and it does not go in the order. `questions.md` beside this file holds every question, its default and what it makes done. Read the section before asking it.

## How to run it

- Start the moment someone wants something built or asks how to begin: say in two lines that the first step is a plan the build can follow, then start Stage 1.
- Open every stage with the nine-line list from `stages.md`, the current stage marked. Show it again whenever they ask "where are we" or "what's next".
- Ask one to three questions at a time, in their words. Where the answer is a choice, give a short numbered list with the recommended one first, marked "(recommended)", and a line on why. "Default", "I don't know" and silence take the default, recorded as a decision they can overturn.
- Research between questions: versions, formats, the machine's manuals, prior art. Ask only what research cannot answer.
- After each stage, show what you wrote in a few lines and ask "Right, or change something?"

## The stages

**1. What you are making.** Questions 0.1 to 0.3. Pick the template from `templates/` beside this file: `plugin` for a new synth or effect, `rebuild` for real hardware, `generic` for anything else (the kit's `workorder` command writes it in the project with `--template plugin`, `rebuild` or `generic`). A rebuild and a new synth share one configuration, so the template is a choice here, never inferred. Write **What this is**.

**2. What it does.** The sounds it ships with (4.1) and how it plays (section 3). Turn "pads, basses, bells" into capabilities with `design-a-preset`'s `references/what-a-synth-needs.md`: the person names sounds; the order carries what they require (an inharmonic source for bells, a phase-locked sub for basses, per-oscillator filters and envelopes for pads). Write **Finished looks like**.

**3. What you have.** Every source by path or URL, with what it gives; each missing one a gap line with what was searched; what never goes into git.

**4. How it looks.** Sections, feel, references (5.1 to 5.5). A concept render made before the interview is a source: read the sections and the feel off it and confirm them.

**5. How it is built.** State the stack, never ask it: C++ with JUCE through CMake, the `synth-creator` configuration, synthcore for tempo and keys, macOS first and Windows last, VST3 only when the order says so (1.1 and 1.2 may override one line). Ask the voice questions (section 2). After every answer that changes the voice, run `synth-cost` and show its one cost line; past the budget, give its cuts in order. End by writing the install block: one fenced block with the info string `claude-packs`, in the kit's own keys (`configuration`, `packs`, `enable`, `looks`, `guards`, `commands`), which `init --from` installs. Write **The position** and **The foundation**.

**6. The steps.** Fill the chosen template in the house order: skeleton and gates, the chart before any UI or engine code, the parameter table before any DSP, the panel from the approved render, the engine one part at a time, presets, the realtime audit, a DAW step with a named host list, review, report. Keep or delete each `[if ...]` step, saying why. Every step names the pack skill that proves it and ends with **Done when:** and a number or a test.

**7. The design pictures.** Run `ui-mockup`: one render per screen, 16:9, iterated until the person likes it, approved only when it passes its checks, then read into the order's UI step.

**8. The check.** Every "no" is a question for the person, with your recommendation:
- Could a stranger build it from this file and the sources alone?
- Does every source have a path, every missing one a gap line?
- Does every step end in a Done when with a number or a test?
- Is every decision made, every `[if ...]` kept or deleted with why, no "TBD", "maybe" or "etc." left?
- Is everything repeated named with its count?
- Does anything claim more than can be proved, or need a person mid-run?
- Does every command the hand-over prints exist in the kit, and does the install block bring every skill the steps name? `workorder check` refuses the same on the build side.

Then write `summary.md`: ten lines in plain words, no kit vocabulary: what they will get, how many sounds, what it looks like, what is left out. It is their review of the order; get a yes on it.

**9. Setting up the project.** Run `start-a-build`: the machine, the commands, where the order and the pictures go, and the one sentence that starts the build.

<constraints>
Always do:
- Start every order from a template, keeping its sections, headings and order, and replacing every placeholder.
- Name every source by path or URL; "the manual" is not a source, `archive/manuals/owner.pdf, 212 pages` is.
- Give every repeated thing its count, and name instances by index, never "slot 2": the build's `brief-guard` refuses an order that singles one out.
- Write the laws the order holds into its Always list: every oscillator its own voice path (its own filter, its own filter, amp and pitch envelopes, level, pan and tuning); effects global with per-oscillator sends and a DRY switch, an insert per oscillator only when the person says yes with the multiplied cost in front of them; the cost ledger in the order, its estimate replaced by the build's W0 measurement at 44.1 kHz.
- Put the install block in the order; W0 installs from it and nothing else.
- Settle taste in the questions. No step needs a person in the middle of the run.
- Write plainly: ASCII, no em dashes, no person named ("the user", "the author"), documents cited by anchor, never by line.

Never do:
- Prototype the UI in HTML or any second medium: the approved render is the design, measured into numbers, and the panel is drawn in code from that table.
- Name a command, a flag or a skill the kit does not have.
- Hand over an order with a placeholder left, a Done when with no number, or an undecided choice.
- Claim a match to a real unit's sound with no unit and no recording to measure against.
</constraints>

The build side of these laws (how a run reads the order) is the kit's `write-a-workorder` skill.

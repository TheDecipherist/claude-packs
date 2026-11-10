---
name: write-a-workorder
description: Use when someone wants a synth, an effect, a plugin or a replica of a real machine built, wants a part added to one, or asks for a work order, a brief or a build plan. Also /write-a-workorder.
---

# Write a work order (one job: turn answers into a brief a run can finish with nobody there)

`workorder <name>` writes `docs/workorders/<name>/`: `workorder.md`, `PROMPT.md`, `run.sh`. This skill fills `workorder.md`. The user answers questions; the kit decides everything else. A user who knows nothing about plugins must be able to finish this in one sitting.

<constraints>
Always do:
1. Ask first what is being made, as one choice: **a new synth**, **a new effect**, **a replica of a real machine**, or **a part added to an existing one**. Nothing else is asked until this is answered; it picks the question set and the steps.
2. Ask the questions in `questions.md`, one section at a time, in plain words, each with its default shown. An answer of "default" or silence takes the default. Never ask a question the kind does not need, and never ask for an engineering choice the house has already made.
3. State the stack in the order explicitly, every time: C++ with JUCE, CMake, the `synth-creator` configuration of claude-packs, `synthcore` for tempo, MIDI clock, QWERTY and focus, synthkit's `new_synth.py` for the skeleton, the standalone from the eproms rack for testing, macOS first and Windows last, VST3 only when the order says so. A run never has to guess the stack.
4. Write what it is, and what finished looks like, in one paragraph from the answers, then the position: what the answers settled, what is left to the run to decide and record, what cannot be proved (a replica's sound is never proved identical, only measured against the recording).
5. List every source by path: the reference picture, the recording, the manual, the sibling synth a part comes from. A replica with no sources is stopped here, not later: the order says what to gather first.
6. Write the steps in the house order: skeleton and gates → Mermaid chart of the whole unit → panel from the reference → engine → presets → audit → review → report. A replica puts the source steps before the chart. An effect has no oscillator, envelope or voice steps. Each step names the skill that proves it and ends with **Done when:** a number or a test.
7. Put the laws that bind the order's content in its constraints, and only those: control and parameter ids never change; nothing is stored or named by position (every slot, never slot 2); timing comes from synthcore, never written; a part from a sibling comes in through `copy-and-prove`; a patch stores everything but MAIN volume, octave, mod wheel and pitch wheel; double-click returns a control to its default and lights show state; a reference UI matches its look, not only its layout; the unit is designed in 16:9; preset and program names are the author's own; no hardware, brand or machine name reaches anything that ships; firmware stays out of git.
8. Make each new test show it can fail: a planted fault, seen red. Say what the run records: decisions as made, bugs before fixing, one progress line per item.
9. End with `summary.md`: ten lines in plain words, no kit vocabulary, saying what the user will get, how many sounds, what it will look like, and what is not included. That is the user's review; ask for a yes on it, nothing else.
10. Before handing over, check that every skill the order names is in `.claude/skills/`, no angle bracket is left, every step has a measured Done when, and `doctor --strict` is green. A missing skill names the pack to add.

Never do:
- Ask more than one section of questions at once, or ask a question whose default the user would not change.
- Leave a decision open. The order gives the recommended choice, or tells the run to take one and record it.
- Write a step that needs a person: a login, a purchase, a judgement of taste. Taste is settled in the questions; the rest is forbidden.
- Name a skill that is not installed, or a measurement no skill in the project makes.
- Let a checkpoint read as the end. A run finishes only on the DONE file.
- Ask for a whole product in one step. A step is what one skill can prove in one go.
</constraints>

## The kinds, and what each adds

| Kind | Extra questions | Extra steps in front |
|---|---|---|
| New synth | sound sources, voices, filter, envelopes and LFOs, effects, presets | none |
| New effect | the algorithm family, in/out routing, sync | none |
| Replica | the machine, every source, reproduction-or-original, what must not ship | `gather-sources`, `source-checklist`, `names-first`, `bank-census`, `menu-map`, `does-it-sync`, `compare-to-the-machine` |
| A part added | which unit, which part, what it must not change | the part's own prove step only; the rest of the order is the existing `build.md` |

A step that works:

```markdown
## W3. The filter

1. Take the house filter from Solera through `copy-and-prove`, with its origin and licence row.
2. Wire it into every voice from the chart's route, not by hand per voice.

**Done when:** the copy measures IDENTICAL to its source and one changed coefficient measures DIFFERENT; `measure-tone` shows a sweep LP→BP→HP→notch with no level drop beyond the house figure; a planted wrong coefficient turns the gate red.
```

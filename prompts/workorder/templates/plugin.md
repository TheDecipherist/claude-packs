# Work order: {{name}}

Written {{date}}. A new synth or effect, built as a native plugin and standalone under the house's decisions. The `write-a-workorder` skill says how to read it; the planner's `workorder-writer` interview fills it in.

How to fill it in: replace everything in angle brackets in the opening paragraphs (**What this is**, **The position**, **The sources**, **The cost ledger**). A step marked **[if ...]** is for one kind of instrument: keep it when it fits and delete it when it does not, before the run starts, with the reason in `decisions.md`. A run never decides that for itself. Everything from **The stack** on is what the house has decided; a line changed there is a decision, written in `decisions.md` with its reason.

**What this is.** <One paragraph a stranger could act on: what it is, the sound parts per voice, the modes, the effects, the panel's sections, what ships with it.>

Finished looks like: every control in the parameter table on the panel and answering at every surface; every sound part measured; the bank of <count> presets spread and named; every gate green and seen red; the standalone opening; the plugin passing pluginval in every host on the DAW list; and a report with counts.

**The position.**
- **Known.** <What is decided: the voice, the modes, the sound parts, the look (the approved render).>
- **Not known yet.** <What the build finds out: the measured cost unit, the exact voice count the budget allows.>
- **Cannot be proved here.** How it sounds to a listener, beyond the measured numbers; how it behaves in a host not on the DAW list. No document may claim more.

**The sources.**
- **The design:** <the approved renders, one per screen, `design/reference/<screen>.png` with `<screen>.prompt.txt` beside each>.
- **References:** <recordings, manuals or plugins the sound is checked against, by path or URL, or "none">.
- **The questions:** every answer of the planner's interview is written into the steps below; nothing lives only in a chat.

**The cost ledger.** <From `synth-cost`: units per voice for each sound part, the voice count, the total against the budget.> These are planning estimates; W0 measures the unit and replaces them.

**The stack.** Decided once for every house plugin:
- C++ with JUCE through CMake, at a version looked up at build time, never remembered.
- CMake presets `dev`, `asan-ubsan`, `tsan` and `rtsan`, each with `CMAKE_EXPORT_COMPILE_COMMANDS=ON`, so clangd and every audit read the same build.
- The `synth-creator` configuration of the kit, installed from the block in W0.
- `synthcore` for tempo, MIDI clock, transport, the sync modes, QWERTY playing and the focus rule: linked, never written here.
- The house skeleton tool where the project has one, else the CMake skeleton W0 writes.
- The standalone, run from the house rack, for every test that opens the app.
- macOS first, Windows last. VST3 and AU only when this order names them.

**The foundation.** The kit holds every law: its skills `gates-from-commit-one`, `build-step`, `analyse-reference-look`, `new-panel-control`, `prove-control`, `hit-the-painted-control`, `trace-parameter`, `copy-and-prove`, `measure-tone`, `measure-reverb`, `clock-probe`, `juce-realtime-audit`, `editor-frame-bench`, `design-a-preset`, `spread-probe`, `bounce-a-plugin`, `synth-cost`, `make-it-a-template`, `prove-instances-identical`, `pick-tests` and `land-branch`. A skill this order names that the install lacks is a kit gap: log it, update the kit, and go on.

<constraints>
Always do:
- Work the steps in order: the chart and the parameter table before any DSP, the panel from the approved render, the engine one part at a time.
- Keep every parameter id as it was first written: ids never change, and `param-id-lock` holds them.
- Address every repeated thing by its index and its count, never by position or a literal instance; declare it in `design/shape.json` first.
- Take every timing from `synthcore`: tempo, clock, transport and sync.
- Take a part from a sibling synth only with `copy-and-prove`: the source fingerprinted, the copy measured identical.
- Store everything in a patch except MAIN volume, octave, mod wheel and pitch wheel.
- Return every control to its default on a double-click, and light every switch that is on.
- Draw every screen in 16:9.
- Give every oscillator its own voice path: its own filter, its own filter, amp and pitch envelopes, its own level, pan and tuning.
- Name every preset in the author's own words.
- Ship no hardware, brand or machine name: not in a preset name, a label, a file or the binary.
- Measure every Done when in the turn that claims it.

Never do:
- Prototype the panel or a page in HTML or a web page: it is a second design that drifts from the first. The reference picture is measured into numbers and the panel is drawn in code from that table.
- Start release work (signing, notarisation, installers) unless a step names it.
- Update a golden without a logged reason.
- Give effects to every oscillator as a blanket feature: an insert per oscillator is a cost decision this order names, with its ledger cost.
- Mark a step done when it was not measured, or weaken a test to pass it.
</constraints>

---

## W0. The project, the gates and the chart

The kit is installed from this block and nothing else. Change it here, before the run, never in `.claude/layout.json` by hand.

```claude-packs
configuration: synth-creator
packs: cpp, audio-core, instrument-shell, midi, sound-design
looks:
  - name: panel
    reference: design/reference/panel.png
    code: ["src/ui/**"]
commands:
  build: node .claude/tools/buildq.mjs cmake --build build --preset dev
  test: node .claude/tools/buildq.mjs ctest --preset dev
```

1. Install from the block: `npx --no-install @thedecipherist/claude-packs init --from docs/workorders/{{name}}/workorder.md`, then `doctor --strict`. Check that every skill **The foundation** names is installed.
2. The skeleton: the house tool where the project has one, else `CMakeLists.txt` and `CMakePresets.json` with the four presets of **The stack**; `synthcore` linked as its README says.
3. `gates-from-commit-one`: the house gates and pluginval at strictness 10 on every format the build makes, each seen red on a planted fault.
4. `node .claude/hooks/param-id-lock.mjs --init`, so the lock exists before the first id.
5. The Mermaid chart of every module and every route, committed before any UI or engine code (`chart-first` refuses source before it).
6. The cost unit measured: one INIT voice, the worst block, at 44.1 kHz and 128 samples, then at 48 kHz. The ledger above is re-scaled by it and the budget gate holds the measured figure (`cpu-worst-case-per-block`).

**Done when:** `doctor --strict` is OK; an empty plugin loads and passes MIDI to a test tone; the standalone opens; every gate was seen red once and is green; `param-id-lock` exists; the chart is the first commit under `docs/`; the unit is measured at 44.1 kHz and 48 kHz and the ledger's total is within the budget.

## W1. The parameter table, before any DSP

1. One table: every control with its id, version hint, kind, range, default, smoothing time or step, whether the patch stores it, whether the host sees it, and its panel section.
2. Generated into the C++ the engine and the panel read; the host parameters are built from it by a loop.
3. The id lock is updated in the same commit.

**Done when:** a test reads the table and the generated C++ and finds every row in both (0 missing); the lock lists every id; a planted id change is refused by `param-id-lock`.

## W2. Voices and modes  **[if polyphonic]**

The voice count, the modes (poly, mono, legato, unison) and the voice stealing, from the interview's answers.

**Done when:** the stated count sums without clipping (`voice-sum-headroom`) and renders within the measured budget per block; each mode has a gate that fails when a note is dropped or doubled (`note-ledger-and-pedals`), with 0 dropped or doubled over 1,000 random notes per mode.

## W3. The oscillators

Each oscillator is its own voice path: its own filter, its own filter, amp and pitch envelopes, its own level, pan and tuning. One template, instanced by count.

**Done when:** every oscillator type measures within `measure-tone`'s budget at three pitches, and all types output the same level within 0.5 dB; each oscillator rendered alone shows its own cutoff sweep, amp decay and pitch drop, independent of the others; a planted shared filter turns the gate red; `prove-instances-identical` passes.

## W4. The filter

The house filter, taken with `copy-and-prove`, or the filter the interview chose.

**Done when:** the copy measures identical to its source (0 samples differ); a sweep through the types shows no level drop beyond the house figure; one coefficient changed measures different.

## W5. Extra envelopes and LFOs

The free envelopes and LFOs the interview named, assignable to any control; every LFO with a delay, free or synced.

**Done when:** measured attack, decay and release match the displayed values within tolerance; an LFO at a stated rate measures that rate in the audio; a vibrato with a 300 ms delay measures silent for 300 ms.

## W6. The effects  **[if effects]**

One global chain with a send per oscillator and a DRY switch, by default. An insert per oscillator only where this order names it, with its ledger cost.

**Done when:** a DRY oscillator measures identical with and without the chain (0 samples differ); each send measures on the wet signal; each effect's neutral setting computes exactly nothing (`neutral-is-exact`); a reverb's decay is within tolerance at three settings (`measure-reverb`).

## W7. The clock and the keys  **[if tempo-synced]**

Tempo, clock and sync from `synthcore`; QWERTY playing and the focus rule from it too.

**Done when:** the synced parts follow tempo in the audio at 90, 120 and 140 BPM (`clock-probe`); OFF is a sound (`sync-is-a-mode`); keys play while the window has focus, with no system beep.

## W8. The arpeggiator  **[if it has one]**

**Done when:** a stated pattern at a stated BPM lands on its samples (`sample-accurate-midi`), at 90, 120 and 140 BPM; a planted late note turns the gate red.

## W9. The panel, from the approved render

Use `analyse-reference-look`, `new-panel-control`, `prove-control` and `hit-the-painted-control`.
1. The approved render measured into numbers once: positions, sizes, colours and the depth rows (shadow offset, blur and darkness; bevel widths and contrast; lit-edge brightness) per kind of element.
2. One class per kind of control, each written once; the panel is one table drawn in code from those numbers.
3. The look gate compares the rendered panel to the picture element by element, depth rows included.

**Done when:** every control comes from the template and the table (a structural test); every drawn control answers at its own centre and the count equals the chart's; the look gate passes, and is seen red on 3 planted faults (a moved control, a changed colour, a flattened shadow); no image ships in the source.

## W10. The presets

Use `design-a-preset` and `spread-probe`. INIT is neutral through every stage. The bank is by category, every name the author's own.

**Done when:** the stated count exists per category; INIT measures neutral (`neutral-is-exact`); every patch round-trips byte for byte (0 bytes differ) and the 4 excluded controls are unchanged by a load; `spread-probe` says the bank really differs; the bank's gate from `design-a-preset` passes.

## W11. The realtime audit and the frame bench

**Done when:** `juce-realtime-audit` has 0 findings; the `asan-ubsan`, `tsan` and `rtsan` builds pass; `editor-frame-bench` measures paint and tick within budget.

## W12. In the hosts

The DAW list: the hosts this order names, each one tested, because no single host proves the rest.

**Done when:** pluginval passes on every format; in each host on the list, the plugin loads, plays, automates a parameter, saves and reopens a session with every value back; the results are a table in `build/evidence/W12/`.

## W13. The README

Use `write-the-readme`. Written last, when the UI is finished: `README.md` at the project's root is the project's front page. Its name and what it is in its first lines, a screenshot of the product itself on top, then what it does, install, first use, build from source, requirements, what is not done yet, and the licence. Every screenshot is one the product renders of itself through its real code path, never a mock-up or a reference render: the main panel, each theme or mode it has, and the settings or other screens worth seeing; made by a script the build runs, saved compressed in `docs/images/`, and made again whenever the look changes.

**Done when:** the README has every section `write-the-readme` names; each image in it was made by the script from this commit's build (the run and the images' hashes in the evidence); 0 broken links or missing images; every command in it runs as written; the `humanize` pass is recorded.

## W14. Before you call it finished

Read the finished work as a senior engineer would, down the house's list, line by line. An item that cannot be answered is listed open, never ticked. Where only a person can judge (how it sounds), say so.

**Done when:** every line has an answer or is listed open (0 lines left blank), and what it found is in `bugs.md`.

## W15. The report

Write `docs/workorders/{{name}}/report.md` and `summary.md`: what was built, what is proved and how, what is not; `logs` in full, with calls, refusals, right and wrong per hook; the ledger's estimate against the measurement.

**Done when:** each of the report's 4 parts (built, proved, not proved, the kit) has counts or a stated reason there are none, and the report is pushed.

# Work order: the <maker> <machine>, rebuilt

Written {{date}}. A rebuild of a hardware instrument as a native plugin and standalone, from our own reverse engineering, never an emulator. It is drawn from four rebuilds the kit has run (an effects unit, an analogue polysynth with its ROM as the oracle, a digital synth with a real unit to record, and a sample-based workstation with a touch screen) and from what their runs met.

How to fill it in: replace everything in angle brackets. A step or item marked **[if ...]** is for one kind of machine: keep it when it fits and delete it when it does not, before the run starts, with the reason in `decisions.md`. A run never decides that for itself. Read `CLAUDE.md` (the method, where things live, the laws) and `docs/sources.md` first. Whatever either marks as proved gets proved again by a test here. The `write-a-workorder` skill says how to read this.

**What this is.** A native plugin and standalone of the <maker> <machine> (<year>, OS <version>):
- <the voice architecture: oscillators, filters, amplifiers, structures, per voice and per part>;
- <the modulation: envelopes, LFOs, matrix, controllers>;
- <the machine's own features: arpeggiator, sequencer, sampler, performance controllers>;
- <the effects>;
- <the panel and the display, with every page>, drawn in code, looking and behaving as the real instrument.

Finished looks like: every parameter, page and gesture in the manual present; <the digital engine agreeing with the firmware's own routines, run as the oracle | the analogue voice following its schematics by measurement>; every factory patch loading and sounding; every gate green and seen red; the standalone opening; and a kit report with counts.

**The position.**
- **Known.** <What computes the sound: firmware (provable exactly, tagged `[FW]`), analogue circuits (provable against their schematics, `[SCH]`), or both, and where the line between them runs. What the service notes and manuals give.>
- **Not known yet.** <The firmware's container, which processor runs what, the record formats, the machine's own features in code.>
- **Cannot be proved here.** <A match to a real unit's sound, unless a unit or reference recordings exist. Any custom chip with no data sheet. Anything the firmware image does not carry.> No document may claim more.

**The oracle.** **[if the firmware computes the sound or the control]** An interpreter of the <CPU> of our own, for tests only and never shipped, runs the real firmware routines, and the C++ must agree with them bit for bit, block for block. "It matches" means a gate says so. Ghidra's P-code emulator is the second oracle on a sample of cases, and the two must agree before either is trusted.

**The sources** (all in the archive, outside every repo; nothing is copied in):
- **Firmware:** <path, version, size, hash>. <Earlier or sibling models' firmware, for reference.>
- **Service notes:** <path>, converted by `pdf-to-md` with the image switch on and every page rendered at 300 dpi: <the block diagram, the board sheets, the test mode, the panel drawing, the parts list>.
- **Manuals:** <owner's manual, supplements, MIDI implementation, sound list>. Every name, range and page is in them.
- **The panel:** <the drawing for geometry; a photo for labels and layout; a correctly lit photo for colour>. Never take colour from a studio-lit photo.
- **Factory content:** <patches, waves, banks>. None of it is committed. It loads at build or run time from `<MACHINE>_FIRMWARE` (or the bank's path), and the plugin builds and runs without it, saying so.
- **[if a real unit is owned]** **The unit:** what the user can record from it, and how (W10).
- **Missing** [gap]: <what was searched for and not found>. W1 records each search and its date.
- **[if no service manual or schematic exists]** **The boards from photos:** by `boards-from-photos`, W1 says what the sheets would have given (for a digital machine: the analogue input and output stages and the clocks) and reads the chips, crystals and converters off photos of the boards. The search for photos is listed for the user's yes before the run, never skipped in silence.

**The foundation.** <The house's shared code, linked and never copied: time, MIDI clock, transport, sync, keys and focus.> The kit holds every law: its skills `gather-sources`, `pdf-to-md`, `read-a-circuit-diagram`, `read-a-screen-image`, `names-first`, `menu-map`, `bank-census`, `analyse-reference-look`, `make-it-a-template`, `prove-instances-identical`, `prove-control`, `pick-tests` and `land-branch`; its tool `names-sweep`; and its rules `addresses-name-their-space` and `presses-held-for-the-firmware`. A skill this order names that the installed kit lacks is a kit gap: log it, update the kit, and go on.

**Models.** <Earlier rebuilds to learn from: their orders, their oracles, their parameter tables, their panels from a table, their gates, their handover notes of the faults they met. Take the method and the proofs, never their code.> <Published projects on this machine: a source to check findings against, tagged `[PUB]`, never code to copy.>

<constraints>
Always do:
- Work the steps in order. The oracle and the parameter layer come before the engine.
- Keep every law's source tag on its line: `[FW]` with an address and its space, `[SCH]`/`[SVC]` with page and sheet, `[MAN]` with page, `[DS]`, `[DATA]`, `[PUB]`, `[REF <model>]`, or `[EAR]` in the debt ledger with what would close it.
- Run Ghidra as the blind second pass on every firmware finding (W4), and record every disagreement in `docs/firmware/disagreements.md` with the side that was wrong, the source that decided and the evidence.
- Read every circuit sheet by `read-a-circuit-diagram` and every screen by `read-a-screen-image`, at full resolution, one report per image.
- Convert PDFs at most two at a time across every session and agent (the `pdf-to-md` skill's wait for a slot).
- Generate what repeats. Voices, parts, oscillators, envelopes, LFOs, patches, pages and every repeated control are data built from one template, declared in `design/shape.json` first. Test a behaviour once on the template; prove the instances are the template with one pass over the data.
- Prove a control through its own input path: a mouse, touch or encoder event in, the audio or the screen out. A gate that writes the parameter proves nothing about the control.
- Hold every press as long as the firmware needs to see it, and give every two-button gesture a latch, since a mouse has one button.
- Keep patch and wave loading off the audio thread; the audio thread allocates nothing and takes no lock.
- After every step that touches the UI, build the standalone, open it, and check the change in the real app, not only in a test rig.
- Keep every environment variable the tests need set in the test run itself, so a missing one is a failure, never a false red.
- Work only inside the project: every worktree under `.claude/worktrees/`, every agent briefed with paths inside it.
- Land each step with `land-branch`, prove it with `git ls-remote`, and fast-forward the local main.
- Use agents where work is independent, up to this machine's measured limit of <n>: start them in the foreground, every one in the same message, never two on one image or one file.

Never do:
- Commit a byte of the firmware, a disk image, a wave, a patch bank, a manual page, a page render, a photo, a data sheet, a decompile or a disassembly listing.
- Copy code from any other project, emulator or plugin. Take facts, cite them, prove them.
- Invent a control, page, parameter or global the machine does not have. Every string shown is the machine's own.
- Draw the panel from an image, or ship one.
- Prototype the panel or a page in HTML or a web page: it is a second design that drifts from the first. The reference picture is measured into numbers and the panel is drawn in code from that table.
- Claim a match to a real unit's sound, or call a part exact that no gate proved exact.
- Write <what the house's shared code owns: tempo, MIDI clock, transport, key handling> here.
- Mark a step done when it was not measured, or weaken a test to pass it.
</constraints>

---

## W0. The project, set up the kit's way

The kit is installed from this block and nothing else. Change it here, before the run, never in `.claude/layout.json` by hand.

```claude-packs
configuration: synth-creator
packs: cpp, audio-core, instrument-shell, midi, sound-design, reverse-engineering
ghidra: <the processors W4 runs Ghidra on, comma-separated, or delete this line>
commands:
  build: node .claude/tools/buildq.mjs cmake --build build --preset dev
  test: node .claude/tools/buildq.mjs ctest --preset dev
```

1. Install from the block: `{{kit}} init --from docs/workorders/{{name}}/workorder.md`. Check that every skill, tool and rule **The foundation** names exists. A gap is a kit fault: log it and update the kit.
2. Start the unit: `CMakeLists.txt` and `CMakePresets.json` (`dev`, `asan-ubsan`, `tsan`), the plugin framework through CMake at a version looked up, never remembered.
3. Link the house's shared code as its README says.
4. Prove the guards: `doctor --strict` OK; an exact copy of a source file refused by `once-only`; `git push --force` refused.
5. Write `design/shape.json` before the code that needs it: every repeated concept with its count, taken from the manual. A count that differs between sources is a finding.

**Done when:** the unit builds on the shared code, an empty plugin loads and passes MIDI to a test tone, the standalone opens, `doctor --strict` is OK, the copy and the force push are refused, and `shape.json` lists every concept with its count and source.

## W1. The sources

1. Convert every PDF by `pdf-to-md`, with the image switch on and every page rendered at 300 dpi, into the archive's `converted/`.
2. Write `docs/names.txt` from the manuals by `names-first`: every parameter, page, value list, type, mode, setting and message the display shows.
3. Read every circuit sheet by `read-a-circuit-diagram`: one report per sheet in `docs/circuits/`, with `chips/`, `netlists/` for every analogue stage, `README.md` and `change-order.md` for what the sheets correct in this order. Name every chip from the sheets, with two sources.
4. Fetch and read the data sheet of every chip the sheets name, by `pdf-to-md`, into `docs/circuits/chips/`. A custom part with none: record what was searched.
5. Search for what is missing, and record each search and its date.

**Done when:** `docs/sources.md` says what each source gave; every sheet has its report, with every part counted; every chip has its page; and `names.txt` parses clean.

## W2. The screens, the panel and the gestures

1. Read every screen in the manuals and every test-mode screen in the service notes by `read-a-screen-image`: one report each in `docs/screens/`, with the exact text, fonts, colours, layout and the gesture that reaches it. A page, a tab and an open pulldown each get their own report. A page the manuals never picture goes in the menu map as unpictured, with what the manual and the firmware's strings say it holds.
2. Write `docs/menu-map.md` by `menu-map`: every page joined to the parameters it edits and the gesture that reaches it, with both mismatch lists.
3. Write `docs/gestures.md`: every button combination in the manuals and the service notes, each with its mouse path and the press timing W3 measures.
4. Run `analyse-reference-look` on the panel: geometry from the drawing, labels and layout from the photo, colour from a correctly lit photo. Write `design/analysis/design-grid.md`: rows and columns declared once, size by kind of control.

**Done when:** every screen, tab and pulldown has its report, with every string counted; the menu map lists every page, pictured or not, and has both lists; every gesture has a mouse path; and the design grid places every control on the drawing, with its kind.

## W3. The firmware map (our pass)

Use `names-first`, `menu-map` and `bank-census`. Follow `addresses-name-their-space`: name the space on every address.

1. Work out the firmware image's container: its sections, their compression, which processor each is for, and where each loads. Prove every checksum it carries.
2. Find every program and say what runs where: the main CPU's, any sub CPU's, any DSP code or parameter sets, the boot and update code.
3. Run `names-sweep` with the clean names, and find the parameter, page, value-list and display-string tables.
4. Map the patch and every other record, every byte, by census over all the factory patches, against the MIDI implementation's sysex map.
5. Trace the engine from the firmware's own structure: the audio block or tick, voice allocation, and the routine for each part of the voice. Resolve C++ virtual calls from their constructors.
6. **[if a sibling model's firmware is mapped]** Diff each finding against it, and say what is shared and what this model added.
7. Measure the panel's switch timing for `docs/gestures.md`: the scan period, how many scans a press must last, how long a held button must be down before the second counts.

**Done when:** `docs/patch-map.csv` covers every byte or marks it unknown; `tools/` regenerates every number from the image; a test reads every factory patch and agrees with the map; the engine's routines are in `docs/firmware/` with their addresses; and every open question is stated with what was scanned.

## W4. The Ghidra second pass

Before the run, `workorder check` proves Ghidra can do it: installed, a JDK it accepts, and a processor module for every name on the install block's `ghidra:` line. Ghidra ships no module for many synth CPUs (the H8/300H and the DSP56300 among them): where it has none, write the second pass with another independent reader (a binutils objdump, a blind disassembler from the maker's manual) and delete the line, before the run, with the reason in `decisions.md`.

1. Run Ghidra headless on the same programs, its project in an ignored build folder inside the project. Its agent is blind to W3's findings: it gets the image and W3's questions, never W3's answers.
2. Compare. A finding both made stands. One side alone: verify it. A disagreement: a third source decides, and it becomes a row in `docs/firmware/disagreements.md` naming the side that was wrong.

**Done when:** every W3 question has Ghidra's answer beside it, every disagreement has its row and verdict, and the verdict counts are in the ledger.

## W5. The oracle  **[if the firmware computes the sound or the control]**

1. Write an interpreter of the <CPU> for tests only, under `tests/oracle/`, from its maker's software manual: the instruction set, the FPU if the routines use it, enough of the memory map for the routines, I/O as test doubles. Write it ourselves; read no other emulator's code.
2. Prove it first: a checksum or self-test routine of the firmware runs in it and passes on the real image, and a planted one-byte change makes it fail.
3. Cross-check it against Ghidra's P-code emulator on the same routines and inputs. A difference is a bug in one of them, settled and logged.
4. Golden traces: run the engine's routines on fixed inputs and record their outputs (for a voice CPU: feed it a patch and a key as the main CPU would, tick it, record what it writes to its DACs).
5. Say what cannot run, and why, rather than faking a result.

**Done when:** the self-test passes in the interpreter and fails on the planted change, the two oracles agree on every shared case, and a golden trace exists for each routine the engine ports.

## W6. The parameter layer

1. A table of parameters with provenance, generated into the C++ the engine reads. Frozen parameter IDs, locked by a test.
2. Tables the firmware holds are read from `<MACHINE>_FIRMWARE` at build time, or regenerated from a proved formula. Without it, the plugin builds and says so.
3. A byte-exact round trip of every factory patch and every other record. Unknown bytes are carried, never zeroed.
4. System exclusive send and receive in the firmware's exact form, as the MIDI implementation and the firmware's parser agree.

**Done when:** every factory patch round-trips byte for byte, every stored byte reaches the engine's copy, the IDs are locked, and a build without the firmware passes.

## W7. The machine's behaviour, with no UI

The machine as data: patch play, parts and key modes, the arpeggiator's or sequencer's state, controller assignments, SHIFT shortcuts, every page of the menu map as a state, write and system settings. Every string comes from the firmware's own tables.

**Done when:** a test drives each behaviour with no UI and meets the manual's stated results, and every string shown is the machine's own.

## W8. The engine: control and modulation, exact

Envelopes, LFOs, the time and value converters, key assignment, velocity and controller scaling, the modulation matrix, tempo sync and the arpeggiator, at the firmware's own rate.

**Done when:** a gate runs the same patch and key sequence through the C++ and the oracle and they agree bit for bit on every output, on every factory patch. A difference is a bug, or a stated, measured limit of the oracle. The gate is seen red on a planted fault in one envelope stage.

## W9. The engine: the sound

1. **[if digital]** Every oscillator, filter and amplifier type, each routine ported and checked against its oracle trace bit for bit, block for block. Waves load from `<MACHINE>_FIRMWARE` at run time; never committed.
2. **[if analogue]** Every stage from its schematic: oscillators band-limited, every filter mode's response computed from the resistor and capacitor values in `docs/circuits/`, not from a table of curves, and measured against what those values compute. Every constant is `[SCH]` with its sheet, `[FW]` with its address, or `[EAR]` in the ledger with what would close it.
3. The realtime rules hold, and the full polyphony fits the CPU budget written in `docs/laws.md`, measured per block.

**Done when:** every type agrees with its oracle trace or measures as its schematic computes; every factory patch sounds, none silent and none clipping beyond a stated limit; the polyphony meets the budget; and the realtime audit is clean.

## W10. The capture kit and the compare tool  **[if a real unit is owned]**

1. Work out the smallest set of recordings that gives what the sources cannot: each wave with no filter, effects or modulation at the pitches it needs, and test tones for the filter, the envelopes and the effects.
2. Write a tool that builds a bulk sysex of plain test patches and MIDI files that play them, so the user sends one file and records.
3. Write `docs/capture.md`: for someone with the unit and an audio interface, what to connect, the levels, what to play, how to name the files, how long it takes, in sittings.
4. Write the tool that cuts the recordings into waves with loop points, read from a path outside the repo, and prove it on a synthetic recording.
5. Write the compare tool: it renders a patch through our engine and sets it beside the recording by level, spectrum and envelope. Prove it on a synthetic pair and a planted difference. The verdict is the user's ear; the numbers show where to look.

**Done when:** a stranger could follow `docs/capture.md`; the path from recording to playable wave is proved on a synthetic recording; and the compare tool shows a planted fault. The recordings themselves are listed open for the user.

## W11. <The machine's own feature>  **[if it has one]**

<One step per feature no earlier step covers: a sample engine, a vocoder, a physical model, a sequencer. Say what it is in code from W3's findings, build it the same way (ported and checked against the oracle, or from its schematic), and list what cannot be built with the exact reason.>

**Done when:** each of its types and settings in `names.txt` is built and checked, or listed with the exact reason it cannot be.

## W12. The effects

1. Map what the main CPU sends the effects processor: the programs or parameter sets it loads, where they are in the image, their format, and the driver's own code, which runs on the main CPU and can be ported exactly. First find whether the effects chip takes microcode or only parameters: the two lead to different steps.
2. **[if it takes microcode and has no data sheet]** Try to decode its instruction set from the programs themselves. A decode is accepted only if every program decodes into a consistent DSP graph (no undefined opcodes, coefficients in range, delay lines that fit its memory) and the parameter routes the driver sends land on the coefficients they name.
3. Decide, in `decisions.md`, by that test: decode accepted, each effect is written as our own code from its decoded algorithm, `[FW]`; not accepted, each effect type is built from the manual's definition and the driver's ranges, every algorithmic choice `[EAR]` in the debt ledger.
4. Either way, the driver's parameter handling is exact.

**Done when:** every effect type in `names.txt` exists; the driver's parameter handling agrees with the oracle; the decision is recorded with its evidence; and no document calls an effect exact unless a gate proved it.

## W13. The panel and the display, in code

All of it is C++ drawing calls. Use `make-it-a-template` and `test-the-template-once`.
1. One class per kind of control, each written once.
2. The panel is a table of plain C++: one row per control with its ID, kind, range, default, grid row and column, and parameter. Host parameters and the panel are built from it by a loop.
3. Draw the instrument straight on, as the correctly lit photo shows it. Every round control's parts share one centre, and grouped things align on the grid.
4. The display is one component reading W7's model. Every page, tab and pulldown of the menu map is its own layout, drawn from its `docs/screens/` report in the machine's font and colours. The parts the pages share are templates written once, and a page is a row of data placing them. Bitmaps the firmware holds load from `<MACHINE>_FIRMWARE` at run time.
5. The look gate is a script: every control's position and size against the grid, every colour against the photo's samples, every screen against its report, element by element. Show it red on a moved control, a changed colour and a dropped string.
6. No control takes keyboard focus, and no click or drop moves focus to a text field.

**Done when:** a structural test proves every control comes from the template and the table; no image ships in the source; the renders are in `build/evidence/W13/`; the look gate passes on the panel and every screen; and a side-by-side with each screen report has every element matching or listed with its cause.

## W14. Everything wired

1. Every control moves the audio or the display, measured end to end from its own input event, with each press held as long as the firmware's measured timing asks.
2. Every two-button gesture works by mouse through its latch, and its test plays it the way the app runs, with audio blocks between messages, never in one call.
3. Every parameter is reachable from the panel or the display, or on a declared list with a reason. MIDI, host automation, the panel and the display reach the same parameters through one path.

**Done when:** a gate driven from the control table measures every control from its own input path, every gesture in `docs/gestures.md` passes through its latch, and the control table in `build/evidence/W14/` has a result on every row.

## W15. The patches

1. A report for every factory patch: distinct records, effective distinct sounds, twins, silent ones and clipping ones.
2. **[if W10 ran and recordings exist]** Every recorded patch through the compare tool, its report beside it.

**Done when:** every patch sounds, levels are within a stated range, and twins are explained.

## W16. Gates and planted faults

Every gate the house keeps applies; add one for each law this machine has. Show each red on a planted fault.

**Done when:** the suite is green, every gate has been seen red, and the `asan-ubsan` and `tsan` builds pass.

## W17. The README

Use `write-the-readme`. Written last, when the UI is finished: `README.md` at the project's root is the project's front page. Its name and what it is in its first lines, a screenshot of the product itself on top, then what it does, install, first use, build from source, requirements, what is not done yet, and the licence. Every screenshot is one the product renders of itself through its real code path, never a mock-up or a reference render: the panel and its display, and each screen or mode worth seeing; made by a script the build runs, saved compressed in `docs/images/`, and made again whenever the look changes.

**Done when:** the README has every section `write-the-readme` names; each image in it was made by the script from this commit's build (the run and the images' hashes in the evidence); 0 broken links or missing images; every command in it runs as written; the `humanize` pass is recorded.

## W18. Before you call it finished

Read the finished work as a senior engineer would, down the house's before-you-call-it-finished list line by line. An item that cannot be answered is listed open, never ticked. Where only a person can judge (how it sounds against a real unit), say so.

**Done when:** every line has an answer or is listed open, and what it found is in `bugs.md`.

## W19. The kit report

Write `docs/workorders/{{name}}/kit-report.md`, compared with the last rebuild's, on evidence and with counts.
1. **Did it hold?** `logs` in full: calls, refusals, right and wrong per hook, what is still open.
2. **The second pass:** the disagreement ledger's counts, how often each side was wrong, and what each found that the other did not.
3. **What got through:** `scan`, `dup scan` and `doctor --strict` on the finished code, read as a senior engineer would.
4. **What helped,** and what never mattered.
5. **The first-try question:** what was right first time, what had to be redone and why, and which of the last rebuild's faults came back.
6. **Faults in the kit,** ranked, and everything `BLOCKED BY KIT`.

**Done when:** every section has counts or a stated reason there are none, and the report is pushed.

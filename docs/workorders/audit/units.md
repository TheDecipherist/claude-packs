# The audit's ledger: one row per unit and per extension line

Its size was fixed in W0, before any work: 107 ids named in `sources/DECIDED.md`, 248 in `sources/SORTED.md` section 7 (346 together, with R1, the release lock, which DECIDED.md names without an id), and 16 added: the ids SORTED.md section 6 lists as DECIDED (U26, E2.8, E8.11, E11.3, E13.1, E19.5, E21.1, E21.6, E52.1, E53.1, E61.1, E74.1, T6; see decisions.md d-2), L1 and L2 (the skill-use log and the rule-applied log, W2 item 1) and S1 (the shell text, W6 item 3). 362 rows.

Status: done, dropped (with the DECIDED.md or SORTED.md line), obsolete, or FOR THE USER.

| id | kind | pack and file | one thing | proof | commit | status |
|---|---|---|---|---|---|---|
| R1 | new | packs/audio-core/hooks/release-lock.mts + lib/release-facts.mts + rules/release-lock.md | what a saved patch or song depends on is locked at the first release; only additions pass after | test/hooks/audio-core/release-lock.test.mts: a range, a skew, a mid-list choice, a renumbered program refused after release; appended parameter and choice pass; a range change before release passes (build/evidence/W5/lock-tests.log) | 81af574 | done |
| C1 | split | packs/audio-core/rules/panel-surfaces.md, column-names.md, section-header-and-lamp.md, panel-tabs.md, instance-grid.md (panel-surface-and-sections retired) | five one-thing rules; the glow and shadow line gone; depth-is-designed governs | paths: build/evidence/W5/rule-paths.md | 81af574 | done |
| C2 | split + new | packs/audio-core/rules/knob-gestures.md, host-parameter-names.md, display-echo.md, modulation-by-drag-and-drop.md, modulation-overview-page.md (panel-gestures retired) | four one-thing rules and the modulation overview page; the no-matrix-page line gone | paths: build/evidence/W5/rule-paths.md | 81af574 | done |
| C3 | | | | | | |
| C4 | new + extend | packs/reverse-engineering/skills/prove-a-disassembler; rules/house-tools-live-in-the-library.md | a house disassembler is proved opcode for opcode against unidasm run as a program; nothing ported | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| C5 | | | | | | |
| C6 | extend | packs/midi/rules/sync-is-a-mode.md, skills/clock-probe/clock-law.md, tools/open-default-probe.mts | the decided defaults at open, standalone and plugin, per destination; stored state loads as stored | test/tools/midi/open-default-probe.test.mts | 92ae1e4 | done |
| C7 | extend | packs/base/skills/pdf-to-md (+ reading-a-pdf.md) | docling stays; the backup read when a converted file is found broken at use, and the user is told | text in place | 92ae1e4 | done |
| C8 | extend | prompts/workorder/templates/rebuild.md (Sources, W2.4) | photo first, agreeing with analyse-reference-look (unchanged) | build/evidence/W7/templates.log | 92ae1e4 | done |
| C9 | extend | packs/midi/rules/sync-is-a-mode.md, clock-law.md | every rhythm time syncs; timbre times never follow tempo; FREE first | text in place | 92ae1e4 | done |
| C9a | extend | packs/midi/rules/sync-is-a-mode.md | a rebuild offers sync on its rhythm times; standalone opens as the hardware did | text in place | 92ae1e4 | done |
| C10 | extend | packs/reverse-engineering/skills/names-first (Never reworded, E8.11) | a panel table's columns are read, not assumed to hold or lack offsets | text in place | 3c7f57c | done |
| C11 | new + extend | packs/reverse-engineering/rules/layout-closes-on-itself.md; rules/two-sources-before-naming.md (E2.8) | a closure the layout was not tuned to is an independent proof | paths: build/evidence/W1/rule-paths.md | 3c7f57c | done |
| C12 | extend | prompts/workorder/templates/rebuild.md W8 (T6) | a machine's arp remade exactly, unless the user says otherwise | build/evidence/W7/templates.log | 92ae1e4 | done |
| C13 | new | packs/reverse-engineering/skills/find-the-base | base scored on a linear read only, and why | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| C14 | extend | packs/audio-core/rules/host-parameter-names.md | a rebuild uses the machine's display strings; ours Column . Section . Name | paths: build/evidence/W5/rule-paths.md | 81af574 | done |
| C15 | extend | packs/base/skills/pdf-to-md | a slot from the governor (governed.mjs) in place of the polling loop | text in place | 92ae1e4 | done |
| C16 | new | packs/base/skills/workflow-bugs | the skill hooks-and-gates names, shipped | pressure test: build/evidence/W3/pressure (3/3 fire, 3/3 silent; followed) | 92ae1e4 | done |
| C17 | extend | packs/reverse-engineering/skills/bank-census (E11.3) | a flat column is a wrong decode or fixed structure; decide by the code | text in place | 3c7f57c | done |
| U1 | new | packs/reverse-engineering/skills/triage-the-dump + tools/dump-triage.mts | say what each image is and whether it is whole, before anything is read from it | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed); test/tools/reverse-engineering/dump-triage.test.mts (stuck line red without the plant) | 3c7f57c | done |
| U2 | new | packs/reverse-engineering/skills/identify-the-cpu | name each processor from the image itself, proved three ways, before a disassembler is chosen | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| U3 | new | packs/reverse-engineering/rules/decode-from-a-proven-boundary.md | a listing counts only from an address reached from a vector or a call target | paths: build/evidence/W1/rule-paths.md | 3c7f57c | done |
| U4 | new | packs/reverse-engineering/skills/find-the-base | prove where an image is loaded by a score with a stated margin, on a linear read only (C13) | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| U5 | new | packs/reverse-engineering/skills/trace-the-builders (+ c-idioms.md) | read every routine that turns a record field into an engine coefficient | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| U6 | new | packs/reverse-engineering/skills/attribute-the-record | map every stored byte of a patch to the running record through the code | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| U7 | new | packs/reverse-engineering/skills/read-the-dsp-program | recover a downloaded DSP program from the host's loader | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| U8 | new | packs/reverse-engineering/skills/find-the-timer | derive the time base from the crystal and the timer before any time law | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| U9 | new | packs/reverse-engineering/skills/absolute-scale-from-firmware | take absolute frequency and time units from firmware anchors, with no ear | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| U10 | new | packs/reverse-engineering/rules/layout-closes-on-itself.md | an exact closure the layout was not tuned to is an independent proof (C11) | paths: build/evidence/W1/rule-paths.md | 3c7f57c | done |
| U11 | new | packs/reverse-engineering/skills/profile-the-bank + tools/byte-profile.mts | the per-offset profile of a bank every attribution must agree with | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed); test/tools/reverse-engineering/byte-profile.test.mts (red with the planted profile changed) | 3c7f57c | done |
| U12 | new | packs/reverse-engineering/skills/find-a-table (+ table-shapes.md) | locate a table by known values or its shape, then confirm it in code | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| U13 | new | packs/reverse-engineering/rules/a-field-may-be-an-index.md | before reading a field as a value, test whether it is an index and from which base | paths: build/evidence/W1/rule-paths.md | 3c7f57c | done |
| U14 | new | packs/reverse-engineering/skills/place-a-bit-field | place a field the documents do not settle by statistics a wrong place fails | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| U15 | new | packs/reverse-engineering/skills/diff-the-revisions | compare builds of one machine structurally (tool on the library shelf) | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| U16 | new | packs/reverse-engineering/skills/read-the-formatter | take each parameter's unit and curve from the routine that prints it | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| U17 | new | packs/reverse-engineering/skills/manual-is-fully-covered | the closing check: every parameter, page and message the manual names is accounted for (names-first unchanged, still first) | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| U18 | new | packs/reverse-engineering/skills/map-the-io | name each I/O address from the register map and what the code writes there | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| U19 | new | packs/reverse-engineering/skills/find-a-sequence | find stored music by its signature and prove it by arithmetic | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| U20 | new | packs/reverse-engineering/skills/sample-roms | assemble and decode sample ROMs | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| U21 | new | packs/reverse-engineering/skills/byte-reach | the deaf count of stored bytes as the progress number of a decode | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| U22 | new | packs/base/rules/a-gate-measures-the-real-thing.md | a gate opens, names and counts what it measures, so it cannot pass on nothing | paths: build/evidence/W2/rule-paths.md | 92ae1e4 | done |
| U23 | new | packs/base/rules/debt-gates-fail-on-rise.md | a debt-count gate holds a checked-in floor and fails only on a rise | paths: build/evidence/W2/rule-paths.md | 92ae1e4 | done |
| U24 | new | packs/base/checks/no-elided-code.json + rules/no-elided-code.md | refuse source written with elided parts | bad caught, good passes (doctor and lesson-checks); 0 hits on the kit's own source; paths: build/evidence/W2/rule-paths.md | 92ae1e4 | done |
| U25 | new | packs/base/rules/second-time-is-a-tool.md | the second time a step is done by hand, make it a tool or skill | paths: build/evidence/W2/rule-paths.md | 92ae1e4 | done |
| U26 | new | packs/base/skills/workflow-bugs | log a workflow fault before fixing it, close it with cause, fix and catch | pressure test: build/evidence/W3/pressure (3/3 fire, 3/3 silent; followed) | 92ae1e4 | done |
| U27 | new | packs/synth-creator/skills/can-the-user-open-it + tools/can-open.mts | prove the binary the user launches holds the change | pressure test: build/evidence/W3/pressure (3/3 fire, 3/3 silent; followed); test/tools/synth-creator/can-open.test.mts (stale binary and RelWithDebInfo leftover both named, each red without its check) | 92ae1e4 | done |
| U28 | new | packs/synth-creator/hooks/fault-logged.mts (Stop, opt-in) | send a turn back once when it admits a fault and no log entry was written | test/hooks/synth-creator/fault-logged.test.mts (planted-fault and expected-failure phrasings pass; refusals red without the fix) | 92ae1e4 | done |
| U29 | new | packs/synth-creator/skills/generate-the-machine-docs | the machine's documents generated from engine source by one command | pressure test: build/evidence/W3/pressure (3/3 fire, 3/3 silent; followed) | 92ae1e4 | done |
| U30 | new | packs/synth-creator/tools/docs-current.mts + rules/docs-are-current.md | the build fails when generated documents are stale or the generator is not byte-deterministic | test/tools/synth-creator/docs-current.test.mts (run-twice test; planted non-determinism and stale doc red) | 92ae1e4 | done |
| U31 | dropped | - | regenerate docs on commit | none | - | dropped (SORTED.md section 3: "Drop. U30 already catches stale docs") |
| U32 | new | packs/sound-design/skills/measure-a-filter | measure a filter's corner, slope and resonance from renders | pressure test: build/evidence/W4/pressure (3/3 fire, 3/3 silent; followed) | 81af574 | done |
| U33 | new | packs/sound-design/skills/measure-an-envelope | measure an envelope's stages and an onset from renders | pressure test: build/evidence/W4/pressure (3/3 fire, 3/3 silent; followed) | 81af574 | done |
| U34 | new | packs/sound-design/skills/identify-a-parameter | identify an unknown stored byte by its audible signature | pressure test: build/evidence/W4/pressure (3/3 fire, 3/3 silent; followed) | 81af574 | done |
| U35 | new | packs/sound-design/skills/prove-choices-differ | a choice control's options proved different from each other | pressure test: build/evidence/W4/pressure (3/3 fire, 3/3 silent; followed) | 81af574 | done |
| U36 | new, split | packs/sound-design/skills/bank-coverage + tools/bank-coverage.mts; loader line to midi imports-count-every-loss; middle-C line to spread-probe | every control varied across the bank or exempt with a reason | pressure test: build/evidence/W4/pressure (3/3 fire, 3/3 silent; followed); test/tools/sound-design/bank-coverage.test.mts (planted flat control red) (build/evidence/W5/lock-tests.log) | 81af574 | done |
| U37 | new | packs/sound-design/rules/full-matrix-first.md (+ U41's per-voice-or-bank line) | the engine carries the whole modulation matrix the day its offsets land | paths: build/evidence/W5/rule-paths.md | 81af574 | done |
| U38 | new | packs/sound-design/rules/reset-before-apply.md + checks/reset-before-apply.json | the engine resets exactly as find-the-reset's map says, before every patch and at startup | paths: build/evidence/W5/rule-paths.md; the check's bad caught and good passed (build/evidence/W4/reset-before-apply-check.txt); measured on solera: 2 hits read (one inline reset loop, one file loader) | 81af574 | done |
| U39 | folded | packs/audio-core/hooks/release-lock.mts (the program-number row) | program numbers never move after a release | test/hooks/audio-core/release-lock.test.mts (a renumbered program refused, an appended one passes) | 81af574 | done (folded into R1, DECIDED.md "E57 replaced") |
| U40 | new | packs/sound-design/rules/reference-presets-are-statistics-only.md | other makers' presets read for aggregates only; nothing committed or shipped | paths: build/evidence/W5/rule-paths.md | 81af574 | done |
| U41 | new, trimmed | packs/sound-design/rules/model-the-mechanism.md | model the machine's own mechanism; per-voice line to U37, mode-tap line dropped (repeats filters-stable-under-modulation) | paths: build/evidence/W5/rule-paths.md | 81af574 | done |
| U42 | new | packs/sound-design/rules/counter-oscillators-quantise.md | a counter-clocked oscillator's integer divisor is modelled | paths: build/evidence/W5/rule-paths.md | 81af574 | done |
| U43 | new | packs/sound-design/rules/gate-both-faults.md | a detector fix gated against the opposite fault | paths: build/evidence/W5/rule-paths.md | 81af574 | done |
| U44 | new | packs/sound-design/skills/categorise-a-factory-bank | put each decoded factory program in a category | pressure test: build/evidence/W4/pressure (3/3 fire, 3/3 silent; followed) | 81af574 | done |
| U45 | new | packs/sound-design/skills/generate-a-recipe | a new synth-neutral recipe from real patch statistics (method only; D3) | pressure test: build/evidence/W4/pressure (3/3 fire, 3/3 silent; followed) | 81af574 | done |
| U46 | new | packs/sound-design/rules/seeds-are-hashed.md | every item's seed is a hash of (run seed, index); generator seeds, never the signal | paths: build/evidence/W5/rule-paths.md | 81af574 | done |
| U47 | new | packs/midi/rules/nrpn-and-packed-values.md | NRPN numbers and packed values decoded and written back exactly | paths: build/evidence/W2/rule-paths.md | 92ae1e4 | done |
| U48 | new | packs/midi/skills/vendor-sysex | recognise a vendor's sysex frame and record conventions | pressure test: build/evidence/W3/pressure (3/3 fire, 3/3 silent; followed) | 92ae1e4 | done |
| U49 | new | packs/midi/skills/midi-from-firmware | read what MIDI a machine honours from its receive handler | pressure test: build/evidence/W3/pressure (3/3 fire, 3/3 silent; followed) | 92ae1e4 | done |
| U50 | new | packs/midi/skills/find-the-division-table | find the division table and read it in order | pressure test: build/evidence/W3/pressure (3/3 fire, 3/3 silent; followed) | 92ae1e4 | done |
| U51 | new, reworded | packs/audio-core/rules/keys-belong-to-the-keyboard.md | the keyboard plays notes; nothing else takes it, outside a text field the user opened | paths: build/evidence/W5/rule-paths.md | 81af574 | done |
| U52 | new (C1) | packs/audio-core/rules/panel-surfaces.md, column-names.md, section-header-and-lamp.md, panel-tabs.md, instance-grid.md | one thing each, from panel-surface-and-sections | paths: build/evidence/W5/rule-paths.md | 81af574 | done |
| U53 | new (C1) | packs/audio-core/rules/panel-surfaces.md, column-names.md, section-header-and-lamp.md, panel-tabs.md, instance-grid.md | one thing each, from panel-surface-and-sections | paths: build/evidence/W5/rule-paths.md | 81af574 | done |
| U54 | new (C1) | packs/audio-core/rules/panel-surfaces.md, column-names.md, section-header-and-lamp.md, panel-tabs.md, instance-grid.md | one thing each, from panel-surface-and-sections | paths: build/evidence/W5/rule-paths.md | 81af574 | done |
| U55 | new (C1) | packs/audio-core/rules/panel-surfaces.md, column-names.md, section-header-and-lamp.md, panel-tabs.md, instance-grid.md | one thing each, from panel-surface-and-sections | paths: build/evidence/W5/rule-paths.md | 81af574 | done |
| U56 | new (C1) | packs/audio-core/rules/panel-surfaces.md, column-names.md, section-header-and-lamp.md, panel-tabs.md, instance-grid.md | one thing each, from panel-surface-and-sections | paths: build/evidence/W5/rule-paths.md | 81af574 | done |
| U57 | new, reworded | packs/audio-core/rules/pan-and-mix-equal-power.md | equal-power pan and mix, on an original | paths: build/evidence/W5/rule-paths.md | 81af574 | done |
| U58 | new, reworded | packs/audio-core/rules/panel-colour-safe.md | no state by colour alone, on an original (the brightened cap a shape change) | paths: build/evidence/W5/rule-paths.md | 81af574 | done |
| U59 | new, reworded | packs/audio-core/rules/signal-reads-left-to-right.md | the layout follows the signal, on an original | paths: build/evidence/W5/rule-paths.md | 81af574 | done |
| U60 | | | | | | |
| U62 | | | | | | |
| U63 | | | | | | |
| U64 | | | | | | |
| U65 | | | | | | |
| U66 | | | | | | |
| U67 | | | | | | |
| U68 | | | | | | |
| U69 | | | | | | |
| U70 | | | | | | |
| U71 | | | | | | |
| U73 | new | packs/base/hooks/agent-model.mts + rules/agent-model.md (opt-in) | refuse an agent spawn with no model, and Opus with no listed reason; forks and self-defined models exempt | test/hooks/base/agent-model.test.mts; selftest 9 cases (build/evidence/W2/agent-model-selftest.txt); matcher held by test/unit/lib/hook-matchers.test.mts | 92ae1e4 | done |
| U74 | new | packs/base/hooks/agent-ledger.mts (on by default, d-6) | log every agent's model, brief, run time and tokens in .claude/logs/agents.jsonl | test/hooks/base/agent-ledger.test.mts | 92ae1e4 | done |
| N1 | new | packs/reverse-engineering/skills/find-the-reset | map exactly what the machine sets before a patch loads, and in what order | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| N2 | new | packs/reverse-engineering/skills/find-the-init-patch | the machine's own INIT record, and the keys that load it | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| N3 | | | | | | |
| N4 | | | | | | |
| E1.1 | extend | packs/reverse-engineering/rules/every-law-has-a-source.md | one tag list (DS, REF, EMU, SVC, DER, PHOTO, ASSUMED, MEAS); COR weak; host-only law provisional; chip vs board; same button name | text in place; rule loads as before | 3c7f57c | done |
| E1.2 | extend | packs/reverse-engineering/rules/every-law-has-a-source.md | one tag list (DS, REF, EMU, SVC, DER, PHOTO, ASSUMED, MEAS); COR weak; host-only law provisional; chip vs board; same button name | text in place; rule loads as before | 3c7f57c | done |
| E1.3 | extend | packs/reverse-engineering/rules/every-law-has-a-source.md | one tag list (DS, REF, EMU, SVC, DER, PHOTO, ASSUMED, MEAS); COR weak; host-only law provisional; chip vs board; same button name | text in place; rule loads as before | 3c7f57c | done |
| E1.4 | extend | packs/reverse-engineering/rules/every-law-has-a-source.md | one tag list (DS, REF, EMU, SVC, DER, PHOTO, ASSUMED, MEAS); COR weak; host-only law provisional; chip vs board; same button name | text in place; rule loads as before | 3c7f57c | done |
| E1.5 | extend | packs/reverse-engineering/rules/every-law-has-a-source.md | one tag list (DS, REF, EMU, SVC, DER, PHOTO, ASSUMED, MEAS); COR weak; host-only law provisional; chip vs board; same button name | text in place; rule loads as before | 3c7f57c | done |
| E1.6 | dropped | packs/reverse-engineering/checks/ear-constant-tagged.json untouched | the check reading the full tag list | none | - | dropped (SORTED.md section 3: "Drop. The check does its one job now.") |
| E2.1 | extend | packs/reverse-engineering/rules/two-sources-before-naming.md | a test is a source; scope; translation; trimmer pair; firmware first; sibling enums; arithmetic arbiter; C11 closure | text in place | 3c7f57c | done |
| E2.2 | extend | packs/reverse-engineering/rules/two-sources-before-naming.md | a test is a source; scope; translation; trimmer pair; firmware first; sibling enums; arithmetic arbiter; C11 closure | text in place | 3c7f57c | done |
| E2.3 | extend | packs/reverse-engineering/rules/two-sources-before-naming.md | a test is a source; scope; translation; trimmer pair; firmware first; sibling enums; arithmetic arbiter; C11 closure | text in place | 3c7f57c | done |
| E2.4 | extend | packs/reverse-engineering/rules/two-sources-before-naming.md | a test is a source; scope; translation; trimmer pair; firmware first; sibling enums; arithmetic arbiter; C11 closure | text in place | 3c7f57c | done |
| E2.5 | extend | packs/reverse-engineering/rules/two-sources-before-naming.md | a test is a source; scope; translation; trimmer pair; firmware first; sibling enums; arithmetic arbiter; C11 closure | text in place | 3c7f57c | done |
| E2.6 | extend | packs/reverse-engineering/rules/two-sources-before-naming.md | a test is a source; scope; translation; trimmer pair; firmware first; sibling enums; arithmetic arbiter; C11 closure | text in place | 3c7f57c | done |
| E2.7 | extend | packs/reverse-engineering/rules/two-sources-before-naming.md | a test is a source; scope; translation; trimmer pair; firmware first; sibling enums; arithmetic arbiter; C11 closure | text in place | 3c7f57c | done |
| E2.8 | extend | packs/reverse-engineering/rules/two-sources-before-naming.md | a test is a source; scope; translation; trimmer pair; firmware first; sibling enums; arithmetic arbiter; C11 closure | text in place | 3c7f57c | done |
| E3.1 | extend | packs/reverse-engineering/rules/a-negative-names-what-was-scanned.md | every encoding and stride; change the question after three; tool layout printed; analogy checked | text in place | 3c7f57c | done |
| E3.2 | extend | packs/reverse-engineering/rules/a-negative-names-what-was-scanned.md | every encoding and stride; change the question after three; tool layout printed; analogy checked | text in place | 3c7f57c | done |
| E3.3 | extend | packs/reverse-engineering/rules/a-negative-names-what-was-scanned.md | every encoding and stride; change the question after three; tool layout printed; analogy checked | text in place | 3c7f57c | done |
| E3.4 | extend | packs/reverse-engineering/rules/a-negative-names-what-was-scanned.md | every encoding and stride; change the question after three; tool layout printed; analogy checked | text in place | 3c7f57c | done |
| E4.1 | extend | packs/reverse-engineering/rules/addresses-name-their-space.md | image name, version, md5; grid filter; decompressed offsets | text in place | 3c7f57c | done |
| E4.2 | extend | packs/reverse-engineering/rules/addresses-name-their-space.md | image name, version, md5; grid filter; decompressed offsets | text in place | 3c7f57c | done |
| E4.3 | extend | packs/reverse-engineering/rules/addresses-name-their-space.md | image name, version, md5; grid filter; decompressed offsets | text in place | 3c7f57c | done |
| E5.1 | extend | packs/reverse-engineering/rules/findings-are-withdrawn-in-place.md | a comment is no evidence; a correction asserted in the tool | text in place | 3c7f57c | done |
| E5.2 | extend | packs/reverse-engineering/rules/findings-are-withdrawn-in-place.md | a comment is no evidence; a correction asserted in the tool | text in place | 3c7f57c | done |
| E6.1 | extend, reworded | packs/reverse-engineering/rules/reproduction-or-original.md | the anomaly kept as the machine has it, footnoted, tested; no switch | text in place | 3c7f57c | done |
| E6.2 | extend, reworded | packs/reverse-engineering/rules/reproduction-or-original.md | extra faceplate controls go to our edit layer, labelled ours | text in place | 3c7f57c | done |
| E6.3 | extend | packs/reverse-engineering/rules/reproduction-or-original.md | no patch memory: the record is ours; variants as one engine and a range table | text in place | 3c7f57c | done |
| E6.4 | extend | packs/reverse-engineering/rules/reproduction-or-original.md | no patch memory: the record is ours; variants as one engine and a range table | text in place | 3c7f57c | done |
| E7.1 | extend | packs/reverse-engineering/rules/account-every-term.md | named term fields; the firmware's domain; the two-input VCA route | text in place | 3c7f57c | done |
| E7.2 | extend | packs/reverse-engineering/rules/account-every-term.md | named term fields; the firmware's domain; the two-input VCA route | text in place | 3c7f57c | done |
| E7.3 | extend | packs/reverse-engineering/rules/account-every-term.md | named term fields; the firmware's domain; the two-input VCA route | text in place | 3c7f57c | done |
| E8.1 | extend | packs/reverse-engineering/skills/names-first + tools/lib/names-runs.mts (--run) | width-prefixed tables count themselves | test/tools/reverse-engineering/names-modes.test.mts | 3c7f57c | done |
| E8.2 | extend | packs/reverse-engineering/skills/names-first/sweeps.md | keyword and units net; the word stream | text in place; names-modes.test.mts (24-bit) | 3c7f57c | done |
| E8.3 | extend | packs/reverse-engineering/skills/names-first/sweeps.md | keyword and units net; the word stream | text in place; names-modes.test.mts (24-bit) | 3c7f57c | done |
| E8.4 | extend | packs/reverse-engineering/skills/names-first + tools/lib/names-index.mts (--index) | name-to-index scored against shifted, strided and shuffled controls | test/tools/reverse-engineering/names-modes.test.mts | 3c7f57c | done |
| E8.5 | extend | packs/reverse-engineering/skills/names-first step 16 | a missing string read against the panel | text in place | 3c7f57c | done |
| E8.6 | extend | packs/reverse-engineering/skills/names-first/sweeps.md | suffix lists | text in place | 3c7f57c | done |
| E8.7 | extend | packs/reverse-engineering/skills/names-first step 16 | generated name fields | text in place | 3c7f57c | done |
| E8.8 | extend | packs/reverse-engineering/skills/names-first/sweeps.md | loader messages; character table; the effect's vocabulary | text in place | 3c7f57c | done |
| E8.9 | extend | packs/reverse-engineering/skills/names-first/sweeps.md | loader messages; character table; the effect's vocabulary | text in place | 3c7f57c | done |
| E8.10 | extend | packs/reverse-engineering/skills/names-first/sweeps.md | loader messages; character table; the effect's vocabulary | text in place | 3c7f57c | done |
| E8.11 | extend, decided (C10) | packs/reverse-engineering/skills/names-first Never | a panel table's columns read, not assumed | text in place | 3c7f57c | done |
| E9.1 | extend | packs/reverse-engineering/skills/gather-sources step 1 + tools/source-ledger.mts (--hash) | hash pass against held and sibling folders; part number first | test/tools/reverse-engineering/source-ledger.test.mts | 3c7f57c | done |
| E9.2 | extend | packs/reverse-engineering/skills/gather-sources/source-kinds.md | updater; factory sounds' homes; boot media | text in place | 3c7f57c | done |
| E9.3 | extend | packs/reverse-engineering/skills/gather-sources/source-kinds.md | updater; factory sounds' homes; boot media | text in place | 3c7f57c | done |
| E9.4 | extend | packs/reverse-engineering/skills/gather-sources/source-kinds.md | updater; factory sounds' homes; boot media | text in place | 3c7f57c | done |
| E9.5 | extend, reworded | packs/reverse-engineering/skills/gather-sources step 4 | in the service manual, read the parts list first | text in place | 3c7f57c | done |
| E9.6 | extend | packs/reverse-engineering/skills/gather-sources step 13 | the OS version of every manual and image | text in place | 3c7f57c | done |
| E9.7 | extend | packs/reverse-engineering/skills/gather-sources/source-kinds.md | editor templates; patents and designers; supplier spec; artwork; site list | text in place | 3c7f57c | done |
| E9.8 | extend | packs/reverse-engineering/skills/gather-sources/source-kinds.md | editor templates; patents and designers; supplier spec; artwork; site list | text in place | 3c7f57c | done |
| E9.9 | extend | packs/reverse-engineering/skills/gather-sources/source-kinds.md | editor templates; patents and designers; supplier spec; artwork; site list | text in place | 3c7f57c | done |
| E9.10 | extend | packs/reverse-engineering/skills/gather-sources/source-kinds.md | editor templates; patents and designers; supplier spec; artwork; site list | text in place | 3c7f57c | done |
| E9.11 | extend | packs/reverse-engineering/skills/gather-sources/source-kinds.md | editor templates; patents and designers; supplier spec; artwork; site list | text in place | 3c7f57c | done |
| E9.12 | extend | packs/reverse-engineering/skills/gather-sources step 14 | write back to the archive | text in place | 3c7f57c | done |
| E9.13 | extend, reworded | packs/reverse-engineering/skills/gather-sources step 9 | a graticule photo may give a time; a redrawn trace ratios only | text in place | 3c7f57c | done |
| E9.14 | extend, reworded | packs/reverse-engineering/skills/gather-sources step 11 | no dump: say so, stop looking, go on | text in place | 3c7f57c | done |
| E10.1 | extend | packs/reverse-engineering/skills/re-deliverables | histogram, repro commands, confidence column; day-one list; predictions | text in place | 3c7f57c | done |
| E10.2 | extend | packs/reverse-engineering/skills/re-deliverables | histogram, repro commands, confidence column; day-one list; predictions | text in place | 3c7f57c | done |
| E10.3 | extend | packs/reverse-engineering/skills/re-deliverables | histogram, repro commands, confidence column; day-one list; predictions | text in place | 3c7f57c | done |
| E11.1 | extend | packs/reverse-engineering/skills/bank-census | count per filter mode; rerun after an EAR constant | text in place | 3c7f57c | done |
| E11.2 | extend | packs/reverse-engineering/skills/bank-census | count per filter mode; rerun after an EAR constant | text in place | 3c7f57c | done |
| E11.3 | extend, decided (C17) | packs/reverse-engineering/skills/bank-census | a flat column: wrong decode or fixed structure | text in place | 3c7f57c | done |
| E11.4 | extend | packs/reverse-engineering/skills/bank-census | per-feature corpus counts as regression tests | text in place | 3c7f57c | done |
| E12.1 | extend | packs/reverse-engineering/skills/re-toolchain + family-traps.md, install-recipes.md | trap list per tool; seeded descent; install recipes; the interpreter in the library | text in place | 3c7f57c | done |
| E12.2 | extend | packs/reverse-engineering/skills/re-toolchain + family-traps.md, install-recipes.md | trap list per tool; seeded descent; install recipes; the interpreter in the library | text in place | 3c7f57c | done |
| E12.3 | extend | packs/reverse-engineering/skills/re-toolchain + family-traps.md, install-recipes.md | trap list per tool; seeded descent; install recipes; the interpreter in the library | text in place | 3c7f57c | done |
| E12.4 | extend | packs/reverse-engineering/skills/re-toolchain + family-traps.md, install-recipes.md | trap list per tool; seeded descent; install recipes; the interpreter in the library | text in place | 3c7f57c | done |
| E13.1 | extend, decided (C4) | packs/reverse-engineering/rules/house-tools-live-in-the-library.md | nothing ported; unidasm a black box | text in place | 3c7f57c | done |
| E13.2 | extend | packs/reverse-engineering/rules/house-tools-live-in-the-library.md | measure a tool the second time; refuse loudly | text in place | 3c7f57c | done |
| E14.1 | extend | packs/reverse-engineering/skills/read-a-circuit-diagram step 9 | parts list beats the diagram; revision diff; topology predicts; tolerance as intent; CV tap | text in place | 3c7f57c | done |
| E14.2 | extend | packs/reverse-engineering/skills/read-a-circuit-diagram step 9 | parts list beats the diagram; revision diff; topology predicts; tolerance as intent; CV tap | text in place | 3c7f57c | done |
| E14.3 | extend | packs/reverse-engineering/skills/read-a-circuit-diagram step 9 | parts list beats the diagram; revision diff; topology predicts; tolerance as intent; CV tap | text in place | 3c7f57c | done |
| E14.4 | extend | packs/reverse-engineering/skills/read-a-circuit-diagram step 9 | parts list beats the diagram; revision diff; topology predicts; tolerance as intent; CV tap | text in place | 3c7f57c | done |
| E14.5 | extend | packs/reverse-engineering/skills/read-a-circuit-diagram step 9 | parts list beats the diagram; revision diff; topology predicts; tolerance as intent; CV tap | text in place | 3c7f57c | done |
| E15 | extend | packs/reverse-engineering/skills/gather-sources/datasheet-sources.md | per-chip function and table kind; the family manual | text in place | 3c7f57c | done |
| E16 | extend | packs/reverse-engineering/skills/menu-map step 1 | the calibration menu before the tuning table | text in place | 3c7f57c | done |
| E17 | extend | packs/reverse-engineering/skills/tripwire-the-law step 6 | the fix order | text in place | 3c7f57c | done |
| E18 | extend | packs/reverse-engineering/tools/lib/unwrap.mts + unwrap-proofs.mts | new unwrap modes, existing modes untouched | test/tools/reverse-engineering/names-modes.test.mts (red with the SMF mode removed) | 3c7f57c | done |
| E19.1 | extend, reworded | packs/base/skills/analyse-reference-look (+ grade-the-reference.md) | grade the reference first; with no exact model and nobody there, a gap recorded and the best graded source used | text in place | 92ae1e4 | done |
| E19.2 | extend | packs/base/skills/analyse-reference-look (+ grade-the-reference.md) | close-ups; which object is the reference; rack aspect from the 19-inch table | text in place | 92ae1e4 | done |
| E19.3 | extend | packs/base/skills/analyse-reference-look (+ grade-the-reference.md) | close-ups; which object is the reference; rack aspect from the 19-inch table | text in place | 92ae1e4 | done |
| E19.4 | extend | packs/base/skills/analyse-reference-look (+ grade-the-reference.md) | close-ups; which object is the reference; rack aspect from the 19-inch table | text in place | 92ae1e4 | done |
| E19.5 | not added (decided) | packs/base/skills/analyse-reference-look unchanged | the C8 ranking | none | - | dropped (SORTED.md section 6: "E19.5: C8 says photo first ... NOT added there") |
| E19.6 | extend | packs/base/skills/analyse-reference-look (+ controls-in-artwork.md) | printed groupings as numbers; clock-face positions; controls in artwork | text in place | 92ae1e4 | done |
| E19.7 | extend | packs/base/skills/analyse-reference-look (+ controls-in-artwork.md) | printed groupings as numbers; clock-face positions; controls in artwork | text in place | 92ae1e4 | done |
| E19.8 | extend | packs/base/skills/analyse-reference-look (+ controls-in-artwork.md) | printed groupings as numbers; clock-face positions; controls in artwork | text in place | 92ae1e4 | done |
| E20.1 | extend | packs/base/rules/page-matches-reference-look.md | aspect gate; no overlap gate | text in place | 92ae1e4 | done |
| E20.2 | extend | packs/base/rules/page-matches-reference-look.md | aspect gate; no overlap gate | text in place | 92ae1e4 | done |
| E20.3 | extend, reworded | packs/base/rules/page-matches-reference-look.md | every section the reference titles has its title and a ground that draws | text in place | 92ae1e4 | done |
| E20.4 | extend | packs/base/rules/page-matches-reference-look.md | an offset render is a capture bug first; replica paths change only when remeasured | text in place | 92ae1e4 | done |
| E20.5 | extend | packs/base/rules/page-matches-reference-look.md | an offset render is a capture bug first; replica paths change only when remeasured | text in place | 92ae1e4 | done |
| E21.1 | extend, decided (C7) | packs/base/skills/pdf-to-md | the backup read at use, the user told | text in place | 92ae1e4 | done |
| E21.2 | extend | packs/base/skills/pdf-to-md (+ reading-a-pdf.md) | contact sheet; requeue thin pages; printed page offset; check the scan before calling a chart absent | text in place | 92ae1e4 | done |
| E21.3 | extend | packs/base/skills/pdf-to-md (+ reading-a-pdf.md) | contact sheet; requeue thin pages; printed page offset; check the scan before calling a chart absent | text in place | 92ae1e4 | done |
| E21.4 | extend | packs/base/skills/pdf-to-md (+ reading-a-pdf.md) | contact sheet; requeue thin pages; printed page offset; check the scan before calling a chart absent | text in place | 92ae1e4 | done |
| E21.5 | extend | packs/base/skills/pdf-to-md (+ reading-a-pdf.md) | contact sheet; requeue thin pages; printed page offset; check the scan before calling a chart absent | text in place | 92ae1e4 | done |
| E21.6 | extend, decided (C15) | packs/base/skills/pdf-to-md | slot helper, no polling | text in place | 92ae1e4 | done |
| E22.1 | extend | packs/base/rules/git-right-first-time.md | fetch before ahead or behind; commit unfinished work at once, plainly | text in place | 92ae1e4 | done |
| E22.2 | extend | packs/base/rules/git-right-first-time.md | fetch before ahead or behind; commit unfinished work at once, plainly | text in place | 92ae1e4 | done |
| E22.3 | dropped | - | write guarded text to a file and run the file | none | - | dropped (SORTED.md section 2: "Drop. A false refusal of text that only mentions a command is a hook bug") |
| E23.1 | extend | packs/base/rules/subagent-dispatch.md | model tiers; partition by file; baselines, estimates, queue | text in place | 92ae1e4 | done |
| E23.2 | extend | packs/base/rules/subagent-dispatch.md | model tiers; partition by file; baselines, estimates, queue | text in place | 92ae1e4 | done |
| E23.3 | extend | packs/base/rules/subagent-dispatch.md | model tiers; partition by file; baselines, estimates, queue | text in place | 92ae1e4 | done |
| E24.1 | extend | packs/base/skills/new-project | latest-versions first; never copy another project | text in place | 92ae1e4 | done |
| E24.2 | extend | packs/base/skills/new-project | latest-versions first; never copy another project | text in place | 92ae1e4 | done |
| E25 | extend + tool | packs/base/rules/references-use-anchors.md + tools/anchors-check.mts | duplicate anchor fails; cross-project resolves when present, a warning when absent | test/tools/base/anchors-check.test.mts (planted duplicate red) | 92ae1e4 | done |
| E26.1 | extend | packs/base/rules/plan-and-logs.md | date, time and zone; a count once; re-check a stale blocker | text in place | 92ae1e4 | done |
| E26.2 | extend | packs/base/rules/plan-and-logs.md | date, time and zone; a count once; re-check a stale blocker | text in place | 92ae1e4 | done |
| E26.3 | extend | packs/base/rules/plan-and-logs.md | date, time and zone; a count once; re-check a stale blocker | text in place | 92ae1e4 | done |
| E27 | extend | packs/base/skills/add-lesson-check | pointer to the existing "code": true | text in place | 92ae1e4 | done |
| E28 | extend | packs/base/rules/plan-and-logs.md (d-5: not unattended-runs) | one shared law fixed once with every unit's measurements | text in place | 92ae1e4 | done |
| E29 | extend | packs/base/skills/write-a-workorder | rank a multi-machine queue | text in place | 92ae1e4 | done |
| E30.1 | extend | packs/synth-creator/rules/done-means-fresh-evidence.md | the launched binary holds it; rebuild every unit linking a shared package; the honest sentence; a probe deletes its output first | text in place | 92ae1e4 | done |
| E30.2 | extend | packs/synth-creator/rules/done-means-fresh-evidence.md | the launched binary holds it; rebuild every unit linking a shared package; the honest sentence; a probe deletes its output first | text in place | 92ae1e4 | done |
| E30.3 | extend | packs/synth-creator/rules/done-means-fresh-evidence.md | the launched binary holds it; rebuild every unit linking a shared package; the honest sentence; a probe deletes its output first | text in place | 92ae1e4 | done |
| E30.4 | extend | packs/synth-creator/rules/done-means-fresh-evidence.md | the launched binary holds it; rebuild every unit linking a shared package; the honest sentence; a probe deletes its output first | text in place | 92ae1e4 | done |
| E31.1 | extend | packs/synth-creator/skills/build-through-the-queue | Not Run is unbuilt; no export job alive, a non-relinked build reconfigured | text in place | 92ae1e4 | done |
| E31.2 | extend | packs/synth-creator/skills/build-through-the-queue | Not Run is unbuilt; no export job alive, a non-relinked build reconfigured | text in place | 92ae1e4 | done |
| E32.1 | extend | packs/synth-creator/rules/debug-by-measurement.md | unmoved offender means the measure is wrong; name each failure shape; bisect the baseline | text in place | 92ae1e4 | done |
| E32.2 | extend | packs/synth-creator/rules/debug-by-measurement.md | unmoved offender means the measure is wrong; name each failure shape; bisect the baseline | text in place | 92ae1e4 | done |
| E32.3 | extend | packs/synth-creator/rules/debug-by-measurement.md | unmoved offender means the measure is wrong; name each failure shape; bisect the baseline | text in place | 92ae1e4 | done |
| E33 | extend | packs/synth-creator/rules/hooks-and-gates.md | guard every entry point; grep every caller of a shared trap | text in place | 92ae1e4 | done |
| E34 | extend | packs/synth-creator/skills/build-step | check a handoff's paths exist; say what of a shared surface is unbuilt | text in place | 92ae1e4 | done |
| E35 | extend | packs/synth-creator/rules/chart-first.md | blast radius from the chart; as-built against the design chart | text in place | 92ae1e4 | done |
| E36 | extend | packs/synth-creator/rules/long-work-in-the-background.md | a deadline on every browser or renderer shell-out | text in place | 92ae1e4 | done |
| E37.1 | extend | packs/sound-design/skills/measure-a-law | a second quantity; model-free beside a fit; ratio in one render; prediction first; broad peak; isolation set; neutrals from the map; the part alone; 440 and 442 | text in place | 81af574 | done |
| E37.2 | extend | packs/sound-design/skills/measure-a-law | a second quantity; model-free beside a fit; ratio in one render; prediction first; broad peak; isolation set; neutrals from the map; the part alone; 440 and 442 | text in place | 81af574 | done |
| E37.3 | extend | packs/sound-design/skills/measure-a-law | a second quantity; model-free beside a fit; ratio in one render; prediction first; broad peak; isolation set; neutrals from the map; the part alone; 440 and 442 | text in place | 81af574 | done |
| E37.4 | extend | packs/sound-design/skills/measure-a-law | a second quantity; model-free beside a fit; ratio in one render; prediction first; broad peak; isolation set; neutrals from the map; the part alone; 440 and 442 | text in place | 81af574 | done |
| E37.5 | extend | packs/sound-design/skills/measure-a-law | a second quantity; model-free beside a fit; ratio in one render; prediction first; broad peak; isolation set; neutrals from the map; the part alone; 440 and 442 | text in place | 81af574 | done |
| E37.6 | extend | packs/sound-design/skills/measure-a-law | a second quantity; model-free beside a fit; ratio in one render; prediction first; broad peak; isolation set; neutrals from the map; the part alone; 440 and 442 | text in place | 81af574 | done |
| E37.7 | extend | packs/sound-design/skills/measure-a-law | a second quantity; model-free beside a fit; ratio in one render; prediction first; broad peak; isolation set; neutrals from the map; the part alone; 440 and 442 | text in place | 81af574 | done |
| E37.8 | extend | packs/sound-design/skills/measure-a-law | a second quantity; model-free beside a fit; ratio in one render; prediction first; broad peak; isolation set; neutrals from the map; the part alone; 440 and 442 | text in place | 81af574 | done |
| E37.9 | extend | packs/sound-design/skills/measure-a-law | a second quantity; model-free beside a fit; ratio in one render; prediction first; broad peak; isolation set; neutrals from the map; the part alone; 440 and 442 | text in place | 81af574 | done |
| E38.1 | extend | packs/sound-design/skills/bounce-a-plugin | prove which binary loaded | text in place | 81af574 | done |
| E38.2 | extend, part | packs/sound-design/skills/bounce-a-plugin | prove the source before the sink (no microphone) | text in place | 81af574 | done |
| E38.3 | extend | packs/sound-design/skills/bounce-a-plugin | a state load took; reset probed offsets; headless enumeration; one value per note | text in place | 81af574 | done |
| E38.4 | extend | packs/sound-design/skills/bounce-a-plugin | a state load took; reset probed offsets; headless enumeration; one value per note | text in place | 81af574 | done |
| E38.5 | extend | packs/sound-design/skills/bounce-a-plugin | a state load took; reset probed offsets; headless enumeration; one value per note | text in place | 81af574 | done |
| E38.6 | extend | packs/sound-design/skills/bounce-a-plugin | a state load took; reset probed offsets; headless enumeration; one value per note | text in place | 81af574 | done |
| E38.7 | extend, reworded | packs/sound-design/skills/bounce-a-plugin | an interactive host once when the offline renderer cannot load a plugin | text in place | 81af574 | done |
| E39.1 | extend | packs/sound-design/skills/compare-to-the-machine | one-knob capture; mismatched pair; demo validates; within-note ratio; recording checklist; gates by shape | text in place | 81af574 | done |
| E39.2 | extend | packs/sound-design/skills/compare-to-the-machine | one-knob capture; mismatched pair; demo validates; within-note ratio; recording checklist; gates by shape | text in place | 81af574 | done |
| E39.3 | extend | packs/sound-design/skills/compare-to-the-machine | one-knob capture; mismatched pair; demo validates; within-note ratio; recording checklist; gates by shape | text in place | 81af574 | done |
| E39.4 | extend | packs/sound-design/skills/compare-to-the-machine | one-knob capture; mismatched pair; demo validates; within-note ratio; recording checklist; gates by shape | text in place | 81af574 | done |
| E39.5 | extend | packs/sound-design/skills/compare-to-the-machine | one-knob capture; mismatched pair; demo validates; within-note ratio; recording checklist; gates by shape | text in place | 81af574 | done |
| E39.6 | extend | packs/sound-design/skills/compare-to-the-machine | one-knob capture; mismatched pair; demo validates; within-note ratio; recording checklist; gates by shape | text in place | 81af574 | done |
| E40.1 | extend | packs/sound-design/skills/measure-reverb | echo density and comb peak; unusable fit; listen-list; topology first; window where it lives | text in place | 81af574 | done |
| E40.2 | extend | packs/sound-design/skills/measure-reverb | echo density and comb peak; unusable fit; listen-list; topology first; window where it lives | text in place | 81af574 | done |
| E40.3 | extend | packs/sound-design/skills/measure-reverb | echo density and comb peak; unusable fit; listen-list; topology first; window where it lives | text in place | 81af574 | done |
| E40.4 | extend | packs/sound-design/skills/measure-reverb | echo density and comb peak; unusable fit; listen-list; topology first; window where it lives | text in place | 81af574 | done |
| E40.5 | extend | packs/sound-design/skills/measure-reverb | echo density and comb peak; unusable fit; listen-list; topology first; window where it lives | text in place | 81af574 | done |
| E41.1 | extend | packs/sound-design/skills/spread-probe | render twice, sections, C2 C4 C6, collapse self-test; instrument excitations, inert terms | text in place | 81af574 | done |
| E41.2 | extend | packs/sound-design/skills/spread-probe | render twice, sections, C2 C4 C6, collapse self-test; instrument excitations, inert terms | text in place | 81af574 | done |
| E42.1 | extend | packs/sound-design/skills/choose-observable | two axes by two measurements; another quantity; local gradient; after a transition; a ratio | text in place | 81af574 | done |
| E42.2 | extend | packs/sound-design/skills/choose-observable | two axes by two measurements; another quantity; local gradient; after a transition; a ratio | text in place | 81af574 | done |
| E42.3 | extend | packs/sound-design/skills/choose-observable | two axes by two measurements; another quantity; local gradient; after a transition; a ratio | text in place | 81af574 | done |
| E42.4 | extend | packs/sound-design/skills/choose-observable | two axes by two measurements; another quantity; local gradient; after a transition; a ratio | text in place | 81af574 | done |
| E42.5 | extend | packs/sound-design/skills/choose-observable | two axes by two measurements; another quantity; local gradient; after a transition; a ratio | text in place | 81af574 | done |
| E43 | extend | packs/sound-design/rules/test-off-the-easy-point.md | every velocity layer; the block's invariant; sums by power | text in place | 81af574 | done |
| E44.1 | extend | packs/sound-design/rules/meter-before-engine.md | autocorrelation period fixes; re-fit after a meter fault | text in place | 81af574 | done |
| E44.2 | extend | packs/sound-design/rules/meter-before-engine.md | autocorrelation period fixes; re-fit after a meter fault | text in place | 81af574 | done |
| E45 | extend | packs/sound-design/rules/neutral-is-exact.md | a stated default may be the displayed value; one source's switch leaves the others' level | text in place | 81af574 | done |
| E46.1 | extend | packs/sound-design/rules/algorithms-are-data.md | kinds table; level fall between repeats; an edit-matrix row is a flow claim | text in place | 81af574 | done |
| E46.2 | extend | packs/sound-design/rules/algorithms-are-data.md | kinds table; level fall between repeats; an edit-matrix row is a flow claim | text in place | 81af574 | done |
| E46.3 | extend | packs/sound-design/rules/algorithms-are-data.md | kinds table; level fall between repeats; an edit-matrix row is a flow claim | text in place | 81af574 | done |
| E46.4 | extend | packs/sound-design/rules/algorithms-are-data.md | a delay replica needs lengths, topology and coefficients; lengths alone are a third | text in place | 81af574 | done |
| E47.1 | extend, reworded | packs/sound-design/rules/waveforms-and-octaves.md | a layer takes the original's filter and envelope arrangement | text in place | 81af574 | done |
| E47.2 | extend | packs/sound-design/rules/waveforms-and-octaves.md | a wave entry records its generation and behaviour above Nyquist | text in place | 81af574 | done |
| E47.3 | extend | packs/sound-design/rules/waveforms-and-octaves.md | a wave entry records its generation and behaviour above Nyquist | text in place | 81af574 | done |
| E48 | extend | packs/sound-design/rules/presets-are-named-and-neutral.md | categories from the machine's bank, Other last and small | text in place | 81af574 | done |
| E49.1 | extend | packs/sound-design/skills/design-a-preset/references/effects-and-banks.md | effects recipes; bank tiers and engine checklists | text in place | 81af574 | done |
| E49.2 | extend | packs/sound-design/skills/design-a-preset/references/effects-and-banks.md | effects recipes; bank tiers and engine checklists | text in place | 81af574 | done |
| E50.1 | extend | packs/midi/skills/does-it-sync | which clock; the note-value test; false positives; two facts; strings sweep; what it sends; one switch; per revision | text in place | 92ae1e4 | done |
| E50.2 | extend | packs/midi/skills/does-it-sync | which clock; the note-value test; false positives; two facts; strings sweep; what it sends; one switch; per revision | text in place | 92ae1e4 | done |
| E50.3 | extend | packs/midi/skills/does-it-sync | which clock; the note-value test; false positives; two facts; strings sweep; what it sends; one switch; per revision | text in place | 92ae1e4 | done |
| E50.4 | extend | packs/midi/skills/does-it-sync | which clock; the note-value test; false positives; two facts; strings sweep; what it sends; one switch; per revision | text in place | 92ae1e4 | done |
| E50.5 | extend | packs/midi/skills/does-it-sync | which clock; the note-value test; false positives; two facts; strings sweep; what it sends; one switch; per revision | text in place | 92ae1e4 | done |
| E50.6 | extend | packs/midi/skills/does-it-sync | which clock; the note-value test; false positives; two facts; strings sweep; what it sends; one switch; per revision | text in place | 92ae1e4 | done |
| E50.7 | extend | packs/midi/skills/does-it-sync | which clock; the note-value test; false positives; two facts; strings sweep; what it sends; one switch; per revision | text in place | 92ae1e4 | done |
| E50.8 | extend | packs/midi/skills/does-it-sync | which clock; the note-value test; false positives; two facts; strings sweep; what it sends; one switch; per revision | text in place | 92ae1e4 | done |
| E51.1a | extend | packs/midi/skills/clock-probe/clock-law.md section 0 | two clocks, stopped host, one switch, naming rows | text in place | 92ae1e4 | done |
| E51.1b | extend, reworded | packs/midi/skills/clock-probe/clock-law.md | clock OUT recorded as its own setting beside the three receiving states | text in place | 92ae1e4 | done |
| E51.2a | dropped | - | re-anchor to a DAW only on a jump | none | - | dropped (SORTED.md section 2: "Drop the re-anchor clause") |
| E51.2b | extend | packs/midi/skills/clock-probe/clock-law.md | median-filter pulse gaps; release the lock on silence | text in place | 92ae1e4 | done |
| E51.2c | obsolete | - | one clock stream out of the shell | none | - | obsolete (DECIDED.md: shell-only items OBSOLETE) |
| E51.3 | extend, reworded | packs/midi/skills/clock-probe/clock-law.md | a machine's stored tempo knob is its internal tempo field | text in place | 92ae1e4 | done |
| E51.4 | extend | packs/midi/skills/clock-probe/clock-law.md | phase() reports the block start; sync may restart phase; query a dynamic destination live | text in place | 92ae1e4 | done |
| E52.1 | extend, decided (C6) | packs/midi/rules/sync-is-a-mode.md | the default at open, as decided | test/tools/midi/open-default-probe.test.mts | 92ae1e4 | done |
| E52.2 | extend, reworded | packs/midi/rules/sync-is-a-mode.md | clock OUT beside the three receiving states | text in place | 92ae1e4 | done |
| E53.1 | extend, decided (C6) | packs/midi/skills/clock-probe + tools/open-default-probe.mts | the default at open, untouched, at 120 and 90 BPM, standalone and plugin | test/tools/midi/open-default-probe.test.mts (plugin delay opening free and LFO opening synced both refused; red without the fix) | 92ae1e4 | done |
| E53.2 | extend | packs/midi/skills/clock-probe | transport playing; LFO-rate gate at three tempos; jump, loop and meter probe | text in place | 92ae1e4 | done |
| E53.3 | extend | packs/midi/skills/clock-probe | transport playing; LFO-rate gate at three tempos; jump, loop and meter probe | text in place | 92ae1e4 | done |
| E53.4 | extend | packs/midi/skills/clock-probe | transport playing; LFO-rate gate at three tempos; jump, loop and meter probe | text in place | 92ae1e4 | done |
| E54.1 | extend | packs/midi/rules/measure-the-clock-in-audio.md | taps at absolute times; round offsets; a flam does not move | text in place | 92ae1e4 | done |
| E54.2 | extend | packs/midi/rules/measure-the-clock-in-audio.md | taps at absolute times; round offsets; a flam does not move | text in place | 92ae1e4 | done |
| E55.1 | extend | packs/midi/rules/sysex-is-a-record.md | a field kept as stored; round-trip our own export | text in place | 92ae1e4 | done |
| E55.2 | extend | packs/midi/rules/sysex-is-a-record.md | a field kept as stored; round-trip our own export | text in place | 92ae1e4 | done |
| E56 | extend | packs/midi/rules/imports-count-every-loss.md | one report row shape; a name match is not a numbering match | text in place | 92ae1e4 | done |
| E57 | extend, decided | packs/audio-core/rules/parameter-ids-never-change.md; hooks/param-id-lock.mts (starts at the first release) | what a host stored stays valid; the order line dropped; param-id-lock judges ids from the release | test/hooks/audio-core/param-id-lock.test.mts (its own cases, and an id renamed before any release passes) | 81af574 | done |
| E58.1 | extend | packs/audio-core/rules/control-reaches-every-surface.md | wheels and matrix-only controls gated; save moves bytes; every parameter has a reader; drawn controls audible; defaults equal initialisers | text in place | 81af574 | done |
| E58.2 | extend | packs/audio-core/rules/control-reaches-every-surface.md | wheels and matrix-only controls gated; save moves bytes; every parameter has a reader; drawn controls audible; defaults equal initialisers | text in place | 81af574 | done |
| E58.3 | extend | packs/audio-core/rules/control-reaches-every-surface.md | wheels and matrix-only controls gated; save moves bytes; every parameter has a reader; drawn controls audible; defaults equal initialisers | text in place | 81af574 | done |
| E58.4 | extend | packs/audio-core/rules/control-reaches-every-surface.md | wheels and matrix-only controls gated; save moves bytes; every parameter has a reader; drawn controls audible; defaults equal initialisers | text in place | 81af574 | done |
| E58.5 | extend | packs/audio-core/rules/control-reaches-every-surface.md | wheels and matrix-only controls gated; save moves bytes; every parameter has a reader; drawn controls audible; defaults equal initialisers | text in place | 81af574 | done |
| E59 | extend | packs/audio-core/rules/patch-excludes-performance-controls.md | selectors and focus are session state; routes are patch data | text in place | 81af574 | done |
| E60.1 | extend | packs/audio-core/rules/smooth-continuous-parameters.md | delay time slews per sample; meter reconfiguration clicks | text in place | 81af574 | done |
| E60.2 | extend | packs/audio-core/rules/smooth-continuous-parameters.md | delay time slews per sample; meter reconfiguration clicks | text in place | 81af574 | done |
| E61.1 | extend, decided (C9) | packs/audio-core/rules/every-time-control-syncs.md | rhythm syncs, timbre never, FREE first, a rebuild offers what its hardware could follow; the plugin's master clock | text in place | 81af574 | done |
| E61.2 | extend | packs/audio-core/rules/every-time-control-syncs.md | tempo extras: a fresh chord at once, swing never on a delay or LFO, bypass keeps the clock | text in place | 81af574 | done |
| E62.1 | extend | packs/audio-core/rules/house-control-behaviours.md | the keyboards play the unit's note map | text in place | 81af574 | done |
| E62.2a | extend | packs/audio-core/rules/house-control-behaviours.md | the pitch wheel springs, the mod wheel stays | text in place | 81af574 | done |
| E62.2b | obsolete | - | transpose as a parameter, voice allocation in the keyboard band (shell) | none | - | obsolete (DECIDED.md: shell-only items) |
| E62.3 | extend | packs/audio-core/rules/house-control-behaviours.md | each action's feedback; one lit cell; a click outside a menu only closes it | text in place | 81af574 | done |
| E63.1 | extend | packs/audio-core/skills/new-panel-control | mode or value key; a source tag; lamps; switch kinds and readouts | text in place | 81af574 | done |
| E63.2 | extend | packs/audio-core/skills/new-panel-control | mode or value key; a source tag; lamps; switch kinds and readouts | text in place | 81af574 | done |
| E63.3 | extend | packs/audio-core/skills/new-panel-control | mode or value key; a source tag; lamps; switch kinds and readouts | text in place | 81af574 | done |
| E63.4 | extend | packs/audio-core/skills/new-panel-control | mode or value key; a source tag; lamps; switch kinds and readouts | text in place | 81af574 | done |
| E64 | extend | packs/audio-core/skills/trace-parameter | diff against the reference first; defaults from the running plugin; a wrong binding's neighbours | text in place | 81af574 | done |
| E65.1 | extend | packs/audio-core/skills/copy-and-prove | real velocity and level; a compensation with a failing-on-fix test; moving into a shared component | text in place | 81af574 | done |
| E65.2 | extend | packs/audio-core/skills/copy-and-prove | real velocity and level; a compensation with a failing-on-fix test; moving into a shared component | text in place | 81af574 | done |
| E65.3 | extend | packs/audio-core/skills/copy-and-prove | real velocity and level; a compensation with a failing-on-fix test; moving into a shared component | text in place | 81af574 | done |
| E66.1 | extend | packs/audio-core/rules/module-kill-switch.md | bypass passes input through | text in place | 81af574 | done |
| E66.2 | extend | packs/audio-core/rules/module-kill-switch.md | a pinned parameter's stored value read and overridden, never overwritten | text in place | 81af574 | done |
| E66.3 | extend | packs/audio-core/rules/module-kill-switch.md | the voice counter shows the multiplied figure | text in place | 81af574 | done |
| E67 | extend | packs/audio-core/rules/settings-layer-owns-the-devices.md | 128-sample buffer on first run; no input bus; latency by onset probe | text in place | 81af574 | done |
| E68.1 | extend | packs/audio-core/rules/panel-sizes-by-kind.md | wrap a long legend, never shrink it; LED list pitch | text in place | 81af574 | done |
| E68.2 | dropped | - | a control below its width floor drops chrome | none | - | dropped (SORTED.md section 2: "Drop.") |
| E69 | extend | 13 audio-core rules (filters-stable-under-modulation, recursive-state-nan-guard, double-where-precision-matters (text only; float-phase-or-rate untouched), cpu-worst-case-per-block, reverb-loop-gain-bounded, nonlinear-stages-antialiased, knob-anatomy, colour-by-role, editor-paints-what-changed, audio-ui-thread-handoff, ...) | the 13 one-liners | text in place | 81af574 | done |
| E70.1 | | | | | | |
| E70.2 | | | | | | |
| E70.3 | | | | | | |
| E70.4 | | | | | | |
| E71 | | | | | | |
| E72.1 | | | | | | |
| E72.2 | | | | | | |
| E73 | | | | | | |
| E74.1 | | | | | | |
| E74.2 | | | | | | |
| E75 | | | | | | |
| E76 | | | | | | |
| E77 | | | | | | |
| E78.1 | | | | | | |
| E78.2 | | | | | | |
| E78.3 | | | | | | |
| E78.4 | | | | | | |
| E78.5 | | | | | | |
| E79 | | | | | | |
| E80 | extend | packs/base/skills/land-branch | list trunk paths the branch also touched before landing | text in place | 92ae1e4 | done |
| T1 | extend, reworded | prompts/workorder/templates/rebuild.md W1 | grade the evidence and record the path; create nothing only with no names and no presets | build/evidence/W7/templates.log; test/integration/workorder.test.mts | 92ae1e4 | done |
| T2 | extend | prompts/workorder/templates/rebuild.md W8 | every unit answers sync and clock in laws.md | build/evidence/W7/templates.log | 92ae1e4 | done |
| T3 | extend, reworded | prompts/workorder/templates/rebuild.md W13 Done when | the panel table counts what the factory test mode counts, where it has one | build/evidence/W7/templates.log | 92ae1e4 | done |
| T4 | extend | prompts/workorder/templates/rebuild.md W15 | the hardware's own program numbers | build/evidence/W7/templates.log | 92ae1e4 | done |
| T5 | extend | prompts/workorder/templates/generic.md W5 | list each deliverable and where it is | build/evidence/W7/templates.log | 92ae1e4 | done |
| T6 | extend, decided (C12) | prompts/workorder/templates/rebuild.md W8 | the machine's arp remade exactly | build/evidence/W7/templates.log | 92ae1e4 | done |
| T7 | extend | prompts/workorder/templates/rebuild.md, No firmware block | the no-firmware branch | build/evidence/W7/templates.log | 92ae1e4 | done |
| T8 | extend | prompts/workorder/templates/rebuild.md W10 | the capture plan, inside its conditional step | build/evidence/W7/templates.log | 92ae1e4 | done |
| T9 | extend, reworded | prompts/workorder/templates/rebuild.md W5 | an external simulator a black-box further check, never our interpreter's stand-in | build/evidence/W7/templates.log | 92ae1e4 | done |
| T10 | extend | prompts/workorder/templates/rebuild.md, Shared OS block | shared OS across a family proved once | build/evidence/W7/templates.log | 92ae1e4 | done |
| T11 | dropped | - | the engine step includes its panel layer | none | - | dropped (SORTED.md section 2: "Drop for 2.0. It changes the template's order") |
| D1 | | | | | | |
| D2 | | | | | | |
| D3 | | | | | | |
| O20 | | | | | | |
| O30 | | | | | | |
| L1 | new | packs/base/hooks/skill-log.mts; lib/logs-usage.mts (logs skills) | one line per skill used, and logs per skill with the never-used list | test/integration/usage-logs.test.mts; test/hooks/base/usage-log-hooks.test.mts (build/evidence/W2/unit-proofs.log) | 92ae1e4 | done |
| L2 | new | packs/base/hooks/rule-log.mts (InstructionsLoaded); lib/logs-usage.mts (logs rules) | one line per rule loaded, and logs per rule with the never-used list | test/integration/usage-logs.test.mts (build/evidence/W2/unit-proofs.log) | 92ae1e4 | done |
| S1 | | | | | | |

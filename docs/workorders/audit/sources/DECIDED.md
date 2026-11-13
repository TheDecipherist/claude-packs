# Decided with the user, item by item (2026-11-13)

## C1 shadows and glows: panel-surface-and-sections vs depth-is-designed
- Decision: the "never glows, shadows deeper than 2 units, textures" line goes. Depth and glow come from the design: a custom UI that has glows and shadows gets them; a rebuild takes them from the reference's measure (depth-is-designed governs everywhere, a glow only for lit or active).
- Why: the line dates from early work on badly lit photos, where the photo's lighting was mistaken for the object's depth. That lesson lives where it belongs: analyse-reference-look separates the photograph's lighting from the object.
- Also: split panel-surface-and-sections into its five one-thing rules (surfaces, column names, section header and lamp, tabs, instance grid).

## C2 the modulation page: panel-gestures vs the playbook's ROUTING tab
- Decision: every synth gets BOTH, and the kit encourages it: drag and drop from a source onto a knob (great UX), and a modulation page that gives the overview of every route (the easiest way to see them all), as bandwarp has it, in settings. The "never add a modulation matrix page" line goes.
- Why: the user (2026-11-13): "A modulation page is the easiest way to get a proper overview. And drag and drop is great UX."
- Also: split panel-gestures into its four one-thing rules (knob gestures, host parameter names, the display echo, modulation by drag and drop) plus the new one (a modulation overview page).

## C3 A/B baseline worktree beside the project vs work-inside-the-project
- Decision: the kit wins. The baseline worktree lives under `.claude/worktrees/`; the method "rebuild both sides of an A/B at the same moment" is added; the beside-the-project form is obsolete.

## C4 porting MAME's disassembler vs house-tools-live-in-the-library
- Decision: the kit wins; nothing is ported. MAME's unidasm runs only as a black-box reference program, and a house disassembler written from the CPU manual is proved opcode for opcode against its output on the same bytes (its own one-thing unit: proving a disassembler). The port is obsolete.

## C5 sprites vs ui-drawn-in-code
- Decision: the kit wins. The UI is drawn in code; no image, sprite or embedded asset. Every sprite-pipeline item is obsolete.

## C6 sync at open: sync-is-a-mode vs the global tempo-sync
- Decision (the user's words, made into the defaults):
  - Standalone: whatever the real hardware did by default, until the user turns sync on.
  - As a plugin in a DAW: the master clock always follows the host. Delays are synced by default. LFOs and envelopes start independent (free) and can be synced. In the end it depends on the synth, the sound and what the time drives, so each time destination declares its default by what it is (delay, LFO, envelope), not one blanket default.
  - A patch that stores its sync state loads as stored; the defaults are for a new or INIT patch (so a stored 247 ms never becomes 500 ms).
- The user: "As a stand alone we follow whatever was in the real hardware by default unless the user clicks sync. In a DAW plugins are almost always in sync by default ... The master sync in a plugin in a daw is always in sync, but lfos and env can be independents. delays are almost always in sync".
- Probe: clock-probe checks the default at open, untouched, at two tempos (120 vs 90), in both standalone and plugin.

## C9 does every time control sync: every-time-control-syncs vs rhythm-or-timbre
- Decision: every RHYTHM time has sync (defaults per C6); TIMBRE times (chorus or doubler pre-delay, diffuser, comb, short slapback) never follow tempo; a control used both ways lists FREE first; a rebuild offers sync where its hardware did (see C9a).

## C9a a rebuild's rhythm times, as a plugin
- My premise was wrong: almost all hardware, vintage included, could sync to MIDI clock. Hardware ships with sync OFF and the user turns it on when using MIDI; software synths run in sync because they play with other instruments.
- Decision: a rebuild offers sync on its rhythm times (the hardware could follow a clock). Standalone opens as the hardware did (sync off); as a plugin it opens in sync per C6 (the host clock, delays synced; LFOs and envelopes free unless the machine says otherwise). Timbre times never follow tempo (C9).
- The user: "99% of hardware including vintage hardware could always sync to a midi or cc clock. On hardware synths sync is usually off by default ... Software synths almost 100% all the time are in perfect sync".

## C7 tables in PDFs: pdf-to-md's docling vs pdftotext -layout
- Decision: docling stays the converter. No second read by default. When a converted Markdown is found broken at the time it is used (shifted cells, a fused two-column list, values that do not line up), the backup read is made (pdftotext -layout or the rendered page, two-column pages split at the gutter) and the user is told: which file, what was broken, and what the backup read gave.
- The user: "Docling + backup if we find mds are broken on access time and we tell the user".

## C8 which panel picture wins
- Decision: photo first. analyse-reference-look stands: a flat frontal photo of the real unit outranks a drawing for where controls sit. The rebuild template's "geometry from the drawing" line is changed to agree with it, so the kit says one thing.

## C10 offsets in a panel table (names-first)
- Decision: reword. The "never look for storage offsets in a panel or menu table" goes; instead: a panel table usually holds names, ids and range pointers; read what each column is before assuming it holds offsets or that it does not (the DX7's held max and offset for every stored byte).

## C11 does an arithmetic fit prove a layout
- Decision: yes. An exact closure the layout was NOT tuned to (base + count x stride lands on the next table, field widths sum to the stride, a pointer chain closes, sections tile the image) counts as an independent proof. A count the guess was tuned to stays one source. New rule `layout-closes-on-itself`; one sentence in two-sources-before-naming.

## C12 whose arpeggiator
- Decision: a machine's arp is always remade exactly as it is, unless the user says otherwise. The user may ask to use a global arp module of their own, or to add a second arp in the newer interface's "edit layer".
- AND, binding on the whole list: the synth shell is not used for anything any more. Every item whose method exists only because of the shell (its tabs, its arp, its chain, its worktree, its sibling layout) is obsolete; a method that holds without the shell is judged on its own.
- The user: "We are not using the shell for anything anymore period. A machines ARP should always be remade exactly as is. Unless the user says otherwise. A user could say to use a global arp module they have made. or add an additional arp in the newer interface "edit layer"".

## C13 base scoring
- Decision: the new `find-the-base` skill scores a candidate base by jump targets landing on instruction starts ONLY on a straight-through (linear) read, and says why: under recursive descent the score is self-fulfilling (random scored 98.8 %).

## C14 host parameter names
- Decision: a rebuild names its parameters as the machine's own display does (its edit-page strings); our own designs use `Column . Section . Name`. This lives in the host-names rule split out of panel-gestures (C2).

## C15 polling in pdf-to-md
- Decision: pdf-to-md gets a slot helper that blocks on a lock or the build queue until a slot is free; no polling loop.

## C16 the workflow-bugs skill the kit names but does not ship
- Decision: ship it in the kit (base pack), before the 2.0 publish.

## C17 a flat column in a bank census
- Decision: add to bank-census: a column with one value in every patch is either a wrong decode or fixed structure; decide by the code that reads it.

## Units (section 3 of DECISIONS.md), as decided

| unit | decision | note |
|---|---|---|
| U1 triage-the-dump | ADD 2.0 | |
| U2 identify-the-cpu | ADD 2.0 | re-toolchain starts from its answer |
| U3 decode-from-a-proven-boundary | ADD 2.0 | |
| U4 find-the-base | ADD 2.0 | with C13 |
| U5 trace-the-builders | ADD 2.0 | |
| U6 attribute-the-record | ADD 2.0 | |
| U7 read-the-dsp-program | ADD 2.0 | |
| U8 find-the-timer | ADD 2.0 | |
| U9 absolute-scale-from-firmware | ADD 2.0 | |
| U10 layout-closes-on-itself | ADD 2.0 | per C11 |
| U11 profile-the-bank | ADD 2.0 | |
| U12 find-a-table | ADD 2.0 | moved from 2.1 by the user |

Release (the user): everything approved goes into 2.0 before the publish; no 2.1 batch.

| U13 a-field-may-be-an-index | ADD 2.0 | |
| U14 place-a-bit-field | ADD 2.0 | |
| U15 diff-the-revisions | ADD 2.0 | tool on the library shelf |
| U16 read-the-formatter | ADD 2.0 | |
| N1 find-the-reset | ADD 2.0 (the user's own item) | RE skill: locate and map exactly what the machine's reset sets before a patch loads |
| U38 reset-before-apply | ADD 2.0, changed | the engine resets exactly as find-the-reset's map says, before every patch and at startup; rule + check |
| N2 find-the-init-patch | ADD 2.0 (the user's own item) | RE skill: the INIT patch in the firmware and the button combination that loads it (manual, then the key-handling code) |
| N3 file-into-the-catalog | ADD 2.0 (the user's own item) | skill: every RE'd oscillator, filter, envelope, LFO, effect becomes a synthcatalog entry per its category's SCHEMA.md (.md evidence + runnable .h), then gen_all and drift_check |
| N4 catalog-entry-exists | ADD 2.0 (the user's own item) | check: a step naming an RE'd module cannot land without its catalog entry; used when TheDecipherist/synthcatalog (or the user's own) exists, like the reference library |
| U18 map-the-io | ADD 2.0 | |
| U19 find-a-sequence | ADD 2.0 | |
| U20 sample-roms | ADD 2.0 | |
| U17 manual-is-fully-covered (renamed from manual-pass) | ADD 2.0 | a CLOSING completeness check; the manual is read FIRST by names-first (already in the kit, unchanged) |
| U21 byte-reach | ADD 2.0 | |
| U22 a-gate-measures-the-real-thing | ADD 2.0 | |
| U23 debt-gates-fail-on-rise | ADD 2.0 | |
| U24 no-elided-code | ADD 2.0 | |
| U52-U56 panel-surface split | ADD 2.0 | decided in C1 |

## Correction: E57 "host automation is stored by index" is wrong for our plugins
- The user doubted it; JUCE's VST3 wrapper (juce_audio_plugin_client_VST3.cpp, generateVSTParamIDForParam, line ~696) makes each VST3 ParamID a hash of the parameter's string id; index ids only with JUCE_FORCE_USE_LEGACY_PARAM_IDS, which no project sets (VST3 + Standalone, JUCE_VST3_CAN_REPLACE_VST2=0). Index storage is a VST2 / legacy-id fact. synth-design.md's "95, 178, 970" counted parameters whose position moved, not broken automation measured in a host.
- So: E57's "lock the ORDER" is dropped. Kept, to be shown to the user as a change to param-id-lock: a change of a parameter's range, scaling, step count or a choice list's members (other than appending) breaks stored automation and patches, because the host stores a normalised 0..1 value.

## E57 replaced: what can break a patch or a song is locked at release
- Decision (the user: "whatever could break a patch is locked from time of release then. thats really where it matters"): a new unit, the release lock. The release step snapshots everything a saved patch or a DAW song depends on: each parameter's ID, range, scaling (skew), step count, a choice list's members in order, the patch format, and the factory bank's program numbers. After the first release only additions pass; a real change of meaning gets a new ID and old patches are migrated on load (the existing parameter-ids-never-change rule).
- Before the first release everything may change freely: param-id-lock changes to start at the first release, not at the first sighting (a change to how the kit works, decided by the user).
- One thing each: param-id-lock judges IDs against the release lock; the new unit writes the release lock and judges the rest (ranges, scaling, steps, choices, patch format, program numbers). U39 bank-order-is-append-only folds into it as the program-number row, applying from release.

## From SORTED.md (the 38 the user sees), as decided
- U57 pan-and-mix-equal-power, U58 panel-colour-safe, U59 signal-reads-left-to-right: ADD, for our ORIGINAL designs only; a reproduction keeps the machine's pan, LEDs and layout (reproduction-or-original stands).
- U51 keys-belong-to-the-keyboard: ADD reworded: "...nothing else takes it, outside a text field the user opened".
- Shell-only items (U69, E6.2, E51.2c, E51.3, E62.2b, E70.1, E70.2, E70.4, E72.1): OBSOLETE; kept, reworded: extra faceplate controls go to our edit layer, labelled ours (E6.2); a machine's stored tempo knob is its internal tempo field (E51.3).
- Shell text in the kit, cleaned in this pass: every-time-control-syncs and clock-law.md say "the plugin's master clock"; seams-are-declared is retired, its append-only division-index line kept in clock-law.md.
- Every other item in SORTED.md (sections 2 to 6): the user (2026-11-13): "I think you can use recommended choices for the rest". Each takes SORTED.md's recommendation exactly as written there: "take", "take reworded" (in the reworded form) or "drop". In short:
  - Enforcement: U28 take (planted-fault and expected-failure phrasing must pass in its selftest); U30 take, only where U29's generator exists and is byte-deterministic (run-twice test); U31 drop; U73 take (forks and self-defined models exempt, Opus reasons configurable); E1.6 drop; E25 take the duplicate-anchor half, cross-project only for projects present, a warning otherwise.
  - Extension changes: E6.1, E9.5, E9.13, E9.14, E19.1, E20.3, E38.7, E47.1, E51.1b+E52.2, T1, T3, T9 reworded as SORTED.md words them; E66.2, T4, T5 take; E22.3, E51.2a (re-anchor clause; E51.2b kept), E68.2, T11 drop; E38.2 keeps only "prove the source before the sink".
  - Splits: U36 (loader strictness to imports-count-every-loss; held-middle-C to spread-probe), U41 (per-voice-or-bank question to full-matrix-first; mode-tap repeat dropped), U70 (fresh-process editor gate to its own test rule). U62 patch-inspector opens on a button or a modifier chord, never a bare key (U51).
  - D1 keep the description for 2.0, no skeleton generator; D2 out (shell); D3 the kit keeps its baked tables and U45/U46's method, the Atlas patch skills stay the user's.
  - O20 re-marked "covered by N3/N4"; O30 obsolete for the kit only if Admiral's installer adds its hook (the kit's admiral pack ships none): left out of the kit, noted for the admiral pack.
  - Section 7 ADDITIVE: all taken, with section 6's wording notes.

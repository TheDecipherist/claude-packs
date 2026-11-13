# Kit 2.0: what goes in, from the ten-slice audit

Merged from the ten reports in this folder (re-1, re-2, re-3, re-4, synth-design, eproms-method, eproms-readme, eproms-chips-tools, arcturus, global-skills with its nine parts), checked against claude-packs `work/2.0.0-typescript` (`packs/*/rules|skills|hooks|checks`, `prompts/workorder/templates/`). Read only; nothing in the kit was changed.

How to read it:

- Every addition is a MICRO unit with ONE job, named for that job, the job stated in one line. EXTEND is used only where the method is a missing step of the job the unit already does; anything that would give a unit a second job is a new unit.
- **[2.0]** = must land before the npm publish (it changes what an unattended build from firmware and photos gets right). **[2.1]** = can follow.
- Row ids: `re-1#24` = row 24 of re-1.md. Short prefixes: `sd` synth-design.md, `em` eproms-method.md, `rd` eproms-readme.md, `ct` eproms-chips-tools.md, `arc#D5 / arc#A3 / arc#B31` arcturus.md parts D, A, B. Global-skills parts: `gs-core` synth-re-core, `gs-eng` engine-lessons, `gs-pan` panel, `gs-ma` machines-a, `gs-mb` machines-b, `gs-rds#F/P/T` recon-decode-sync (F firmware-recon, P patch-decode, T tempo-sync), `gs-dl` design-laws, `gs-pb` patches-build, `gs-ui` ui-skills, `gs-sm` small-skills-hooks.
- Overlap is heavy: re-1 to re-4 read `reverse-engineer.md`, and gs-core, gs-eng, gs-pan, gs-ma, gs-mb read the same playbook split into the synth-re skill. One method usually carries three to six ids.

## 1. Summary

About 2,000 report rows (re-1 92, re-2 192, re-3 182, re-4 129, synth-design 109, eproms-method 111, eproms-readme 25, chips-tools 65, arcturus 169, global-skills about 950) merge into about 830 distinct items.

**By recommendation (distinct items):**

| recommendation | items | note |
|---|---|---|
| ADD | about 250 methods, carried by 73 new units and 11 template lines | section 3: U1-U74 (U61 and U72 retired in numbering; U52-U56 are five rules; U38 is a rule plus its own check) and T1-T11 |
| EXTEND | about 270 methods, into 80 existing units (two of the entries, E69 and E77, each bundle one-line extensions of 13 and 15 units) | section 3, E1-E80 |
| OBSOLETE | 30 | section 4 |
| ALREADY COVERED | about 260 (estimated: about 640 COVERED rows across the reports, each method seen two to four times) | not listed; the readers' tables hold them |
| CONFLICT | 17 (C1 already decided with you) | section 2 |
| Not a method (per-machine data, Tim-only setup) | the rest | section 4 rows O27-O29 |

**New units by form and release (ADD only):**

| form | total | [2.0] | [2.1] |
|---|---|---|---|
| skill | 31 | 14 | 17 |
| rule | 35 | 15 | 20 |
| hook | 4 | 0 | 4 |
| check | 3 | 2 | 1 |
| template line | 11 | 6 | 5 |
| **all** | **84** | **37** | **47** |

**New units by pack (ADD only, template lines apart):**

| pack | new units | [2.0] | forms |
|---|---|---|---|
| reverse-engineering | 21 | 11 | 18 skills, 3 rules |
| sound-design | 16 | 8 | 7 skills, 8 rules, 1 check |
| audio-core | 9 | 6 | 9 rules (5 of them the C1 split of panel-surface-and-sections) |
| instrument-shell | 9 | 1 | 9 rules |
| base | 6 | 2 | 3 rules, 1 check, 2 hooks |
| synth-creator | 6 | 2 | 3 skills, 1 check, 2 hooks |
| midi | 4 | 1 | 3 skills, 1 rule |
| cpp | 1 | 0 | 1 rule |
| shell | 1 | 0 | 1 rule |
| workorder templates | 11 lines | 6 | rebuild.md 9, generic.md 1, plugin.md 1 |

No new pack is proposed: every unit has a pack whose subject it is.

**EXTEND by release:** 25 [2.0], 55 [2.1]. By form: 34 skills (and their references or tools), 44 rules (the `param-id-lock` hook and the `ear-constant-tagged` check ride with their rules), 2 bundles.

**Form check against the 20-turn context limit:** of the 37 [2.0] additions, 14 are skills (loaded on demand), 15 are short rules that load only on their paths, 2 are checks with a mechanical pattern, 6 are template lines. No [2.0] hook is proposed.

**The ten most valuable groups for an unattended build from firmware and photos** (all [2.0]):

1. First moves on an image: U1 `triage-the-dump`, U2 `identify-the-cpu`, U3 `decode-from-a-proven-boundary`, U4 `find-the-base`.
2. The firmware pass proper: U5 `trace-the-builders`, U6 `attribute-the-record`, U7 `read-the-dsp-program`.
3. Time and scale without an ear: U8 `find-the-timer`, U9 `absolute-scale-from-firmware`.
4. Proof and provenance: U10 `layout-closes-on-itself`, E1 `every-law-has-a-source` (one tag list), E2 `two-sources-before-naming`.
5. U11 `profile-the-bank` (the per-offset corpus profile every attribution must agree with).
6. Panels from photos: E19 `analyse-reference-look` (grade, exact model, rack table, one ranking), E20 `page-matches-reference-look` gates, E63 `new-panel-control` (mode keys, lamps, job source).
7. "Done" the user can open: U27 `can-the-user-open-it`, E30 `done-means-fresh-evidence`, E31 `build-through-the-queue`, U26 `workflow-bugs`.
8. Gates that cannot pass on nothing: U22 `a-gate-measures-the-real-thing`, U24 `no-elided-code`, T1 grade the evidence before a unit exists, T5 deliverable count.
9. Measuring against an emulator or recording: U32 `measure-a-filter`, U33 `measure-an-envelope`, U34 `identify-a-parameter`, E37 `measure-a-law`, E38 `bounce-a-plugin`.
10. Stored data and sync: E57 `parameter-ids-never-change` (lock order), U38 `reset-before-apply`, U39 `bank-order-is-append-only`, U37 `full-matrix-first`, E50/E51 `does-it-sync` and the restored `clock-law.md`.

## 2. Conflicts for the user

Each: the two positions, what the evidence says, the recommendation. C1 to C8 are the ones the readers named; C9 to C17 were found while merging.

**C1. Depth on a panel.** `audio-core/rules/panel-surface-and-sections.md` Never: "Add glows, shadows deeper than 2 units, or textures." `base/rules/depth-is-designed.md`: depth is one light, a few named levels as tokens, shadows tinted from the ground; a glow means lit, never height. The design log (sd#14) found depth is per theme and the measured reference wins; surface gradient was the highest-value depth.
Evidence: both agree a glow is never height. They disagree only on shadow depth, and the measured replica panels needed more than 2 units.
**DECIDED** (`DECIDED.md`, 2026-11-13): the line goes; depth and glow come from the design or the reference's measure, depth-is-designed governs everywhere, a glow only for lit or active; panel-surface-and-sections is split into its five one-thing rules (surfaces, column names, section header and lamp, tabs, instance grid). Carried into section 3 under audio-core.

**C2. A modulation matrix page.** `audio-core/rules/panel-gestures.md` Never: "Add a modulation matrix page: drag and drop is the decision, not a hole." The shell shipped a ROUTING tab: route = (source x depth + offset) scaled by a second source, empty second input = unity, sources read from the firmware's name table (re-4#51, re-4#52, gs-pan#107). Rebuilt machines carry firmware matrices of 20 slots and more (Matrix-12, Supernova; re-3#86, gs-eng#2).
Evidence: drag and drop works for our own designs; a reproduction whose machine HAS matrix pages cannot show them by drag and drop, and the engine must model the whole matrix whatever the panel shows.
Recommend: split by class. Our own design: drag and drop, no matrix page (kit rule stands). A reproduction: the machine's own matrix pages, as the machine drew them. Engine side always: new rule `full-matrix-first` (section 3). Reword the panel-gestures line to say which class it binds.

**C3. Baseline worktree beside the projects.** Source (re-4#63, gs-pan#118): build the A/B baseline "in a worktree beside the project, where sibling searches resolve the same way". Kit `base/rules/work-inside-the-project.md`: every worktree under `.claude/worktrees/`, never beside (KWB-103: hours of work judged by no hook).
Evidence: the kit's rule has a logged failure behind it; the source's reason (sibling path resolution) is a build-configuration problem, not a reason to leave the project.
Recommend: kit wins. Keep only the method "rebuild both sides of an A/B at the same moment" (seams-are-declared, section 3) with the baseline under `.claude/worktrees/`. The beside-the-project form is OBSOLETE.

**C4. Porting MAME's disassembler.** Source (re-1#87, gs-ma#88): "porting MAME's disassembler is a two-hour job that unlocks a CPU family". Kit `reverse-engineering/rules/house-tools-live-in-the-library.md`: never copy a third-party emulator's or disassembler's code into the library or a project; run it as a separate tool.
Evidence: your decision says third-party code is never copied or ported (GPL). The useful half of the source survives without copying: MAME's `unidasm` and `-listxml` run as black boxes, and a house disassembler written from the CPU manual can be TESTED against `unidasm` output on the same bytes (re-2#80, gs-mb#51).
Recommend: kit wins; add to house-tools-live-in-the-library "test a house disassembler opcode for opcode against a reference disassembler run as a program" (section 3). The port is OBSOLETE.

**C5. Sprites.** `synth-creator/rules/ui-drawn-in-code.md` Never: "Ship an image, a sprite or an embedded asset for any part of the UI" (check `no-html-prototype`, `ui-drawn-in-code`). Source (re-3#73, gs-dl#40, gs-pan#33): a native painter fed by exported sprites and a background PNG from synthpanel-creator.
Evidence: the kit's rule is the later decision; the sprite pipeline's own lessons (stale baked values, lossy cache keys, re-configure for globbed assets, bake is not build) are faults the code-drawn panel does not have.
Recommend: kit wins. Every sprite-pipeline row is OBSOLETE (section 4). One lesson transfers and is kept: "anything that follows a value is drawn live, never cached" is already true of a code-drawn panel; nothing to add.

**C6. Sync default at open.** `midi/rules/sync-is-a-mode.md`: "Leave each destination's division off by default: it overrides a stored value." Global `tempo-sync` (2026-10-05, newer; gs-rds#T1, T2): a machine with no OFF must open synced at its declared default division, and a probe checks "is it on when it opens" at 120 vs 90 BPM with no touch.
Evidence: both are right about different machines. A division overrides a stored time (a 247 ms preset must not become 500 ms) so an OFF-capable destination starts off. A machine whose hardware has no OFF is always tempo-locked, and opening it free-running misrepresents it; a probe that sets sync itself cannot see a wrong default (T2).
Recommend: one rule, two cases, in sync-is-a-mode (its one job is the sync mode, the default is part of it): destinations of a machine with OFF start off; a machine with no OFF opens at its declared divisions. Add the "on at open" check to clock-probe (section 3).

**C7. Reading tables out of a PDF.** `base/skills/pdf-to-md`: "Use docling, not `pdftotext`." arcturus (arc#D26, arc#A28) and ct#35: docling's split output shifted cells in exactly the NRPN rows and gave a plausible wrong answer; `pdftotext -layout` was clean. But re-4#79: `pdftotext -layout` fused a two-column preset list (287 mangled against 433 clean), and gs-core#47: `-layout` interleaves multi-column MIDI tables.
Evidence: every extractor failed on some layout; no single tool is safe for a table a byte will be named from.
Recommend: docling stays the converter. Add to pdf-to-md (same job: nothing in the PDF left unread): a table a parameter is named from is read a second way (`pdftotext -layout` or the rendered page) and diffed; two-column pages are split at the gutter first; where they disagree, the rendered page decides.

**C8. Which panel picture wins.** `base/skills/analyse-reference-look`: "A flat, frontal picture of the real thing outranks a drawing for places." `prompts/workorder/templates/rebuild.md` (Sources, W2.4): "geometry from the drawing; labels and layout from the photo." Sources: a maker's vector overlay beats any photograph (re-3#26, gs-mb#111); the manual's numbered panel diagram beats a press photo, which was a pre-production unit (re-2#111, gs-mb#110); the service manual's orthographic LOCATION OF CONTROLS drawing first (gs-pan#21).
Evidence: drawings were wrong about layout sometimes; press photos were wrong about control type; vector artwork from the maker was exact.
Recommend: one ranking, written once in analyse-reference-look and quoted by rebuild.md: for places, (1) the maker's vector artwork or faceplate overlay, (2) an orthographic service drawing, (3) a flat frontal photo of a production unit, (4) a press or three-quarter shot only as a lead; proportions from a specification (the rack table); colour from a correctly lit photo; two agreeing against a third wins.

**C9. Does every time control sync?** `audio-core/rules/every-time-control-syncs.md`: "Give every time-based control its own sync ... an envelope's units in BPM." Sources: ask whether a time is RHYTHM or TIMBRE first; a doubler, chorus pre-delay, diffuser or comb must not follow tempo; a dual-use control puts FREE first (re-3#156, sd#31, gs-eng#74); the machines' firmware flags showed envelopes did not sync (re-2#17).
Evidence: syncing a timbre time changes the sound's colour with the song tempo, which no hardware did.
Recommend: every RHYTHM time syncs (default per C6); timbre times never follow tempo; dual-use controls list FREE first; a reproduction offers exactly the destinations its hardware flagged (re-2#16). Edit every-time-control-syncs.

**C10. Offsets in a panel table.** `reverse-engineering/skills/names-first` Never: "Look for storage offsets in a panel or menu table." The DX7's panel descriptor table held (max, offset) for every stored byte and caught two manual errors (re-2#75, gs-mb#38).
Recommend: reword: "a panel table usually holds names, ids and range pointers; check what each column is before assuming it holds offsets or does not."

**C11. Does a matching count prove anything?** `reverse-engineering/rules/two-sources-before-naming.md`: "Count as one source: ... a matching count." Sources: arithmetic closure (base + count x stride lands on the next table, widths sum to the stride, a chain closes link for link) is the strongest proof of a layout (re-2#30, gs-mb#33, gs-mb tension b).
Recommend: a count used to fit stays one source; a closure the layout was not fitted to is an independent proof. New rule `layout-closes-on-itself` (section 3) and one clause in two-sources.

**C12. Whose arpeggiator.** `prompts/workorder/templates/rebuild.md` W8 rebuilds "the arpeggiator" of the machine. Source (re-4#28, gs-pan#99, gs-pan#100, gs-dl#18): "no synth ships its own arpeggiator; the shell's is the one". arcturus ran the machine's real arp.
Recommend: kit position stands for reproductions (the machine's arp is part of the machine); the shell's arp serves our own designs. One line in rebuild.md W8 saying so.

**C13. Base scoring by "targets on instruction starts".** `addresses-name-their-space` asks for a base proved by scoring and, in its Never list, warns branch-target self-consistency is not proof (random scored 98.81%). gs-mb#1 uses call targets on instruction starts as the score.
Evidence: the score is valid on a LINEAR sweep and self-fulfilling under recursive descent (gs-mb#6).
Recommend: state which in the new `find-the-base` skill.

**C14. Host parameter names.** `audio-core/rules/panel-gestures.md`: host name `Column . Sub-section . Name`. Sources: on a reproduction the names are the machine's own edit-page strings (gs-pan#27, re-4#54).
Recommend: reproductions use the machine's strings; our designs the column path. One clause in panel-gestures.

**C15. Kit against kit: polling in pdf-to-md.** `base/skills/pdf-to-md` step 3 waits for a slot with `until [ ... ]; do sleep 15; done`. `long-work-in-the-background` and the `no-polling` hook: never wait in a `sleep` or `until` loop.
Recommend: give pdf-to-md a slot helper (a lock file or the governor) instead of the loop.

**C16. Kit against kit: a dangling skill.** `synth-creator/rules/hooks-and-gates.md` tells the builder to use "the `workflow-bugs` skill"; no pack ships it (em#8, gs-sm#15).
Recommend: ship it (section 3, [2.0]).

**C17. Census reading.** `findings-are-withdrawn-in-place`: a suspiciously flat distribution means the decode is wrong. gs-mb#99: a "matrix" that decodes to one destination in every patch was real structure (slots fixed to pages).
Recommend: one clause in bank-census: a flat column is either a wrong decode or fixed structure; decide by what reads it.

## 3. The proposed additions, by pack

Packs are ranked by value to an unattended build of a synth from its firmware and photos; inside a pack, units are ranked the same way. Each unit: name, form, ADD or EXTEND, release, its one thing, then the merged methods it carries, one line each with source ids.

### 3.1 reverse-engineering (rank 1: the firmware pass has rules of evidence but almost no technique)

The pack holds the laws (two sources, tags, negatives, withdrawals) and `names-first`; `re-toolchain` starts with the processors already named. Everything an unattended run does between "here is an image" and "here is a parameter table" is missing. All of it lives today only in the global `firmware-recon`, `synth-re` and `patch-decode` skills.

#### U1 `triage-the-dump` · skill + tool `dump-triage.mts` · ADD · [2.0]
One thing: say what each image is and whether it is whole, before any name search or decode.
- Entropy per window: flat 8.000 encrypted, 7.98-7.999 compressed; compression magics counted against the rate random data gives (re-2#1, gs-rds#F1, gs-rds#F23, ct#29, em#17)
- Minimum period of each half; an over-read dump is evidence only for its real size, fit nothing past it (re-2#2, gs-rds#F2, gs-ma#119)
- Stuck address lines: `b[i]==b[i^(1<<k)]` near 100% against 40-50% healthy (re-1#10, gs-rds#F3, gs-ma#119, ct#29)
- Blank half, wrong part size (2732 read as 64 KB, 128 KB dumped twice), no 0x00 byte in 4 KB means not plain 8-bit code (re-2#3, gs-rds#F4, gs-ma#119)
- Divide the image size by every printed count (programs, variations); an exact quotient is a block per variation, a remainder means the data lives elsewhere (re-2#4, gs-rds#F5, gs-mb#154)
- Family checksum convention (sum mod 256 = slot) accepts or rejects each dump (re-2#5, gs-ma#120)
- A power-of-two file with no extension is a dump; an extension is a claim, open every file with the container reader (ct#41, ct#42, re-2#122, gs-mb#19)
- Census the whole image into code, tables, erased, samples, unknown until it sums; is the dump the program or the waves (re-2#69, em#73, gs-mb#60, gs-mb#170)
- Where the product's own code ends; a shared-platform flash can hold a second machine above it (re-2#20, re-2#21, gs-ma#144)
- Carve embedded standard files (SMF demo songs) before any stride scan (re-3#35, gs-mb#132)
- Lag-1 and period autocorrelation for geometry and record size, and one plausibility statistic per extracted bank (re-1#25, gs-ma#11, gs-ma#12)
- A printable run can be a BCD counting table (gs-ma#105)
- Erased runs are excluded from every identical-region count (gs-ma#7)

#### U2 `identify-the-cpu` · skill · ADD · [2.0]
One thing: name each processor from the image itself, proved three ways, before a disassembler is chosen.
- Reset and vector signatures (x86 far JMP at top, 68000 table at 0, 0xFFFE 6502/6809, Cortex-M SP plus odd handlers), boot idiom, compiler banner, initial SP (re-1#9, re-2#66, re-3#22, rd#2, rd#4, gs-rds#F10, gs-mb#9, gs-core#19)
- A vendor name is not an architecture; a wrong decoder prints plausible fiction, not an error (rd#3, gs-rds#F11, em#23, gs-ma#99)
- Which files are code: extended-addressing opcodes per KB (re-1#47, gs-core#16)
- Opcode census per candidate ISA in both byte orders, positional measures not histograms, known machines as controls (re-3#33, gs-mb#8, gs-mb#10, gs-mb#11)
- A vector table whose unused entries carry their own index proves table, base and decoder at once (gs-mb#12)
- Interleave byte and half-word pairs, then re-run the signature; even/odd vs adjacent banks by whether the family idiom appears whole (re-2#68, gs-mb#15, re-1#78, gs-ma#130)
- Byte-swapped 16-bit images: swap before reading code (rd#5)
- No disassembler for an unidentified ISA: record its prologue and epilogue fingerprint and stop (re-2#67, gs-mb#8)
- Read the MAME set as a black box: `-listxml` for CPU, clock and ROM map; an overlaid ROM means dump both and diff (re-3#51, gs-ma#87, gs-ma#89, gs-core#45)
- Confidence per guess (known, high, medium, low) and a hand override file (rd#2, gs-rds#F10)
- Per-page histogram of which RAM base absolute operands address shows a second program in the image (re-1#21, re-3#49, gs-ma#30, gs-core#44)
- ASIC or loadable DSP: no pointer walk into the chip window means fixed function (re-2#51, gs-mb#54)
- Interrupt census: zero EI/vectors means a polled loop and decides where a time base can be (re-2#9, gs-mb#175)
- Shared vendor entry-point headers are headers, not desyncs (re-3#34, gs-mb#131)
- Processor notes for no-tool families: C2000 memory map from `MOVW DP` operands, Cortex-M Thumb (gs-rds#F13, gs-rds#F14)

#### U3 `decode-from-a-proven-boundary` · rule · ADD · [2.0]
One thing: a listing counts only from an address reached from a vector or a call target.
- Never disassemble from an address you picked; a linear sweep desyncs without error (re-1#48, gs-rds#F15, gs-ma#97, em#107)
- With no proven boundary, count instruction encodings instead of decoding (gs-rds#F16)
- Read a conditional by what the code intends, check branch targets against raw bytes (re-1#48, gs-ma#26)
- An always-zero or constant result suggests swapped operands (gs-ma#26)

#### U4 `find-the-base` · skill · ADD · [2.0]
One thing: prove where an image (or bank) is loaded, by a score with a stated margin.
- Score call and jump targets on instruction starts and words after an RTS, over a sweep, with the runner-up margin (re-2#45, re-2#130, gs-mb#1, gs-mb#2, re-3#48); valid on a linear sweep, self-fulfilling under recursive descent (gs-mb#6; C13)
- A pointer table into the blob, vector entries all in range, the reset routine's RAM clear (gs-ma#1)
- Pointer-base enrichment against bases shifted by 1, 2, 4, 0x10 (re-2#131, gs-mb#44)
- Data base from long immediates matching known string offsets; string-reference scoring alone is too forgiving (gs-mb#3, gs-mb#4, re-2#191)
- Words that point back inside the file (re-2#151)
- Mirrors and aliases: score every alias base (re-2#186, gs-mb#5)
- A map right over half a device is not verified: search the data half too (re-1#35, gs-ma#3)
- Position-independent bank: read the OS routine that relocates it (gs-ma#2)
- Relocating loader: read the reset path's copy loop first; record ROM offset and run address (re-2#62, gs-mb#53)
- Bank stubs at identical addresses whose first instruction switches away (re-2#56, gs-mb#135)
- An Intel-hex or update file carries its own load addresses (re-1#21, gs-ma#38)
- Three-phase window scan finds code in a blob (re-1#55, gs-ma#43)
- Score whether a region is code before scoring a base (re-2#153, gs-mb#42)

#### U5 `trace-the-builders` · skill (reference `c-idioms.md`) · ADD · [2.0]
One thing: read every routine that turns a record field into an engine coefficient, so each law comes out with its slot and scaling.
- Enumerate every coefficient-send call site with its record read and slot: `body[n] -> slot -> scaling`; known anchors falling out unfitted is the check (re-1#28, arc#D5, arc#A29, gs-core#24, gs-eng#104, re-4#92)
- Find the shared helpers first: mapper divisor, fixed-point converter, multiply-then-divide fingerprint, domain converters (0xAAAB = 2/3) (re-1#31, arc#D20, gs-core#25)
- Find every indexed table at once by the stride-multiply idiom; per CPU family how a table is indexed, data-side scan where there is no MUL (re-1#29, re-2#7, re-2#8, gs-ma#108)
- Find builders by the tables' own addresses as immediates; follow a staging byte to its writers (re-2#100, gs-mb#84)
- Trace the factory RESTORE path: source, length, record size and count in one routine (re-1#30, gs-ma#111, gs-rds#P1)
- Rate constants and their products as immediates locate rate code (re-2#129, gs-mb#55)
- Look for the generator (seed, recurrence) before the table; scan for the data a compiled-out builder draws from (mutually prime lengths) (gs-eng#105, gs-ma#48, re-1#34)
- Find a downloaded program by the hardware it writes, not by a diagnostics preamble (re-1#71, gs-ma#57)
- Read what the host writes to learn topology: shared slots mean shared state (re-3#91, gs-eng#7)
- Fix the sample rate before fitting any time law (re-4#92)
- Reference: compiled-C idioms (jump tables, switch on switch, trampolines, runtime-registered dispatch, bit-packed flags, sign selects mode, bipolar coefficient) (re-1#46, gs-core#32)
- The RTOS task table is the map of an RTOS firmware (re-4#96, gs-eng#109)

#### U6 `attribute-the-record` · skill · ADD · [2.0]
One thing: map every stored byte of a patch to the running record through the code that receives, reads and sends it.
- Anchor first: facts the sysex spec states (message-length table, record base, first factory name) found at their addresses (re-1#23, arc#D3, gs-core#20, rd#7, gs-rds#F24)
- Read the receive and bulk-transmit handlers: size, stride, repacking, the RAM-to-wire conversion, the spec's errors (re-1#26, re-2#59, re-2#83, gs-mb#27, gs-core#22)
- List every representation (stored, runtime struct, live UI globals, DSP staging) and resolve the base register before naming a store (re-1#26, arc#D8)
- Controller-to-offset table by constraint search over two or three sure pairs, 256 entries, 0xFFFF = indirect; a hit must also pass checks it was not fitted to (re-1#27, arc#D6, gs-core#23)
- Runtime-registered dispatch (option NRPN): walk every handler and check each against the manual's name (arc#D7)
- Find the packer and its inverse, interpret it rather than transcribe; the encoder confirms the layout (re-2#57, re-2#58, re-2#188, gs-mb#28, gs-mb#29)
- Size by the record's own arithmetic: wire bytes minus MSB/LSB expansion, store size times stride fills the RAM (gs-mb#30, re-3#10)
- Verify a byte's meaning by sweeping it through a reader harness and watching the consumer (arc#D28)
- The firmware's own field table `{max, width, kind}` and deserialiser before any statistics (re-2#118, gs-mb#36)
- The INIT patch found by its name is the packed template (re-2#76, gs-mb#37)
- A trailer word gives the active parameter count; a record word is the default column (re-2#28, re-2#29, gs-mb#151)
- One byte feeding three consumers: check each block has its own (re-3#111, gs-eng#28)
- The patch may store hardware control words; the named parameters are the mod layer (re-2#169, gs-mb#100)
- Payloads as `{id,value}` pairs with unused and end markers (gs-rds#P6)

#### U7 `read-the-dsp-program` · skill · ADD · [2.0]
One thing: find, carve and read a DSP program so its consumption fixes units and structure.
- Host-bootstrapped DSP: host-interface register block at a stride, word-write routine, the loop's source pointer and terminator, size against program RAM; look for the loader, not a second EPROM (re-1#32, gs-core#27, gs-rds#F22, re-2#63)
- Carve images by the family's bootstrap signature (length and start before the first words); a generic carver tool (arc#D53, gs-core#75)
- Find the program-download path on the schematic; identify chips by transfer protocol (re-1#77)
- Calibrate the host-to-DSP word convention on slots known elsewhere (slot = er1/2^31; a fractional MAC does not double) (arc#D19)
- The consumer fixes the unit (the DSP squares the LFO rate word); a host-only law is provisional (arc#D21, gs-core#26)
- Allpass vs comb by feedback sign and feedforward add; zero conditionals in the driver means routing is data (arc#D18, re-1#32)
- (pointer, mask) pairs are circular-buffer registers: the audio memory map (re-2#133, gs-mb#124)
- Split a DSP container into records before decoding; threaded-code engines (re-2#121, gs-mb#126)
- Check a recovered coefficient table's frequency response and axis order (re-2#177, gs-mb#58)

#### U8 `find-the-timer` · skill · ADD · [2.0]
One thing: derive the tick and the control rate from firmware, before any stored time is read.
- Read which interrupt vectors are live (branch-to-self stubs are dead; a dead serial vector means MIDI is polled) and the timer handler's rearm constant (re-1#49, gs-rds#F19, gs-ma#110)
- Crystal to CPU clock (baud divisor) to timer reload to tick to control rate, shown as arithmetic, tagged `[FW]` (re-3#9, gs-ma#21)
- Read a counter chip's MODE before its count (8254 mode 3 interrupts at the half period) (re-2#84, em#77, gs-mb#67)
- Check the top of the fastest dependent range is musical (188 Hz LFO means a missing divisor; a 16-voice scheduler scales every time by 16) (re-2#174, gs-mb#68, gs-core#36)
- Pin the clock from three or more independent readings (baud, pitch table at 440, autotune targets, tempo table, second crystal), count them in laws.md (re-2#50, em#76, gs-mb#65)
- Derive the tick from a count range against a printed time range (re-2#173)
- A hardware tick outside the image is bounded from firmware (gs-ma#115)
- A machine that may do no voice allocation (divide-down): ask what the CPU drives (re-3#14, gs-mb#174)

#### U9 `absolute-scale-from-firmware` · skill · ADD · [2.0]
One thing: turn register words into Hz, seconds and dB with no ear.
- The anchor trick: where firmware equates a chip register to a known quantity (A4 = 440); any sync-A-to-B path is a free scale equation (re-1#50, gs-ma#22)
- Fixed point first (Q14, Q15, Q16), then the law (Chamberlin F) (gs-ma#23, re-1#31)
- Table shapes: square plus floor is a damping word; a ratio of two tables proves its own dB scale (gs-ma#24, re-1#50)
- Printed delay maxima that are binary sample counts prove the sample rate (gs-ma#65, re-1#38)
- Printed numbers check themselves: N stated limits must land on integers under ONE law; rounded exact power-of-two steps; overlapping ranges prove a shared index table (re-1#38, gs-ma#46, gs-ma#140)
- Printed conversion ladders may be preferred-number series (R20); power-of-two endpoint ratios pin a word range (re-2#54, gs-mb#79)
- A candidate law scanned over the whole image: one hit is proof, a dozen is too loose (gs-ma#61)

#### U10 `layout-closes-on-itself` · rule · ADD · [2.0]
One thing: a layout is proved by arithmetic that closes and was not used to fit it.
- Widths sum to the stride; base + count x stride lands on the next base; a chain `offset[N] + size*count = offset[N+1]` holds link for link; sections tile the image (re-2#30, re-3#2, gs-mb#33, em#72, gs-ma#36)
- Counts agree including the holes (gs-mb#140, re-3#13)
- Decode coverage and the shape of the undecoded remainder (re-3#8)
- Every container checksum over every record, n of n, odd and last records inspected (re-3#18, gs-mb#119, re-2#184)
- Every step table closes on its printed maximum (re-2#99, gs-mb#83)
- Done = every record written as a byte sum to its length, residual stated (gs-rds#P19)
- A structure a wrong record size cannot produce (loops halving against roots an octave apart) (re-2#179, gs-mb#82)
- Clause in two-sources: a closure not used to fit is independent (C11)

#### U11 `profile-the-bank` · skill + tool `byte-profile.mts` · ADD · [2.0]
One thing: per-offset statistics of the patch corpus that every attribution must agree with.
- Per offset min, max, distinct, mean, mode; classes const, enum, bipolar at 64, unipolar; CSV kept; "statistics give shape, never names" (re-1#24, arc#D4, gs-core#21)
- Repeated blocks by distribution similarity, packed-enum codebooks, multi-field bytes and their tell (re-1#24, arc#D12)
- Per-column entropy across strides and phases finds record stride and count, with code and random baselines (re-2#154, gs-mb#43)
- Neighbour-difference profile finds the fast axis (re-2#150, gs-mb#57)
- Below about 40 using patches a parameter cannot be attributed from the corpus (re-1#51, gs-core#33)
- Range-check every field over the whole bank before trusting an offset (gs-rds#P13)
- A sibling's bulk dump as `[COR]`, single-byte parameters below the divergence offset only (re-4#113, gs-eng#122)
- An unnamed byte with a musical histogram, stored then followed by a call, is a hidden parameter (re-3#144, gs-eng#65)
- A corpus statistic can settle an order (carriers near max output) (re-2#61)

#### U12 `find-a-table` · skill (reference `table-shapes.md`) · ADD · [2.1]
One thing: locate a table by a sequence of known values or by its shape, then confirm it in code.
- A run of known values (consecutive maxima) at every stride, then the code that loads the base and adds the stride; a structural scan only proposes (re-4#94, re-4#95, gs-eng#107)
- Pointer arrays into a string region; back-pointer descriptors (re-2#70, re-2#183, gs-mb#46, gs-mb#47)
- A stated value as a needle: exactly one window in the image (re-3#41, gs-mb#133)
- First differences before fitting: piecewise steps refuse one law (re-3#3, gs-mb#57)
- A run in initialised data needs position-independent evidence before it is a table (re-2#132, gs-mb#125)
- Shapes in erased space (run = 2^n x count); a deliberately coarse low end (gs-ma#4, gs-ma#9)
- The pointer table may be far from its data: search for pointers INTO the region (re-4#109)
- Rows that are one shape times multipliers (re-1#34, gs-ma#109)

#### U13 `a-field-may-be-an-index` · rule · ADD · [2.1]
One thing: before reading a field as a value, test whether it is an index, and from which base.
- Find the table a field could index and compare its length with the field's maximum; a plausible maximum is not a check (re-2#35, gs-ma#142)
- When a field reads absurd, suspect the enumeration base (pointer index vs manual number) (re-2#176, gs-mb#95)
- A stored id may be the label-table index, numbered from zero, skipping menu entries (gs-rds#P8)

#### U14 `place-a-bit-field` · skill · ADD · [2.1]
One thing: place a field whose position the documents do not settle, by statistics that a wrong place fails.
- The only all-zero run where documented spares sit; mutual information with "non-default"; an enum reaching its printed max and no more; signed deltas inside range; winner beats runner-up by a stated margin (re-2#116, gs-mb#35)
- Score an ambiguous rule against a physical invariant (zones cover 61 keys) (re-2#164, gs-mb#34)
- Flag bits inside value bytes (clustered 1-7 and 64-71); a field whose width changes with a flag (gs-rds#P15, re-2#18, gs-ma#125)
- Brute-force the positions that drop out between two record lengths; find boundaries from the corpus before the manual (re-2#98, em#74)

#### U15 `diff-the-revisions` · skill (tool on the library shelf) · ADD · [2.1]
One thing: compare builds of one machine structurally to find tables, changes and the true version.
- Diff every revision before disassembly: identical regions are presets and tables (re-2#11, gs-mb#86, em#68, gs-rds#P2)
- Diff the NEAREST pair, not the most different (re-2#12)
- Instruction-aligned or k-mer-anchored diff; a raw byte diff is 7-98% wrong; align on invariants (re-1#12, gs-ma#39, arc#D52, gs-core#33)
- Banners and folder labels lie; place a build by diffing; a version string is what the code reports (re-2#13, gs-ma#50, re-1#74)
- A revision's finding is a hypothesis for another revision; feature answers per revision (re-2#14, gs-mb#87)
- A table byte-identical across versions is a design constant, one that moves is code (re-1#33, gs-core#28)

#### U16 `read-the-formatter` · skill · ADD · [2.1]
One thing: take each parameter's unit and curve from the routine that prints it.
- The display routines are the laws: read each against the manual's screenshots before choosing a curve (re-2#119, gs-mb#80)
- List what a formatter can print before using a screenshot value (re-2#120, gs-mb#81)
- Display templates carry the decimals and a record byte restates them (re-2#34, gs-ma#117)
- A symbol-valued parameter is a number: compute the run its meaning forces at the PPQN and search it (re-4#104, gs-eng#116)

#### U17 `manual-pass` · skill · ADD · [2.1]
One thing: review the manual area by area against the decoded map and the engine, after the firmware pass.
- One file per area, five headings (where we were, confirmed, fixed, named but parked, open) and a verdict (re-1#36, arc#D27, gs-core#29)
- Machine tables beat prose; log the manual's own inconsistencies (re-1#36, arc#D25)
- Every stated limit is an array size or loop bound: find the loop (re-1#37, gs-core#29)
- Statements an implementer gets wrong by instinct go into laws.md first (re-1#36, gs-ma#95)
- Read UI semantics, not only names (re-3#97, gs-eng#13)
- A round-factor difference between builds has a manual sentence naming both numbers (re-1#90, gs-ma#82)

#### U18 `map-the-io` · skill · ADD · [2.1]
One thing: name each I/O address from the CPU's register map and what the code writes there.
- With no address bus, the chip select is the map: list values written to the select port (re-3#11, gs-mb#127)
- A don't-care write is a strobe; data can ride the address bus (re-2#157, gs-mb#128, gs-mb#129)
- No ADC register: look for comparators on port bits (gs-ma#54)
- Equally spaced windows may be one banked chip; identify a chip by its write protocol (gs-ma#59, re-1#77)
- A diagnostic's addressing is not the runtime's; read both ends of a link (re-1#73, gs-ma#58, gs-ma#62)
- Literal-pool censuses cannot settle a map (gs-mb#130); a masked read shows undriven lines (re-3#12)

#### U19 `find-a-sequence` · skill · ADD · [2.1]
One thing: find stored music by its signature and prove it by arithmetic.
- An offset zero in every record picks stride and phase; notes 24-100, velocity 1-127 (re-4#108, ct#30, gs-eng#120)
- Deltas sum to whole bars (384 ticks at 24 PPQN) on every pattern (re-4#108)
- Record the format, never the notes (covered by firmware-stays-out)

#### U20 `sample-roms` · skill · ADD · [2.1]
One thing: assemble and decode sample ROMs.
- Program or waves first, and the MAME NO_DUMP regions (gs-mb#60, re-2#69)
- Pair and order chips by low-byte smoothness and harmonic-comb energy, with a wrong-order control; an idle PROM at 0 marks voice starts (re-2#168, gs-mb#59)
- Sample coding by a decay-line fit against controls (mu-law true magnitude, lower edge) (re-2#166, gs-mb#62)
- A voice may have no sample rate (VCO-clocked) (re-2#167, gs-mb#64)
- Rate by loop closure (whole cycles of the root); a broad peak means a sign or unit (gs-mb#63)
- Entropy cannot classify companded audio (gs-mb#170)

#### U21 `byte-reach` · skill · ADD · [2.1]
One thing: count the stored bytes that change no sound, as the progress number of a decode.
- Perturb every byte of every record; the deaf count must fall as the map grows (arc#A22)

#### EXTEND, same job:

- **E1 `every-law-has-a-source`** · rule · EXTEND · [2.0] · one thing: every law carries its source tag.
  - One tag list matching rebuild.md line 40: add `[DS]` (cite the sheet's own symbol and page; a clone's sheet names the clone), `[REF]` (scripted fit to a recording with published settings), `[EMU]` (agrees with an emulator only, never `[FW]`), `[SVC]`, `[DER]`, `[PHOTO]`, `[ASSUMED]`/`[MEAS]`, each with what it proves (re-1#4, re-1#61, re-3#133, em#2, em#105, ct#1, ct#2, gs-core#3, gs-eng#53, gs-ma#28, arc#B45, gs-pb#32)
  - `[COR]` is weak where the corpus never varies the parameter (re-4#100, gs-eng#112)
  - A law read from the host alone is provisional until its consumer is read (arc#D21)
  - A chip fact is about the hardware: say what the board did to compensate (sd#40)
  - Same button name, different feature: say which is ours (re-4#89, gs-eng#101)
  - The check `ear-constant-tagged` reads the full tag list (gs-ma#28)
- **E2 `two-sources-before-naming`** · rule · EXTEND · [2.0] · one thing: no name without two independent sources.
  - A test that pins a law is a source: read it before correcting (re-3#61, gs-core#63)
  - Check scope and the vendor's printing convention before logging a contradiction (re-3#29, gs-mb#74)
  - A translation is one source; read the original language and break ties with a third (re-2#146, gs-mb#75)
  - A trimmer target against a firmware constant is the strongest pair (re-2#107, gs-mb#141)
  - Write the firmware reading first, then let published sources confirm (gs-mb#177)
  - A sibling gives structure, never enum values: read every enum from your own ROM (re-4#112, gs-eng#121)
  - Order and arithmetic arbitrate between two printed labels (gs-mb#77)
  - The C11 clause on closure
- **E3 `a-negative-names-what-was-scanned`** · rule · EXTEND · [2.1] · one thing: a negative states what was searched.
  - Search a printed table as plain, BCD, scaled and signed bytes at every stride, then ask where the data lives (re-2#38, re-2#39, gs-mb#167)
  - After repeated absence over three images, stop and change the question (re-1#72, gs-ma#60)
  - A tool's layout assumption is printed with every empty result (gs-mb#49)
  - A blocked note resting on an analogy is checked first (em#65)
- **E4 `addresses-name-their-space`** · rule · EXTEND · [2.1] · one thing: every address names its space.
  - ... and its image: name, version, md5 (re-1#74, gs-ma#104)
  - Grid filter: keep marker hits with a neighbour one stride away (re-2#26, gs-mb#149)
  - A section table's offsets may be into the decompressed image (re-2#113, gs-mb#119)
- **E5 `findings-are-withdrawn-in-place`** · rule · EXTEND · [2.1] · one thing: a wrong finding is withdrawn where it stands.
  - A comment or a variable name is not evidence for a withdrawal (re-4#93, gs-eng#34)
  - Put a correction into the extraction tool as an assertion naming the old reading (re-2#42, gs-ma#156)
- **E6 `reproduction-or-original`** · rule · EXTEND · [2.0] · one thing: a reproduction is the machine, ours is labelled ours.
  - Keep a firmware table's anomaly, switchable and footnoted, with a test (re-2#108, gs-ma#20, arc#B44)
  - The faceplate holds only the machine's real controls; the rest go to the shell (gs-pan#6)
  - A machine with no patch memory: the record and bank are ours and every file says so (re-2#97)
  - Variants as one engine plus a range table (gs-mb#89)
- **E7 `account-every-term`** · rule · EXTEND · [2.1] · one thing: every term of a computed value is accounted for.
  - Write the value as named term fields in code, empty ones tagged `[TODO/FW]` (re-4#86)
  - Add and clamp in the firmware's own domain (rate index, 13-bit word) (gs-mb#97)
  - A route may be a two-input VCA: model it as computed (re-2#172, gs-mb#98)
- **E8 `names-first`** · skill · EXTEND · [2.0] · one thing: name parameters from the firmware's own strings first.
  - Width-prefixed packed tables count themselves; one base plus offset table; `--run` mode in names-sweep (re-4#107, gs-eng#119)
  - Keyword net, clock words and units sweep (`Hz dB msec BPM cent`) when no manual names exist (re-4#98, re-4#99, gs-rds#F7, gs-eng#111)
  - Sweep the word stream (one character per 16/24-bit word) (re-2#125, gs-rds#F9, gs-mb#123)
  - Name-to-index claims scored against shift, stride and shuffle controls; `--index` mode (re-1#60, re-3#37, ct#32, gs-ma#129, gs-mb#48)
  - A missing string read against the panel (a legend with an LED is on the plate, not in ROM) (re-4#103, re-2#10, gs-eng#115)
  - Repeated names with a suffix are further lists in the same order (re-4#102)
  - Generated names (painted at transmit) are not stored (re-2#65, gs-mb#40, em#84)
  - After unpacking, sweep for the loader's own messages (re-3#19, gs-mb#122)
  - Few runs means a character table: decode it first (gs-rds#P18)
  - Sweep with the effect kind's vocabulary; inline unit templates (gs-rds#P7)
  - The C10 rewording
- **E9 `gather-sources`** · skill (reference `source-kinds.md`) · EXTEND · [2.0] · one thing: gather every source before decoding.
  - Hash every file, dedupe, against the archive and siblings; search by ROM part number (`source-ledger.mts` hash pass) (re-1#11, re-2#6, re-2#90, gs-ma#63, gs-mb#22, em#69, rd#14, ct#59)
  - Open the vendor's updater and installer before calling a firmware hidden (re-2#22, re-2#112, re-3#20, gs-mb#120)
  - Where the factory sounds live: user-area dumps, ROM presets, tape, floppy, editor formats, printed patch books (re-1#82, gs-rds#P3, gs-ma#103, gs-mb#41, rd#17, ct#61, re-1#65, gs-ma#33)
  - What the machine boots from; disks before the ROM on samplers (re-2#162, em#70, gs-mb#61)
  - The parts list first; service adjustment and check tables carry absolute numbers (gs-mb#21, re-2#95, gs-mb#71, re-3#121, gs-eng#41)
  - Record the OS version of every manual and image, read the matching manual (arc#D23, arc#A27)
  - Host-side editor templates and librarian files carry the MIDI map (re-2#137, gs-mb#108)
  - Patents when the algorithm is in silicon (em#47); the designer's later products (re-2#141, gs-mb#103, em#79); a sibling's service notes the maker defers to (re-2#89)
  - A headline spec may be the supplier's datasheet line (re-2#136, gs-mb#78)
  - Panel artwork and display photos are sources (re-2#110, re-2#142, gs-mb#114, re-1#86, gs-ma#112)
  - Manual and service-manual site list with the gated hosts and the Wayback route (rd#15, ct#60, gs-mb#23)
  - Write every new source, failed search and finding back to the archive (re-1#8, gs-core#7)
  - Printed waveforms: graticule and same-size tests before any time (re-1#16, gs-core#14)
  - No dump possible (mask ROM, pre-MIDI): say so and stop (rd#23)
- **E10 `re-deliverables`** · skill · EXTEND · [2.1] · one thing: the record a build leaves.
  - Tag histogram of laws.md in every step report (em#60); commands and path table to reproduce (em#109)
  - Confidence column per attribution, wired only with two sources (arc#D56); research log generated from git (arc#D55)
  - Day-one list of findings easy to get wrong (re-3#57); falsifiable predictions for open questions (re-2#23, gs-ma#147)
- **E11 `bank-census`** · skill · EXTEND · [2.1] · one thing: render the whole factory bank and read where each law settles.
  - Count per filter mode (re-2#156, gs-mb#152)
  - Re-run after any replaced `[EAR]` constant (re-1#63, gs-ma#25)
  - C17 clause; per-feature corpus counts as regression tests (re-1#43)
- **E12 `re-toolchain`** · skill · EXTEND · [2.0] · one thing: settle the disassembler and emulator for each named processor.
  - Print the family's trap list beside each tool row (uCOM-4 page wrap, uPD7810 skip, H8/500 vs H8/300H, 6301 vs 6801) (re-3#44, gs-core#41, re-2#80)
  - Seed recursive descent with linear-scan call targets, print coverage, read low coverage as a table gap (gs-core#43)
  - Install recipes for missing tools (macOS binutils traps) (re-4#71, gs-core#50, gs-core#76)
  - Run a firmware routine in a small interpreter instead of retyping it (gs-mb#29)
- **E13 `house-tools-live-in-the-library`** · rule · EXTEND · [2.1] · one thing: house RE tools live in the library and are proven.
  - Test a new disassembler opcode for opcode against a reference disassembler run as a program (C4) (re-2#80, gs-mb#51)
  - Measure a tool on the second occurrence; refuse loudly with a diagnostic instead of returning nothing (re-2#189, gs-mb#50, re-1#81)
- **E14 `read-a-circuit-diagram`** · skill · EXTEND · [2.1] · one thing: read a schematic into a netlist and laws.
  - The parts list beats the block diagram; arithmetic arbitrates a scan artefact (re-1#40, gs-core#13)
  - Diff two board revisions sheet by sheet (re-2#25)
  - An inferred topology must predict numbers the documents state (re-2#143, gs-mb#102)
  - A tolerance can be intent (stretch tuning) (re-2#96, gs-mb#72); a chip spec bounds a block, not the box (re-1#76, gs-ma#132)
  - Trace where a CV is tapped (re-3#118, gs-eng#37)
- **E15 datasheet-sources (reference of gather-sources)** · EXTEND · [2.1]
  - State each chip's function and whether its sheet has an electrical table; a family manual stands in with the differences written (ct#3, ct#5, ct#6, ct#8)
- **E16 `menu-map`** · skill · EXTEND · [2.1] · one thing: join every menu page to its parameters.
  - Read the calibration menu before hunting a tuning table (re-3#23, gs-mb#73)
- **E17 `tripwire-the-law`** · skill · EXTEND · [2.1] · one thing: a firmware law is held by a test.
  - Rank fixes: biggest bounded `[FW]` first, duplicates last (re-3#125, gs-eng#43)
- **E18 `unwrap.mts`** (names-first tool) · EXTEND · [2.1]
  - SMF sysex reader with one block per file (re-4#97, ct#43, gs-eng#110); 24-bit LSB words and header-checksum proof (re-2#123); nibble-swapped ASCII (re-2#137); Moog 16-in-3 with checksum span (ct#44); XOR key from erased runs (ct#45); Clavia 8-to-7 variant (gs-mb#121); address-line permutation tries (re-3#47); packing proved by address stride and checksum (gs-rds#F20)

### 3.2 base (rank 2: panels from photos, honest gates, complete output)

#### U22 `a-gate-measures-the-real-thing` · rule · ADD · [2.0]
One thing: a gate opens, names and counts what it measures, so it cannot pass on nothing.
- A gate over a generated artefact opens it; a compare of defaults against defaults scored 0 disagreements on 292 empty patches (sd#7)
- Assert the instrument's identity and count first, exact, per set (0 of 264 silent passed with zero files loaded) (sd#91)
- A gate loads its data outright; "skipped" fails when the data exists (sd#90)
- At least one gate compares two independently generated artefacts or the world, not a record of itself (sd#82)
- A planted fault's target id must exist and the fault must change the output; string names diffed against the id list (re-2#147, gs-mb#149)
- Mark a gate that tests the shell, not the unit; every unit-owned behaviour keeps an audio probe (re-4#83, gs-core#57)
- A multi-part verdict names the half of the AND that failed (gs-eng#85)

#### U23 `debt-gates-fail-on-rise` · rule · ADD · [2.1]
One thing: a gate over a count of debts holds a checked-in floor, fails only when the count rises, and names its exemptions.
- Baseline file, fail on increase, `--bless` writes a diff someone reads, seen red by lowering the floor by one (sd#79)
- Named exemptions with reasons and a bar of zero past the list (sd#9)
- Every exclusion or skipped test names the condition that ends it (sd#83)

#### U24 `no-elided-code` · check · ADD · [2.0]
One thing: refuse source written with elided parts.
- Refuse `// rest of code`, `// ... existing`, `// similar to above`, `// implement here`, bare `...` placeholders in written source (gs-ui#56)

#### U25 `second-time-is-a-tool` · rule · ADD · [2.1]
One thing: the second time a research or build step is done by hand, make it a tool or skill before going on.
- The same triage was written on eight machines in a day (re-1#80, em#16, em#17, gs-ma#128); script for mechanical, skill for judgement (em#16)

#### U73 `agent-model` · hook (PreToolUse on Agent) · ADD · [2.1]
One thing: refuse an agent spawn that names no model, and Opus without a stated reason.
- Sonnet default, Haiku only for lookups, `OPUS BECAUSE:` from a configurable list (gs-sm#18)

#### U74 `agent-ledger` · hook (SubagentStop) · ADD · [2.1]
One thing: log every agent's model, brief, run time and tokens.
- Spawn and finish lines in `.claude/logs/agents.jsonl` and a report (gs-sm#19)

#### EXTEND, same job:

- **E19 `analyse-reference-look`** · skill · EXTEND · [2.0] · one thing: analyse a reference picture before building from it.
  - Step 0, grade the reference: front-on, clean (bytes per pixel is the tell), sample-able, of the EXACT model; pixel count is not the test; stop and report when none is held (gs-pan#1, gs-pan#2, gs-pan#3, rd#20, ct#62)
  - Close-ups of each region as well as the full front (gs-pan#4)
  - Which object is the reference: a remote or programmer may carry the controls (re-2#48, gs-mb#113)
  - Rack aspect from the 19-inch table (482.6 mm, 44.45 mm per U: 1U 10.86) checked against a clean crop; uncropped camera ratios rejected (gs-pan#7, ct#53)
  - The one source ranking of C8 (re-3#26, re-2#111, gs-mb#110, gs-mb#111, gs-mb#112, gs-pan#21)
  - Read printed groupings and formulas on the artwork as numbers (re-2#110, re-2#142, gs-mb#114)
  - Clock-face positions need the pot's travel and stop angle (re-2#145, gs-mb#76)
  - Reference file `controls-in-artwork.md`: star knobs by distance transform, controls by shape with an overlay proof, a final extracted layout locked [2.1] (re-3#27, gs-mb#111, arc#A36)
- **E20 `page-matches-reference-look`** · rule · EXTEND · [2.0] · one thing: the drawn page is measured against its reference.
  - Gate: every panel's aspect equals the machine's true shape from the table, planted wrong (gs-pan#8)
  - Gate: no two control boxes or legends overlap, after every spec edit, planted (re-4#25, gs-pan#47, re-3#77)
  - Gate: every section has a title and a ground that draws (gs-pan#19)
  - An offset render is a capture bug before a layout bug (gs-pan#42)
  - Replica paths change only when remeasured; taste goes in our own paths (sd#93)
- **E21 `pdf-to-md`** · skill · EXTEND · [2.0] · one thing: nothing in a PDF is left unread.
  - C7: a table a parameter is named from is read a second way and diffed; two-column pages split at the gutter (arc#D26, arc#A28, ct#35, re-4#79, gs-eng#95, gs-core#47)
  - Contact sheet of a scanned PDF, then quadrants of the pages needed (re-1#15, gs-core#12, ct#36)
  - Requeue a conversion under 120 bytes of text per page (ct#37); a Japanese manual OCRs only with the language asked alone (ct#38)
  - Cite the printed page by a measured offset; blank on a miss (ct#34)
  - Check the scan PDF before calling a MIDI chart absent; keep the page images beside the Markdown (rd#9, rd#10)
  - C15: replace the polling wait with a slot helper
- **E22 `git-right-first-time`** · rule · EXTEND · [2.0] · one thing: git in the form the guard takes.
  - Fetch before saying a branch is ahead, behind or level (em#7)
  - Commit unfinished work at once with a plain partial-state message (done, unverified, test state, interrupted not abandoned); never soften a red test (re-3#100, gs-eng#16)
  - A guard reads command text: write such text to a file and run the file (gs-sm#12)
- **E23 `subagent-dispatch`** · rule · EXTEND · [2.1] · one thing: how an agent is briefed and dispatched.
  - Model tiers with the OPUS BECAUSE reasons (gs-sm#18)
  - Partition by file; pull before commit; a change you did not make is another agent's (em#63)
  - Baseline pass counts before agents touch shared code (em#54); next step for a silent agent (em#58); the agent states its time estimate first (gs-sm#24); queue and balance (gs-sm#20)
- **E24 `new-project`** · skill · EXTEND · [2.0] · one thing: start a project with the kit in place.
  - Run `latest-versions` for the whole stack before the first build file (gs-sm#3)
  - Never copy another project's folder to start one (gs-sm#2)
- **E25 `references-use-anchors`** · rule · EXTEND · [2.1]
  - A duplicated anchor fails in the doc that owns it; references that cross projects resolve (em#20, ct#55, gs-eng#52, re-3#132)
- **E26 `plan-and-logs`** · rule · EXTEND · [2.1]
  - Date, time and zone on every log entry (gs-sm#14); state a count once and link it (arc#D54); re-check a stale blocker (arc#A44)
- **E27 `add-lesson-check`** · skill · EXTEND · [2.1]
  - A check's pattern runs on code with comments stripped (ct#56)
- **E28 `unattended-runs`** · rule · EXTEND · [2.1]
  - When several units fit different constants to one shared law, log it and fix the law once with all units' measurements (em#57)
- **E80 `land-branch`** · skill · EXTEND · [2.1]
  - Before landing, list paths changed on the trunk since the branch's base that the branch also touched (gs-sm#21)
- **E29 `write-a-workorder`** · skill · EXTEND · [2.1]
  - Rank a multi-machine queue: enough in the archive, measurable against recordings, earlier work that transfers (em#64)

### 3.3 synth-creator (rank 3: "done" that the user can open, and the dangling workflow-bugs skill)

#### U26 `workflow-bugs` · skill · ADD · [2.0]
One thing: log a fault in how the work is done before fixing it, and close it with cause, fix and what now catches it.
- Log first, WB number never reused, date time and zone, close with cause, fix, what catches it; a written rule alone stays open until a check exists (em#8, gs-sm#15)
- What counts: a wasteful agent, a hook blocking harmless work or missing, the queue misbehaving, a tool losing time or work, the brief itself (gs-sm#16)
- (Fixes C16: `hooks-and-gates` already cites it.)

#### U27 `can-the-user-open-it` · tool + skill · ADD · [2.0]
One thing: prove the binary the user will launch holds the change.
- Search the executable for the bytes of every compiled-in asset; name the file launched (em#10, ct#51, gs-pan#9)
- Which build configuration the launcher resolves (RelWithDebInfo sorts before Release); delete the leftover (em#11, arc#B56)
- Say when the user's running copy predates the build and ask for a relaunch (em#12, arc#A11)

#### U28 `fault-logged` · hook (Stop) · ADD · [2.1]
One thing: send a session back to log when its reply admits a fault and no log was written.
- Admission phrases, log paths from layout.json, never loops, planted replies in its selftest (gs-sm#17)

#### U29 `generate-the-machine-docs` · skill · ADD · [2.1]
One thing: the machine's reference documents are generated from engine source by one command.
- Strict parsers that raise on anything unread; a hand-written head file; one command writes every document (gs-dl#73, gs-dl#74, gs-dl#79)
- Cross-check the source parse with a lock written from the built plugin (gs-dl#75)
- A document states what the code does; differences go to bugs.md (gs-dl#78, arc#A8)
- Two arrow kinds (audio, modulation) with the legend; validate Mermaid with its parser (sd#77, sd#80, arc#B9)

#### U30 `docs-are-current` · check (ctest gate wired by the plugin template) · ADD · [2.1]
One thing: the build fails when the generated documents are stale.
- `--check` in ctest, seen red four ways (add a parameter, move a default, reorder, add a note) (gs-dl#76)

#### U31 `docs-regenerate-on-commit` · hook (pre-commit) · ADD · [2.1]
One thing: regenerate and stage the generated documents when a described file is staged.
- Regenerate, do not refuse; inert without a generator; idempotent install that will not clobber a foreign hook; selftest (gs-dl#77)

#### EXTEND, same job:

- **E30 `done-means-fresh-evidence`** · rule · EXTEND · [2.0] · one thing: "done" rests on fresh evidence.
  - A visible change is done only when the launched binary holds it (run `can-the-user-open-it`); export, build, open, never a PNG of the spec (em#10, re-4#32, gs-pan#9)
  - A shared package change reaches nobody until every unit linking it is rebuilt; name them (em#14, arc#B57)
  - The honest sentence: "written and committed; not in a binary you can open yet" (em#15)
  - A probe deletes its output before it runs and fails if the file is not new (gs-pan#36)
- **E31 `build-through-the-queue`** · skill · EXTEND · [2.0] · one thing: every build and test goes through the queue.
  - Read ctest per-test lines: `***Not Run` is an unbuilt target, not a failure of the unit (em#53)
  - No export job still alive; a "built" that did not relink means delete the generated binary-data folder and reconfigure (em#13)
- **E32 `debug-by-measurement`** · rule · EXTEND · [2.1] · one thing: a fault is found by measuring.
  - An offender that does not move under a swept constant means the measure is wrong (arc#B16)
  - Dump the worst failures, name each shape, gate each (arc#B17)
  - Bisect the baseline before accusing the host (gs-eng#51); a third correction on one control means go back to what it should be (sd#70)
- **E33 `hooks-and-gates`** · rule · EXTEND · [2.1]
  - Wire a guard into every entry point that reaches the guarded thing (sd#66); grep every caller the day a shared trap is fixed (gs-eng#84)
- **E34 `build-step`** · skill · EXTEND · [2.1]
  - At session start check every path, build and address a handoff names exists (arc#B47); say which parts of a shared surface are not built yet (re-4#129)
- **E35 `chart-first`** · rule · EXTEND · [2.1]
  - Before a change bigger than one control, write its blast radius from the chart (arc#A9); compare the generated as-built chart with the committed design chart (gs-dl#81)
- **E36 `long-work-in-the-background`** · rule · EXTEND · [2.1]
  - Every shell-out to a browser or renderer has a deadline; check the artefact before believing the error (sd#84)

### 3.4 workorder templates (rank 4: gates an unattended run passes or not)

- **T1 rebuild.md step 0, grade the evidence** · template line · [2.0]
  - Build it (table with names and ranges), build it tagged (presets but no table), or create nothing and write the findings (re-1#75, em#51, gs-pb#2, gs-pb#3, rd#1, rd#8, gs-ma#113, gs-ma#122)
- **T2 rebuild.md, the clock answer** · template line · [2.0]
  - Every unit answers in laws.md "does it sync, can it be the clock", a no being a law with where it was checked (gs-pb#9)
- **T3 rebuild.md W13 done-when, test-mode count** · template line · [2.0]
  - The panel table holds as many switches, LEDs and pots as the ROM's factory test mode counts (re-3#68, gs-pan#25); the reading itself is a step in `menu-map` (same job: the machine's pages)
- **T4 rebuild.md W15, the machine's own program numbering** · template line · [2.0]
  - Browser and display show the hardware's numbers (A000..H127, 80..99), not list indexes (re-4#20, re-4#54, gs-pan#92, gs-pan#108)
- **T5 generic.md, deliverable count** · template line · [2.0]
  - Before the final report list each deliverable asked and where it is (gs-ui#57)
- **T6 rebuild.md W8, whose arp** (C12) · template line · [2.0]
- **T7 rebuild.md, the no-firmware branch** · template line · [2.1]
  - laws.md's first paragraph states which tags cannot exist; the bank is ours; the `[EAR]` ledger carries the bench session that closes it (re-2#134, rd#11, gs-mb#105)
- **T8 rebuild.md W10, capture plan** · template line · [2.1]
  - Plan the hardware session (absolute Hz per knob, one-knob-per-dump sysex diffs) (re-1#88, arc#D41)
- **T9 rebuild.md W5, an external simulator as oracle** · template line · [2.1] (arc#A33)
- **T10 rebuild.md, shared OS across a family** · template line · [2.1] (rd#12, rd#13)
- **T11 plugin.md, engine step includes its panel layer** · template line · [2.1] (sd#104)

### 3.5 sound-design (rank 5: measuring a law against an emulator or recording with no ear)

`measure-a-law` and `spread-probe` are 18 lines each; the measurement method sits in the playbook's section 26, which no reference file of the global skill even carries.

#### U32 `measure-a-filter` · skill · ADD · [2.0]
One thing: measure a filter's corner, slope and resonance from renders.
- Divide each render by the wide-open render harmonic by harmonic; skip the fundamental (re-3#128, gs-eng#46)
- Never use the clamped maximum as the open reference (re-3#128, gs-eng#47)
- Saw band energy falls 3 dB per octave: subtract the source (re-3#129, gs-eng#48)
- A synth's noise is not white: check the excitation's spectrum first (re-3#130, gs-eng#49)
- Three excitations: saw for a corner, noise for slope and mode, self-oscillation for tuning; fit the whole curve (re-4#121, gs-core#70, ct#16)
- A resonance is a Q, not a level; rows the excitation cannot resolve are NOT MEASURED; report a model-free peak height (re-4#122, gs-core#71)
- Use the corner the engine resolved, not the one the knob names (sd#46)
- Measure at the level the voices drive (sd#47)

#### U33 `measure-an-envelope` · skill · ADD · [2.0]
One thing: measure an envelope's stages and an onset from renders.
- Frame at 20 ms and read the stages; a filter envelope on the spectral centroid (re-3#127, gs-eng#45, ct#17)
- Attack is the first crossing of half the sustained level, not peak time (sd#39)
- Onset by the rise, not a level threshold; test the softest signal (arc#B22, sd#85)
- Arp onsets with a 30 ms refractory period and a test note well inside one frame (re-4#123, gs-core#72)
- Read a pattern's rhythm from a held note when a table scan fails (ct#19)

#### U34 `identify-a-parameter` · skill · ADD · [2.0]
One thing: identify an unknown stored byte by its audible signature.
- Signature table: level not spectrum = gain; spectrum not level = filter; level up and flatness down = resonance; time shape = envelope; periodic = LFO; L vs R = pan; spectral flatness does the most work (re-3#139, gs-eng#59, gs-rds#P10)
- A parameter inert across 0..127 is a switch: try 0, 1, 2, 3 and count positions where output stops changing (re-3#126, gs-eng#44, gs-rds#P11)
- Find a bipolar control's neutral before judging a render (gs-rds#P12)

#### U35 `prove-choices-differ` · skill · ADD · [2.1]
One thing: a choice control's options are proved different from each other.
- Render every option and measure the N x N difference; two that null fail (gs-dl#22)

#### U36 `bank-coverage` · skill + tool `bank-coverage.mts` · ADD · [2.1]
One thing: every control is varied across the bank or exempt with a written reason.
- Distinct values per control, exempt file with reasons, exit 1 on a flat control (gs-dl#49, gs-dl#50)
- A `needs` field names the switch that arms a control (gs-dl#51)
- A coverage gate ships with its counterweight: every program sounds on a held middle C (sd#10)
- Bank generators and loaders fail on an unknown key (sd#28)

#### U37 `full-matrix-first` · rule · ADD · [2.0]
One thing: the engine carries the machine's whole modulation matrix the day its offsets land.
- Never collapse N destinations x M sources into one depth; the panel may expose part (re-3#86, gs-eng#2)

#### U38 `reset-before-apply` · rule + check · ADD · [2.0]
One thing: every switch and exclusive group is reset to off before a patch is applied and at startup.
- No switch defaults on; a patch that omits a section leaves it silent; a census lists each switch's reset value (arc#A3, arc#B7, sd#41)

#### U39 `bank-order-is-append-only` · rule · ADD · [2.0]
One thing: program numbers never move.
- A bank grows by append; display sorts, storage does not; a gate holds each program's name at its number (sd#3)

#### U40 `reference-presets-are-statistics-only` · rule · ADD · [2.0]
One thing: other makers' presets are read for aggregates only; no row, name or body is committed or shipped.
- (gs-pb#38, gs-pb#29)

#### U41 `model-the-mechanism` · rule · ADD · [2.1]
One thing: model the machine's own mechanism, not a generic stand-in.
- A machine's envelope shape is modelled as it is (pitch EG that returns) (re-3#110, gs-eng#27)
- Multimode filter modes are tap mixes of one filter: phase proves it (gs-mb#101)
- Let artefacts come from the mechanism (a clocked switched-capacitor filter) (gs-mb#106)
- Ask per voice or per bank for every modulation source (gs-mb#107)

#### U42 `counter-oscillators-quantise` · rule · ADD · [2.1]
One thing: a counter-clocked oscillator's integer divisor is modelled.
- (re-2#85, gs-mb#69)

#### U43 `gate-both-faults` · rule · ADD · [2.1]
One thing: a fix to a detector is gated against the opposite fault too.
- Late and clipped; peak at 1 ms for "loud enough", after-window RMS for "did it stop" (arc#B19, sd#85, sd#74, arc#B20)

#### U44 `categorise-a-factory-bank` · skill · ADD · [2.1]
One thing: put each decoded factory program in a category.
- Name pass on the last token first, then the machine's category byte, then the patch's shape; print the `Other` share (re-4#29, gs-pan#95)

#### U45 `generate-a-recipe` · skill + tool · ADD · [2.1]
One thing: generate a new synth-neutral patch recipe from real patch statistics.
- Anchor, neighbours, blend two donors, take choice sets whole, vary inside p10-p90, redraw until checks pass (gs-pb#21, gs-pb#22)
- Bank ledger: refuse nearer than p10 of real distances, farthest-point pick, report spread (gs-pb#26)
- One feature-vector function and its scales for recipes and real patches (gs-pb#28, gs-pb#51)
- Never mix hardware and software units; drop default-valued patches from statistics (gs-pb#24, gs-pb#25)

#### U46 `seeds-are-hashed` · rule · ADD · [2.1]
One thing: every item's seed is a hash of (run seed, index), never seed + i.
- (gs-pb#27)

#### EXTEND, same job:

- **E37 `measure-a-law`** · skill · EXTEND · [2.0] · one thing: fit a law by measurement.
  - Name a second independent quantity that must also hold; a low standard deviation cannot see a bias; drop rows that fail it (re-3#140, gs-eng#60, em#102, em#103)
  - Beside any fit whose two parameters trade, a model-free measurement (re-1#58, gs-ma#75)
  - Measure a ratio against a reference inside the same render (re-3#141, gs-eng#61)
  - Write the predicted number before measuring and report the difference (re-3#142, gs-eng#62)
  - A broad peak in a fit means a sign or unit is wrong (re-2#175, gs-mb#63)
  - A named isolation set in every sweep script, printed with each result (re-4#119, gs-core#68)
  - Neutral values derived from the parameter map; the map's default is the displayed value (re-4#118, gs-core#67)
  - Measure the part alone through the same code as the reference (em#104)
  - Fit a pitch table at 440 and 442 and let the adjustment procedure decide (gs-mb#66)
- **E38 `bounce-a-plugin`** · skill · EXTEND · [2.0] · one thing: render a plugin offline.
  - Prove which binary loaded (path, size, version); resolve the path from the emulator's own config (re-1#62, re-4#120, gs-ma#77, gs-core#69)
  - A silent render of the right length: record the microphone to test permission; prove the source before the sink (re-1#39, gs-core#30)
  - Confirm a state load took (load a different patch first; read displays before rendering) (gs-pb#44)
  - Reset every probed offset before each render (gs-eng#50)
  - Enumerate parameters headless as a second naming; drive the emulator with a crafted patch in a spare slot (ct#23, ct#24)
  - Sweep one value per note with settle time, never a knob under a held note (ct#22, em#98)
  - An interactive host first, for minutes [2.1] (re-3#137, gs-eng#57)
- **E39 `compare-to-the-machine`** · skill · EXTEND · [2.1] · one thing: check the build against the instrument.
  - No presets to pair: a published one-knob-at-a-time capture, note for note, tagged `[REF]` (re-2#105, em#85, gs-mb#145)
  - Every comparison also reports a mismatched pair; the verdict is the gap (ct#12)
  - A demo validates, only clean quantities fit; MP3 is empty above about 15 kHz (ct#14)
  - Attack brightness as a within-note ratio; band tables, not one number (ct#26, ct#27)
  - When recordings cannot decide, write the recording checklist that would (em#106)
  - Port gates by the shape that must survive (sd#57); test a residual's explanation by splitting the population (gs-mb#145)
- **E40 `measure-reverb`** · skill · EXTEND · [2.1] · one thing: measure a reverb's decay and quality.
  - Echo density and comb peak beside T60; a right-length reverb can be the wrong sound (em#45)
  - A decay measure returns unusable on a poor fit (em#55)
  - Listen-list of the five faults green metrics miss (em#49)
  - Name the topology of the reference first (re-4#42); per-band T60 asks for a longer low decay (em#48); bands as multipliers (gs-mb#165)
  - Point the window at where the claimed difference lives (re-4#45); reference page of published structures (em#46)
- **E41 `spread-probe`** · skill · EXTEND · [2.1] · one thing: measure how many distinct sounds a bank holds.
  - Render twice first; sections for coverage, reach, settings, spread, twins; notes at C2 C4 C6; floors; a collapse self-test (arc#D31)
  - Instrument excitations (long note, sparse line, held chord); quote the shared metric's inert terms (re-3#114, gs-eng#31, gs-eng#32, arc#D32)
- **E42 `choose-observable`** · skill · EXTEND · [2.1] · one thing: choose what audio can prove.
  - Two controls that sound alike are proved two axes by two measurements (re-4#6)
  - When signal and noise overlap in a quantity, measure another (arc#B15, sd#85)
  - Map a two-axis or macro control by local gradient, then a rendered sweep (sd#58)
  - Measure after a transition, never across it (sd#74); falling-edge trigger, probe tone chosen on purpose (arc#A14)
  - A layer on a harmonic the note already has: measure a ratio; read the start state (re-4#125)
- **E43 `test-off-the-easy-point`** · rule · EXTEND · [2.1]
  - Every velocity layer and a relative threshold (arc#B18); read the block's invariant before gating (sd#53); sums by power (sd#62); suspect a first-time pass (re-3#63)
- **E44 `meter-before-engine`** · rule · EXTEND · [2.1]
  - Autocorrelation period fixes (smallest lag within 90%, last peak over count) (re-4#85, gs-core#55)
  - After a meter fault, re-fit everything tuned against it (gs-pan#39); a decoded menu is proved by moving one value (gs-pb#42); grep the engine for `static`/`thread_local` (gs-core#60)
- **E45 `neutral-is-exact`** · rule · EXTEND · [2.1]
  - A stated default may be the displayed value, not the byte: check a factory patch (re-4#118); each source's switch leaves the others' level unchanged (sd#54)
- **E46 `algorithms-are-data`** · rule · EXTEND · [2.1] · one thing: the right KIND of effect, as data.
  - Kinds table a probe can assert (phaser, flanger, chorus, comb, delay) (re-4#74, gs-eng#90)
  - The level fall between repeats tells a delay from a reverb (re-4#77, gs-eng#93)
  - An edit-matrix row is a signal-flow claim; a delay reads the input (re-4#75, gs-eng#91)
  - Lengths are a third of a replica (gs-ma#133)
- **E47 `waveforms-and-octaves`** · rule · EXTEND · [2.1]
  - Layers share one filter and one envelope unless the original separates them (re-4#87, gs-eng#98); a wave entry records its generation and behaviour above Nyquist (re-4#88, gs-eng#99); seed per slot (gs-eng#102)
- **E48 `presets-are-named-and-neutral`** · rule · EXTEND · [2.1]
  - Categories from the machine's bank, `Other` last and small, frozen (re-4#17, gs-pan#89)
- **E49 `design-a-preset`** (references) · EXTEND · [2.1]
  - Effects units: routing profiles, the player's copy, three-source test, chain laws, spring/freeze/ducked hall, effect recipe cards (gs-dl#46, #47, #48, #52, #54, #58, #60, #62, #63)
  - Bank tiers 3/30/100, signature move, one-hand demo (gs-dl#65); envelope- and LFO-engine checklists (arc#B31-B36); bass lessons (sd#38); filter-envelope shapes (gs-pb#23); must-route list per kind (gs-pb#22)

### 3.6 midi (rank 6: the clock law the kit trimmed)

The kit's `clock-law.md` is `midi-law.md` with sections removed (em note, gs-rds note). Restoring them is EXTEND of one reference, not new units.

#### U47 `nrpn-and-packed-values` · rule · ADD · [2.0]
One thing: NRPN numbers and packed controller values are decoded and written back exactly.
- `(MSB<<8) | LSB`; an LSB can select a namespace; packed NRPN carries several parameters as ranges; export writes them back; checked against the chart (arc#D42, gs-core#38)

#### U48 `vendor-sysex` · skill · ADD · [2.1]
One thing: recognise a vendor's sysex frame and record conventions.
- Roland: frame, DT1/RQ1, `(128 - sum) & 0x7F` over address and data, 7-bit address arithmetic, 256-byte limit and 40 ms gap, model id width, trigger addresses (em#90-96, re-4#115, re-4#116, gs-eng#124)
- Nibble splitting (address map steps by 2), nibble-fraction test (re-4#117, gs-eng#125, gs-ma#126)
- 1997-2000 conventions: name at 0, offset-64 bipolar, sync flag beside division; Korg bit-packs (re-4#114, gs-eng#123)
- Put the machine in the mode that transmits; open a file as text first (em#96, re-4#116, gs-eng#126)
- Radix-128 addresses; names start digits at 1 (re-1#91)

#### U49 `midi-from-firmware` · skill · ADD · [2.1]
One thing: read what MIDI a machine honours from its receive handler.
- (re-2#158, gs-mb#109)

#### U50 `find-the-division-table` · skill · ADD · [2.1]
One thing: find a machine's note-division table and read it in the right order.
- Stored once as small tick integers: search by arithmetic at the PPQN; per-destination tables are the check (gs-rds#T11, em#31, em#33)
- Read a two-column list row by row; prove by ascending duration; the appendix first (gs-rds#T12, em#32)
- Prove note values by exact ratios to the stored tempo; mark interpolated rungs (gs-rds#P16)

#### EXTEND, same job:

- **E50 `does-it-sync`** · skill · EXTEND · [2.0] · one thing: decide whether and how a machine syncs.
  - Which clock the manual means: audio clock vs tempo clock; never search "clock" (gs-rds#T3, em#26, re-2#15, re-3#151, gs-eng#71)
  - The note-value or tempo-source test (gs-rds#T4)
  - Three false positives: Sync as a mod type, BPM in a preset name, "a reverb keeps time" (gs-rds#T5, em#27)
  - Record what the hardware did and what our unit slaves as two facts (gs-rds#T6, em#28, re-3#152, gs-eng#70)
  - Strings sweep `tempo|bpm|sync|midi clk` first; a `CMPA #$F8` is usually a range test (re-1#79, re-2#19, gs-ma#143)
  - What it SENDS: the fourth state (output jack, DLY/CLK switch, metronome) (gs-rds#T15, em#36)
  - One switch or one per destination, and what runs with no clock (gs-rds#T18, em#38)
  - Per revision; the per-parameter TIME flag census (envelopes stayed unsynced); count the note twins; n/24 count parameters (re-2#14, re-2#17, gs-rds#T10, gs-ma#116, em#62)
- **E51 `clock-law.md`** (clock-probe reference) · EXTEND · [2.0] · one thing: the clock law.
  - Restore section 0 (two clocks), the fourth state, stopped host, one switch, naming rows (MIDI with no EXT, two-state switch) (gs-rds#T15, T17, T18, T21, em#36, em#37, em#41)
  - Re-anchor to a DAW only on a jump; median-filter pulse gaps; release the lock on silence; one stream out (re-3#159, re-3#160, gs-eng#77, gs-eng#78)
  - Tempo stored as a machine knob and the shell's BPM are one value, two faces (re-3#148, arc#D44)
  - `phase()` reports the block's start; sync may restart phase rather than lock rate; query a dynamic destination live (re-3#161, re-3#163, gs-rds#T22, gs-eng#80)
- **E52 `sync-is-a-mode`** · rule · EXTEND · [2.0]
  - C6: the default at open, two cases (gs-rds#T1)
  - SOURCE as a fourth state (gs-rds#T15)
- **E53 `clock-probe`** · skill · EXTEND · [2.0]
  - Probe "on when it opens" at 120 vs 90 with no touch (gs-rds#T2)
  - Run with the transport playing; zero the division when isolating a tap (gs-rds#T17, gs-rds#T9)
  - No time destination: gate through an LFO-rate destination at three tempos [2.1] (re-3#31, gs-mb#143)
  - Transport jump, loop and time-signature probe [2.1] (arc#B6)
- **E54 `measure-the-clock-in-audio`** · rule · EXTEND · [2.1]
  - Each tap lands on the grid at an absolute time; when a parameter changes type, grep every gate for it (re-3#155, sd#30, gs-eng#73)
  - Round event offsets, never truncate (re-3#173); an absolute time (flam) does not move with tempo (gs-mb#142)
- **E55 `sysex-is-a-record`** · rule · EXTEND · [2.1]
  - A parser keeps a field as stored; a reading stands only with zero violations over the corpus (arc#D43)
  - Round-trip the plugin's own export of an edited patch (re-4#30)
- **E56 `imports-count-every-loss`** · rule · EXTEND · [2.1]
  - One report row shape: field, status (mapped, approximated, clamped, lost), asked and given (gs-pb#31); a name match is not a numbering match (arc#A4)

### 3.7 audio-core (rank 7: stored data that must not move, and panel controls)

#### U51 `keys-belong-to-the-keyboard` · rule · ADD · [2.0]
One thing: the computer keyboard plays notes and nothing else takes it.
- The key listener sits on the top-level window and returns true for every plain key, or macOS plays its alert before each note; a test confirms no alert (re-4#127, re-3#145, gs-pan#64, gs-eng#66)
- Arrow browsing goes through the same listener, returning false for keys it does not own (re-4#21, gs-pan#93)
- A hosted editor opens as an overlay, never a window, so the keyboard stays live (re-4#37)

#### U52-U56 split of `panel-surface-and-sections` (C1, DECIDED) · five rules · ADD · [2.0]
One thing each: `panel-surfaces`, `column-names`, `section-header-and-lamp`, `panel-tabs`, `instance-grid`. Depth moves to `depth-is-designed`. Carries the tab conventions [2.1] (sd#24).

#### U57 `pan-and-mix-equal-power` · rule · ADD · [2.1]
One thing: pan and dry/wet are equal power.
- Centre reads 0.7071 each side, L^2+R^2 = 1 everywhere (re-4#1, gs-pan#83)

#### U58 `panel-colour-safe` · rule · ADD · [2.1]
One thing: no state is shown by colour alone and role colours survive colour blindness.
- Lit state is shape plus colour; role pairs checked under deuteranopia and protanopia; three viewing conditions; labels 4.5:1 on the rendered panel (gs-dl#38, gs-pan#34)

#### U59 `signal-reads-left-to-right` · rule · ADD · [2.1]
One thing: a panel's layout follows the signal.
- Signal left to right, master output rightmost with its meter, display top-centre, modulation in its own panel (gs-dl#35)

#### EXTEND, same job:

- **E57 `parameter-ids-never-change`** · rule + hook `param-id-lock` · EXTEND · [2.0] · one thing: what a host stored stays valid.
  - Lock ORDER, kind and a choice's members in order, not only ids; only append; print the first divergence; plant an insert (sd#2)
  - A change of range, step count or scaling breaks stored automation like a rename; never a second control over one byte (arc#D37, arc#A26)
  - Lock bound panel control ids too, with a hand-moved `retired` list (sd#1, re-4#69)
  - The first instance of a shared mechanism keeps every old id (sd#72)
- **E58 `control-reaches-every-surface`** · rule · EXTEND · [2.0] · one thing: a control's value reaches engine, display, host and stored state.
  - Wheels, bend, aftertouch and matrix-only controls gated in rendered audio with the route wired (sd#6)
  - A save after an edit changes the record bytes; load then save with no edit moves zero bytes (arc#D59, arc#A25)
  - Every parameter has a reader; engine parameters with no control are listed as not exposed (arc#A37, re-3#101, gs-eng#17)
  - Every drawn control's parameters audible with their enabling switches opened (sd#100)
  - Each parameter default equals its engine field's initialiser [2.1] (arc#A24)
- **E59 `patch-excludes-performance-controls`** · rule · EXTEND · [2.1]
  - Selectors and edit-focus controls are session state; solo and bypass clear or stick by a written choice; routes are patch data (re-3#87, arc#D58, arc#A40, gs-eng#3, re-4#53)
- **E60 `smooth-continuous-parameters`** · rule · EXTEND · [2.1]
  - A synced or base delay time slews per sample (about 60 ms), recirculation first, snapping after reset (re-3#157, sd#32, gs-eng#75)
  - Meter reconfiguration clicks by settled-minus-arrived subtraction, mid-leg (sd#52)
- **E61 `every-time-control-syncs`** · rule · EXTEND · [2.0] (C9)
  - Rhythm syncs, timbre never; FREE first on dual-use; a reproduction offers what its hardware flagged (re-3#156, sd#31, gs-eng#74, re-2#16)
  - Tempo extras: a fresh chord fires at once, swing never touches a delay or LFO, bypass keeps the clock [2.1] (gs-dl#16)
- **E62 `house-control-behaviours`** · rule · EXTEND · [2.1]
  - The on-screen and QWERTY keyboard play the unit's note map (drum machine at 36), the map printed (re-4#126, gs-pan#63)
  - Wheels spring and stay, transpose as a parameter; voice-allocation controls in the keyboard section (re-4#128, re-4#124, gs-pan#65, gs-pan#66)
  - Each action's feedback; a radio group never shows two lit cells; a click outside a menu only closes it (gs-dl#12, sd#99); buttons over a continuum write its one parameter (arc#B39)
- **E63 `new-panel-control`** · skill · EXTEND · [2.0] · one thing: add a control to a panel with its job proved.
  - Mode key or value key: exclusive with what, what neither-lit means, what lights, what the display shows (gs-pan#12)
  - A source tag for what each control does (gs-pan#11)
  - Lamps: grep the manual for `lit <colour>`, confirm a bicolour 3-pin LED on the schematic (re-3#67, gs-pan#23, gs-pan#24)
  - Centre-off three-position switch kind; an editable readout is a control; each screen addressed by id (sd#19, re-3#76, gs-pan#46, gs-pan#49, gs-pan#44)
- **E64 `trace-parameter`** · skill · EXTEND · [2.1]
  - When sound moves after UI work, diff DSP and parameters against the reference first (sd#4); read defaults from the running plugin (sd#42); check a wrong binding's neighbours (re-3#104, gs-eng#21); check the provenance column first (re-3#56, gs-core#58)
- **E65 `copy-and-prove`** · skill · EXTEND · [2.1]
  - Render at a real velocity and level, and against the source's built plugin (sd#96)
  - A local compensation carries a test that fails when upstream is fixed (re-4#46)
  - Moving into a shared component: shim, host keeps the format, local ids with prefix or map (sd#11); a block lists the hardware facts it assumed (arc#B10); a shared-block change defaults to identity (gs-mb#164); exhaustive equality over the domain (em#108); partial entries listed (sd#92); geometry and ranges re-derived on the new host (sd#87)
- **E66 `module-kill-switch`** · rule · EXTEND · [2.1]
  - Bypass passes input through (arc#B8); a pinned parameter's stored value is read and overridden, never overwritten (gs-dl#21); the voice counter shows the multiplied figure (gs-dl#19)
- **E67 `settings-layer-owns-the-devices`** · rule · EXTEND · [2.1]
  - 128-sample buffer on first run; no input bus on a synth; latency proved by an onset probe (re-4#55, gs-pan#109, gs-eng#69, re-3#146, arc#A41)
- **E68 `panel-sizes-by-kind`** · rule · EXTEND · [2.1]
  - Wrap a long legend, never shrink it; LED list pitch font + 1 (arc#B52, gs-pan#114, re-4#23); a control below its width floor drops chrome, not value (sd#21)
- **E69 others, one line each** · EXTEND · [2.1]: `filters-stable-under-modulation` sweeps the whole control grid (sd#49); `recursive-state-nan-guard` covers the limiter and the probe counts NaN (sd#105); `double-where-precision-matters` adds slew states (sd#33); `cpu-worst-case-per-block` adds the note-on block and idle voices (sd#103); `synth-cost` ledger names the program measured (re-4#38); `reverb-loop-gain-bounded` covers any multi-path feedback, scale reported (re-4#5); `nonlinear-stages-antialiased` aligns a parallel layer's latency (sd#48); `measure-tone` reads a drive control per step and asymmetry as a bias inside the gain (sd#43, sd#44, sd#51); `knob-anatomy` transforms move attached geometry, legends within a control height (gs-dl#27, re-4#50); `colour-by-role` lightness and saturation bands, section bars at constant L and S (gs-dl#5, sd#15); `audio-ui-thread-handoff` waits for the block in flight (re-4#35); `editor-paints-what-changed` dirty rect holds the drawn footprint with its glow (sd#34); `panel-gestures` C2 and C14 clauses, automation echoed dim (gs-dl#11).

### 3.8 instrument-shell (rank 8)

#### U60 `build-stamp-on-the-panel` · rule · ADD · [2.0]
One thing: every plugin shows which build it is.
- Git count and hash, `+` when dirty, top right (re-4#56, arc#A42, gs-eng#12, re-3#96)

#### E78 `hit-the-painted-control` · skill · EXTEND · [2.0] · one thing: prove each painted control by hitting it (reaching every state is part of reaching it)
- Step every page and tab before walking controls (sd#25)
- The painter reports draws attempted vs drawn (sd#8)
- Lit and unlit differ in the face, looked at as a pair (sd#22)
- The coverage probe walks the table the panel is drawn from (re-3#79, gs-pan#51)
- A drawn-curve drag through the real window, past the edges [2.1] (sd#97, arc#B33)

#### U62 `patch-inspector` · rule · ADD · [2.1]
One thing: stored, live and previous values of the patch are visible on a key.
- (re-3#96, gs-eng#12, re-4#56)

#### U63 `effects-have-an-audition-source` · rule · ADD · [2.1]
One thing: an effects unit can be heard with no DAW.
- Click, drum loop, held chord; additive, periodic, ramped test signals with a click probe at zero (re-4#16, re-3#169, re-3#178, gs-pan#70, gs-pan#71)

#### U64 `a-scope-is-honest` · rule · ADD · [2.1]
One thing: a scope shows the signal at a fixed scale, triggered by the engine.
- (re-4#64, gs-pan#116)

#### U65 `selection-never-dangles` · rule · ADD · [2.1]
One thing: a selection clears when what it points at is deleted or reshaped, and an empty one says so.
- (re-4#7, gs-pan#85)

#### U66 `one-owner-of-the-notes` · rule · ADD · [2.1]
One thing: exclusion between note sources lives in the state.
- (re-3#175, gs-pan#81)

#### U67 `caps-are-one-limit` · rule · ADD · [2.1]
One thing: a pool's cap, its grid and its counter type are one number, and overflow is refused aloud.
- (re-3#172, gs-pan#75, gs-pan#76)

#### U68 `window-opens-from-the-display` · rule · ADD · [2.1]
One thing: the editor opens at a size computed from the display, by one function the snapshot tool also calls.
- Scale formula, buy type from height, fit pass order, judge at opening width (re-4#22, re-4#23, re-4#24, gs-pan#113, gs-pan#14, gs-pan#55, gs-dl#7)

#### U69 `layout-defaults-are-measurements` · rule · ADD · [2.1]
One thing: a layout default is a measured condition, and navigating never marks the layout touched.
- One axis with a middle is one state byte and two cells (re-4#57, re-4#59, gs-pan#110, gs-pan#112)

#### EXTEND, same job:

- **E70 `seams-are-declared`** · rule · EXTEND · [2.1]
  - Every bundled resource of a multi-machine plugin carries the machine's prefix (re-4#18, gs-pan#90)
  - An optional seam a unit lacks greys its button (re-3#167, gs-pan#61)
  - Rebuild both sides of an A/B render together, baseline under `.claude/worktrees` (re-4#63, gs-pan#118; C3)
  - A declared opt-out also leaves the dependency out of the build; recursion stopped by the build (re-4#40, re-4#36)
- **E71 `session-blob-append-only`** · rule · EXTEND · [2.1]
  - The old blob as a literal in the test, each old field's offset asserted; a refused header leaves state untouched; Newer reports what dropped; a unit's own legacy format first; libraries live beside the bank, not in the blob (re-4#13, re-4#15, re-3#174, gs-pan#122)
- **E72 `render-the-extremes`** · rule · EXTEND · [2.1]
  - Re-render the narrowest machine whenever a tab joins the header; the tabs give way, not the transport (re-4#9)
  - The overflow walk covers every row container (sd#65); a page select carries an off-default mark and hit regions switch on the first frame (re-3#83, gs-pan#58, gs-pan#56); art rendered at 75 and 200 per cent (arc#B53)
- **E73 `fold-keeps-every-route` / `quiet-announces-itself`** · EXTEND · [2.1]: every state is escapable by the control that entered it (re-4#58); a "way back" message has its own line (re-4#61, gs-pan#112)
- **E74 `gates-from-commit-one`** · skill · EXTEND · [2.0]
  - Name where the skeleton comes from (decision D1 below) (re-1#1, gs-pb#1, gs-core#51)
  - Build the per-program RMS probe and the inspector before the first listening session (re-3#96, gs-eng#12)

### 3.9 cpp, shell (rank 9)

- **U70 `cpp-no-pointer-into-growing-container`** · rule · ADD · [2.1] · one thing: never keep a pointer or `c_str()` into a container that can grow; gate the editor in a fresh process (sd#101)
- **U71 `kill-only-your-own`** · rule (shell) · ADD · [2.1] · one thing: a script stops only the processes it started (sd#94)
- **E75 `build-preflight`** · skill · EXTEND · [2.1]: re-configure after adding a globbed source file (gs-pan#43, em#13)
- **E76 `shell-strict-and-quoted`** · rule · EXTEND · [2.1]: verify a write by its artefact and exit code, never by an echo after `;` (sd#73); after a sed rename, grep the quoted literal (sd#89)

### 3.10 ui-craft, web (rank 10: web pages, not panels)

These came from taste-skill and image-to-code; the kit already took both (ui-craft `SOURCES.md`). Only E79 touches a plugin panel.

- **E79 `apps-are-not-pages`** · rule · EXTEND · [2.1]: the ui-craft page rules do not bind a plugin panel; point at analyse-reference-look and gpu-painter (gs-ui#38)
- **E77 [2.1] one-line extensions:** `page-critique` adds a last read-through of every visible string and the section-variety caps (gs-ui#24, gs-ui#19); `interface-copy` one label per intent, no wrap, ASCII dashes (gs-ui#16, gs-ui#36); `type-space-colour` one radius scale, one ground per page, optical centring, same-family emphasis and descender room (gs-ui#14, gs-ui#27, gs-ui#52, gs-ui#8); `page-holds-its-frame` hero caps (gs-ui#18); `no-generated-look` one icon family (gs-ui#7); `redesign-page` preserve or overhaul, frozen routes and events (gs-ui#37); `build-from-reference` regenerate, never crop (gs-ui#43); `web/client-boundaries` no per-frame state (gs-ui#6); `web/web-performance` LCP, INP, CLS numbers (gs-ui#31); `web/styles-live-in-stylesheets` z-index scale, fixed grain (gs-ui#32); `web/ui-primitives-one-module` one design system (gs-ui#3); `web/preflight-build` no `#` links, no alert, 404, favicon (gs-ui#53); `ui-no-furniture-text` more strings (gs-ui#35); `start-from-a-workorder` render the mock-ups when an image tool is attached (gs-ui#42).

### 3.11 Decisions this list needs from you (not conflicts, gaps with a choice in them)

- **D1 The skeleton.** `gates-from-commit-one`: "The kit describes the skeleton; it ships none." Three sources say a unit must start from a generator with every gate running (re-1#1, gs-pb#1, gs-core#51). Choose: ship a generator in instrument-shell (largest single item here), or keep describing it and name the generator in each project's CLAUDE.md. Recommend the generator in 2.1, the description stays for 2.0.
- **D2 A default UX shell spec.** The shell's contents (top bar, keyboard band, tabs, explorer, FX chain, window split, arp spec; gs-pan#92-#101, gs-dl#17, re-4#27, re-4#35) are one product's design, not method. Recommend: not in the kit; the general laws under it are U60-U69 above.
- **D3 Reference data.** Tim's Atlas scripts (patches-database, patch-generator) cannot run for another user. Recommend: the kit keeps the baked tables (design-a-preset) plus U45; the skills stay Tim-only.

## 4. Obsolete: left out, with what replaced it

| # | item left out | source ids | replaced by |
|---|---|---|---|
| O1 | First make the UI as an HTML page or designer page, export it | sd#13, sd#23, gs-dl#40, gs-pan#33 | `synth-creator/rules/ui-drawn-in-code.md`, check `no-html-prototype` |
| O2 | Serve the panel live on a port, `/check` in headless Chrome | ct#54 | `instrument-shell/rules/render-the-extremes.md`, `page-matches-reference-look` |
| O3 | synthpanel-creator spec, rows, themes JSON, `export-native`, bindings.json `kind`, `validate` in CI | re-3#71, gs-pan#33, gs-dl#33, gs-dl#40 | `ui-drawn-in-code` (one control table builds the panel), `new-panel-control` |
| O4 | Panel fixes made in the panel package, never the synth | re-3#70, gs-core#80, gs-pan#22 | `ui-drawn-in-code`; the shared-shell half is in `seams-are-declared` |
| O5 | Value arcs baked into shared sprites; one sprite per size | re-3#74, gs-pan#48 | `ui-drawn-in-code` (no sprites) |
| O6 | Lossy sprite cache key ("B", "B -", "B +") | re-3#75, gs-pan#41 | `ui-drawn-in-code` (no sprite cache) |
| O7 | Sprite name mangling, multi-screen export text, short-panel capture offset, CMake glob of sprite assets | re-3#81, gs-pan#43 (sprite half) | `ui-drawn-in-code`; the general re-configure lesson kept as E75 |
| O8 | kPanelW/kPanelH against panel.json size | re-3#78, gs-pan#45 | `rebuild.md` W13.2 (one control table, no second number) |
| O9 | Legend baked into the background vanishes; anything printed on a control is part of it | gs-pan#40 | `ui-drawn-in-code` |
| O10 | "Bake is not build" | gs-dl#24 | `ui-drawn-in-code` plus E30 |
| O11 | Replica-theme SVG technicals (fixed userSpace glow region, textLength, style-attribute colours) | gs-dl#37 | `ui-drawn-in-code`; the clear-zone and colour-alone lessons live in U58 |
| O12 | CSS layout lessons from the designer page (`min-height:0`, ghost legend, `visibility:hidden` pages, CSS padding vs raster) | sd#16, sd#20, sd#23, sd#26 | `ui-drawn-in-code` (no page) |
| O13 | Cluster geometry table and `nameDown`/`pull` cell parameters of the panel generator | sd#68, sd#69 | `audio-core/rules/knob-anatomy.md` (hub and satellites); the numbers belonged to the generator |
| O14 | Accent census lock of the panel generator | sd#71 | `colour-by-role` (role, not per-knob letters) |
| O15 | The live layout engine's template-literal backtick test | re-4#70, gs-pan#120 | no generator in the kit |
| O16 | Web view for the plugin UI | gs-pan#31 | `ui-drawn-in-code` (already covered; listed so it is not re-proposed) |
| O17 | Worktree for the A/B baseline beside the project | re-4#63, gs-pan#118 | `base/rules/work-inside-the-project.md` (C3) |
| O18 | Port MAME's disassembler into the library | re-1#87, gs-ma#88 | `house-tools-live-in-the-library.md` (C4) |
| O19 | The rack page, `UNITS` constant, `machines.tsv`, a unit joins the rack when it builds | em#25, gs-pb#18, gs-core#64 | `land-branch` and `done-means-fresh-evidence`; house launcher |
| O20 | Parts catalogue per role with `drift_check` against synthcatalog | em#19, gs-pb#20 | `copy-and-prove` (house catalogue is project data) |
| O21 | Archive lookup tool `eprom-lookup.py`, `sync-from-playbook.py`, README and index generators, fetchers | gs-core#73, gs-core#77, ct#65, ct "fetchers" | the reference library and `chip-search`; archive housekeeping |
| O22 | Generated `recon.md` per archive folder | ct#64, gs-mb#171 | U1/U2 (triage and CPU identification run per build); recon notes are leads |
| O23 | "Sync only what the hardware could sync" (earlier law) | gs-pan#69 | `clock-law.md` section 6 and `sync-is-a-mode` (sync all rhythm, default per C6) |
| O24 | "[PAUSED - X of Y. Send continue]" at a breakpoint | gs-ui#58 | `base/rules/unattended-runs.md` |
| O25 | Three design dials, combinatorial variation engine, section packs, block library | gs-ui#2, gs-ui#41, gs-ui#46, gs-ui#48 | `web/skills/design-direction`, `page-holds-its-frame` |
| O26 | Glassmorphism, GSAP sticky stacks, scroll pinning, parallax and other upgrade techniques; blurred filler photos | gs-ui#4, gs-ui#29, gs-ui#30, gs-ui#54, gs-ui#55 | `no-generated-look`, `motion-is-rare`, check `ui-no-scroll-hijack`, `pictures-do-a-job` |
| O27 | Tim's Mac shell setup (zsh vs bash 5, Homebrew GNU first, New York time) | gs-sm#7, gs-sm#8, gs-sm#14 (time zone) | `global/hooks` gnu-shell, shell-traps; per-machine, not method |
| O28 | Tim's Atlas scripts (ask.py, genpatch.py, atlas_save.py), the Matrix-12 adapter and its JSON | gs-pb scripts table | per-user data (D3); the method is U45, U46, E56 |
| O29 | Per-machine ledgers of section 12 (addresses, offsets, findings per machine) | re-1#92, gs-ma section 3, gs-mb | data, not method; each machine's own repo |
| O30 | Admiral check-signal hook, statusbar-activity display hook | gs-sm#25, gs-sm#26 | `packs/admiral`, `base/tools/statusline.mjs` |

## 5. Global skills: what is still missing after the additions, and can it be disabled

"After 2.0" means every [2.0] unit above has landed; "after 2.1" means all of section 3.

| global skill | bears on builds | still missing after 2.0 | after 2.1 | disable? |
|---|---|---|---|---|
| firmware-recon | yes, the first moves | nothing of method: triage (U1), CPU identification (U2), boundary rule (U3), base (U4), timer (U8), DSP carve (U7), order of work (U6) all land in 2.0. The per-CPU house disassembler table lives in the library README (E12) | none | yes, after 2.0 |
| synth-re | yes, decode technique | `find-a-table` (U12), `place-a-bit-field` (U14), `diff-the-revisions` (U15), `read-the-formatter` (U16), `manual-pass` (U17), `map-the-io` (U18), sample ROMs (U20); the disassembler scripts (dis6301, dis8051, mcs48dasm, extract_dsp, setup-re-tools) must reach the library shelf | none, once the scripts are shelved | after 2.1 (it is user-invoked only, so leaving it on costs nothing meanwhile) |
| patch-decode | yes | `a-field-may-be-an-index` (U13), flag bits (U14), division ratio proof (U50) | none | after 2.1 |
| panel-from-the-real-unit | yes, panels from photos | nothing: grade, exact-model stop, rack table, remote, ranking (E19), shape and overlap gates (E20), mode keys and lamps (E63), faceplate rule (E6), can-the-user-open-it (U27) | none | yes, after 2.0 |
| tempo-sync | yes | the division table skill (U50), "LFO-rate observable" and transport probes (E53 [2.1] lines), measure-the-clock extras (E54) | none | after 2.1; C6 must be decided first, since this skill holds the newer default |
| synth-design-law | partly | panel accessibility (U58), layout (U59), echo and feedback details (E62, E69), N x N choices (U35), tempo extras (E61 [2.1]); the shell defaults are D2 | shell spec stays out (D2) | after 2.1 |
| preset-design-law | partly | effects-unit preset method, bank tiers, coverage (E49, U36) | none | after 2.1 |
| synth-diagrams | yes | generated docs, currency check, regenerate hook (U29-U31) | none, once its two scripts move with selftests | after 2.1 |
| build-a-unit | yes | nothing in method after 2.0: evidence grade (T1), clock answer (T2), bank-name gate (part of U22 and E1), finish audit (U27); the skeleton is D1 | D1 | yes, after 2.0, if D1 is answered "describe" |
| patch-generator | partly | U45, U46 (2.1) | the Matrix-12 adapter stays Tim-only (D3) | keep as Tim-only; its method is in the kit after 2.1 |
| patches-database | no (Tim's data store) | U40 lands in 2.0; mining pitfalls in E38 and E44 | none | keep as Tim-only |
| workflow-bugs | yes, how a build is run | nothing (U26) | `fault-logged` hook (U28) | yes, after 2.0 |
| new-project | yes | nothing (E24); two skills with this name clash while both are on | none | yes, after 2.0 |
| latest-versions | yes | nothing: it IS the kit's `global/skills/latest-versions`, installed by `global add` | none | only if every kit user runs `global add`; otherwise keep |
| shell-rules | little | guard-safe edits (E22) lands in 2.0; the rest is this Mac (O27) | none | yes, after 2.0; the hooks keep working without it |
| output-skill | yes, unattended output | nothing (U24, T5) | none | yes, after 2.0 |
| taste-skill | web only | nothing for plugin builds; web lines are E77 | none | yes now for plugin builds; after 2.1 for web |
| image-to-code-skill | web, weakly | regenerate-not-crop and agent-made mock-ups (E77) | none | yes now for plugin builds |
| redesign-skill | web only | nothing | none | yes, now |
| agent-jobs (and global hooks agent-model, agent-log, log-check) | yes, agent cost and logging | model tiers (E23) are 2.1; the `agent-model` hook, per-agent ledger and overlap-at-landing check are not proposed as 2.0 units | add them as 2.1 hooks: `agent-model` (PreToolUse on Agent), `agent-ledger` (SubagentStop), and an overlap step in `land-branch` (gs-sm#18, #19, #21) | not before 2.1 |

Not about builds, leave as they are: machine-identity, operator, pi-delegate, tim-writing, reddit-writing, devto-writing, brandkit, kanopy-deploy, profiles, reddit-apify-scraper, tim-capabilities, advanced-skill-writer, synced. Not audited: `~/.claude/skills/.trash` (161 folders); worth one look before the global skills are switched off.

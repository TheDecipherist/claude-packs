# Kit 2.0: the remaining items, sorted against the kit's own text

Read against claude-packs `work/2.0.0-typescript` (every rule, skill, check and template an item touches was opened and read). DECIDED.md overrides DECISIONS.md throughout, including the two later coordinator notes: E57 drops its "lock the order" line (JUCE hashes VST3 ParamIDs from the string id), and E57 + U39 are decided into the new release-lock unit.

Sort used:
- **ADDITIVE**: adds something new or a missing step, and alters, rewords, narrows or reverses nothing the kit says. Taken as recommended.
- **CHANGES**: alters existing kit text or behaviour, or contradicts it. Listed with the kit text it touches.
- **ENFORCEMENT**: a new or extended hook, check or gate that would refuse something the kit allows today.
- **SHELL**: exists only because of the synth shell. Obsolete under C12. Listed so the user can confirm with one yes.
- **DECIDED**: already settled in DECIDED.md. Taken in the decided wording.

## 1. Counts

| group | total | ADDITIVE | CHANGES | ENFORCEMENT | SHELL (obsolete) | DECIDED | other |
|---|---|---|---|---|---|---|---|
| New units (U25-U74 less U52-U56; U61 and U72 do not exist) | 43 | 28 | 4 | 4 | 1 (U69) | 3 (U26, U38, U39) | 3 serve more than one thing (U36, U41, U70) |
| Extension lines (E1-E80, line by line) | 276 | 236 | 15 lines (14 items) | 2 | 8 | 15 | |
| Template lines (T1-T11) | 11 | 4 | 6 | 0 | 0 | 1 (T6, C12) | |
| Choices (D1-D3) | 3 | | | | | | 3 for the user |
| Obsolete rows (O1-O30) | 30 | | | | | | 28 confirmed, 2 doubtful |

**The user must see 38 items:** 24 CHANGES (4 units, 14 extension items, 6 template lines), 6 ENFORCEMENT, 3 one-thing splits, 3 D choices and 2 doubtful obsolete rows. Nine SHELL lines need one confirming yes as a group. Two lines that conflict with a decision (E19.5 against C8 and E21.1 against C7) are replaced by the decided text, with no question asked.

## 2. CHANGES

### New units

| id | what changes | existing kit text | recommendation |
|---|---|---|---|
| U51 `keys-belong-to-the-keyboard` | "Nothing else takes the keyboard" collides with typing a value | `audio-core/rules/panel-gestures.md`: "Alt-click to type a value" | Take reworded: "...nothing else takes it, outside a text field the user opened". |
| U57 `pan-and-mix-equal-power` | Makes equal-power pan law apply to every unit, reproductions too | `reverse-engineering/rules/reproduction-or-original.md`: "On a reproduction, the machine is the spec. Its naive saw, its aliasing and its linear pan are the instrument" | Take reworded: "on an original". |
| U58 `panel-colour-safe` | "Lit state is shape plus colour" would override a machine's colour-only LEDs and the house toggle | `reproduction-or-original.md` (as above); `audio-core/rules/colour-by-role.md`: "A toggle brightens its cap and has no LED" | Take reworded: on an original, with the brightened cap counted as a shape change. |
| U59 `signal-reads-left-to-right` | Prescribes a layout that would override a reproduction's own positions | `reproduction-or-original.md`: "a reproduction has the same sections, positions and labels"; `instrument-shell/rules/render-the-extremes.md`: "Build a reproduction with its own sections, fractional positions..." | Take reworded: "on an original". |

### Extension lines

| id | what changes | existing kit text | recommendation |
|---|---|---|---|
| E6.1 (`reproduction-or-original`) | "Keep a firmware anomaly, **switchable**": a switch is a control the machine never had | `reproduction-or-original.md` Never: "Invent a global control on a reproduction. It rewrites every preset." | Take reworded: keep the anomaly as the machine has it, footnoted, with a test. No switch. |
| E9.5 (`gather-sources`) | "The parts list first" can be read as a new first step, ahead of the manual | `gather-sources/SKILL.md` step 2: "...This is the fastest step there is: do it before everything below." | Take reworded: "in the service manual, read the parts list first". |
| E9.13 (`gather-sources`) | Allows times read off printed waveforms once graticule tests pass | `gather-sources` step 9: "Take ratios from a redrawn trace, never absolutes." | Take reworded: a printed scope photo with a graticule may give a time once its graticule and same-size tests pass; a redrawn trace still gives ratios only. |
| E9.14 (`gather-sources`) | "No dump possible: say so and stop" could halt the whole run | `gather-sources` step 10: "...and go on with the next source"; `base/rules/unattended-runs.md`: "Never ... end a run with work left that you could have done" | Take reworded: "say so, stop looking for a dump, and go on (T7's no-firmware branch)". |
| E19.1 (`analyse-reference-look`) | New step 0 that stops when no front-on photo of the exact model is held. The skill also serves mock-ups and custom designs, which have no "exact model". | `analyse-reference-look/SKILL.md`: "A mock-up is usually drawn that way already; a photograph never is." (one skill for both); `unattended-runs.md`: "Wait for an answer that cannot come" is a Never | Take reworded: grade the reference first. Where the reference is a photo of hardware and the exact model is not held, with nobody there, record it as a gap and go on with the best graded source. |
| E20.3 (`page-matches-reference-look`) | Gate "every section has a title" fails a reference whose sections are untitled | `page-matches-reference-look.md`: the gate compares against "the analysis", i.e. the reference's own measures | Take reworded: "every section the reference titles has its title and a ground that draws". |
| E22.3 (`git-right-first-time`) | "A guard reads command text: write such text to a file and run the file" is a way round a guard | `synth-creator/rules/hooks-and-gates.md`: "Treat a hook that blocks correct work as a red check ... The hook is fixed first"; Never: "Route around a block" | Drop. A false refusal of text that only mentions a command is a hook bug, logged and fixed in the kit. |
| E38.2 (`bounce-a-plugin`) | "Record the microphone to test permission" opens an audio device | `bounce-a-plugin/SKILL.md` Never: "Open an audio device, or route through a loopback, to capture a plugin." | Take only "prove the source before the sink". Drop the microphone part. |
| E38.7 (`bounce-a-plugin`) | "An interactive host first" reverses the skill's offline-first method | `bounce-a-plugin` intro: "an offline VST3 renderer: no DAW, no audio device, no window" | Take reworded: when the offline renderer cannot load a plugin, open it once in an interactive host to see whether it loads and takes sysex at all. |
| E47.1 (`waveforms-and-octaves`) | "Layers share one filter and one envelope unless the original separates them" contradicts a free layer being a whole voice (and DOUBLE/TRIPLE's own filter) | `sound-design/rules/waveforms-and-octaves.md`: "Treat a free layer as a whole voice."; `house-control-behaviours.md`: "Each extra voice has its own filter and envelopes" | Take reworded: "a layer takes the original's filter and envelope arrangement: shared where the original shared them". |
| E51.1b + E52.2 (`clock-law.md`, `sync-is-a-mode`) | Adds SOURCE/SEND as a fourth sync state | `sync-is-a-mode.md`: "Give a synth three states: OFF, INT, EXT."; `clock-law.md` section 5: "Synths get three states; most effects get two." | Take reworded: the three receiving states stay. Clock OUT (an output jack, Virus "Send") is recorded as its own setting beside them. |
| E51.2a (`clock-law.md`) | "Re-anchor to a DAW's position only on a jump, never every block" | `midi/rules/measure-the-clock-in-audio.md`: "Derive position from the host. An integrated position is wrong for ever after a jump." (check `position-not-integrated`) | Drop the re-anchor clause. Keep the rest of the line (E51.2b: median-filter pulse gaps, release the lock on silence) as ADDITIVE. |
| E66.2 (`module-kill-switch`) | Narrows how a hidden control is pinned: read and override, never overwrite the stored value | `audio-core/rules/module-kill-switch.md`: "Pin a hidden control's parameter to its neutral value." | Take. It refines the method and reverses nothing. Shown because it narrows. |
| E68.2 (`panel-sizes-by-kind`) | "A control below its width floor drops chrome" assumes controls shrink below their floor | `panel-sizes-by-kind.md` Never: "...or shrink a control to fit: the container scrolls."; `page-matches-reference-look.md`: "A component never shrinks to fit" | Drop. |

### Template lines

| id | what changes | existing template text | recommendation |
|---|---|---|---|
| T1 rebuild.md step 0, grade the evidence | Adds a path where the order builds nothing | `rebuild.md` "Finished looks like: every parameter, page and gesture in the manual present..." | Take reworded: grade in W1 and record the path. "Create nothing, write the findings" applies only when there are no names and no presets. |
| T3 rebuild.md W13 done-when | Adds a count to W13's done-when | `rebuild.md` W13 **Done when:** "a structural test proves every control comes from the template and the table; ..." | Take reworded: "where the ROM has a factory test mode, the panel table holds as many switches, LEDs and pots as it counts". |
| T4 rebuild.md W15 | Adds a display requirement to W15 | `rebuild.md` W15 **Done when:** "every patch sounds, levels are within a stated range, and twins are explained." | Take. It agrees with "every string shown is the machine's own" (W7). |
| T5 generic.md, deliverable count | Adds a requirement to the last step | `generic.md` W5: "what was built, what is proved and how, what is not..." | Take. |
| T9 rebuild.md W5, external simulator as oracle | Could stand in for the order's own interpreter | `rebuild.md` "An interpreter of the <CPU> of our own ... Ghidra's P-code emulator is the second oracle" | Take reworded: an external simulator may be a further check, run as a black box (`re-toolchain` step 4), never in place of our interpreter. |
| T11 plugin.md, engine step includes its panel layer | Moves panel work into each engine step | `plugin.md` W9 "The panel, from the approved render" (one step, after the engine) | Drop for 2.0. It changes the template's order. |

## 3. ENFORCEMENT

| id | what it would refuse | how a false refusal would look | recommendation |
|---|---|---|---|
| U28 `fault-logged` (Stop hook) | The end of a turn whose reply admits a fault while no bug or workflow-bug entry was written | A reply saying "the planted fault turned the gate red" or "the test failed as expected" is sent back to log a fault that is not one | Take, with planted-fault and expected-failure phrasing as must-pass cases in its selftest. Otherwise drop. |
| U30 `docs-are-current` (ctest gate) | A build whose generated machine documents differ from what the generator now writes | A generator that is not deterministic (ordering, timestamps, the machine's locale) fails every build | Take, only where U29's generator exists. The generator must be byte-deterministic and pass a run-twice test. |
| U31 `docs-regenerate-on-commit` (pre-commit) | Refuses nothing. It rewrites and stages files during a commit. | The kit commits as `git commit -m ... -- <paths>`, and a pathspec commit ignores what a hook stages, so the hook silently does nothing. Elsewhere it stages files the author never named, against "Stage by name". | Drop. U30 already catches stale docs. |
| U73 `agent-model` (PreToolUse on Agent) | An agent spawn with no `model`, and Opus with no `OPUS BECAUSE:` reason | A fork (model is ignored), or an agent type whose own definition sets the model, is refused | Take, exempting forks and definitions that set a model, with the list of Opus reasons configurable. `subagent-dispatch` already requires a model on every agent, so only the Opus half is new. |
| E1.6 `ear-constant-tagged` reads the full tag list | Today it refuses a "by ear / sounds right" comment with no `[EAR]`. "Reads the full tag list" either loosens it (any tag passes, so a guess tagged `[MEAS]` escapes the ledger) or makes every untagged constant refused. | Read the second way, every `0.5f` in DSP code is refused | Drop. The check does its one job now. |
| E25 `references-use-anchors` gate | A document with a duplicated anchor, or a cross-project reference that does not resolve | A sibling project not checked out on this machine makes every cross-project reference fail | Take the duplicate-anchor half. Take cross-project resolution only for projects that are present, reported as a warning otherwise. |

## 4. The three choices

- **D1 The skeleton.** The kit tells a new instrument to "start from the skeleton" but ships none (`gates-from-commit-one`: "The kit describes the skeleton; it ships none."). Choose between shipping a generator that writes a new unit with every gate already wired, and keeping the description. **Recommend:** keep the description for 2.0 (no change to how the kit works), and ship the generator as its own later unit. DECIDED.md put everything approved into 2.0, so the generator is in 2.0 only if the user approves it as a new unit.
- **D2 A default shell spec.** The shell's top bar, keyboard band, tabs, explorer, effects chain, window split and arp spec. **Recommend:** leave it out. It is already obsolete under C12 ("we are not using the shell for anything anymore").
- **D3 Reference data.** The user's Atlas patch scripts cannot run for anyone else. **Recommend:** the kit keeps its baked tables (`design-a-preset` references) and U45/U46's method. The Atlas skills stay the user's own.

## 5. Doubtful obsolete rows

- **O20** (parts catalogue per role, `drift_check` against synthcatalog). DECIDED.md adds N3 `file-into-the-catalog` ("then gen_all and drift_check") and N4 `catalog-entry-exists`. The method is therefore not obsolete: it lives on in N3/N4. Re-mark it "covered by N3/N4", not "replaced by copy-and-prove".
- **O30** (Admiral check-signal hook). `packs/admiral` ships only the skill `drive-a-session-through-admiral`, and no hook. The row is obsolete for the kit only if Admiral's own installer adds the hook. The statusline half is fine (`base/tools/statusline.mjs` exists).

The other 28 were checked: each replacement the row names exists in the kit (`no-html-prototype`, `ui-no-scroll-hijack`, `motion-is-rare`, `pictures-do-a-job`, `design-direction`, `no-generated-look`, `page-holds-its-frame`, `chip-search`, `knob-anatomy`, `colour-by-role`, `unattended-runs`, `work-inside-the-project`, `house-tools-live-in-the-library`).

## 6. Also flagged

**SHELL, obsolete under C12 (confirm with one yes):** U69 `layout-defaults-are-measurements` (the shell's window split and explorer state); E6.2 (the rest of the faceplate's controls "go to the shell"; if kept, reword to "go to a layer of ours, labelled ours, the edit layer"); E51.2c (one clock stream out of the shell); E51.3 (the machine's tempo knob and "the shell's BPM", one value; if kept, reword to "a machine's stored tempo knob IS its internal tempo field"); E62.2b (transpose as a parameter, voice allocation in the keyboard band); E70.1, E70.2, E70.4 (seams of the shared shell: resource prefixes, greyed seam buttons, opt-out dependencies); E72.1 (tabs joining the shell's header, the transport giving way).

**Existing kit text that still names the shell (outside this list, for a later pass):** `audio-core/rules/every-time-control-syncs.md` "Keep one master clock, in the shell"; `instrument-shell/rules/seams-are-declared.md` (the whole rule is about a shared shell); `clock-law.md` section 5 "the shell resolves it".

**Units that serve more than one thing (split or trim):**
- U36 `bank-coverage`: "Bank generators and loaders fail on an unknown key" is loader strictness, a second job. Move it to its own rule, or to `imports-count-every-loss`. "Every program sounds on a held middle C" is a third job. Move it to `spread-probe` or `presets-are-named-and-neutral`.
- U41 `model-the-mechanism`: "Ask per voice or per bank for every modulation source" is a separate question from modelling the mechanism. Move it to `full-matrix-first` (U37) or its own rule. "Mode tap mixes" repeats `filters-stable-under-modulation`.
- U70 `cpp-no-pointer-into-growing-container`: "gate the editor in a fresh process" is a second job. Move it to its own rule or to a test rule.

**Conflict between two new units:** U62 `patch-inspector` ("visible on a key") against U51 (the keyboard plays notes and nothing else takes it). Taken reworded, no question: a button or a modifier chord.

**DECIDED, taken in the decided wording:**
- U26 (C16), U38 (as changed), U39 and every E57 line (the release-lock unit).
- E2.8 (C11), E8.11 (C10), E11.3 (C17), E13.1 (C4).
- E19.5: C8 says photo first and analyse-reference-look stands, so the C8 ranking is NOT added there. Only rebuild.md's W2.4 and Sources line change.
- E21.1: C7 says no second read by default; the backup read is made when a converted file is found broken at use, and the user is told.
- E21.6 (C15), E52.1 and E53.1 (C6), E61.1 (C9/C9a), E70.3 (C3), E74.1 (D1), T6 (C12: the machine's arp remade exactly, unless the user says otherwise).

**Coordinator check on the index premise:** sd#2 is cited only by E57.1, which is dropped. Two existing kit lines rest on stored indexes, and both still hold on their own reasoning: `seams-are-declared` "Keep tab and division indexes append-only" and `clock-law.md` "Make the list append-only, since a unit stores the index". A patch stores a division's index as its value, and that has nothing to do with host ParamIDs. U39 also holds on its own reasoning (MIDI Program Change and a host's program list address programs by number), and it now folds into release-lock.

**ADDITIVE notes (taken, wording only):** E30.1 drops the word "export" (C5: there is no export pipeline). E27 repeats the existing `"code": true`; take it as a pointer to that. E69 `double-where-precision-matters` changes the rule text only, and must NOT widen the check `float-phase-or-rate` (that would be enforcement). E46.4 is written as "a delay replica needs lengths, topology and coefficients; lengths alone are a third of it". U46 is worded so it cannot be read against `neutral-is-exact` ("Hash a value into the signal path"): it concerns generator seeds, not the signal.

## 7. ADDITIVE (taken as recommended)

New units:
- U25 second-time-is-a-tool
- U27 can-the-user-open-it
- U29 generate-the-machine-docs
- U32 measure-a-filter
- U33 measure-an-envelope
- U34 identify-a-parameter
- U35 prove-choices-differ
- U37 full-matrix-first
- U40 reference-presets-are-statistics-only
- U42 counter-oscillators-quantise
- U43 gate-both-faults
- U44 categorise-a-factory-bank
- U45 generate-a-recipe
- U46 seeds-are-hashed
- U47 nrpn-and-packed-values
- U48 vendor-sysex
- U49 midi-from-firmware
- U50 find-the-division-table
- U60 build-stamp-on-the-panel
- U62 patch-inspector (reworded, see 6)
- U63 effects-have-an-audition-source
- U64 a-scope-is-honest
- U65 selection-never-dangles
- U66 one-owner-of-the-notes
- U67 caps-are-one-limit
- U68 window-opens-from-the-display
- U71 kill-only-your-own
- U74 agent-ledger (logs only, refuses nothing)
- (U36, U41, U70: additive once split, see 6)

Extension lines (Ex.n = the n-th bullet of Ex in DECISIONS.md):
- E1.1-E1.5
- E2.1-E2.7
- E3.1-E3.4
- E4.1-E4.3
- E5.1-E5.2
- E6.3, E6.4
- E7.1-E7.3
- E8.1-E8.10
- E9.1-E9.4, E9.6-E9.12
- E10.1-E10.3
- E11.1, E11.2, E11.4 (per-feature corpus counts)
- E12.1-E12.4 (E12.4's interpreter lives in the library per house-tools)
- E13.2
- E14.1-E14.5
- E15
- E16
- E17
- E18 (new unwrap modes, existing modes untouched)
- E19.2-E19.4, E19.6-E19.8
- E20.1, E20.2, E20.4, E20.5
- E21.2-E21.5
- E22.1, E22.2
- E23.1-E23.3
- E24.1, E24.2
- E26.1-E26.3
- E27
- E28
- E29
- E80
- E30.1-E30.4
- E31.1, E31.2
- E32.1-E32.3
- E33
- E34
- E35
- E36
- E37.1-E37.9
- E38.1, E38.3-E38.6
- E39.1-E39.6
- E40.1-E40.5
- E41.1, E41.2
- E42.1-E42.5
- E43
- E44.1, E44.2
- E45
- E46.1-E46.4
- E47.2, E47.3
- E48
- E49.1, E49.2
- E50.1-E50.8
- E51.1a (section 0 two clocks, stopped host, one switch, naming rows), E51.2b (median filter, release on silence), E51.4
- E53.2-E53.4
- E54.1, E54.2
- E55.1, E55.2
- E56
- E58.1-E58.5
- E59
- E60.1, E60.2
- E61.2
- E62.1, E62.2a (pitch wheel springs, mod wheel stays), E62.3
- E63.1-E63.4
- E64
- E65.1-E65.3
- E66.1, E66.3
- E67
- E68.1
- E69 (all 13 one-liners; the panel-gestures C2/C14 parts are decided)
- E70.3
- E71
- E72.2
- E73
- E74.2
- E75
- E76
- E77 (all 14 web one-liners; `preflight-build` is a skill, not a check)
- E78.1-E78.5
- E79

Template lines:
- T2 rebuild.md, the clock answer
- T7 rebuild.md, the no-firmware branch
- T8 rebuild.md W10, capture plan (inside a conditional step; done-when unchanged)
- T10 rebuild.md, shared OS across a family

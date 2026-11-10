# What the kit can prove: synth-creator

Extracted by hand on 2026-11-09 from claude-packs `9436b22`, from the 51 skills and 132 rules the synth-creator configuration installs. This is the draft of the file `workorder <name>` should generate from the installed packs. A work order names its steps from here, and only from here. The "proves" column is the step's **Done when**; the skill's own text says how.

## Part 1: steps, in the house order

Chart → UI → engine → presets → audit → report. An effect unit skips the oscillator, envelope and voice steps. A replica of a real machine puts the "Sources" steps in front of the chart.

### Start the unit

| Skill (pack) | Use when | Proves (the Done when) |
|---|---|---|
| `new-project` (base) | an empty folder, or the kit just added | `doctor --strict` green; every source folder in `layout.json` |
| `gates-from-commit-one` (instrument-shell) | starting a new instrument | the five gates (clock, render reproduces, byte-exact round trip, spread, panel hit test) exist in ctest and each was seen red on a planted fault |
| `build-step` (synth-creator) | work begins on a step | the step has a branch, an In-progress row with its start time, and `step.py check` passes before it is ticked |
| `pick-tests`, `test-quietly`, `build-through-the-queue` (base, synth-creator) | any build or test | the tests the change reaches ran, through the queue, with no window on the user's desktop |

Fixed W0 for every synth: synthkit's `new_synth.py` makes the code tree; `claude-packs new --config synth-creator` (or `init`) follows on it; `gates-from-commit-one`; the Mermaid chart of the whole synth is committed before any UI code.

### Sources (a replica, or any build from a picture or a recording)

| Skill (pack) | Use when | Proves |
|---|---|---|
| `gather-sources`, `source-checklist` (reverse-engineering) | a machine is to be reproduced | every source listed with what it gives and what is missing; nothing lives only in someone's head |
| `names-first`, `two-sources-before-naming` rule | before any code | every name has two independent sources |
| `bank-census`, `menu-map`, `read-a-screen-image`, `read-a-circuit-diagram` | the factory bank, the menus, the screen, the schematic | a census with counts; a map with every page; `skill-first` refuses reading these files without the skill |
| `does-it-sync` (midi) | before the clock step | what the machine slaves, over which socket, at what rate |
| `analyse-reference-look` (base) | a picture of how it should look | the picture turned into numbers (positions, sizes, colours, depth) before a page is built; `skill-first` refuses reading `references/` without it |
| `re-deliverables`, `tripwire-the-law` | the research is done | every finding has its source; every law has a tripwire gate seen red |

### Chart

No skill yet. The house law (memory, not kit): a Mermaid chart of every module and every route, committed before UI code; a later work order changes the chart first and has it pass before code is written.

**Proves:** every panel section and every audio route appears in the chart exactly once; the chart is committed as the step's first commit.

### Panel and controls

| Skill (pack) | Use when | Proves |
|---|---|---|
| `new-panel-control` (audio-core) | adding or changing a control | the control has its id, its range, its display formula and its row in `design/shape.json` |
| `prove-control` (audio-core) | after any control change | the control answers at every surface it has (panel, host, patch, display) |
| `hit-the-painted-control` (instrument-shell) | proving a panel works | every drawn control answers at its own centre; count equals the chart's count |
| `trace-parameter` (audio-core) | a control sounds, reads or jumps wrong | host → sound → screen agree for the parameter, in numbers |
| `hover-state`, `gpu-golden-check` / `gpu-golden-update`, `gpu-capture` (gpu-painter) | a drawn page | every pressable has a hover state; the golden image score is within the gate |
| `editor-frame-bench` (audio-core) | before calling a drawn page finished | paint and tick cost in ms, within the budget |
| `prove-instances-identical` (base) | a slot, layer, lane or band was touched | every instance of a container type measures identical |

### Sound engine

| Skill (pack) | Use when | Proves |
|---|---|---|
| `copy-and-prove` (audio-core) | a part is taken from a sibling synth | the source's render fingerprinted; the copy IDENTICAL; one coefficient changed seen DIFFERENT |
| `measure-tone` (audio-core) | an oscillator, shaper, filter or effect is new or changed | THD, DC, alias and level figures within budget, at stated pitches |
| `choose-observable` (sound-design) | writing a probe | the signal measured is one that can prove the behaviour |
| `measure-a-law` (sound-design) | fitting a law to a machine or recording | the fit with its error, defensible |
| `measure-reverb` (sound-design) | any reverb or decay | decay time at stated settings, within tolerance |
| `compare-to-the-machine`, `bounce-a-plugin` (sound-design) | a recording of the real thing exists | the same patch rendered beside the recording, with the difference measured |
| `clock-probe` (midi) | sync, a tempo-synced delay or LFO | the unit follows tempo in its audio at three BPMs |
| `juce-realtime-audit` (audio-core) | before merging anything reachable from `processBlock` | zero findings |

### Presets

| Skill (pack) | Use when | Proves |
|---|---|---|
| `spread-probe` (sound-design) | a bank is finished | the programs really differ, measured |
| *(missing)* | designing a preset or a bank | **No skill in the kit makes a preset.** `preset-design-law` is a claude.ai skill; a run on the Mac never sees it. Until it is a kit pack, an order cannot have a preset step with a law behind it |

### Repetition, shape and templates (any step)

| Skill (pack) | Use when | Proves |
|---|---|---|
| `make-it-a-template`, `cpp-extract-template` | `template-law` or `scan` found a repeat | one template, tested once |
| `add-lesson-check` (base) | a bug was fixed | a check with its `bad` caught and its `good` passing |
| `prove-a-hook` (hook-proof) | a hook is new or changed | the selftest seen red without the fix |
| `pressure-test-skill` (base) | a skill is new or keeps misfiring | measured triggering |

### Finish

| Skill (pack) | Use when | Proves |
|---|---|---|
| `land-branch` (base) | a step's gate is green | the trunk, local and remote, has the commit |
| `fix-from-scan` (base) | the final scan | every finding fixed or listed with why |
| W3 review, W4 report (the generic template) | the end | every open item written down; every report section has counts |

## Part 2: rules that bind what an order may ask for

Of 132 rules, these are the ones an author must know while writing, because an order that contradicts them cannot finish. The rest are followed by the run and need no mention in an order.

**Must be in every synth order's constraints**
- `timing-from-synthcore`: tempo, MIDI clock, QWERTY and focus come from synthcore. An order never asks for a clock, a tempo or key handling to be written.
- `parameter-ids-never-change`: an order that renames or re-ranges a control keeps its id. `param-id-lock` refuses otherwise.
- `instances-by-index-identities-by-id` and the shape law: nothing is stored or addressed by position. An order says "every slot", never "slot 2". `brief-guard` refuses the literal.
- `copy-trees-read-only`: a part from a sibling comes in through `copy-and-prove`, with its origin and licence row, and is never edited in the copy tree.
- `patch-excludes-performance-controls`: a patch stores everything but MAIN volume, octave, mod wheel and pitch wheel.
- `house-control-behaviours`: double-click returns a control to its default; lights show on/off; the house behaviours apply to every control the order adds.
- `straight-on-and-aligned`, `ui-matches-reference-look`: a UI from a reference matches its look, not only its layout; basic UX comes first.
- `done-means-fresh-evidence`: every Done when is measured in the turn that claims it. "Compiles" and "wired" are not done.
- `reproduction-or-original`: the order says which one this is, because the laws differ.
- `firmware-stays-out`, and the copy-tree rule's last line: no firmware bytes in git; no hardware, brand or machine name in anything that ships (a program name, a label, a string in the binary).

**Must be in every order's Never list (base, already partly in the template)**
- `secrets-never-committed`, `tests-never-touch-user-files`, `work-inside-the-project`, `git-right-first-time` (no `add -A`, no rebase, no force), `finished-work-lands`.
- `unattended-runs`: the recommended choice, recorded; stop only for what cannot be undone or leaves the project.
- `agents-held`: with nobody there, agents run in the foreground, all in one message.

**Decide once per order, in the position paragraph**
- `sync-is-a-mode` and `waveforms-and-octaves`: say which sync modes and which waveform kinds the unit has, because OFF is a sound and a waveform can be data, an oscillator or a generator.
- `voice-sum-headroom`, `output-limiter`: the voice count and the output ceiling are numbers the order states.
- `cpp-builds-everywhere`: which platforms the order claims (house rule: macOS first, Windows at the end).

Everything else in the 132 (realtime safety, denormals, smoothing, NaN guards, Dawn, bloom, atlas, determinism, thread contracts, static analysis, headers, casts) is how the run writes code. It is enforced by hooks and checks and belongs in no order.

## Part 3: what is in the author's head and nowhere in the kit

These are needed to write any synth order and must become data in the synth-creator template or configuration, or the writer cannot be a beginner:

- The house order of work: Mermaid chart → fully working UI → engine. Standalone only until the VST is called for; tested from the eproms rack.
- The models: check how Solera, MegaSynth, SuperSynth or Arcturus did it before deciding something new; take how a part works, never its design; sound code that is not yet global is not shared.
- Which sibling part is the reference for what: the filter and reverb/delay from Solera, the envelopes from MegaSynth.
- Design in 16:9. Every control's double-click default. Lights show state.
- Preset names are the author's own. A bank's INIT is the stated neutral (`neutral-is-exact`).
- The licence path, the demo rule, and the pricing are product facts an order's "forbidden" list may need.
- `synth-design-law` (the house look) and `preset-design-law` (the house sounds) in full.

## Size

Part 1 and Part 2 together are about 9,000 characters for one configuration, already over the 8,000-character skill cap, and every line of them is a copy of something a pack says. That is why this is a generated reference beside the skill, not the skill.

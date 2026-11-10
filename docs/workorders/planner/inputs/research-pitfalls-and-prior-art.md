# Research: how others start a plugin build, and what goes wrong when it starts wrong

Searched 2026-11-09. Two questions: has anyone made skills for building a synth or plugin with Claude Code, and what are the pitfalls a project meets when its first steps are wrong. Then what each finding changes in `workorder-writer`.

## 1. What exists

| What | Shape | What it does that we do not | Verdict for us |
|---|---|---|---|
| **lesliecharlesmusic/plugin-workflow** (GitHub) | A Claude Code package for JUCE 8 plugins: 13 phases (0 setup, 1A DSP design, 1B software architecture, 2 CMake skeleton, 3 parameter architecture, 4-5 DSP, 6 UI design in HTML, 7 UI implementation, 8 presets, 9 optimisation, 10 QA and DAW validation, B beta, R release), one skill per phase, living state docs under `Docs/State/`, `PluginSpec.md` as the source of truth | Two hard **pre-code gates**: no DSP `.cpp` and no GUI file before its Implementation doc is approved, whatever the plugin's size; and a UI **HTML prototype gate** before any JUCE GUI code. A golden-reference regression that must pass before every release and is never silently overwritten. A `LESSONS LEARNT/` file checked at the end of every phase. One file per response, verified before the next | The closest thing to the kit. Its phase order (DSP design → architecture → skeleton → **parameters** → DSP → UI design → UI code → presets → QA) puts the parameter table before any DSP, which the kit's orders do not state. Take the pre-code gate idea: it is our "chart first", generalised. **Do not take the HTML prototype gate**: see "Why we do not prototype the UI in HTML" below |
| **juce-dev** (Daniel Raffel, Claude Code plugin) | `/juce-dev:create "My Plugin"`: finds the starter template, checks the JUCE version is current, derives class names, bundle ids and the 4-letter plugin code from the name, sets up signing and notarisation | The scaffold step as one interactive command that derives every name from one answer | Our `new_synth.py` + `claude-packs new` is the same step in two commands; the order should name both and say the derived names are not the user's problem |
| **mcpmarket "plugin-freedom-system" skills** (system-setup, build-automation, cross-platform builds, GUI designer, DSP cookbook, JUCE best practices, plugin-testing) | A family of single-job skills: environment check writes `.claude/system-config.json`; build skill commits on a green build; GUI skill makes an HTML/CSS preview and a parameter map before code; testing skill runs pluginval or a DAW checklist; a validation agent runs after each stage | A **validation agent after every stage** and pluginval wired into the workflow, not left to the end | pluginval is absent from the kit. It belongs in the gates from commit one |
| **sebasdv juce-plugin skill** (skills.lc) | One skill with JUCE conventions and a pitfalls list | Names the two pitfalls everyone hits: allocation in `processBlock`, and `ParameterID{"id", 1}` with a version hint, not a bare string | Confirms two of our laws; the version hint is not in ours |
| **shortwavlabs/agent-skills** | DSP skills for Vult, Faust, generic DSP, with cookbooks and a testing reference | Cookbooks, not a build process | Nothing to take for the order |

Nobody found has the unattended runner, the measured "done when" per step, the shape law, the id lock, or a reverse-engineering track. Nobody found has an interview for someone who knows nothing. The kit already has the parameter table and the id lock (`param-id-lock`, `parameter-ids-never-change`, the rebuild template's W6); what plugin-workflow does differently is only the *position* of that step, as its own phase before any DSP, and the one thing it has that we lack is pluginval run as a gate (the kit knows it: `discrete-params-snap` cites pluginval 2.0's strict discrete test as its reason, but no gate runs pluginval).

## 2. The pitfalls of starting wrong, grouped by when the decision had to be made

Each row is a decision that, taken late or never, costs a rebuild or breaks users' sessions. Sources are the JUCE forum, the JUCE docs, Jatin Chowdhury's plugin guidelines, the KVR DSP forum, and the workflows above.

### Before the first parameter is declared

| Pitfall | What happens | The decision the order must hold |
|---|---|---|
| Parameter ids that change, or are added without a version hint | Logic and GarageBand identify AU parameters by index, so adding or removing a parameter re-numbers the rest and breaks every saved automation; JUCE's version hint on `ParameterID` exists only to order new parameters after old ones, and a renamed id string changes the VST3 hash | **Already held by the kit, fully:** `parameter-ids-never-change` requires `juce::ParameterID { "id", versionHint }` with a new parameter taking the current hint, never a rename, reuse or delete; `param-id-lock` (PostToolUse) locks every id the first time it appears and fails any edit, by any write route, that makes a locked id disappear. The order only states the list; nothing to add |
| A parameter's range changed after release | Old presets and automation load at the wrong position; the fix is a versioned state and a remap on load, or a new parameter with the old one as a phantom | State carries a version from the first save; a range is a decision in the order's table, not a guess to tune later |
| Performance controls stored in the patch | A preset recalls a pitch-bend or mod-wheel position; hosts also treat these as dirtying the project | Our `patch-excludes-performance-controls` already; the order states the list |
| A fixed buffer size or sample rate assumed | Works in the standalone, fails in a DAW that changes block size or at 96 kHz | Coefficients computed from the host's rate; tested at 44.1, 48, 88.2, 96 kHz and at odd block sizes; our `sample-rate-and-block-size-from-host` rule, but the order must name the rates the gate runs |
| Unsmoothed continuous parameters; raw host values kept in stepped ones | Zipper noise on every knob, the single most common beginner bug; a switch that stores 0.37 and fails pluginval's strict discrete test | **Already held by the kit:** `smooth-continuous-parameters` (a smoother per continuous control, multiplicative for frequency and dB, `setCurrentAndTargetValue` on patch load, the max sample-to-sample jump test) and `discrete-params-snap` (snap to the step, store the snapped value, the 0.37 round-trip test). Nothing for the order to say |

### Before the first line of DSP

| Pitfall | What happens | The decision the order must hold |
|---|---|---|
| DSP written before a design document | plugin-workflow forbids any DSP file before its implementation doc; our chart-first rule is the same lesson from a different build | The Mermaid chart (every module and route) is W1 and the pre-code gate for every later step |
| Allocation, locks, logging or file I/O on the audio thread | Dropouts that appear only under load, in one DAW, months later; the guideline is "nothing with unbounded execution time" | Our `audio-thread-realtime-safe` rule and `juce-realtime-audit` skill; the order names the audit as a gate, and RealtimeSanitizer where the toolchain has it |
| Voice allocation decided after the voice | The voice is designed mono and copied; stealing, priority and per-key behaviour get bolted on and sound wrong | Voice count, steal policy (oldest, quietest, per-key) and mono/poly/legato modes are answered in the interview and gated (`voice-steal-fades`, `note-ledger-and-pedals`) |
| Complexity before three simpler tries | Class hierarchies and patterns that nobody needed | The order's foundation names the house parts to reuse; the run writes new structure only for the genuinely new module |

### Before the UI is drawn

| Pitfall | What happens | The decision the order must hold |
|---|---|---|
| GUI code before the design is fixed in numbers | Pages redrawn several times. plugin-workflow and the mcpmarket GUI skill answer this with an HTML prototype before GUI code. **We tried that and it does not work for us** (below) | The reference picture (or the house look) is analysed into numbers before any page (`analyse-reference-look`, enforced by `skill-first`); the panel is drawn in code from that table; the order must say what the reference is when there is none |
| Editor and processor lifetimes confused | Crashes when the editor is closed while audio runs; attachments must be reset before timers and look-and-feel are torn down | A rule for the editor's destruction order; not in the kit today |
| Window size and scaling decided late | HiDPI and host window quirks | 16:9, resizable by steps, the extremes rendered (`render-the-extremes`) |

#### Why we do not prototype the UI in HTML

Tried on three house projects and dropped each time: more annoying than it was worth, and the reason the kit carries real UI design rules instead of a prototype step. An HTML page compiles in a second, which is the whole appeal, but it is a second design: the HTML and the C++ panel each become a source of truth, nothing holds one to the other, and they drift. Every change is then made twice or made once in the wrong place, and the build ends up matching whichever design it read last. The reference picture is the design, and the iterating happens there: the mock-up is made in OpenArt (Nano Banana Pro, 16:9, Stage 7 of `workorder-writer`) and rendered again until the owner likes it, with the previous render attached as the reference and the layout written in bands. The render can also come first: when the idea is already clear, a concept render made before the interview shapes the order from the start (the sections, the feel, the sound parts are read off it), and it is usually rendered again at the end once the questions have changed something. Either way the approved render is measured into numbers once (`analyse-reference-look`), the panel is one table drawn in code from those numbers, and the look gate compares the rendered panel to the picture element by element. One picture, one table, one gate. A web page in the middle adds a copy, and the shape law refuses copies for the same reason it refuses a second clock.

The kit already enforces the other half of this, that the UI is real code and nothing is pre-rendered:
- `no-shipped-images` hook (synth-creator's hook order): refuses an image written, copied, moved, downloaded or converted into a source or resource folder by any route; only `design/reference/**` and `build/pictures/**` are allowed by default, and `--git-staged` refuses a staged one from a pre-commit hook.
- `ui-drawn-in-code` check (`packs/synth-creator/checks/ui-drawn-in-code.json`): refuses `drawImage`, `ImageCache`, `BinaryData` and `ImageFileFormat` in C++ outside tests, with the reason "the UI is drawn in code, so it scales to any size and a control changes in one place". It is opt-in today; the plugin template's W0 switches it on.
- `ui-matches-reference-look` and `straight-on-and-aligned` rules (audio-core), `analyse-reference-look` skill with `skill-first` refusing a read of `references/` without it, and the look gate (`look-gate` hook) comparing the rendered panel to the picture.

So an HTML prototype would be the one copy of the design these do not reach: not an image, not C++, judged by nothing. That is exactly where the drift lived. The plugin template says it in the Never list, and the kit should gain one line in `ui-drawn-in-code`'s `why` or a sibling check so a `*.html` page under a panel or design folder is refused the same way an image is.

### Before the first preset is made

| Pitfall | What happens | The decision the order must hold |
|---|---|---|
| No neutral default | Sound design starts from a patch with hidden modulation; the default preset must have every depth at zero and the neutral at the right position (centre for bipolar) | INIT is defined in the order and measured neutral (`neutral-is-exact`) |
| Presets that show the effects, not the architecture | Players judge an engine by its presets; a bank drowned in delay and reverb reads as a weak engine | The bank brief says what each category must show of the engine; `spread-probe` measures that they differ |

### Before calling anything finished

| Pitfall | What happens | The decision the order must hold |
|---|---|---|
| Tested only in the standalone or JUCE's host | Only a real DAW has transport, ppq and bpm; automation, offline render and bus layouts differ per DAW; there is no one DAW that proves the rest | pluginval runs as a ctest from the first commit; a named short list of DAWs for the manual checks, as a step with a checklist |
| Golden regressions overwritten to pass | A changed sound ships as a fix | Our `optimisations-are-null-tested`; the order forbids updating a golden without a logged reason |
| Lessons not written down | The same fault returns on the next plugin; plugin-workflow logs a lesson after two expensive rounds and reads the file at the end of every phase | Our `add-lesson-check` and `workflow-bugs.md`; the order's last step reads them |
| Release work discovered at the end | Signing, notarisation, installers, marketplace icon sizes; the JUCE packaging tutorial lists them as the common rejections | Out of scope for a first order, but listed under "Left out on purpose" so it is a decision |

## 3. What this changes in `workorder-writer`

The skill today has a general template and a rebuild template. The rebuild one is rich, taught by four runs. The general one is the kit's generic file and asks a beginner to write "the laws of this project" in angle brackets. A new synth or effect gets the generic one. That is the gap the research maps onto.

**Add a third template, `templates/workorder-plugin.md`**, for a new synth or effect, with these as fixed text so no beginner writes them:

- The stack, stated: C++ with JUCE, CMake, the `synth-creator` configuration with `cpp`, `audio-core`, `instrument-shell`, `midi`, `sound-design`; `synthcore`; `new_synth.py`; the eproms rack; macOS first, Windows last.
- W0 fixed: skeleton, kit, `gates-from-commit-one`, **pluginval as a ctest**, and the Mermaid chart as the pre-code gate for every later step.
- **W1 the parameter table**, before any DSP: every control with id, version hint, kind, range, default, smoothing or step, patch yes/no, host-visible yes/no, panel section. Generated into C++; `param-id-lock --init` run in the same step so the lock starts with the table. The kit holds all of this already (the rebuild template has it as W6, after the oracle, which is right for a rebuild); the point for a *new* plugin is only that the step comes first, because there is no oracle to wait for and every later step reads the table.
- The voice step with allocation and modes stated, from the interview.
- The INIT step and the bank brief, from the interview.
- A DAW step with a named list and a checklist, and pluginval in every gate.
- A `[if ...]` set like the rebuild template's: `[if polyphonic]`, `[if tempo-synced]`, `[if it has an arp]`, `[if a reference picture exists]`, `[if effects]`.

**Add to the interview** (the questions file already drafted): the version-hint policy is not a question, it is stated; voice allocation and modes are a question; the sample rates and block sizes the gates run are stated; the DAW list is a question with a default (Reaper, Logic, Ableton); what is left out (signing, installers, AU, AAX) is a question with everything defaulted to "later".

**Add to the kit, as rules**, so the run is held to them without the order repeating them: the editor's destruction order, and pluginval in `gates-from-commit-one`. (Version hints were listed here in the first draft; they are already in `parameter-ids-never-change`.)

**Keep from plugin-workflow** two mechanics worth copying: a pre-code gate document per step (our chart and the parameter table are two; the rebuild template has them per step already), and reading the lessons file at the end of every step, not only at the end.

**Do not take from plugin-workflow** the HTML prototype gate. The plugin template says so in its Never list, with the reason above, so a run that reads the workflow's idea elsewhere does not adopt it: "Never prototype the panel or a page in HTML or a web page: it is a second design that drifts from the first. The reference picture is measured into numbers and the panel is drawn in code from that table."

## Sources

- lesliecharlesmusic/plugin-workflow: https://github.com/lesliecharlesmusic/plugin-workflow
- juce-dev Claude Code plugin: https://danielraffel.me/2026/03/06/a-claude-code-plugin-for-building-juce-audio-plugins/
- mcpmarket JUCE skills: https://mcpmarket.com/tools/skills/juce-best-practices , https://mcpmarket.com/tools/skills/audio-plugin-gui-designer , https://www.ayclaude.com/skills/plugin-testing
- sebasdv juce-plugin skill: https://lobehub.com/skills/sebasdv-my-skills-juce-plugin
- shortwavlabs/agent-skills: https://github.com/shortwavlabs/agent-skills
- Jatin Chowdhury, Plugin Development Guidelines: https://gist.github.com/jatinchowdhury18/86d30d41f7e6a7453e636e203c7ed2b9
- JUCE `AudioProcessorParameter` version hints and the Logic index limitation: https://docs.juce.com/master/classjuce_1_1AudioProcessorParameter.html
- JUCE forum, versionHint in an updated product: https://forum.juce.com/t/audioparameter-versionhint-in-updated-product-does-this-work/53232
- JUCE forum, adding parameters post-launch: https://forum.juce.com/t/adding-parameters-post-launch-to-a-plugin/47502?page=2
- KVR, parameter input range and versioned state: https://www.kvraudio.com/forum/viewtopic.php?t=608721
- JUCE forum, development cycle and pluginval: https://forum.juce.com/t/development-cycle-of-a-audio-plugin/57180
- KVR, no single acid-test DAW: https://www.kvraudio.com/forum/viewtopic.php?t=521869
- JUCE tutorial, zipper noise and versioning: https://brendanjameslynskey.github.io/JUCE_Tutorial/
- Justin Malinow, getting started with JUCE (pitfalls list): https://justinmalinow.com/blog/getting-started-with-juce-audio-plugin-development
- Nathan Blair, Developing Audio Plugins (state and threads): https://nthnblair.com/thesis/
- Gearnews, the default preset: https://www.gearnews.com/default-preset-synth-sound-design/
- PresetPatch, voice allocation schemes: https://www.presetpatch.com/articles/synth-voice-allocation-schemes
- Moonbase, CI for audio plugins: https://moonbase.sh/articles/continuous-integration-for-audio-plugins-tips-tricks-gotchas/
- JUCE packaging tutorial, common marketplace rejections: https://juce.com/tutorials/tutorial_app_plugin_packaging/

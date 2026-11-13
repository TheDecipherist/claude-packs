# W11.0: five bandwarp tasks, done again on the 2.0 kit

The order (workorder W11 item 0): take real tasks the project's agents did on kit 1.9, hand the same briefs word for word to an agent working with the 2.0 kit, and compare. Five tasks were run, one after another, alone, started through the load governor at priority 0.3 on the efficiency cores. Seed 20261112 (`build/evidence/W11/ab-pick.md`); the clones and the original runs' records are described in `build/evidence/W11/ab-prep.md`. This file is the result.

## How it was run, and what to keep in mind before reading the rows

- Each task: a fresh clone of bandwarp at the commit before the original agent's first commit, the kit installed from this tree's packed tarball on top (one commit), the original brief given word for word with the worktree path replaced by the clone's. The clone has no remote and the project itself was never written.
- Models: macdsp's original ran on Opus (its transcript names `claude-opus-5-5`) and the new macdsp run's transcript also names `claude-opus-5-5`, so the row compares like with like; the other four are Sonnet in both. The hand-over note said all new runs used Sonnet; the transcripts show that is true for four of five.
- The kit that ran was the tarball packed on 2026-11-12 at 17:09, which is before the fixes for KWB-215 (making-check reading comments and whole rewritten files) and KWB-216 (a judge past its deadline leaves the event unjudged), both committed at 00:15 on 2026-11-13. These runs measure the kit as it stood before those two fixes. Their cost is counted below, and a second run on the fixed kit is the fair test of them.
- The original runs were made on the PC-era branch state and, for four of the five, were stopped and resumed (two or three resumes each) with the trunk merged in between, beside five other agents sharing the builds. The new runs are single uninterrupted sessions, alone, at low governor priority (the macdsp agent logged its builds as about four times slower, WB-210). Wall time and turns are therefore not a like-for-like speed test.
- The original tips of looks, settings, presets and developer are paused states ("done 0", gates not all measured); macdsp's is a finished, measured fix. The original records say which of their gates were measured; "not measured" is shown as such and is not a pass.
- Numbers: turns, tokens, wall time, hook waiting, refusals and retries come from the new run's own session transcript (`~/.claude/projects/<clone>/<session>.jsonl`, the same kind of file the original records were made from) through `scripts/ab-compare.mts` and `scripts/ab-transcript.mts`. The stream-json copy the lead saved (`build/evidence/W11/ab/TASK/transcript.jsonl`) gives the same turns, input and cache tokens but a few percent of the output tokens (it records the first chunk of a message), and its hook records carry no durations, so it was not used for those two columns. The tool's `files changed` includes the clone's untracked `BRIEF.md`. `refusals` and `retries` are the reader's: a hook error on a tool call and the next call of the same tool. The kit's own refusal log counts more (it also holds the end-of-turn send-backs); both are shown.
- `hook waiting` is the sum of the hook durations in the transcript's hook records, the same measure as the original. The kit's event log (`.claude/logs/events.jsonl` in each clone) gives a larger sum of the time spent inside hooks; it is shown as its own line because the original has no such number.
- Gates: the brief's gate command was run in each clone (`cmake --preset dev`, `cmake --build --preset dev`, `ctest --preset dev -R <gates and twins>`) through the clone's own `quiet-test.mjs`, one clone at a time under the governor; output in `build/evidence/W11/gates/TASK.txt`, results in `gates/TASK-gates.json` (the format `ab-compare` reads). A new run's gates are the ones it built; the original's names are shown beside, `absent` where the new tree names the test differently, `not measured` where the original record says so.

## The five tasks

### macdsp

model: claude-opus-5-5 (original), claude-opus-5-5 (new)

| gate | original | new run |
| --- | --- | --- |
| neutral_exact | pass | pass (twin pass) |
| signal_path | pass | pass (twin pass) |
| cluster_peaks | pass | pass (twin pass) |
| bits_stage | pass | pass (twin pass) |
| fshift | pass | pass (twin pass) |
| input_pitch | pass | pass (twin pass) |
| editions_scan | pass | pass (twin pass) |
| full_equals_development | not measured | fail (twin pass): 287743 of 431616 samples differ |
| licence_starts | not measured | fail (twin fail): throwaway key pair and machine-key rows red (B-103/B-104) |

| measure | original | new run |
| --- | --- | --- |
| files changed | 12 | 15 |
| turns | 246 | 337 |
| tokens in | 504 | 695 |
| tokens out | 88017 | 131789 |
| tokens cached read | 26552199 | 94111271 |
| tokens cached write | 508097 | 479469 |
| wall (s) | 1839 | 3009 |
| hook waiting (s) | 23 | 2 |
| refusals | 5 | 2 |
| retries | 5 | 2 |

- same as the original's: tests/gates_main.cpp
- differs from the original's: CMakeLists.txt (+3 -4), bugs.md (+5 -7), build.md (+2 -4), docs/workorders/bandwarp/agents/macdsp.json (+1 -1), docs/workorders/bandwarp/decisions.md (+3 -5), docs/workorders/bandwarp/progress.md (+4 -4), tests/demo.cmake (+17 -12), tests/gates.cmake (+1 -6), tests/neutral_exact.cpp (+70 -55), tests/signal_path.cpp (+7 -13), workflow-bugs.md (+6 -4) (each to be read and judged better, equal or worse)
- only in the original: none
- only in the new run: BRIEF.md, tests/harness.h, tests/processor_rig.h


Kit-side measures (the clone's `.claude/logs`, new run only; the original has no such log on this machine):

| measure | new run |
| --- | --- |
| refusals in the kit's refusal log | 8 (no-find 1, build-guard 1, time-guard 1, making-check 5) |
| making-check end-of-turn send-backs (KWB-215) | 5 |
| hooks "not judged (over time)" (KWB-216) | 0 |
| time inside hooks, from the event log (s) | 84 over 1734 events |
| wall from the start and end files (s) | 3011 |

Gates run here (the gate command of the brief, in the clone, through its own `quiet-test.mjs`; output `build/evidence/W11/gates/macdsp.txt`): 14 tests (7 gates and their twins) passed. The two gates the original did not measure (`full_equals_development`, `licence_starts`, registered here as `BandWarp.bandwarp_licence_gates.*`, waiting on B-103 and B-104) were run once in this clone as well (`gates/macdsp-licence.txt`): both fail, `full_equals_development` with 287743 of 431616 samples differing and `licence_starts` on its key-pair and machine-key rows. They are open for the original too, so they are not counted as a loss. Running them wrote their throwaway key files into a `keys` folder in the Mac user's home (the known B-104 fault of those gates); nothing else was written outside the clone.

Model: both runs are Opus, as the original agent's transcript names.

Diff against the original, read file by file (the original's tip also carries trunk merges that are not the agent's work, so the comparison is on the 12 files the original agent's own commits changed, `originalFiles` in the record):
- `CMakeLists.txt`: the same fix, `-ffp-contract=off` for GNU and Clang, set before JUCE is added; only the comment differs. Equal.
- `tests/neutral_exact.cpp`: both turn the Mac's fused multiply-add into a red gate and keep the bit-for-bit clause. The original reads every neutral control's round trip and plants a fused `fma`; the new run reads every control out of the tree against the table default and the morph point's centre bit for bit, and prints but does not judge CUTOFF's 1000 Hz inside its skewed range. Both twins plant a one-step fault and are seen. Equal: neither loosens a clause into a tolerance, and removing the flag turns each red.
- `tests/demo.cmake` (`editions_scan`'s per-platform binary names, B-105): the same four-way (Apple, Windows, Linux) split; the new run keeps the artefact folders in two variables and writes the Linux library under the processor's own name (`${CMAKE_SYSTEM_PROCESSOR}-linux`), where the original wrote `x86_64-linux`. Equal on the Mac, slightly better for an ARM Linux build.
- `tests/signal_path.cpp`, `tests/harness.h`, `tests/processor_rig.h`: the new run prints the first differing sample's value and its expected value, so a gain a rounding off shows as a ratio; the original reduced the helper to one function and returned the latency. Equal: both are diagnostics, neither changes what a gate judges. The new run's `harness.h` change is the one that tripped KWB-215 (below).
- `tests/gates.cmake`, `tests/gates_main.cpp`: the same registration of `neutral_exact`; the 1200 s limit for `cluster_resonator` is the trunk's B-106, not this agent's. Equal.
- `bugs.md`, `build.md`, `decisions.md`, `progress.md`, `agents/macdsp.json`, `workflow-bugs.md`: the same kinds of notes in different words. The new run logged three workflow faults (WB-210: its builds and tests ran at low priority, four times slower, which is the governed start the order asks for; WB-211 and WB-212: making-check reading other steps' making-line prose, and a rewritten file's comment, as concept names, which is KWB-215); the original logged one (a build guard reading a preset's own targets as a build of everything). Equal as notes.

Verdict: equal on gates and on the diff, worse on cost (337 turns against 246, 3009 s against 1839 s, 3.5 times the cached read). The new run started at governor priority 0.3 on the efficiency cores, alone, and logged that its builds and tests ran about four times slower for it (WB-210), so part of the wall time is the governed start and not the model; the original ran in three sessions beside five other agents. Not worse on a gate, so no second run is required by the order's rule.

### looks

model: claude-sonnet-5-5 (original), claude-sonnet-5-5 (new)

| gate | original | new run |
| --- | --- | --- |
| look_panel | pass | pass (twin pass) |
| look_panel_graphite | pass | fail (twin fail) |
| look_panel_deep | pass | fail (twin fail) |
| look_panel_night | pass | fail (twin fail) |
| panel_themes | pass | pass (twin pass) |
| theme_table | not in the original | pass (twin pass) |

| measure | original | new run |
| --- | --- | --- |
| files changed | 29 | 15 |
| turns | 202 | 106 |
| tokens in | 416 | 224 |
| tokens out | 87847 | 63217 |
| tokens cached read | 23328070 | 18382250 |
| tokens cached write | 721805 | 501401 |
| wall (s) | 2347 | 1548 |
| hook waiting (s) | 23 | 3 |
| refusals | 4 | 5 |
| retries | 4 | 5 |

- same as the original's: none
- differs from the original's: bugs.md (+3 -6), build.md (+7 -8), build/evidence/looks/warm-panel.json (+23 -24), docs/workorders/bandwarp/agents/looks.json (+1 -1), docs/workorders/bandwarp/decisions.md (+2 -8), docs/workorders/bandwarp/progress.md (+4 -7), panel/themes.json (+7 -8), src/ui/CardPainter.cpp (+3 -3), src/ui/CardPainter.h (+3 -2), src/ui/SlideSwitch.cpp (+12 -13), src/ui/generated/Theme.h (+6 -7), tests/gates.cmake (+10 -24) (each to be read and judged better, equal or worse)
- only in the original: .claude/layout.json, build/evidence/W8/looks-b33-panel-1.txt, build/evidence/W8/looks-themes-gates-1.txt, build/evidence/W8/looks-themes-gates-2.txt, build/evidence/W8/looks-themes-plants-1.txt, build/evidence/W8/looks-themes-table-gates-1.txt, build/evidence/W8/looks-warm-plants-1.txt, build/evidence/looks/deep-panel.json, build/evidence/looks/graphite-panel.json, build/evidence/looks/night-panel.json, design/reference/deep/panel.depth.analysis.md, design/reference/graphite/panel.depth.analysis.md, design/reference/night/panel.depth.analysis.md, tests/look_gate.py, tests/look_render.cpp, tools/look/measure_depth.py, tools/look/theme_tokens.py
- only in the new run: BRIEF.md, tools/look/fit_depth.py, workflow-bugs.md


Kit-side measures (the clone's `.claude/logs`, new run only; the original has no such log on this machine):

| measure | new run |
| --- | --- |
| refusals in the kit's refusal log | 9 (no-find 1, making-check 4, code-shape 2, git-guard 1, template-law 1) |
| making-check end-of-turn send-backs (KWB-215) | 4 |
| hooks "not judged (over time)" (KWB-216) | 3 |
| time inside hooks, from the event log (s) | 27 over 434 events |
| wall from the start and end files (s) | 1549 |

Gates run here (output `build/evidence/W11/gates/looks.txt`): the WARM gate `look_panel`, `panel_themes` and `theme_table` pass with their twins. `look_panel_graphite`, `look_panel_deep` and `look_panel_night` and all three twins fail: 6 of the 12 tests are red, and the original passed all five of its gates. The reds are the dark themes' depth rows and, on DEEP and NIGHT, the surface colour (the new run did not sample the cards as the original did, d-114): the card edges the picture shows (0.05 to 0.17) against 0.00 to 0.03 in the render, with the colour plant "NOT SEEN" on the dark themes.

Model: Sonnet both times. The original ran as three sessions with two resumes (the second resume brief names the trunk merge and the first session's measured WARM gate); the new run is one session.

Diff against the original, read file by file:
- `src/ui/SlideSwitch.cpp`, `src/ui/CardPainter.{h,cpp}`, `panel/themes.json`, `src/ui/generated/Theme.h`: both fix the WARM slide switch (the slot's lit edge, the clipped shadow, the cap wider than the groove, the rim). The original keeps the shadow radius and offset as tokens and keeps the component wider than the groove so the shadow is not clipped; the new run turns off clipping (`setPaintingIsUnclipped`) and zeroes the slot lit edge. Both are green on WARM. Equal for WARM.
- `panel/themes.json` dark themes: the original fits the dark themes' depth amounts to their pictures (d-112) after judging the dark rows pooled over a card's four sides and holding one named row out (d-113, d-114: the surface read at the cards). The new run keeps the per-side rows, finds eight uniform amounts cannot express the pictures' per-side light (its B-111), sets the amounts to zero and leaves three gates red. Worse for the new run on gates; the original's pooling is a change of the measure with its reason written, the new run's is a stricter measure left red. A judgement call that belongs to a second run and the user, not to this table.
- `tests/gates.cmake`: the three per-theme gates and twins, registered in a loop by the new run and written out by the original. Equal.
- `tests/look_gate.py`, `tests/look_render.cpp`, `tools/look/measure_depth.py`, `tools/look/theme_tokens.py`: changed only by the original (the pooled rows, the held-out row, the card-surface sampler). Not changed by the new run: that is where the dark gates stay red.
- `tools/look/fit_depth.py`: new, only in the new run, a fitter for the eight depth amounts; it is how the new run showed the pictures cannot be fitted. Better as evidence, not a fix.
- `.claude/layout.json`: the original declares the dark looks so `look-gate` needs their reports; the new run did not, on purpose (its report says so), which is why its red dark gates do not block a landing. Worse for the new run: an undeclared look is not guarded.
- `build/evidence/looks/*.json`, `design/reference/*/panel.depth.analysis.md`: the original committed the three dark themes' reports and analyses; the new run committed WARM's report only. Worse.
- `bugs.md`, `build.md`, decisions, progress, `workflow-bugs.md`: notes; the new run's `build.md` reformats four earlier steps' making lines to get past a making-check false match (its WB-160), a change outside its area. Equal on content, worse on scope.

Verdict: worse on gates (3 dark-theme gates red that the original passed) and worse on the diff (dark themes, layout declaration, reports). This task needs a second run before anything is concluded. No kit fault is shown to have caused the shortfall: 4 making-check send-backs cost 25 turns (KWB-215) out of 106, and 3 hooks went "not judged (over time)" (KWB-216), but the run stopped on a measurement it judged unreachable, not on a refusal. The second run should say whether it is Sonnet's sampling or the missing resume brief.

### settings

model: claude-sonnet-5-5 (original), claude-sonnet-5-5 (new)

| gate | original | new run |
| --- | --- | --- |
| settings_menu | not measured | absent (this tree names it settings_layer) |
| layer_settings | not measured | absent (this tree names it settings_layer) |
| layer_idle | not measured | pass (twin pass) |
| settings_kept | not measured | pass (twin pass) |
| settings_layer | not in the original | pass (twin pass) |
| layer_routes | not in the original | pass (twin pass) |
| layer_routes_table_is_clean | not in the original | pass (twin pass) |
| panel_themes | not in the original | pass (twin pass) |

| measure | original | new run |
| --- | --- | --- |
| files changed | 53 | 48 |
| turns | 242 | 171 |
| tokens in | 496 | 352 |
| tokens out | 232411 | 192235 |
| tokens cached read | 37568511 | 55109922 |
| tokens cached write | 1232885 | 540860 |
| wall (s) | 2155 | 1594 |
| hook waiting (s) | 24 | 5 |
| refusals | 22 | 22 |
| retries | 20 | 22 |

- same as the original's: none
- differs from the original's: CMakeLists.txt (+15 -21), build.md (+1 -10), docs/workorders/bandwarp/agents/settings.json (+1 -1), docs/workorders/bandwarp/decisions.md (+6 -12), src/app/Processor.cpp (+14 -29), src/app/Processor.h (+12 -26), src/app/StandaloneWindow.cpp (+15 -12), src/ui/Editor.cpp (+23 -18), src/ui/Editor.h (+17 -44), src/ui/settings/DeviceRows.cpp (+193 -93), src/ui/settings/DeviceRows.h (+17 -19), src/ui/settings/Fields.cpp (+22 -69), src/ui/settings/Fields.h (+27 -29), src/ui/settings/ModulationPage.cpp (+59 -185), src/ui/settings/ModulationPage.h (+29 -49), src/ui/settings/RowsPage.cpp (+85 -92), src/ui/settings/RowsPage.h (+26 -41), src/ui/settings/SettingRows.cpp (+147 -47), src/ui/settings/SettingRows.h (+30 -26), src/ui/settings/SettingsLayer.cpp (+121 -179), src/ui/settings/SettingsLayer.h (+33 -47), tests/gates.cmake (+14 -24), tests/gates_main.cpp (+5 -7), tests/layer_idle.cpp (+47 -78) (each to be read and judged better, equal or worse)
- only in the original: bugs.md, docs/menus/settings.mmd, src/audio/FilterControls.h, src/audio/FilterStage.cpp, src/audio/FilterStage.h, src/audio/MidiInput.cpp, src/audio/MidiInput.h, src/audio/ModSources.cpp, src/audio/ModSources.h, src/params/AppSettings.cpp, src/params/AppSettings.h, src/ui/Activity.h, src/ui/EditorSettings.cpp, src/ui/Themed.h, src/ui/settings/DeveloperHost.cpp, src/ui/settings/DeveloperHost.h, src/ui/settings/Environment.cpp, src/ui/settings/Environment.h, src/ui/settings/RowControls.cpp, src/ui/settings/RowControls.h, src/ui/settings/SettingsMenu.cpp, src/ui/settings/SettingsMenu.h, src/ui/settings/ThemeTiles.cpp, src/ui/settings/ThemeTiles.h, tests/layer_rig.h, tests/layer_settings.cpp, tests/processor_rig.h, tests/settings_kept.cpp, tests/settings_menu.cpp
- only in the new run: BRIEF.md, docs/menus/menu.mmd, docs/workorders/bandwarp/progress.md, src/app/StandaloneWindow.h, src/ui/settings/Binding.h, src/ui/settings/DeveloperFactory.cpp, src/ui/settings/DeviceOwner.h, src/ui/settings/FieldKit.h, src/ui/settings/FieldsPickers.cpp, src/ui/settings/FieldsToggles.cpp, src/ui/settings/LayerBinding.cpp, src/ui/settings/LayerBinding.h, src/ui/settings/ModulationLayout.h, src/ui/settings/ModulationRoutes.cpp, src/ui/settings/RouteData.h, src/ui/settings/RouteTableJson.cpp, src/ui/settings/SettingsHost.cpp, src/ui/settings/SettingsHost.h, src/ui/settings/SettingsRoutes.cpp, src/ui/settings/SettingsRoutes.h, src/ui/settings/TabPage.h, tests/layer_routes.cpp, tests/settings_layer.cpp, workflow-bugs.md


Kit-side measures (the clone's `.claude/logs`, new run only; the original has no such log on this machine):

| measure | new run |
| --- | --- |
| refusals in the kit's refusal log | 33 (code-shape 11, settings-layer 1, file-size-guard 1, template-law 8, once-only 6, lesson-checks 1, no-polling 1, build-guard 1, making-check 3) |
| making-check end-of-turn send-backs (KWB-215) | 3 |
| hooks "not judged (over time)" (KWB-216) | 25 |
| time inside hooks, from the event log (s) | 60 over 805 events |
| wall from the start and end files (s) | 1595 |

Gates run here (output `build/evidence/W11/gates/settings.txt`): 11 tests, all passed: `layer_idle`, `settings_kept`, `settings_layer`, `layer_routes`, `layer_routes_table_is_clean` and `panel_themes` with their twins. The original's `settings_menu` and `layer_settings` do not exist in the new tree (it tests the layer as `settings_layer`); the original's record says none of its four named gates was measured (the branch was paused with "done 0" of 6 items), so there is no original pass to compare with and no gate the new run failed.

Model: Sonnet both times. The original ran as four sessions with a resume; the new run is one session.

Diff against the original, read at the level of structure (53 and 48 files; the two layers share almost no file content, so line diffs say little):
- Layout of the layer: the original has `SettingsMenu`, `ThemeTiles`, `Environment`, `RowControls`, `DeveloperHost` and one `layer_rig.h` for its tests; the new run has `SettingsHost`, `SettingsLayer`, `RowsPage`, `ModulationPage`, `FieldKit` and the field files, `DeviceRows`, and a route table it writes out for the kit's route-table tool. Equal in kind; the new run's route table checked by the kit tool (`layer_routes_table_is_clean`, 10 laws, with its planted twin) is a gate the original has no counterpart for. Better.
- Settings taking effect: the original wires the processor and the audio side (`MidiInput`, `ModSources`, `FilterStage`, `FilterControls`: centre note, mute input, MIDI learn, velocity to depth) and the editor (`applySetting`). The new run stores QWERTY on/off and octave, sustain pedal, centre note, velocity to depth, reduce motion, knob drag and double-click reset but nothing reads most of them yet (its d-124); its sample-rate and MIDI-input rows reach the device manager with no gate (open). Worse for the new run on scope.
- Item 6 (look gates for settings, modulation and interface): not started by the new run; the original's record does not show it either. Equal.
- `src/app/Processor.*`, `src/ui/Editor.*`, `CMakeLists.txt`, `tests/gates.*`: both change them to host the layer; the new run's Processor takes a settings folder (a test build gets a temporary one, B-104). Equal.
- Notes (`build.md`, `decisions.md`, `progress.md`, `workflow-bugs.md`): the new run logged two kit faults (its WB-170 and WB-171), 22 refusals; the original 22. Equal.

Verdict: gates better (8 measured and green against none measured), diff worse on scope (fewer settings take effect, device restart not gated). Mixed, so a second run is advisable before concluding; the original being an unmeasured pause means it is not a clean reference. KWB-215 cost this run 3 send-backs and 9 turns (one for the word "never" in the making line, as the KWB row says).

### presets

model: claude-sonnet-5-5 (original), claude-sonnet-5-5 (new)

| gate | original | new run |
| --- | --- | --- |
| neutral_exact | pass | absent (macdsp's gate; this base does not have it) |
| presets_bank | pass | pass (twin pass) |
| presets_spread | pass | pass (twin pass) |
| presets_init | not in the original | fail (twin pass): INIT is not BURN alone bit for bit, largest 1.49e-08 (B-102, fixed on the macdsp branch) |
| presets_browser | not in the original | fail (twin pass): a press through the window peer does not reach (B-103) |
| factory_bank_is_current | not in the original | pass (twin pass) |
| factory_bank_covers_controls | not in the original | pass (twin pass) |

| measure | original | new run |
| --- | --- | --- |
| files changed | 32 | 28 |
| turns | 154 | 119 |
| tokens in | 326 | 244 |
| tokens out | 136501 | 155856 |
| tokens cached read | 16623269 | 30900573 |
| tokens cached write | 870756 | 471230 |
| wall (s) | 2010 | 2705 |
| hook waiting (s) | 18 | 4 |
| refusals | 10 | 15 |
| retries | 10 | 15 |

- same as the original's: none
- differs from the original's: CMakeLists.txt (+0 -8), bugs.md (+3 -11), build.md (+2 -6), data/factory.csv (+37 -33), design/shape.json (+19 -3), docs/workorders/bandwarp/agents/presets.json (+1 -1), docs/workorders/bandwarp/decisions.md (+8 -10), docs/workorders/bandwarp/progress.md (+1 -6), src/app/Processor.cpp (+32 -12), src/app/Processor.h (+8 -6), src/params/Bank.cpp (+133 -114), src/params/Bank.h (+60 -46), src/params/Layout.cpp (+15 -3), src/params/Layout.h (+5 -5), src/params/UserPresets.cpp (+11 -11), src/params/UserPresets.h (+10 -9), src/params/generated/FactoryBank.h (+438 -198), src/ui/PresetDisplay.cpp (+22 -12), src/ui/PresetDisplay.h (+7 -4), tests/gates.cmake (+33 -13), tests/gates_main.cpp (+5 -4), tests/presets_bank.cpp (+151 -177), tests/presets_spread.cpp (+189 -129), tools/presets/gen_bank.py (+173 -234) (each to be read and judged better, equal or worse)
- only in the original: src/audio/RouteText.cpp, src/audio/RouteText.h, src/params/BankTypes.h, src/params/ExactNormalised.h, src/params/Patch.cpp, src/params/Patch.h, src/ui/Editor.cpp, src/ui/Editor.h
- only in the new run: BRIEF.md, tests/presets_browser.cpp, tests/presets_init.cpp, workflow-bugs.md


Kit-side measures (the clone's `.claude/logs`, new run only; the original has no such log on this machine):

| measure | new run |
| --- | --- |
| refusals in the kit's refusal log | 20 (shape-law 6, code-shape 5, lesson-checks 4, brief-guard 1, stage-guard 1, git-guard 1, no-find 1, making-check 1) |
| making-check end-of-turn send-backs (KWB-215) | 1 |
| hooks "not judged (over time)" (KWB-216) | 11 |
| time inside hooks, from the event log (s) | 47 over 448 events |
| wall from the start and end files (s) | 2707 |

Gates run here (output `build/evidence/W11/gates/presets.txt`): 12 tests, 10 passed. `presets_bank`, `presets_spread`, `factory_bank_is_current` and `factory_bank_covers_controls` pass with their twins. `presets_init` and `presets_browser` fail with their twins passing: the first because INIT is not BURN alone bit for bit (largest 1.49e-08, the Mac's fused multiply-add, B-102, whose fix is the macdsp task's `-ffp-contract=off` and is not in this task's base), the second because a press through the window's peer does not reach the arrows and BANK on the Mac (B-103). Both are the new run's own extra gates and both reds are base faults the new run named in its report. `neutral_exact`, listed as a pass in the original, is macdsp's gate, merged into the original's tip from the trunk; this task's base does not have it, so it is not run here. Counting the two brief gates the original passed (`presets_bank`, `presets_spread`): 2 of 2 pass in the new run.

Model: Sonnet both times. The original ran as four sessions with three resumes; the new run is one session.

Diff against the original, read file by file (the two banks share a purpose and a CSV, not code):
- `data/factory.csv`: both hold INIT beside 32 presets in four categories of 8. The names and categories differ (the original's TONE category among them, the new run's SWEEP, VOICE, RING and WRECK). Equal in shape; the sounds are a matter of taste and the spread gate judges both as 33 of 33 distinct.
- `src/params/Bank.{h,cpp}`: the original has a `Browser` class over free functions and a `BankTypes.h`; the new run has one `Bank` class with a cursor and `FactoryBank.h` generated by `tools/presets/gen_bank.py` (`--check`, `--coverage`). Equal in kind; the new run's `Layout::asHeld` makes a preset's text exactly what the tree gives back after a load (the same job as the original's `heldValueOf` and `ExactNormalised.h`). Equal.
- `src/params/Patch.{h,cpp}`, `src/audio/RouteText.{h,cpp}`, `BankTypes.h`, `ExactNormalised.h`: the original changed the patch reader and the route text and added two headers; the new run leaves them as they are and calls `writePatch` and `readPatch` from `Bank`. Better for the new run: fewer files touched for the same job, provided the round-trip gate (green) holds.
- `src/ui/Editor.{h,cpp}`, `src/ui/PresetDisplay.*`, `src/app/Processor.*`: both wire the header's arrows and BANK; the new run does it in `Processor::createEditor` and gives BANK a fixed press zone, the original takes the right 30 percent of the face. Equal.
- `design/shape.json`: the new run adds `preset` and `category` as many; its `preset` generator text names the CSV `data/presets/factory.csv` while the file is `data/factory.csv`. A wrong path in a comment: worse, small.
- `tests/presets_bank.cpp`, `presets_spread.cpp`: both gates; the new run adds `presets_init`, `presets_browser` and the coverage check of the generator (`--coverage` with its planted twin). Better for the new run: more of the brief's Done when measured, with the two reds named for their cause.
- `CMakeLists.txt`, `tests/gates.*`: registrations. The original's diff shows the trunk's `-ffp-contract=off`, which is not this agent's. Equal.
- notes (decisions d-140 to d-147, B-140, WB-190, WB-191): the new run logged two kit faults in shape-law (it read "20 dB" as preset 20 and a step of one as preset 1) and marked both wrong. Equal.

Verdict: equal on the brief's two gates, equal-to-better on the diff, with two extra gates red for base faults outside the task. Cost: 119 turns against 154, 2707 s against 2010 s, 15 refusals against 10 (6 of them shape-law). No second run required by the rule; the shape-law false reads are a kit finding.

### developer

model: claude-sonnet-5-5 (original), claude-sonnet-5-5 (new)

| gate | original | new run |
| --- | --- | --- |
| developer_library | pass | pass (twin pass) |
| developer_player | pass | absent (this tree splits it into pitch, exact and loop) |
| developer_host | pass | absent (this tree splits it into keys and note) |
| developer_alloc | pass | pass (twin pass) |
| developer_page | not measured | pass (twin pass) |
| developer_pitch | not in the original | pass (twin pass) |
| developer_exact | not in the original | pass (twin pass) |
| developer_loop | not in the original | pass (twin pass) |
| developer_keys | not in the original | pass (twin pass) |
| developer_note | not in the original | pass (twin pass) |
| developer_kept | not in the original | pass (twin pass) |

| measure | original | new run |
| --- | --- | --- |
| files changed | 36 | 41 |
| turns | 143 | 127 |
| tokens in | 297 | 262 |
| tokens out | 146795 | 148381 |
| tokens cached read | 17121933 | 30338024 |
| tokens cached write | 711467 | 459625 |
| wall (s) | 1692 | 1432 |
| hook waiting (s) | 10 | 5 |
| refusals | 12 | 13 |
| retries | 11 | 13 |

- same as the original's: none
- differs from the original's: CMakeLists.txt (+13 -26), build.md (+5 -8), design/shape.json (+5 -7), docs/chart/bandwarp.mmd (+14 -18), docs/workorders/bandwarp/agents/developer.json (+1 -1), docs/workorders/bandwarp/decisions.md (+8 -7), src/app/Processor.cpp (+27 -5), src/app/Processor.h (+7 -6), src/audio/SampleLibrary.cpp (+45 -89), src/audio/SampleLibrary.h (+30 -43), src/audio/SampleLoad.cpp (+29 -81), src/audio/SampleLoad.h (+19 -10), src/params/AppSettings.h (+1 -2), src/ui/Editor.cpp (+3 -2), src/ui/settings/DeveloperPage.cpp (+120 -117), src/ui/settings/DeveloperPage.h (+34 -42), tests/developer_alloc.cpp (+101 -89), tests/developer_library.cpp (+65 -170), tests/developer_rig.h (+77 -102), tests/gates.cmake (+4 -21), tests/gates_main.cpp (+4 -8) (each to be read and judged better, equal or worse)
- only in the original: bugs.md, src/audio/BuiltInSignal.cpp, src/audio/BuiltInSignal.h, src/audio/DeveloperPlayer.cpp, src/audio/DeveloperPlayer.h, src/audio/DeveloperPlayerAudio.cpp, src/audio/SampleLoader.cpp, src/audio/SampleLoader.h, src/audio/SampleNames.cpp, src/audio/SampleNames.h, src/audio/SampleReader.cpp, src/audio/SampleReader.h, tests/developer_host.cpp, tests/developer_page.cpp, tests/developer_player.cpp
- only in the new run: BRIEF.md, docs/workorders/bandwarp/progress.md, src/app/ProcessorLatency.cpp, src/audio/DeveloperDeck.cpp, src/audio/DeveloperDeck.h, src/audio/SampleName.cpp, src/audio/SampleName.h, src/audio/SamplePlayer.cpp, src/audio/SamplePlayer.h, src/audio/SampleResample.cpp, src/audio/SampleResample.h, src/audio/SampleVoice.cpp, src/audio/SampleVoice.h, tests/developer.cmake, tests/developer_gate.cpp, tests/developer_keys.cpp, tests/developer_parts.h, tests/developer_signal.cpp, tests/developer_state.cpp, workflow-bugs.md


Kit-side measures (the clone's `.claude/logs`, new run only; the original has no such log on this machine):

| measure | new run |
| --- | --- |
| refusals in the kit's refusal log | 18 (no-find 1, git-guard 1, lesson-checks 2, code-shape 4, shape-law 4, realtime-guard 1, template-law 4, making-check 1) |
| making-check end-of-turn send-backs (KWB-215) | 1 |
| hooks "not judged (over time)" (KWB-216) | 10 |
| time inside hooks, from the event log (s) | 46 over 510 events |
| wall from the start and end files (s) | 1434 |

Gates run here (output `build/evidence/W11/gates/developer.txt`): 18 tests, all passed: `developer_library`, `developer_alloc`, `developer_page`, and the parts `developer_pitch`, `developer_exact`, `developer_loop`, `developer_keys`, `developer_note`, `developer_kept`, each with its twin. The new tree runs one `developer` gate per part, so the original's `developer_player` and `developer_host` do not exist under those names (their clauses are the pitch, exact and loop parts and the keys and note parts). The original's `developer_page` was not measured (the page's clicks waited on B-103); the new run's passes, with its buttons pressed by `triggerClick()` and the message loop and not through the window's peer, as its report says. Of the four gates the original passed, 2 are present and pass under the same name and 2 are covered by renamed parts that pass.

Model: Sonnet both times. The original ran as three sessions with two resumes; the new run is one session.

Diff against the original, read at the level of structure (36 and 41 files; the two share the task, not the code):
- The sample library and player: the original has `SampleLoader`, `SampleReader`, `SampleNames`, `BuiltInSignal`, `DeveloperPlayer` and `DeveloperPlayerAudio`; the new run has `SampleName`, `SamplePlayer`, `SampleVoice`, `SampleResample` and `DeveloperDeck`, and rewrites `SampleLibrary` and `SampleLoad`. Equal in kind; the new split has smaller files, and its resampler is a file of its own with a pitch gate (1000 Hz read at 48 kHz measures 1000.0000 Hz, twin 146.7 cents).
- The compile switch: the original builds the sample code only while `BANDWARP_DEVELOPER` is ON; the new run adds `SampleLibrary`, `SampleLoad`, `SamplePlayer`, `SampleVoice`, `SampleResample` and `DeveloperDeck` to the main source list for every build and only the page and the processor wiring behind the flag (its own report says so). Worse for the new run: the project's decision is that the flag is ON until release work names it OFF, and with the new arrangement turning it OFF would no longer remove the sample code from a shipped binary. `editions_scan` was not run on this tree.
- The settings row `developer.added` (files added one by one) is dropped from `AppSettings.h`; the new run keeps added files in its deck's own state and its `developer_kept` gate shows them coming back. Equal if that gate holds, which it does.
- `tests/developer.cmake` (new) replaces five gate files and five registrations with one registration looped over the parts; the allocation gate counts `operator new` on the audio thread (0 over 400 blocks while a 200 MB file loads) in both. Equal.
- `src/app/Processor.*`, `ProcessorLatency.cpp`, `Editor.cpp`, `CMakeLists.txt`, `design/shape.json`, `docs/chart/bandwarp.mmd`: the wiring; the new run could not run the chart checker (its WB-181: the checker's folder is missing in a clone), so it read the chart edit by eye. Equal; the unchecked chart edit is a small risk.
- Notes: the new run logged two kit faults (WB-180: shape-law refused a plain queue type as an instance container, marked wrong; WB-181 above). Equal.

Verdict: equal on gates (all pass, more of the Done when measured, the page now measured), and equal on the diff apart from one worse point, the unconditional compile of the sample code. Cost: 127 turns against 143, 1432 s against 1692 s, hook waiting 5 s against 10 s. No second run is required by the rule; the compile switch is a thing to look at before the real merge.

## Turns lost to KWB-215 (making-check)

The kit's end-of-turn check (`making-check`) sent a turn back 14 times across the five runs (the kit's refusal log, one entry per send-back, each a forced extra turn). In each send-back the agent's next turns, up to the next Stop event, are the repair (`ab-measure/lost.txt`):

| task | send-backs | what the check said | repair turns until the next Stop | KWB |
| --- | --- | --- | --- | --- |
| macdsp | 5 | words of the making line ("its", "the", "knob") read as concepts; then `bell` "written" by a rewritten file whose first-line comment held an array name | 19 | KWB-215 (both halves) |
| looks | 4 | words of the making line ("its", "the", "knob") read as concepts | 25 | KWB-215 |
| settings | 3 | `bell` "written" by a rewritten `Processor.cpp`; then "where", "holds", "never" in the making line read as concepts | 9 | KWB-215 |
| presets | 1 | `lfo`, `envelope` "written" by a rewritten `gen_bank.py` | 2 | possibly KWB-215 (a whole-file read), not confirmed |
| developer | 1 | `bell`, `envelope` "written" by rewritten source files | 2 | possibly KWB-215, not confirmed |

KWB-215 therefore cost 53 repair turns of 860 in the three tasks it is certain for (6 percent of the five runs' 860 turns) and 4 more where it is likely. The fix is on this branch's base (`6cb0b5a`); these runs did not have it. KWB-216 ("not judged (over time)") appears 49 times in the kit's crash log of the four governed runs that have one (looks 3, settings 25, presets 11, developer 10; macdsp 0), each an event a hook did not judge before its deadline at priority 0.3 on the efficiency cores. Every one of them was a judge that could have refused; the runs went on without it. Also not fixed in these runs.

## Hooks that refused, by run

Refusals in the kit's log: macdsp 8, looks 9, settings 33, presets 20, developer 18 (88). By hook, the larger groups: settings code-shape 11, template-law 8, once-only 6; presets shape-law 6, code-shape 5, lesson-checks 4; developer code-shape 4, shape-law 4, template-law 4. The agents marked their own refusals: settings 30 marked, 2 wrong (WB-170 template-law reads same-named functions in different files as a copy; WB-171 `cpp-no-mutable-global` reads a typedef'd function declaration as a variable); presets 2 wrong (WB-190 shape-law reads "20 dB" as preset 20; WB-191 reads a step of one as preset 1); developer 1 wrong (WB-180 shape-law refuses a plain queue type as an instance container); looks 2 wrong (both making-check, KWB-215). Whether these false reads are new in 2.0 or were in 1.9 is not shown by this comparison: the original agents' refusal counts are of the same size (53 refusals in the five original runs against 57 in the new ones by the same reader).

## Proposed workflow-bugs rows (the lead writes `workflow-bugs.md`)

- looks: no kit fault is shown to have caused the three red dark-theme gates. KWB-215 cost 4 send-backs and 25 turns of 106; the agent stopped because it judged the dark pictures not fittable with eight uniform depth amounts (its B-111), after fitting them, and left the gates red on purpose. The cause is a different choice from the original's (the original pooled the four sides and held one row out, d-112 and d-113), not a hook. No row proposed; a second run is the way to learn whether the choice is stable.
- Candidate row, shape-law: "[false refusal] shape-law reads a number with a unit (`20 dB`) and a step of one as an instance index of a many concept, and a plain queue type as an instance container: 11 refusals in the presets and developer A/B runs (WB-190, WB-191, WB-180 of those runs), each marked wrong by the agent; seen in `build/evidence/W11/ab/{presets,developer}/transcript.jsonl` and the clones' `.claude/logs/refusals.jsonl`. To do: read a concept's instance only from its declared selector or word, never from a bare number." Check against 1.9 first.
- Candidate row, template-law and the C++ lesson check: "template-law reads same-named functions in different files as a copy (8 refusals in the settings run, WB-170); `cpp-no-mutable-global` reads a typedef'd function declaration as a variable (WB-171)". Check against 1.9 first.
- Add to KWB-216: "seen 49 times in W11.0's four governed runs (before the fix): once-only 20, template-law 11, lesson-checks 6, shape-law 5, code-shape 3, git-guard 2, secrets-guard 1, repo-litter 1, at governor priority 0.3 on the efficiency cores".
- Add to KWB-215: "W11.0 totals: 14 send-backs, 57 repair turns in five runs; the runs were made on the kit before the fix".

## Five-task totals

Original agents (all sessions of a task added) against the new runs (one session each). Models: macdsp Opus both, the rest Sonnet both; the sums mix them and are for scale only.

| measure | original agents | new runs | new over original |
| --- | --- | --- | --- |
| tasks with the same gates passing (brief gates the original passed) | a measured pass in 4 of the 5 tasks | macdsp 7 of 7, presets 2 of 2 runnable, developer 4 of 4 (2 as renamed parts), looks 2 of 5, settings none to compare | looks is worse |
| turns | 987 | 860 | 0.87 |
| tokens in | 2,039 | 1,777 | 0.87 |
| tokens out | 691,571 | 691,478 | 1.00 |
| tokens cached read | 121,193,982 | 228,842,040 | 1.89 |
| tokens cached write | 4,045,010 | 2,452,585 | 0.61 |
| wall (s) | 10,043 | 10,296 | 1.03 |
| hook waiting (s, the transcript's measure) | 98 | 19 | 0.19 |
| refusals (transcript reader) | 53 | 57 | 1.08 |
| retries | 50 | 57 | 1.14 |

The new runs' own kit logs add: 88 refusals in the kit's refusal log, 14 end-of-turn send-backs, 49 hooks not judged over time, 265 s inside hooks by the event log, and about 52 dollars by the CLI's own cost estimate (macdsp 25.3, looks 4.5, settings 9.6, presets 6.5, developer 6.4). The original agents' dollar cost is not on this machine.

Reading it plainly:
- Gates: 4 of the 5 tasks show no gate lost against the original. Looks lost three (the dark-theme look gates, with their twins), so the order's "0 tasks where 2.0 failed a gate the original passed" is not met: looks needs the second run, and none is made in this step. No kit fault is shown to be its cause.
- Diff: equal or better in macdsp, presets and developer (with developer's one worse point, the unconditional compile of the sample code); mixed in settings (measured gates, narrower scope); worse in looks.
- Cost: fewer turns (13 percent) and fewer tokens in, the same output, a little more wall time (3 percent), nearly twice the cached reads (the macdsp run alone is 94 of the 229 million and the long contexts of settings 55 million). Hook waiting is a fifth of the original's by the same measure.
- The 2.0 kit lost 57 repair turns to KWB-215 in these runs and left 49 events unjudged to KWB-216; both are fixed on this branch's base and were not in the tarball these runs used.

## Second runs

- looks: required (worse on gates and diff). Run it on the kit as it now stands (215 and 216 fixed), and state in its brief that the original had a resume brief pointing at the measured WARM gate; compare the dark-theme gates first.
- settings: advisable (mixed). The original is an unmeasured pause, so a second run is more use for a view of the spread than for a verdict.
- macdsp, presets, developer: not required by the rule.

One run per task is a sample, not a proof. Five tasks, one run each, on a kit that has since been fixed in two places, from original runs that were resumed and run beside other agents, cannot show that 2.0 is better or worse than 1.9; they show the new kit did the same work in the same size of effort on four of five tasks, and that on the fifth the result differed and has to be run again.

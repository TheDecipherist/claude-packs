# fx-3 (W9): audio-core, sound-design, instrument-shell findings

| # | result |
|---|---|
| 1 | fixed. `reset-before-apply` now matches only `apply/load/recall` + `Patch/Program/Preset` exactly, and `setPatch/setProgram/setPreset`; the body is read through one level of nested braces, and a reset inside a nested block counts. `bad` has a nested block and no reset; `good` has the nested block with a reset plus `setCurrentProgram`, `setPresetName`, `loadPresetList`. Run over `~/projects/solera/Source` (read-only): one hit, `units/reverb4000/PluginProcessor.cpp` `R4kProcessor::loadProgram`, which sets host parameters with no reset. It is a reverb program load; a reset would cut the tail, so it is arguably a false hit, left as the check's reach (the rule is about voice state). No other hit. |
| 2 | fixed: "plain key" is "note key"; every other non-browsing key returns false. |
| 3 | fixed: the level-fall delay/reverb line and the first table line are gone; one table line, one measured line. |
| 4 | fixed: the Never is limited to our own design; a rebuild keeps the machine's edit-page matrix. |
| 5 | fixed: the Never keeps only "no fourth surface level". |
| 6 | fixed: a rebuild's extra controls on our edit layer take the second form. |
| 7 | fixed: the fit pass moves spacing only; sizes stay at tokens; the container scrolls; the type contradiction is out. |
| 8 | fixed: new concept `engine-source` (the nine original raw globs, `.cc` included) defined in the `sound-design` and `instrument-shell` `pack.json`; the nine rules use it (meter-before-engine and test-off-the-easy-point keep `tests`). An install's generated `paths:` shows the full original list. `seeds-are-hashed` (not in the finding) had the same concepts and now also uses it. FOR THE USER: record this in decisions.md like d-7 (not edited here). |
| 9 | fixed: free or swap after an epoch counter the audio thread advances; never wait unbounded or with the device stopped. |
| 10 | fixed: step 3 only where no open reference was divided out; step 11 says the noise reference replaces step 1's. |
| 11 | fixed: other controls set where the choice is audible, named in the report. |
| 12 | fixed in the rule: a rename is refused too (the hook is unchanged). |
| 13 | fixed: tagged `[PUB]`, never `[EAR]`. |
| 14 | fixed: a layout group added, and a closing walk of every audio-core rule with `panel-spec`. |
| 15 | fixed: banks of 12 and 22 shared eleven recipes. |
| 16 | fixed: "before concluding on the editor branch of step 3". |
| 17 | fixed: six faults. |
| 18 | fixed: 3, 27 and 70 of 100, tagged `[EAR]`, no measured source stated. |
| 19 | fixed: one machine's example with its clock and divisors; 0.23 cent at C4. |
| 20 | fixed. |
| 21 | fixed: swing applies to steps only; the Never moved into the Never list. The RHYTHM line is left (it adds the TIMBRE exception). |
| 22 | fixed: one set, generated in code. |
| 23 | fixed for `panel-colour-safe`, `signal-reads-left-to-right`, `compare-to-the-machine` (separate bullets or one case). Left for `patch-inspector`: the hardware-number line is what the inspector shows, one display fact, not a second job. |
| 24 | fixed in both skills: "never noise that differs per channel". |
| 25 | left: a note for decisions.md d-5 (not edited here). FOR THE USER. |
| 26 | FOR THE USER: rename `instrument-shell` and list the old name as an alias; changes an installed name. |

Tests: `pack-content`, `repo-lint`, `counts` green; doctor on a scratch install shows no check failure. `counts.mts` output not committed.

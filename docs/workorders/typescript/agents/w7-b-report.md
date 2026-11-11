# W7 (b): the manifests

Branch work/2.0.0-ts-w7-b, from work/2.0.0-typescript.

## What was done

1. **Every pack.json (39 files)** now has `fits`, `requires`, `tests`, `concepts`, `folders`, `hooks` and `skillsIn`. `tests` is a map from each
   code file of the pack (its path inside the pack: `hooks/x.mts`, `hooks/lib/y.mts`, `tools/z.mts`, plus the `.sh`, `.h` and `.cpp` of
   sound-design's vst3host) to its test files under test/hooks/PACK, test/tools/PACK or test/unit/hooks-lib. Files with no test named by
   path are mapped to the tests that name them by stem, or to the tests of the file that imports them (a selftest lib maps to its hook's test).
   Every named test exists (a test checks it). `requires` is `[]` except sound-design, which already needed audio-core. `fits` is the old
   `choose` lists turned around (123 mentions, now one list in each pack).
2. **Per-hook `order`** on every hook row (46 rows). The numbers reproduce synth-creator's old effective order exactly (its `hookOrder` plus the
   14 hooks it had lost, which now sit where the pack manifest put them in that order). `orderHooks` sorts by `order`; a row without one
   (a custom pack's) goes after the numbered ones in pack order. The events are written in `EVENT_ORDER` (lib/settings.mts), the order synth-creator's
   `hookOrder` keys had. `syncSettings` lost its `hookOrder` argument.
3. **Configurations**: `configurations/shared.json` (the three always packs, the docs/src/tests/tools folders and kinds, the 8 preamble lines)
   plus 8 deltas. Line counts of the delta files: base 4, cpp 5, go 5, python 5, synth-creator 10, rust 17, node 19, full-stack 37 (the limit is
   60; a test counts them). `lib/config-merge.mts` merges (`own` names the sections a configuration holds wholly itself, `null` takes an entry out,
   `replace` and `insert` by index for the house-rule lines); `lib/configs.mts` `readConfig` and the new `configsAt(kitFolder)` return the merged
   `Configuration` with `packs.choose` made from the packs' `fits`. Checked: for all 8 the merged result equals the old config.json (folders,
   kinds, concepts, preamble, always, default, sourceFiles, and the order of the folders and kinds), and the `choose` sets are equal.
4. **`{{kit}}`**: the 3 templates and PROMPT.md use it; planner/start-a-build/handover.md uses it and the claude.ai bundle fills it
   (`kitCommandAnywhere()` in lib/kit-command.mts, `npx KIT`); lib/planner.mts text uses it; planner/README.md names no npx. A grep test
   (test/unit/lib/config-merge.test.mts) covers prompts/workorder, planner/ and lib/planner.mts.
5. **`claude-ai-skill` retired**: command, `NO_CUSTOM_PACKS` entry and help line removed (`planner-skills --zip` writes the same zips).
6. The picker (scripts/test-changed-paths.mts) reads `tests` as the map (a change to a file reaches that file's tests; a change to pack.json reaches
   all of the pack's); scripts/test-changed-table.mts reads configurations through `configsAt`.

## Install output: what changed and what did not

`node scripts/counts.mts --check` exits 0 and test/integration/noop.test.mts is green (stellix, sub37, full-stack): the manifest
packs/manifest-2.0.0.json needed no rewrite. Settings for the two pinned synth-creator projects are byte for byte the same.
Not pinned by any test, so reported here: for the other 6 configurations the order of hooks inside a settings entry now follows the numbers
(synth-creator's order) instead of pack order. It differs where a base hook that synth-creator's list had lost sat in the middle of base's
manifest: `brief-guard-count` now comes after `untrusted-boundary`, `making-check-count` after `git-guard` in Stop, and `brief-guard-count` after
`agents-held` in Agent|Task. Only the order of recorders and judges inside an entry changed; no hook was added or dropped.
A single order cannot give both orders at once, and the old one in synth-creator was the one a project had pinned.

## Tests

New: test/unit/lib/pack-manifest-keys.test.mts (4 tests, the planted pack file with no `tests` key is named, the keys, every named test exists),
test/unit/lib/config-merge.test.mts (5: 8 files under 60 lines, preamble once, applyLines, mergeConfig, no literal npx).
Changed, name or content: test/unit/lib/settings.test.mts "orderHooks ..." (renamed: now sorts by row `order`; old name kept in the new one in
brackets); test/repo-lint.test.mts "only the synth-creator configuration installs..." (the plant now writes a shared.json and a delta);
test/integration/configs.test.mts (regex: the packs to choose are in name order); configurations-rig.mts, writing-configurations.test.mts
(the configurations folder holds shared.json now: directories only), planner.test.mts (fills `{{kit}}` before reading the hand-over's commands),
test/fixtures/installs.mts and test/repo-readers.mts (read configurations through readConfig/configsAt).
Run: build, `npm run check` (exit 0), counts --check (0), unit lib (settings, sync, planner, workorder, layout, scan-detect, suggest, packs,
config-cli, claude-md, doctor, custom-packs, new, install-block, manifest, configs, pack-manifest*), integration (noop, configs*, configurations*,
planner, test-changed*, install, install-update, custom-packs*), repo-lint, writing-configurations, base-install, folder-law: all pass.
Not run: the rest of the suite that installs (installs.mts is a changed helper, so test:changed picks the whole integration tier).

## For the lead

- types.d.mts: `PackManifest` needs `fits?: readonly string[]` (read through `fitsOf` in lib/pack-manifest.mts today, from the index signature);
  `tests` is already `Record<string, readonly string[]>`. `Configuration` should lose `hookOrder` (nothing reads it); the config.json delta types
  (`ConfigDelta`, `SharedConfig`, `LineDelta`) live in lib/config-merge.mts.
- README.md still has a `claude-ai-skill` row in its commands table (and CHANGELOG/build.md mention it); the README test that checks help
  commands is satisfied, but the row should go with W7 (c)'s README generation.
- The `counts` generator (c) should list the packs to choose from `configsAt`, never from the raw config.json.
- One refusal met: my own `git add -N .` was refused by git-guard (right: a sweeping add). `logs refusals --open` showed 0 in this worktree, so there was nothing to mark.
- Pack content agents (a): pack.json keys are in place; a new code file in a pack needs a `tests` key (the unit test fails otherwise).

DONE

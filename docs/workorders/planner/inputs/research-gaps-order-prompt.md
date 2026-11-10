Write and then run a kit work order named `research-gaps`. Start with `npx --no-install @thedecipherist/claude-packs workorder research-gaps`, write the steps below into its `workorder.md` the way the `write-a-workorder` skill says (sources by path, every step with a measured **Done when**, a planted fault per new test), then `Run docs/workorders/research-gaps/PROMPT.md`. Everything the order needs is in this prompt or at a path it names.

Kit laws hold throughout: the kit lock; a `work/<version>-research-gaps` branch from fetched `origin/main`, pushed from the first commit; `npm run test:changed` while working and `-- --base origin/main` to land; every file under 300 lines; no file names a person; `test/readme.test.mjs` and `test/noop.test.mjs` updated for every new or changed installed file; a worktree `CASES` entry for every new hook; a `CHANGELOG.md` entry and a version bump at the end. This order is the yes for the release at the end.

**What this is.** A review of the kit against outside sources on how plugin builds go wrong (the JUCE forum and docs, the KVR DSP forum, published plugin-development guidelines, and other Claude Code plugin workflows) found the kit already holds nearly all of it: ids and version hints, smoothing and snapping, realtime safety, host sample rates and block sizes, state versioning, the patch's excluded controls, UI drawn in code with no images. Five things are missing, and two house laws live only as claude.ai skills no run can see. This order adds them. Finished looks like: each new law is a rule with a check or a hook, its test seen red; `ui-drawn-in-code` is on by default for a fresh `synth-creator` install; the two design laws are kit content; and a release ships it.

**Sources.**
- In the repo: `packs/instrument-shell/skills/gates-from-commit-one/SKILL.md`; `packs/audio-core/rules/host-parameters-at-scale.md` (pluginval at strictness 10 and `auval -v` under 30 s are already demanded there); `packs/synth-creator/pack.json` (`optIn`); `packs/synth-creator/checks/ui-drawn-in-code.json`; `packs/base/hooks/no-shipped-images.mjs`; `packs/base/hooks/making-check.mjs` (the shape of a gate); `packs/base/hooks/lesson-checks.mjs`; `packs/base/hooks/lib/content.mjs` (`isContent`); `packs/base/skills/analyse-reference-look/SKILL.md` and `packs/audio-core/rules/ui-matches-reference-look.md` (the depth rows the look gate already holds).
- The two claude.ai skills, synced to this machine by Claude Code: find them with `ls ~/.claude/skills/synced/*/synth-design-law/SKILL.md` and `ls ~/.claude/skills/synced/*/preset-design-law/SKILL.md`. If a path is not there, stop W4 at that item and list it open with the exact `ls` that found nothing; never write the law from memory.
- Appendix A below: the reason behind the no-HTML check, to be its `why`.

**Foundation.** A law is a rule plus a check or a hook with a selftest; nothing new is designed. `no-shipped-images` is the model for a guard on a kind of file; `ui-drawn-in-code` is the model for a check on code.

**Not in this order.** Anything about how work orders are written or run (templates, the install block, a pre-flight, the `write-a-workorder` skill): that is still being decided and comes as its own order.

---

## W0. Set up

Branch, lock, `npm install`, `doctor --strict` green, `decisions.md` opened, the two synced skill paths found and written in `docs/workorders/research-gaps/sources.md`.

**Done when:** `doctor --strict` OK on the branch; `sources.md` lists both paths, or the `ls` that found nothing.

## W1. pluginval is a gate from the first commit

1. `gates-from-commit-one` adds pluginval at strictness 10, wired as a ctest from the skeleton, and `auval -v` on macOS, so what `host-parameters-at-scale` demands at release is a gate from commit one. The skill stays under 8,000 characters and its description starts "Use when".
2. Where the kit ships the gate skeleton the skill points at, add the ctest entry there; if it only describes it, the skill says exactly what the entry is.

**Done when:** `doctor` accepts the skill; the readme counts hold; a scratch `synth-creator` install's skill text names pluginval and the ctest line.

## W2. The editor's destruction order

1. `audio-core/rules/editor-destruction-order.md`: attachments are reset before `stopTimer()` and `setLookAndFeel (nullptr)` in an editor's destructor; the processor never holds a raw pointer to its editor; the editor can be deleted while the processor runs.
2. `audio-core/checks/editor-teardown-order.json` (globs `**/*Editor.cpp`, `**/*Editor.h`, `code: true`): its `bad` is a destructor that calls `setLookAndFeel (nullptr)` or `stopTimer()` with an attachment `reset()` after it; its `good` resets attachments first. Measure it on a house editor before it ships and read every hit; the hit count and what they were go in the commit message.

**Done when:** the check's `bad` is caught and its `good` passes under `doctor`; `check-speed` within budget; the measured hits are in the commit message.

## W3. Chart first, and no HTML prototype

1. `synth-creator/rules/chart-first.md`: the Mermaid chart of every module and route is committed before any UI or engine code; a change that touches a route changes the chart first, and the chart's commit precedes the code's.
2. `synth-creator/hooks/chart-first.mjs` (PreToolUse on writes, by every route through `writesOf`; on by default for `synth-creator`, so it is not in `optIn`): a write under a source folder of the layout is refused while the project has no committed chart. The chart is `layout.json` `chart` (default glob `docs/**/*.mmd`), non-empty, present in `git ls-files`. The refusal says "chart first" and names the glob. Selftest plants both cases (no chart: refused; chart committed: passes); `insideProject` and `checkoutRoot` respected; a worktree `CASES` entry; the hook's median under 500 ms.
3. `synth-creator/checks/no-html-prototype.json`: `mode: forbid`; globs `**/*.html` under the layout's source and design folders; content folders excluded (`isContent`); pattern an HTML document start; `why` from Appendix A. The rule that states it is one line beside `ui-drawn-in-code`'s, in the same rule file.
4. `ui-drawn-in-code` leaves `optIn` in `synth-creator/pack.json`, so a fresh `synth-creator` install has it on. Existing projects take it through `enable`, as the switches law says, and the CHANGELOG says so.

**Done when:** the hook's selftest red without the fix and green with it; the check's `bad` caught and `good` passing; `test/worktrees.test.mjs` and `test/other-projects.test.mjs` green; a scratch `synth-creator` install lists `ui-drawn-in-code` among its active checks.

## W4. The house design laws, ported from the claude.ai skills

1. The synced `synth-design-law/SKILL.md` becomes path-scoped rules in `audio-core/rules/` (`# concepts: ui, painter, panel-spec`), one law per file in `<constraints>`, no person named, the reference plugin called "the house reference plugin". A line that is a measurement also becomes a row the look gate can hold (depth, alignment, size by kind), next to the depth rows `ui-matches-reference-look` already has.
2. The synced `preset-design-law/SKILL.md` becomes `sound-design/skills/design-a-preset/SKILL.md` (description "Use when designing, tuning, naming or reviewing a preset, a bank or an INIT, or asking how to make a kind of sound") plus `sound-design/rules/presets-are-named-and-neutral.md` (the author's own names; INIT neutral through every stage; a bank shows the engine, not the effects; `spread-probe` before a bank is called done). Under 8,000 characters each; a long law is split between the rule and the skill.
3. `test/base-neutral.test.mjs` still passes: nothing of this touches `base`.

**Done when:** `doctor` accepts every new rule and skill; the readme counts hold; `base-neutral` green.

## W5. Land and release

`npm run test:changed -- --base origin/main` on committed work; `land-branch`; version bump; CHANGELOG entry listing every new rule, check, hook and skill and the `ui-drawn-in-code` default change; publish.

**Done when:** the published version installs into a clean scratch folder with `new scratch --config synth-creator` and `doctor --strict` is green there; `report.md` has counts from `logs`.

---

## Appendix A. Why the UI is never prototyped in HTML (the `why` of `no-html-prototype`)

Tried on three house projects and dropped each time. An HTML page compiles in a second, which is the whole appeal, but it is a second design: the page and the C++ panel each become a source of truth, nothing holds one to the other, and they drift; every change is made twice or in the wrong place, and the build matches whichever design it read last. The reference picture is the design. It is measured into numbers once (`analyse-reference-look`), the panel is one table drawn in code from those numbers (`ui-drawn-in-code`, `no-shipped-images`), and the look gate compares the rendered panel to the picture element by element, depth rows included. One picture, one table, one gate. A page in the middle is a copy the shape law would refuse anywhere else, and it is the one copy of the design no hook reaches: not an image, not C++.

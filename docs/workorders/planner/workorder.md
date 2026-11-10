# Work order: planner

Written 2026-11-09, against `main` at a14831c (1.4.0 plus the unreleased entries). The `write-a-workorder` skill says how to read it. The order `research-gaps` (`inputs/research-gaps-order-prompt.md`) runs before this one; where a step here depends on it, the step says so.

**What this is.** The kit gains its claude.ai side: a `planner/` folder holding the skills a person uses in claude.ai to get from "I want to build a synth" to a finished work order (`workorder-writer`, `start-a-build`, `ui-mockup`), two pack skills the planner and the build share (`design-a-preset` in `sound-design`, `synth-cost` in `audio-core`), the kit commands that make the planner's hand-over true (`workorder --template`, `workorder check`, `init --from`), and `planner-skills --zip` to bundle the set for upload. `planner/README.md` on this branch describes the finished state; it is the spec. Finished looks like: `planner-skills --zip dist/` writes one zip per skill from a fresh install; every `SKILL.md` passes `doctor`'s skill rules; every command the hand-over prints exists; a scratch project made with `new --config synth-creator --template plugin` then `init --from` its own template's install block is green under `doctor --strict`; the intent test routes each sentence to exactly one skill; and a release ships it.

**The position.** Known: the planner's reference files are written and on this branch (`planner/workorder-writer/questions.md`, `planner/start-a-build/handover.md`, `planner/ui-mockup/analyse-a-mockup.md`, `planner/README.md`); the inputs under `inputs/` carry the research, the patch document and the drafts. Not known yet: the exact text of the three planner `SKILL.md` files, which this order writes from the existing claude.ai `workorder-writer` skill (synced on this machine) and the files here; the cost ledger's unit values are planning estimates until W0 of a real build measures one. Cannot be proved here: that a person who knows nothing finishes the interview in one sitting; the first real run of the planner against a new synth is the test, and `report.md` says so.

**The sources.**
- `planner/README.md`: the spec of the finished state, every section.
- `planner/workorder-writer/questions.md`: the two pillars, every question with its default and what it makes done; the stated laws (every oscillator its own path; effects global by default).
- `planner/start-a-build/handover.md`: the nine-stage list, the install block, Stage 9 step by step, the GitHub set-up path.
- `planner/ui-mockup/analyse-a-mockup.md`: the five approval checks and the prompt bands.
- `inputs/cost-ledger.md`: the `synth-cost` skill's body.
- `inputs/how-to-create-a-patch.md` (edition 2026-11-09-a, the author's name scrubbed) and `inputs/review-how-to-create-a-patch.md`: the `design-a-preset` skill's body and how to split it (its Appendix A is `what-a-synth-needs.md`).
- `inputs/research-pitfalls-and-prior-art.md`: section 3 (what changes in the skill), "Why we do not prototype the UI in HTML".
- `inputs/kit-index-synth-creator.md`: the step library the plugin template's steps are named from.
- `inputs/write-a-workorder-merged-draft.md`: a draft of the kit skill's text; take its Never list and its example step, not its interview part (that is the planner's).
- The existing claude.ai skill, synced: `ls ~/.claude/skills/synced/*/workorder-writer/{SKILL.md,templates/}` and `ls ~/.claude/skills/synced/*/ui-mockup/SKILL.md`. If a path is not there, stop that item and list it open with the exact `ls`; never write the skill from memory.
- In the repo: `lib/workorder.mjs`, `prompts/workorder/`, `test/workorder.test.mjs`, `lib/layout.mjs` (`OWNED`), `lib/sync.mjs`, `lib/new.mjs`, `lib/planner.mjs` and `lib/config-cli.mjs` (`planner-skills`), `lib/doctor.mjs` (the skill rules), `packs/base/skills/write-a-workorder/SKILL.md`, `packs/audio-core/rules/cpu-worst-case-per-block.md`, `packs/sound-design/skills/spread-probe/SKILL.md`, `package.json` `files`, `.claude/layout.json`, `test/readme.test.mjs`, `test/noop.test.mjs`, `test/no-personal-name.test.mjs`.

**The foundation.** Everything is data the kit already reads: a template is a file under `prompts/workorder/`, the install block uses `layout.json`'s own keys, a planner skill is a folder with a `SKILL.md` and references, `planner-skills` already prints skills, `doctor` already judges skills. Nothing new is designed; the planner is composed from parts the kit has.

**Models.** `docs/workorders/admiral-fleet/` is the shape of a finished order and its report. `packs/base/skills/analyse-reference-look/` is the model for a skill with measurements. `lib/planner.mjs` is the model for printing a skill from data. Do not take the admiral-fleet order's step contents; take its form.

**Decisions already taken** (write them in `decisions.md` as d-1 to d-5): templates are chosen by `--template`, never by configuration, because a rebuild and a new synth share `synth-creator`; there is no `start-from-a-workorder` skill, the start is `Run docs/workorders/<name>/PROMPT.md`; there is no generated index of what every skill proves, `workorder check` is the structural check instead; the UI is never prototyped in HTML, and both templates say so in their Never list with the reason from the research; `planner/` lives in this repo, not its own, so nothing is copied or pinned.

<constraints>
Always do:
- Work the steps in order. `research-gaps` lands first; W5 and W6 here say what they take from it.
- Prove each step's "done when" by running it, and keep the evidence in `build/evidence/W<n>/`.
- Give every new test a planted fault that turns it red, and show it red.
- Keep every `SKILL.md` under 8,000 characters with a description that starts "Use when"; everything else is a reference file beside it.
- Name no person anywhere (`test/no-personal-name.test.mjs` is repo-wide): "the author", "the owner", "the user".
- Keep `base` free of synth words; keep every file under 300 lines; update `test/readme.test.mjs` and `test/noop.test.mjs` for every new or changed installed file; a worktree `CASES` entry for every new hook.
- Hold the kit lock from the first write to the landing; take it with `lock take` if another session's lease is stale.
- Before the first write under `planner/`, add it to `.claude/layout.json` as a folder (W0), so `folder-law` and `placement-law` hold it.

Never do:
- Edit anything under `inputs/` except to delete it in W8; it is read, not maintained.
- Copy a pack skill's text into `planner/`, or a planner file into a pack: `planner-skills --zip` bundles pack skills as they are.
- Name a command, flag or skill in a planner file that this kit does not have at this version; `test/planner.test.mjs` refuses it.
- Mark a step done when it was not measured, or weaken a test to pass it.
- Run the whole suite to land or release; the gate is `npm run test:changed -- --base origin/main` on committed work.
</constraints>

---

## W0. Set up

1. Branch, lock, `npm install`, `doctor --strict` green on the branch.
2. `.claude/layout.json`: a `planner` folder (`"path": "planner", "purpose": "the claude.ai side: the skills a person plans a build with; planner-skills bundles them"`), and a `kinds` row so a `SKILL.md` under `planner/` is a planner skill. `package.json` `files` gains `planner`.
3. `decisions.md` with d-1 to d-5. `sources.md` with the synced skill paths found, or the `ls` that found nothing.
4. Read `planner/README.md` end to end; it is the spec every later step is measured against.

**Done when:** `doctor --strict` OK; `layout.json` names `planner`; `npm pack --dry-run` lists `planner/README.md`; `decisions.md` has d-1 to d-5; `sources.md` lists the synced paths.

## W1. `workorder <name> --template <generic|plugin|rebuild>`

1. `lib/workorder.mjs` takes `--template <name>`; `workorder.md` is written from `prompts/workorder/templates/<name>.md`; no flag means `generic` (today's `prompts/workorder/workorder.md`, moved). An unknown name is refused with the list.
2. `templates/rebuild.md` is the synced `workorder-writer/templates/workorder-rebuild.md` with the kit's `{{name}}`/`{{date}}` placeholders and two changes only: its W0 installs from the install block (W3), and its Never list gains the HTML line (`inputs/research-pitfalls-and-prior-art.md`, "Why we do not prototype the UI in HTML", the one-sentence Never form).
3. `templates/plugin.md`, written new for a new synth or effect, in the rebuild template's shape (`**[if ...]**` steps kept or deleted before the run, with the reason in `decisions.md`). Fixed text, no angle brackets, for everything the house has decided, from `planner/workorder-writer/questions.md` and `inputs/kit-index-synth-creator.md`:
   - The stack: C++ with JUCE through CMake at a version looked up at build time; presets `dev`, `asan-ubsan`, `tsan`, `rtsan`, each with `CMAKE_EXPORT_COMPILE_COMMANDS=ON`; the `synth-creator` configuration; `synthcore` for tempo, MIDI clock, transport, sync modes, QWERTY and the focus rule; the house skeleton tool where the project has one, else the CMake skeleton; the standalone from the rack for every test; macOS first, Windows last; VST3 and AU only when the order says so.
   - W0: install from the block, `gates-from-commit-one` (with pluginval, from `research-gaps`), `param-id-lock --init`, the Mermaid chart of every module and route committed before any UI or engine code; the cost ledger's unit measured (one INIT voice, worst block, 44.1 kHz and 128 samples, then 48 kHz) and the ledger re-scaled.
   - W1: the parameter table, before any DSP: every control with id, version hint, kind, range, default, smoothing or step, in the patch or not, host-visible or not, panel section; generated into C++; the lock started in the same step.
   - Then one step each, with the skills that prove it and the Done when lines from `questions.md`: voices and modes `[if polyphonic]`; oscillators (each its own path: filter, filter / amp / pitch envelopes, level, pan, tuning); filter; extra envelopes and LFOs; effects `[if effects]` (global with per-oscillator sends and DRY by default; a per-oscillator insert only where the order names it, with its ledger cost); clock and keys `[if tempo-synced]`; arp `[if it has one]`; the panel from the approved render (`analyse-reference-look`, `new-panel-control`, `prove-control`, `hit-the-painted-control`, the look gate with its depth rows); presets (INIT neutral, bank by category, `design-a-preset`, `spread-probe`); realtime audit and frame bench; a DAW step with a named host list ("no single host proves the rest"); before-you-call-it-finished; the report.
   - Always: the order-binding laws from `questions.md` (ids never change; nothing by position; timing from synthcore; `copy-and-prove` for any sibling part; a patch stores everything but MAIN volume, octave, mod wheel and pitch wheel; double-click default and lights; 16:9; every oscillator its own voice path; the author's own preset names; no hardware, brand or machine name ships; every Done when measured in the turn that claims it).
   - Never: the HTML line; release work (signing, notarisation, installers) unless a step names it; a golden updated without a logged reason; effects per oscillator as a blanket feature.
4. `templates/generic.md` keeps today's text.
5. `test/workorder.test.mjs`: each template writes with no `{{` left; `--template nope` is refused with the list; the plugin template has no angle bracket in its fixed sections and carries the HTML Never line and the install block; the rebuild template keeps every `**[if` marker its source has. README: the `workorder` row and "Let it build on its own" show the flag.

**Done when:** three templates write from a scratch folder; the tests above are green and each was red on its planted fault (a `{{` left, the Never line removed, an `[if` dropped).

## W2. The pre-flight: `workorder check <name>`

1. A sub-command, run at the end of `workorder <name>` and on its own, that reads `docs/workorders/<name>/workorder.md` and refuses, naming each: a placeholder left (`<...>` outside code fences); a `## W` step with no `**Done when:**` line, or one whose line holds no digit and no path to a test; a skill named in backticks (`` `[a-z0-9-]+` `` that is a folder in any pack's `skills/` or under `planner/`) not installed at `.claude/skills/<name>/SKILL.md` in the project, with the pack to `add` named; `doctor --strict` red; no install block (a warning, not a refusal).
2. `run.sh` and `PROMPT.md` call it first and stop on a refusal, so a run never starts on an order that cannot finish.
3. Tests: one planted fault per refusal, each seen red; a clean order passes.

**Done when:** four planted faults each refused with the right line; `docs/workorders/admiral-fleet/workorder.md` passes, or its refusals are recorded in `decisions.md` as findings about that order.

## W3. The install block: `init --from <workorder.md>` and `new --from`

1. An order may carry one fenced block with the info string `claude-packs` (`planner/start-a-build/handover.md`, section 2). `lib/install-block.mjs` (new) parses it (the YAML parser already in the repo, or one pinned with a fresh row in `docs/versions.md`), validates the keys against `lib/layout.mjs` `OWNED` plus `configuration` and `packs`, and refuses an unknown key by name.
2. `init --from <path>` and `new <name> --from <path>` install from the block: configuration and packs as `init --config … <packs>` does, then the owned keys written into `layout.json`, then `update`.
3. The three templates carry a filled block in their W0 (the plugin one from the handover's section 2).
4. Tests: a block installs into a scratch folder and `doctor --strict` is green there; an unknown key is refused; `noop` lists updated.

**Done when:** `new scratch --config synth-creator --from <order>` then `doctor --strict` OK; the refusal red on a planted key; README documents `--from`.

## W4. `synth-cost`, a pack skill in `audio-core`

1. `packs/audio-core/skills/synth-cost/SKILL.md` (description "Use when asking whether a synth design is too heavy, how many voices a machine can run, what an oscillator, filter, unison or effect costs, or whether effects should be per oscillator or global") with `cost-ledger.md` from `inputs/cost-ledger.md` beside it as its reference. The unit is one band-limited saw at 44.1 kHz; the budget is `cpu-worst-case-per-block`'s law in units; the thresholds, the cuts in order, and the per-oscillator-effects paragraph as written.
2. `cpu-worst-case-per-block` gains one line: the ledger's estimate in the order is replaced by the W0 measurement, and the gate holds the measured figure.
3. The `synth-creator` configuration's `default` packs include `audio-core` already; nothing to add.

**Done when:** `doctor` accepts the skill; the readme counts hold; a scratch `synth-creator` install has `.claude/skills/synth-cost/`.

## W5. `design-a-preset`, the patch document as a pack skill in `sound-design`

Depends on `research-gaps` W4.2, which makes `design-a-preset` from the claude.ai `preset-design-law`. This step replaces its body with the patch document, which supersedes that law (the document's section 6 says so).

1. `SKILL.md`: the document's sections 1 (the method) and 5 (the gate), the vocabulary of section 0 with the house engine names given once in brackets and otherwise generalised ("a seven-saw supersaw with detune, mix and drift", "a phase-locked body-and-sub bass engine", "a bit-shaped wave with motion", "a tine model with pickup position"), and how to load a category. Under 8,000 characters. Description: "Use when designing, tuning, naming, reviewing or shipping a preset, patch, program, bank or INIT, asking how to make a kind of sound, or asking what a synth needs to make one."
2. `references/building-blocks.md`: section 2 as it is. `references/tables.md`: sections 4.1 to 4.4 as they are; 4.5 replaced by the generic source-kind table from `inputs/review-how-to-create-a-patch.md`. `references/categories/<kind>.md`: one per category from section 3 (piano, keys, organ, strings, pad, lead, pluck, bass, brass, bell, arp, sequence-stab-chord, fx, drums, wind-vocal), with the "Starting recipe" blocks kept only in their generic form (the ANALOG and FM variants) and the house-engine recipes left out with one line: "this project's recipe file (`layout.json` `recipes`, default `docs/recipes/*.md`) has the machine's own".
3. `references/what-a-synth-needs.md`: Appendix A of `inputs/review-how-to-create-a-patch.md` as it is.
4. `sound-design/rules/presets-are-named-and-neutral.md` (from `research-gaps`) grows the laws that bind a bank: levels measured not typed (-6 dBFS peak on a four-note chord at v100, bank within 1 LU, mono under 120 Hz, nothing under 40 Hz, limiter off); release at least the attack on pads; velocity audible and never only volume on a pad; the wheel does something; delay off the arp's subdivision; glide off by default.
5. `sound-design/checks/preset-name-no-brand.json` (bank files: a machine or brand name in a preset name) and `preset-not-default-envelope.json` (a preset equal to the toolkit's default envelope). Measure both on a house bank before they ship.
6. `sound-design/tools/prove-a-bank.mjs` (under 300 lines, or split): the gate's measurable rules as measurements on renders from `bounce-a-plugin`: level at v100 four-note chord, LU across the bank, mono sum under 120 Hz, energy under 40 Hz, tail to -60 dB, first sound under 20 ms for pluck, bass, lead and keys, v40 against v110 in level and spectral centre, wheel 0 against wheel 127, sync at 120, 90 and 140 BPM, and from the patch file: delay subdivision against arp subdivision, pad release against attack, bell release against decay, organ velocity depth 0. A planted fault per measurement, seen red.

**Done when:** `doctor` accepts the skill and both checks; `prove-a-bank` runs on a synthetic bank and each planted fault is red; the readme counts hold; `test/base-neutral.test.mjs` green.

## W6. The planner skills

1. `planner/workorder-writer/SKILL.md`: from the synced claude.ai `workorder-writer/SKILL.md`, rewritten to: the two pillars first; the nine-stage list (`stages.md` beside it, from `planner/start-a-build/handover.md` section 1) shown at every stage opening and on "where are we"; Stage 2 reading `design-a-preset`'s `what-a-synth-needs.md`; Stage 5 stating the stack, asking from `questions.md`, running `synth-cost` after each sound answer, and writing the install block; Stage 7 calling `ui-mockup`; Stage 8 the check plus "every command the hand-over prints exists in the kit"; Stage 9 calling `start-a-build`; the laws (the planner half; the build half stays in `write-a-workorder`); no `--template rebuild` without the flag existing (it does after W1) and no `start-from-a-workorder`. Description: "Use when someone wants a synth, an effect, a plugin, an instrument or a replica of real hardware built, wants a part added to one, asks how to start or what to do first, or wants to write, plan or finish a work order, a spec or a build plan." Under 8,000 characters; `questions.md` and `stages.md` beside it.
2. `planner/start-a-build/SKILL.md`: Stage 9 from `handover.md` section 3 and the GitHub path from section 4, as a skill of its own. Description: "Use when asked how to set up a project for a work order, install or configure claude-packs, where to put the order and the design, what to do next, or how to start the build; also on Windows, WSL or LSP set-up questions for a build." `handover.md` beside it.
3. `planner/ui-mockup/SKILL.md`: the synced claude.ai `ui-mockup/SKILL.md` moved here, with the five approval checks and the prompt bands from `analyse-a-mockup.md` as its reference, and the concept-render-first path (a render before the interview is a source; the final render replaces it). Its measurements are `packs/base/skills/analyse-reference-look`'s, named, never copied.
4. `lib/planner.mjs`: `planner-skills` also prints the three `planner/` skills and the two pack skills (`design-a-preset`, `synth-cost`) as they are; `--zip <dir>` writes one zip per skill (`SKILL.md` and its reference files, nothing else). README section "Installing the skills in claude.ai" (from `planner/README.md`) describes it.
5. `test/planner.test.mjs`: every `SKILL.md` under `planner/` under 8,000 characters with a "Use when" description; no angle-bracket placeholder outside a code fence in any planner file; every command and flag `start-a-build` prints exists in `bin/claude-packs.mjs` (parse the usage text); an intent table of at least fifteen sentences, each matching exactly one skill's description by the kit's own trigger-word match; `planner-skills --zip` on a scratch folder writes exactly five zips and each unzips to `SKILL.md` plus its references. Each with a planted fault seen red.

**Done when:** `planner-skills --zip` writes five zips from a fresh `npm pack` install; `test/planner.test.mjs` green and each planted fault red; `doctor` accepts the three skills.

## W7. The kit's `write-a-workorder` skill

1. Split: `write-a-workorder` keeps points 1-10 and gains two lines ("name only skills the project has installed; `workorder check` refuses the rest" and "the order carries its install block; W0 installs from it and nothing else"). `run-a-workorder` (new, base) takes points 11-12 and the change-a-run rule; description "Use when starting a work order, leaving one running, or changing one that is running".
2. The example step becomes the filter step from `questions.md` section 2 (the filter row's Done when), since the kit's main configuration builds plugins.

**Done when:** both skills under 8,000 characters; `doctor` accepts them; the README lists both.

## W8. Before calling it finished

1. Delete `docs/workorders/planner/inputs/` in its own commit: everything it held is now in a pack, a planner file or this order's history. `planner/README.md`'s "Status" section is rewritten to what is real.
2. Read the finished work as a senior engineer would, down `planner/README.md` section by section: each claim it makes is true on this branch, or the README is corrected. List what is left, what is unproved (the first real planner run) and what a person must judge.

**Done when:** `inputs/` is gone; every README claim is checked off in `build/evidence/W8/readme-check.md`; every open item is written down, with why.

## W9. Land and release

`npm run test:changed -- --base origin/main` on committed work; `land-branch`; version bump to 1.5.0; CHANGELOG entry listing `planner/`, every new command, flag, rule, check, hook, tool and skill; publish.

**Done when:** the published version, in a clean scratch folder, runs `new scratch --config synth-creator --template plugin`, then `init --from` its own template's install block, and `doctor --strict` is green; `planner-skills --zip` writes five zips from that install; `report.md` has counts from `logs`.

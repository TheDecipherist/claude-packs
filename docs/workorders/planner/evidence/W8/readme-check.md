# planner/README.md, claim by claim, on work/1.6.0-planner (2026-11-09)

Each claim of the spec, checked on this branch: true (with what shows it), corrected (what was false and what it says now), or unproved (why, and what would prove it).

## The opening

- [corrected] "the mock-up measurements are the same files ... bundled": the measurements are `analyse-reference-look`'s, named by `ui-mockup`, not bundled. Now: "the mock-up approval names the build's own measurements".
- [corrected, unproved] "Someone who has never written a spec ... can finish in one sitting": not provable here. Now "It is written so ...; the first real planner run is the test of that (see Status)".
- [true] Two pillars: `workorder-writer/SKILL.md` "Two pillars" paragraph; `questions.md` "Pillar 1 / Pillar 2".
- [true] One source, nothing here a copy of `packs/`: `test/planner.test.mjs` "the pack skills ride as they are" (red with a copy planted, evidence/W6/planted-faults.txt).
- [true] Nothing left to guess, the order carries sources, install block, decisions, a measured Done when: the interview's Stage 8 check; `workorder check` (evidence/W2).

## The skills

- [true] The five rows, their jobs and where they live: `planner/{workorder-writer,start-a-build,ui-mockup}/`, `packs/sound-design/skills/design-a-preset/`, `packs/audio-core/skills/synth-cost/`; the "fires on" sentences route to their skill in `test/planner.test.mjs`'s intent table.
- [corrected] design-a-preset "installed in every synth project": `sound-design` is not a default pack of `synth-creator`; it comes with the plugin and rebuild templates' install blocks. synth-cost's row now says `audio-core`, a default pack.
- [true] The four call-outs (Stage 2 `what-a-synth-needs.md`, Stage 5 `synth-cost`, Stage 7 `ui-mockup`, Stage 9 `start-a-build`): `workorder-writer/SKILL.md` stages 2, 5, 7, 9.

## What you get at the end

- [corrected in the skill] `summary.md` was in the list but the interview never wrote it; Stage 8 now writes it (ten lines in plain words, the person's review).
- [true] `PROMPT.md` and `run.sh` written by `workorder`: `lib/workorder.mjs` `FILES`.
- [true] `design/reference/<screen>.png` with `<screen>.prompt.txt`: `ui-mockup/SKILL.md` item 8.
- [true] The one sentence `Run docs/workorders/<name>/PROMPT.md`: `prompts/workorder/PROMPT.md`, `handover.md` section 4.

## The process

- [true] The nine-line list is the same list in `workorder-writer/stages.md` (diffed: identical text) and shown at every stage opening (`SKILL.md`, "How to run it").
- [true] Stage 1 picks the template, never inferred: `SKILL.md` stage 1; `workorder --template` (d-1); `test/workorder.test.mjs`.
- [true] Stage 2, 5, 6, 7, 8, 9 as described: `SKILL.md` stages; Stage 5 states the stack and writes the install block; Stage 8's "every command the hand-over prints exists" line.
- [true] Stage 7 "Approved only after six checks": corrected from "five" (six were named); `analyse-a-mockup.md` says six.

## The laws a work order holds

- [true] Each law is in `workorder-writer/SKILL.md`'s constraints or stages (paragraph, position, sources by path, Done when with a number, no person mid-run, counts and no "slot 2", install block, every oscillator its own path, effects global by default, no HTML, the cost ledger replaced at W0) and the build-side half in `packs/base/skills/write-a-workorder/SKILL.md` (items 1-12).
- [true] "The cost ledger ... replaced by a measurement at 44.1 kHz (`cpu-worst-case-per-block`)": the rule's new line (W4.2); the plugin template's W0.6.

## How it fits

- [true] `prompts/workorder/templates/{generic,plugin,rebuild}.md`, written by `workorder --template`: evidence/W1/three-templates.txt.
- [true] `lib/install-block.mjs` parses the block; `init --from` and `new --from` install from it, with the keys named: evidence/W3/new-from.txt, `test/install-block.test.mjs`.
- [true] `workorder check` refuses the four named things: evidence/W2, `test/workorder-check.test.mjs`.
- [corrected] "`--zip <dir>` writes one zip per skill" with the project-layout skills in the bundle: `--zip` writes the five claude.ai skills; the project-layout bodies stay on the printed form and `--out` (d-26).

## Installing the skills in claude.ai

- [true] `npx @thedecipherist/claude-packs planner-skills --zip dist/` writes `dist/<skill>.zip`, each SKILL.md and references only: evidence/W6/zip-from-npm-pack.txt (from a fresh `npm pack` install), `test/planner.test.mjs`.
- [true] Claude Code syncs claude.ai skills to `~/.claude/skills/synced/`: the four synced files this order read (sources.md).
- [unproved] The upload place in claude.ai's settings: "varies by plan, so follow the app", as written; nothing here can open claude.ai.

## Folder layout

- [true] The tree as drawn: `ls -R planner` shows README.md and the three folders with exactly the files named.
- [true] A layout folder of this repo, shipped in the package: `.claude/layout.json` `folders.planner`, `package.json` `files`, evidence/W0/npm-pack-planner.txt.

## The tests that hold it

- [true] Each line is a test in `test/planner.test.mjs` (sizes and "Use when", no placeholder in the skill text, commands and flags, intents, zips), each seen red (evidence/W6/planted-faults.txt), and `test/no-personal-name.test.mjs`.
- [corrected] "an intent table ... with none matching two": the kit had no match; `skillFor` takes the description sharing the most words, a tie a misfire (d-24). The line says so now.
- [corrected] "the README counts (`test/readme.test.mjs`) include the planner skills": they count pack skills only; the planner test holds that the kit README names all five. The line says so now.

## Why these choices

- [true] "the kit's gate renders at 44.1, 48, 96 and 192": `packs/audio-core/rules/sample-rate-and-block-size-from-host.md` "Test at 44.1, 48, 96 and 192 kHz".
- [true] "`param-id-lock` freezes every id the moment it first appears": `packs/audio-core/hooks/param-id-lock.mjs`, and the plugin template runs `--init` in W0.
- [a person's to judge] "Tried on three house projects and dropped each time", "Every house build that compared positions and colours landed flat", "The patch research found it missing in every weak bank", "Most DAW projects run at 44.1 kHz": the author's account of earlier builds and research, kept as the reason; not re-measured here.

## Status

- [rewritten] to what is real at 1.6.0, what is not proved, and what proves it.

# What is left open, and why

- [gap] The first real planner run: a person who knows nothing, in claude.ai, from "I want to build a synth" to a green `workorder check`. Only a real run can show it.
- [gap] Whether claude.ai starts the right skill for each sentence: the intent test runs the kit's match, not claude.ai's router.
- [gap] KWB-134 (doctor green with a registered hook's file gone) and KWB-135 (an opt-in hook that imports another opt-in hook crashes alone): logged, not this order's.
- [deferred: by this run, because the order keeps the rebuild template to two changes] The rebuild template's Done whens hold counts in words ("every sheet"), so `workorder check` refuses 16 of 19 until the order is filled with numbers (d-11).
- [a person's to judge] Whether the planner's tone and pace suit a beginner; the cost ledger's units until a W0 measures one; how the presets sound (`design-a-preset` rule 12, the owner's ear).

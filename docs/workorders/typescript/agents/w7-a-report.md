# W7 (a): the content

Branch work/2.0.0-ts-w7-a (from work/2.0.0-typescript), worktree .claude/worktrees/w7-a.

## 1. The template and its commands

- `lib/pack-template.mts`: one canonical form per kind: `ruleText` (with `nameCheckInRule`), `checkObject` (field order id, why, rule, globs, exclude, code, pattern, kind, bad, good; `EXCLUDE` is the standard list the 321 checks copied), `proofOf` / `addCheck` (runs the lesson-checks `selftest` on bad and good, refuses a stub `good`, a `kind` outside the known five, a missing rule, a repeated id; writes nothing on a refusal; names the check in its rule's `## Check`), `skillText`, `hookText` (plain JavaScript on `runAsHook`, with `selftest` and an exported `worktreeCase`), `packJson` (every stock key, the concept its rule loads on, `fits`/`requires`/`tests`), `packFiles`.
- `lib/custom-packs.mts`: `newPack` scaffolds from `packFiles`; new switch `--hook` adds the example hook.
- `bin/claude-packs.mts`: new command `add-lesson-check <id> --why --rule --globs --pattern --bad --good [--kind] [--pack <name>]` (into `.claude/` of `--dir`, or `packs/<name>/` with `--pack`); `--hook` switch; value flags `--pack --rule --pattern --bad --good --globs --why --kind`. Its lines are in `prompts/help.txt`.
- Tests: `test/integration/pack-scaffold.test.mts` (5): new-pack with and without `--hook` passes the whole gate; the scaffolded hook proves itself (`--selftest` OK) in a project that enables it; add-lesson-check writes a conforming check and names it in its rule; it refuses an unproved check, a "good" that is flagged, a stub, a missing rule, a bad kind, a missing flag, a repeated id, writing nothing; it works inside a project's `.claude`.

## 2. The conformance gate

- `test/pack-content-rig.mts` (the checks R1-R7, C1-C8, S1-S8, P1-P6 as one function, `conformance(packsDir, known)`), `test/pack-content.test.mts` (14 tests), `test/fixtures/pack-content-ratchet.json`.
- Hard set (R2 R3 R4 C1 C4 S1 S2 S5 P1 P2 P5 P6): holds for every file; each is red on a plant (a scaffolded pack with one fault: a title over 110, an unclosed block, no Never heading, a dangling rule, a renamed id, "Use after", a renamed skill, a 170-line skill, a bad version, a wrong repository.directory, an undefined concept, a hook not in the pack or in base).
- A file new or changed since the base (`git merge-base HEAD origin/main`, or `PACK_CONTENT_BASE`; skipped when no base is fetched) passes the whole set. Today that is 24 files changed by this step and by W7 (b); all pass. W7 (b)'s 39 pack.json files pass P1-P4.
- Ratchet numbers (files failing; from the survey's 266 files / 175 rules, 44 checks, 47 skills): now C2 35, C5 29, C6 139, C7 3, R1 83, R6 75, R7 21, S3 15, S4 23, S7 11, S8 11. Hard rows: 0. `ratchetBreaks` refuses a rise, a missing row and a hard check stored above 0 (test with its plant). A count may fall without editing the file (loose ratchet); lower it by hand with the fix.
- Decisions: C1 and P6 accept the file in the pack or in base (base is always installed; `skill-first` is a base hook serving two packs' skills, so `circuits-through-the-skill` is not moved: the hook is not in the wrong pack). Hover-state names: ui-craft keeps `hover-state`, gpu-painter's is `painter-hover-state`. S2 also holds a skill name unique across packs.

## 3. The content fixed

- 3 unclosed `<constraints>` closed (audio-core house-control-behaviours, base references-use-anchors; the third, audio-core ui-matches-reference-look, deleted in the fold). `writing/no-cargo-cult` gained an Always list (it had only Never).
- Check with no rule: `base/no-code-after-midline-comment` now points at a new base rule `comment-goes-after-the-code` (concepts cpp, shaders, python, go, rust, js: the set of `bug-fix-starts-red`, so `doctor --strict` finds it live in a Rust crate); its `why` lost project names, `exclude: []` stated (scope unchanged), `code: false`. The 4 js-ts checks that pointed at full-stack's rule now point at a new js-ts rule `ts-source-stays-plain`; `line-under-200-chars` got a real `good`.
- 10 descriptions: nine now start "Use when" (juce-realtime-audit, prove-control, analyse-reference-look, build-preflight, gpu-golden-check, gpu-golden-update, gpu-lifecycle-stress, tripwire-the-law, preflight-build). The tenth, `base/skills/add-lesson-check`, is (c)'s file: its description still starts "Use right after". Until (c) fixes it, `the hard set holds` and `the ratchet` (S1: 1) are red, nothing else in the gate.
- The 9 skills edited were also brought to the whole set (S3 constraints, S4 "(one job: ...)" titles, S7, S8); two titles over 110 shortened (cpp cache, hover-every-pressable) plus sound-design's; sound-design's hand `paths:` became the pack concept `preset-files`; `panel-sizes-by-kind` got its `paths:` line.
- The 17 js-ts rules in the old form are in the template (concepts kept; every Always and Never line kept its meaning; the ESLint snippets are one sentence in `## Check`; code examples kept for guard-clauses and no-any).
- Five `*-repeats-become-templates` rules are one base rule, `repeats-become-templates` (the general law, then a list per language: JS and TS, Python, C++, Rust, shell, every Always and Never line kept; `rust-if-chain-is-a-match` points at it). The per-language walk-throughs stay in the four `*-extract-template` skills (named in its `## Check`).
- `ui-matches-reference-look` (audio-core) folded into `page-matches-reference-look`, which moved to base so synth projects keep every line of both; it is held with `skill-first` (`# hook:`), so it loads wherever the hook is (a rule with concepts failed install in a base-only project: none of its concepts exist there). Tests that named the old rule updated.
- Moved files and renames: `gpu-painter/skills/hover-state` -> `painter-hover-state` (and its rule's mention); `ui-craft/rules/page-matches-reference-look.md` -> `base/rules/` (merged); deleted `audio-core/rules/ui-matches-reference-look.md` and the five per-language rules; new `base/rules/repeats-become-templates.md`, `comment-goes-after-the-code.md`, `js-ts/rules/ts-source-stays-plain.md`.

## 4. Installs changed

`packs/manifest-2.0.0.json` rewritten with `node scripts/counts.mts` (new and changed base, js-ts, gpu-painter, audio-core files; the five per-language rules gone, `hover-state` renamed in a synth install). `counts --check` exits 0; `test/integration/noop.test.mts` green (4 tests + plant).

## 5. Proofs

`npm run build`, `npm run check` exit 0. Own tests green: pack-scaffold (5), pack-content except S1 as above, noop, custom-packs, base-pack, cpp-pack, gpu-painter-pack(s), ui-craft-pack, audio-core-pack, rust-pack (after the concept fix). `doctor --strict` OK on a scratch `init --config synth-creator` and `init --config full-stack`. `npm run test:changed -- --base work/2.0.0-typescript` (520 of 526 passed, output /tmp/w7a-tc.txt): reds were the Rust crate doctor (fixed since, see above), the two gate tests (S1, (c)'s file) and three README tests, which are for (c) and the lead since the README is not mine: `every pack has its row, with its true counts` (audio-core 52, base 28, cpp 10, python 1, rust 5, shell 1, ui-craft 16 rules), `every command in the help is on the page` (add-lesson-check, and the new `--hook` of new-pack), `the numbers on the page are the kit's true counts` (rules 280, not 283).

## 6. For the lead and (c)

- `planner/ui-mockup/analyse-a-mockup.md` still names `ui-matches-reference-look`; docs/rules-without-checks.md (generated) will pick up the new rules.
- types.d.mts: nothing needed.
- One refusal met: code-shape on a 261-column line in my own edit (marked right, d455c35e).
- The ratchet's soft counts remain the work for later steps (R1 83 hand-written or missing frontmatter, R6 75, C6 139, S3 15, S4 23).

Status: DONE_WITH_CONCERNS (the gate's hard test is red on `add-lesson-check`'s description until (c) merges; three README tests wait for the README generation).

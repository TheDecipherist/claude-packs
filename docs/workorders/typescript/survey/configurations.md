# Survey: configurations, profiles, prompts, planner, site, README, docs (read-only, branch work/2.0.0-typescript, 2026-11-11)

Read in full: the 8 `configurations/*/config.json`, `lib/configs.mjs`, `lib/config-cli.mjs`, `lib/settings.mjs`, `lib/claude-md.mjs`, `lib/workorder.mjs`, `lib/planner.mjs`, part of `lib/layout.mjs`, `lib/kit-command.mjs`, the head of `lib/workorder-check.mjs`, `prompts/workorder/*`, `planner/README.md`, `site/index.html`, `test/site.test.mjs`, `test/readme.test.mjs`, `docs/*.md`, README tables. Counted by script: 39 packs, 283 rules, 357 checks, 46 hook files (45 hook registrations), 94 skills, 8 configurations. No `scripts/counts.mts` or "counts" module exists in `lib/`.

## 1. The configurations

| config | always | default | choose (n) | sourceFiles | hookOrder | preamble lines | json lines |
|---|---|---|---|---|---|---|---|
| base | base, writing, hook-proof | none | 7 | none (coverage default) | none | 8 | 85 |
| cpp | same 3 | cpp | 11 | C/C++ extensions | none | 8 | 93 |
| go | same 3 | go | 16 | `\.go$` | none | 8 | 98 |
| python | same 3 | python | 17 | `\.(py\|pyi)$` | none | 8 | 99 |
| rust | same 3 | rust | 16 | `(?<!/build)\.rs$` | none | 8 | 106 |
| node | same 3 | js-ts | 27 | JS/TS extensions | none | 8 | 102 |
| full-stack | base, full-stack, http-api, fastify, zod, docker, writing, hook-proof | js-ts, stored-text, ui-craft | 18 | JS/TS extensions | none | 9 | 174 |
| synth-creator | base, synth-creator, writing, hook-proof | cpp, audio-core | 11 | none | 11 entries, 35 script names | 9 | 154 |

Keys seen: `name, description, packs, layout, preamble`, plus `sourceFiles` (7 of 8), `hookOrder` (1 of 8). `leaveOut` is documented in `lib/configs.mjs` but no config uses it.

Duplication:
- **hookOrder.** Not repeated: only synth-creator has one (35 names). The problem is the opposite: it is a hand copy of order that already lives in the packs' `pack.json`. 14 hook registrations of synth-creator's packs are not in it and fall to pack order (base: heartbeat, dispatch-once, template-law, code-shape, suite-once, no-find, repo-litter, look-gate, skill-first, reuse-hint; cpp: compile-cache; reverse-engineering: firmware-out-of-git). So it has already drifted. The other 7 configs get pack order.
- **Preamble.** 8 of the 9 lines are word-identical in all 8 configs (64 lines: new-folder, hook-blocks, refusal-loud, create-outside, edit-rules, route-around, line-number, plus the claude-packs source-of-truth line in 7 of 8). Only 3 lines differ: full-stack's database/Zod line, synth-creator's painter line, and a longer claude-packs line in one config. Bytes: 1,340 per config for 6 configs, 1,455 and 1,494 for the two others.
- **Layout.** Every config repeats `docs` (6 of 8, 5 distinct purpose strings), `tools` (6, 3 strings), `tests` (5), `src` (5) and the `kinds` entries for tests, docs, tools. Only full-stack (14 folders) and rust (crates, benches, examples) have folders of their own. Unique content is about a third of the layout JSON.
- **choose lists.** 123 pack-name mentions across the 8 configs, each a restatement that "this pack may be used with this configuration". `allowedPacks` = `always + choose + customPacks()`, so `choose` is the only gate; no pack says which configurations it fits.
- **Descriptions.** One sentence each, copied (shortened) into the README configurations table.

One base config with deltas would remove: the 64 preamble lines to 8 plus 3 deltas, the shared `docs/tools/tests/src` folders and kinds (about 25 lines per config, roughly 150 lines in all), and the identical `always` list of 3 in 6 configs. Estimated 8 files of 85 to 174 lines to one base of about 90 lines plus deltas of 15 to 60 lines. `choose` could become a per-pack `fits: [...]` and shrink to nothing in the configs.

## 2. How hook order and settings.json are decided

Trace: `sync` (`lib/sync.mjs:118`) calls `syncSettings(claudeDir, packNames, layout, previousLock, config.hookOrder)` in `lib/settings.mjs`.
1. Kit-owned entries (every script a pack ships, plus the RETIRED list) are stripped from `settings.json`; the project's own hooks stay.
2. For each installed pack in order (always list first, then chosen), each `pack.json` `hooks` entry is appended to the matching event and matcher group, skipping any hook `layout.disable` names.
3. `orderHooks` sorts the kit hooks inside a group by the position in `hookOrder["<event> <matcher>"]`; a script not listed goes after the listed ones, in pack order. The project's own hooks keep their slots.
4. `throughRunner` folds all kit node hooks of one group into one `run-hooks.mjs` command (timeout is the sum, 60 s at most), unless `hooks/run-hooks.mjs` is disabled.
5. Events are then sorted by the order of event names in `hookOrder` keys (so for 7 configs, events come in pack order).

So today the order is: pack order (which is `packs` order then manifest order), overridden only by a config's list. A new hook needs one edit in its pack's `pack.json` to be installed; it needs a second edit in synth-creator's `hookOrder` only if its position matters. Can a pack declare its own order? Yes, and it would be less code: add `"order": <number>` (or `before`/`after` names) per hook in `pack.json`, sort by it in `orderHooks`, and delete `hookOrder` from the config. Then a new hook is one edit, in its pack. Nothing else reads `hookOrder` (grep: only `sync.mjs`, `settings.mjs`, a comment in `configs.mjs`, and the CLAUDE.md sentence). `test/` has no test that pins the 35-name list against the manifests.

Also in `configs.mjs`: `inferConfig` ranks by default pack, then `always.length`, then `allowedPacks.length`. A pure function of the data, no hard-coding.

## 3. profiles/

| file | lines | holds | used by |
|---|---|---|---|
| `stellix.layout.json` | 315 | a complete (`"complete": true`) tailored layout for one real synth, Stellix: its own folders, kinds, concepts, protected paths | `--profile stellix` in `test/structure.test.mjs` (lines 57, 60, 143), `test/micro.test.mjs` (49, 55), `test/hover.test.mjs`, `test/hook-timing.test.mjs`, `test/worktree-rig.mjs`, `test/install.test.mjs`; no README row, only the bin help example |
| `sub37.layout.json` | 247 | a complete layout for the Sub37 unit surveyed 2026-10-31 at one commit; its `_comment` names the install command and the unit's own gate | `test/new.test.mjs:37`, `test/structure.test.mjs:96,104`, `test/other-projects.test.mjs` |

Both are named for one person's projects, shipped in the npm package (`files` lists `profiles`), taken by `bin/claude-packs.mjs:105` with a URL built from the name (no list of profiles, no validation message). The README "Words" table says "a ready-made `layout.json` for a known project shape". In practice both are test fixtures plus one user's seeds; a general user has no use for them. They are candidates to move out of the package to `test/fixtures/` or to a user-supplied path (`--profile <file>`).

## 4. prompts/workorder/

Files: `PROMPT.md` (55 lines), `run.sh` (69), `templates/generic.md` (73), `plugin.md` (173), `rebuild.md` (245); `prompts/survey.md` (82) and `scan-review.md` (40) are separate, printed by `survey` and `scan --prompt`. `lib/workorder.mjs` writes `workorder.md` (from a template), `PROMPT.md` and `run.sh` into `docs/workorders/<name>/`, replacing exactly three tokens: `{{name}}`, `{{date}}`, `{{kit}}`. `{{kit}}` is `kitCommand(dir)`: `npx --no-install @thedecipherist/claude-packs` if the project has the kit in `node_modules`, else `npx @thedecipherist/claude-packs`. Counts: the three templates use `{{name}}` 3, 3, 2 times and `{{kit}}` 0 times: they write the `--no-install` form literally (generic.md:39, plugin.md, rebuild.md, 1 each), so a project without a local kit gets a command that fails with "npx canceled" (the exact fault KWB-76 fixed elsewhere). PROMPT.md (2 uses) and run.sh (1) use `{{kit}}` correctly.

Hard-coded, and not changeable by a project short of editing the generated files after `workorder`:
- Paths: `docs/workorders/<name>/`, `workorder.md`, `progress.md`, `status.json`, `agents/<name>.json`, `decisions.md`, `DONE`, `logs/`, `build/evidence/W<n>/` and `build/evidence/final/`, `.claude/worktrees/<name>`, `bugs.md`, `workflow-bugs.md`, `build.md`, branch `work/{{name}}`.
- The status.json and agent-file JSON schemas are written out in prose in PROMPT.md; the reader is `lib/status*.mjs` (probably a second copy of the same shape; not read here).
- run.sh: `claude -p "Run docs/workorders/<name>/PROMPT.md" --permission-mode bypassPermissions --output-format stream-json --verbose < /dev/null`; env `CLAUDE_PACKS_UNATTENDED=1`; `MAX_SESSIONS` 30 and `LIMIT_WAIT` 900 (env-overridable, the only two knobs); exit codes 3, 4, 5, 6; the `kit-fresh.mjs` path under `.claude/hooks/`; the usage-limit marker string `"api_error":"usage_limit_reached"`; three-sessions-without-moving rule; no model, effort or tool flags, so a project cannot choose a model or restrict tools.
- PROMPT.md: the order of the checks at the end (tests reached against trunk, `doctor --strict`, `scan`, `logs`), the "never stop" overrides, and the one stop (`BLOCKED: workorder check`). It names `land-branch`, `pick-tests`, `logs mark`, the `.claude/rules` ban. It assumes the base pack is installed.
- Templates: `plugin` and `rebuild` hard-code a JUCE/C++/synth build (synth-creator install block, gates, VST3, panel, presets); `generic` is a fenced `claude-packs` install block plus blank steps. The template list is the directory listing, so a project cannot add its own template.

Findings: run.sh and PROMPT.md carry about a dozen KWB-nnn issue references in comments; `workorder check` (lib/workorder-check.mjs) holds the matching rules (placeholder `<...>`, `## W<n>` with `**Done when:**` holding a digit or a test path, skills known to the kit, red doctor) in code, so the rules about what makes an order valid live in three places: template prose, PROMPT.md prose, and the regexes.

## 5. site/index.html and README.md: numbers that mirror the packs

site/index.html lines 44 to 49, six counts, each `data-count="<name>">N<`: packs 39, rules 283, checks 357, hooks 46, skills 94, configurations 8. Held by `test/site.test.mjs` (recounts from `packs/` and `configurations/`). Note the site counts hook files (46) while the README counts distinct registered commands per pack (45 in total), two definitions of "hooks". Other copies in the page: "Node 22" (line 100), the check id and `why` of `rust-unwrap-in-library` (held by test), the `docs/versions.md` table row, a fake work-order excerpt "41,206 rows / 12 bad rows" (prose, fine). `site/js/page.js` reads `data-count` to animate; its start values are the same numbers.

README.md (668 lines), generated-looking blocks, all hand-maintained:

| block | lines | source of truth | test |
|---|---|---|---|
| Pack table, 39 rows x 4 counts | 399 to 439 | `packs/*/rules, checks, skills` file counts, `pack.json` hooks | `readme.test.mjs` "true counts"; the "For" column is not tested |
| Configurations table, 8 rows | 449 to 458 | `config.json` description, `packs.default` | test only checks the name is present, not the text or default |
| Presets table, 13 rows | 470 to 484 | `PRESETS` in `lib/packs.mjs:87` | test checks each pack is in the row |
| Commands table, 28 rows | 490 to 517 | `bin/claude-packs.mjs` help | test checks every help command appears |
| Hooks every project gets, 25 rows | 521 to 547 | `packs/base/pack.json` hooks | test checks every base hook has a row; "When" column and text not tested |
| Token-cost answer ("3,300 tokens", "10 rules", "22 skill descriptions", "107 tokens") | 291 | measured once, a Rust install | none |
| Status line sample "claude-packs 1.8.0" | 181 | package.json 1.9.0 | none (stale) |
| "the five skills" of the planner | 281 | `CLAUDE_AI_SKILLS` in `lib/planner.mjs` | none |
| Words/Kinds tables | 340 to 368 | prose | none |

A generator `scripts/counts.mts` writing the six site numbers, the 39 pack rows (count cells only), the base hook rows (name and "when"), the config table (name, description, defaults) and the preset table would replace 5 of the 6 tests and all of those hand edits. Markers needed: `<!-- counts:start site -->` is not needed for the site because each number is already a unique `data-count` attribute; use `data-count="x">N<` as the marker and rewrite N. For the README: paired HTML comment markers `<!-- generated:packs:start -->` ... `<!-- generated:packs:end -->`, one pair per table (packs, configs, presets, commands, base-hooks), and a test that the generator output equals the block. The "For" and "What it does" prose columns would move to `pack.json` `description` and a hook's own header line so they stay hand-written but live once.

## 6. planner/

Holds three skill folders (`workorder-writer` 68 + `questions.md` 110 + `stages.md` 30; `start-a-build` 26 + `handover.md` 88; `ui-mockup` 48 + `analyse-a-mockup.md` 62) and a 196-line README. `lib/planner.mjs` `CLAUDE_AI_SKILLS` bundles five: the three above plus two read from packs in place (`design-a-preset` from `packs/sound-design`, `synth-cost` from `packs/audio-core`) and the work order templates into `workorder-writer/templates/` (`{{name}}`/`{{date}}` replaced with `<name>`/`<date>`). Upload is `planner-skills --zip <dir>`: one zip per skill by `lib/zip.mjs`, no network; a person uploads each zip by hand in claude.ai. There is also a per-configuration generated `project-layout` skill (`planner-skills --out`), printed or written, not zipped. Duplication with `packs/*/skills`: by design none (README says "nothing here is a copy"; two of five are bundled from their packs, and `kitSkills()` in `workorder-check` reads `planner/` for skill names). Real copies: the planner README skill table (names, "fires on", "lives in" paths), the fixed `fifteen categories`, `Real at 1.6.0` (stale, package is 1.9.0), `npx @thedecipherist/claude-packs` commands in `start-a-build/handover.md` (3) and README (1) typed by hand, and the `claude-ai-skill` row in the README commands table (a separate command that writes only `workorder-writer.zip`, apparently superseded by `planner-skills --zip`).

## 7. docs/

| file | last commit | state |
|---|---|---|
| `versions.md` | 2026-11-09 | current: 2 rows (jscpd 5.4.2, yaml 2.9.1); hand table the version-pin-guard reads; it lists only two of the kit's dependencies, `package.json` is the real source |
| `history.md` | 2026-11-09 | frozen notes on 0.9.12 to 0.25.0, self-described "as they were written"; its configuration section describes keys now also in CLAUDE.md and `lib/configs.mjs` (a third copy); stale by design, 372 lines, cut to a pointer to CHANGELOG |
| `platform-audit.md` | 2026-11-11 | current work-order notes for 1.9.0 (22 failures list); belongs to a finished branch, will rot |
| `rules-without-checks.md` | 2026-11-09 | hand list of rules per pack with no check; derivable (a rule with no check naming it) and should be generated or a doctor line |
| `ui-craft-sources.md` | 2026-11-09 | bibliography for one pack; belongs inside `packs/ui-craft/` |
| `1.1-*` (4 files) and `1.1-DONE` | 2026-11-09 | finished 1.1 run, historical |
| `workorders/planner` | done | finished run with DONE; `workorders/typescript` is the live one |

Candidates to generate: `rules-without-checks.md`, the history configuration section (delete), `versions.md` rows (from package.json deps plus `npm view`).

## 8. Hand-kept copies: source of truth to copies (the DRY plan)

| # | fact | source of truth | hand-kept copies |
|---|---|---|---|
| 1 to 6 | six kit counts (packs, rules, checks, hooks, skills, configurations) | `packs/`, `configurations/` | `site/index.html:44-49` (6 numbers); the pack-row counts of 39 packs in `README.md:399-439` (156 numbers, counted as 1) |
| 7 | pack list and per-pack counts | `packs/*` | README pack table (39 rows); CLAUDE.md "Packs" language/stack/synth lists (line 35) |
| 8 | base hook list and "when" | `packs/base/pack.json` | README hooks table (25 rows) |
| 9 | configuration descriptions and default packs | `config.json` | README configurations table (8 rows); `lib/planner.mjs` output |
| 10 | presets | `lib/packs.mjs` `PRESETS` | README presets table (13 rows) |
| 11 | command list | `bin/claude-packs.mjs` help | README commands table (28 rows) |
| 12 | hook order | each `pack.json` manifest order | `configurations/synth-creator` `hookOrder` (35 names, 14 packs' hooks missing) |
| 13 | the house preamble | one base preamble | 8 x `config.json` preamble (64 identical lines) |
| 14 | shared folders and kinds (docs, tools, tests, src) | one base layout | 5 to 6 configs each |
| 15 | which packs fit which configuration | the pack | `choose` lists (123 mentions) |
| 16 | the "Put every kind of thing in its one place" line | `lib/claude-md.mjs` | `lib/planner.mjs` (own copy of the sentence) and the generated CLAUDE.md block |
| 17 | kit command form | `lib/kit-command.mjs` `kitCommand` | `claude-md.mjs:20`, `planner.mjs`, the 3 templates (1 each), `planner/start-a-build/handover.md` (3), `planner/README.md:123`, README (22 literal `npx` lines, 8 without `--no-install`) |
| 18 | package version | `package.json` 1.9.0 | README status-line sample 1.8.0; `planner/README.md` "Real at 1.6.0" |
| 19 | the planner skill count and list | `CLAUDE_AI_SKILLS` | README "five skills" (line 281), planner README skills table, `claude-ai-skill` row |
| 20 | token cost of an install | `doctor` measurement | README FAQ (line 291): 3,300 / 10 / 22 / 107 |
| 21 | Node 22 | `package.json` `engines` | README (2), `site/index.html` (1) |
| 22 | layout.json keys the project owns | `OWNED` in `lib/layout.mjs` | the header comment of `layout.mjs`, CLAUDE.md layout.json paragraph, `lib/configs.mjs` header, `history.md` |
| 23 | work-order validity rules | `lib/workorder-check.mjs` | `PROMPT.md` prose, templates, README "Let it build on its own" |
| 24 | status.json and agent file shape | the reader in lib | `PROMPT.md` (prose schema) |
| 25 | unattended-run settings (exit codes, limits, flags) | `run.sh` | README, `docs/workorders/*/run.sh` copies in each generated order |
| 26 | rules with no check | `packs/*/rules` and `checks` | `docs/rules-without-checks.md` |
| 27 | dependency versions | `package.json` | `docs/versions.md` (2 rows) |
| 28 | the one refusal shown as the example | `packs/rust/checks/rust-unwrap-in-library.json` | `README.md` (see it work), `site/index.html` (held by two tests) |
| 29 | two shipped profiles | one user's projects | `profiles/*.layout.json` (562 lines), tests |

Total: 29 hand-kept copies, 7 of them tested today (1 to 6 site and pack rows, 8, 10, 11 partly, 28), 22 held by nothing.

Order for the non-code part of the kit: (a) generated blocks and `scripts/counts.mts` for 1 to 11 and 18 to 21; (b) base config plus deltas and a per-hook `order` in `pack.json` for 12 to 15; (c) one `kitCommand` used by the templates and planner text for 17; (d) cut `history.md`, move `ui-craft-sources.md` into its pack, retire `claude-ai-skill`, move profiles to `test/fixtures/`.

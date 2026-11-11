# Survey: the content files of every pack

Read-only survey of branch work/2.0.0-typescript. Scope: `packs/*/rules/*.md`, `packs/*/checks/*.json`, `packs/*/skills/*/SKILL.md` (and reference files), `packs/*/pack.json`, and `global/`. Counts come from scripts run over every file, not a sample; nothing was changed or installed.

Totals: 39 packs, 283 rules, 357 checks, 95 skills (94 in packs, 1 in `global/skills/latest-versions`), 46 hook files (hooks only touched where a manifest names them). `global/` holds 3 hooks (`gnu-shell`, `shell-traps`, `version-pin-guard`), `hooks/lib/shell-writes.mjs` and the one skill; it has no rules, checks or manifest.

The intended forms are in `CLAUDE.md` section "Authoring pack content" and in the rule `packs/base/rules/skill-writing.md`. The manifest contract is `lib/pack-manifest.mjs` (`manifestProblems`: version semver, description, type stock|custom, author, license, repository.url as a git url, name equals folder).

## 1. The forms in use

### 1a. Rules (283)

The intended form: frontmatter `# concepts: a, b` plus `paths:` (generated), a one-line `#` title that states the law, a body in `<constraints>` with `Always do:` and `Never do:`. A rule for one hook may carry `# hook: <file>` instead.

| Frontmatter | Rules | Notes |
|---|---|---|
| `# concepts:` + `paths: ["placeholder"]` | 187 | the intended form; the `paths` line is rewritten at install |
| `paths:` with real globs, no `# concepts:` | 60 | 19 packs (dynamic-data 10, instrument-shell 7, rust 6, midi 5, postgres 5, sound-design 7, content-site 4, others 1 to 3). A hand-written path list, not the form CLAUDE.md describes |
| `# concepts:` only, no `paths:` line | 24 | audio-core 10, reverse-engineering 9, zod 2, docker 1, fastify 1, synth-creator 1 |
| `# hook: x.mjs` only | 12 | all base (10) plus synth-creator (2); loads everywhere |
| `# concepts:` + `# hook:` | 1 | reverse-engineering/circuits-through-the-skill |
| `# loads: at launch...` | 2 | base/refusals-are-judged, reverse-engineering/names-before-code. `# loads` is read by no code in `lib/` or the hooks lib: it is a comment that looks like a key |
| no frontmatter at all | 1 | base/unattended-runs |

Body forms:

| Body | Rules |
|---|---|
| title + `<constraints>` ... `</constraints>` with `Always do:` and `Never do:` | 263 |
| the old form: `## The law`, `## Exceptions`, `## Check` with an ESLint snippet, no `<constraints>` | 17, every one in js-ts (env-through-config, errors-never-swallowed, files-under-300-lines, guard-clauses-over-nesting, named-constants-not-magic-numbers, no-any, no-console, no-floating-promises, no-param-mutation, no-unsafe-assertions, parallel-independent-awaits, small-functions, test-names-describe-behavior, tsconfig-strict, typed-exports, unions-over-enums, zod-at-route-boundaries) |
| `<constraints>` opened and never closed | 3: audio-core/house-control-behaviours, audio-core/ui-matches-reference-look, base/references-use-anchors |
| only one of the two headings | 1 more: writing/no-cargo-cult (Never only) |
| qualified headings (`Always do, in this order:`, `Never do (inside audio-thread code):`) | several; `Always do` is a prefix, not a fixed line |

Other rule facts:
- A `## Check` section: 138 rules. Its content is not one form: it names check ids, hooks, skills, tests, or (js-ts) an ESLint block. 60 rules have the section but no check json points at them (they name hooks or tests); 55 rules have a check json pointing at them but no `## Check` section; 71 rules have checks pointing at them that the `## Check` section does not name.
- `## The law` 17, `## Why` 6, `## Exceptions` 4, `## Checks` 2, `## Enforced` 2, `## Never` 1, `## Not covered` 1: all but `## Check` are one-offs.
- A lead paragraph (the reason) between the title and `<constraints>`: 74 rules. 209 have none; the reason, if any, sits inside bullets.
- Titles over 110 characters: 3 (cpp/cpp-builds-share-one-compiler-cache 115, gpu-painter/hover-every-pressable 111, sound-design/presets-are-named-and-neutral 127).
- Concepts used in `# concepts:` are 65 distinct names; every one is defined by some pack.json or configuration (0 undefined).
- Length: max 5,324 characters; 10 rules over 3,000.

### 1b. Checks (357)

Every file parses as JSON; `id` always equals the filename (0 mismatches); no duplicate ids.

| Field | Checks having it | Notes |
|---|---|---|
| id, why, pattern, bad, good | 357 each | |
| rule | 356 | missing in base/no-code-after-midline-comment |
| exclude | 321 | 36 lack it (audio-core 8, docker 18, gpu-painter 5, stellix 3, base 1, shell-hooks 1) |
| concepts | 216 | |
| globs | 243 | 143 globs only, 207 concepts only, 7 both. `globs: []` appears beside `concepts` in many |
| code | 192 | `true` 115, `false` 77, absent 129 (absent means the default, not stated) |
| flags | 115 | regex flags; not named in CLAUDE.md |
| kind | 59 | security 46, correctness 6, quality 5, performance 1, "failures and lost data" 1; set in 13 packs only, absent from js-ts, mongo, ai and 24 others |
| mode | 39 | `needs` 37, `require` 2 (`forbid` is the default and never written) |
| needs | 37 | always with mode `needs` (0 mismatches) |
| strings | 18 | all `true` |
| prose | 11 | not named in CLAUDE.md |
| examples | 6 | not named in CLAUDE.md |
| language | 7 | all `"rust"` |
| notInTests | 6 | |
| replaces | 1 | |
| whenDep | 1 | `{"zod": 4}` |

Rule links: 350 of 357 name a rule in their own pack. 6 name a rule in another pack (js-ts/line-under-200-chars, no-dynamic-import-node-builtin, no-inline-binary, no-local-sleep, no-nested-ternary, switch-is-a-table; at least two point at rules of other packs, stack-is-fastify-and-nextjs and lookup-over-if-chains). 1 has no `rule` (base/no-code-after-midline-comment). No check is missing `bad` or `good`.

Quality notes: 30 checks have a `good` under 25 characters (for example http-api/debug-route-not-shipped has `const x = 1;`, which proves nothing about the fix); 7 `why` texts say "an AI" or "an LLM". `why` median length 119 characters, longest 833; every `why` starts with a noun phrase ("A ..." 146, "An ..." 25).

### 1c. Skills (95)

- Frontmatter: all 95 have exactly `name` and `description`, `name` equals the folder in all 95.
- Description starts "Use when": 85. The other 10 start "Use after", "Use before", "Use right after", "Use only when", "Use for": juce-realtime-audit, prove-control, add-lesson-check, analyse-reference-look, build-preflight, gpu-golden-check, gpu-golden-update, gpu-lifecycle-stress, tripwire-the-law, preflight-build. skill-writing says "Start the description with 'Use when'". 12 descriptions are over 200 characters (max 268, tui/build-tui).
- H1 of the form `# Title (one job: ...)`: 66. 29 have a plain H1 (writing 9 of 10, web 5, audio-core 5, and others, plus global latest-versions).
- `<constraints>` with `Always do:` and `Never do:`: 73. 22 have none (writing 7, gpu-painter 4, audio-core 5, base 2, synth-creator, ui-craft/hover-state, and others). 65 of the 73 number the Always steps (`1.`).
- Sections after the constraints: `## Steps` 9, `## Report` 9, `## Output` 1, `## Worked example` 2, `## Declare it` 2; the rest are one-off headings (build-step has seven numbered `## N.` headings, copy-and-prove seven). There is no standard closing section.
- Length: min 512, median 1,809, p90 3,810, max 7,337 characters. Bands: under 1,500: 37; 1,500 to 3,000: 39; 3,000 to 5,000: 13; 5,000 to 8,000: 6; over 8,000: 0. The six over 5,000: design-a-preset 7,337, build-step 6,941, read-a-circuit-diagram 6,760, names-first 6,350, analyse-reference-look 6,051, copy-and-prove 5,597.
- Reference files: 4 skills. new-panel-control (switch-gate-harness.md), synth-cost (cost-ledger.md), clock-probe (clock-law.md) each name their one file in SKILL.md. design-a-preset has 18 files under `references/` and `references/categories/`; SKILL.md names 3 of them by file name and reaches the rest by folder. No rule fixes how a reference is cited.
- Two skills share a name across packs: `hover-state` in gpu-painter and ui-craft.

## 2. Style

The kit's own rule (CLAUDE.md): no file names a person; write "the user" or "the author"; state a reason itself, never who asked; plain prose; no line numbers. `test/no-personal-name.test.mjs` already enforces the first part and passes: 0 person names. The other style points have no test.

| Defect | Rules | Skills | Checks |
|---|---|---|---|
| a person's name | 0 | 0 | 0 |
| a project name (Stellix, Solera, MegaSynth, MPX) outside the stellix pack | 11 | 5 | 5 |
| "you can / you must / You" (second person, advice not imperative) | 5 | 9 | 0 |
| hedge words (Maybe, Consider, perhaps, probably) | 4 | 0 | 0 |
| en dash | 6 | 1 | 0 |
| em dash | 0 | 0 | 0 |
| emoji | 0 | 0 | 0 |
| "We must" (collective voice) | 0 | 1 | 0 |
| incident ids cited (KWB-, WB-, B-n) | 10 | 2 | 1 |
| no lead reason (rule has no paragraph and no `## Why`) | 209 | n/a | n/a |

Ten examples:

1. `packs/audio-core/rules/house-control-behaviours.md`: names Solera and MegaSynth in the opening paragraph, cites bug ids B-163, B-210, B-211, and has `<constraints>` with no closing tag.
2. `packs/base/rules/references-use-anchors.md`: the rule about stating things well is itself malformed (unclosed `<constraints>`) and names Stellix.
3. `packs/js-ts/rules/no-any.md`: the old form (`## The law`, `## Exceptions`, `## Check`, `## Enforced`), "data you don't control yet", no constraints block.
4. `packs/js-ts/rules/parallel-independent-awaits.md`: "you must", old form.
5. `packs/js-ts/rules/files-under-300-lines.md`: the parenthesis "(The downloaded templates allowed 800 lines; this house limit replaces that.)" is history, not law.
6. `packs/ui-craft/rules/type-space-colour.md`: "perhaps".
7. `packs/stellix/rules/world-fp-determinism.md` and `packs/cpp/rules/cpp-absent-and-failed-are-types.md`: "Consider" and "Maybe" as openers.
8. `packs/synth-creator/skills/build-step/SKILL.md`: "We must", names MegaSynth, no `<constraints>`, 6,941 characters, seven numbered section headings.
9. `packs/writing/skills/reddit-title/SKILL.md` (and 6 other writing skills): no `<constraints>`, plain H1, description not in the "(one job)" form.
10. `packs/http-api/checks/debug-route-not-shipped.json`: `why` says "an AI writes the comment instead of the check", and `good` is `const x = 1;`.

Bullet-only bodies are the normal form here (263 rules); a reason inside each bullet is common but a rule-level reason paragraph exists in only 74.

## 3. pack.json

All 39 manifests pass `manifestProblems` (0 problems). Every manifest has: name, version (all `1.0.0`), description, type (all `stock`), author (all `claude-packs`), license (all `MIT`), homepage, repository (`directory` equals `packs/<name>` in all), keywords (all non-empty), engines.

| Field | Packs | Notes |
|---|---|---|
| engines.claude-packs | 39 | values `>=0.19.0` 20, `>=0.25.0` 9, `>=0.28.0` 4, `>=0.26.0` 2, `>=1.1.0` 2, `>=0.24.0` 1, `>=0.27.0` 1; all of them are far below the kit's current version, so the field says nothing |
| concepts | 27 | missing in 12 packs |
| folders | 19 | `{}` in several (js-ts, base has none) |
| hooks | 24 | `{}` in js-ts; base/zod/others declare |
| skillsIn | 20 | `null` in 19, `"painter"` in gpu-painter; absent in 19, of which 13 have a `skills/` folder (content-site, cpp, dynamic-data, http-api, instrument-shell, midi, multi-tenant, postgres, python, reverse-engineering, rust, shell, sound-design) |
| kinds | 2 | audio-core, gpu-painter |
| optIn | 4 | base (empty array), postgres, synth-creator (3 hooks), writing |
| statusLine | 1 | base |
| synth, onByDefault, configurationPack, files | 1, 1, 2, 2 | one-off flags (audio-core `synth`; synth-creator and one other `configurationPack`; gpu-painter `files`) |

Against `lib/pack-manifest.mjs` nothing is incomplete. The manifest module checks only the six fields it lists; it does not check keywords, engines, repository.directory, concepts, or that every `hooks` entry names a file. One cross-check found: every hook file in a pack is named in its manifest except `base/hooks/run-hooks.mjs` (the runner), and the rule `reverse-engineering/rules/circuits-through-the-skill.md` names `# hook: skill-first.mjs`, which lives in base, not in its own pack.

## 4. What a template would be

One canonical form per kind, each drawn from the best existing file.

**Rule** (model: `packs/base/rules/a-control-is-seen-to-fire.md`; hook-bound model: `packs/base/rules/split-before-the-limit.md`)

```
---
# concepts: <a, b>
paths:
  - "placeholder"
---

# <One line that states the law, under 110 characters>

<One or two sentences: the reason, stated as a fact. Optional, but a gate may require it.>

<constraints>
Always do:
- <imperative, one action>

Never do:
- <imperative, one refusal>
</constraints>

## Check
`<check-id>` refuses <what>. The `<skill>` skill walks the change.
```

A hook rule replaces the frontmatter with `# hook: <file>.mjs` and drops `## Check`. The generator should fill: concepts (picked from the pack's `concepts`), title, always and never lists, and the `## Check` text from the ids of checks whose `rule` points here.

**Check** (model: `packs/base/checks/field-map-over-if-runs.json`, with `kind` added from `packs/http-api/checks/debug-route-not-shipped.json`)

Field order: `id`, `why` (one sentence of reason), `rule` (an own-pack file), `concepts` or `globs` (one of them, globs for a pack whose concept may be absent), `exclude`, `code`/`strings`/`language` (always stated), `pattern`, `mode`/`needs` when used, `kind`, `bad`, `good`. The generator should fill: id (from the filename), rule (from the paired rule), exclude (the standard test and build list that 321 checks already copy), `kind`, and run `lesson-checks.mjs --selftest` so `bad` fires and `good` passes. `good` must be a real fix of `bad`, not a stub.

**Skill** (model: `packs/base/skills/pick-tests/SKILL.md`)

```
---
name: <folder name>
description: Use when <the situations that trigger it>.
---

# <Title> (one job: <what it does and nothing else>)

<constraints>
Always do:
1. <step>

Never do:
- <refusal>
</constraints>

## Output
<what to say when done, one or two lines>
```
Over 3,000 characters, move a long list to a named reference file in the skill folder and cite it by file name.

**pack.json** (model: `packs/http-api/pack.json`, plus the optional fields of `packs/audio-core/pack.json`)

Required: name, version, description, type, author, license, homepage, repository {type, url, directory}, keywords (non-empty), engines. Always present, even empty: `concepts`, `folders`, `skillsIn`, `hooks`. Only when used: `kinds`, `optIn`, `statusLine`, `files`, `synth`, `configurationPack`, `onByDefault`.

**Hook**: not surveyed for content; the form is in CLAUDE.md (register in pack.json, `export const hook`, `--selftest`). A template here is a code skeleton and belongs with the hook survey.

### What `new-pack` scaffolds today (`lib/custom-packs.mjs`, `newPack`, constant `FILES`)

| Piece | Scaffold | Against the template |
|---|---|---|
| pack.json | name, `0.1.0`, a placeholder description, type `custom`, author from `git config user.name` or "Your team", `UNLICENSED`, homepage, repository with `directory`, `keywords: []`, engines `>=0.21.0`, `folders: {}`, `concepts: {}`, `skillsIn: null`, `hooks: {}` | `keywords` empty; engines hard-coded at 0.21.0; author can be a person's name; no `kinds` or `optIn` |
| rule | frontmatter `# concepts: js` and `paths: ["placeholder"]`, a placeholder title, `<constraints>` with one Always and one Never | matches the form; no `## Check` section; `# concepts: js` names a concept the new pack's own `concepts: {}` does not define |
| check | id, why, rule, `concepts: ["js"]`, `globs: []`, `code: true`, pattern, bad, good | contradicts CLAUDE.md ("a new pack's check names `globs`"): it names a concept and an empty `globs`; no `exclude`, no `kind` |
| skill | `name`, `description: Use when the situation...`, `# One job`, constraints with `1.` step | H1 lacks `(one job: ...)`; no `## Output` |
| hook | none | no hook skeleton, no selftest |
| tests | none | no step runs a conformance check on the scaffold |

`add-lesson-check` is a skill (`packs/base/skills/add-lesson-check/SKILL.md`), not a command. It tells the model to write `id`, `why`, `rule`, `globs`, `pattern`, `code`, `bad`, `good` by hand and run `lesson-checks.mjs --selftest`; it omits `concepts`, `exclude`, `kind`, `strings` and `mode`, which are fields 100 to 300 existing checks use, and itself lacks "Use when" in the "Use when" form (it begins "Use right after"). There is no `add-lesson-check` CLI generator at all, so a TypeScript port has one to write: given an id, a rule, bad and good, it should emit the JSON in field order, fill `exclude`, and run the selftest.

## 5. A conformance gate

One test (`test/pack-content.test.mjs`) over every pack. Counts are files failing each check today (hard checks first). A file can fail several.

| # | Check | Fails today |
|---|---|---|
| R1 | rule frontmatter is `# concepts:` + `paths:`, or `# hook:` (hand paths, `# loads` and none all fail) | 86 (60 hand-written paths, 24 concepts without `paths:` counting the hook+concepts one, 2 `# loads`, 1 none) |
| R2 | rule has one H1 of at most 110 characters | 3 |
| R3 | rule body has `<constraints>` and `</constraints>` | 20 (17 js-ts old form, 3 unclosed) |
| R4 | both `Always do` and `Never do` (prefix) headings inside the block | 18 |
| R5 | no `## The law`, `## Exceptions`, `## Enforced` headings | 17 (inside R3) |
| R6 | every check pointing at a rule is named in that rule's `## Check` | 71 rules |
| R7 | no project name outside its own pack, no "you should/can/must", no hedge, no en or em dash | 25 rules |
| C1 | `rule` set and found in the check's own pack | 7 (1 missing, 6 cross-pack) |
| C2 | `exclude` present | 36 |
| C3 | `concepts` or `globs` non-empty (one of them) | 0 |
| C4 | `id` equals the filename, no duplicate ids, `bad` and `good` present | 0 |
| C5 | `good` is at least 25 characters and is not a stub (soft) | 30 |
| C6 | `code`, `strings` or `language` stated (soft) | 129 |
| C7 | no project name or dash in `why` | 5 |
| C8 | check field names are in a known list (id, why, rule, globs, concepts, exclude, pattern, code, strings, language, mode, needs, whenDep, kind, bad, good, notInTests, replaces, flags, prose, examples) | 0 unknown, but `flags`, `prose`, `examples`, `needs` are not in CLAUDE.md (doc gap, 4 fields) |
| S1 | `description` starts "Use when" | 10 |
| S2 | name equals folder, frontmatter has only name and description | 0 |
| S3 | `<constraints>` with `Always do:` and `Never do:` | 22 |
| S4 | H1 ends `(one job: ...)` | 29 |
| S5 | SKILL.md at most 8,000 characters | 0 (closest 7,337) |
| S6 | a reference file is named in SKILL.md | 0 |
| S7 | no project name, no "you can/should/must", no "We must" | 15 |
| S8 | description at most 200 characters (soft) | 12 |
| P1 | `manifestProblems` is empty | 0 |
| P2 | keywords non-empty, `repository.directory` equals `packs/<name>`, engines present | 0 |
| P3 | `skillsIn` present when a `skills/` folder exists | 13 packs |
| P4 | `concepts`, `folders`, `hooks` keys present | 12 lack `concepts`, 20 lack `folders`, 15 lack `hooks` |
| P5 | every `# concepts:` name is defined by a pack.json | 0 |
| P6 | every `# hook:` file exists in the same pack | 1 (circuits-through-the-skill, hook is in base) |

Total files that fail at least one of R1 to R4, R7, C1, C2, C7, S1, S3, S4, S7 today: 266 of 735 content files (175 rules, 44 checks, 47 skills), plus 13 manifests for P3. Without the soft or debatable checks (R1 hand paths, R6, S4, C2) the count is 91 files. The largest single cause is the 60 hand-written `paths:` rules and the 17 js-ts old-form rules (js-ts also supplies 35 of the checks with no `kind`).

Recommendation for the gate's first version: make R2, R3, R4, C1, C4, S1, S2, S5, P1, P2, P5, P6 hard now (a small set of fixes: 3 unclosed blocks, 1 missing rule, 10 descriptions, 1 hook location), and ratchet the rest (a stored count that may only fall) as the existing `json-ratchet` test does.

## 6. Duplicated content

Rules, pairs saying the same law:

| Pair | Overlap |
|---|---|
| `packs/js-ts/rules/js-repeats-become-templates.md`, `packs/python/rules/python-repeats-become-templates.md`, `packs/cpp/rules/cpp-repeats-become-templates.md`, `packs/rust/rules/rust-repeats-become-templates.md`, `packs/shell/rules/shell-repeats-become-templates.md` | the same law in five languages; 4-word-phrase overlap 14 to 35 percent between each pair (js to python highest at 63 shared phrases); the shape is one list "match the repeat to its form" plus `template-law` |
| `packs/audio-core/rules/ui-matches-reference-look.md` and `packs/ui-craft/rules/page-matches-reference-look.md` | 55 shared phrases: same law for a painter UI and a web page |
| `packs/js-ts/rules/files-under-300-lines.md` and `packs/base/rules/split-before-the-limit.md` | the same 300-line limit; base reads `layout.maxFileLines`, js-ts hard-codes 300 and ESLint |
| `packs/base/rules/lookup-over-if-chains.md`, `packs/base/rules/field-map-over-if-runs.md` and `packs/js-ts/rules/switch-is-a-table` (a check, no rule file) | one idea (a table over a chain) in three places; js-ts checks borrow base's rule |
| `packs/js-ts/rules/tests-can-fail.md` and `packs/base/rules/a-control-is-seen-to-fire.md` | both say a test must be able to fail (overlap judged by reading, not measured) |
| `packs/base/rules/secrets-never-committed.md` and `packs/js-ts/rules/secrets-stay-secret.md` and `packs/web/rules/secrets-not-in-the-browser.md` | three halves of one subject, no shared sentences, so a cousin, not a copy |

Skills:

| Pair | Overlap |
|---|---|
| `packs/gpu-painter/skills/hover-state/SKILL.md` and `packs/ui-craft/skills/hover-state/SKILL.md` | the same name and 71 shared phrases; a project that installs both gets two skills with one name |
| `packs/cpp/skills/cpp-extract-template`, `python-extract-template`, `rust-extract-template`, `shell-extract-template` | 16 to 23 percent phrase overlap; the walk-through is the same with a language's own forms (base `make-it-a-template` is the language-neutral parent) |
| `packs/writing/skills/humanize` and `packs/writing/skills/post-voice` | both say how to sound like a person; not measured, noted by reading the descriptions |

Checks with the same pattern:

| Pair | Pattern |
|---|---|
| `packs/docker/checks/no-crlf-in-scripts.json` and `packs/nginx/checks/nginx-no-crlf.json` | `\r$` |
| `packs/content-site/checks/page-head-complete.json` and `packs/web/checks/rcss-viewport-meta.json` | `<html\b` (anchors for two different needs-lists) |
| `packs/mongo/checks/mongoclient-cached-and-named.json` and `packs/mongo/checks/mongoclient-outside-gateway.json` | `\bnew\s+MongoClient\s*\(` (same pack) |
| `packs/docker/checks/dockerfile-needs-healthcheck.json` and `dockerfile-needs-user.json` | `^\s*(CMD\|ENTRYPOINT)\s` (same pack, two needs-lists) |
| `packs/docker/checks/dockerignore-has-the-basics.json` and `gitattributes-forces-lf.json` | `[\s\S]` (a whole-file anchor) |

Checks with the same `why` text: http-api debug-route-not-shipped, gate-is-not-a-todo, no-security-off-switch (one sentence three times); http-api query-cast-is-not-validation and route-body-needs-schema; react ui-failed-fetch-says-so and ui-ok-branch-has-an-else. The `exclude` list (the test and build globs) is copied into 321 checks, which is the largest block of duplicated content in the kit; a template generator should fill it once from a shared default.

Other repetition: the `<constraints>` and "Always do/Never do" skeleton is in every rule and 73 skills (that is the form, not a defect), and `packs/base/rules/skill-writing.md` plus `pressure-test-skill` plus `add-lesson-check` each restate part of the authoring rules in CLAUDE.md.

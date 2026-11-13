# Work order: audit (what the kit was missing from where it started, into 2.0)

Written 2026-11-13.

**What this is.** The kit grew out of `~/projects/eproms`, `~/projects/arcturus` and the user's global Claude Code skills, and an audit read every line of them against the kit: about 2,000 methods, merged into about 830 distinct items, decided with the user item by item. This order puts every approved item into the kit as micro units (one rule per law, one skill per technique, one hook or check per mechanical test), each in the pack it belongs to, each proved, on the branch `work/2.0.0-audit` (made from `work/2.0.0-typescript`). Finished looks like: every unit in `sources/DECIDED.md` and every ADDITIVE item in `sources/SORTED.md` exists in the kit with its proof; nothing the user did not approve changed how the kit already works; a second full read by fresh readers found nothing important left out (or what it found is in); the tests the changes reach are green; `counts --check` and `doctor` are green; the branch is pushed and ready to land, and the report says what went in, with counts. Landing on the trunk and publishing 2.0.0 are NOT part of this order: the lead does both with the user.

**The position.** Known: what each item is, where it came from, and what the user decided (`sources/`). Not known until built: whether each new skill fires when its job comes up and is followed (each one's pressure test says), and whether the new hooks and checks refuse only what they should (each one's selftest with planted faults says). Cannot be proved here: that the kit now performs better on a real build. That is the supernova2 run's job, after this order, with the global skills moved aside.

**The sources.** All in `docs/workorders/audit/sources/`:
- `DECIDED.md`: every decision the user made, item by item, with their words. It overrides everything below it. Read it whole, every session.
- `SORTED.md`: every remaining item sorted against the exact kit text it touches. ADDITIVE items are taken as recommended; CHANGES and ENFORCEMENT items take the recommendation written there (the user: "use recommended choices for the rest"), in its reworded form where it says so, or are dropped where it says drop.
- `DECISIONS.md`: the merged list. For each unit (U1-U74, E1-E80, T1-T11): its one thing, the merged methods it carries, and the source rows (`re-2#14`, `arc#D26`, ...). The methods are the content of the units.
- `reports/`: the ten readers' full reports (the source rows the ids point at, with quotes and line ranges). Read a row there whenever a method's one-line summary is not enough to write it right. The original documents are at `~/projects/eproms`, `~/projects/arcturus` and `~/.claude/skills` (read-only; never copy a global skill's text in bulk: write the kit's unit in the kit's own plain style).
- The synth catalog for N3/N4: `~/projects/synthcatalog` (`TheDecipherist/synthcatalog`): its `README.md`, each category's `SCHEMA.md`, `tools/drift_check.py`, `tools/gen_all.sh`. Read-only from this order.

**The foundation.** The kit's own machinery, never written again: the hooks' `lib/` (selftest, hook-log, files, json, glob, layout, writes), `scripts/counts.mts`, the pack manifests and `pack.json`, the lesson-check format (`add-lesson-check`), `prove-a-hook`, `pressure-test-skill`, `test-changed`. An existing unit is extended in place only where the method is a missing step of the one job it already does; anything that would make it serve a second thing is a new unit.

**Models.** Each pack's existing units are the model for a new one there: their frontmatter, their `<constraints>` shape, their one-line job in the title, their `## Check` section. Take the method from the sources, never their prose: the sources predate the kit, and some of their practices are obsolete (`DECISIONS.md` section 4, `DECIDED.md` C5 and C12: no sprites, no HTML-first panels, no synth shell).

<constraints>
Always do:
- Read `sources/DECIDED.md` before writing any unit, and write each unit as decided there: its wording, its scope (for example "on an original only"), its pack.
- Give every new unit exactly one thing, named in its title and stated in one line; keep that line in `units.md`.
- Prove every unit before it counts as done: a skill by `pressure-test-skill` (a scenario where it must fire and be followed, and one where it must not); a rule by the files it loads on (its `paths:` match real files of the kind it governs, or it says why it loads at launch); a hook or a check by its selftest with a planted fault seen red, and the must-pass cases `SORTED.md` names (for example U28's planted-fault phrasing).
- When a skill or rule does not fire in its pressure test (or is loaded and not followed), enforce it with a hook, as the kit normally does (`skill-first.mjs` and its `# hook:` frontmatter line, or the unit's own one-thing hook with a selftest and a planted fault), then run the pressure test again; record which units needed a hook (the user, 2026-11-13: "if you find out that skills/rules are not firing ... you need to enforce them by hooks as we normally do").
- Keep `docs/workorders/audit/units.md` as the ledger: one row per unit and per extension line: id, kind (new or extend), pack and file, its one thing, its proof (test file or pressure-test record), commit.
- Regenerate the counts (`node scripts/counts.mts`) and the pack manifests after each step; `counts --check` green before a step is done.
- Run only the tests a step's changes reach (`npm run test:changed`); the whole suite only where a Done when names it (W9).
- Log every fault in the work in `workflow-bugs.md` before fixing it.

Never do:
- Change how the kit already works beyond what `DECIDED.md` and `SORTED.md` record. Rewording, removing or narrowing an existing constraint, changing a default, or a new refusal that is not in those files is out of scope: write it in `progress.md` under `FOR THE USER` and go on.
- Add anything the sources mark OBSOLETE or that exists only because of the synth shell.
- Copy third-party code (MAME, GPL emulators) into the kit; tools run as programs only (C4).
- Commit a firmware image, a PDF, a photo or a disassembly listing.
- Mark a step done when it was not measured, or weaken a test to pass it.
- Land on the trunk, or publish.
</constraints>

---

## W0. Set up

The kit's own repository: no install from the block; it is listed so `workorder check` can read it.

```claude-packs
configuration: base
packs: base
```

1. `npm ci && npm run build` in this worktree (`.claude/worktrees/audit`); every command runs here, never in the main checkout.
2. Record the baseline: `node bin/claude-packs.mjs doctor`, `node scripts/counts.mts --check`, and the unit counts per pack, into `build/evidence/W0/baseline.md`.
3. Create `units.md` with every unit id from `DECIDED.md` and `SORTED.md` section 7 as an empty row, so the ledger's size is fixed before any work.

**Done when:** `build/evidence/W0/baseline.md` holds the doctor result, the counts check's exit code and the unit count per pack; `units.md` has one row per id (the number of rows equals the number of ids in `DECIDED.md` plus `SORTED.md` section 7, both counted in the evidence).

## W1. reverse-engineering: the firmware pass

1. New units, as decided: U1 `triage-the-dump` (with its tool), U2 `identify-the-cpu`, U3 `decode-from-a-proven-boundary`, U4 `find-the-base` (C13), U5 `trace-the-builders`, U6 `attribute-the-record`, U7 `read-the-dsp-program`, U8 `find-the-timer`, U9 `absolute-scale-from-firmware`, U10 `layout-closes-on-itself` (C11), U11 `profile-the-bank` (with its tool), U12 `find-a-table`, U13-U16, U17 `manual-is-fully-covered` (a CLOSING check: packs/reverse-engineering/skills/names-first stays the first step, unchanged), U18-U21, N1 `find-the-reset`, N2 `find-the-init-patch`.
2. packs/reverse-engineering/skills/re-toolchain starts from U2's answer.
3. The extensions E1-E18 as `SORTED.md` sorts them (ADDITIVE lines taken; CHANGES lines in their decided form; C10, C11, C17, C4 in the decided wording).

**Done when:** every W1 row in `units.md` has a file and a proof; each new skill's pressure test is recorded in `build/evidence/W1/` (fires and is followed in its scenario, stays silent in the other); each tool has a test that runs it on a planted image (a stuck address line for U1, a known profile for U11) and turns red when the planted fault is removed; `test:changed` green; `counts --check` exit 0.

## W2. base

1. New units: U22 `a-gate-measures-the-real-thing`, U23 `debt-gates-fail-on-rise`, U24 `no-elided-code` (check), U25 `second-time-is-a-tool`, U73 `agent-model` (hook: forks and agent types whose definition sets a model are exempt; the Opus reasons configurable), U74 `agent-ledger` if `SORTED.md` takes it; the skill-use log and the rule-applied log (each its own hook, writing to `.claude/logs`) and `logs` reporting per skill and per rule how often it was used, and which never were (the user: one thing per unit "is the only way we can ever truly track which skills/hooks/rules are actually being triggered").
2. `pdf-to-md`: C7 (docling stays; the backup read is made when a converted file is found broken at use, and the user is told) and C15 (a slot helper, no polling loop).
3. The extensions E19-E29 and E80 as sorted (E19.5 and E21.1 in their decided form: photo first stands in `analyse-reference-look`).

**Done when:** every W2 row in `units.md` has a file and a proof; each new hook and check has a selftest with a planted fault seen red (`build/evidence/W2/`), U73's selftest passes a fork and a self-defined model and refuses Opus with no reason; `logs` prints a skill-use and a rule-applied row from a scripted session in a scratch project; `test:changed` green; `counts --check` exit 0.

## W3. synth-creator

1. New units: U26 `workflow-bugs` (C16; the rule `hooks-and-gates` already names it), U27 `can-the-user-open-it` (tool + skill), U28 `fault-logged` (Stop hook; planted-fault and expected-failure phrasing must pass), U29 `generate-the-machine-docs`, U30 `docs-are-current` (only where U29's generator exists; the generator byte-deterministic, proved by a run-twice test). U31 is dropped.
2. The extensions E30-E36 as sorted.

**Done when:** every W3 row in `units.md` has a file and a proof; U27's test plants a stale binary and a RelWithDebInfo leftover and both are named; U28's selftest refuses an admitted fault with no log and passes the planted-fault phrasings; `test:changed` green; `counts --check` exit 0.

## W4. sound-design and midi

1. sound-design: U32 `measure-a-filter`, U33 `measure-an-envelope`, U34 `identify-a-parameter`, U35, U36 (split as `SORTED.md` says), U37 `full-matrix-first`, U38 `reset-before-apply` (built from `find-the-reset`'s map: the engine resets exactly as the machine does, before every patch and at startup; rule + check), U40 `reference-presets-are-statistics-only`, U41 (trimmed as sorted), U42-U46. The extensions E37-E49.
2. midi: U47 `nrpn-and-packed-values`, U48-U50, the extensions E50-E56, with C6, C9 and C9a in their decided form (standalone opens as the hardware did, sync off; as a plugin the host clock, delays synced, LFOs and envelopes free unless the machine says otherwise; a saved patch loads as saved; timbre times never follow tempo); `clock-law.md` restored from `midi-law.md` as `DECISIONS.md` E51 lists, minus the dropped re-anchor clause.

**Done when:** every W4 row in `units.md` has a file and a proof; U38's check refuses a planted patch-apply with no reset; packs/midi/skills/clock-probe checks the default at open, untouched, at 120 and 90 BPM, in a test; `test:changed` green; `counts --check` exit 0.

## W5. audio-core and the release lock

1. The C1 split of `panel-surface-and-sections` into U52-U56 (its "never glows, shadows deeper than 2 units, textures" line goes; depth is `depth-is-designed`'s). The C2 split of `panel-gestures` into its four one-thing rules, its "never add a modulation matrix page" line gone, plus a new rule: every synth gets drag and drop onto knobs AND a modulation overview page, in settings, as bandwarp has it. C14 in the host-names rule.
2. U51 (reworded: outside a text field the user opened), U57-U59 (on an ORIGINAL only).
3. The release lock (DECIDED.md "E57 replaced"): a new unit that, at the first release, writes the snapshot of every parameter's ID, range, scaling, step count, a choice list's members in order, the patch format and the factory program numbers, and after that passes only additions; `param-id-lock` changes to judge IDs against it, starting at the first release instead of the first sighting. U39 is its program-number row. Nothing locks the parameter order (the host stores by ID).
4. The extensions E58-E69 as sorted.

**Done when:** every W5 row in `units.md` has a file and a proof; the release-lock selftest refuses a planted range change, a choice inserted mid-list and a renumbered program after a release, passes an appended parameter and an appended choice, and passes a range change before any release; `param-id-lock`'s selftest still passes its own cases with the new start; `test:changed` green; `counts --check` exit 0.

## W6. instrument-shell, cpp, shell, the catalog, and the shell text

1. U60 `build-stamp-on-the-panel`, U62 (opens on a button or a modifier chord), U63-U68, U70 (split as sorted), the remaining units of these packs per `SORTED.md`; U69 is obsolete. The extensions E70-E79 as sorted (the shell-only lines obsolete; E6.2 and E51.3 in their reworded halves).
2. N3 `file-into-the-catalog` (skill) and N4 `catalog-entry-exists` (check), used when the user's synth catalog exists (as the reference library is), read from each category's `SCHEMA.md`.
3. The shell text: `every-time-control-syncs` and `clock-law.md` say "the plugin's master clock"; `seams-are-declared` is retired, its append-only division-index line kept in `clock-law.md`.

**Done when:** every W6 row in `units.md` has a file and a proof; N4's selftest refuses a step naming a filter with no catalog entry and passes it once the entry exists (in a scratch catalog); `grep -ril "the shell" packs/` finds no rule or skill text that relies on a synth shell (the evidence lists what it found); `test:changed` green; `counts --check` exit 0.

## W7. The work-order templates

1. T1-T11 as sorted (T1 reworded: the evidence grade in W1, and "create nothing, write the findings" only with no names and no presets; T3 and T9 reworded; T4, T5 taken; T11 dropped); C8's line in `rebuild.md` (photo first, agreeing with `analyse-reference-look`); C12's line (a machine's arp is remade exactly as it is, unless the user says otherwise); `rebuild.md`'s processors line drives the re-toolchain skill of the reverse-engineering pack.

**Done when:** `node bin/claude-packs.mjs workorder` writes a fresh order from each of the 3 templates (generic, plugin, rebuild) and `workorder check` reports 0 refusals on each one's example Done whens, the three runs kept in `build/evidence/W7/templates.log`; `test:changed` exit 0.

## W8. The second full read (the user: "to be ironclad that we didnt miss anything")

1. Fresh readers, who never see `sources/` or `units.md`, read the same documents again, cut into different slices than the first pass: `~/projects/eproms/reverse-engineer.md` cut at its own section headings (never at the first pass's line numbers), `synth-design.md`, eproms' method files and docs, its README, its chips and tools, arcturus's docs and root notes, and the global skills that bear on builds. Each reader checks every method against the kit AS IT NOW STANDS, states the exact lines read, and lists what is missing or only half there. Agents on Sonnet; at most 4 at once.
2. Merge their findings; drop what `DECIDED.md` decided against or marked obsolete; put each remaining find in as a micro unit by W1-W7's rules, or, where it would change how the kit works, under `FOR THE USER` in `progress.md`.

**Done when:** every slice's report states its line ranges and together they cover every line of the first pass's documents (the coverage table in `build/evidence/W8/coverage.md`); every find is in `units.md` as done, as decided against (with the `DECIDED.md` line), or under `FOR THE USER`; the count of finds is in the evidence.

## W9. Before calling it finished

Read the whole branch as a senior engineer would: each new unit against its one thing, every changed existing unit against `DECIDED.md` (nothing changed that was not decided), every hook's cost per call against doctor's budget.

**Done when:** the whole suite (`npm test`, output kept in `build/evidence/W9/suite.log`) is green or each red is explained and logged; `doctor` OK; `counts --check` exit 0; `units.md` has no empty row; `git diff --stat work/2.0.0-typescript...` is in the evidence; every open item is written down with why.

## W10. The report

Write `docs/workorders/audit/report.md`: units added per pack and per form, extension lines per unit, what was dropped and why, what the second read found, what is left for the user, and what the kit did well and badly in this run, with counts from `logs`.

**Done when:** `docs/workorders/audit/report.md` has 6 sections (units per pack and form, extension lines, dropped, second-read finds, left for the user, the kit in this run), each with counts or a stated reason there are none; `git ls-remote origin work/2.0.0-audit` equals the local head (kept in `build/evidence/W10/pushed.txt`); `DONE` is written.

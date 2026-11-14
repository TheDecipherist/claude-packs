# Audit work order: the report

What the kit was missing from `~/projects/eproms`, `~/projects/arcturus` and the user's global skills, put into 2.0 as micro units on `work/2.0.0-audit` (from `work/2.0.0-typescript`), 2026-11-13. Every row is in `units.md`; every choice the run made is in `decisions.md` (d-1 to d-8); every step's evidence is under `build/evidence/W<n>/` (local, d-1) and summarised in `progress.md`.

## 1. Units added, per pack and per form {#units}

New unit files on the branch, counted from git (`git diff --name-status work/2.0.0-typescript...HEAD -- packs`):

| pack | rules | skills | checks | hooks | tools | total |
|---|---|---|---|---|---|---|
| audio-core | 21 | 2 | 0 | 1 | 0 | 24 |
| base | 7 | 1 | 1 | 4 | 1 | 14 |
| cpp | 2 | 0 | 0 | 0 | 0 | 2 |
| instrument-shell | 8 | 0 | 0 | 0 | 0 | 8 |
| midi | 2 | 3 | 0 | 0 | 1 | 6 |
| reverse-engineering | 4 | 30 | 0 | 1 | 2 | 37 |
| shell | 1 | 0 | 0 | 0 | 0 | 1 |
| sound-design | 10 | 11 | 1 | 0 | 1 | 23 |
| synth-creator | 1 | 2 | 0 | 1 | 2 | 6 |
| all | 56 | 49 | 2 | 7 | 7 | 121 |

Three units were retired: `panel-surface-and-sections` and `panel-gestures` (split into their one-thing rules, DECIDED.md C1 and C2) and `seams-are-declared` (the synth shell, C12; its division-index line kept in `clock-law.md`). The release lock (R1) is one hook with its rule and lib; U39 folds into it as the program-number row. Of the new units, 3 hooks are opt-in (`agent-model`, `fault-logged`, `catalog-entry-exists`) and 3 only record and are on by default (`skill-log`, `rule-log`, `agent-ledger`, d-6); `release-lock` is inert until a release is written.

Proof: every new skill went through a routing test (three Sonnet runs, it fires in its scenario and stays silent in a near miss) and a follow test; 49 new skills, all 49 fired 3 of 3, stayed silent 3 of 3 and were followed (`build/evidence/W1,W3,W4,W6,W8/pressure/`). None needed a hook to fire. Every new rule's `paths:` were checked against real files in a scratch install (`rule-paths.md` per step). Every new hook, check and tool has a test with a planted fault seen red.

## 2. Extension lines, per unit {#extensions}

The first pass: 237 extension lines done into 76 existing units (E1 to E80 line by line, as SORTED.md sorted them); the most: gather-sources 15, names-first 11, measure-a-law 9, clock-probe 9, two-sources-before-naming 8, does-it-sync 8, analyse-reference-look 7, bounce-a-plugin 7, pdf-to-md 6, compare-to-the-machine 6. The second read (W8): 243 more lines into 108 units; the most: names-first 10, gather-sources 9, attribute-the-record 8, two-sources-before-naming 7, subagent-dispatch 7, measure-a-filter 6. The per-unit list is `units.md` (the file column of every `extend` row).

Template lines (W7): T1 to T10 into `rebuild.md` and `generic.md` (T1, T3, T9 reworded), the C8 photo-first line, the C12 arp line and the processors line driving `re-toolchain`; 18 template Done whens given a count and a test path.

## 3. Dropped, and why {#dropped}

From the decided list (15 rows): U31 (SORTED 3: U30 catches stale docs), E1.6 (SORTED 3: the check does its one job), E19.5 (C8: photo first stands), E22.3 (SORTED 2: a false refusal is a hook bug), E51.2a (SORTED 2: the re-anchor clause), E68.2 (SORTED 2), T11 (SORTED 2: changes the template's order), D2 (SORTED 4: the shell spec); obsolete under C12 (the synth shell): U69, E51.2c, E62.2b, E70.1, E70.2, E70.4, E72.1. From the second read: 5 decided against (the microphone test, the re-anchor clause twice, ...) and 12 obsolete (sprite painters, the shell's fixed strip, a ported third-party engine, ...), each with its line in `units.md`'s W8 section.

## 4. What the second read found {#second-read}

Fifteen fresh Sonnet readers, never shown `sources/` or `units.md`, read the first pass's documents cut at their own headings (coverage: `build/evidence/W8/coverage.md`). They found 2,151 methods (counted per slice; the synth-re slice's 734 an estimate): 1,652 already covered, 358 PARTLY or MISSING, the rest obsolete. Triage merged the 358 into 334 rows: 243 EXTEND, 30 NEW, 32 covered on a second look, 5 decided against, 12 obsolete, 7 changes for the user, 5 not a method. All 273 adds were written (14 new skills and 12 new rules among them; duplicates written once), one only in part (`re-d#11`, for the user). The most valuable: a three-tier build decision from the evidence, a direction-and-kind check for every stored value, descrambling before diffing, tape and floppy and patch-book readers, a bank-plausibility read for a missing term, and the clock's anchoring order.

## 5. Left for the user {#for-the-user}

Fourteen items, each tagged with who decided what (also in `progress.md` under FOR THE USER):

- W9 review code #6: doctor could run `release-lock --status` (a `v*` tag with no release lock); wiring it into doctor's status hooks would fail such projects, which nothing decided. [deferred: changes doctor; for the user]
- W9 review code #18: skill-log, rule-log and agent-ledger are on by default (d-6); turning them opt-in is the user's call. [deferred: the lead chose on by default, d-6]
- W9 review audio-sound-shell #26: rename `instrument-shell` (the shell is gone) with the old name kept as an alias. [deferred: changes an installed pack name; for the user]
- W8 T1 re-b#11: A reproduction offers a tappable or synced timbre time the hardware offered. Would change: It would add an exception to "Never sync a TIMBRE time", which C9 fixes ("TIMBRE times ... never follow tempo"). It goes to the user. [deferred: changes how the kit works; for the user]
- W8 T2 S39: Offer a synced timbre time, off by default, when firmware shows the hardware synced it (MPX 500). Would change: Would narrow "Keep TIMBRE times off tempo for ever", which DECIDED.md C9 records: "TIMBRE times ... never follow tempo". C9a ("offers sync where its hardware did") reads on rhythm times. To the user: may a firmware-prove [deferred: changes how the kit works; for the user]
- W8 T2 S47: Three-tier build decision before a unit is planned; never ship a stand-in. Would change: The step already grades build, build tagged, or "only when there are no names and no presets, create nothing". "Do not build, never ship a stand-in (a style player without its wave ROM)" would add a refusal to build wher [deferred: changes how the kit works; for the user]
- W8 T4 eproms-readme-chips-tools#14 (hold on polish): Do not polish a scaffold's panel until the engine is the machine. Would change: It would add a refusal on panel work and change the template's step order; goes to the user. [deferred: changes how the kit works; for the user]
- W8 T4 global-build-skills#24: The session is the controller and does a job's work itself only in a few cases. Would change: It would forbid the session from doing job work in every project, a new default no decision records. [deferred: changes how the kit works; for the user]
- W8 T4 global-build-skills#32: A by-hand label leaves slow patch-set tests out of the default run. Would change: It changes which tests the default run holds, a default no decision records. [deferred: changes how the kit works; for the user]
- W8 T4 global-build-skills#33: Opening the real app is fine and is the proof, muted and not in a loop. Would change: `test-quietly` keeps every app and window off the desktop; allowing an agent to open the real app reverses that. [deferred: changes how the kit works; for the user]
- W8 re-d#11 (part): "open at the design width, never filling the display" was not written into window-opens-from-the-display: it would change the opening-size rule. [deferred: changes a rule's requirement; for the user]
- W8 S50: the `crc-grid` tool (a grid search over CRC parameters) is a build task, not a unit; find-the-checksum describes the search without it. [gap: no one decided; a later tool]
- O30 (the Admiral check-signal hook): left out of the kit; the admiral pack ships only its skill. It belongs in the admiral pack if Admiral's own installer does not add it (SORTED.md section 5). [deferred: the user, a different pack's scope]
- `packs/base/rules/unattended-runs.md` has no frontmatter, so the conformance gate (R1) refuses any edit to it; a `# concepts:` or `# hook:` line would change when it loads. E28 went to plan-and-logs instead (d-5). [deferred: the lead, because it changes how the kit loads a rule]

## 6. The kit in this run {#the-kit}

Counts from `node bin/claude-packs.mjs logs` over the run (10,441 hook calls, 2026-11-13 21:54 to 2026-11-14 01:50 UTC):

- Refusals: 72, every one judged, 72 right and 0 wrong (no-polling 18, git-guard 19, no-find 11, template-law 9, once-only 8, governor-route 4, code-shape, file-size-guard and repo-litter 1 each). No hook blocked correct work, so no item is BLOCKED BY KIT.
- Crashes: 30, all "over time" (a hook past its deadline, no verdict, nothing refused): once-only 10, kit-fresh 5, template-law 3, and 1 or 2 each for eight others, while agents and test runs loaded the machine.
- Agents: 76 dispatched, all on Sonnet, at most 4 at a time; the governor held 3 starts until a slot freed. agent-ledger, installed mid-run, logged 67 of them.
- Workflow faults logged and fixed in this run: 4 (KWB-next): the person lint over a work order's sources; two Agent hooks under the wrong matcher (their selftests passed regardless); test-changed never picking the pack-content gate; two orders sharing `build/evidence/W<n>`.

Did well: template-law and once-only made agents take repeated code out into shared libs (param-sources, judge-checkouts, logs-read) instead of copying it. git-guard stopped every checkout over uncommitted work. The conformance gate (pack-content) caught 27 faults in W1's units alone (descriptions over 200 characters, rules without paths, missing Check names, "you" in a skill), and more in every later wave. The governor kept the machine inside its budget. The new usage logs worked on live data (132 rule loads; 0 skill uses, which is true: this session invoked no skill).

Did badly: a hook's selftest runs it without its matcher, so a hook registered under the wrong tool group passes every test. test-changed reached 120 to 1,400 tests per step yet missed the one gate that reads every pack file, so W1's gate went green over those 27. doctor judges hook speed on the live window of the last 100 calls, so a loaded session turns `doctor --strict` red for hours after the load is gone. Agents met R1 on any touched rule, and two of them "fixed" it by changing when a rule loads, which the lead undid (d-5).

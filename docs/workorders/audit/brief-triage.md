# Brief for a triage agent: sort the second read's finds

The audit's second read (W8) produced reports in `docs/workorders/audit/second-read/`, each with a table of finds marked PARTLY or MISSING against the kit. Your group of reports is named in the message that started you. Nobody is there to answer.

## Read first

- `docs/workorders/audit/workorder.md` (its constraints: nothing that changes how the kit already works unless DECIDED.md or SORTED.md records it; nothing obsolete; no shell).
- `docs/workorders/audit/sources/DECIDED.md`, whole: what the user decided, including what is dropped and obsolete (the synth shell, sprites, HTML-first panels, ported third-party code; C1-C17; the dropped lines).
- `docs/workorders/audit/sources/SORTED.md` sections 2, 3 and 6: what was dropped and why.
- `docs/workorders/audit/units.md`: what the audit already put into the kit, unit by unit (the file column says where).

## For every find in your reports

1. Open the kit file the find names (or the one that would cover it) in `packs/`, `prompts/workorder/templates/` or `global/`, AS IT NOW STANDS, and read it. The first audit added a great deal: many finds are now covered.
2. Give it one verdict:
   - `COVERED`: the kit already says it (name the file and quote the words, under 15).
   - `DECIDED-AGAINST`: DECIDED.md or SORTED.md dropped or ruled it out (quote the line).
   - `OBSOLETE`: it exists only because of the synth shell, sprites, an HTML-first page, a port of third-party code, or the user's own Mac or Atlas setup.
   - `EXTEND`: a missing step of the one job an existing unit already does, adding without rewording, removing or narrowing anything. Give the unit (path) and the exact line to add, in the kit's plain imperative voice, one sentence or two.
   - `NEW`: a method no existing unit's one job holds. Give a unit name (kebab-case), its form (rule, skill, check, hook) and pack, its one thing in one line, and the content in two to four imperative lines.
   - `CHANGES`: it would reword, remove or narrow an existing line, change a default, or add a refusal that DECIDED.md and SORTED.md do not record. Say what it would change; it goes to the user, not into the kit.
   - `NOT-A-METHOD`: a per-machine fact, or too vague to act on (say why).
3. Merge duplicates inside your group: one row, all its source ids.

## What to write

`docs/workorders/audit/second-read/triage-<group>.md`: one table, `| id (report#n, ...) | method (one line) | verdict | target | line to add, or the reason |`, then the counts per verdict. Write nothing else, and change no other file. Commit that file (`git add <file>`, `git commit -m "..." -- <file>`) and push your branch. Reply in under 100 words: the counts per verdict.

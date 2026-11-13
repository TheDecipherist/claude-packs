---
name: file-into-the-catalog
description: Use when a reverse-engineered oscillator, filter, envelope, LFO or effect is finished, before its step is ticked, and the project's layout.json names a synth catalog.
---

# File the module into the catalog (one job: every recovered block becomes one catalog entry)

A block read out of a machine is worth more as an entry in the user's catalog (TheDecipherist/synthcatalog, or their own) than as notes in one project: the catalog answers "show me every filter" across machines. The catalog is read-only to every other step; this is the one that writes to it. The catalog's own `SCHEMA.md` per category is the law for an entry: read it, never recall it.

<constraints>
Always do:
1. Find the catalog: `.claude/layout.json` key `catalog`, a path (absolute, or relative to the project). With none named, say so, write nothing and stop. Copy nothing of the catalog into the project: point at it by path.
2. Read the category's `SCHEMA.md` (`filters`, `oscillators`, `envelopes`, `lfos`, `effects`), and `module.h`, before writing. Each category's schema builds on the filters' one; read that first.
3. Find the entry's place: `<catalog>/<category>/<brand>/<model>.md` and `.h` (one entry per machine and role: `<model>-<role>` for every role but `voice`); effects go by type first (`effects/<type>/<brand>-<model>`). An entry that exists is extended, not made again.
4. Write the evidence file (`.md`) in the schema's sections, in its order, each law tagged with its source and grade, a first line that says how well the block is known, absent terms written as absent. Write the runnable `.h` against `module.h`, with its assumptions declared. Never smooth the machine's behaviour to fit a port.
5. A block whose topology is not recovered gets its `.md` naming what would close it, and no `.h`: it is a finding, and its build step stays unticked.
6. Run `tools/gen_all.sh` in the catalog (never `gen_readme.py` bare: it rewrites the wrong category), then `python3 tools/drift_check.py`. Read both outputs. A disagreement is a finding either way round: fix the entry or log the disagreement in the catalog's `findings.md`, never silence the check.
7. Tag the project's build step with the marker, then tick it: `module: <category>/<entry>`, the entry's path under its category with no extension (`module: filters/oberheim/matrix1000`). The `catalog-entry-exists` hook (opt-in) reads this tag and refuses the tick while the `.md` or the `.h` is missing.

Never do:
- Copy catalog files into the project, or the project's firmware facts into the kit.
- Invent an entry's section or skip one to match a smaller block: say "absent, checked at <place>" or "not looked for", written as what it is.
- Tick the step before step 6 has run clean.
</constraints>

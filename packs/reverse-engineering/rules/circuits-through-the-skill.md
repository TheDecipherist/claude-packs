---
# concepts: cpp, js, notes, tooling
# hook: skill-first.mjs
---
# A schematic, a service manual or a data sheet is read through read-a-circuit-diagram, never at a glance

<constraints>
Always do:
- Load the `read-a-circuit-diagram` skill before opening any schematic, service-manual page, parts layout or chip data sheet, as an image or a PDF, or rendering one: the Skill tool, or a Read of its `SKILL.md`.
- Read it as the skill says: tiles at full resolution, one report an image, a netlist for each analog stage, a report for each chip, and a change order.
- Let a first look say only what kind of document it is: its pages, its resolution, its title.
- Name a project's own circuit material in `layout.json` `"guards": { "circuitSkill": { "sources": ["<glob>"] } }` when its names do not say so.
- Brief an agent with the skill's path and "follow it step by step" when the skill is not installed where it works.

Never do:
- Report a figure from a page read at screen size, or before the skill's report holds it; `skill-first` refuses the read.
- Count a path named in a brief as the skill loaded: only the tool call counts.
</constraints>

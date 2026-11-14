---
name: generate-the-machine-docs
description: Use when a synth's reference documents (parameters, modules, routes, diagrams) are to be written, or when one drifted from the engine.
---

# Generate the machine's documents from the engine (one job: one command writes every document)

A hand-kept parameter table disagrees with the engine within a week. Documents read from the source cannot.

<constraints>
Always do:
1. Decide what the documents are first (the whole machine, the effects path, the programs; two when it has no programs), and keep one hand-written sentence per parameter in a notes file the command reads. Then write one command that writes every document, into one folder, from the engine source. Name it at `commands.docs` in `.claude/layout.json`, and keep the output folder in `docsFolder`.
2. Parse the source strictly: a parser raises on any line it does not read, so a new construct stops the run and is never skipped.
3. Keep what only a person knows (the machine's name, the signal-flow story, section order) in a hand-written head file the command prepends.
4. Cross-check the source parse with a lock written from the built plugin (its parameter list, ids, ranges, defaults): the two must agree, and a difference stops the run.
5. State in a document what the code does. Where the code differs from the spec or the hardware, write the difference to `bugs.md`, not into the document.
6. Draw diagrams with two arrow kinds, audio and modulation, a legend saying which is which, and validate every Mermaid block with its parser before it is written.
7. Make the command deterministic (sorted order, no timestamps), then wire `docs-current` (rule `docs-are-current`) so the build fails when a document is stale.

Never do:
- Edit a generated document by hand.
- Let a parser skip a line it does not understand.
- Fill the gap between the code and the spec by writing the spec's value in.
</constraints>

---
# concepts: notes, docs-folder
paths:
  - "bugs.md"
  - "workflow-bugs.md"
  - "**/known-issues*.md"
  - "docs/**/*.md"
  - "docs/**"
---

# Point at documents by anchor, never by line number

One added line in a spec moved 189 references in its seed.

<constraints>
Always do:
- Cite a rule or decision in a document by a fixed anchor (`{#strike-law}`, `{#d-61}`), and code by symbol name.
- Give every rule and decision that anything cites its own anchor, and keep it through every edition.
- Gate it: every reference resolves to an existing anchor, and a new edition that drops a cited anchor is refused.

Never do:
- Write `spec.md:412` or "line 412" into data, checks, docs or build.md.
- Rename or drop an anchor something still cites.
</constraints>

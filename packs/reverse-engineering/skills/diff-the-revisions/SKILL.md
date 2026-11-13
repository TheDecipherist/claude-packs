---
name: diff-the-revisions
description: Use when more than one build, version or revision of one machine's firmware is in hand, before disassembly, or when a version label may be wrong.
---

# Diff the revisions (one job: compare builds structurally to find tables, changes and the true version)

The diff tool lives on the reference library's shelf (`claude-packs toolchain`, the `re-toolchain` skill); this skill says how to use it.

<constraints>
Always do:
1. Diff every revision before disassembly: identical regions are presets and tables.
2. Diff the NEAREST pair, not the most different.
3. Align by instruction or by k-mer anchors, on invariants: a raw byte diff is 7 to 98 percent wrong once code moves.
4. Place a build by diffing. Banners and folder labels lie; the true version is what the code reports.
5. Treat a finding in one revision as a hypothesis for another, and answer each feature per revision.
6. A table byte-identical across versions is a design constant; one that moves is code.

Never do:
- Trust a banner or folder name as the version.
- Run a raw byte diff across builds whose code moved.
</constraints>

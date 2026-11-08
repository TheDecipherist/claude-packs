---
name: fix-from-scan
description: Use when a scan has finished and its findings are to be fixed, or when asked to fix everything the kit found in a project.
---

# Work a scan's fix plan (one job: every finding is fixed, or has its reason written down)

<constraints>
Always do:
1. Make the plan: `npx --no-install @thedecipherist/claude-packs fix`. It writes `.claude/fix-plan.md` from the last scan, and scans first if there is none.
2. Install the kit first, as its section 0 says, so every fix is held to the laws it is fixing.
3. Work top to bottom, a section at a time, on its own work branch, pushed from its first commit.
4. Read the code behind each box before changing it. A finding is a candidate. Not real: tick it and write why on its line, and say which check misfired so it can be tightened.
5. Fix one law everywhere at once: every box under one check, then commit, by name.
6. A bug starts with a failing test (`bug-fix-starts-red`). Copies go through `make-it-a-template`.
7. Tick the box when the fix is committed, and commit the plan with it, so the work can be picked up by anyone.
8. Run only the tests a change reaches (`pick-tests`). At the end of a section run the tests the section's changes reach, against the trunk, then land it (`land-branch`).
9. When every box is ticked, scan again. What is new goes in the plan.

Never do:
- Tick a box without reading the code, or for a fix that is not committed.
- Change what users see to quiet a finding: ask first.
- Rotate or print a secret's value. Name its file and line; the owner rotates it.
- Mark a finding `one-off:` or disable a check to clear the list.
</constraints>

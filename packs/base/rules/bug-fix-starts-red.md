---
# concepts: tests, cpp
paths:
  - "placeholder"
---

# A bug fix starts with a test that fails for that bug

<constraints>
Always do:
- Before touching the code, write the smallest test or probe that reproduces the bug: a render, a parameter sequence, a MIDI file, a state load.
- Run it and see it fail for the reported reason: `node .claude/tools/test-verdict.mjs --red <test-name>` must say `RED_CONFIRMED`.
- Freeze what defines "fixed" before the fix: `node .claude/tools/freeze.mjs on "bug <id>" <test file> <golden files>`.
- Fix the code until the same test passes, then run the full suite once, then `freeze.mjs off`.
- Keep the test in the suite forever. That is what stops the bug coming back.

Never do:
- Fix first and write the test after. A test written against the fix proves nothing.
- Edit the test, the golden render or the fingerprint to make the fix pass. If the target is wrong, stop and ask.
- Call a bug fixed because the symptom went away once by ear.
</constraints>

## Check
- The `frozen-files` hook refuses edits to frozen files.
- `test-verdict.mjs --red` exits 1 if a test that must fail passes.

---
name: add-lesson-check
description: Use right after a bug is fixed, when a mistake repeats, or when the user says to make sure something never happens again.
---

# Add a lesson check (one job: make a fixed bug impossible to reintroduce)

Run this after the fix is in, not before.

<constraints>
Always do:
- Write one file per lesson: `.claude/checks/<id>.json` with `id`, `why`, `rule`, `globs`, `pattern`, `code`, `bad`, `good`.
- `bad` is the smallest snippet showing the bug as it actually appeared. `good` is the fixed form.
- Set `"code": true` for C/C++/JS/TS, so comments and strings are ignored.
- Run `node .claude/hooks/lesson-checks.mjs --selftest` and keep refining the pattern until it reports OK. The check must catch `bad` and pass `good`.
- If the lesson is a *law* (it applies beyond this one pattern), also add or extend the matching `.claude/rules/*.md` file, and point `rule` at it.
- Log the bug and the new check in the project's bugs file.

Never do:
- Write a check that a regex can't express reliably. Say so instead, and propose a unit test or render test as the check.
- Widen a pattern until it flags correct code in the repo. Run the selftest, then grep the repo for false positives.
- Put the lesson only in memory or CLAUDE.md. A lesson without a check is a note, not a fix.
</constraints>

## Output
State the check id, what it blocks, and the selftest result in one or two lines.

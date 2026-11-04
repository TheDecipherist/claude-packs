---
name: ui-code-review
description: Use when asked to review UI code, audit a page's source for accessibility or UX, or before handing a screen to design-review.
---

# Review UI code against the laws (one job: findings by file and line)

Reads the source. For judging the rendered page, use `design-review`.

<constraints>
Always do:
1. Read the named files; ask which ones if none are named.
2. Go through the `ui-craft` rules in order: forms, motion, real data, URL state, touch, dates and numbers, copy, type and space, generated look. Then the `accessibility` rule where it is installed.
3. Report terse findings by file, in `file:line` form, one line each: what is wrong and the fix.
4. Rank them: **P0** blocks someone from using it, **P1** hurts many people, **P2** hurts a few, **P3** polish. A file with nothing to report says so in one line.
5. Treat a `WARN`-level taste finding as wrong unless it can be defended to a designer in one sentence.

Never do:
- Rewrite the code during the review.
- Rank a generated-look finding above an accessibility one.
- Call something a law when it is taste: say which.
</constraints>

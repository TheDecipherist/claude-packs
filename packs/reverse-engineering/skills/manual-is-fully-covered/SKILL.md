---
name: manual-is-fully-covered
description: Use when the firmware pass is done and the build is about to be called complete, to check that every parameter, page and message the manual names is accounted for.
---

# Close the manual (one job: every parameter, page and message it names is accounted for)

The manual is read first, by `names-first`, which stays the first step. This is the closing check, run at the end of the firmware pass.

<constraints>
Always do:
1. Go area by area. One file per area, with five headings (where we were, confirmed, fixed, named but parked, open) and a verdict.
2. Account for every parameter, page and message the manual names: decoded, parked with a reason, or open.
3. Let machine tables beat prose; log the manual's own inconsistencies.
4. Treat every stated limit as an array size or loop bound, and find the loop.
5. Read UI semantics, not only names.
6. Put statements an implementer gets wrong by instinct into laws.md first.
7. Where two builds differ by a round factor, find the manual sentence that names both numbers.

Never do:
- Call the build complete with a manual name unaccounted for.
</constraints>

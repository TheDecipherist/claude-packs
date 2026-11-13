---
name: tripwire-the-law
description: Use when a law, a coefficient or a formula that has a source is about to change.
---

# Tripwire the law (one job: the source and the engine cannot silently part)

<constraints>
Always do:
1. Write the source's sum longhand, as a separate function, with its citation.
2. Assert the engine against it, off the easy point.
3. Change the engine.
4. Re-anchor before re-scaling.
5. Take expected values from the printed source. A worked example is the first test.
6. When several laws are wrong, fix in this order: the biggest error with a bounded `[FW]` fix first, conditional terms next, routing next, `[EAR]` laws, duplicated laws last.

Never do:
- Fit by ear when a term is missing. A 0.35 fudge once hid a whole term.
- Compare a function with itself.
</constraints>

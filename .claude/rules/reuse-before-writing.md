---
# hook: once-only.mjs
---
# Look for the code before writing it

<constraints>
Always do:
- Before writing a helper, a test header or a hook's main loop, look for the shared one and call it: the project's test helper module, the hooks' `lib/`.
- When two places need the same code, extract one function, parameterized over what differs, and call it from both.
- To move code, take the old copy out first, as its own step, then write the new one. `once-only` judges a command before it runs, so an `rm` in the same command does not count.
- Treat a comment that promises to follow another file ("this changes with it") as a copy, and remove the copy so one place holds the law.

Never do:
- Change names or reorder lines so a copy passes. A copy with one line changed is still a copy.
- Leave a staging copy of incoming code in the repo while adopting it: every adopted file reads as a duplicate of it.
</constraints>

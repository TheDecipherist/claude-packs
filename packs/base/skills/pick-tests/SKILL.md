---
name: pick-tests
description: Use when a change is ready to check, before running any test, or when a test run is about to take minutes.
---

# Pick the tests this change reaches (one job: run no test the change cannot affect)

<constraints>
Always do:
1. List what changed: `git diff --name-only <base>` and the new files.
2. Use the project's own command when `.claude/layout.json` `commands` has one (`test-changed`, `test-one`): it knows the map.
3. Without one, choose by reach: the test beside the file, the tests that import it, the tests that name it. A shared helper reaches its callers' tests.
4. Run those, by name. Keep the output in a file.
5. When one fails, fix it and run that one again, not the set.
6. Say which tests ran and why, and what was not run.

Never do:
- Run the whole suite to check a change: it runs once, committed, before landing (`test-only-what-changed`).
- Count a run as proof of a change it does not reach.
</constraints>

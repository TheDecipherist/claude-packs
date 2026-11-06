---
# hook: suite-once.mjs
---
# Tests run for what changed; the whole suite runs once, as the gate before landing

<constraints>
Always do:
- While working, run only the tests the change reaches (the `pick-tests` skill).
- Run every test, by hand or not, through `node .claude/tools/quiet-test.mjs <command>`, so no window, browser or app reaches the user's desktop (the `test-quietly` skill).
- Commit, then run the whole suite once, as the last step before landing. Fix what it finds, and run again only the tests that failed.
- Let a run that has started finish. Read its output before starting another.
- Keep the output of a long run in a file, so one failure never costs a second run.

Never do:
- Run the whole suite on uncommitted work; `suite-once` refuses it.
- Run the suite again when nothing it covers has changed, or to check a change it does not reach.
- Filter a long run's output so that a failure's details are lost.
</constraints>

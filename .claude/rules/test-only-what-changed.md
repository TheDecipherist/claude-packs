---
# hook: suite-once.mjs
---
# Tests run for what changed; the whole suite runs only when the user asks for it

<constraints>
Always do:
- While working, run only the tests the change reaches (the `pick-tests` skill).
- Run every test, by hand or not, through `node .claude/tools/quiet-test.mjs <command>`, so no window, browser or app reaches the user's desktop (the `test-quietly` skill).
- Gate a landing, and a release, with the tests the branch's changes reach, measured against the trunk it lands on (`pick-tests` against the trunk; the project's `test-changed` command with `--base origin/<trunk>`), on committed work. Fix what it finds, and run again only the tests that failed.
- Run the whole suite when the user asks for a full run, because something is truly off, and only then.
- Let a run that has started finish. Read its output before starting another.
- Keep the output of a long run in a file, so one failure never costs a second run.

Never do:
- Run the whole suite to land, to release, or on your own initiative; `suite-once` refuses it unless the user's prompt that turn asks for a full run.
- Run the tests again when nothing they cover has changed, or to check a change they do not reach.
- Filter a long run's output so that a failure's details are lost.
</constraints>

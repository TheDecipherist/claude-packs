---
name: build-through-the-queue
description: Use when about to compile, run ctest, or run a program from a build folder, or when build-guard refused a command.
---

# Build through the queue (one job: no build takes the whole machine)

<constraints>
Always do:
1. Use the project's wrapper first: the `build` and `test` commands in `.claude/layout.json`. Otherwise run `node .claude/tools/buildq.mjs <command>`.
2. The queue runs two at a time and waits for a slot by itself; `--status` shows the slots. Run it in the foreground, or as a background job.
3. As an agent, build only the targets the change needs (`--target X --target Y`) and run only its tests (`-R 'pattern'`, at most 30).
4. An agent started as `KIND: light` does not build or run tests: do the light part, and say in the report what needs building.

5. End a build's command with the build's own status. A background job reports its last command's status: a build followed by `echo` or `tail` reports theirs, and a stale binary reads as a pass. Keep the output in a file and read the build's exit.
6. Read ctest's per-test lines: `***Not Run` is a target that was never built, not a failure of the unit. Build it.
7. Before a build, check no generation job is still alive. A "built" that did not relink means: delete the generated binary-data folder and reconfigure.

Never do:
- Run `cmake --build`, `ctest`, `make`, `ninja`, `xcodebuild`, or a program from a build folder straight from the shell.
- Wrap a build in a wait loop.
- Build every target from an agent: the whole build runs once, before landing.
</constraints>

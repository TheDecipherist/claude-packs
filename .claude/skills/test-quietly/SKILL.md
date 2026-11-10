---
name: test-quietly
description: Use when running any test, gate or check, when a test opens a window, a browser or an app, or when a test run took focus or popped up on the user's screen.
---

# Run tests without touching the user's desktop (one job: nothing a test does reaches their screen)

The user is working on the same machine. A window that opens and closes takes focus for as long as the run lasts, and they lose what they were typing.

<constraints>
Always do:
1. Run every test, gate and check through the script: `node .claude/tools/quiet-test.mjs <command> [args...]`. That holds for a one-off run by hand as much as for the suite, and hand runs are where this goes wrong.
2. Let the script hold the settings: a virtual display on Linux, `CI`, `HEADLESS`, `QUIET_TEST` and `BROWSER=none` everywhere, low priority, and the command's own exit code.
3. On macOS, which has no virtual display, the script sends the user's app back whenever something the run started comes to the front. Make the project's test rig quiet as well: when `QUIET_TEST` is set it stays out of the Dock, opens no window it can avoid and puts any it needs off-screen. In JUCE, `Process::setDockIconVisible (false)`, and never `toFront`.
4. Render to an image off-screen where a test only needs pixels, with no window at all.
5. Run browser tests headless, and pass the tool's own flag as well when it has one.
6. Keep a long run's output in a file, and run it in the background.
7. Keep a test off the user's files as well as their screen (`tests-never-touch-user-files`): the harness's one helper makes a fresh temporary folder, copies in what the test needs, and names it in place of the user's paths (environment variable, setting, constructor argument) before the code under test starts. A test target's environment never names a path under the user's home. The project's check hashes the user's files before and after a run and shows the processor's paths are not theirs; its planted fault, a test left on the user's path, goes red.
8. Fix the test when it still reaches the desktop through the script: a test that interrupts the user is a fault, so log it.

Never do:
- Launch the app the user may have open to try something, or start one on their display, without being asked.
- Run a window test straight on the real display because it is only one quick run.
- Use `open`, `xdg-open` or `start` from a test.
</constraints>

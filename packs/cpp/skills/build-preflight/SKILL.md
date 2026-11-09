---
name: build-preflight
description: Use before a C or C++ project's first build, in a new worktree, when its CMake setup changes, when a build seems slow, or when compile-cache refused a build.
---

# Build preflight: know what a build will do, and make it reuse everything it can

A build's cost is mostly work it did not need to do: files compiled again in every worktree, a framework built into every target, tests run for code the change never touched. Answer these with numbers before the build, and write the answers down (the step's evidence folder).

<constraints>
Always do:
1. **What am I building?** List the targets the change needs and count their compile steps: `ninja -C <dir> -n <targets> | grep -c Building` (a dry run compiles nothing). Count the files the branch changed: `git diff --name-only origin/main`. Write both numbers down. A build that will compile hundreds of files for a change to a few is a missing reuse.
2. **Is the compiler cache wired and hitting?**
   - The build folder's `CMakeCache.txt` names a ccache launcher (`grep COMPILER_LAUNCHER <dir>/CMakeCache.txt`); if not, add the lines `compile-cache` prints and configure again.
   - `CCACHE_BASEDIR` is the source root, so another worktree's same file hashes the same.
   - Prove it: `ccache -z`, build in a second worktree, `ccache -s`. Most compile steps should be hits; a low hit rate means the paths or flags differ between worktrees.
   - `ccache -s` also shows the cache size against its limit: a full cache evicts what the next worktree needs (`ccache -M <size>`).
3. **Is a large dependency built once?**
   - A fetched framework comes from one shared source folder (`-DFETCHCONTENT_SOURCE_DIR_<NAME>=...`), never fetched per worktree.
   - Where the framework allows it, it is its own static library that every target links. For JUCE: one static library target of the modules the project uses, linked by the plugin, the standalone and every gate, not `juce_add_*` sources in each target.
   - Heavy headers it includes everywhere are precompiled (`target_precompile_headers`), where the compiler supports it.
4. **Is the build within the machine's budget?** Ninja, through the project's build queue, never `-j` above what the queue allows.
5. **Will the tests run only what the change reaches?** One test binary that holds every check runs them all for any change: name it as a candidate to split by area. A gate's twin (the planted run) that repeats the clean checks before its plants does the clean run twice.
6. **Write the estimate**: compile steps expected, and the test time the reached tests took last time. After the build, compare: more work or more time than estimated, by far, is something to find out, not to wait out.

Never do:
- Start a project's first build, or a new worktree's, without step 2's answer.
- Call a build slow and move on: count its compile steps against what the change touched.
- Copy a cache, a prebuilt library or a shared source into one worktree, where the others cannot reach it.
</constraints>

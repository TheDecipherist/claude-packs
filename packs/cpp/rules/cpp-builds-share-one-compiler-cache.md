---
# concepts: cpp
paths:
  - "placeholder"
---

# Compile once: every build uses one shared compiler cache and compiles only what its change reaches

A C++ project in worktrees compiled everything again in each one. A one-file fix cost 1,241 to 1,554 compile steps (a framework like JUCE included) in every new worktree, four worktrees at once held 18 cores at load 22, and ccache sat installed and unused. Another project had written the lesson down weeks before, in its own CMakeLists.txt, where no other project could read it.

<constraints>
Always do:
- Compile through ccache from the top-level CMakeLists.txt, right after `project()`, when it is installed: the C, C++ and Objective-C++ launchers, each the one word `ccache`. A launcher list (`cmake -E env CCACHE_BASEDIR=... ccache`) breaks a framework that configures a tool of its own as a nested project and passes the launcher down (JUCE's juceaide). `compile-cache` refuses a build of a folder configured without it and prints the lines.
- Set ccache's `base_dir` once on the machine, in its own config, to the folder that holds the projects (`ccache --set-config base_dir=...`, with `hash_dir = false`): it turns absolute paths into paths relative to the build folder, which every worktree lays out alike, so the same file hits the same entry in every worktree of every project. A `base_dir` naming one project shares only that project's worktrees.
- Size the cache for every project on the machine (`ccache -M 100G`), and look at it when it is full: a full cache throws out what the next worktree needs. Measured, with both set: a fresh worktree's build of 260 files went from 224 s to 18 s, 260 of 260 from the cache.
- Build a large dependency once: one shared source folder for a fetched framework (`FETCHCONTENT_SOURCE_DIR_<NAME>`), never a fetch per worktree, and, where the framework allows it, the framework as its own static library that every target links, never its sources compiled into each target.
- Before a project's first build, and when its build setup changes, run the build preflight (the `build-preflight` skill): what it builds, how many compile steps against what the change touches, and the cache's hit rate on a second worktree. A first build in a fresh worktree that compiles far more than the change touches is a missing reuse, not a slow machine.
- Build only the targets the change needs, and run only the tests it reaches.

Never do:
- Accept a slow build as normal because it was always slow: compare the work done (compile steps) with what the change touches.
- Keep a cache, a prebuilt library or a shared source inside one worktree, where the others cannot reach it.
</constraints>

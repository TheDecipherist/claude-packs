---
# concepts: tooling
paths:
  - "tools/**"
  - ".claude/hooks/**"
  - ".claude/settings.json"
---

# Hooks, gates and tools: each seen red, each fault logged

<constraints>
Always do:
- Give every hook and gate a `--selftest` that plants its fault, and run it from the project's plants script (the `plants` command in `.claude/layout.json`). A new gate goes in there in the same commit. A gate that has never been seen red proves nothing.
- Log a workflow fault (a hook, a tool, the build queue, a test run) in `workflow-bugs.md` before fixing it (the `workflow-bugs` skill), and close it with cause, fix and what now catches it.
- Run Python on files that come from outside with `-I`. Measure files with Python, not with BSD or GNU tool flags.
- Treat a hook that blocks correct work as a red check: stop, report its exact message, and log it. The hook is fixed first, with a selftest that plants the right case and the wrong one; the work resumes after.
- Make a fix to a hook, rule, check or skill that every synth uses in claude-packs, with its test, then take it in with `npx --no-install @thedecipherist/claude-packs update`. Only a law that is about this project alone stays in this project's `.claude/`.

Never do:
- Route around a block: no code put into an unrelated existing file, no file pushed past the line limit, no write through the shell after a refusal, no override variable.
- Change a hook so that its own selftest passes while the fault it exists for gets through.
</constraints>

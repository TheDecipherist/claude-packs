---
# concepts: plan, notes
paths:
  - "build.md"
  - "**/build.md"
  - "bugs.md"
  - "workflow-bugs.md"
  - "**/known-issues*.md"
  - "docs/**/*.md"
---

# The plan and the logs: true, dated, never rewritten

<constraints>
Always do:
- Tick a step in `build.md` only when its "done when" was measured, or seen in the opened app. Every step's start and finish time goes in the log (the project's step tool writes them).
- Strike a step that is dropped through, with the reason and the date. A reopened step keeps its line, marked REOPENED.
- Log a bug in `bugs.md` the moment it is found, before it is fixed. A fixed bug moves to Fixed with its cause, the fix, the date and the gate that now catches it.
- Record in `docs/laws.md` every house law the project leaves, with the user's yes. Put a row in `docs/licences.md` before any file is copied in, with its source, commit and licence.
- Send a question the spec leaves open to the user as a `d-n`, with the spec's recommendation. Never decide it by guessing.
- Write internal docs plainly. The `humanize` skill is for public writing only, not for specs, logs or briefs.

Never do:
- Edit the spec (`docs/*-spec.md`). It is the user's.
- Delete a step, a bug or a log line to make a list look clean.
- Tick from memory of an earlier session. Measure again.
</constraints>

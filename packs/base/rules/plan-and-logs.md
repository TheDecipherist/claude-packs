---
# concepts: plan, notes
paths:
  - "placeholder"
---

# The plan and the logs: true, dated, never rewritten

<constraints>
Always do:
- Tick a step in `build.md` only when its "done when" was measured, or seen in the opened app. Every step's start and finish time goes in the log (the project's step tool writes them).
- Strike a step that is dropped through, with the reason and the date. A reopened step keeps its line, marked REOPENED.
- Log a bug in `bugs.md` the moment it is found, before it is fixed. A fixed bug moves to Fixed with its cause, the fix, the date and the gate that now catches it.
- Record in `docs/laws.md` every house law the project leaves, with the user's yes. Put a row in `docs/licences.md` before any file is copied in, with its source, commit and licence. Read what that row will say before choosing the source: a small fix taken from an installed package brings its licence with it, and only its copyright file says so.
- Put date, time and zone on every log entry.
- State a count once, and link to it from everywhere else.
- Re-check a blocker that has stood a while before relying on it: it may be stale.
- Log it when several units fit different constants to one shared law, and fix the law once, with every unit's measurements.
- Send a question the spec leaves open to the user as a `d-n`, with the spec's recommendation. Never decide it by guessing.
- Write internal docs plainly. The `humanize` skill is for public writing only, not for specs, logs or briefs.
- When a milestone closes, grep every handoff file (CLAUDE.md, PROMPT.md, README) for the old state line and fix each: a hand-kept status line goes stale.

Never do:
- Edit the spec (`docs/*-spec.md`). It is the user's.
- Delete a step, a bug or a log line to make a list look clean.
- Tick from memory of an earlier session. Measure again.
</constraints>

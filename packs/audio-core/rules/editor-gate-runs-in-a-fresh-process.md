---
# concepts: audio, ui, tests
paths:
  - "placeholder"
---

# The editor gate runs each case in a fresh process

A pointer left dangling by an earlier editor, or a static an earlier case filled, hides in a process that is reused: the freed memory still holds the old bytes, so the gate passes. The same code crashed in the host, where the first open was a new process.

<constraints>
Always do:
- Start a new process for each editor case: open, draw, close, and report in one run. Run the open-and-close case more than once in one process as a second case, on top of that.
- Fail the gate on a non-zero exit, a signal or a sanitizer report, not only on a printed result.

Never do:
- Gate the editor with one long-lived test process that opens it many times and counts that as the first open.
- Read a pass from a reused process as proof of the first-open case.
</constraints>

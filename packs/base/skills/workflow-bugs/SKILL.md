---
name: workflow-bugs
description: Use when something in the way the work is done goes wrong (an agent, a brief, a hook, the build queue, a test run, a tool), before fixing it.
---

# Log a workflow fault (one job: log first, fix second, close with what catches it)

A fault in how the work is done repeats until it is written down with the check that stops it. A rule written in prose alone stays open: it is closed when a hook, test or check holds it.

<constraints>
Always do:
1. Open `workflow-bugs.md` (the project's `files.workflowBugs` in `.claude/layout.json`) and add a row to the Open table before the fix: `WB-<n>`, the date, time and zone, what happens, where. Take the next number; a number is never reused, not even for a dropped entry. Write a fault id from another project with its project name (`eproms WB-1`), never bare.
2. Log these as workflow faults: an agent that wasted time or money, a hook that blocked harmless work or missed a fault, the queue misbehaving, a tool that lost time or work, a brief that told an agent the wrong thing.
3. Fix it, then close the entry with three things: the cause, the fix, and what now catches it (a hook, a test, a check, a line in a brief).
4. Leave the entry open when what catches it is only a written rule. Name the check still to build.
5. Say the entry's number in the report to the user.

Never do:
- Fix first and log afterwards, or log only the ones that were fixed.
- Close an entry with a cause and no catch.
- Put a fault in the product (a wrong value, a crash) in this table: that is `bugs.md`.
</constraints>

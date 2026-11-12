# KWB-199: does a foreground agent started in a later message run beside ones still running?

Measured 2026-11-12 in a child `claude -p` (Claude Code 2.1.322, haiku), prompt `probe-prompt.md`, transcript
`probe-transcript.jsonl`, marks in `marks/` (epoch seconds written by each agent's own Bash).

| Phase | What | Marks (s after the child started at 1794508512.9) |
|---|---|---|
| 1 | a and b, foreground, one message | a 5.2 to 45.2, b 6.9 to 47.0: side by side |
| 2 | c background, then d foreground in the next message | c 52.2 to 142.2 (its whole 90 s), d 52.8 to 72.9: side by side |
| 3 | the lead after d, then e foreground (80 s) | lead 76.3; e 79.2 to 159.2; lead after e 164.4 |
| end | the child's turn ended | 165.4 |

- A foreground agent started in a later message runs beside a background agent still running (phase 2).
- A background agent lives as long as the lead's turn stays open: c finished all 90 s while the turn was open.
- Its completion reaches the lead only at a tool-call boundary: c ended at 142.2, during e; the lead saw nothing while e ran
  and got c's task notification right after e returned (`marks/notes.txt`).
- In the `claude -p` that started it, the turn ended at 165.4, after every agent had ended; KWB-124 (an agent still running
  when the turn ends is stopped) is not contradicted.

Consequence for the rule: a lead may refill a slot as each agent returns, if its agents run in the background and it keeps
the turn open with short calls of its own work (merging, reading, its own items), never a foreground agent that hides the
notifications, and never ends its turn while one of its background agents is still running. Without work of its own left, it
waits on the rest in the foreground.

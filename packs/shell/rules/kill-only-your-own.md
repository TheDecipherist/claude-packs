---
# concepts: shell
paths:
  - "placeholder"
---

# A script stops only the processes it started

`pkill -f "Google Chrome for Testing"` in one export script killed the renderer of every other session on the machine. A shared machine has other work on it.

<constraints>
Always do:
- Record the process id of what the script starts (`child & pid=$!`) and stop that id, with its children (`pkill -P "$pid"`).
- Start a headless tool with its own profile or its own port, so what belongs to it can be told apart.

Never do:
- `pkill`, `killall` or `kill $(pgrep ...)` by program name or by a pattern of the command line.
- Stop a process the script cannot show it started.
</constraints>

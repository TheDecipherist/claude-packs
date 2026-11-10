---
# concepts: shell
paths:
  - "placeholder"
---

# Anything repeated in shell becomes a template: a function in one sourced file, or a table and a loop

Measured on real repos: the same wait-and-check block in five gate scripts, the same retry and logging at the top of every hook, and one command written out dozens of times with other arguments.

<constraints>
Always do:
- Put what scripts share in one file they source: logging, waiting, cleanup, argument checks. `. "$(dirname "$0")/lib.sh"`.
- Turn one command repeated with other arguments into an array of rows and one loop, or a function called from a table.
- Start a new script from the shared file: it holds only what this script does.

Never do:
- Copy a script to start the next one.
- Paste the same `if` or `trap` block at the top of each script.
</constraints>

## Check
`template-law` refuses a new copy, a near copy or a function the repo already has. The `shell-extract-template` skill walks the change.

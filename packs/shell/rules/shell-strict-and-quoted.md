---
# concepts: shell
paths:
  - "placeholder"
---

# Shell fails loudly and quotes everything

<constraints>
Always do:
- Start a script with `set -euo pipefail`. A file that is only sourced leaves that to its caller.
- Quote every expansion: `"$file"`, `"${list[@]}"`.
- Use `$(...)`, never backticks.
- Guard a variable in a delete: `rm -rf "${dir:?}/build"`.
- Make a temp file with `mktemp`, and remove it with `trap`.
- Stop what you start: after `child &`, `trap 'kill "$pid" 2>/dev/null' EXIT INT TERM`.
- Keep a program in its own file: a script that needs Python or Node calls a file, which can be linted and tested.
- Run `shellcheck` where the project has it.

Never do:
- Use `eval`, or pipe a download into a shell.
- Parse `ls`: use a glob.
- Write to a fixed path in `/tmp`.
</constraints>

## Check
`sh-strict-mode`, `sh-no-backticks`, `sh-no-eval`, `sh-no-parse-ls`, `sh-rm-guarded`, `sh-quote-arguments`, `sh-no-pipe-to-shell`, `sh-mktemp`, `sh-no-program-in-heredoc`.

---
# concepts: hook-files, hook-config
paths:
  - "**/.claude/hooks/**"
  - "**/hooks/**/*.sh"
  - "**/hooks/**/*.mjs"
  - "**/hooks/**/*.js"
  - "**/hooks/**/*.cjs"
  - "**/hooks/**/*.py"
  - "**/.claude/settings.json"
  - "**/.claude/settings.local.json"
---

# A refusal is exit 2: everything else lets the call through

A guard that fails fails silently: the call goes ahead, and nothing says the guard did not judge it.

<constraints>
Always do:
- Refuse with exit 2, the reason on stderr. Exit 2 is the only code that blocks: exit 1 is a non-blocking error, and a hook killed at its timeout does not block either.
- Decide what a guard does when it cannot judge: say so, in the code. Under `run-hooks` a crash on a tool call refuses that call once and says so; the same call again goes through, logged. A hook run on its own has no such net.
- Keep a guard fast and small enough to finish inside its timeout.
- Prove a new hook with the `prove-a-hook` skill: its bad case seen refused, through the real settings entry.

Never do:
- `exit 1` to refuse (`hook-exit-1-does-not-block`). Mark a real non-refusal with a `not a refusal` comment on its line.
- A catch that allows (`hook-catch-must-not-allow`): a crashed guard reads as a passed call. An event that cannot be parsed is the one exception.
- `|| true`, `|| exit 0` or `|| :` on a guard's work (`hook-no-or-true`).
- Pipe a guard's command in `settings.json` (`hook-command-no-pipe`): the exit code is the pipe's last command's.
- `echo` a refusal to stdout (`hook-refusal-on-stderr`): on exit 2 only stderr reaches Claude.
- Leave a hook file that no settings entry runs: it refuses nothing. `doctor` is red for it.
</constraints>

## Check
`doctor` is red for a hook that crashed since it or a file in `hooks/lib/` last changed (`.claude/hooks.log`), until `logs clear <hook> fixed|superseded "<why>"`, and for one no settings entry runs. It cannot see a hook killed at its timeout: that leaves no line.

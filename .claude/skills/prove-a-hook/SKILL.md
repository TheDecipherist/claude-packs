---
name: prove-a-hook
description: Use when a hook is new or changed, when a hook seems not to fire, or when something a hook should refuse got through.
---

# Prove a hook refuses (one job: its bad case seen at exit 2)

<constraints>
Always do:
1. Check it runs: the hook is in `.claude/settings.json`, on the right event and matcher. `doctor` says so.
2. Write the plant: the smallest payload it must refuse, and the nearest one it must allow, as the `selftest` the hook passes to `runAsHook` (a hook is `hook(event, ctx)` in `.mts`, built to the `.mjs` the project runs). Build the throwaway project and run the hook with `scratchProject`, `runHook` and `verdicts` from `lib/selftest` where the kit's helpers are installed. A guard must not refuse the commands that verify its own rule: plant each read-only form of the guarded command (it must pass) and the guarded value inside quotes (it must refuse), and match the one call, not the whole command line.
3. Run it as Claude Code runs it: the payload on stdin, `CLAUDE_PROJECT_DIR` set, through the same command as the settings entry, or `node .claude/hooks/<hook>.mjs --selftest`.
4. Read the exit code, not the output: 2 for the plant, 0 for the good case. Exit 1 means it crashed or refused wrongly, and the call went through.
5. See it red: break the hook on purpose, in a scratch copy, and watch the selftest fail. A gate never seen red proves nothing.
6. When something got through, look in `.claude/hooks.log` for that call first: no line means the hook never ran or was killed at its timeout; code 1 means it crashed; code 0 means it judged and allowed, so the fault is in its logic.
7. Turn what got through into a selftest case before fixing it.
8. In the kit itself, a new hook also gets its worktree case (it judges a worktree file by the worktree) and its test named in its pack's `tests`; `test/integration/worktrees.test.mts` fails without the case.

Never do:
- Probe a hook by pasting a payload into a shell command: a guard that reads command text can refuse the probe itself.
- Fix a hook so its selftest passes while the fault gets through.
</constraints>

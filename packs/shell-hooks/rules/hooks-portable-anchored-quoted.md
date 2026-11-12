---
# concepts: shell-hooks, hook-settings
paths:
  - "placeholder"
---

# A hook is portable, anchored, quoted, and fails open on its own bugs only

A PreToolUse hook that errors blocks **every** tool call. `date +%s%3N` prints the literal `3N` on macOS and the arithmetic that follows exits non-zero: one GNU-ism blocks the whole session on a Mac.

<constraints>
Always do:
- Time, hashes and JSON in a hook come from `node -e` (or the `.mjs` hook itself), never GNU-only binaries: no `date +%N`, `sha1sum`, `stat -c`, `readlink -f`, `sed -i` without a suffix (`gnu-only-in-shell`). Prefer `.mjs` hooks over `.sh` for anything beyond ten lines.
- JSON is produced by `node -e`/`jq`, never by `printf '{"a":"%s"}'` (`hook-json-by-tool`): an unescaped quote or backslash corrupts the line and the consumer drops it silently.
- Hook commands in `settings.json` are anchored: `node "$CLAUDE_PROJECT_DIR/.claude/hooks/x.mjs"`. A relative `bash packages/x/hooks/y.sh` resolves only from one cwd (`hook-command-anchored`).
- Shared logic (read stdin, find the marker, freshness test) lives in **one** `lib/` file that every hook imports or sources; a change to the marker format is one edit.
- Anything a hook spools to disk is written with mode 0600 and masked **before** it hits disk; the terminal prompt may contain a pasted token.
- Credentials come from one documented env var; a hook never searches `~/.claude.json`, a repo `.env` and the environment in turn.
- `--selftest` in every hook; the project test suite runs each hook's selftest and fires every hook at a sibling project path, which must never block (`never block other projects`).
- A hook that fails open says so in one comment at the top, and names what is unenforced during an outage.

Never do:
- `bash -c "${command}"` with a string the project (the executor) can edit; gates run from a hash-pinned config or argv arrays.
- Parse JSON with `grep -o '"key":"value"'` that depends on `JSON.stringify` key order; use `node -e` with `JSON.parse`.
- Rewrite `settings.local.json` on server boot; installers are explicit commands with a dry run.
</constraints>

## Check
Lesson checks for this rule: `gnu-only-in-shell`, `hook-command-anchored`, `hook-json-by-tool`, `no-bash-c-with-variable`.

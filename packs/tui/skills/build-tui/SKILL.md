---
name: build-tui
description: Use when building or changing an interactive terminal UI (Ink + React, or raw-mode Node with @clack/prompts), or when a TUI shows ghost or repeated content, a blank screen after resize, a divider stuck at the old width, or a terminal left in a broken state after exit.
---

# build-tui

One thing: scaffold or repair a TUI's entry point and root so the `tui-resize-and-screen` rule holds, then prove it with a resize.

<constraints>
Always do:
1. Entry point, in this order: TTY and size gate (fallback to plain output when `!isTTY` or under 60×12) → enter alternate screen and hide the cursor → `process.once('exit', restore)` → `process.stdout.on('resize', clear)` → `render()` (Ink) or the raw-mode loop → on exit: `off` every listener, restore raw mode, show cursor, leave the alternate screen. One idempotent `exit()` used by the normal path and SIGINT.
2. Root component (Ink): `termWidth` as state from `process.stdout.columns`, updated by a resize handler that only sets state; every width-dependent string derives from it.
3. Raw mode (no framework): `setRawMode(true)` after saving `stdin.isRaw`; a single `data` handler mapping keys through a lookup table (`{ q: quit, j: down, k: up, … }`), never an if-chain; `render(state)` is the only function that writes to stdout.
4. Prove it: run the TUI in a pty (`node-pty` or `script -q`), send a resize (`SIGWINCH` after changing `columns`/`rows`), and assert the frame has no repeated banner, no stale divider width, and that after quit the terminal is out of the alternate screen (`\x1B[?1049l` was written).
5. Check versions with `latest-versions` (`ink`, `react`, `@clack/prompts`) before adding them.

Never do:
- Fix a resize bug by adding another clear somewhere; find which of the three handlers is out of order.
- Ship without the `process.once('exit', …)` restore.
</constraints>

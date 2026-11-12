---
# concepts: tui, tui-entry
paths:
  - "placeholder"
---

# A TUI owns the alternate screen, clears before the framework draws, and treats size as state

Every resize bug is one root cause: the renderer diffs its previous output and repositions the cursor, it does not clear and redraw. On resize, content it no longer owns stays visible, the cursor lands somewhere unknown, and a taller terminal re-reveals old scrollback lines.

<constraints>
Always do:
- **Alternate screen from the entry point**: `process.stdout.write('\x1B[?1049h\x1B[?25l')` before the first render; restore with `'\x1B[?25h\x1B[?1049l'` in a `process.once('exit', …)` handler registered **before** rendering, so the terminal comes back even on a crash (`tui-entry-restores-terminal`).
- **Clear handler registered in the entry point before `render()`**: `process.stdout.on('resize', () => process.stdout.write('\x1B[2J\x1B[H'))`. Node fires resize listeners in registration order; Ink registers its own inside `render()`, so a clear registered in a `useEffect` runs after Ink has drawn and blanks the screen until the next keypress.
- **Width is state**: `const [cols, setCols] = useState(process.stdout.columns ?? 80)` in the root component, updated by a resize handler that does nothing else. A divider computed once from `process.stdout.columns` keeps its old width until the next keypress (`tui-width-is-state`).
- Correct resize order, one job each: 1 entry-point clear, 2 the framework's layout, 3 the state update that re-renders width-dependent lines.
- Raw-mode TUIs (no framework): gate on `process.stdin.isTTY && process.stdout.isTTY` and a minimum size, fall back to plain output otherwise; `setRawMode(true)` is paired with a restore of the previous raw state; one idempotent `exit()` (an `exited` flag) that removes the resize and data listeners, restores raw mode, shows the cursor and leaves the alternate screen; SIGINT routes through the same `exit()`.
- Remove every `resize`/`data` listener on exit (`process.stdout.off`, `process.stdin.off`).

Never do:
- `\x1Bc` (RIS, reset to initial state): it resets colours, font and cursor settings and differs per emulator (`tui-no-ris-reset`). `\x1B[2J\x1B[H` only.
- Escape codes written from a component's render path; they fight the framework's output buffer. Effects and the entry point only.
- Resize logic split across several handlers that each clear, draw or set state.
- A TUI on a non-TTY stdout (CI, a pipe): the escape codes become garbage in the log.
</constraints>

## Check
Lesson checks for this rule: `tui-entry-restores-terminal`, `tui-gates-on-tty`, `tui-no-ris-reset`, `tui-resize-listener-removed`, `tui-width-is-state`.

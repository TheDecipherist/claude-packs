---
# concepts: ts
paths:
  - "**/*.ts"
  - "**/*.mts"
  - "**/*.cts"
  - "**/*.tsx"
---

# TypeScript source stays plain: static imports, short lines, no embedded binaries, one sleep

A long line hides awaits inside ternaries inside object literals; a base64 blob is a binary asset pretending to be source; a built-in imported inside a handler is resolved again on every call.

<constraints>
Always do:
- Import a Node built-in statically at the top of the file.
- Keep a `.ts` source line under 200 characters. Move a long description to a table in its own file (`descriptions.ts`).
- Serve an asset as a file, and read it where it is used.
- Wait with `setTimeout` from `node:timers/promises`, which also cancels through a signal.

Never do:
- `await import('node:…')` of a built-in in a handler or a hot path.
- Write a base64 blob into source.
- Hand-roll a `sleep()` helper in a file.
</constraints>

## Check
`line-under-200-chars`, `no-dynamic-import-node-builtin`, `no-inline-binary` and `no-local-sleep` each refuse an edit that adds the line they name.

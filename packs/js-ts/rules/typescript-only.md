---
# concepts: js
paths:
  - "placeholder"
---

# A TypeScript project gets no new .js, .mjs or .cjs source file

A project that holds `typescript` and the language server is read through types; a new JavaScript source file is a hole in that reading.

<constraints>
Always do:
- Write new source as `.ts`, `.mts` or `.cts`, and run it through the project's TypeScript tool.
- Keep a file a tool requires in JavaScript (`eslint.config.js`, `vite.config.mjs`, `.eslintrc.cjs`, `postcss.config.cjs`) as that tool names it.

Never do:
- Add a new `.js`, `.mjs` or `.cjs` source file to the project.
</constraints>

## Check
`typescript-only` refuses a new `.js`, `.mjs` or `.cjs` file. It leaves out `*.config.js|mjs|cjs`, `.*rc.js|mjs|cjs`, `public/`, `vendor/`, `.yarn/`, `.pnp.cjs`, `.d.*` files and the usual tests and builds. It is off in a project that has not named it: `init` for a node, full-stack or js-ts project switches it on, and an existing project names `checks/typescript-only.json` in `.claude/layout.json` `enable`.

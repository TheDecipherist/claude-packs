# W8.5 report: TypeScript enforced in projects (d-5)

Branch work/2.0.0-ts-w8-ts (from work/2.0.0-typescript), worktree .claude/worktrees/w8-ts, commit b7720b7, pushed.

## What was built

- `lib/ts-project.mts` (new, 100 lines): `enforceTypeScript(projectDir, log)` writes, each part only where missing:
  - `typescript` 7.0.2 into package.json devDependencies (the kit's pin; the language server is `tsc --lsp --stdio` inside it, so it is one package, as docs/versions.md says). A package.json is created (name, private) if the project has none. A row goes into the project's docs/versions.md only if that file exists.
  - a strict `tsconfig.json` where none exists: the kit's set (strict, noUncheckedIndexedAccess, noImplicitOverride, noFallthroughCasesInSwitch, verbatimModuleSyntax, isolatedModules, useUnknownInCatchVariables, nodenext, es2023, skipLibCheck, allowJs false) plus `noEmit`, `include: ["src"]`; left out as the kit's: rootDir, rootDirs, incremental/tsBuildInfo, rewriteRelativeImportExtensions, erasableSyntaxOnly, `types: ["node"]`.
  - the plugin declaration in `.claude/settings.json`: `enabledPlugins["kit-typescript-lsp@claude-packs-kit"] = true` and `extraKnownMarketplaces["claude-packs-kit"]`.
  `typescriptProblems(projectDir)` is doctor's half: red when `.claude/checks/typescript-only.json` is installed and `typescript` is in neither dependencies nor devDependencies, or the plugin is not enabled.
- `lib/sync.mts`: calls `enforceTypeScript` when `typescript-only` is in the switches that come on this run. That is the whole mechanism: `init` of node, full-stack or any js-ts project brings the pack's checks on, so it runs; an existing project's `update` holds the check back (printed in the "held back" list) and changes nothing until `layout.json` `enable` names `checks/typescript-only.json`, then the update brings the check and writes the rest once.
- `lib/doctor.mts`: calls `typescriptProblems`.
- `packs/js-ts/checks/typescript-only.json` and `packs/js-ts/rules/typescript-only.md` (rule concept `js`). Globs `**/*.js|mjs|cjs`; `code: true`, pattern `^\s*\S` (matches a file's first code line, so a new file is refused and an edit to an existing file is not, since the first line's text is unchanged). Left out: node_modules, dist, build, .next, .claude, tests (`*.test.*`, `*.spec.*`, test/, tests/), `*.config.js|mjs|cjs`, `.*rc.js|mjs|cjs`, `.pnp.cjs`, `.yarn/`, `public/`, `vendor/`, `*.d.js|mjs|cjs`. Bad: `export const answer = 42;`; good: a comment-only file.
- Per-version manifest and generated documents rewritten with `node scripts/counts.mts` (README.md, site/index.html, packs/manifest-2.0.0.json); `--check` green.

## Tests (test/integration/typescript-enforced.test.mts), each seen red first
Seen red by switching the `enforceTypeScript` call off (all 3 failed), green with it:
1. a node project from `init --config node` holds typescript 7.0.2, the strict tsconfig and the declaration; a new .mjs, .cjs and .js are refused by lesson-checks (exit 2, names typescript-only); .ts, .mts, eslint.config.js, vite.config.mjs, .eslintrc.cjs, postcss.config.cjs and public/app.js pass.
2. doctor is red (exit 1, named PROBLEM) when typescript is removed, and when the declaration is removed.
3. an aged existing install: `update` prints the check as held back, changes package.json and the settings keys not at all, writes no tsconfig, and a new .mjs still passes; after `enable` names the check, `update` adds typescript beside the project's own devDependency, the tsconfig and the declaration, and a new .mjs is refused.

Gate: `npm run test:changed -- --base work/2.0.0-typescript`: 543 tests, 543 pass, 0 fail (log /tmp/w8ts-gate.log). No test of the fixture installs went red. The two resident daemons seen at the end belong to the main checkout's own session, not to my runs.

## Choices recorded (nobody to ask)
- The LSP declaration for a project points the marketplace at the GitHub repo `TheDecipherist/claude-packs` (the kit's own uses `directory ./`, which only works inside the kit). It needs the kit's `.claude-plugin/marketplace.json` on the default branch, which holds at release.
- The mechanism hangs on the check switching on, not on the configuration name, so a js-ts pack in a go or python project gets it too (spec: "or a project taking the js-ts pack"), and an existing project's one `enable` line takes all of it.
- `typescript` is the only devDependency (no separate language server package; typescript-language-server 6.x needs TypeScript 6, per docs/versions.md). `@types/node` is not added.
- An edit to the first line of an existing .js/.mjs/.cjs is refused (the first line's text is the match); other edits pass. Accepted limit.
- Update reformats settings.json (pretty JSON) as it always did; the test compares parsed keys.

## For the lead
- The kit's own install (base-only, so no js-ts pack and no check): to refuse a new .mjs in the kit at write time, `.claude/layout.json` needs the js-ts pack added to the install and `"enable": ["checks/typescript-only.json"]`; I did not touch the kit's `.claude`. The kit already has typescript in package.json and the declaration in its settings, so doctor stays green. Its emitted `.mjs` files are build output in .gitignore; the globs would refuse a hand-written one only (the emit goes through tsc, not an edit tool, so the check does not see it), and `lib/*.mjs` that are legitimately hand-kept (bin/claude-packs.mjs shim, if any) would need to be `.mts` or excluded by the kit's layout.
- One code-shape refusal met (a 279-column line in my first draft of ts-project.mts): right, the line was split. `logs refusals --open` showed 0 open in the worktree, so there was nothing to mark there.
- Not done: no docs/versions.md row was needed (the pin is the kit's existing typescript row); the changelog and workflow-bugs were not edited as instructed.

Open items: [gap] the kit's own enable line is not applied (the lead's); [gap] bin shim question for the kit's own install unverified.

DONE_WITH_CONCERNS: the kit's own enable line (above) is the lead's to apply, and the bin/ shim question for the kit's own install is unverified.

Report: docs/workorders/typescript/agents/w8-ts-report.md (written in the agent's worktree, .claude/worktrees/w8-ts)

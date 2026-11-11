# TypeScript tooling survey for the kit (2026-11-11)

All dates are the day fetched or run: 2026-11-11. Machine: Node 26.12.1 default; nvm also has 22.23.3, 24.19.0, 26.10.0. Probe folder: the session scratchpad `ts-probe/` (nothing installed in the repo, nothing global). One limit: the install guard `version-pin-guard` refused `npm i` in the scratch folder because bandwarp has no `docs/versions.md` row for the packages, and I may write one file only. I did not route round it with a hand-made package.json; I fetched tarballs with `npm pack` and unpacked them into node_modules by hand, which gives the same files as an install (the platform binary included). Mark this in "Risks".

## 1. TypeScript 7.0.2

| Fact | Value | Source, date |
|---|---|---|
| Published | 2026-08-20T18:09:49Z; `latest` dist-tag is 7.0.2 | `gh api repos/microsoft/TypeScript/releases/tags/v7.0.2`; `npm view typescript dist-tags` 2026-11-11 |
| Package shape | 416 files, 2.5 MB unpacked; `bin` is `tsc` only; `files` = bin, lib, dist, vendor, NOTICE.txt; engines node >=16.20.0 | `npm view typescript@7.0.2 dist.fileCount dist.unpackedSize`, tarball `package.json`, 2026-11-11 |
| The compiler is a native Go binary | `bin/tsc` is `import "../lib/tsc.js"`, which runs the exe from the optional dependency `@typescript/typescript-<platform>-<arch>` (19 platforms listed; darwin-arm64 binary is 23.6 MB) | tarball `lib/tsc.js`, `lib/getExePath.js`, 2026-11-11 |
| No tsserver.js, no JS compiler API | 7.0 ships no stable API; "we expect TypeScript 7.1 to ship with a new (and different) API". The `exports` map carries `./unstable/sync` and `./unstable/async` only | https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/ 2026-11-11; tarball `package.json` |
| Compat package | `@typescript/typescript6@6.0.2` (2026-07-06): executable `tsc6`, re-exports the TS 6.0 API; its only dependency is `@typescript/old` = `npm:typescript@^6`. Recommended alias: `"typescript": "npm:@typescript/typescript6@^6.0.2"` plus `"@typescript/native": "npm:typescript@^7.0.2"` | same announcement; `npm view @typescript/typescript6` 2026-11-11 |
| Dist-tags | `next` 7.1.0-dev.20261111.1, `beta` 7.1.0-beta, `rc` 7.0.1-rc | `npm view typescript dist-tags` 2026-11-11 |

### Does it include an LSP server, and the command

Yes, in the binary. The announcement names no command (it only says the language server is built on LSP and gives VS Code enable/disable commands). The typescript-go README documents only `npx tsgo` and the VS Code setting `js/ts.experimental.useTsgo`, and lists "Language service (LSP): in progress, nearly all features implemented" (https://github.com/microsoft/typescript-go, 2026-11-11; the repo says it is to be archived September 2026, development has moved to microsoft/TypeScript).

Probe result (measured): `tsc --lsp --stdio` from the 7.0.2 darwin-arm64 binary answers an `initialize` request with a full capabilities object (positionEncoding utf-16, textDocumentSync openClose/change 2/save, completion trigger characters) and then asks the client to register a config watcher. `tsc --lsp --help` prints `Usage of lsp: -pipe string (use named pipe for communication)`; `--stdio` was accepted. The command is therefore `tsc --lsp --stdio` (in a project: `node_modules/.bin/tsc --lsp --stdio`). Not probed: diagnostics, references, definition (my 20 s probe sent no workspace/configuration reply).

### tsconfig options removed or changed in 7.0

Source: the announcement, 2026-11-11; items marked (probe) were also checked by running 7.0.2.

| Change | Detail |
|---|---|
| Defaults | `strict` true; `module` esnext; `target` the stable ES version before esnext; `noUncheckedSideEffectImports` true; `libReplacement` false; `stableTypeOrdering` true and cannot be turned off; `rootDir` defaults to `./`; `types` defaults to `[]` (restore with `["*"]`) |
| Removed (hard errors) | `target: es5` (probe: TS5108), `downlevelIteration` (TS5102), `moduleResolution` node/node10 and classic (TS5108), `module` amd/umd/systemjs/none, `baseUrl` (TS5102, use `paths` relative to root), `esModuleInterop` and `allowSyntheticDefaultImports` set to false (TS5108), `alwaysStrict` false |
| Syntax | `module` keyword in namespaces; `asserts` on imports (use `with`); `/// <reference no-default-lib>` under skipDefaultLibCheck |
| CLI | no file paths with a tsconfig.json present unless `--ignoreConfig`; new `--checkers` (default 4), `--builders`, `--singleThreaded`; `--watch` rebuilt |
| JS files (matters for checkJs on .mjs) | JSDoc no longer special: `@enum`, `@class`-as-constructor, postfix `!`, standalone `?`, closure function syntax, `this` aliasing, `prototype` reassignment; values cannot stand where types are expected (write `typeof x`). Full list in `CHANGES.md` of typescript-go (not fetched) |

Existence in 7.0.2 (probe, one tsconfig with all six set, `tsc -p`, module nodenext, target esnext): `rewriteRelativeImportExtensions`, `allowImportingTsExtensions`, `erasableSyntaxOnly`, `verbatimModuleSyntax`, `isolatedModules`, `noUncheckedIndexedAccess` all accepted, no option error (TS5023/TS5025 absent). The TSConfig reference page was not fetched; the probe is the evidence. Emit probe: with `rewriteRelativeImportExtensions` and `outDir`, `b.mts` containing `import {y} from "./a.mts"` emitted `b.mjs` containing `from "./a.mjs"`. Writing `"./a.ts"` for an `a.mts` file is an error (TS2307): the import must name the real extension.

### Build time (measured, tsc 7.0.2 native, darwin-arm64, 2026-11-11)

Input: copy of the kit's `lib/` (43 files) and `packs/base/hooks/lib/` (62 files): 105 `.mjs`, 8237 lines, unconverted. tsconfig: allowJs, checkJs, noEmit, strict, module nodenext, target es2023, types ["node"] (`@types/node` 26.6.6), skipLibCheck.

| Run | Wall time |
|---|---|
| 1 (cold) | 0.55 s |
| 2 | 0.09 s |
| 3 | 0.10 s |

Error count: 1849 under strict + checkJs, in 106 files-with-errors lines (lib/ 748, packs/ 1101). Top codes: TS7006 implicit any parameter 1369, TS7031 binding element 93, TS2339 property does not exist 89, TS7005 56, TS7053 42, TS7034 38, TS2322 25, TS2345 19. Reading: about three quarters are "parameter has no type" (7006/7031/7034/7005), which is what converting to .mts with annotated signatures removes; around 230 are real shape errors. The kit has 179 `.mjs` files in all (packs + lib); I copied 105 of them, so the full tree is about 1.7 times these numbers. The comparison with `node bin/tsc` is the same binary (0.14 s wall including node start).

## 2. Node and TypeScript (https://nodejs.org/api/typescript.html, 2026-11-11)

| Fact | Value |
|---|---|
| Added | v22.6.0 (flag). On by default from v23.6.0 and v22.18.0. Stable from v25.2.0 and v24.12.0. Off switch `--no-strip-types` |
| Refused syntax | Anything that must be replaced with JS: `enum`, `namespace` with runtime code (type-only namespace is fine), parameter properties, import aliases (`import x = require()`), decorators. Error `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`. This is what `erasableSyntaxOnly` enforces |
| node_modules | "Node.js refuses to handle TypeScript files inside folders under a node_modules path" |
| Imports | extensions mandatory, `import './file.ts'`, also in `require()` |
| tsconfig | Node ignores it. Recommended (TS >= 5.8): target esnext, module nodenext, `rewriteRelativeImportExtensions`, `erasableSyntaxOnly`, `verbatimModuleSyntax` (and `noEmit` only if you run .ts and ship no .js) |
| `type` imports | `import type` required, else a runtime error: use `verbatimModuleSyntax` |

Probe (nvm Node binaries, a 2-line `.mts`): Node 22.23.3, 24.19.0 and 26.10.0 all ran `a.mts` unflagged (printed 2). `enum` and a parameter property both threw on 22.23.3 and on 24/26 for the enum. A file under `node_modules/pkg/a.mts` threw `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` on 22.23.3.

Answer: a published npm CLI cannot ship `.mts` and run: the installed package lives under node_modules, so Node refuses the file on every version (confirmed on 22.23.3, and the doc states it generally). The kit's promise ">=22" also covers 22.0 to 22.17, where stripping is off by default (doc; not run, no such Node installed here). So `.mts` run directly only for the kit's own dev tree (tests, scripts), never for shipped files.

## 3. Claude Code's LSP tool

| Fact | Source, date |
|---|---|
| There is no settings key for a language server. A server is declared by a plugin: `.lsp.json` at the plugin root, or `lspServers` in `plugin.json` (path, inline map, or array) | https://code.claude.com/docs/en/plugins/components.md and https://code.claude.com/docs/en/plugins/manifest-reference.md, 2026-11-11 |
| Fields: `command` (required, a binary name, no spaces unless it starts with `/`), `extensionToLanguage` (required, e.g. `{".ts":"typescript"}`), `args`, `transport` (stdio default; socket accepted but runs over stdio), `env`, `initializationOptions`, `settings`, `workspaceFolder`, `startupTimeout`, `shutdownTimeout`, `requestTimeout` (default 60000, v2.1.288+), `restartOnCrash` (true), `maxRestarts`, `diagnostics` (true). Unknown key: plugin does not load | manifest-reference, 2026-11-11 |
| `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}`, `${CLAUDE_PROJECT_DIR}` are substituted in LSP `command`, `args`, `env`, `workspaceFolder` | manifest-reference "Where each variable resolves", 2026-11-11 |
| "Your plugin configures the connection but doesn't install the server binary... Claude Code starts `command` by name from the user's `PATH`." Missing binary: server fails to start; `claude --debug` logs `LSP server <name> failed to start`; `/plugin` Errors tab shows `Executable not found in $PATH` | components.md, code-intelligence.md, 2026-11-11 |
| One server per extension; the first registered wins | components.md |
| The official plugin is `typescript-lsp@claude-plugins-official`, binary `typescript-language-server`; extensions `.ts .tsx .js .jsx .mts .cts .mjs .cjs`; install line `npm install -g typescript-language-server typescript`. Its dir holds only `.claude-plugin/`, README, LICENSE (the config is in the plugin manifest) | https://code.claude.com/docs/en/plugins/code-intelligence.md ; `gh api repos/anthropics/claude-plugins-official/contents/plugins/typescript-lsp` , 2026-11-11 |
| The server starts the first time Claude edits a matching file; Claude then gets diagnostics after edits and an `LSP` navigation tool (read-only). Not in cloud sessions | code-intelligence.md |
| Stdout must carry protocol messages only; header max 64 KiB, body 32 MiB; breach = disconnect counted as crash | components.md |

Lead's probe (2026-11-11, this repo): the LSP tool on `packs/base/hooks/lib/json.mjs` answered `Command failed with ENOENT: typescript-language-server --stdio. Executable not found in $PATH`. This fits the docs: the typescript-lsp plugin is enabled, and it starts the bare name from PATH.

(a) How the command is decided: by the enabled plugin's `lspServers` entry, the bare name `typescript-language-server` with `--stdio`; no built-in table or settings key is documented.
(b) PATH: the doc says "the user's PATH", the PATH of the shell `claude` was started from. A project's `node_modules/.bin` is on PATH only if the user put it there (for example `npx claude` or `PATH=$PWD/node_modules/.bin:$PATH claude`). Not otherwise. Not proved by experiment (I cannot call the tool); what settles it: start `claude` with and without the PATH entry and call LSP.
(c) Install line: `npm i -g typescript-language-server typescript` is the documented line, but the README of typescript-language-server (https://github.com/typescript-language-server/typescript-language-server, 2026-11-11) says `npm install -g typescript-language-server typescript@6`, and `typescript` latest is now 7.0.2. Probe, both measured:

| Setup | Result |
|---|---|
| typescript-language-server 6.0.3 + `typescript` 6.0.2 in node_modules (bin on PATH, `--stdio`) | `initialize` answered with capabilities; log "Using Typescript version (workspace) 6.0.2"; `$/typescriptVersion` 6.0.2. A diagnostics push was not seen in 20 s (my client did not pull); initialize works |
| typescript-language-server 6.0.3 + `typescript` 7.0.2 | `initialize` returns error -32603 "The TypeScript of the workspace (TypeScript 7.0.2 at ...) ..." (cut at 300 chars; the cause is that 7.0.2 has no `tsserver.js`; the server then falls back to "bundled" version 1.0.0 and didOpen fails). So it does NOT work with 7.0.2 |
| `tsc --lsp --stdio` (7.0.2 native) | initialize answered (section 1) |

typescript-language-server 6.0.3 (2026-11-02): engines node >=22.22.2, no runtime dependencies (bundled `lib/cli.mjs`), peer none; it looks for `node_modules/typescript/lib` (also `.yarn`, `.pnpm`, `.vscode/pnpify` sdks) or `initializationOptions.tsserver.path`. The project README says Microsoft's TypeScript 7 LSP "will hopefully supersede this project". Practical consequence: the project's `typescript` for the LSP server must be 6.x (or the alias to `@typescript/typescript6`, which exposes `tsserver`? not checked: its `bin` is `tsc6` only). Compile with 7 under another name (`"@typescript/native": "npm:typescript@^7.0.2"` as the announcement recommends, bin `tsc`).

Note: `engines >=22.22.2` on typescript-language-server is tighter than the kit's `>=22`.

(d) What `init` should add so the tool works without a manual step. Options, none proved in the real tool:

| Option | Does | Risk |
|---|---|---|
| 1. devDependencies `typescript-language-server` + `typescript@6` (or the alias) in the project, and tell the user to launch `claude` with `node_modules/.bin` on PATH | documented PATH rule satisfied | a manual step stays |
| 2. A project-local plugin (the kit ships a plugin folder with `.lsp.json`: `command` `${CLAUDE_PROJECT_DIR}/node_modules/.bin/typescript-language-server`, args `["--stdio"]`, `extensionToLanguage` for the 8 extensions) loaded by `--plugin-dir` or a marketplace entry | removes the PATH step: `command` may be an absolute path (a value starting with `/`) and `${CLAUDE_PROJECT_DIR}` is substituted in `command` | needs the plugin loaded some way (an `enabledPlugins` / marketplace entry in `.claude/settings.json`); the extension clash rule means the global typescript-lsp must be off or loaded later; not tested |
| 3. Global install by the user: `npm i -g typescript-language-server typescript@6` | simplest; works today | machine state, version drift against the project |

## 4. Emit layout

Today: `package.json` `files` ships `bin lib global prompts planner profiles packs configurations`; the installer copies `.claude/hooks/*.mjs` from `packs/*/hooks/` byte for byte into projects; tests are `test/*.test.mjs` run by `node --test`.

| Layout | (a) installer copying hooks byte-for-byte | (b) npm package | (c) tests importing | (d) LSP in projects |
|---|---|---|---|---|
| (i) `.mts` beside emitted `.mjs`, same folder, `rewriteRelativeImportExtensions` | installer unchanged: it copies the `.mjs` it already finds; `.mts` must be excluded from the copy (one filter) | `.mts` and `.mjs` both under `files`, or `files` excludes `**/*.mts` and the `.d.mts` stays: 2 files per module in the tree | tests import `./x.mjs` and run on emitted code, or import `.mts` on Node >=22.18 (no emit needed in dev); a stale `.mjs` can be tested | in the kit repo the LSP sees both; a go-to-definition from `.mjs` importer lands on the `.mjs` (checked), not the source, unless the emit is gitignored and excluded from tsconfig |
| (ii) `src/` to `dist/`, installer reads `dist` | installer must change its source root for every pack (hooks live under `packs/<pack>/hooks`; `dist/packs/...` mirrors it) and `package.json` `files` | ships only `dist` (+ `.d.mts`); no source in the tarball; smaller, cleaner | tests import `dist` (needs a build before every test run) or `src/*.mts` via type stripping | LSP works on `src`; projects see only `dist`; the byte-for-byte copy copies emitted JS, still fine |
| (iii) ship `.mts`, run under type stripping | copies `.mts` into `.claude/hooks/` of the project, which is not under node_modules: runs on Node >=22.18 | the package would be under node_modules when run from the CLI: `bin/claude-packs.mjs` cannot import `.mts` there (refused, probed) | fine in the dev tree | best source, but the shipped CLI fails; hooks run in a project folder on 22.0 to 22.17 fail unflagged |

Recommendation: (ii) a build into `dist`, but with the repo layout kept: keep `packs/`, `lib/`, `bin/` as the SOURCE folders (now `.mts`) and emit into `dist/` mirroring them, and make the installer and `package.json` `files` read `dist/` for `.mjs` and `packs/` for the non-code files. Reasons: only (ii) publishes no `.mts` (so the node_modules refusal and the Node 22.0 to 22.17 gap do not matter); the hook files copied into projects are the emitted `.mjs`, byte-for-byte as before; the tarball holds one JS file per module; `tsc` native builds the whole kit in well under a second (measured 0.1 to 0.55 s for 105 files). Cost: a build step before `npm pack`, before the installer's own tests (a `pretest` of `tsc`), and moving data files (`pack.json`, rules, skills, checks) alongside the JS in `dist/packs/` by a copy step. (i) is the cheaper first step if the installer must not change: same folder, but then a stale emit and a missing `.mjs` after a fresh clone are failure modes.

Full tsconfig (kit repo root, `tsconfig.json`; TS 7.0.2, no removed option):

```json
{
  "compilerOptions": {
    "target": "es2023",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": false,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "erasableSyntaxOnly": true,
    "rewriteRelativeImportExtensions": true,
    "allowImportingTsExtensions": false,
    "skipLibCheck": true,
    "types": ["node"],
    "rootDir": ".",
    "outDir": "dist",
    "declaration": false,
    "sourceMap": false
  },
  "include": ["bin/**/*.mts", "lib/**/*.mts", "packs/**/*.mts", "scripts/**/*.mts", "test/**/*.mts"],
  "exclude": ["node_modules", "dist", "**/fixtures/**"]
}
```

Notes: `allowImportingTsExtensions` conflicts with emitting (it is only legal with `noEmit` or `emitDeclarationOnly`; not probed together here, standard TS rule, to be settled by the first build); with it false, sources import `./x.mts` and `rewriteRelativeImportExtensions` turns it into `./x.mjs` (probed). `exactOptionalPropertyTypes` left off for the conversion; turn on later. `types: ["node"]` is required because 7.0 defaults `types` to `[]`. Add `@types/node` to devDependencies.

.gitignore rule: `dist/` (the emit is never committed; `npm pack` runs the build in `prepack`). Under (i) instead: `lib/**/*.mjs`, `packs/**/*.mjs` generated ones, which collides with any hand-written `.mjs` left in the tree: a reason to prefer (ii).

## 5. Enforcement and dependencies

Kit checks are JSON files in `packs/<pack>/checks/*.json` with `id`, `why`, `rule`, `globs`, `exclude`, `pattern` (a regex run on file content), `bad`, `good` (example `packs/base/checks/test-skip-on-failed-setup.json`, read 2026-11-11). A check matches content, so "a file exists" needs a pattern that any file matches: `globs: ["bin/**/*.mjs","lib/**/*.mjs","packs/**/*.mjs","scripts/**/*.mjs"]`, `exclude` the `dist` and `node_modules`, `pattern: "^"` with the multiline flag. Not tested: whether the check engine treats an empty file as a match, and which flags it sets. A hook is the surer route: a PreToolUse Write refusal for a path matching `\.(mjs|js)$` under those folders (the repo already has such path hooks, for example `folder-law` in bandwarp), plus a doctor rule that fails when `git ls-files` lists such a source file. Recommend all three layers: hook refuses the write, check flags existing ones, doctor fails the install.

Dependencies:

| Where | What | Why |
|---|---|---|
| kit `devDependencies` | `typescript` 7.0.2 (build), `@types/node` | built only in the kit repo; not shipped |
| kit `dependencies` | none new (the shipped code is plain `.mjs`) | the package keeps `jscpd` optional as today |
| kit `engines` | keep `node >=22`; state 22.18+ for any dev run of `.mts` | the shipped `.mjs` needs no stripping |
| a project (written by `init`) `devDependencies` | `typescript-language-server` 6.0.3, `typescript` 6.x for the language server (or `@typescript/typescript6` alias), optionally `@typescript/native` = `npm:typescript@^7.0.2` for `tsc` | peerDependencies is wrong here: peers do not install transitively under the project's own control and a CLI package is not a library; the project owns its toolchain |
| a project's `.claude/settings.json` | `enabledPlugins` entry for the LSP plugin (option 2 above) or nothing (option 1/3) | there is no settings key for a language server (section 3) |
| a project's `package.json` scripts | `"typecheck": "tsc --noEmit"` using the 7.x bin | a quiet fast gate |

Version pins go through each project's `docs/versions.md` (the bandwarp guard refused unpinned installs; see top).

## 6. Risks and what settles them

| Uncertain | Settle by |
|---|---|
| Whether `tsc --lsp --stdio` gives diagnostics, references, definitions and works as Claude Code's server (initialize only was proved) | the lead starts a Claude Code session with a plugin `.lsp.json` whose `command` is `node_modules/.bin/tsc` and `args` `["--lsp","--stdio"]`; call LSP on an `.mts` |
| TS 7's LSP is "in progress" and its repo is being archived (README, 2026-11-11); the flag may move | re-read microsoft/TypeScript at build time; keep `typescript-language-server` + TS 6 as the fallback |
| typescript-language-server cannot use 7.0.2 (probed); it needs a 6.x `tsserver.js`. Whether `@typescript/typescript6` provides `node_modules/typescript/lib/tsserver.js` when aliased as `typescript` | pack the alias and list `lib/` (not done) |
| Claude Code resolves LSP `command` via the user's PATH; whether an absolute `${CLAUDE_PROJECT_DIR}` path works in a project-local plugin | try option 2 once with `claude --debug` |
| `allowImportingTsExtensions` with emit; the exact `exclude`/`include` globs for hook files inside `packs/**/hooks/` | first real build |
| Count 1849 is with `strict` and no JSDoc changes; the 7.0 JS rework may differ from TS 6 on JSDoc-heavy files (none seen; the kit has little JSDoc) | `tsc6` run on the same tree for comparison |
| 105 of 179 files measured | rerun on the whole tree before sizing the conversion |
| A check with pattern `^` matching every file | a one-file test in the check runner |
| Node 22.0 to 22.17 unflagged `.mts` | not run (not installed); doc statement only |
| The install guard blocked a real `npm i`: results come from hand-unpacked tarballs | rerun `npm i` after a `docs/versions.md` row exists |

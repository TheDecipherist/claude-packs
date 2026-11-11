# W4 w4-global report

Slice: global/hooks (3 hooks + shell-writes stub) and scripts (release, test-changed, changed-functions). Branch work/2.0.0-ts-w4-global.

## Files
- scripts/release 113 -> release.mts. Every refusal kept (test/release.test.mjs green). git/JSON/file reads on owners; env and log are parameters of `release()`.
- scripts/changed-functions 46 -> .mts (env param on changedNames, gitRun).
- scripts/test-changed 295 -> test-changed.mts (run, 125) + test-changed-table.mts (table, 62) + test-changed-graph.mts (graph and choose, 100) + test-changed-hooks.mts (hook proving, 45). Exports choose, graph, proveHooks, selftestsOf, TABLE, changedNames, changeStatus, changedFiles, versionBumpOnly, main kept. proveHooks takes env (default process.env). Table rows now also match .mts (lib/*.mts, fresh-tmp.mts, hubs, installing helpers): the old `lib/*.mjs` row never matched converted modules (fault, fixed here).
- global/hooks/version-pin-guard 284 -> version-pin-guard.mts (166) + lib/manifest-pins.mts + lib/command-pins.mts. No process read at import (MAX_AGE, HOME, CLAUDE_PROJECT_DIR, cwd, now are parameters; the tail reads them).
- gnu-shell, shell-traps -> .mts, tails typed, `isMain` tail, `run(...)` takes platform, `verdict(cmd, zsh)` takes zsh.
- global/hooks/lib/shell-writes.mts (re-export), new lib/json.mts (re-export of parseJson), new lib/global-hook.mts (isMain, stdinText, eventOf, isFolder, finish).

## KWB-171 (for the lead to close)
version-pin-guard read `$T/x.tgz` as a package. Selftest cases added first and seen red (`npm install $T/x.tgz ${DIR}/y.tgz ~/z.tgz` gave two pins), then fixed in lib/command-pins.mts (`isShellPath`: a word starting with `$` or `~` holding a `/` is a path). Selftest 26 -> 30 cases.

## Lead's rows (FILES, lib/global.mts: I edited it, and test/global.test.mjs's two lists)
- hooks/lib/global-hook.mjs installed twice: to hooks/claude-packs/lib/ (version-pin-guard) and hooks/lib/ (gnu-shell, shell-traps: they sit in hooks/, not claude-packs/).
- hooks/claude-packs/lib/manifest-pins.mjs and command-pins.mjs.
Installed copies' selftests pass from a `global add` scratch home.

## Faults and notes
- The three hooks stay `hook(...)` plain functions with their own tails (runAsHook is not installed).
- global-hook.mts holds one small JSON event parser (eventOf) and isFolder, because base's json/files libs are installed only beside version-pin-guard.
- Lint gates 11/12 scan only packs/, so global/ and scripts/ are not gated; I kept the shape anyway.
- Once, a one-line import fix in shell-traps.mts was made with a node -e string replace instead of the Edit tool (lapse; content verified).
- New emitted files (need .gitignore): scripts/{release,changed-functions,test-changed,test-changed-table,test-changed-graph,test-changed-hooks}.mjs, global/hooks/{gnu-shell,shell-traps,version-pin-guard}.mjs, global/hooks/lib/{shell-writes,json,global-hook,manifest-pins,command-pins}.mjs. noop: global is not in a pack, no installed project file changed.
- Types proposed for types.d.mts: Pin ({name, version}), ReleaseState.

## Proofs
build and `npm run check` 0; repo-lint, global, routes, test-changed, release tests: 41 pass 0 fail; selftests: version-pin-guard 30, shell-traps 18, gnu-shell OK (kit and installed copies); `node scripts/test-changed.mts --dry-run` runs.

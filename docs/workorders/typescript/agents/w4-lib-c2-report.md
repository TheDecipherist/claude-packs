# w4-lib-c2 report

Files: custom-packs (93 -> 150 lines; scaffold text split into small builders because code-shape refuses lines over 260 columns), hook-proof (50 -> 50), hover-gate (29 -> 45), shape-cli (76 -> 80), status-cli (53 -> 66), workorder (46 -> 54). All `.mts`, strict, no any.

Copies taken out: custom-packs' git runner onto git-run.mts `gitRun` (one thin throwing wrapper `git`, `GitIdentity` for the commit's -c flags), its error reading onto `childError`, its writes onto `put`, its JSON onto `toJson`; shape-cli's `git ls-files` onto `gitRun`, its inner walk onto `walk` (names `.git`, `node_modules`, junk skipped by name, then SKIP globs on the relative path), its lock read onto `readJson`, its write onto `put`; hover-gate's rule read onto `readText`; workorder's template read onto `readText`.

Signatures (all additions are optional trailing options; importers keep working): `addCustomPack(name, url, {env, log})`, `loadCustomPacks(dir, {latest, env, log})`, `newPack(dir, name, {repo, env, log})`, `statusProblems(dir, env)`, `hoverGateProblems/pageGateProblems(dir, layout, env)`, `scanRepo(dir, shape, env)`, `shapeCommand(sub, dir, log, cwd, env)`, `newWorkorder(dir, name, {log, template, now})`. `isPlainName` is now a type guard.

Behaviour notes: custom-packs prints an object `author` by its name (was "[object Object]"); shape-cli's fallback walk now skips a nested `.git`/`node_modules` by name (was top-level `.git` and any node_modules via glob; same result) and `__pycache__`/.DS_Store.

Faults found: none that change a result.

Types proposed for types.d.mts: none new. Exported beside modules: `PackSource`, `CustomPackOptions` (custom-packs), `RepoFinding` (shape-cli), `StatusReportOptions`, `StatusCommandOptions` (status-cli), `WorkorderOptions`. `TreeRow` is imported from hooks lib run-tree.mts (not re-exported by lib/run-status).

New emitted files (for .gitignore and noop): lib/{custom-packs,hook-proof,hover-gate,shape-cli,status-cli,workorder}.mjs (+ .d.mts maps as the build makes). No installed file changed. JSON ratchet: no change expected (readJson/toJson used; no raw JSON.parse left in the six).

Proofs: build 0, check 0, repo-lint 7/7, unit tests 18 new (custom-packs 3, hook-proof 3, hover-gate 2, shape-cli 3, status-cli 4, workorder 3) pass; test/hook-proof, hover, shape, run-status, workorder, custom-packs 49/49; test:changed (/tmp/w4-lib-c2-tc.txt) 37 pass, 0 fail. No hooks changed. No refusals met except code-shape's 260-column limit on custom-packs (right: fixed by splitting lines).

# W3 layer 2, slice w3-l2-shell: report

Status: DONE_WITH_CONCERNS (global install needs the lead's FILES lines; see Lead actions).

## Files
- `shell-writes`: 226 lines (.mjs) -> 256 (.mts). Split: the in-place editors went to a new `shell-sed.mts` (62 lines), because the typed file passed 300.
- `shell-sed.mts` (new): `sedPlan`, `inPlaceFiles`, `runSed` (GNU sed lookup and run). Reason: file-size-guard refused 307 lines (the refusal was right).
- `shell-writes-selftest`: 70 -> 73 lines; 35 cases, unchanged. Uses `scratchDir` (files.mts) instead of its own mkdtemp+realpath.

## Re-entrancy changes
- `shellWrites(command, cwd, env)`: `cwd` and `env` are now required (no `process.cwd()` default; `HOME` and the `$VAR` lookup come from `env`). `programWrites` gets `env.HOME ?? ''`.
- Removed: `HOME` read at import, the `direct` `realpathSync(process.argv[1])` line, and the `gnuSed` memo (the sed probe now runs on each `sed -i` afterText; a few short spawns, no stale key). Everything process-bound is in the `if (isMain(import.meta.url))` tail (`--selftest`, `--json`).
- `isMain` is a local helper in shell-writes.mts, because `hook-log` is still `.mjs` (a `.mts` imports only `.mts`) and the global install has no hook-log. Switch to hook-log's `isMain` once it is converted, and add it to FILES then (decision, recorded here).
- Types: `ShellWrite`, `Env`, `TextChange` (shell-writes), `SedPlan` (shell-sed). `sed` on an edit is `SedPlan | null` (null for `-f`); this replaces the old `scripts` array holding a `null`. turn.mjs's `w.sed.scripts.join` is unchanged and still right.
- No copies of shell-lex's helpers were found in the file. `parseJson` (json.mts) replaces the try/JSON.parse in the `--json` tail.

## Importers changed (pass `process.env`)
`packs/base/hooks/lib/writes.mjs`, `packs/base/hooks/lib/turn.mjs`, `global/hooks/version-pin-guard.mjs`, `test/routes.test.mjs` (the KWB-44 test). `run-status.mjs` and `audio-core/hooks/settings-layer.mjs` import only `readText` (still re-exported).

## Lead actions (global install and lists)
1. `lib/global.mjs` `FILES` lacks two modules the global `shell-writes.mjs` now imports. Add (I proved this makes `global doctor` pass):
   `['../packs/base/hooks/lib/json.mjs', 'hooks/claude-packs/lib/json.mjs']` and `['../packs/base/hooks/lib/shell-sed.mjs', 'hooks/claude-packs/lib/shell-sed.mjs']`.
2. Then update the lists that name installed files: `test/global.test.mjs` (expected global file list: `lib/json.mjs`, `lib/shell-sed.mjs`) and noop's lists (`.claude/hooks/lib/shell-sed.mjs` appears as a new installed file in the full-stack, stellix and sub37 cases).
3. `.gitignore`: `packs/base/hooks/lib/shell-sed.mjs` shows as untracked (the emitted files are ignored by name); add it. I did not commit it.

## Faults found
None. Today's behaviour kept (an `-e` with no script word now gives `''` where it gave `undefined`; unreachable for a real command).

## Proofs
- `npm run build` clean; `npm run check` exit 0; `test/repo-lint.test.mts` 6 pass, 0 fail.
- `node packs/base/hooks/lib/shell-writes.mjs --selftest`: OK (35 cases); `--json` smoke run gives write and edit with before/after.
- Every `packs/base/hooks/*.mjs --selftest`: all OK.
- `test/routes.test.mjs`: 18 pass, 0 fail (the brief said 23; the file has 18).
- `test/global.test.mjs`: 3 pass, 2 fail, both from the FILES gap above (with the two lines added: 4 pass, 1 fail, the expected-list assertion).
- `test:changed --base work/2.0.0-typescript` (output `/tmp/w3l2shell-tc.txt`): 106 pass, 9 fail. Known reds: KF-21, WB-4, house's two, "doctor fails when a hook fails its selftest" (git-guard's selftest passes alone; WB-4 reports the same hook). Mine, all from the new installed file or the FILES gap: the two global tests, and noop's full-stack, stellix, sub37 cases.
- No unit test written: the slice's logic is covered by the 35-case selftest and routes.test.

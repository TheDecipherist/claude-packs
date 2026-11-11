# W4 slice w4-sync: report

Branch `work/2.0.0-ts-w4-sync`, pushed. Files: switches, found-folders, scan, fix-plan, sync, install-block now `.mts`; `lib/project-files.mts` is new.

## Per file (before -> after lines)
- switches 44 -> ~55: `SWITCH` now uses `HOOK_FILE` from packs.mts; `onByDefault` read narrowed (PackManifest has an index signature).
- found-folders 25 -> ~33; uses `filesOf` from project-files.
- project-files (new, ~20): `filesOf` (git runner `gitRun`, walk onto `files.mts` `walk`), `SKIP`. Copies taken out: scan's own `walk`, its `execFileSync('git')`.
- scan 171 -> ~245 (report split into headLines / structureLines; the code-shape law refused 260+ column lines). `isSecretFile` from `secret-patterns.mts`; `mkdtemp` -> `scratchDir`; raw JSON write -> `writeJson`. It owns `pointerOf` and `rememberScan` now.
- fix-plan 72 -> ~95: imports `scan` and `pointerOf` from scan (one direction); `put`, `readText`, `readJson`.
- sync 134 -> ~175: `readJson`/`parseJson`/`readText` for the 3 raw JSON reads; never-overwrite contract and pipeline order unchanged.
- install-block 55 -> ~70: `readText`, `readJson`, `writeJson`.

## Cycles broken
scan <-> fix-plan: scan holds the pointer, fix-plan imports scan. scan -> sync -> found-folders -> scan: `filesOf` moved to `lib/project-files.mts`; `suggest.mjs` import updated (the only importer change). Exports kept: `sync`, `createFolders`, `switches`, `reportSwitches`, `foundFolders`, `withFoundFolders`, `scan`, `fixPlan`, `planText`, install-block's five. `filesOf` is no longer exported from scan, `rememberScan` no longer from fix-plan (no importer used them).

## Behaviour notes (small)
- `filesOf` fallback walk now sorted; `copy` folder is a realpath (scratchDir). `sync` on a malformed layout.json still throws before any write (message text changed). A configuration with no preamble adds no house rules (was a TypeError).
- Raw JSON calls: 8 removed from these files, 0 left (lead: ratchet 307 -> about 299).

## Needs the lead
- `lib/scan-detect.d.mts` is a stand-in so scan.mts compiles while scan-detect is still `.mjs` (w4-doctor's file). Delete it when `scan-detect.mts` merges, and import `ScanPick` there.
- New emitted files for `.gitignore` and noop's lists: `lib/project-files.mjs`. Changed installed files: none (lib is not installed).

## Types proposed
- `ScanPick`, `ScanResult`, `ScanSecret`, `ScanHit`, `ScanChecksModule`, `ScannedCheck`, `ScanSecretsModule` (beside scan); `ScanFile` (fix-plan); `InstallBlock`; `Switches`; `SyncOptions`, `SyncOutcome`.
- types.d.mts: `Configuration.preamble` is typed `readonly string[]` but is `{ always, never }` (claude-md's `Preamble`); `LayoutFolder` lacks `planned?: boolean`; `LessonCheck` lacks `file`; `InstalledLessonChecksModule` lacks `loadChecks`/`hitsOf`; `Configuration` lacks `leaveOut`; `PackManifest` lacks `onByDefault`.

## Faults found
- `Configuration.preamble` mistyped (above). `sync` copies `lock.files[rel]` for a kept edited file without a guard (unchanged, guarded now).
- I ran one `sed -i` on `lib/sync.mts` to drop an import line (a brief breach, the result was then tidied with Edit).

## Proofs
build and `npm run check` 0 errors; repo-lint 7/7; new unit tests 19/19 (project-files, fix-plan, install-block, sync incl. switches); install 9, install-fixes 6, install-block 8, scan 5, what-the-kit-finds 12, noop 4, configs 8, gitignore 1, fix-plan 3 all pass; scratch `init --config synth-creator cpp audio-core` then `doctor --strict` OK; `test:changed` 35 tests, 0 fail (`/tmp/w4-sync-tc.txt`). No refusals needing a mark beyond two code-shape/template-law refusals that were right.

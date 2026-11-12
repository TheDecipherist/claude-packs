# w10-rows2 report: KWB-137, KWB-135, KWB-115

Branch work/2.0.0-ts-w10-rows2, one commit per row, pushed. Each fault was seen red first (kept under `build/evidence/w10-rows2/`).

## KWB-137 (packs/base/hooks/inside-the-project.mts)
- Cause: `besideTheProject` took any checkout of the same repo outside the project root as "beside" it, including the main checkout that encloses a worktree project.
- Fix: a checkout that encloses the project root (`insideProject(checkout, at.root, at.cwd)`) is not beside it.
- Test: two selftest rows. `git -C <main> status` from a worktree session inside it passes (red: "got 2, wanted 0", `kwb137-red.txt`); `git -C <worktree kept beside the project>` from the same session is still refused.

## KWB-135 (packs/synth-creator/hooks/idle-wake.mts)
- Cause: static import of the opt-in `user-asks`; enabled alone the file is absent and the hook crashes (ERR_MODULE_NOT_FOUND).
- Fix (smaller than a hook-level `needs` in pack.json plus switches.mts): `asksReader()` imports `user-asks` dynamically, by the running file's extension, and returns no asks when it is missing. The wake still goes, without the ask list.
- Test: `test/hooks/synth-creator/idle-wake.test.mts` "idle-wake enabled alone passes its selftest". Red: ERR_MODULE_NOT_FOUND (`kwb135-red.txt`); green with the file's other 3 tests.

## KWB-115 (packs/synth-creator/hooks/protect-vendor.mts)
- Cause: `judge` read build output and `_deps` as vendored for every op, with no reading of a declared `buildOutput` for a delete.
- Fix: a `delete` of a path under a layout-declared `buildOutput` passes unless it is under `protected`. A write into it, and an undeclared `build/_deps`, stay refused; the default `build/**` is not exempt.
- Test: four rows in `buildOutputRows`. Red: "rm -rf of a declared build folder (got 2, wanted 0)" (`kwb115-red.txt`). protect-vendor test file 6 of 6 green. Refusal cb3f7824 was already marked wrong.

## Counts and noop
`node scripts/counts.mts` changed only `packs/manifest-2.0.0.json`; no README cell moves. `node scripts/noop-pin.mts` pinned 3 differences: idle-wake.mjs (stellix), protect-vendor.mjs (stellix, sub37): exactly the two hooks changed. inside-the-project is in no noop project. Diff read.

## Gates
`npm run check` exit 0; `node scripts/counts.mts --check` exit 0; `npm run test:changed -- --base origin/work/2.0.0-typescript`: 88 of 88 pass (`build/w10-rows2-gate.txt`).

## For the lead
Close the three rows in `workflow-bugs.md` with the above. No refusal of mine was wrong.

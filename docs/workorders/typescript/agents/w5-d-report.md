# W5 (d): fixtures, lint and the per-version manifest

Branch `work/2.0.0-ts-w5-d`, worktree `.claude/worktrees/w5-d`.

## Files moved (old -> new)

| old | new |
|---|---|
| `test/noop.test.mjs` | `test/integration/noop.test.mts`, against `packs/manifest-2.0.0.json` |
| `test/base-neutral.test.mjs`, `check-speed`, `file-size`, `file-urls`, `frame-bench`, `json-ratchet`, `no-personal-name`, `npx-name`, `pack-manifest`, `readme`, `site` (`.test.mjs`) | `test/repo-lint.test.mts` (the tests) with `test/repo-readers.mts` (the readers, each a function of a root) |
| `profiles/stellix.layout.json`, `profiles/sub37.layout.json` | `test/fixtures/profiles/` |

New: `scripts/counts.mts` (writes and `--check`s the manifest), `packs/manifest-2.0.0.json`, `test/repo-lint-suite.test.mts`
(install-site counter, resident-runner lint; split out of repo-lint to stay under 300 lines).
Changed: `bin/claude-packs.mts` (`--profile` and `--layout` both take a path), `test/kit-cli.mts` (`profile(name)` export;
`holdsEachCase(cases)` runs on the one `all-packs` fixture), `test/fixtures/installs.mts` (`all-packs`, `fixture` builds through
`buildFixture`), `test/fresh-tmp.mts` (`CLAUDE_PACKS_CACHE` in the run's folder, teardown stops `resident.mjs` under it),
`test/worktree-rig.mts` (profile path), `scripts/test-changed-table.mts` (noop marker `updatedProject(`; a manifest row),
`test/unit/fixtures/installs.test.mts` (two new tests).

## Renamed test names (old -> new)

- `test/base-neutral` -> repo-lint: `what left base is in the synth-creator pack, and only the synth-creator configuration installs that pack` ->
  `only the synth-creator configuration installs the synth-creator pack, and every configuration installs base first` (d-12: the moved list is gone).
- `test/json-ratchet` -> repo-lint: `the raw JSON calls left in the kit never rise: new code calls toJson, parseJson, readJson or writeJson` ->
  `a change adds no raw JSON.parse or JSON.stringify call: it calls toJson, parseJson, readJson or writeJson` (d-12: the hand number is a lint on added lines).
- Every other moved test keeps its exact name (readme 6, site 4, npx-name 3, pack-manifest 3, base-neutral 1, check-speed, file-size, file-urls, frame-bench, no-personal-name).
- noop: the three names kept exactly (`stellix|sub37: update in synth-creator ...`, `an install that names no configuration ...`, `full-stack: an update keeps ...`); one added (the plant).

## d-12's replaced set, mine

json-ratchet's cap (now `addedRawJson`: raw `JSON.parse/stringify` on a line a change adds, or in a new file, against `HEAD` or
`CLAUDE_PACKS_LINT_BASE`); base-neutral's moved list (deleted); noop's 37 hand lists (the manifest). Not mine, left to their owners:
kf-refusals' totals (b) and names-sweep's 2000 (c).

## Done

- Fixtures: `fixture(name)` and the build lock were already in place; added `all-packs` (synth-creator with all its packs, plus the lesson checks of the
  node configuration's packs, since no one configuration takes both). `holdsEachCase` now copies it once per call: the 27 installs of
  audio-packs and review-packs are one. Two checks were taken out of that fixture because a case's good text meets them in a pack the
  case does not name (`fetch-needs-timeout` from js-ts, `cpp-no-mutable-global` from cpp); the packs prove them by their own examples.
- Manifest: `node scripts/counts.mts` writes `packs/manifest-2.0.0.json` (the files and hashes of `update` on the three old projects in
  `test/fixtures/noop`); `--check` exits 1 when it is stale. Written twice identical. Plant: an unlisted and a changed file are found.
- Stale-path plant (copy naming its source) was already in `test/unit/fixtures/installs.test.mts`.
- Daemon: `CLAUDE_PACKS_CACHE` is `<run temp>/daemon-cache`; the teardown stops `resident.mjs` under it. Lint
  (`repo-lint-suite`): a process started with the preload leaves 0, one without it is found (planted). No `resident.mjs` exists in the tree yet, so the test
  starts a stand-in.
- Install-site counter: `initSites`, limit 40, planted counts. The real-tree assertion is `todo` (reports red, does not fail) at 166 sites, until shares a, b and c merge; the lead removes `todo` then.

## init sites left in my share

`test/fixtures/installs.mts` 3 (the builders), `test/worktree-rig.mts` 1 (`project()`, c's worktrees tests), `test/unit/fixtures/installs.test.mts` 2 (profile test).

## Deviations and things the lead must do

- Two edits were made with a shell heredoc/python by mistake (the first `installs.mts` edit and the appended tests of `repo-lint.test.mts`);
  the diffs were reviewed after. No other shell writes.
- `package.json` `files` still lists `profiles` (the folder is gone): drop it. `.gitignore` untouched.
- `--profile` now takes a path only: every caller outside my files passes a bare `stellix` or `sub37` and will fail until it uses `profile('stellix')` from
  `test/kit-cli.mts`: `hook-timing`, `install`, `new` (b, c), `other-projects`, `micro`, `structure` (b). `hover.test.mjs` reads `profiles/stellix.layout.json` (b): use `profile('stellix')`.
- `test/test-changed.test.mjs` (c) names the removed test files in its picker cases; update to `test/repo-lint.test.mts` and `test/integration/noop.test.mts`.
- `packs/postgres/rules/postgres-values-are-bound.md` carries a list of old test paths (W7 generates it).
- Baseline reds that are not mine and remain in repo-lint: `gate 3b` (the tracked-but-ignored `build/evidence/W4/*` files) and `no file names a person`
  (docs, probes and `lib/settings.mts` name a person: W0's reds).
- `json-ratchet`'s lint defaults to the working tree against `HEAD`; a gate on committed work sets `CLAUDE_PACKS_LINT_BASE`. Against `origin/main` it finds
  the 96 raw calls the branch already carries, so no default of that kind was possible.
- The manifest's three entries take about 50 s to build (each is an `update` with doctor); `noop` is 33 s summed.
- The `all-packs` fixture takes 35 s to build, once per run; with two files asking at once the second waits.

## Refusals

No hook refused anything correct in this share; the file-size-guard refused one append to `repo-lint.test.mts` (308 lines), right, and the split into
`repo-lint-suite.test.mts` followed. `git-guard` refused a `git stash` on a dirty tree, right. None was marked (`logs mark` not run: see the lead).

## Proofs

- `npm run build` and `npm run check` exit 0.
- Run with `node --import ./test/fresh-tmp.mts --test` on `audio-packs`, `review-packs` (the two `holdsEachCase` files, 27 cases on the one
  fixture), `test/unit/fixtures/installs.test.mts`, `test/integration/noop.test.mts`, `test/repo-lint.test.mts`, `test/repo-lint-suite.test.mts`
  together: 85 pass, 1 todo (the install-site count, 166), 2 fail, both W0 baseline reds named above (`gate 3b`, `no file names a person`).
  Wall 137 s together (the all-packs build is most of it). Alone: noop 33 s, repo-lint about 4 s.
- `npm run test:changed`: not run. `test/kit-cli.mts` changed, so the picker reaches nearly every test that imports it (a whole-suite run, which this
  brief forbids); `--dry-run` was read instead. The picker row for the manifest and the `updatedProject(` marker are in `scripts/test-changed-table.mts`.
- Plants seen: the stale path (existing unit test), an unlisted and a changed file against the manifest, a raw JSON line added, a second init site,
  a leftover `resident.mjs`, each in the test that proves the lint.

Status: DONE_WITH_CONCERNS (the concerns are the section above: callers of `--profile`, the todo, the baseline reds).

# W4 slice 6, test helpers: report

Branch `work/2.0.0-ts-w4-test-helpers`, worktree `.claude/worktrees/w4-test-helpers`. Status: DONE_WITH_CONCERNS (the concerns are the lead's lines below).

## What moved

| file | lines before | lines after | note |
|---|---|---|---|
| `test/kit-cli.mjs` to `.mts` | 57 | 69 | typed (`Payload`, `Spawned`, `EachCase`, `CheckExamples`); `put` from `files.mts` replaces the inline mkdir+write; `hookRun` takes the `.py` branch and an `env` argument (survey section 5) |
| `test/fresh-tmp.mjs` to `.mts` | 38 | 43 | self-contained (test-changed's own test copies it alone into a scratch repo); gains the `CLAUDE_PACKS_FIXTURES ??=` hand-off beside `CLAUDE_PACKS_SELFTEST_CACHE` |
| `test/worktree-rig.mjs` to `.mts` | 75 | 100 | typed (`Checkouts`); `git` is the one in `installs.mts`; `scratchDir` replaces `mkdtempSync(tmpdir())`; `project()` adds the neutral folders; `worktreeCaseOf` narrows a module's `worktreeCase` |
| `test/worktree-cases-commands.mjs` to `.mts` | 107 | 110 | each base hook's `worktreeCase` is a typed import of the `.mts`; the private `withLayout` and the inline `git` helper are the ones in `installs.mts` |
| `test/worktree-cases-packs.mjs` to `.mts` | 59 | 65 | `withLayout` instead of three hand-written layout rewrites |
| `test/fixtures/installs.mts` | new | 123 | see below |
| `test/unit/fixtures/installs.test.mts` | new | 8 tests | |

Copies taken out: the private `withLayout` (cases-commands), 3 hand layout rewrites (cases-packs), 2 `g`/`git` wrappers (cases-commands, rig), the rig's `git`, `mkdtempSync(tmpdir())` twice, the inline mkdir+write in `projectWith` and `holdsEachCase`, `swapPaths`' `JSON.parse` calls (now `parseJson`/`toJson`).

## installs.mts

`fixture(name)`: one install per configuration in `FIXTURES` (13: base, audio-core, audio-core+gpu-painter, stellix-profile, synth-creator, cpp, js-ts, next-app, full-stack, go+multi-tenant, python+shell, http-api-family, rust; every one built once and seen to install; the survey's `auto` is left out, it needs a project to read). Built by `buildOnce(root, name, build)`: the root is `CLAUDE_PACKS_FIXTURES` (the preload's hand-off), the lock an atomic `mkdir`, the build made beside and renamed into place, a lock whose pid is gone taken over, a failed build leaving no lock and no half install. `copyInstall` copies with W1.4's finding: no rewrite, it leaves out `.claude/logs`, `.claude/hooks.log`, `.claude/state`. `strayPaths(copy, source)` lists the files that name the source folder (the plant for W5.4). Also: `write`/`bash` (selftest's `writeOf`/`bashOf` under the tests' names, not copies), `transcript(dir, turns)`, `withLayout(dir, patch | fn)`, `git(dir, ...args)` (one identity, throws with git's words), `lockOf(dir)`.

Unit tests (8, green, 11 s): built once; three processes at once build once; stale lock taken over and a failed build leaves nothing; copy leaves out the used files and keeps a folder called `logs` elsewhere; the stray-path plant found; `fixture('base')` is a copy, a change to one copy not in the next, 0 stray paths, `doctor --strict` 0; `withLayout`/`lockOf`/`transcript`; `git`/`write`/`bash`.

## The rig's neutral words

`RIG_FOLDERS` (`core` = `src/core`, `engine` = `src/engine`) are added to the layout by `project()` beside the install's own folders. The nine base hooks' `worktreeCase` data (and, in `making-check` and `once-only`, the const holding `src/dsp/Gain.cpp` and `Voice::render` which only the case reads) now say `src/core`, `src/engine`, `Mixer`; nothing else in those hooks changed. `test/worktrees.test.mjs`'s own run-hooks and lesson-checks steps use them too. `test/base-neutral.test.mjs` green. The audio-core folders (`src/dsp`, `src/audio`) stay where the audio-core hooks' own cases name them.

## Importers

59 `test/*.test.mjs` import `./kit-cli.mts` now (each a one-token edit); `worktrees.test.mjs` and `worktree-twins.test.mjs` import the rig, `worktrees.test.mjs` the two cases files as `.mts`. `scripts/test-changed.mts` runs `--import ./test/fresh-tmp.mts`; `test/test-changed.test.mjs` and `test/fresh-tmp.test.mjs` follow (and fresh-tmp's test checks the new env).

## For the lead

- `package.json` `test` script, exact line: `"test": "node --import ./test/fresh-tmp.mts --test test/*.test.mjs \"test/**/*.test.mts\"",` (until then run `node --import ./test/fresh-tmp.mts --test ...` by hand; `npm run test:changed` already uses it). CLAUDE.md lines 14, 17, 18, 128 and the `test-one` command name `fresh-tmp.mjs`; the kit's docs and the `suite-once`/`quiet-test` readers may too.
- JSON ratchet: the count is now 293 (was 307); `test/json-ratchet.test.mjs` is red on `RAW_CALLS_LEFT = 307` until the lead lowers it to 293. I did not touch it.
- `packs/postgres/rules/postgres-values-are-bound.md` (frontmatter `paths:` list) still names `test/fresh-tmp.mjs` and `test/kit-cli.mjs`; the list is generated and stale (it lacks other tests), a pack file, so left for the lead (editing it is an installed-file change noop reports).
- Four base hooks' comments name `worktree-cases-commands.mjs` (`agents-held`, `look-gate`, `repo-litter`, `suite-once` `.mts`): now `.mts`; left, since the brief limited those hooks to their `worktreeCase` data.
- New emitted files: none (the tests are checked, never emitted; the nine hooks' `.mjs` change only in their case data). Installed files that change (noop will report): the nine hooks listed above.
- Types proposed for `types.d.mts`: `Checkouts { here; wt }` (rig, used by the cases), `Payload` (`Record<string, unknown>`, a hook payload as sent), `InstallLock` (`installs.mts`: `kit`, `packs`, `files`).
- Faults found: none in the kit. Note `tsconfig` in `test/` excludes `./fixtures`; `installs.mts` is still type-checked because the rig and the unit test import it (check 0 errors).
- The picker's `INSTALLING_HELPERS` already names `./kit-cli.mts` and `./worktree-rig.mts`; `installs.mts`/`fixture(` is not in it yet (W5/W6: a test that installs through `fixture(` is invisible to the "installs" row).
- A refusal met: my own `git add -A <paths>` was refused by git-guard (right; marked `f477c319`); a stray `git stash` also refused (right).

## Proofs

- `npm run build` and `npm run check`: exit 0.
- Selftests (emitted): dispatch-once 17, file-size-guard 12, folder-law 17, lesson-checks 4, making-check 40, once-only-index 6, once-only 23, placement-law 12, shape-law 59 cases, all OK.
- `test/worktrees.test.mjs`: 8 of 9 pass; the one red is the known kit-fresh case (`kit-fresh.mjs: ... runs the kit 0.0.1`), and it is the only entry in the failed list, so every other hook's case (the nine renamed among them) is green.
- `test/base-neutral.test.mjs` 2/2, `test/test-changed.test.mjs` 7/7, `test/fresh-tmp.test.mjs` 3/3, `test/install.test.mjs`, `test/new.test.mjs`, `test/configs.test.mjs` green through `--import ./test/fresh-tmp.mts`, `test/repo-lint.test.mts` 7/7, `test/unit/fixtures/installs.test.mts` 8/8.
- `npm run test:changed -- --base work/2.0.0-typescript` (`/tmp/w4-test-helpers-tc.txt`; 65 of 146 files, 543 tests: 537 pass, 6 fail). Fails: the known ones (house's two, no-personal-name, worktrees' kit-fresh, kf-refusals KF-21) and the JSON ratchet's count (293, above). sub37-wb was not picked.

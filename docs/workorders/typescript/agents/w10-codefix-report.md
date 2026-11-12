# W10 code fixes (branch work/2.0.0-ts-w10-codefix)

Choices taken unattended, as recommended: fix only what is local, safe and testable without touching installed hook files (an installed
file change moves the per-version manifest and needs a worktree case and selftest); everything wider is listed as staying, with why.

## 5d2e436 (test:changed caps its tests at a third of the cores)
- Test added: `test/integration/test-changed.test.mts`, "a planted BUILDQ_CORES=16 does not raise the tests past a third of the cores"
  (expects `--test-concurrency=<coreBudget({}, {})>`, 6 on this 18-core Mac). Committed first, then `scripts/test-changed.mts` set to
  the version from 5d2e436^ and built: the test went RED (`--test-concurrency=16`); put back from HEAD, built: green (concurrency 6).
- For the lead to log and close as a KWB: cause, the gate took `BUILDQ_CORES` (the build queue's number, 16) as its test concurrency;
  fix, 5d2e436 (a cap of a third of the cores, `CLAUDE_PACKS_TEST_CORES` raises it); caught by that test.

## Findings
| # | Result |
|---|---|
| 1 | Theirs for the most part: `resident/lifecycle.mts` and `resident/selftest-rig.mts` are in the other agent's files. Stays for the lead: one `alive` (EPERM is alive) exported from `daemon-find.mts`, imported by `lib/daemon-cli.mts`, `lib/doctor-daemon.mts`, the resident files, with an EPERM selftest case. |
| 2 | Stays: touches `json.mts` plus about 36 sites across installed hooks (some in no-find, once-only, template-law's neighbours); a sweep of installed files moves the manifest and needs the shape-model array decision. For the lead as one step. |
| 3 | Stays, needs `types.d.mts` (not mine to edit). Types the lead needs: `Layout.guards?: LayoutGuards` with `git`, `build`, `buildq`, `smoothing`, `codeShape`, `content`, `logs`, `time`, `images` each an optional interface, and `Layout.paramIds?: { extensions?: string; patterns?: string[] }`. |
| 4 | Fixed in part (commit "W10 code fixes ..."): `lib/sync.mts` `leaveOut` now reads `config.leaveOut ?? []`, no cast. Stays: `preambleOf` (the configuration JSON is user-authored for custom packs, so its re-validation is deliberate); `ts-project.mts`, `install-block.mts`, `coverage.mts` casts wait for finding 2's `asRecord` and the `Settings` type. |
| 5 | Stays: new `places.mts` is an installed hook lib plus nine call sites, including `resident.mts` (other agent). |
| 6 | Stays: `sha256`/`tmpKeyed` in hooks lib is an installed-file change, with callers in `repo-index.mts` and `dup-index.mts` (other agents). |
| 7 | Stays: a sweep of about 20 sites, several in installed hooks (`once-only`); for the lead after the other agents land. |
| 8 | Stays: `elements.mts`/`dup-index.mts` (dup-index is the other agent's); `sourceFiles` has to be designed with both. |
| 9 | Stays: `hook-log.mts` `stamp` is shared with `resident/lifecycle.mts` (other agent), and `run-hooks.mts`/`shell-writes.mts` are installed files. |
| 10 | Stays: splits of installed files (`git-guard`, `shell-writes`, `program-writes`, `types.d.mts`) or the other agent's (`dup-index`); `bin/claude-packs.mts` (282) and `pack-template.mts` (250) are not over 300 and the split is a larger move than this step. |
| 11 | Stays: lexer state machines need a test first; `startPool` is in `resident/` (other agent). Not started. |
| 12 | Stays: `JSON.parse` in `global-hook.mts` is by design (global is a separate install); the rest touches installed `git-guard.mts` and `switches.mts` behaviour. |
| 13 | Fixed in part: dead `templateText` removed from `lib/workorder.mts`; `export` dropped from `alwaysPacks`, `chosenPacks`, `packFits`, `classTimes`, `sharedWords`, `takeOver`, `strayEmitted` (each checked with `git grep -nw` to have no other importer). Stays: the hook-module exports (`once-only`, `no-find` are the other agent's; hook constants are read by selftests in other files) and the unused types. |
| 14 | Fixed in part: `scripts/release-state.mts` push patience is `GIT_STEP_PATIENCE_MS`. Stays: one `MAX_SOURCE_BYTES` (`elements.mts` and `dup-index.mts`, which is the other agent's). |
| 15 | Fixed: `proxy/daemon.go` a pipe closed without a word now sends "no word from the daemon: <err>" instead of an empty line; `main.go` and `client.go` sites each carry a comment saying why the error is dropped (fail-open by contract, or Marshal of a plain map cannot fail). No log line added: a hook's stderr reaches the user. Go tests were not run beyond the build. |
| 16 | Stays: a new `shell-writes-cli.mts` entry is a new installed file (pack.json, manifest, worktree case) and `shell-writes.mts` is an installed lib; do with finding 10. |

## Checks
- `npm run build` green; `node scripts/counts.mts --check` ran (no installed file changed).
- `test:changed -- --base work/2.0.0-typescript`, once, on the committed work: 134 of 344 test files, 703 pass, 2 fail. Both are the same
  case: `git-guard` selftest "kept Stop look: within about a second of GitHub, never its 3 s (got false, wanted true)", seen in
  "git-guard: its selftest passes in an install" and "the house hooks pass their selftests". I did not touch git-guard; the case is a
  wall-clock bound to GitHub, and ran while two other agents' gates shared the machine (the test took 88 s). Not caused by this
  change; not re-run (the rule: one run). For the lead: re-run the git-guard test on a quiet machine, and if it is red there it belongs
  to the git-guard `undefined/<name>` agent.

DONE_WITH_CONCERNS: two load-sensitive git-guard selftest reds (above); most findings stay (listed above, with why); the 5d2e436 test is in and seen red. Report: docs/workorders/typescript/agents/w10-codefix-report.md

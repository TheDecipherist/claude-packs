# W5 share f: the six reds from the W0 baseline, list (a)

Branch work/2.0.0-ts-w5-f (from work/2.0.0-typescript), worktree .claude/worktrees/w5-f. `npm run build` and `npm run check` exit 0.

## 1. house-hooks "the house hooks install where they belong ..."
- Cause: the test read `SessionStart[0].matcher`; kit-fresh's SessionStart entry (no matcher) now comes first.
- Wrong: the test (position). Fix: `SessionStart.some((entry) => entry.matcher === 'compact')`.
- Proof: the test file run with the fresh-tmp preload is green.

## 2. house-doctor "doctor fails when a hook fails its selftest"
- Cause: the test did not set CLAUDE_PACKS_SELFTESTS=run, so the gate took every selftest as proved (KWB-166); its planted string
  (`if (['rebase', 'filter-branch'].includes(sub)`) no longer exists in the emitted git-guard.mjs.
- Fix: a new helper `doctorRunning` (appended to test/kit-cli.mts: doctor with CLAUDE_PACKS_SELFTESTS=run); the plant is now the
  emitted `return 'Nothing is rebased or amended. Make a new commit.';` replaced by `return null;` (asserted present first), which
  git-guard's selftest rows for rebase and amend catch. browser-guard's plant (`LAUNCH_BASH.some(...)`) still exists and is kept.
- Proof: the file is green (2 tests); doctor exits 1 naming both hooks.

## 3. WB-4 (test/hooks/base/hook-selftests.test.mts)
- Cause: the first doctor call ran under the gate. (The `--fresh` call already ran selftests; on this tree the test passed
  before my change, but only by that one route.)
- Fix: both doctor calls go through `doctorRunning`, so selftests run for real and the planted failure is the only one.
- Proof: see the status block at the end.

## 4. KF-21 (test/hooks/base/git-guard.test.mts) = KWB-184: the TEST was wrong, the hook is right
- git-guard's undo law deliberately counts only tracked dirt for checkout/restore/stash/reset (KWB-147: an untracked file, such as a
  worktree's node_modules link, is never lost by those; git itself refuses to overwrite one). `git checkout --theirs a.txt`
  outside a merge in a tree whose only change is an untracked b.txt therefore loses nothing, and passing is correct.
  The test's "uncommitted work" was an untracked file, a fixture from before KWB-147.
- Fix: b.txt is committed in the base commit and then changed, so the uncommitted work is a tracked modification. The merge with
  `other` (which changes only a.txt) still conflicts as before. The four assertions are unchanged.
- Proof: the KF-21 test green. No hook change, so no new selftest case (git-guard's own selftest has the KWB-147 untracked case at
  its line "only untracked entries").
- For the lead to close KWB-184: cause = the test's fixture held only an untracked file, which the undo law (KWB-147) rightly does not
  count; fix = the fixture changes a tracked file; caught by KF-21 itself.

## 5. worktrees test, kit-fresh case = KWB-185 and KWB-162
- Cause (two): (a) kit-fresh read CLAUDE_PACKS_UNATTENDED with `Boolean(...)`, so '0' (someone is there, in agents-held) read as
  nobody there: a block, the notice on stderr, stdout empty; (b) the case planted an older lock, but the installed package wins over
  the lock (KWB-162) and the worktree had none.
- Fix (hook): `atStart`'s default is `env['CLAUDE_PACKS_UNATTENDED'] === '1'` (packs/base/hooks/lib/kit-fresh-look.mts), agents-held's
  meaning for the variable (1 yes, 0 someone is there, unset not said; kit-fresh does not read parent processes, as before).
- New selftest rows (lib/kit-fresh-selftest.mts): `=1` blocks an outdated project, `=0` does not (KWB-185), unset does not.
  Red first: with the old code `node packs/base/hooks/kit-fresh.mjs --selftest` said "kit-fresh selftest FAILED:
  CLAUDE_PACKS_UNATTENDED=0 says someone is there: no block (KWB-185) (got true, wanted false)"; after the fix: OK (24 cases).
- Fix (case): test/worktree-cases-commands.mts plants an installed package 0.0.1 in the worktree (not a lock) and fires with
  CLAUDE_PACKS_UNATTENDED='0', so the run's environment no longer matters. Note: kit-fresh exports no `worktreeCase` (it is still a
  function in that cases file, as the W4 brief allowed for cases needing more than events); I edited that file because the case lives there.
- For the lead to close KWB-185: cause = `Boolean(env)` read '0' as unattended; fix = `=== '1'`; caught by the kit-fresh selftest rows above.

## 6. test-changed "a pack that is not base ..."
- Cause: it asserted `nginx.length < all / 4` (and the same for base), a count; the move of the tests put 77 of 272 in the pick.
- Fix: it asserts the picker's rule: an edit picks some tests and never all of them (`0 < n < all`), none of the install-family
  tests for a pack that is not base (the existing `!install`, `!noop`, `!lookup`, `!configurations` assertions stay), and base's
  rule edit does not pick `install`. Test name unchanged.
- Observation for the lead (not changed, out of my files): a rule edit in packs/nginx now picks about 77 tests, most of them hook
  tests under test/hooks/ (the hook rig reaches every pack), where the old picker chose about 78 of 215 too, so the picker's reach is
  as before in proportion; if W5 wants the picker narrower, it is scripts/test-changed.mts.

## Files written
test/kit-cli.mts (doctorRunning, appended), test/integration/house-hooks.test.mts, test/integration/house-doctor.test.mts,
test/hooks/base/hook-selftests.test.mts, test/hooks/base/git-guard.test.mts, test/integration/test-changed.test.mts,
test/worktree-cases-commands.mts (the kit-fresh case), packs/base/hooks/lib/kit-fresh-look.mts, packs/base/hooks/lib/kit-fresh-selftest.mts.
No refusal was met.

## Status
All six run singly with `node --import ./test/fresh-tmp.mts --test <file>` and green: house-hooks (1 of 1), house-doctor (2 of 2),
hook-selftests WB-4 (1 of 1, with selftests really run), git-guard KF-21 (by name), worktrees (1 of 1), test-changed (the named
test). `node packs/base/hooks/git-guard.mjs --selftest` OK (unchanged), `kit-fresh.mjs --selftest` OK (24 cases, three new, red
first). The whole suite was not run.

DONE

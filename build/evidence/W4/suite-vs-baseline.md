# W4: the whole suite after the last merge, against W0's baseline

Run: `node .claude/tools/quiet-test.mjs npm test` on work/2.0.0-typescript at b7f6d2c (W4's last merge and its copy work),
output in `full-suite.txt`. Load average 10.1 at the start (the machine is shared; the order lowered agent waves for it).

| | W0 baseline | W4 | difference |
|---|---|---|---|
| tests | 637 | 926 | +289: the unit tests W2 to W4 added (test/unit/lib, test/unit/hooks-lib, repo-lint's gates, count-copies) |
| pass | 630 | 918 | +288 |
| fail | 7 | 8 | +1, then fixed: see below |
| cancelled, skipped | 0, 0 | 0, 0 | |
| wall (node duration_ms) | 753 s | 1,002 s | +249 s: more tests, and load 10 against the baseline's quieter machine; W5 owns the suite's time (under 180 s) |

## The reds

The seven baseline reds, each red for its baseline reason (build/evidence/W0/baseline.md, list (a)):

1. house "the house hooks install where they belong ...": `SessionStart[0].matcher` undefined, wanted `compact`.
2. house "doctor fails when a hook fails its selftest": doctor takes the selftests as proved under the gate (KWB-166).
3. sub37-wb "WB-4 ...": "43 of 43 taken as proved by the gate" (the same cause; 40 at baseline, three hooks split since).
4. json-ratchet: at baseline 550 against 547 (rose); here 279 against 282 (fell: the test asks for the cap to be lowered).
   Lowered to 279 in 8be5c4b; green.
5. kf-refusals "KF-21 ...": `git checkout --theirs` outside a merge exits 0, wanted 2.
6. no-personal-name: the order's own files (PROMPT.md's yes line and writing-skill name, workorder.md, the surveys and probes).
7. worktrees: kit-fresh's case wants "runs the kit 0.0.1" from a planted lock (KWB-162).

One new red, fixed:

8. repo-lint "gate 3b: git tracks no file it ignores": wave 4's commit (c2e5068) named the four deleted `.mjs` in its paths after
   the build had emitted them again, so git recorded the emitted files (KWB-179's slip, caught by the gate made for it).
   Untracked in 8be5c4b; the lint and the ratchet 8 of 8 green.

So after 8be5c4b: the baseline's seven, less the ratchet = six reds, every one present and named at W0; none new.

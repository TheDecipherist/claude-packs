# w11-ab report: W11 item 0, the five tasks compared with the originals

Result file: `docs/workorders/typescript/ab.md` (tracked copy) and, in this worktree, `build/evidence/W11/ab.md` for the lead to copy into the main checkout's `build/evidence/W11/`. Status: DONE_WITH_CONCERNS.

## What was made

- `ab.md`: the five tasks (macdsp, looks, settings, presets, developer), each with the original's numbers beside the new run's: gates by name, files changed and the diff read file by file with a better, equal or worse verdict and the reason, turns, tokens (input, output, cached read and write), wall, hook waiting, refusals and retries; the kit-side logs; the turns lost to KWB-215; five-task totals; second runs; the sample-not-proof statement.
- Gate runs, one clone at a time under the governor, through each clone's `quiet-test.mjs` (output and `TASK-gates.json` in `build/evidence/W11/gates/`; the json is the format `ab-compare` reads). The rows were made with `scripts/ab-compare.mts` (`build/evidence/W11/rows/`), the extra measures with scratch readers in `build/evidence/W11/ab-measure/` (they call `summariseTranscript`).

## Findings the lead needs

1. One task is worse than the original: looks. Its three dark-theme look gates (and twins) fail where the original passed all five of its gates. The new run measured the dark pictures per side, found eight uniform depth amounts cannot fit them, and left the gates red on purpose; the original pooled the four sides and held one row out. No kit fault is shown to cause it. The order's "0 tasks where 2.0 failed a gate the original passed" is therefore not met until looks is run a second time; none was made here.
2. The runs used the tarball packed before the KWB-215 and KWB-216 fixes (packed 2026-11-12 17:09; fixes committed 2026-11-13 00:15). KWB-215 cost 53 repair turns in macdsp (19), looks (25) and settings (9), of 860 turns in all, plus 4 likely in presets and developer; 14 send-backs in all. KWB-216 shows as 49 "not judged (over time)" events in the four governed runs that have a crash log.
3. The transcripts differ from the lead's hand-over note on one point: macdsp's new run was Opus (as its original), the other four Sonnet. `ab.md` says so in the macdsp row and in the method section.
4. The lead's saved stream-json transcripts give only a few percent of the output tokens and no hook durations. `ab.md` uses the session transcripts under the home folder's `.claude/projects/` for the clones (named in the file), which are the same kind of file the original records came from.
5. Side effect: running macdsp's two unmeasured licence gates (`licence_starts`, `full_equals_development`, to see whether they pass) wrote their throwaway key files into a `keys` folder in the Mac user's home, which is the known B-104 fault of those gates. Nothing else was written outside the clones and the worktree. The files are left, in case the folder held others; the lead may remove the ones the gate made (`ours.private`, `ours.public`, `render.licence`, `other-key.licence`, `other-machine.licence`, `altered.licence`, `development.raw`, all stamped 2026-11-13 00:25). Both gates fail, as they do not pass for the original either (open on B-103 and B-104).
6. Proposed rows for `workflow-bugs.md` are in `ab.md` under "Proposed workflow-bugs rows": notes to add to KWB-215 and KWB-216, and two candidate false-refusal rows (shape-law reads a number with a unit, a step of one, and a plain queue type as instances: 11 refusals; template-law and a C++ lesson check false reads), each to be checked against 1.9 first.

## Numbers (five tasks, original against new; details in `ab.md`)

Turns 987 against 860; tokens in 2,039 against 1,777; out 691,571 against 691,478; cached read 121.2 million against 228.8 million; cached write 4.05 million against 2.45 million; wall 10,043 s against 10,296 s; hook waiting 98 s against 19 s (the transcript measure); refusals 53 against 57; retries 50 against 57. Gates: macdsp 7 of 7, presets 2 of 2 runnable, developer all pass (2 of the original's 4 names renamed into passing parts), settings 8 pass with nothing measured in the original, looks 2 of 5.

## Open

- Looks second run (required), settings second run (advisable); on the kit as it now stands.
- Diff verdicts for settings and developer were read at the level of file structure and the key files (the two implementations share the task, not the code); the line diffs are in the ab-compare rows. The macdsp, looks and presets verdicts include the key files read in full.
- The original runs were resumed and ran beside other agents; the new ones ran alone at priority 0.3: wall time and turns are not a speed test.
- No refusal was met in this agent's own work; none to mark.

## Files changed

`docs/workorders/typescript/ab.md`, `docs/workorders/typescript/agents/w11-ab-report.md`, `docs/workorders/typescript/agents/w11-ab.json`, `build.md` (the making line). Gates and checks: `npm run check` and `test:changed` were not run (no code changed, no node_modules in this worktree); the doc was checked against the repo's person-name and home-path readers by pattern.

# fx-1 (W9): findings of review/code.md

Each code fix has its test written first and seen red (new-file tests failed on the missing export, the others on the assertion), then green. Tests run: every file touched, `test/pack-content.test.mts`, `test/repo-lint.test.mts`, `test/integration/worktrees.test.mts`, `npm run check`: 196 pass, 0 fail. The ratchet file was not edited.

| # | outcome |
|---|---|
| 1 | fixed: flat windows judged by `kindOf` (7.9); test in dump-triage.test.mts |
| 2 | fixed: `--window` must be an integer >= 1, else exit 2 |
| 3 | fixed: `chanceSource` (mulberry32 with Math.imul) replaces the LCG; parity test |
| 4 | fixed: located also needs 3 matches and half the list, stated in the output |
| 5 | fixed: five-argument Float locks min,max (a third argument naming a range stays the range expression) |
| 6 | fixed by dropping the claim in release-lock's header (doctor does not run `--status`). FOR THE USER: adding `release-lock.mjs` to `STATUS_HOOKS` would make doctor fail any project with a `v*` tag and no release lock; DECIDED.md does not record that, so not done |
| 7 | fixed: `sourcesOf` prunes skipped folders while walking (withFileTypes; test makes an unreadable node_modules folder), and `releaseSnapshot` reads each source once |
| 8 | fixed: DECLARATION needs `Type(` or `Type>(`; member and reference declarations no longer match |
| 9 | fixed: `model: inherit` is no model |
| 10 | fixed: `--hash ... --ledger <ledger.md>`: a group whose hash (12 digits) the ledger text holds is known; exit 1 only for the rest |
| 11 | fixed: missing `--source` folder exits 2 |
| 12 | fixed: kind, mode, hardware, stored validated (exit 2); a timbre is free before a stored state is read (C9) |
| 13 | fixed: local refs judged only where the document has an explicit `{#id}`; a project path may not start with `/` so URLs are not projects |
| 14 | fixed: skill-log looks in the project, the cwd and each layout folder's `.claude/skills/` (no tree walk, bounded per call) |
| 15 | fixed: `minPeriod` by the prefix function, O(n) (256 KB case under 2.5 s limit; was 4.8 s) |
| 16 | fixed: modal key with its count; null unless two runs agree; `global` false when another key exists |
| 17 | fixed: `--run` scores against 20 shuffled copies, prints the chance rate, exits 1 when no more than chance; `--min` passed through (default 3) |
| 18 | FOR THE USER: skill-log, rule-log and agent-ledger are on by default (d-6 only). Making them opt-in changes pack.json `onByDefault`, which no DECIDED/SORTED line covers; left as is |
| 19 | fixed: only `resolve(root, rel)` or the same in the call's checkout counts (new `lib/logs`-free change in fault-logged.mts) |
| 20 | fixed: one file read at a time, stop at the first hit |
| 21 | fixed: windows `kindOf` calls text are skipped in the no-0x00 finding |
| 22 | fixed in part: a `module:` tag is judged when its first segment is a category or it has 3+ segments, so `module: n/a` and prose pass while `voices/acme/x` is still refused. A two-segment tag with a wrong category now passes (the trade-off) |
| 23 | fixed: usage log reads the branch from `checkoutRoot` (the cwd taken as a folder, as other hooks do) |
| 24 | fixed: `lib/logs-read.mts` holds `readJsonl` and `LOG_DIR`; no cycle |
| 25 | fixed: tests for 2, 5, 8, 9, 14 (and 23, 19, 22, 11, 12, 13, 10 and the rest) |

Extra: a first draft of 23 passed the cwd as a file, which broke worktree cwds; caught on reading and fixed (`join(cwd, 'x')`) before it was pushed on top. No hook refusals met other than git-guard's push-before-commit and once-only on a moved function (both right).

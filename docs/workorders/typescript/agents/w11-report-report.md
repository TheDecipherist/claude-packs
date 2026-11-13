# w11-report report

Status: DONE (see the end). Branch `work/2.0.0-ts-w11-report`.

## What was made
- `docs/workorders/typescript/report.md`: finished. Comparison table first (T-a to T-l with the sub rows), every step W0 to W10b with numbered rows citing evidence, W11.0 (the five tasks, looks plainly not meeting "0 tasks where 2.0 failed a gate the original passed"), W11.1 (the after, in rows), M (12 missed targets, d-36), O, K (kit logs), P (proved), N (not done), F (the user's first actions). Row (a) is the placeholder line for the lead.
- `docs/workorders/typescript/showcase.md`: ten wins, each before, after, factor, with a row citation. Written through the writing skill.
- `docs/whats-new-in-2.0.md`: as W11 item 3 lists; the misses said in their own section; written through the writing skill.
- `test/unit/lib/report-evidence.test.mts`: report cites only files that exist (build/ evidence read only where `build/evidence` is present, `REPORT_BUILD_DIR` points at another build folder), 3+ rows per step each citing a file, the twelve table rows, ten wins, 0 numbers in the two public pages without a cited row that holds the number, every M row stated in whats-new.

## Logs as read (`node bin/claude-packs.mjs logs`, main checkout, 61,278 calls, 2026-11-11T09:02Z to 2026-11-13T09:19Z)
```
61421 calls, 2026-11-11T09:02:29.173Z to 2026-11-13T09:27:40.866Z
hook                      calls refused right wrong  open fixed crash    ms
template-law              10718      91    65     4    22    71    27     1
git-guard                  7018      87    52     0    35     0     1     2
code-shape                10718      55    39     0    16    41     3     1
once-only                 10718      45    38     0     7    32    37     2
no-find                    6997      17    14     0     3     0     8    38
no-polling                 2038      16     1     1    14     0     0     0
kit-lock                  11070       4     0     0     4     0    32    83
file-size-guard           10718       4     4     0     0     4     3     1
placement-law             10718       3     3     0     0     0     2     1
secrets-guard             10718       2     2     0     0     2     6     1
untrusted-boundary        10718       2     1     1     0     2     4     0
kit-fresh                  7047       2     1     1     0     0     3     1
lesson-checks             10718       1     1     0     0     1     3     2
skill-first                7258       1     1     0     0     0     0     1
making-check                 22       1     0     1     0     0     0   271
heartbeat                 21705       0     0     0     0     0     0    23
look-gate                 13440       0     0     0     0     0     1     0
brief-guard               10826       0     0     0     0     0     3     1
inside-the-project        10718       0     0     0     0     0     2     1
folder-law                10718       0     0     0     0     0     4     1
shape-law                 10718       0     0     0     0     0     3     3
dispatch-once             10718       0     0     0     0     0     4     1
brief-guard-count          8604       0     0     0     0     0     0     0
suite-once                 6996       0     0     0     0     0     8    49
repo-litter                6996       0     0     0     0     0     4     1
once-only-index            6235       0     0     0     0     0     0     4
governor-route              750       0     0     0     0     0     1     0
agents-held                  91       0     0     0     0     0     0     0
making                       90       0     0     0     0     0     0     1
reuse-hint                   90       0     0     0     0     0     0    43
making-check-count           14       0     0     0     0     0     0   306
fixed: the same file passed the same hook later in that session. Judge the open ones: `logs refusals --open`, then `logs mark <id> right|wrong "<why>"`.
```
Totals from the table: 331 refused, 222 right, 8 wrong, 101 open; 159 crash records.

## Notes
- The factors in the report that the evidence files do not state (14.6x, 31.8x, 78.9x, 11.8x, 4.0x fewer processes) are division of the measured numbers.
- Settings migration text in the report (section F) is from the W8 agent reports, not re-run.
- The report's 1.9.0 totals carry two stalls; the trimmed factor (6.1x) is given beside the 7.7x.

# W4 slice w4-hooks-a: report

Branch `work/2.0.0-ts-w4-hooks-a`. Eight base hooks moved onto the hook contract (`hook(event, ctx)` returning a Verdict).

## Per hook

| hook | before | after | role | notes |
|---|---|---|---|---|
| untrusted-boundary | 54 | 70 | judge | `judgeVerdict`; write trap row; data worktreeCase |
| template-law | 150 | 199 | judge | project/folder from `ctx`; its repo index is in the system temp folder (not the project); data worktreeCase |
| inside-the-project | 160 | 175 | judge | `Where {root,cwd,home}` from `ctx.projectDir/cwd/env.HOME`; not `judgeVerdict` (it judges commands that leave the project); data worktreeCase plus the real-`git worktree add` part left in worktrees |
| reuse-hint | 76 | 98 | judge | `say(...)` on stdout; selftest adds two rows through the runner; worktree case stays a function (it asserts stdout) |
| skill-first | 125 | 140 | judge | marker file in tmp removed (see split); worktree case stays a function (layout merge plus transcript) |
| kit-fresh | 52 | 53 | judge | SessionStart notice is `say`; `--check` is a flag handler (`contextOf`, `writeVerdict`); write trap over the project's files (its fetch moves only `.git`, its npm answer is kept in the user's cache folder) |
| brief-guard | 105 | 64 | judge | split, see below |
| making-check | 254 | 65 | judge | split, see below |

## Judge and recorder splits (the two hooks that wrote)

- brief-guard wrote `.claude/usage.log` as it refused. Now `brief-guard` (judge) and new `brief-guard-count` (recorder, PreToolUse, same matchers, listed after it) both read the event through the new `lib/brief-findings.mts`; the recorder writes the same line (`logRefusal(..., 'brief-guard', concepts)`), so `shape` reports are unchanged. It re-reads the event (cheap).
- making-check wrote its send-back counter (a per-session file in TMPDIR). Now `making-check` (judge) only reads it (`endsTheTurn`) and new `making-check-count` (recorder, Stop, listed after the judge) writes it (`recordSendBack`). Both use `lib/making-check-turn.mts` (`check`), so the recorder runs the check a second time at Stop: a doubled cost at Stop, to be measured by doctor (concern). The recorder must run after the judge (pack.json order).
- skill-first kept a marker in tmp after a skill was found, to save re-reading a transcript. Not split: the marker is dropped (the transcript is read only when a source file is named). Behaviour is the same, slower only in that case.
- kit-fresh: kept as a judge; its look is cached outside the project (npm answer, git fetch). A concern, not a split.

## Files

New sources: `packs/base/hooks/{brief-guard-count,making-check-count}.mts`; hook libs `lib/{brief-findings,making-concepts,making-check-turn,send-backs}.mts`. making-check split: hook 65, `making-check-turn` 193, `making-concepts` 80 lines. Selftest modules changed: `lib/{kit-fresh,skill-first,making-check}-selftest.mts` (write-trap rows; making-check's takes the recorder path and runs it after the judge). `pack.json`: `role` on every row of the eight hooks, two new recorder rows (brief-guard-count in both brief-guard groups, making-check-count in Stop), both added to `onByDefault`. Shebang lines dropped (the repo lint reads line 1 as work at import).

Tests changed: `test/worktree-cases-commands.mjs` (caseFrom entries for untrusted-boundary, template-law, brief-guard, brief-guard-count, making-check, making-check-count; inside-the-project runs its data case then its beside-worktree case), `test/worktrees.test.mjs` (the four moved entries removed), `test/kf-refusals.test.mjs` (`conceptsIn`/`unknownConcepts` now from `lib/making-concepts.mjs`, fixture through `normaliseShape`; they take a loaded shape now).

Signatures: `check(event, cwd)` in making-check is now `check(event, ctx)` in `lib/making-check-turn.mts`; `makingLines(root, project)`. The old `making-check.mjs` exports (`conceptsIn`, `unknownConcepts`, `makingLines`, `check`) are gone from the hook; the only importer was kf-refusals.

New emitted files (for `.gitignore`): `packs/base/hooks/{brief-guard-count,making-check-count}.mjs`, `packs/base/hooks/lib/{brief-findings,making-concepts,making-check-turn,send-backs}.mjs`.

## Proofs

- `npm run build`, `npm run check`: exit 0. Repo lint: 7 pass.
- Selftests: untrusted-boundary 9, template-law 27, inside-the-project 17, reuse-hint 12, skill-first 16, kit-fresh 21, brief-guard 23, brief-guard-count 5, making-check 40 (with the recorder run after each Stop), making-check-count 4, run-hooks 19. Each judge ends on the write-trap row.
- `test/worktrees.test.mjs`: the only red is the known kit-fresh case.
- `npm run test:changed` (`/tmp/w4-hooks-a-tc.txt`): known reds not mine: house two (`compact`, doctor-selftest), KF-21, worktrees kit-fresh. Reds caused by the two new hooks, for the lead to settle at the merge (README, site, fixtures and the kit's own install are shared files that other slices also edit): readme.test (pack row counts base 25 -> 27; table rows for `brief-guard-count` and `making-check-count`), site.test (hook count 46 vs 48), noop (stellix, sub37, full-stack, config-key: expected settings.json fixtures and lists need the two new run-hooks entries), the kit repo's own `.claude/` install test (needs `update`). kf-refusals KF-19/39/24 fixed by the test change above (rerun: only KF-21 left).

## Faults and proposals

- `excludeGlobs`/`judgeCopyWrites`/`scan` take `ShapeManifest | null` but `readShape` returns `LoadedShape`; making-check passes `{ concepts: {}, exclude }`. Propose in types.d.mts: `Pick<ShapeManifest, 'exclude'>` for those parameters.
- Proposal: `LoadedShape`-taking functions `conceptsIn`/`unknownConcepts` are typed `Pick<LoadedShape, 'concepts'>`; the old code accepted a raw manifest by accident.
- Worktree cases left as functions (need stdout, a layout merge or a real git worktree): reuse-hint, skill-first, kit-fresh, and inside-the-project's beside-the-project write.
- No other faults found. No refusals needing a mark besides template-law and code-shape refusals on my own drafts (right: a long line, a name clash, a copied case; all fixed in the draft).

# Session 2, wave 2: two agents (KWB-199, W10's ledger)

The order is `docs/workorders/typescript/workorder.md`, run unattended from its `PROMPT.md` (read its constraints). The rules
for every agent are those of `briefs/S2-wave1.md`, section "Rules for every agent", with your own name and branch; they hold
here word for word. Your own section below says what is yours.

## kwb199: refill a slot as each agent returns

Read `workflow-bugs.md` row KWB-199 and the measurement `build/evidence/KWB-199/summary.md` in the main checkout
(/Users/tim.clausen/projects/claude-packs/build/evidence/KWB-199/; copy the summary and `marks/` into your worktree's
`build/evidence/KWB-199/` so the branch carries them). The measurement: a background agent lives while the lead's turn is open,
and its completion reaches the lead at its next tool-call boundary; an agent still running when a `claude -p` turn ends is
stopped (KWB-124).

1. `packs/base/hooks/agents-held.mts`: in a run with nobody there, a background agent is allowed; ending the turn is what is
   refused. At `Stop`, read the session's transcript (`event.transcript_path`) and refuse the stop while any agent this session
   started with `run_in_background: true` has not returned (no task notification for it, no result), naming each by its
   description and telling the lead to keep working or wait in the foreground; pass when none is pending, when someone is there
   (`unattended` false), and when `stop_hook_active` is true after a first refusal only if the agents are still pending (say so:
   never let a turn end on a pending agent). Read a real transcript's shapes first: the main checkout's session transcripts
   under `~/.claude/projects/-Users-tim-clausen-projects-claude-packs/` hold background launches and task notifications
   (read only; put a small anonymised sample under `test/fixtures/` for the test, every path and name replaced). Register the
   Stop event in `packs/base/pack.json`. Selftest cases: a pending background agent refused at Stop, a returned one passes, a
   foreground one never counts, a background start in an unattended run now passes at PreToolUse, someone there passes; each
   seen red first. Its worktree case stays green.
2. `packs/base/rules/agents-held.md` and the `run-a-workorder` skill (`packs/base/skills/run-a-workorder/SKILL.md`, under
   8,000 characters, its description unchanged in kind): split a wave into agents of similar size and a long list across several
   agents, never one; a lead with its own work may start a wave in the background and keep the turn open with short calls of its
   own, merging and refilling each slot when its notification arrives; a foreground agent hides the notifications until it
   returns; never end a turn with an agent running. Cite KWB-199 and the evidence path.
3. Note in your report the README cell or count that moves (the lead writes README.md).

## w10-ledger: every W10 finding with its fix or why it stays

W10's Done when: every finding is written in `progress.md` with its fix or why it stays, 0 left blank; each CARRY row of
`workflow-bugs.md` names the step that touched its files and the test that holds the behaviour it describes. The findings are in
`docs/workorders/typescript/review/w10-code.md`, `w10-rows.md`, `w10-tests.md` and `w10-types-proposal.md`; the fixes are in
`agents/w10-codefix-report.md`, `w10-codefix2-report.md`, `w10-rowfix-report.md`, `w10-testfix-report.md`, `kwb201-report.md`,
and the commits on `work/2.0.0-typescript` (`git log`). For each finding, check the current tree (read the code, run the test it
names if one is named and cheap): fixed (the commit and the test that holds it), or stays (why, tagged `[deferred]` with who and
why, or `[gap]`). Write the result to `docs/workorders/typescript/review/w10-ledger.md` in your worktree: one line per finding,
`- W10 <file>#<n>: <finding, one clause> -> fixed in <commit> (<test>) | stays: [deferred|gap] <why>`, then one line per CARRY row
(find them in `workflow-bugs.md`; the order calls them "the 11 CARRY rows"), `- CARRY KWB-<n>: touched by W<n> (<files>); held by
<test> | no test: <why>`. Count the findings in each review file and write the totals at the top; 0 may be blank. This is
read-and-write-one-file work: write nothing but `w10-ledger.md` and your status file. Gate: none beyond `git diff --stat` showing
only those files.

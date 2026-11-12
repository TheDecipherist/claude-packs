# Session 2, wave 2: four agents (KWB-199, the budgets, W10's rows left, W10b's review); the lead writes W10's ledger

The order is `docs/workorders/typescript/workorder.md`, run unattended from its `PROMPT.md` (read its constraints). The rules
for every agent are those of `briefs/S2-wave1.md`, section "Rules for every agent", with your own name and branch; they hold
here word for word. Your own section below says what is yours.

## kwb199: refill a slot as each agent returns

Read `workflow-bugs.md` row KWB-199 and the measurement `build/evidence/KWB-199/summary.md` in the main checkout
(`build/evidence/KWB-199/` there; copy the summary and `marks/` into your worktree's
`build/evidence/KWB-199/` so the branch carries them). The measurement: a background agent lives while the lead's turn is open,
and its completion reaches the lead at its next tool-call boundary; an agent still running when a `claude -p` turn ends is
stopped (KWB-124).

1. `packs/base/hooks/agents-held.mts`: in a run with nobody there, a background agent is allowed; ending the turn is what is
   refused. At `Stop`, read the session's transcript (`event.transcript_path`) and refuse the stop while any agent this session
   started with `run_in_background: true` has not returned (no task notification for it, no result), naming each by its
   description and telling the lead to keep working or wait in the foreground; pass when none is pending, when someone is there
   (`unattended` false), and when `stop_hook_active` is true after a first refusal only if the agents are still pending (say so:
   never let a turn end on a pending agent). Read a real transcript's shapes first: the main checkout's session transcripts
   under `~/.claude/projects/` (the folder named for this checkout's path) hold background launches and task notifications
   (read only; put a small anonymised sample under `test/fixtures/` for the test, every path and name replaced). Register the
   Stop event in `packs/base/pack.json`. Selftest cases: a pending background agent refused at Stop, a returned one passes, a
   foreground one never counts, a background start in an unattended run now passes at PreToolUse, someone there passes; each
   seen red first. Its worktree case stays green.
2. `packs/base/rules/agents-held.md` and the `run-a-workorder` skill (`packs/base/skills/run-a-workorder/SKILL.md`, under
   8,000 characters, its description unchanged in kind): split a wave into agents of similar size and a long list across several
   agents, never one; a lead with its own work may start a wave in the background and keep the turn open with short calls of its
   own, merging and refilling each slot when its notification arrives; a foreground agent hides the notifications until it
   returns; never end a turn with an agent running. Cite KWB-199 and the evidence path.
   The split sentence is already in both (W10 rowfix, held by `test/hooks/base/agents-held.test.mts` "says to split a wave"):
   keep it and its test, and add the background mode.
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

## budgets: doctor --strict green on the kit's own live install

`node bin/claude-packs.mjs doctor --strict` in the main checkout is red on the budgets (its output:
`build/session2/doctor1.txt` in the main checkout; the live log is the main checkout's `.claude/hooks.log`, read
only). Every slow call is a `git commit`, `git push`, `git merge` or `git add` Bash call, or the first event after the daemon
starts:
- git-guard at Pre Bash 1,201 to 2,082 ms on commit and push: law 9 asks GitHub (`git ls-remote --heads`, lib/remote-heads.mts
  `remoteHeads`) when its kept look is older than a minute (agents/kwb201-report.md, section 3). Make the event never wait on the
  network: the local remote-tracking refs (which every push and fetch updates) answer the law, and the GitHub look is refreshed
  detached (as the Stop path's `refreshLater` already does) after a push or a commit; say in your report what the law can then
  miss and why that is acceptable, or keep a network look only where the law cannot be judged without it.
- kit-fresh at Pre Bash 126 to 835 ms on the same calls: find what it does there (a child process, a registry look) and make the
  event read a kept answer, refreshed detached.
- repo-litter at Pre Bash up to 187 ms on `git add`: find the cost (a `git` child, file sizes) and keep it within 10/50 ms p50/p95,
  worst 200.
- template-law 1,516 ms on the first Pre Write or heredoc after a daemon start (its index built on that call; agents/rss-report.md
  item 3): build the daemon's indexes when the daemon starts, in the background, so no event waits on the build (an event that
  comes before it is ready is judged by the one-shot path, as today with no daemon).
- once-only-index at PostToolUse 120 to 148 ms on Edits in a worktree under `.claude/worktrees/` (the daemon holds only the main
  checkout's index): find the cost and bring Post under its 60/150 ms budget, for instance by answering a Post event before its
  recorders finish, if the protocol allows it (read the daemon's event code and say what changes).
Measure each before and after by driving the scratch rig (`test/integration/proxy-fire-rig.mts`, `live-event-speed.test.mts`) with
the same commands; each fix gets a test or selftest case seen red first. Never run the main checkout's daemon or change its install;
the lead updates it after the merge.

## w10-rows2: the three W10 rows left (replaces w10-ledger, which the lead does)

`review/w10-rows.md` recommends fixing three open rows of `workflow-bugs.md`, and `agents/w10-rowfix-report.md` left them for lack
of time. Fix each with its test red first: KWB-137 (`inside-the-project` refuses the main checkout's `git -C` that git-guard's Stop
demands when a session starts in a worktree: the main checkout that encloses a worktree root counts as inside); KWB-135 (`idle-wake`
switched on alone imports the opt-in `user-asks` and crashes: make the import soft, or a hook-level `needs` in `pack.json` read by
`lib/switches.mts`, whichever is smaller); KWB-115 (`protect-vendor` refuses clearing a declared build output: a `delete` of a path
under a declared `buildOutput` passes, a write into it still refused). Each in its own commit; report each row's cause, fix and
test for the lead to close in `workflow-bugs.md`. Run `node scripts/counts.mts` and `node scripts/noop-pin.mts` if an installed
file changed, and read the noop diff.

## w10b-review: W10b item 4, an independent read of the daemon, the proxy and the sampler

You did not write this code. Read it for DRY and best practice: `packs/base/hooks/resident.mts`, `packs/base/hooks/resident/`,
`packs/base/hooks/lib/proxy-wire.mts`, `packs/base/hooks/lib/daemon-find.mts`, `packs/base/hooks/lib/child-group.mts`, `proxy/*.go`
(client, daemon, status, sample), `scripts/build-proxy.mts`. Questions: is there one owner for each of the framing, the socket's name,
the cache folder, the lock hash, the deadline and the process-group kill, across TypeScript and Go (a constant both languages need
should come from one table and be generated for the other, never written twice)? Is every error path closed (sockets, workers,
children, files, timers)? Is there global state outside the main thread's owners? Anything else a senior reviewer would refuse. For
each finding: file and symbol (never a line number), what is wrong, the smallest fix, its size (S, M, L). Write
`docs/workorders/typescript/review/w10b-review.md` in your worktree and nothing else (read-only work otherwise; you may run `go vet`,
`go test ./proxy/...` and read-only commands). Count the findings at the top. Note: another agent of this wave is changing the
daemon's index start and git-guard; read the code as it is on your branch.

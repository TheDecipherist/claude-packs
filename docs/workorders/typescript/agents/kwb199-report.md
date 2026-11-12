# kwb199 report: KWB-199, refill a slot as each agent returns

Branch work/2.0.0-ts-kwb199 (pushed). Status: DONE_WITH_CONCERNS (README held back for the lead; see Open).

## Made
- `packs/base/hooks/lib/background-agents.mts`: `pendingAgents(transcript)` / `pendingIn(path)`. A launch is an assistant `tool_use` named Agent or Task with `input.run_in_background: true`; it returns when a `<task-notification>` line carries its `<tool-use-id>`, or a `tool_result` for it is anything but the "Async agent launched" ack (a result, or a refused launch). A torn last line is skipped. Shapes read from the measurement's own transcript (`~/.claude/projects/...KWB-199/9e7c4803-....jsonl`); the anonymised sample is `test/fixtures/transcripts/background-agents.jsonl`.
- `packs/base/hooks/agents-held.mts`: now judges `Stop` only. It refuses while any background agent of the session is pending and nobody is there, naming each by description and saying to keep working with short calls or wait in the foreground; also when `stop_hook_active` is true (a turn never ends on a pending agent). A background start at PreToolUse now passes. Registered under `Stop` (order 10) in `packs/base/pack.json`, taken out of the PreToolUse Agent entry.
- Rule `packs/base/rules/agents-held.md` and skill `run-a-workorder` item 7 (3,101 characters): foreground wave or background wave with the turn kept open, merging and refilling each slot on its notification; a foreground agent hides the notifications; never end a turn with an agent running; the split sentence and its test kept; KWB-199 and `build/evidence/KWB-199/summary.md` cited.
- Worktree case (data and `test/worktree-cases-commands.mts`): pending Stop refused (2) in a worktree, returned passes, background start passes.
- `test/fixtures/noop/pinned-manifest.json` re-pinned (`node scripts/noop-pin.mts`: the new lib, the skill text); `packs/manifest-2.0.0.json` regenerated.

## Red then green
- Hook made to pass at Stop (plant): `node packs/base/hooks/agents-held.mjs --selftest` fails 5 cases (pending at Stop under claude -p, unattended, Task, stop_hook_active, one-of-two), output `build/evidence/KWB-199/red-selftest.txt`. Restored: 21 cases OK.
- Cases: pending refused, returned passes, result-returned passes, foreground never counts, background start passes at PreToolUse (Agent and Task), someone there passes, missing transcript passes, the real-parent `claude -p` / interactive / nearer-claude rows.
- New tests in `test/hooks/base/agents-held.test.mts`: sample transcript gives exactly one pending (`Item three`), refused launch and torn line, rule and skill text.

## Gate
`node .claude/tools/quiet-test.mjs npm run test:changed -- --base origin/work/2.0.0-typescript`, output `build/kwb199-gate.txt`: 708 tests, 7 red: noop x3 and repo-lint gate 3b (my fault, fixed: evidence committed under ignored `build/`, now untracked; the evidence stays in the worktree's ignored `build/evidence/KWB-199/`, not on the branch), and 3 counts tests red only because README.md is held back. Rerun of noop and repo-lint (`build/kwb199-gate2.txt`): 31 pass, 1 fail: "nothing names bare npx claude-packs", hit on `build/kwb199-gate.txt:653`, my own gate output quoting that test's text (not a source fault). `npm run check` exits 0.

## Open: for the lead
- README.md not touched. `node scripts/counts.mts` moves one cell: the `agents-held` row of the base hooks table, event `Agent` -> `Stop`. Its hand-written "What it does" should become: "Refuses the end of a turn in a session with nobody there (`claude -p`, a work order's runner) while an agent it started in the background has not returned: the session's end would stop it mid-work". Until README is regenerated, `counts --check` and three counts tests are red.
- The brief said the branch carries `build/evidence/KWB-199/`; repo-lint gate 3b refuses tracked ignored files, so it does not. The main checkout holds the original.
- `TaskStop` of a background agent is not read; a stopped agent normally sends its own notification.

# Session 2, wave 1: four agents (W8.6, the daemon's RSS, KWB-205, KWB-204)

The order is `docs/workorders/typescript/workorder.md` (read its W8 section: items 6 and 7 and its Done when) and its
`PROMPT.md` (read the constraints). You are one agent of a wave of four. Your own section below says what is yours.

## Rules for every agent of this wave

- Work only in your worktree, `.claude/worktrees/<name>` (an absolute path is in your prompt), on your branch
  `work/2.0.0-ts-<name>`. Start with `npm ci && npm run build` there. Push your branch from its first commit
  (`git push -u origin work/2.0.0-ts-<name>`), and after each later commit.
- Read the project's `CLAUDE.md` first. Every source is strict TypeScript (`.mts`); hooks import only from `packs/base/hooks/lib/`.
- Before your first write, add your `making:` line under `## In progress` in your worktree's `build.md`
  (`making: <what>; concepts: none (design/shape.json declares none); reuse: <function, where it lives>`).
- Keep `docs/workorders/typescript/agents/<name>.json` in your worktree: `{ "name", "step", "items", "done", "now", "updated" }`,
  written after each of your items.
- A test or plant is seen red before the fix, and the red output is kept under `build/evidence/<your id>/` in your worktree.
- Tests: only `npm run test:changed -- --base origin/work/2.0.0-typescript` (or a single file through
  `node --import ./test/fresh-tmp.mts --test <file>` while you work), never the whole suite (`npm test`), never more than one test run
  of your own at a time. Run a long run with `run_in_background` and its output in a file under `build/`, never a sleep or `until`
  loop, never `/tmp`. Every test that plants a spinning process kills it in its teardown.
- Git: `git add <paths>` by name, `git commit -m "..." -- <paths>`; never `-A`, `.`, amend, rebase or force.
- Never edit `.claude/rules`, `.claude/checks` or `.claude/hooks` (the installed copies); fix the pack's source.
- A refusal: read it; if right, fix the code; if wrong, say so in your report with its id and reason. Never route around one.
- Never change `packs/base/hooks/lib/types.d.mts`, `CHANGELOG.md`, `workflow-bugs.md`, `README.md` or the main checkout. A type
  you need there goes in your report as a proposal, or a local type in your own module.
- Before you finish: `npm run check` exits 0, `node scripts/counts.mts --check` (run `node scripts/counts.mts` if your change
  moved a count or the manifest), and `npm run test:changed -- --base origin/work/2.0.0-typescript` on your committed work, output in
  `build/<name>-gate.txt`; its result in your report.
- Write your report at `docs/workorders/typescript/agents/<name>-report.md` (commit and push it): what you made, the numbers measured
  (each with the command and evidence path), every plant with its red and green, files changed, what is open.
- End with exactly one status line: `DONE`, `DONE_WITH_CONCERNS`, `BLOCKED` or `NEEDS_CONTEXT`, and the report's path.

## w86-status: W8 item 6, the status line served by the daemon

Do W8 item 6 as the order writes it, and measure every line of W8's Done when that names it: `hook-proxy status` renders in
under 15 ms p50 over 100 renders on this Mac, the TypeScript render's time stated beside it; a planted agent shows its tool with a
clock that differs between two renders a second apart, turns `quiet 2m` (yellow) after a planted 2-minute silence, is gone after a
planted 5-minute silence with no process of its own and back on its next event, and leaves the list on its stop; a planted agent
running a 10-minute command with no event stays listed past 5 minutes and is removed 5 minutes after its processes end; a planted
SessionStart empties the list and a live agent's next event brings it back; the red dot shows on a planted older install and not on
the kit's own `work/` version; a planted network outage leaves the render under 15 ms; `refreshInterval` 1, migrated by `update`.
Use a planted clock, never real waiting. What exists: the status line (`packs/base/tools/statusline*.mts`, `lib/run-status.mts`,
`run-discovery.mts`), the daemon (`packs/base/hooks/resident.mts`, `resident/`), the Go client (`proxy/`), kit-fresh's cached look
(`packs/base/hooks/kit-fresh.mts`), and W8.7's sampler: `usageOf(owner)` in `packs/base/hooks/resident/usage.mts`
(`agentOwner(name)`, `sessionOwner(pid)`; read `docs/workorders/typescript/agents/w8-sampler-report.md` section 2) for "no CPU or
process of its own". Rebuild the proxy with `node scripts/build-proxy.mts --host` after a Go change; `go vet` and `go test ./proxy/...`
green.

## rss: the daemon's memory budget (KWB-201's open part)

W8's Done when: the daemon's RSS under 250 MB with 16 workers after 1,000 events, and the daemon with the sampler under 300 MB.
Measured so far (read `docs/workorders/typescript/agents/kwb201-report.md` section 4 and `w8-sampler-report.md` section 5): on a
scratch install, 166 MB after 1,000 events with 16 workers on the emitted `.mjs`; on a copy of the kit's own install (652 sources,
a 25 MB transcript), 372 MB after 200 events with 16 busy workers; a heap cap and an idle collection did not move it. First measure,
on a scratch copy of this repo's install under `build/` (never the main checkout's daemon), 1,000 live-like events (Bash, Write,
Edit, Read, Stop through the proxy) with 16 workers: RSS over time, per worker, and what holds it (`vmmap` or heap snapshots).
Then bring it under 250 MB there, with a test that holds it (seen red first). Options to weigh, with numbers: a worker loads only
the hooks of the events it serves; repo-sized indexes kept once on the main thread (as KWB-201 did for the duplicate index) instead
of per worker; fewer warm workers that grow on demand to 16 (the order says 16 workers, so the measure is taken with 16 alive); the
transcript reader's buffers. Do not slow a live event: Bash p50 stays under 20 ms and Write under 110 ms by
`test/integration/live-event-speed.test.mts`. If 250 MB cannot be reached, report the floor, what holds it, and the measured
options, and stop there.

## kwb205: a hook past its deadline takes its children with it

Read `workflow-bugs.md` row KWB-205 and the PROMPT's line on W8.2's deadline. Where a hook's children can outlive a deadline (the
TypeScript runner `packs/base/hooks/run-hooks.mts`, the daemon's pool and event code in `packs/base/hooks/resident/`, and the
selftest rig in `packs/base/hooks/lib/selftest.mts`), make the children killable as a group: spawned `detached` in their own process
group and `process.kill(-pid)` at the deadline, and a worker that is replaced takes its children with it. A test plants a hook
that starts a spinning child (`sh -c 'while :; do :; done'`), passes the deadline, and finds 0 of that child's processes alive
afterwards, seen red first; its teardown kills the spinner whatever happens. Look for every existing test that plants a spinner
(`grep -rn 'while :' test packs`) and make its teardown kill it.

## kwb204: polling in a sleep loop refused in every project

Read `workflow-bugs.md` row KWB-204. The refusal of `until ...; do sleep N; done` and `while ...; sleep N` polling lives in
synth-creator's `build-guard` (`packs/synth-creator/hooks/build-guard.mts`); the law is base's (`long-work-in-the-background` and
`work-inside-the-project` rules in `packs/base/rules/`). Move the polling refusal into base, as its own base hook or into the base
hook that already judges Bash commands for that law, whichever reads cleaner; synth-creator keeps no copy (build-guard calls the
shared function or drops that part). Register it in `packs/base/pack.json` with its order, its selftest (a sleep loop refused, a
plain `sleep 2` and a loop with no sleep allowed, a heredoc that merely contains the words allowed), its worktree case in
`test/worktree-cases-*.mts`, and its `tests` row. The refusal message says what to do instead: run the long command with
`run_in_background` and its output in a file inside the project. Seen red first.

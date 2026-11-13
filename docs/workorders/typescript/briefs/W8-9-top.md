# Brief: W8.9 item 4, `claude-packs top`, the terminal monitor

You build one thing, unattended: take the recommended choice for everything and record each choice in your report. Nobody answers.

Branch `work/2.0.0-ts-w89-top`, worktree `.claude/worktrees/w89-top` (already made from the order's branch; run `npm ci --no-audit --no-fund && npm run build` in it first). Work and write only inside that worktree. Read first: `CLAUDE.md`; `docs/workorders/typescript/workorder.md`, the section "## W8.9" (item 4 and its Done when); `docs/workorders/typescript/briefs/W4-slice.md` for the working rules (Write and Edit tools only, never a shell heredoc or `sed -i`; strict TypeScript, no `any`; `git add <paths>` then `git commit -m "..." -- <paths>`, push every commit; read every refusal and mark it with `node bin/claude-packs.mjs logs mark <id> right|wrong "<why>"`; no file over 300 lines; put your making line under `## In progress` in `build.md` before your first write).

## What exists, and what you build

Items 1 to 3 of W8.9 are done on the order's branch: the status line draws one row per project (`packs/base/hooks/lib/run-projects.mts`), and the stale rows are gone. Your item is the monitor: a Go program, built and shipped like the proxy (`proxy/`, `scripts/build-proxy.mts`, one binary per platform in the user's cache, the four builds in parallel, `codesign -v` on the darwin two). Read `proxy/README.md`, `proxy/main.go`, `proxy/sample*.go` and `scripts/build-proxy.mts` for how a Go binary is built, found, verified and cached; reuse them, never copy them.

`claude-packs top`, full screen in the terminal, plain ANSI (no TUI library unless `latest-versions` finds one worth a pin; a new dependency needs its row in `docs/versions.md`):

- the governor's load and grants at the top (read `packs/base/hooks/lib/governor.mts` and `claude-packs load jobs` for the file it keeps in the user's cache);
- every project with a live run or session; under each, its lead and every agent: name, step, model, worktree, CPU, memory, processes, time since its last event, and its last action (the tool and a short form of its input, from the event log: `.claude/hooks.log` and `.claude/logs/events.jsonl`);
- it reads the daemon's state over its socket once a second (the `status` request the proxy already speaks: `hook-proxy status`, `packs/base/hooks/resident/status.mts`, the agent board and the sampler's usage) and works without the daemon, from the files (`docs/workorders/*/status.json`, each agent's `agents/<name>.json`, the heartbeat files, `git worktree list`);
- keys: `q` quits, arrows move, enter opens a project or an agent (its last 20 actions), enter or `q`/escape goes back.

## The tests that prove it (red first, each seen red)

- `test/top/frame.test.mts`: a planted state (3 projects: one with 4 live agents, one with none, one stale) renders to a golden frame, every agent with its last action and the time since it; red when a field is dropped (plant it). Beside it the Go program's own `go test` (a golden frame in Go as well).
- start under 100 ms and under 20 MB resident, measured (on this Mac, with the number in your report).
- the binary builds for darwin-arm64, darwin-amd64 and linux-amd64 (`scripts/build-proxy.mts` builds them; show the three files and `codesign -v` on the darwin two).
- the command exists in `bin/claude-packs.mts`, in `prompts/help.txt`, and `node scripts/counts.mts` is run so the README's command table has it.
- the new Go files and the new `.mts` files are keys of their pack's `tests` map when they ship in a pack; `node scripts/noop-pin.mts` is run and its changed files read.

## Rules for this run (the order's PROMPT)

- Never more than one test run of your own at a time, and never the whole suite (`npm test`). Run tests with `node scripts/run-tests.mjs <files>` or `npm run test:changed`. Never a sleep loop; a long run goes in the background with its output under `build/`, never `/tmp`.
- Use `node bin/claude-packs.mjs load ask --for test` before a heavy run; the machine is shared with other projects' agents.
- Keep `docs/workorders/typescript/agents/w89-top.json` in your worktree after each item: `{ "name": "w89-top", "step": "W8.9", "items": 6, "done": n, "now": "<one line>", "updated": "<ISO>" }`.
- Log a fault in a hook, tool or test run in `workflow-bugs.md` as `KWB-next (for the lead to number)` before fixing it.
- Do not touch `.claude/rules`, `.claude/checks`, `.claude/hooks`. Do not publish, tag or merge to main. Never end your turn with a question.

When done, write `docs/workorders/typescript/agents/w89-top-report.md` (what was built, each number measured with its file, each choice, what is not done) and finish with one status line: branch, last commit, tests run and their result.

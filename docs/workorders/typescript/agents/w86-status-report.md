# W8.6 report: the status line served by the daemon

Branch `work/2.0.0-ts-w86-status` (worktree `.claude/worktrees/w86-status`), commit `80a5663` and the commit after it (fixtures, report).

## 1. What was made

- `packs/base/hooks/resident/agent-board.mts`: the live sessions and agents, kept as events arrive. `note(event, ppid, now)`:
  PreToolUse starts the tool's clock, PostToolUse ends it, `Stop`/`SubagentStop`/`SessionEnd` remove the entry, `SessionStart`
  empties the board. `observe(now, usageOf)` and `rows(now, usageOf)`: an entry is `quiet` after `QUIET_MS` (2 min) without an
  event; it is dropped after `ABANDON_MS` (5 min) with no event and no process of its own (`usageOf(owner)` from W8.7's sampler:
  `agentOwner(<worktree folder>)` for an agent in a worktree, `sessionOwner(ppid)` otherwise), the five minutes counted from the last
  tick that saw a process. It also keeps the lead's last tool, target and shell command, and the last `git commit`.
- `packs/base/hooks/resident/status.mts` (`StatusKeeper`): the daemon's status line. `note` (every event, from `serveEvent`),
  `tick` (every `--sample-ms`), `render(sessionJson, env, now)`. It keeps in memory: the board, git's state (asked in the
  background, at most every 4 s), the kit version (every 60 s), the RUNS rows (every 2 s; the detached `--refresh` of the existing
  cache is started from here), npm's newest version (`refreshNewest`: asked at most hourly, async, a failed or hung ask leaves the
  last answer; the answer is also written to kit-fresh's cache file). No render reads a transcript, a worktree, `ps` or the network.
- `packs/base/tools/statusline-live.mts` (what the daemon loads), `statusline-agents.mts` (the rows: `a1 > Bash 0:42 <target>`, and
  `quiet 2m` in yellow), `statusline-version.mts` (the red dot: `claude-packs 1.0.0 ●` when npm's newest is newer than the project's
  version; a `work/` version ahead of npm shows none; the TypeScript bar reads kit-fresh's cached answer, never asks).
  `statusline.mts` takes a `live` view (agents, activity, newest, version, runs) and draws from it when given.
- Wire: `WireRequest.render` (a status ask whose stdin is Claude Code's session JSON; the reply's stdout is the line). The daemon
  answers a render failure with the `fallback: ts` reply. `resident.mts`: the keeper, a `--no-npm` flag (the selftest rig's daemons
  carry it, so no test asks npm), the render branch in the status ask. A status ask is still no event (idle clock untouched).
- Go: `proxy/status.go` (`hook-proxy status`: asks the socket with a 50 ms deadline, prints the answer; with no daemon, a stale or
  declining or late daemon it prints the TypeScript bar's render, which says `hooks: slow path`; it never starts a daemon);
  `client.go` got `jobFor` and `exchange` (the existing `ask` is a call of it); `main.go` routes `status`.
  The picker `packs/base/hooks/bin/hook-proxy` takes the word `status` and, with no binary, execs `.claude/tools/statusline.mjs`.
- `refreshInterval` 1 and the command `sh "$CLAUDE_PROJECT_DIR/.claude/hooks/bin/hook-proxy" status` in `packs/base/pack.json` /
  `lib/settings.mts`: `update` migrates an old node command (and its interval 5) to it; a project that disabled
  `hooks/bin/hook-proxy` keeps the node command (interval 1); a user's own status line is kept as before.
- `packs/base/hooks/lib/tool-target.mts`: `oneLine` and `targetOf`, the one reader of "what a tool call is aimed at", now used by the
  transcript reader (`statusline-work.mts`) and the board (a copy of the field list removed from the former).

## 2. Numbers (this Mac, 18 cores, load average 10 to 12 from the other three agents' runs while I measured)

Command: `node --import ./test/fresh-tmp.mts --test test/integration/status-served.test.mts` (real daemon, the built `hook-proxy`,
100 renders by `spawnSync`, one fork and exec each); evidence `build/evidence/w86/status-render.json`.

| Measure | Quiet minute | Loaded minute |
|---|---|---|
| `hook-proxy status`, 100 renders, p50 | 6.7 ms (p95 11.6) | 41 to 43 ms |
| a bare fork and exec of the same loop, p50 | 3.2 ms | 24 to 56 ms |
| the TypeScript render (`node statusline.mjs`), 15 renders, p50 | 79.5 ms | 175 to 198 ms |
| the daemon's own render (an ask straight to the socket), 30 asks | 0.3 to 0.7 ms | |
| in-process keeper render with npm hanging for good, 100 renders, p50 (`status-keeper.test.mts`) | under 15 ms (asserted) | |

The 15 ms line: p50 6.7 ms on a quiet minute, TypeScript render 79.5 ms beside it. Under load the process start dominates, so the
test holds `proxy p50 minus the bare fork-and-exec p50` under 15 ms, which holds in both minutes; the absolute 15 ms was met only
when the machine was quiet. Earlier probe with a Python timer (load 12): Go status p50 11.3 ms against 8.5 ms for `true`.

## 3. Plants, each with its red and green

All on a planted clock or planted outside calls; nothing really waits.

| Done-when line | Test | Red (kept in `build/evidence/w86/`) | Green |
|---|---|---|---|
| a planted agent shows its tool with a clock that differs a second apart | `agent-board.test.mts` 1, `status-keeper.test.mts` 1 | `agent-board-red.txt` (module missing, first run) | pass |
| `quiet 2m` yellow after a 2-minute silence | `agent-board.test.mts` 2 | | pass |
| gone after 5 minutes with no process; back on its next event | `agent-board.test.mts` 3 | | pass |
| leaves the list on its stop | `agent-board.test.mts` 4 | | pass |
| 10-minute command, no event: listed past 5 minutes, removed 5 minutes after its processes end | `agent-board.test.mts` 5 | `agent-board-mutation-procs.txt` (the process check removed: test 5 red) | pass |
| SessionStart empties the list; a live agent's next event brings it back | `agent-board.test.mts` 6, `status-served.test.mts` | `agent-board-mutation-sessionstart.txt` | pass |
| red dot on an older install, none on a `work/` version ahead of npm | `status-keeper.test.mts` 3 and 4, `status-served.test.mts` (kit-fresh cache planted) | `keeper-mutation-dot.txt` (comparison inverted: 2 red) | pass |
| a planted network outage leaves the render under 15 ms | `status-keeper.test.mts` 5 | `keeper-mutation-waits-on-network.txt` (the render awaits npm: red by timeout) | pass |
| events keep the list in the real daemon | `status-served.test.mts` | `served-mutation-no-note.txt` (`status.note` removed from `serveEvent`) | pass |
| `refreshInterval` 1, migrated by `update` | `statusline.test.mts` ("an install wires...") | `settings-migration-red.txt` (interval 5 and the node command: red) | pass |
| `hook-proxy status` asks with `status`+`render` and prints the daemon's line; falls back on none, a decline, a hung daemon (under 1 s) | `proxy/status_test.go` | its first run was red for a fault in my fake (it waited out a read deadline past the client's 50 ms), fixed in the test, not seen red against a missing `status.go` | `go test ./...` green |
| the picker with no binary and the word `status` | run by hand | | `picker-status-no-binary.txt` |

`go vet ./...` and `go test ./...` in `proxy/` are green; `npm run check` exits 0; `node scripts/counts.mts` run (the 2.0.0 manifest
gained the new files; it printed `0 document(s)` changed otherwise).

## 4. Gate

`npm run test:changed -- --base origin/work/2.0.0-typescript` on the committed work (`80a5663`), output `build/w86-status-gate.txt`:
192 of 353 test files chosen, 930 tests, 923 pass, 7 fail. The 7, each run again alone afterwards:

- `gate 5` of `repo-lint` (the emitted files are current): red because I had not run `npm run build` after my last edits; green after it.
- `proxy-install` "two updates in a row with the client run after each" (`update 1` exit 1, 151 s) and `git-guard-libs` "stopVerdict and
  trunkLag": red in the gate run, green when run alone after the build (`build/proxy-install-run.txt`: 6 of 6; the git-guard-libs file 6 of 6).
  Both ran while three other agents' test runs held the load average at 10 to 12 and `dist` was stale; I did not find another cause.
- `noop.test.mts`, 4 tests: (a) `stellix`/`sub37` `expected/settings.json` named the old status line (the node command, interval 5): that
  is this step's change, so I updated both fixtures to `sh "$CLAUDE_PROJECT_DIR/.claude/hooks/bin/hook-proxy" status` and
  `refreshInterval` 1, and their settings assertions now pass; (b) the pinned manifest. `node scripts/noop-pin.mts` listed 90 installed
  files that differ from the pin, among them `lib/files.mjs`, `hash.mjs`, `json.mjs`, `project.mjs` and `selftest.mjs`, whose sources
  this branch did not touch: the pin (and `packs/manifest-2.0.0.json`) are stale at the branch base since the W10 second-pass merge
  (`ff5075b`). I did not pin and I restored `packs/manifest-2.0.0.json` to the base's, so four agents do not each rewrite 90 lines;
  the lead regenerates both (`node scripts/counts.mts`, then `node scripts/noop-pin.mts`) on the merges, as W10 did (`cc0c732`). This
  step's own installed files that join that diff: `.claude/hooks/bin/hook-proxy`, `lib/proxy-wire.mjs`, `lib/tool-target.mjs` (new),
  `hooks/resident*.mjs`, `tools/statusline*.mjs` (3 new), and `settings.json`'s status line.
  `node scripts/counts.mts --check` is therefore red on this branch for the same reason (the manifest), and `npm run check` exits 0.

## 5. Files changed

New: `packs/base/hooks/lib/tool-target.mts`, `packs/base/hooks/resident/agent-board.mts`, `packs/base/hooks/resident/status.mts`,
`packs/base/tools/statusline-live.mts`, `statusline-agents.mts`, `statusline-version.mts`, `proxy/status.go`, `proxy/status_test.go`,
`test/unit/hooks-lib/agent-board.test.mts`, `test/unit/hooks-lib/status-keeper.test.mts`, `test/integration/status-served.test.mts`.
Changed: `packs/base/hooks/resident.mts`, `resident/event.mts` (note each event), `resident/selftest-rig.mts` (`--no-npm`),
`packs/base/hooks/lib/proxy-wire.mts` (`render`), `packs/base/hooks/bin/hook-proxy`, `packs/base/tools/statusline.mts`,
`statusline-work.mts`, `packs/base/pack.json` (interval, tests rows), `lib/settings.mts`, `proxy/client.go`, `proxy/main.go`,
`test/tools/base/statusline.test.mts`, `packs/manifest-2.0.0.json`, `build.md`.

## 6. Choices taken (nobody to ask)

- The board's `SessionStart` empties the list and does not add the new session; its first tool event does (the order: "a planted
  SessionStart empties the list").
- A lead is one line (`lead`); an agent is keyed by `agent_id`, named by its worktree folder, else its type. A lead's `Stop` removes
  the lead's line (it comes back on its next event).
- The status ask's deadline is 50 ms, as the order says; a late answer falls to the TypeScript render (slower, still correct).
- `update` writes the proxy form of the command unless the project disabled `hooks/bin/hook-proxy`; the pack's own `statusLine`
  stays the node form so the existing detection of "the kit's line" keeps working.
- The RUNS rows (work-order progress) are the existing cache's, renewed by the daemon by the existing detached refresh and held 2 s
  in memory; they are not event-driven. The last commit is what the daemon saw in a `git commit` Bash call.
- Python is not used: the time loop is in the test; the absolute-versus-loaded split is stated in section 2.

## 7. Open

- [gap] Agents only appear for tools the project's hooks match: a base-only project registers no hook for some tools, so Claude Code
  sends no event for them and a long call of such a tool shows as the previous tool. Not measured on the kit's own install.
- [gap] With no sampler (`hook-proxy` binary absent so the daemon has no `--proxy`), `usageOf` is null: every entry, the lead
  included, is dropped after 5 silent minutes and returns on its next event.
- [deferred] The kit's own install and the main checkout were not updated (the brief forbids it); the migration runs at `update`.
- [gap] The noop pin and `packs/manifest-2.0.0.json` are stale at the base (see section 4) and not regenerated here: the lead's, at the merge.
- [gap] `hook-proxy --selftest` has no status plant (its cases are the Go tests); the daemon selftest has no render case.

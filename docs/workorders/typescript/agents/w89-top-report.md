# w89-top report: W8.9 item 4, `claude-packs top`

Branch `work/2.0.0-ts-w89-top`.

## Built

- `hook-proxy top` (Go, `proxy/top.go`, `top_state.go`, `top_render.go`, `top_daemon.go`, `top_live.go`; wired in `proxy/main.go`). One binary, built and cached
  like the proxy (`scripts/build-proxy.mts`, `lib/proxy-binary.mts` unchanged). `claude-packs top` is `lib/top-cli.mts`: it finds the cache's or the kit's
  binary and gives it the terminal. In `lib/cli.mts` and `prompts/help.txt`; `node scripts/counts.mts` wrote the README row.
- Screen: the governor's load and grants (jobs holding slots, jobs waiting) at the top; each project (live first, stale last, dimmed) with its bar, percent,
  items left, the lead's step, agent count and summed processes, CPU and memory; under it the lead and every agent: name, step, model, worktree, CPU, memory,
  processes, time since its last event, last action (tool and a short form of its input). Keys: q, arrows (and j/k), enter, escape; enter opens a project (its last
  20 actions) or an agent (its own 20); enter, q or escape goes back.
- Sources: the governor's `jobs.json`; each project's daemon over its socket (the `status` request, 150 ms wait, once a second), whose reply now also carries
  `board` (`packs/base/hooks/resident.mts`: the agent board's rows, beside the usage by owner it already sent); with no daemon, the files: `docs/workorders/*/status.json`,
  `agents/*.json`, `.claude/logs/events.jsonl` (tail 512 KB) and the Go sampler (`newSampler`, reused) for CPU, memory, processes by worktree folder.
- `--once` prints one frame (flags `--now`, `--width`, `--load`, `--usage`, `--governor`, `--no-daemon`, `--open`): the seam the golden tests use.

## Measured (this Mac, darwin-arm64; `build/evidence/w89/top.json`, written by `test/top/frame.test.mts`)

- start to a printed frame, 15 runs: p50 10 ms, max 17 ms (limit 100 ms).
- peak resident size by `/usr/bin/time -l`: 10.1 MB (limit 20 MB).
- builds: `node scripts/build-proxy.mts --force` made all four in parallel in 639 ms; sizes darwin-arm64 3.69 MB, darwin-amd64 3.92 MB, linux-amd64 3.87 MB, linux-arm64 3.67 MB.
  `codesign -v` passes on darwin-arm64; darwin-amd64 is "not signed at all" (Go signs arm64 only; `releaseCheck` already accepts that, as the W9 note says); `--check` exits 0.

## Tests

- `proxy/top_test.go` (Go): the golden frame (`proxy/testdata/top-frame.golden`), every field, an agent's page, no stale agent, a fake daemon's board laid over the files, the keys.
  Red first: the file did not compile before `runTop` existed. `go vet` and `go test ./...` green.
- `test/top/frame.test.mts`: the same plant (`proxy/testdata/top-plant.json`: 3 projects, one with 4 agents, one with none, one stale, a governor with 2 jobs and 1 waiter) against the real
  binary and the same golden; the planted dropped-field frame is red; `claude-packs top` through `bin/`; the start and memory measures.
- Run: `npm run test:changed` (117 tests: one red, a raw `JSON.parse` in my test, fixed to `readJson`; then `repo-lint` and the frame test rerun, 32 and 5 pass). Not seen red: the TS golden test against a binary without
  `top` (the frame test was written before the binary had the command, but I ran it only once the binary was there); its plant of a dropped field is seen red inside the test.
- `node scripts/noop-pin.mts`: 3 files changed, `.claude/hooks/resident.mjs` in stellix, sub37 and full-stack (the `board` reply); read, kept, pinned.

## Choices

- `top` is a subcommand of the proxy binary, not a second binary: one build, one cache, one codesign, and the status request code is reused.
- No TUI library: raw mode through `stty`, ANSI by hand; no new dependency, no `docs/versions.md` row.
- No Go files in a pack's `tests` map: they live in `proxy/`, not in a pack; `lib/top-cli.mts` ships with the CLI, not a pack. The only pack file changed, `resident.mts`, already names its tests.
- Stale = nothing newer than 10 minutes among status.json, the event log and agent files; an agent is shown if it had an event in 5 minutes, or its file is under 30 minutes old and unfinished.
- Projects shown: those named, else the current project plus every project the governor holds a job for.
- Model: only `agents/<name>.json` has one, so an agent without a `model` there shows `-` (events do not carry it); the lead's is `-`.
- A test's `--usage` file stands in for the sampler; the daemon path uses the daemon's usage.

## Not done

- [gap] Heartbeat files were not read (no format found in the kit): liveness is the event log and agent files. `.claude/hooks.log` is not read; the event log holds the same calls with more.
- [gap] The live daemon path is proven against a fake daemon in Go, not against a real daemon end to end; the TypeScript side is one line (`board` in the status reply), covered by the existing resident tests passing.
- [gap] Live raw-mode terminal (keys, redraw) was not driven on a real tty in this run; the key logic is unit-tested.
- [gap] Not logged in `workflow-bugs.md`: no workflow fault met.

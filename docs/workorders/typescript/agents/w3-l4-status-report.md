# W3 L4 status: run-remotes, run-transcripts, run-status, run-tree in TypeScript

Branch `work/2.0.0-ts-w3-l4-status`. Strict TypeScript, no `any`, casts or `!`. Behaviour unchanged except where noted.

## Per file (lines before -> after)

- `run-remotes` 52 -> 83. Config path from the caller's env (`remotesFile(env)`); the ssh call is `sshAsk(env)`, an `Asker` passed in (`remoteRuns(remote, run)`, `remotesReport(remotes, run)`: the default is gone, the caller names it). `machineName(file, platform)` and `remotesOf(file)` take the file.
- `run-transcripts` 72 -> 101. `claudeHome(env)` and `sessionsDir(project, home)` take their inputs; `transcriptBeats(project, { home, nowMs })` has no default home.
- `run-status` 239 -> 133, split by what the code does (names importers use are all still exported from `run-status.mts`):
  - `run-progress.mts` (42): `stepsOf`, `progressOf`, `percent`, `barCells`, `percentLabel`, the `Step` types.
  - `run-live.mts` (84): `ago`, `actionOf`, `SYMBOLS`, `workLine`, `alignLive`, `liveOf`, `checkedText`, `Beat`.
  - `run-rows.mts` (77): `projectOf`, `runRows`, the `OrderStatus` / `AgentStatus` / `AgentRow` shapes.
  - `run-status.mts`: `orderStatus`, `runsReport` and what they read; re-exports the rest.
- `run-tree` 56 -> 74. `TreeRow` and `ProjectGroup` types.

## Copies removed

- `run-status.mjs` `textIn` (a copy of `readText`): replaced by `files.mts` `readText(...) ?? ''`.
- No git call lives in these four (they go through `run-discovery.mts`, which passes the env); `env` now reaches it from `orderStatus` / `runsReport`.

## Signatures changed, and importers

- `orderStatus(project, order, { env, nowMs? })` (was `(project, order)`).
- `runsReport({ env, platform, dir?, order?, remotes?, ask?, here?, nowMs? })`: `env` and `platform` required, `nowMs` plants the clock.
- Importers updated: `lib/status-cli.mjs` (2 calls: `{ env: process.env, platform: process.platform, ...options }`), `packs/base/tools/statusline-runs.mjs` (the `--refresh` call), `test/run-status.test.mjs`, `test/run-remotes.test.mjs` (a `HERE` const passed). `lib/run-status.mjs` and `statusline-paint.mjs` need no change.
- `run-remotes`: the ssh call now runs with the caller's env (`env: { ...env }`) instead of the process's own.

## For the lead

- New emitted files for `.gitignore`: `packs/base/hooks/lib/run-live.mjs`, `run-progress.mjs`, `run-rows.mjs`, plus the four converted names (`run-remotes.mjs`, `run-transcripts.mjs`, `run-status.mjs`, `run-tree.mjs`).
- `test/noop.test.mjs` lists: three new installed files, `.claude/hooks/lib/run-live.mjs`, `run-progress.mjs`, `run-rows.mjs` (the stellix, sub37 and full-stack noop tests are red on exactly these three lines; not in the known-reds list, caused by this split).
- Types to consider for `types.d.mts`: `Env` (`Readonly<Record<string, string | undefined>>`) is defined in `run-discovery.mts` and again privately in `run-remotes.mts` (a one-line alias, to avoid importing discovery before it was needed); `Beat`, `Remote`, `Unreachable`, `Asker`.
- Faults: none found. `[gap]` `remoteRuns` trusts the remote's `status --json` rows as `OrderStatus` (one `parseJson<T>` cast, the owner's way); a remote older than the kit's rows would show missing fields.
- A process note: one `sed -i` on `run-remotes.mts` (a type-name tidy, mid-file) went through the shell by mistake; no refusal met. A `git stash` was refused by git-guard (right: uncommitted work) and not retried. No refusals were open in `logs refusals --open`.

## Proofs

- `npm run build` and `npm run check`: exit 0.
- Repo lint: 6 of 7 pass; gate 3b red on files not mine (`git-auth`, `git-guard-selftest`, `kit-fresh-look`, `kit-fresh-selftest`, `kit-version`, `pushed`, `repo-index`, `shape-code`, `trunk-lag`, `unread-writes`: tracked emitted files of other chains). None of my files are listed.
- `test/run-status.test.mjs` 10/10, `run-remotes.test.mjs` 8/8, `statusline.test.mjs` 10/10, `run-claudes.test.mjs` 5/5.
- New unit test `test/unit/hooks-lib/run-status-parts.test.mts`: 8/8 (progress, percent and bar, ago, quiet rule, column alignment, transcript last call, beats, remotes with a planted unsafe dir, a throwing ask and a wrong answer).
- `node packs/base/tools/statusline.mjs < /dev/null` prints and exits 0. No hook imports these libs, so there are no hook selftests to run.
- `npm run test:changed -- --base work/2.0.0-typescript` (output `/tmp/w3-l4-status-tc.txt`): reds are the house two (hooks install, doctor selftest) and the three noop tests above; the rest pass.

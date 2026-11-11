# W3 L4 slice w3-l4-git: report

Branch `work/2.0.0-ts-w3-l4-git`. Files: pushed, git-auth, trunk-lag, git-guard-selftest.

## Per file (lines before -> after)

- `pushed.mjs` 248 -> split by job (d-24 split line), every export name kept through `pushed.mts` (15 lines, re-exports):
  - `remote-heads.mts` 158: ls-remote, the kept look, the token, `withHeads`, `gitAt`, shapes `GitGuards`, `HeadsOptions`, `HeadsLook`, `Failure`.
  - `push-form.mts` 31: `sshOwner`, `pushCommand`, `unpushedMessage`, `NEVER_DELETE`.
  - `branches-ahead.mts` 95: `forRepo`, `unpushed`, `localBranches`, `othersBranches`, `ownerPushes`.
  - `stop-verdict.mts` 65: `stopVerdict`, `MAX_SENDS`.
- `git-auth.mjs` 44 -> `git-auth.mts` 49.
- `trunk-lag.mjs` 54 -> `trunk-lag.mts` 60.
- `git-guard-selftest.mjs` 231 -> `git-guard-selftest.mts` 140 + `pushed-selftest.mts` 127 (the pushed and owner cases moved out, one job each; `git-guard-selftest` was 300+ once typed).

## New emitted files for the lead's .gitignore

`packs/base/hooks/lib/{remote-heads,push-form,branches-ahead,stop-verdict,pushed-selftest}.mjs` (pushed, git-auth, trunk-lag, git-guard-selftest were already emitted names). They are untracked and not yet ignored (`git status` shows them `??`); I did not stage them.
The lead also needs the five names in noop's lists and the three noop fixtures (stellix, sub37, full-stack expected lists), and in the lock hashes: noop's three tests fail now on "the same files" with `branches-ahead.mjs` etc. as new.

## Copies removed

- `git(cwd,args,env,input)` and `out` (pushed): every call now `gitOut` / `gitRun` / `gitLines` from git-run.mts, through `gitAt(cwd, env, extra, input)` which adds only `GIT_TERMINAL_PROMPT=0`, the 15 s timeout and the caller's env. Same in trunk-lag.
- `esc` (git-auth) and the inline copy in the token reader: `escapeRegExp` from glob.mts.
- `readFileSync` of ~/.env: `readText`; cache and state writes: `readJson`/`writeJson`/`toJson` (json.mts).
- git-auth has no token regexes (its only patterns are the push-law and LOADS_ENV ones); nothing to share with secret-patterns.mts.

## Signatures changed (env passed; nothing reads the process any more)

- `remoteHeads(cwd, env, remote, options)`, `withHeads(cwd, env, remote, cfg, judge)`, `target`, `urlOf`, `ownCommits`, `knownShas` (was `known`, now exported), `tokenFor(tokenVar, env)` (reads `env.HOME ?? homedir()`).
- `unpushed(cwd, env, branch, cfg)`, `localBranches(cwd, env, cfg)`, `forRepo(cwd, env, projectDir, cfg)`, `othersBranches(cwd, env)`.
- `stopVerdict(root, env, cfg, session, { lag, stateDir })` (stateDir defaults to `env.TMPDIR ?? '/tmp'`); `lag(root, env, cfg)`; `trunkLag(cwd, env, cfg)`, `mainCheckout(cwd, env)`.
- `ghLaw(cmd, p, c, env, login)`, `loggedInAs(env)`.
- Dropped exports: `git`, `out` (pushed), `isGitHub` and `tokenFor` stay in remote-heads (not through pushed.mts; nothing imported them).
- Importer: `packs/base/hooks/git-guard.mjs` updated at its four call sites, passing `process.env` (W4 passes the event's env). `lib/layout.mjs` still imports `NEW_INSTALL_GIT` from `git-auth.mjs`, unchanged.
- `git-guard.mjs --selftest` still calls `selftest(hookFile, {problem, house})` (now sync, returns the exit code).

## Faults and behaviour notes (none changed a result except as stated)

- git-auth: `c.tokenVar` and `c.accountNote` undefined printed "undefined" in a refusal; now defaults `PERSONAL_GITHUB_TOKEN` / empty. git-guard's DEFAULTS set both, so no installed run changes.
- A timed-out or unstartable git is told "no answer in 15 s" (old: only on a signal); gitRun gives `status === null` for both.
- A kept look with no `heads` field was a crash; now it is looked up again live.
- No real bug found.

## Types proposed for types.d.mts

`GitGuards` (guards.git: house, ghAuth, trunkNeedsYes, pushNeedsYes, trunks, owner, tokenVar, repo, accountNote, safeRestore, branchStart, refuseTrunk, cachedOnly) and `GitEnv` (= `GitOptions['env']`), both defined in remote-heads.mts. `HouseEnv` and `GitGuardLaws` (git-guard-selftest.mts) describe what git-guard's `house` and `problem` take, for W4.

## Proofs

- `npm run build`, `npm run check`: exit 0.
- `node packs/base/hooks/git-guard.mjs --selftest`: OK (18 token, 44 house refusals, 32 passes, 25 pushed-law, 9 owner-push, 9 trunk-law cases).
- making-check selftest OK (39), kit-fresh selftest OK (20). synth-creator's stage-guard: scratch install `init --config synth-creator` then `CLAUDE_PACKS_SELFTESTS=run doctor --fresh`: OK (its own pack copy cannot run standalone: it imports an install's `./lib/selftest.mjs`).
- Unit test `test/unit/hooks-lib/git-guard-libs.test.mts`: 6 pass (push form, pushLaw with a dot in the owner and a planted other owner, ghLaw on the env given, tokenFor, remoteHeads live/kept/gone, stopVerdict and trunkLag on a real repo).
- Repo lint: 6 of 7 pass; gate 3b fails on ten tracked emitted files of other slices (kit-fresh-look, kit-fresh-selftest, kit-version, repo-index, run-remotes, run-status, run-transcripts, run-tree, shape-code, unread-writes `.mjs`), none mine.
- `test:changed -- --base work/2.0.0-typescript`: 99 pass, 8 fail. Known on the base branch: house's two, KF-21, WB-4 (sub37-wb), worktrees' kit-fresh case. Mine to the lead: the three noop tests (stellix, sub37, full-stack), red only because of the new emitted file names above. `test/kf-refusals` hook case for git-guard (KWB-96) and the Stop-from-worktree test pass.
- Refusals met: code-shape (a 278-column line), marked right (fc9f2882).

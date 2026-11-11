# W3 l4-fresh report

Branch `work/2.0.0-ts-w3-l4-fresh`. Six files converted, in `packs/base/hooks/lib/`.

## Per file (lines before -> after)

| file | before | after | notes |
|---|---|---|---|
| kit-version | 23 | 27 | typed; reads the lock as `Partial<Lock>` |
| kit-fresh-look | 125 | 144 | env and now are parameters; own git runner taken out |
| kit-fresh-selftest | 93 | 95 | own runner and spawn removed; `runHook`, `scratchDir` |
| repo-index | 52 | 68 | JSON read and write on json.mts; code read on `readText` |
| shape-code | 133 | 159 | C-family definition regex built from three parts, two `why` lines split (code-shape refused 260+ columns) |
| unread-writes | 24 | 29 | `env` is a parameter |

## Copies removed

- `kit-fresh-look`: `gitIn(root)` (a spawn of git with `-C`) is replaced by `kitGit(root, env)`, a thin adapter over `gitRun` from git-run.mts (timeouts 15 s for fetch, 5 s otherwise, as before). The temp-file write is `put` (files.mts), the read `readJson`.
- `kit-fresh-selftest`: its own `RUNNER` path and `spawnSync` -> `runHook` (selftest.mts); `mkdtempSync(tmpdir())` x3 -> `scratchDir`.
- `repo-index`: raw `JSON.parse(readFileSync)` -> `readJson`; `readFileSync` -> `readText`; write -> `writeJson` (part file and rename, a newline at the end; was a direct `writeFileSync`).
- `shape-code`: none found.

## Signatures changed and importers

- `atStart(root, { env, now, unattended?, npm?, git? })` (was `{ unattended = process.env..., npm, git }`); `atCommit(root, command, { env, git? })`; `newestOnNpm({ now, dir, ask? })` (now and dir required); `cacheDir(env)` (env required); `projectVerdict(root, { unattended, npm })` (both required); `kitVerdict(root, { git, fetch })` (both required); `gitIn` is gone (`kitGit(root, env)`).
  Importer `packs/base/hooks/kit-fresh.mjs` updated (3 calls, passes `process.env` and `Date.now()`).
- `unreadWrites(ev, root, env)` (was reading `process.env`). Importer `packs/base/hooks/run-hooks.mjs` passes `process.env`.
- `repo-index`, `shape-code`, `kit-version`: signatures only typed; importers untouched (`template-law`, `reuse-hint`, `code-shape`, `shape-law`, `lib/shape.mjs`, `tools/statusline.mjs`).

## Decisions taken (unattended)

- **repo-index hash**: the brief said "onto hash.mts, keep the same file names (sha256, first 12)". `shortHash` is sha1 only and I may not edit hash.mts, so the index file name keeps `createHash('sha256')` locally, with a comment. Nothing reads the name elsewhere (cache only; a change would just rebuild it once). Proposal: give `shortHash` an optional `algorithm` parameter (default sha1) and call it from repo-index; or accept sha1 names (one rebuild).
- `unattended` stays derived from `env.CLAUDE_PACKS_UNATTENDED` inside `atStart` unless a selftest passes it.
- `KIT` still defined in kit-version.mts; `lib/kit-command.mjs`'s `PACKAGE` is a copy, for W4.

## Faults found

None that change a result. Observation: `gitRun` returns stderr `''` (not the spawn error's message) when git cannot start; the old `gitIn` fell back to `r.error.message`. The effect is only the wording of a "could not fetch origin (...)" note ("no answer" is said instead). Kept as is.

## Types to propose for `types.d.mts`

- `Env` (`Readonly<Record<string, string | undefined>>`) is defined in core-budget, dup, run-discovery and shell-writes; I import it from shell-writes.mts.
- `NpmAnswer`, `FreshVerdict`, `KitVerdict`, `KitGit` stay in kit-fresh-look.mts (only this module uses them); `IndexEntry`/`RepoIndex`/`TextShapes` stay in repo-index.mts; `Definition`/`CodeFinding` stay in shape-code.mts.

## Proofs

- `npm run build`: clean. `npm run check`: exit 0.
- Selftests: kit-fresh 20 cases OK, template-law 26, reuse-hint 9, shape-law 58, run-hooks 11, code-shape 19: all OK.
- `test/what-the-kit-finds.test.mjs` and `test/statusline.test.mjs`: green (also inside test:changed: 71 pass).
- Repo lint: gates 1, 2, 3, 4, 5, 11 and 12 pass; gate 3b fails on 8 files that are not in this slice (`git-auth`, `git-guard-selftest`, `pushed`, `run-remotes`, `run-status`, `run-transcripts`, `run-tree`, `trunk-lag`, all `.mjs`); none of mine is listed.
- `npm run test:changed -- --base work/2.0.0-typescript` (output `/tmp/w3-l4-fresh-tc.txt`): 71 pass, 3 fail, all known: house's two ("the house hooks install ...", "doctor fails when a hook fails its selftest") and worktrees' kit-fresh case.
- No unit test written: the modules have no logic beyond what the kit-fresh selftest (20 cases, including the planted wrong inputs) covers.
- Refusals met: code-shape x2 (lines over 260 columns): both right, marked.

# admiral-fleet: decisions

Each choice made with nobody there: the question, the options, what was chosen and why. The user can overturn any of them.

## d-1: does straight-on-and-aligned travel with analyse-reference-look into base?

Decided in W4 (the work order names this one d-1).

## d-2: the package-lock.json drift from `npm install`

- Question: `npm install` in W0.0 rewrote package-lock.json (version 1.2.0 to 1.3.1, the `libc` fields dropped by this npm). Commit it now, restore it, or leave it?
- Options: commit on W0.0 (an unrelated change in a hook fix); restore it (git-guard refuses an undo on a dirty tree, and it is not this step's); leave it in the tree and commit it with W5's version bump, where the lockfile's version changes anyway.
- Chosen: leave it, commit it in W5. Easiest to reverse, and it keeps each step's commits to its own change.

## d-3: which hook enforces the main checkout's fast-forward (W0.0 item 3)

- Question: an existing hook or a new one refuses a turn that pushed the trunk while the main checkout's trunk lags the remote's?
- Options: a new Stop hook; git-guard's Stop, which already judges what the repo holds that GitHub does not (lib/pushed.mjs `stopVerdict`).
- Chosen: git-guard's Stop. It already looks up the remote's heads (cached, live before a refusal), counts identical send-backs and ends the session after three, and has its worktree case. A new hook would repeat all of that. The law is in a new lib, `lib/trunk-lag.mjs`, called from `stopVerdict`.
- How "a turn that pushed to the trunk" is read: the remote's trunk head is a commit this repo has (pushed from here: a worktree shares the object store) that the main checkout's trunk does not contain. A trunk commit pushed from another machine, one this repo lacks, is not judged.
- Refused only when the main checkout holds the trunk with no uncommitted change to a tracked file: that is the case the session can fix. With uncommitted work there, or another branch held, the land-branch skill says touch nothing, so the hook tells the user (a system message) and does not send the session back for what it may not do. Untracked files do not count: `merge --ff-only` refuses itself if one would be overwritten, and the work-order runner's own logs are untracked.

## d-4: where the four names go in full-stack's choose list, and what "its hooks merged" means for packs with none

- Question: W1 says languages before stacks, in the list's existing style; and the fixture asserts each pack's hooks were merged into settings.json.
- Chosen: `go` after `js-ts` (the languages), `shell-hooks` after `shell` (its kin), `web` after `react`, `host-agent` after `ci`. None of the four declares a hook in its pack.json today, so the fixture reads each pack.json's `hooks` and asserts every hook file it names is installed and in settings.json: zero today, and it holds the day one is added. Its rules and checks are asserted file by file.

## d-5: how the tenant checks take Go, and the Go repo they are measured on

- Question: a lesson check has one `bad` and one `good`; W2 wants a Go pair for each tenant check, measured on swarmk's daemon-go, with one more public Go repo allowed.
- Chosen, the format: a check may carry `"examples": [{ "bad", "good" }, ...]`, more pairs each proved by the lesson-checks selftest like the first (so doctor proves them). One pattern, the JavaScript and Go forms joined by `|`; `**/*.go` in the globs, `**/*_test.go` excluded. Separate Go check files were the other option; they would split one law into two ids and two rule citations.
- Chosen, the patterns: strict, one call each. A mongo-driver filter (`bson.M`/`bson.D`) or a `database/sql` WHERE whose value is read from the URL (`r.PathValue`, `chi.URLParam`, `mux.Vars`, `c.Param`, `URL.Query()`) on the same call, with no tenant key; a role compared with owner that empties a filter or sets `_id`. The loose form (any WHERE without a tenant column) hits 62 times on HitKeep, nearly all right (the users and tenants tables themselves), so it is not shipped.
- The measurement: daemon-go has none of the shapes (no database driver, no URL reads, no role checks: the agent is stdlib only and the fleet spec gives it no database credentials). The first extra repo tried, go-saas/kit (gorm and protobuf requests), had none either, so it measured nothing. HitKeep (HitKeep/hitkeep at 34a6d0f, MIT, a multi-tenant analytics service with raw SQL) has them: 141 WHERE calls, 142 URL reads, 15 role comparisons. Both checks: 0 hits on all three (1,130 files). The 15 role comparisons were read one by one: guards, defaults, audits, chat roles, none a cross-tenant filter. In HitKeep the URL value goes into a variable in the handler and the query runs in the store, so a one-call pattern cannot see a missing tenant key there. That is the ambiguity W7 lists: the Go patterns are proved on their samples and clean on 1,130 real files, never seen to catch a real fault.

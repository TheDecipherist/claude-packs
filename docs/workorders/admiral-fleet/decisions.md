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

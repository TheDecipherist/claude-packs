---
# hook: git-guard.mjs
---
# Git in the form the guard takes, the first time

<constraints>
Always do:
- Stage by name: `git add <paths>`, then `git commit -m "..." -- <paths>`.
- Push every commit before the next one, and every branch from its first commit: a later commit and the session's end both wait for it. A work branch never needs a yes to push; only the trunk can. Where `guards.git.pushNeedsYes` is set, every push is the owner's: commit freely, and push only what the owner names, when they ask (KWB-157).
- Push to the repo by name: a remote whose URL is the owner's SSH URL, or the token form with the token as `$VARIABLE`, never pasted.
- Name the token on every `gh` call, when the project's guards ask for it.
- Commit before undoing anything: a work-in-progress commit on a branch, then undo.
- Start work on a branch from the fetched remote trunk.
- Fetch before saying a branch is ahead, behind or level with the remote.
- Commit unfinished work at once, with a plain message of its state: what is done, what is unverified, the test state, and that it is interrupted, not abandoned. Never soften a red test in that message.

Never do:
- `git add -A`, `git add .` or `commit -a`.
- Rebase, amend, force a push or use `--no-verify`: make a new commit.
- Put a command that a guard judges in the same call as the step it depends on: a guard reads the whole command before any of it runs.
</constraints>

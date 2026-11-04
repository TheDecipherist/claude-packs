---
# hook: git-guard.mjs
---
# Git in the form the guard takes, the first time

<constraints>
Always do:
- Stage by name: `git add <paths>`, then `git commit -m "..." -- <paths>`.
- Push every commit before the next one, and every branch from its first commit: a later commit and the session's end both wait for it.
- Push to the repo by name: a remote whose URL is the owner's SSH URL, or the token form with the token as `$VARIABLE`, never pasted.
- Name the token on every `gh` call, when the project's guards ask for it.
- Commit before undoing anything: a work-in-progress commit on a branch, then undo.
- Start work on a branch from the fetched remote trunk.

Never do:
- `git add -A`, `git add .` or `commit -a`.
- Rebase, amend, force a push or use `--no-verify`: make a new commit.
- Put a command that a guard judges in the same call as the step it depends on: a guard reads the whole command before any of it runs.
</constraints>

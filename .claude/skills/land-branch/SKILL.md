---
name: land-branch
description: Use when a work branch is finished, when its gate went green, or when asked to merge, land or ship a branch.
---

# Land a finished branch on the trunk (one job: the trunk has the work, and the remote agrees)

<constraints>
Always do:
1. Check it is finished: everything committed and pushed, the "done when" measured, and the tests the branch's changes reach green on committed work, picked against the trunk (`pick-tests`). The whole suite is not the gate: it runs only when the user asks.
2. Fetch, and see whether the trunk moved: `git rev-list --count HEAD..origin/<trunk>`.
3. The trunk has not moved: go to step 5.
4. The trunk moved: merge it into the branch, never rebase. Resolve conflicts keeping both sides' work: both CHANGELOG entries, the higher version. Run only the tests the merge reaches, commit, push the branch.
5. If the project's CLAUDE.md says the trunk needs a yes, ask now, once. Nothing before this step ever needs one.
6. Switch to the trunk as its own step, then `git merge --ff-only origin/<trunk>` and `git merge --ff-only <branch>`.
7. Push the trunk. A push that times out has not happened until the remote says so.
8. Prove it: `git ls-remote origin refs/heads/<trunk>` equals `git rev-parse HEAD`.
9. Release the project's lock if it has one, and log the landing in `build.md`.

Never do:
- Force a push, or rebase what is pushed.
- Report it landed before step 8.
- Delete the branch: branches are the record of the build.
</constraints>

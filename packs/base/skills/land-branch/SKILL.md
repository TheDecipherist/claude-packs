---
name: land-branch
description: Use when a work branch is finished, when its gate went green, or when asked to merge, land or ship a branch.
---

# Land a finished branch on the trunk (one job: the trunk has the work, and the remote agrees)

<constraints>
Always do:
1. Check it is finished: everything committed and pushed, the "done when" measured, the whole suite green on committed work.
2. Fetch, and see whether the trunk moved: `git rev-list --count HEAD..origin/<trunk>`.
3. The trunk has not moved: go to step 5.
4. The trunk moved: merge it into the branch, never rebase. Resolve conflicts keeping both sides' work: both CHANGELOG entries, the higher version. Run only the tests the merge reaches, commit, push the branch.
5. Switch to the trunk as its own step, then `git merge --ff-only origin/<trunk>` and `git merge --ff-only <branch>`.
6. Push the trunk. A push that times out has not happened until the remote says so.
7. Prove it: `git ls-remote origin refs/heads/<trunk>` equals `git rev-parse HEAD`.
8. Release the project's lock if it has one, and log the landing in `build.md`.

Never do:
- Force a push, or rebase what is pushed.
- Report it landed before step 7.
- Delete the branch: branches are the record of the build.
</constraints>

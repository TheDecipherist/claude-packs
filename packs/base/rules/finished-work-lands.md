---
# hook: git-guard.mjs
---
# Finished work lands: a finished branch is merged into the trunk and pushed

<constraints>
Always do:
- When a work branch's "done when" is measured and the whole suite is green, land it in the same turn with the `land-branch` skill. The trunk is always up to date.
- Land stacked branches in order, or land the top one when it holds them all.
- Say what landed, and the commit the remote now has.

Never do:
- Leave finished work on a branch waiting for someone to ask.
- Land work that is unfinished, or has a red test. A branch that cannot land yet says why.
- Land over a project's own law: where its CLAUDE.md says a push or a merge needs a yes, ask once, with the branch ready.
</constraints>

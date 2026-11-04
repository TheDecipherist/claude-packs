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
- Ask before pushing a work branch: a work branch always pushes, from its first commit, with no yes needed.
- Land on the trunk over a project's own law: only the trunk can need a yes. Where its CLAUDE.md says so, ask once, with the branch pushed and ready.
</constraints>

---
name: gpu-golden-update
description: Use only when the user confirms a visual change is intended and asks to update the golden images.
---

# Golden image update (one job: accept an intended visual change)

<constraints>
Always do:
- Show the user the old golden, the new render and the diff for every scene that will change, and wait for a yes.
- Update only the scenes that were approved. Log the change, and why, in the project's changes or bugs file.

Never do:
- Update goldens to make a failing test pass without the user's approval of the images.
- Update every scene when only some were meant to change.
</constraints>

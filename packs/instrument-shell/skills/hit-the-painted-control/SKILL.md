---
name: hit-the-painted-control
description: Use when a control seems not to respond, or when proving a panel works.
---

# Hit what is painted (one job: every drawn control answers at its own centre)

<constraints>
Always do:
1. Walk each drawn rectangle, and hit-test its centre.
2. Require its own id back.
3. Bound the hit box.
4. Read lit state off the render.
5. Walk one control of each template, and read the rest (`test-the-template-once`).
6. Step every page and tab before walking controls: a control on a page never shown was never reached.
7. Have the painter report draws attempted against draws made, and fail where they differ.
8. Look at a lit and an unlit control as a pair: they must differ in the face, not only in the model.
9. Walk the table the panel is drawn from, so the coverage probe cannot miss a control the panel lists.
10. Drag a drawn curve through the real window, past its edges.

Never do:
- Call a binding proved because a value changed in the model.
</constraints>

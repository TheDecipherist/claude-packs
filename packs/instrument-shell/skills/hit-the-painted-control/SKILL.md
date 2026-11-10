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

Never do:
- Call a binding proved because a value changed in the model.
</constraints>

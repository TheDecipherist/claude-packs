---
name: find-the-init-patch
description: Use when a machine's INIT or default patch is needed, or its button combination to load it.
---

# Find the INIT patch (one job: the patch in the firmware and the button combination that loads it)

<constraints>
Always do:
1. Read the manual first for the combination and the patch's name.
2. Find the INIT patch in the firmware by its name (the packed template: see `attribute-the-record`), and trace the factory RESTORE path (`trace-the-builders`).
3. Then read the key-handling code to find the combination, and check it against the manual.

Never do:
- Use your own starter patch as INIT.
</constraints>

---
# concepts: cpp, js, python, tooling
paths:
  - "placeholder"
---

# The engine resets as the machine does, before every patch and at startup

A patch applied over what the last one left sounds different on every recall. The reset is the one the machine makes, mapped by `find-the-reset`, not a guess.

<constraints>
Always do:
- Make the engine's reset do exactly what the `find-the-reset` map lists, entry for entry, in its order, and call it first in every function that applies a patch and at startup.
- Default every switch and exclusive group to off. A patch that omits a section leaves it silent.
- Keep a census: each switch with its reset value, read from the map.

Never do:
- Apply a patch with no reset before it, or default a switch on.
- Reset more or less than the map says: "clear everything" is a guess.
</constraints>

## Check
`reset-before-apply` refuses a patch-apply function with no reset call in its body.

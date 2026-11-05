---
paths:
  - "**/*.cpp"
  - "**/*.cc"
  - "**/*.h"
  - "**/*.hpp"
  - "**/*.mm"
  - "**/*.py"
  - "**/*.ts"
  - "**/*.js"
  - "**/*.mjs"
---

# Sync is a mode, and OFF is a sound

<constraints>
Always do:
- Give a synth three states: OFF, INT, EXT. Most effects get two, since a delay always has a time.
- Say which clock you mean. A setter that resolves OFF to INT cannot fail, so the caller never hears.
- Follow the host's transport when there is one: a unit in a session follows the session.
- Keep the sync switch a system setting, and the divisions in the program.
- Leave each destination's division off by default: it overrides a stored value.
- Declare each destination's minimum and maximum, by value and not by byte order, and show what cannot be reached.
- Key stored divisions to a destination's name when its list is dynamic.

Never do:
- Collapse "where our clock comes from" and "whether this unit is slaved to it".
- Put divisions on the transport bar: a master clock has no say in what a slave does with its pulses.
</constraints>

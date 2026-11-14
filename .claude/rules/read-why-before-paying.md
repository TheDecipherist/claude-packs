---
# concepts: cpp, python, go, rust, js
paths:
  - "src/**/*.cpp"
  - "src/**/*.h"
  - "src/**/*.hpp"
  - "src/**/*.mm"
  - "tests/**/*.cpp"
  - "tests/**/*.h"
  - "packs/**/*.cpp"
  - "packs/**/*.h"
  - "src/**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}"
  - "tests/**/*.{js,mjs,cjs,ts,tsx,mts,cts}"
  - "test/**/*.{js,mjs,cjs,ts,tsx,mts,cts}"
---

# Before filling a gap an audit finds, read why it is there

A floor or a constant that a note defends may be there for a reason that no longer holds; filling the gap blind pays a cost for nothing, and removing it blind breaks what it guarded.

<constraints>
Always do:
- Read the note's reason for the floor or constant before changing it.
- Measure with and without the defence the note names, and change it only after that re-measurement.
- Pay the cost only if the reason still holds; record the measurement where the note is.

Never do:
- Fill or remove a gap an audit lists on the audit's word alone.
</constraints>

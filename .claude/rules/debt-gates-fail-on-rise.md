---
# concepts: tests, tooling, cpp, python, go, rust, js
paths:
  - "test/**"
  - "tools/**"
  - ".claude/hooks/**"
  - ".claude/settings.json"
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

# A count-of-debts gate keeps a floor, fails only on a rise, names its exemptions

A count that must be zero today blocks all work; a count with no floor drifts up unseen. The floor makes the debt visible and stops it growing.

<constraints>
Always do:
- Keep the floor in a checked-in baseline file; the gate fails when the count is above it.
- Lower the floor with a `--bless` run that writes a diff someone reads. See the gate red once by setting the floor one below the count.
- List each exemption by name with its reason, and hold the bar at zero for everything not on the list.
- Give every exclusion and every skipped test the condition that ends it.

Never do:
- Raise the floor to get a gate green: fix the debt or name the exemption.
- Leave an exclusion or a skip with no end condition.
</constraints>

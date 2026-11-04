---
# concepts: cpp, js
paths:
  - "src/**/*.cpp"
  - "src/**/*.h"
  - "src/**/*.hpp"
  - "src/**/*.mm"
  - "tests/**/*.cpp"
  - "tests/**/*.h"
  - "src/**/*.{js,mjs,cjs,jsx,ts,tsx}"
  - "tests/**/*.{js,mjs,cjs,ts,tsx}"
  - "test/**/*.{js,mjs,cjs,ts,tsx}"
---

# Anything used more than once is one template: changed once, tested once

Tim: any element used more than once is made as a template, so a change, an update or a test happens once, not for every instance. A test that repeats the same behaviour over thousands of identical controls is a complete waste of time.

<constraints>
Always do:
- Make anything used twice one template, in any language: an HTML or JSX component, a C++ class or factory, an app view. Instances are built from it by data. The `template-law` hook refuses a second copy built by hand, whole or in part, and the `make-it-a-template` skill makes the template.
- Test behaviour once, on the template, with an instance chosen as a parameter: any instance must do.
- Prove the instances really are the template with one structural pass over the data: every instance is built by the same factory, with the same members. That is a read, not a run of the behaviour.
- Test an instance's own data where it differs: its label, its range, its ID, as a table.

Never do:
- Loop a behaviour test over every instance of one template: `one-walk-per-template` refuses a loop that presses, clicks or drags them.
- Copy an element and change it: a one-off is a second template, and a second place to fix. A real exception says so on its line: `one-off: <reason>`.
- Skip the structural pass: instances with their own code path are how one of four identical slots came to behave differently. An instance that has its own code path is not an instance, and is tested on its own.
</constraints>

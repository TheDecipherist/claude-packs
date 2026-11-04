---
# concepts: cpp, js
paths:
  - "placeholder"
---

# Used more than once: one template, changed once, tested once

Tim: any element used more than once is made as a template, so a change, an update or a test happens once, not for every instance. A test that repeats the same behaviour over thousands of identical controls is a complete waste of time.

<constraints>
Always do:
- Make anything used twice one template: one component, class or function, with instances built from it by data.
- Test behaviour once, on the template, with an instance chosen as a parameter: any instance must do.
- Prove the instances really are the template with one structural pass over the data: every instance is built by the same factory, with the same members. That is a read, not a run of the behaviour.
- Test an instance's own data where it differs: its label, its range, its ID, as a table.

Never do:
- Loop a behaviour test over every instance of one template.
- Copy an element and change it: a one-off is a second template, and a second place to fix.
- Skip the structural pass: instances with their own code path are how one of four identical slots came to behave differently. An instance that has its own code path is not an instance, and is tested on its own.
</constraints>

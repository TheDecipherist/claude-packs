---
# concepts: cpp
paths:
  - "placeholder"
---

# Find with the library: a search loop is written once, if at all

<constraints>
Always do:
- Find an element with `std::ranges::find` and a projection, or `std::ranges::find_if`: `std::ranges::find (controls, id, &Control::id)`.
- Wrap a search used in more than one place in one named function: `controlById (id)`.

Never do:
- Write `for (const auto& c : list) if (c.id == id)` by hand: the loop is short, so it gets copied, and each copy treats a miss its own way.
</constraints>

## Check
`.claude/checks/cpp-find-with-the-library.json` refuses a new hand-written search loop.

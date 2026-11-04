---
# concepts: cpp
paths:
  - "placeholder"
---

# Numbers have names, and casts come after the range check

<constraints>
Always do:
- Name a number that means something, with its unit, as a `constexpr`. A formula's own coefficients may stay, with their source.
- Use `std::numbers` for mathematical constants.
- Check a computed float is finite, clamp it, then cast it.
- Count loops with integers, and compute the value from the count.

Never do:
- Cast a float to an integer before its range is known.
- Write through a `const_cast`.
</constraints>

## Check
`cpp-clamp-before-cast`, `cpp-numbers-pi`, `cpp-no-const-cast`, `cpp-no-float-loop-counter`.

---
# concepts: cpp
paths:
  - "placeholder"
---

# Never keep a pointer into a container that can grow

A `c_str()` taken from a string held in a growing `std::vector<std::string>` pointed at freed memory after the next push. It worked in every run that reused one process, because the freed block was not yet reused.

<constraints>
Always do:
- Keep an index, a key or a handle, and look the element up when it is used.
- Reserve the capacity before taking addresses, only where the size is fixed for good, and say so in a comment.
- Hold the string by value, or in a `std::deque` or a `std::list`, where an element never moves, when a C API needs a `const char*` that lives long.

Never do:
- Store a pointer, a reference, an iterator, a `string_view` or a `c_str()` of an element of a `std::vector` or `std::string` that can still grow.
- Store an iterator into a `std::unordered_map` that can still grow: a rehash invalidates its iterators, while pointers and references to its elements stay valid until the element is erased.
- Hand a `c_str()` of a temporary or of a loop-local string to a call that keeps it.
</constraints>

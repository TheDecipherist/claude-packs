---
# concepts: cpp
paths:
  - "placeholder"
---

# A header declares and stands alone; a class that outgrows a file gets fewer jobs

<constraints>
Always do:
- Keep function bodies past a few lines in a `.cpp`, unless they are templates or on a hot path.
- Make every header compile alone: include what it uses. Prove it with `CMAKE_VERIFY_INTERFACE_HEADER_SETS` or one `-fsyntax-only` per header.
- Split a class that outgrows a file into smaller classes with one job each.

Never do:
- Cut a class into fragments with `#include` inside its body, or `.inc` parts, to get under the line limit.
- Write `using namespace` at file scope in a header.
- Depend on include order.
</constraints>

## Check
`cpp-no-using-namespace-in-header`; `file-size-guard` counts `.inc`, `.inl`, `.ipp` and `.tpp`.

---
# concepts: cpp, js
paths:
  - "placeholder"
---

# Three branches on the same value: a lookup, not an if/else chain

<constraints>
Always do:
- When code branches **3 or more times on the same value** (one variable, one member, one enum or string), replace the chain with a lookup:
  - **JS/TS:** an object or `Map` from key to value or function, typed `satisfies Record<Union, T>` so a missing case is a compile error, defined at module scope. Handle the missing key explicitly (`?? fallback` or throw). Use `Object.hasOwn` or a `Map` when the key comes from input.
  - **C++:** an object per kind (an interface and a factory, or `std::variant` + `std::visit`), or a `constexpr std::array` indexed by the enum for pure data (labels, ranges, coefficients). See `behaviour-lives-with-its-kind`.
- **Inside a hot inner loop only** (an audio callback, a per-pixel loop): one exhaustive `switch` on an `enum class` (no `default:`, so `-Wswitch` under `-Werror` catches a missing case), inside the kind's owner and nowhere else. Never `std::map`, `std::unordered_map` or `std::function` tables there (audio-core: `audio-thread-realtime-safe`).

Never do:
- Write `if (x == A) … else if (x == B) … else if (x == C) …` on one value.
- Rebuild the lookup table inside the function on every call.

`if` is still right for:
- ranges and comparisons (`score > 90`);
- conditions on several variables (`isAdmin && plan == Pro`);
- first-match-wins across different tests;
- two branches or fewer;
- guard clauses.
</constraints>

```cpp
// NO
if (mode == Mode::line) return drawLine (ctx);
else if (mode == Mode::fill) return drawFill (ctx);
else if (mode == Mode::text) return drawText (ctx);

// YES in a hot inner loop only: exhaustive, inlinable, inside the kind's owner (elsewhere: an object per kind)
switch (mode) {
    case Mode::line: return drawLine (ctx);
    case Mode::fill: return drawFill (ctx);
    case Mode::text: return drawText (ctx);
}
```

```ts
// YES
const builders = { create: buildCreate, update: buildUpdate, delete: buildDelete } satisfies Record<Action, Builder>;
return (builders[action] ?? buildDefault)(p);
```

## Check
`.claude/checks/lookup-over-if-chains.json` refuses an edit that **adds** three `==`/`===` branches on the same value. Existing chains are only judged when an edit touches them. If a chain ever slips through in a new shape, tighten the check rather than fixing the one case.

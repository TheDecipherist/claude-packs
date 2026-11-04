---
# concepts: cpp, js
paths:
  - "placeholder"
---

# Behaviour lives with its kind: objects and tables, not branches

<constraints>
Always do:
- When behaviour varies by a **kind** (mode, type, action, tool, message, format), each kind owns its behaviour in **one place**:
  - **JS/TS:** a table of handler objects `{ kind: { label, build(), validate() } }` typed `satisfies Record<Kind, Handler>`. Or classes implementing one interface, chosen once from a registry.
  - **C++:** an interface with one class per kind, created once from a registry or factory. Or `std::variant` + `std::visit`, where the compiler checks every kind is handled. Or a `constexpr` table of plain data per kind.
- Choose the object **once**, when the kind is set (a setting changes, a request arrives, a file is opened), then call it, so no code asks "which kind?" again.
- A new kind is **one new entry** (one class or one table row), with nothing else edited. If adding a kind needs edits in several files, the design is wrong; fix the design.

Never do:
- Branch on the same kind in more than one place (`switch (mode)` in the renderer, the label code and the config loader). The `dispatch-once` hook refuses the second one.
- Grow a `switch` or an if-chain past three cases where a table or an object belongs (`lookup-over-if-chains`, `field-map-over-if-runs`).

The one exception is **a hot inner loop** (per element, per pixel, per sample: an audio callback is one; audio-core's `per-sample-code-inlinable` says why). There a virtual call or a `std::function` can't be inlined and costs on every iteration. The kind's object is still chosen once, but its inner loop may be:
- a non-virtual member function chosen when the kind is set;
- a `constexpr` table;
- or one exhaustive `switch` on an `enum class` **inside that kind's owner**, never repeated elsewhere.
</constraints>

```ts
// NO: the same question asked in three places, and a new kind means three edits
switch (tool.kind) { case 'search': … case 'fetch': … }   // run
switch (tool.kind) { case 'search': … case 'fetch': … }   // label
switch (tool.kind) { case 'search': … case 'fetch': … }   // validate

// YES: each kind answers for itself
const TOOLS = {
  search: { label: 'Search', schema: SearchArgs, run: runSearch },
  fetch:  { label: 'Fetch',  schema: FetchArgs,  run: runFetch },
} satisfies Record<ToolKind, ToolHandler>;
const tool = TOOLS[kind];            // chosen once
tool.schema.parse(args); return tool.run(args);
```

```cpp
// YES (outside a hot inner loop): one class per kind, chosen once
struct Shape { virtual ~Shape() = default; virtual std::string label() const = 0; virtual void prepare (const Settings& s) = 0; };
std::unique_ptr<Shape> makeShape (Mode m);   // the one factory: the only place that names every kind
```

## Check
- `dispatch-once` (hook) refuses an edit that adds a `switch` on a kind already switched on in another file.
- `lookup-over-if-chains` and `field-map-over-if-runs` (lesson checks) refuse new if-chains and field runs.
- If branching on a kind ever slips through in a new shape (a ternary ladder, a `match`, an `if` on `typeid`), add that shape to a check.

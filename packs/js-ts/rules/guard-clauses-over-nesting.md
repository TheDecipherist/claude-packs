---
# concepts: js
paths:
  - "placeholder"
---

# Guard clauses over nesting

The main path of a function runs unindented at the bottom, after the invalid, empty and error cases are gone.

<constraints>
Always do:
- Handle the invalid, empty and error cases first, with early returns or throws.
- Keep nesting depth at 3 or less.

Never do:
- Wrap the main path in `if (valid) { if (paid) { ... } }`.
</constraints>

## Example
```ts
function ship(order?: Order) {
  if (!order) throw new Error('no order');
  if (!order.paid) throw new Error('unpaid');
  if (!order.items.length) return;
  return dispatch(order);
}
```

## Check
Where the project has ESLint: `max-depth` at 3.

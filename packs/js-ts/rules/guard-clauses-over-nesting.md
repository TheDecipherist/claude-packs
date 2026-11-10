---
# concepts: js
paths:
  - "placeholder"
---

# Guard clauses over nesting

## The law
Handle the invalid, empty and error cases first with early returns or throws. Then the main path runs unindented at the bottom. Max nesting depth is 3.

```ts
// NO
function ship(order?: Order) {
  if (order) {
    if (order.paid) {
      if (order.items.length) { return dispatch(order); }
    }
  }
}

// YES
function ship(order?: Order) {
  if (!order) throw new Error('no order');
  if (!order.paid) throw new Error('unpaid');
  if (!order.items.length) return;
  return dispatch(order);
}
```

## Check
```js
'max-depth': ['error', 3],
```

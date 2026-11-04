---
# concepts: js-tests
paths:
  - "placeholder"
---

# Test names state the behavior; bodies are Arrange-Act-Assert

## The law
- The title says what happens under which condition: `returns 404 when the user does not exist`, not `test getUser`.
- The body has three visible parts: arrange, act, assert. One behavior per test.
- Fix the code, not the test, unless the test itself is wrong. Say which one it is when you change a test.

```ts
it('rejects an order when the card is expired', async () => {
  const order = makeOrder({ card: expiredCard });   // arrange
  const result = await checkout(order);             // act
  expect(result).toEqual({ ok: false, error: 'card_expired' }); // assert
});
```

## Check
```js
// @vitest/eslint-plugin
'vitest/valid-title': 'error',
'vitest/expect-expect': 'error',
'vitest/no-identical-title': 'error',
```

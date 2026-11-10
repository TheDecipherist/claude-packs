---
# concepts: ts
paths:
  - "placeholder"
---

# Named constants, not magic numbers

## The law
Any number with meaning (a timeout, limit, threshold, retry count, status code) gets a named constant that says what it is and its unit.

```ts
// NO
setTimeout(retry, 30000);
if (items.length > 100) paginate();

// YES
const RETRY_DELAY_MS = 30_000;
const MAX_PAGE_SIZE = 100;
```

## Check
```js
'@typescript-eslint/no-magic-numbers': ['error', {
  ignore: [-1, 0, 1, 2],
  ignoreArrayIndexes: true,
  ignoreEnums: true,
  ignoreNumericLiteralTypes: true,
  ignoreReadonlyClassProperties: true,
  ignoreTypeIndexes: true,
}],
{ files: ['**/*.test.*', '**/*.spec.*'], rules: { '@typescript-eslint/no-magic-numbers': 'off' } },
```
Turn off core `no-magic-numbers` when enabling the TS version.

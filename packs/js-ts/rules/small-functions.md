---
# concepts: js
paths:
  - "placeholder"
---

# Functions stay under 50 lines

## The law
A function does one thing and fits on one screen: 50 lines max, blanks and comments excluded. When it grows past that, extract the named steps into their own functions.

## Exceptions
- React components whose body is mostly JSX markup: split the markup into subcomponents rather than raising the limit.
- Test files (a `describe` block is a function).

## Check
```js
'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
{ files: ['**/*.test.*', '**/*.spec.*'], rules: { 'max-lines-per-function': 'off' } },
```

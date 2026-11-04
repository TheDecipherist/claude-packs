---
# concepts: js
paths:
  - "placeholder"
---

# Never mutate a function's inputs

## The law
A function must not change the objects or arrays passed to it. Return a new value instead. Callers should never have their data changed under them.

```ts
// NO
function rename(user: User, name: string) { user.name = name; return user; }

// YES
function rename(user: Readonly<User>, name: string): User {
  return { ...user, name };
}
```

## Not covered
Building up a local array or object that the function itself created is fine. This law is about *inputs*, not a blanket ban on mutation (the source templates said "never mutate anything", which is impractical and was dropped).

## Check
```js
'no-param-reassign': ['error', { props: true }],
```

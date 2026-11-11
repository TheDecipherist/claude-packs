---
# concepts: js
paths:
  - "placeholder"
---

# Never mutate a function's inputs

A caller never has its data changed under it.

<constraints>
Always do:
- Return a new value instead of changing an object or array passed in: `return { ...user, name }`, with the parameter `Readonly<User>`.
- Build up a local array or object that the function created itself, freely: the law is about inputs, not a blanket ban on mutation.

Never do:
- Change an object or array passed to a function: `user.name = name; return user;`.
</constraints>

## Check
Where the project has ESLint: `no-param-reassign` with `props: true`.

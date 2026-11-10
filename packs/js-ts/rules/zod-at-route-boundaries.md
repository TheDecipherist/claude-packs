---
# concepts: routes
paths:
  - "placeholder"
---

# Every Fastify route declares a Zod schema

## The law
Each route validates its input (`body`, `querystring`, `params`, `headers` as needed) with Zod through Fastify's type provider. Handlers only ever see parsed data. No route reads `request.body` unvalidated.

Make it structural: routes are registered **only** through one helper whose type requires a schema.

```ts
// lib/define-route.ts (the single base every route comes from)
export function defineRoute<S extends RouteSchema>(def: {
  method: HTTPMethods; url: string; schema: S; // required, not optional
  handler: RouteHandler<S>;
}) { return def; }

// routes/users.ts
export default defineRoute({
  method: 'POST', url: '/users',
  schema: { body: CreateUserSchema, response: { 201: UserSchema } },
  handler: async (req) => createUser(req.body), // req.body is typed + validated
});
```

## Why
Untyped input also matters for MongoDB: an unvalidated `{ "email": { "$ne": null } }` body becomes a query operator. Zod forces `email` to stay a string.

## Check
Ban direct route registration outside the helper:
```js
'no-restricted-syntax': ['error', {
  selector: "CallExpression[callee.property.name=/^(get|post|put|patch|delete|route)$/][callee.object.name=/^(app|fastify|server)$/]",
  message: 'Register routes through defineRoute() so a schema is required.',
}],
```
Adjust the paths above to match where your routes live.

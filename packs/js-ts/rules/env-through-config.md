---
# concepts: js
paths:
  - "placeholder"
---

# Environment variables only through one validated config

## The law
`process.env` is read in exactly one file, `src/config.ts`. That file parses it with Zod at startup and exports a typed, frozen `config`. A missing or malformed variable crashes the boot with a clear message rather than failing later at the first request.

```ts
// src/config.ts
const Env = z.object({
  MONGODB_URI: z.string().url(),
  PORT: z.coerce.number().int().default(3000),
  GROVE_API_KEY: z.string().min(1),
});
export const config = Object.freeze(Env.parse(process.env));

// anywhere else
import { config } from './config.js';
```

## Never
- Hardcode a secret, key, token or connection string in source, even "temporarily".
- Read `process.env.X` inline elsewhere.

## Check
```js
// eslint-plugin-n
'n/no-process-env': 'error',
// override for the one allowed file:
{ files: ['src/config.ts'], rules: { 'n/no-process-env': 'off' } },
```
Secrets: run `gitleaks git --pre-commit --staged` in the pre-commit hook.

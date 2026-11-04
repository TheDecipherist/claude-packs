---
# concepts: env
---
# env.ts holds the shape of the environment, never a value; .env is never committed

<constraints>
Always do:
- Parse `process.env` once, at start, with a Zod schema in `env.ts`: each name, its type, whether it is required, a default only when it is not a secret. Fail at start when one is missing.
- Keep the values in an ignored `.env`; commit `.env.example` with the names.

Never do:
- Write a secret or a real value into `env.ts`, or read `process.env` anywhere else.
- Commit a `.env` (`secrets-guard` refuses it).
</constraints>

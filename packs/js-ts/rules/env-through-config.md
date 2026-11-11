---
# concepts: js
paths:
  - "placeholder"
---

# Environment variables only through one validated config

A missing or malformed variable crashes the boot with a clear message, instead of failing later at the first request.

<constraints>
Always do:
- Read `process.env` in exactly one file, `src/config.ts`.
- Parse it there with Zod at startup, and export a typed, frozen `config` (`Object.freeze(Env.parse(process.env))`). Everything else imports `config`.

Never do:
- Hardcode a secret, key, token or connection string in source, even "temporarily".
- Read `process.env.X` inline in any other file.
</constraints>

## Check
`process-env-only-in-config` and `localhost-default-in-server` refuse an edit that adds the fault. Where the project has ESLint: `n/no-process-env` on, off for `src/config.ts` alone. Secrets: `gitleaks git --pre-commit --staged` in the pre-commit hook.

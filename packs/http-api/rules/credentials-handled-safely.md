---
paths:
  - "placeholder"
---

# Credentials are short-lived, hashed at rest and never in a record

<constraints>
Always do:
- Store API keys and tokens hashed, and look them up by hash.
- Sign OAuth `state`, or keep a random value server-side.
- Pin the algorithm when verifying a token.
- Consume a one-time token in one atomic update, and revoke refresh tokens on a password reset.
- Keep a reference in a job record, and the secret in the secret store.

Never do:
- Name a field `_encrypted` and write plain text to it.
- Use a six-digit code with no per-account attempt limit.
</constraints>

## Check
`secret-in-job-record`, `oauth-state-signed`, `encrypted-name-plaintext-value`, `short-code-needs-limit`, `one-time-code-compared-raw`, `jwt-verify-pins-algorithm`.

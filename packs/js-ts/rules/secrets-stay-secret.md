---
# concepts: js
paths:
  - "placeholder"
---

# A secret never reaches a log, a default or Math.random

<constraints>
Always do:
- Log what happened, never the body: name the fields you log.
- Make keys and codes with `crypto.randomBytes`.
- Fail at start-up when a secret is missing.

Never do:
- Log a request body, a password or a token.
- Give a secret a default value.
- Use `Math.random` for anything an attacker would like to guess.
</constraints>

## Check
`no-secret-in-log`, `secret-needs-crypto-random`, `secret-has-no-fallback`.

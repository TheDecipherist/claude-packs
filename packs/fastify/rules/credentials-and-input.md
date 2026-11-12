---
# concepts: routes
paths:
  - "placeholder"
---

# Passwords are slow-hashed, secrets compared constant-time, regexes never built from input

<constraints>
Always do:
- Passwords at rest: argon2id (preferred) or bcrypt cost ≥ 12; the library manages the salt. The plaintext exists only in the request that carries it: never persisted, logged, returned or put in an error message; response schemas omit the hash field entirely.
- Secrets compared constant-time: the hash library's verify for passwords, `crypto.timingSafeEqual` for tokens (`secrets-compared-constant-time`).
- Login failures say "Invalid email or password", never which field.
- Every public, unauthenticated endpoint that accepts user-submitted data (login, signup, contact, reviews, newsletter) carries a human gate (a CAPTCHA verified **server-side**) plus a rate limit, and its rejections are observable.
- Unauthenticated input that becomes durable state later rendered to another user is a decision recorded in the feature doc, not a default.
- A `RegExp` built from input goes through an escape helper (`no-regexp-from-input`), with a test that goes red when the sanitiser is bypassed.
- Test passwords are generated per run and test emails assembled at runtime; no password, secret or email literal is ever committed, tests included.

Never do:
- md5/sha-family digests for passwords, salted or not (`password-needs-slow-hash`): fast hashes fall to offline brute force at billions of guesses per second.
- `===` on a token or secret.
- `err.message` in a client-facing body.
</constraints>

## Check
Lesson checks for this rule: `no-regexp-from-input`, `password-needs-slow-hash`, `secrets-compared-constant-time`.

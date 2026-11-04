---
paths:
  - "**/*.tsx"
  - "**/*.jsx"
---

# Long-lived secrets stay out of browser storage

<constraints>
Always do:
- Keep sessions in `HttpOnly` cookies.

Never do:
- Put a refresh token or an API key in `localStorage`.
</constraints>

## Check
`secret-not-in-web-storage`.

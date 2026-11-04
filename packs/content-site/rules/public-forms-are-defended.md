---
paths:
  - "**/*.html"
  - "**/*.md"
  - "**/*.mdx"
  - "**/*.tsx"
  - "**/*.ts"
  - "**/*.js"
---

# A public form expects abuse: rate limits, a real challenge, moderation

<constraints>
Always do:
- Rate limit every public form, per IP and per account.
- Use a challenge that cannot be replayed or read from the page, or a honeypot and a time check.
- Hold comments for moderation by default, with a status field.
- Render user text through one sanitiser, on the server, and store the source as well as the output.
- Escape every value that goes into `innerHTML`, or use `textContent`.

Never do:
- Use a constant captcha answer: a script passes it.
- Trust the client's copy of a score, a rating or a counter.
</constraints>

## Check
`captcha-is-not-constant`.

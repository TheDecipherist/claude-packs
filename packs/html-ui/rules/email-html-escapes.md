---
paths:
  - "**/email/**"
  - "**/mail/**"
  - "**/emails/**"
---

# HTML email escapes every value, as a page does

<constraints>
Always do:
- Pass every value through the escaper when building HTML mail.

Never do:
- Put a name, a subject or any stored text into mail HTML unescaped.
</constraints>

## Check
`email-html-escapes`.

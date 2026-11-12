---
paths:
  - "**/*Editor*"
  - "**/*Panel*"
  - "**/ui/**"
  - "**/app/**"
  - "**/painter/**"
  - "design/**"
  - "**/*.html"
  - "**/*.htm"
---

# The UI is drawn in code, from the reference, and never prototyped in HTML

<constraints>
Always do:
- Draw every part of the UI in code from the reference's measured numbers, so it scales to any size and a control changes in one place (`ui-drawn-in-code`).
- Design the UI once, in the reference picture, measured with `analyse-reference-look` and held by the look gate; never in an HTML page beside it (`no-html-prototype`).

Never do:
- Ship an image, a sprite or an embedded asset for any part of the UI.
- Prototype the panel as an HTML page: it becomes a second design that nothing holds to the first.
</constraints>

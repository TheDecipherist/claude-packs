---
# concepts: ui-markup
paths:
  - "placeholder"
---

# Dates and numbers are formatted for the reader, and line up

<constraints>
Always do:
- Format with `Intl.DateTimeFormat` and `Intl.NumberFormat`, in the reader's locale.
- Use `font-variant-numeric: tabular-nums` where numbers are compared in a column.
- Guard a rendered date against hydration mismatch between server and client.
- Mark brand names and code tokens `translate="no"`.

Never do:
- Build a date by hand from its parts (`ui-intl-for-dates`).
</constraints>

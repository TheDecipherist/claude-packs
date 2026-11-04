---
paths:
  - "**/*.tsx"
  - "**/*.jsx"
---

# Every control has a name, and every dialog says it is one

<constraints>
Always do:
- Give an icon-only button an `aria-label`.
- Tie every label to its field with `htmlFor`.
- Give a modal `role="dialog"` and `aria-modal`, and move focus into it.

Never do:
- Use a clickable `div` where a `button` belongs.
</constraints>

## Check
`dialog-needs-role`, `icon-button-needs-name`, `label-needs-a-field`.

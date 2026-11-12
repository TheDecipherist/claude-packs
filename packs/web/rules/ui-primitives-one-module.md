---
# concepts: pages, components
paths:
  - "placeholder"
---

# One UI primitives module; pages compose it and never hand-roll a control

People judge the product by its UI first: a styled, consistent surface makes everything else credible; an unstyled one gets no second look. The structural fix is the same as the schemas module and the database gateway: exactly one place where raw controls are styled.

<constraints>
Always do:
- One pinned primitives module (`src/components/ui/`): Button, Field (label + input/select with the shared field styling), Card, PageHeader, EmptyState, Modal/Sheet, and whatever the spec's component inventory names. Its barrel carries the header contract:
  ```ts
  // UI PRIMITIVES: the ONLY place raw controls are styled. Pages compose these; never a bare
  // button/input/select with ad-hoc classes. Tokens come from @theme. New primitive => new file here.
  // Rule: ui-primitives-one-module.
  ```
- The primitives module ships in the **first** wave of any web build, before any page.
- Every page states its layout skeleton (container width, page header, section order, where the primary action sits) in its doc; two pages with the same kind of content use the same skeleton.
- One primary action per view, visually dominant; destructive actions in the red family and never adjacent-identical to safe ones; secondary actions quiet.
- Every list surface designs its empty state (first login **is** the demo); every async surface designs loading and error. `EmptyState` is a primitive so the designed version is one import away.
- Colour, spacing and type come from tokens; both colour schemes are first-class.
- When `design/` holds approved reference images, surfaces are built to match them; kit rules (contrast, a11y, self-hosted fonts) win over the image and the deviation is recorded.

Never do:
- `<button>`, `<input>`, `<select>`, `<textarea>` in a page or feature component (`ds-pages-compose-primitives`).
- A raw hex colour in a page or component (`tw-no-raw-hex-in-markup`).
- Ship a surface with zero styling classes: it is an automatic blocker in `design-review`.
</constraints>

## Check
Lesson checks for this rule: `ds-pages-compose-primitives`, `tw-no-raw-hex-in-markup`.

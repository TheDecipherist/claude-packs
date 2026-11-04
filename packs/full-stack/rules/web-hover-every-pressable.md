---
# concepts: ui
paths:
  - "placeholder"
---

# Everything the pointer can act on says so: a cursor for the interaction and a small effect on the hovered thing

<constraints>
Always do:
- Give every element a user can act on (a button, link, tab, menu or list row, a draggable thing, a text field) two things under the pointer: (a) a `cursor` that names the interaction (pointer for a press or link, text for a field, grab or a resize cursor for a drag) and (b) a small visible effect on that element itself (lift, ring, brighten, underline) with a `:hover` style and a short transition (about 100 ms).
- Keep the hover and the press on the same element and the same selector or component: one hit test, one place that defines what is interactive, never a second list.
- Pair `:hover` with `:focus-visible` so keyboard users get the same signal.
- Use the disabled look only for what is truly disabled (`disabled` or `aria-disabled`). Something that responds gets the hover.
- Give a new screen or component its hover in the same change that makes it interactive, and prove it with the hover walk in the skill `hover-state`.

Never do:
- Ship a clickable `div` with no `cursor: pointer` and no hover effect; use a real button or link, or give it both.
- Choose one cursor for everything: the cursor names the interaction.
- Let the effect shift the layout or the neighbours (transform, shadow or colour, never size or margin).
</constraints>

## Check
The project's hover gate (layout.json `gates.hover`): a browser walk over every interactive element, red if the computed cursor or the drawn pixels do not change on hover. `doctor` is red while UI code exists and no gate is declared.

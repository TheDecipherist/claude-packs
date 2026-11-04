---
# concepts: ui-markup, ui-styles
paths:
  - "placeholder"
---

# Everything the pointer can act on says so

Tim: a hovered element MUST show it is interactable by changing the cursor to match the action, and should usually do something that fits it.

<constraints>
Always do:
- Change the cursor to name the action: `pointer` to activate, `text` to edit, `grab` and `grabbing` to drag, `col-resize` or `row-resize` to resize, `zoom-in` to enlarge, `not-allowed` for what is truly disabled.
- Give the hovered thing itself a small effect that fits it: a tone step, a colour, a slight growth, an underline. Hover colour in 180-200ms, a hover that moves in 300-400ms.
- Press answers too: a small change in 100-160ms, so a click is felt.
- Use the same hit area for hover and press: one function or element, never a second list.
- Make hover and focus-visible agree, so a keyboard user sees what a mouse user sees.

Never do:
- A `pointer` cursor on something inert, or no change on something that acts.
- A custom cursor image (`ui-no-custom-cursor`).
- Lift or zoom every card: the effect means "this acts", so an element that does nothing gets none.
</constraints>

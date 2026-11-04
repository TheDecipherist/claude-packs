---
# concepts: ui
paths:
  - "placeholder"
---

# Everything the pointer can act on says so: a cursor for the interaction and a small effect on the hovered thing

<constraints>
Always do:
- Give every element the pointer can act on (a control, a point or handle, a tab, a list row, a key, a button, a text field) two things when the pointer is over it: (a) a cursor that names the interaction (drag up-down, drag left-right, drag both ways, press, text) and (b) a small visible effect on that element itself (lift, ring, brighten, glow).
- Find the hovered item with the same function the press uses (one hit test). The press and the hover share it, so a thing drawn as interactive cannot be missing from the hover; never keep a second list of hoverable things.
- Draw the effect on the hovered item's own pixels, ease it in and out (a glide of about 0.1 s) on the frame clock, and let it come back to rest when the pointer leaves.
- Give a new control its hover in the same change that gives it its press, and prove it with the hover walk in the skill `hover-state`: the gate moves the pointer over every pressable item and reads that the cursor and the drawn pixels change.
- Use the disabled look only for what is truly disabled (it does not respond to a press). A control that responds gets the hover.

Never do:
- Ship a control, handle, tab or row that responds to a press and has no hover (a pointer that does not change and a thing that does not react).
- Choose one cursor for everything: the cursor names what the interaction is.
- Let the hover effect spill onto its neighbours (a ring or glow round the item is fine; the items beside it must not change).
- Wire hover from a separate list, a duplicate of the hit test or a per-control flag that the press does not read.
</constraints>

## Check
The project's hover gate (layout.json `gates.hover`): a hover walk over every pressable item, red if any item's cursor or own pixels do not change, or if it does not return to rest. `doctor` is red while UI code exists and no gate is declared.

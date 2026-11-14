---
name: review-a-panel
description: Use when a panel is finished and about to be called done, at the closing review of a rebuild or a plugin, or when a brief sends a run to the house's list for a panel.
---

# Review a finished panel (one job: the closing walk, one list, one tick per probe)

The closing review is where a panel is called done; a walk by eye lets items slip. One list built from the audio-core panel rules, with a probe for each line, makes the walk a record.

<constraints>
Always do:
1. Build one list from the audio-core panel rules, grouped as structure (`panel-sizes-by-kind`, `panel-tabs`, `section-header-and-lamp`), controls (`house-control-behaviours`, `knob-anatomy`, `knob-gestures`), type and colour (`colour-by-role`, `panel-colour-safe`, `panel-icons`), behaviour (`display-echo`, `modulation-overview-page`, `undo-one-gesture-one-step`) pipeline (`control-reaches-every-surface`, `curve-screen-drags`) and layout (`panel-surfaces`, `column-names`, `instance-grid`, `host-parameter-names`, `modulation-by-drag-and-drop`, `keys-belong-to-the-keyboard`); then walk every audio-core rule with `panel-spec` in its concepts and add any line still missing.
2. Name the probe that answers each line (a gate, a render, a read of the table).
3. Run the probe and tick the item only on its output; a tick from memory or by eye does not count.
4. List an item no probe can answer as open, with why.
5. Report the list with each line ticked or open.

Never do:
- Tick an item without its probe's output.
- Drop an item from the list because no probe answers it.
</constraints>

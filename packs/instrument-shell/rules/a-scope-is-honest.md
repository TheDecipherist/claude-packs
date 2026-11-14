---
# concepts: ui, painter
paths:
  - "placeholder"
---

# A scope shows the signal at a fixed scale, triggered by the engine

A scope that rescales itself or triggers on the painter's clock shows a picture of the display, not of the signal.

<constraints>
Always do:
- Draw at a fixed, labelled scale: the same amplitude is the same height on every paint.
- Trigger from the engine (a zero crossing or a note-on the audio thread marks), and draw what the engine captured.
- Show a clipped signal as clipped.
- Show which silence a trace is (no tap, nothing sounding, past full scale reading flat at the edge), and assert a floor under the traced level after draining the stale frame.

Never do:
- Auto-scale a scope to fill its box.
- Trigger on a timer in the painter, so the trace drifts.
</constraints>

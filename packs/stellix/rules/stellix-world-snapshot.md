---
# concepts: world, painter, audio
paths:
  - "placeholder"
---

# The painter sees the world only through one plain-data snapshot

From spec §8 and §7.3.

<constraints>
Always do:
- Keep the world as coordinates on the audio side: a traveller is a position and a velocity; a moon is a position, a radius and a border; a planet is a position and a radius. Each 240 Hz tick moves travellers, checks distances and turns hits into pushes, as arithmetic only.
- Publish one plain-data snapshot per tick (positions, pushes, hits) behind a single atomic index. Use double or triple buffering, whichever keeps the reader from ever seeing a half-written one.
- Let the painter read only the snapshot, at its own frame rate. It may extrapolate between ticks with the same formulas, but when they differ the snapshot wins.
- Compute predictions (ghost paths, "cutoff +12%") with the engine's own formula code on a copy of the world's state, never with a second version of the formulas.

Never do:
- Include anything from the painter, a GPU API or JUCE OpenGL in world, engine or voice code. `.claude/checks/world-never-includes-painter.json` blocks it.
- Do camera, perspective, lighting, mesh, bloom or path drawing work inside the world tick. The look-only test's 17 ms demo step is the example of what this forbids.
- Let the audio thread wait for, lock against or allocate for the painter.
</constraints>

## Check
- Torn-snapshot gate: a reader hammering the snapshot while the world writes at full rate must never see a mixed one. Plant the fault by writing in place, and the gate goes red.
- Prediction gate: play a passage; every predicted hit happens, and no unpredicted hit occurs.
- The realtime-guard hook blocks GPU calls in audio-thread code.
Lesson check for this rule: `world-never-includes-painter`.

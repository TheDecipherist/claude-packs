---
# concepts: painter, shaders, world
paths:
  - "placeholder"
---

# Travellers are drawn from the world snapshot, never simulated on the GPU

Spec §8: the world (on the audio side) decides every position; the painter only shows it.

<constraints>
Always do:
- Upload the snapshot's traveller list (up to the TRAVELLERS cap of 1024: notes, shatter pieces, sparks) once per tick into one storage buffer.
- Draw every traveller with one instanced call: billboards with corners generated from `vertex_index`, no vertex buffer.
- Draw trails from a ring of each traveller's last positions, as instanced ribbon segments.
- Smooth motion between ticks by interpolating the last two snapshots on the GPU.

Never do:
- Integrate traveller physics in a compute shader or anywhere in the painter. A second copy of the formulas in WGSL drifts from the C++ world, and then the picture lies about the sound.
- Upload per-traveller data more than once per tick.
</constraints>

## Check
Frame bench at 1024 travellers with trails. Pass (house): ≤ 2 draw calls for travellers and trails, upload no more than one snapshot per tick, ≤ 0.3 ms GPU.

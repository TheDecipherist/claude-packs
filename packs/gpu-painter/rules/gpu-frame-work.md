---
# concepts: painter, shaders
paths:
  - "placeholder"
---

# Everything is drawn on the graphics card; the CPU only hands over the snapshot

From spec §0 rules 1–3 and §9.

<constraints>
Always do:
- Draw everything on the card: the space, the columns, the controls, the keyboard band, the menus and text (a glyph atlas on the card, built from the shipped font files).
- Compute geometry, facets, noise, refraction, particles, bloom and tone mapping in shaders. The CPU's drawing job is one thing: upload the snapshot once a frame.
- Draw each particle system and object set (travellers, shatter pieces, comets, delay balls) with one instanced draw.
- Upload only what changed: the snapshot, plus waveform rings by sub-range.
- Keep frames in flight bounded, with per-frame buffers, so the CPU never overwrites what the card is reading.
- Compile shaders once (at build, or once at startup from embedded source) and cache the pipelines.
- Draw static controls once into memory when the window opens or resizes. The cache is made at runtime at that size, never shipped, and leaves motion unchanged.

Never do:
- Add a software drawing path or a fallback to one (Tabula's D6 doesn't apply to Stellix).
- Compute anything per vertex or per pixel on the CPU.
- Ship any image. The `no-shipped-images` hook refuses image files in source and resources; fonts are allowed.
- Read GPU results back during normal frames (test harness only).
</constraints>

## Check
- CPU gate: time the CPU side of a frame. It goes red if it exceeds the snapshot upload by more than a small fixed margin.
- Frame bench counters: draw calls and uploaded bytes per frame (house choice: ≤ 50 draw calls in the reference scene).

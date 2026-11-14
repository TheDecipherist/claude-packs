---
name: identify-a-parameter
description: Use when a stored byte or a parameter's meaning is unknown and its audible effect is to be found by rendering, before it is named in a table.
---

# Identify a parameter (one job: an unknown byte named by its audible signature)

Render the sound with the byte at several values, change nothing else, and read what moved.

<constraints>
Always do:
1. Sweep the byte and read the signature. Level changes with no change of spectrum: a gain. Spectrum changes with no change of level: a filter. Level up and spectral flatness down: a resonance. A change over time: an envelope. A periodic change: an LFO. Left against right: a pan. Spectral flatness does the most work; compute it first.
2. A byte whose sweep steps instead of ramping is a switch. Try 0, 1, 2 and 3, and count the positions at which the output stops changing.
3. For a bipolar control, find its neutral first and judge every render against it.
4. Tag the result `[EMU]` or `[REC]` with the render it came from; a name from a signature alone is a guess until a second render agrees.
5. Lay a parameter list onto offsets by measured signature, never by counting names: one byte may carry several names (a knob per waveform), so collapse aliases only after the byte is known.
6. Read a decoded number by the plugin itself (host it, render, measure) and never fit a guessed curve. Read its displays before any render in a fresh instance, and expect a refused edited section to keep the previous preset.

Never do:
- Name a byte from one render at one value.
- Judge a bipolar control before its neutral is found.
</constraints>

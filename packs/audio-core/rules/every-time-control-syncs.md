---
# concepts: ui, panel-spec, params
---

# One master clock, and every time-based control has its own sync

<constraints>
Always do:
- Keep one master clock, in the shell: `INT` (the tempo field), `HOST` (wins only while the host plays) and `EXT` (MIDI clock, 0xF8; it falls back to `INT` after a beat of silence, and says so). The field shows the effective tempo and its source, read-only under `HOST` and `EXT`.
- Give every time-based control its own sync, per instance: each delay channel, each LFO's rate (with its division, triplet and dotted forms), an envelope's units in BPM, the arp and clip with their swing.
- Let sync override the knob and keep its free value, so turning sync off returns it.
- Move only synced times when the tempo changes, and align rate destinations to the beat.
- Gate it with a sync probe at 120, 90 and 140 BPM that checks the mirror and the beat alignment.

Never do:
- Put one global sync switch in place of a sync per control.
</constraints>

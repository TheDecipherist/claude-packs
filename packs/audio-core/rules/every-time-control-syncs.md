---
# concepts: ui, panel-spec, params
paths:
  - "placeholder"
---

# One master clock, and every time-based control has its own sync

<constraints>
Always do:
- Keep one master clock, the plugin's master clock: `INT` (the tempo field), `HOST` (wins only while the host plays) and `EXT` (MIDI clock, 0xF8; it falls back to `INT` after a beat of silence, and says so). The field shows the effective tempo and its source, read-only under `HOST` and `EXT`.
- Give every time-based control its own sync, per instance: each delay channel, each LFO's rate (with its division, triplet and dotted forms), an envelope's units in BPM, the arp and clip (swing applies to their steps only).
- Give every RHYTHM time a sync: the delay, the LFO and arp rates, the envelope's time in BPM. Never sync a TIMBRE time (a chorus or doubler pre-delay, a diffuser, a comb, a short slapback): it follows no tempo.
- List FREE first on a control used both ways, so its saved value reads as free until sync is chosen.
- Offer sync on a reproduction's rhythm times wherever its hardware could follow a clock. The standalone opens as the hardware did (sync off); as a plugin it opens in sync (the host clock, delays synced; LFOs and envelopes free unless the machine says otherwise).
- Fire a fresh chord at once when the clock starts, never on the next beat.
- Keep the clock running under bypass, so leaving bypass finds the beat.
- Let sync override the knob and keep its free value, so turning sync off returns it.
- Move only synced times when the tempo changes, and align rate destinations to the beat.
- Gate it with a sync probe at 120, 90 and 140 BPM that checks the mirror and the beat alignment.
- Resolve the tempo first in each block and pass it into every time-based node as an argument, never fetch it inside, so a tempo move reaches a synced delay in the same block.

Never do:
- Put one global sync switch in place of a sync per control.
- Apply swing to a delay or an LFO: swing moves a step's start, never a time or a rate.
</constraints>

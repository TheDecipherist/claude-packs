---
# concepts: ui, painter, panel-spec
paths:
  - "placeholder"
---

# Every display shows its scale, its handles and, where it fits, an assignable morph point

A curve with no numbers is a picture: nobody can tell what frequency the filter sits at or how long a release lasts. A curve the hand cannot grab sends the user back to the knobs. And a display that could steer two things at once (a filter's cutoff and resonance) wastes the one control that moves both.

<constraints>
Always do:
- Draw on every display the scale that says what it shows, in the units a player thinks in, from the same formula the sound uses (`one-formula-per-value`):
  - a filter: a log frequency axis with labelled decades (100, 1k, 10k Hz), a level axis in dB, the cutoff's value at its point and the resonance peak's height;
  - an envelope: each stage's time printed on its segment (ms below a second, s above), the sustain level on its plateau, a time axis that stretches with the longest stage;
  - an LFO: its rate (Hz, or the sync division when synced), one period marked, the amplitude as -/+ and the phase where the wave starts; delay and fade shown as their own stretch before the wave;
  - a waveform: its name, and its pulse width or other shape value where it has one;
  - any other display: the axis and units of what it draws, decided when the display is designed and written in its row.
- Give every editable curve a drag point for every value it draws (attack, decay, sustain and release corners; cutoff; resonance; an LFO's rate and depth), each moving its own parameter through the same model the knobs use (`curve-screen-drags`), and show the value beside the point while it moves.
- Give a display a morph point where one gesture moving two values makes sense (a filter's cutoff and resonance; a shaper's drive and mix; an effect's two main amounts): one point on the display whose X and Y each drive an assignable target.
- Let the user assign each morph point in a settings page (a "Morph" tab of the settings layer): for each axis, the target parameter or parameters, the range on that target, the direction and the curve (linear, exponential, S); several targets on one axis move together. The defaults are the obvious pair (cutoff on X, resonance on Y), so the point works before anyone opens the page.
- Prove it in a gate through the real editor: a drag on each point moves its parameter by what the scale says; a morph point with two assigned targets moves both; the printed scale's values equal the sound's (a cutoff shown at 1 kHz renders at 1 kHz); planted "a display with no scale" and "a morph point that moves nothing" seen red.

Never do:
- Ship a display with no scale, or with a scale from a different formula than the sound's.
- Give a curve a point the hand cannot drag, or a morph point whose targets cannot be changed.
- Hide the morph assignment anywhere but the settings layer's own page.
</constraints>

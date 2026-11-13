# Effects units, bank tiers and engine checklists

Load for an effects unit, a whole bank, or a modulation engine. Numbers are tagged as in `SKILL.md`.

## Effects units

- **Three layers** [LAW]: the base (the machine on and in circuit), then a routing profile (where each module sits and what drives it), then the recipe. Each overrides only the one before. Ship a small named set of routing profiles as data per machine, and make every preset name one. A profile names a position by its label, resolved against the machine's own choice list, and generation fails on a label the machine lacks.
- **The player's copy** [LAW]: with two of the same block, ask which copy the player owns. That copy keeps a fixed, learnable job in every preset (filter 1 always on the input); the patch's copy carries the variety.
- **Placement is chosen** [WHY]: a placement whose host module is off is inaudible, so the recipe arms the host. A placement at zero amount is inaudible. Name the space. A filter is type, slope, width, key-follow and two modulation depths, never a cutoff alone.
- **Three-source test** [LAW]: judge an effects preset on a dry pluck, a pad and a drum loop. It must be usable on at least two, and its notes say which.
- **Effect recipe cards**: write each effect as the controls that make it, with ranges, and leave the rest free: slapback, dub tail, ping-pong, shimmer, tape wobble, gated ambience, lo-fi crush, ducking delay, filtered riser, rhythmic grid.
- **Delay** [WHY]: ping-pong reads only when the times differ or feedback is over 40%. Modulation of 0.3 to 0.8 Hz at 3 to 8 cents belongs to analogue-style presets only; a digital one has none. Inverted feedback is a named category. A delay can be movement (1 to 2% regeneration) rather than echo (25% and over), and that is its own category.
- **Reverb** [LAW]: a spring is its own instrument, so keep the boing, for leads and not pads. Freeze presets are a category, with the amount on a macro. Ship one ducked and one un-ducked flagship hall. Give decay in beats where the module allows. The early control is the distance knob.
- **Chain laws** [LAW]: one hero. The order is the preset (drive, filter, delay, reverb by default; any other order is a named type). Every block sits within 1 dB of its input, with overall gain set at MIX or OUTPUT. MIX is tuned on a send (100% wet) and on an insert. A follower drives one destination, with depth set so a quiet source still gets it. The chain that stands out does one unexpected thing.

## Bank tiers

- **3 / 30 / 100** [LAW]: three flagships no other machine can make, each with a wheel move that changes the song; thirty a producer keeps; the rest real variations. About 10, 60 and 30 percent of the bank.
- One **signature move** for the machine, heard across the bank.
- The **one-hand demo**: each flagship carries a 20-second demonstration played with one hand.
- Ship fewer if that is what passes the gate: 96 that pass beat 128 with filler.

## Recipe checks

- A recipe's amp-envelope shape is one its kind mostly uses (at least 20% of the kind's patches, or the commonest).
- Every destination modulated in at least half of a kind's patches is routed in the recipe (key tracking aside). This is the must-route list per kind.
- **Filter-envelope shapes**: pluck sweep (fast decay, low sustain), slow sweep, swell, held open, partial. Write the thresholds beside the amp shapes of `building-blocks.md`.

## Bass lessons [EAR]

- A clean sine fundamental under a filtered saw. A square an octave down is not a sub: its third partial is mud.
- Never stack a second oscillator and a sine sub in the sub band: the sub ends up at 42% and the body at 6.6%.
- A resonant corner inside 200 to 400 Hz builds mud; keep it under 200 Hz.
- A mono crossover that subtracts the same filter's output is phase transparent.

## Envelope engine checklist

- Seven stages with two intermediate levels, a delay stage, one curve function (EXP is the exact mirror of LOG), and the machine's timing laws.
- A guard for a lag with sustain 0; retrigger from the current level; attack overshoot; velocity; time key-track; times in tempo divisions.
- Stage boundaries are modulation sources named from the ROM's own list, and each boundary is gated to fire (an off-by-one never fired).

## LFO engine checklist

- A direction change alters the order of the shape, never its rate (ping-pong runs the accumulator at half speed).
- Each shape is a generated point list that stores its cycle length in bars, and is probed at that length.
- Per voice: shared coefficients, per-voice phase, fade-in, start phase, retrigger, song-position lock. Ask each of these of the machine.

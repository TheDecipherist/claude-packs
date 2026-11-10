# MIDI clock and sync: the law

Everything we know about clock, gathered in one place because it decides how
every unit behaves and because getting it wrong is silent. Nine effects units
shipped deaf to the transport with every test green.

Provenance tags are the usual ones: `[MIDI]` the published spec, `[FW]`
firmware with an address, `[SCH]` a schematic sheet, `[MAN]` a manual page,
`[PUB]` a published source, `[EAR]` fitted by ear, `[COR]` the corpus.

---

## 1. What MIDI actually sends

**There is no tempo message.** None. No byte anywhere says "120 BPM". The
master fires a Timing Clock byte, `0xF8`, **24 times per quarter note**, and
the tempo IS the rate they arrive at. Faster pulses, faster tempo. A slave
measures the gap between them and works it out. `[MIDI]`

That is the whole mechanism: literally just a clock.

Four transport messages travel with the pulses:

| Byte | Message | Meaning |
|------|---------|---------|
| `0xF8` | Timing Clock | one pulse; 24 make a quarter note |
| `0xFA` | Start | go to the beginning and run |
| `0xFB` | Continue | resume from where we were |
| `0xFC` | Stop | halt |
| `0xF2` | Song Position Pointer | where "where we were" is: a 14-bit count of MIDI beats, and a MIDI beat is a **sixteenth note = 6 clocks** |

`0xFE` is Active Sensing. It also arrives constantly and has nothing to do
with tempo. A parser that treats the whole real-time range alike will read it
as a pulse and report a nonsense tempo.

## 2. Clock has NO CHANNEL

The most misunderstood thing about it, and it changes how you write a parser
and how you read a manual.

`0xF8` is a System Real-Time status byte. Its low nibble is part of the
message's identity, not a channel number. There is no channel field to read,
so a device's channel setting cannot filter clock, and there is **one clock
stream per PORT**. `[MIDI]`

Consequences:

- **Never channel-filter real-time bytes.** A receive path that switches on the
  channel nibble and drops what does not match will eat every clock byte.
  Real-time bytes come out before any channel test.
- **They may appear anywhere**, including in the middle of another message and
  inside a SysEx dump. That is deliberate and it is what keeps timing accurate.
  A parser assuming `F0` to `F7` runs uninterrupted will corrupt a dump the
  moment a clock byte lands in it. JUCE handles this; a hand-written parser in
  a ROM often does not, which is worth remembering when reading firmware.
- **A "sync channel" setting is almost never a channel.** Look again: it is
  usually the PORT on a machine with more than one MIDI In, or the MMC device
  ID (different thing, own numbering), or it governs Song Select and Song
  Position rather than clock.
- **Duplicate clock is a real failure mode.** A unit reachable by two paths
  receives two streams and runs at an exact integer multiple of the right
  tempo. When you see 2x, suspect the clock before the division table.

## 3. Divisions: count in 192nds, not in clocks

24 PPQN was chosen because it divides by 2, 3, 4, 6, 8 and 12, so every common
division lands on a whole number of pulses. But **write the table in ticks at
192 per quarter**, which is 8 MIDI clocks, and here is why: the Virus's own
division table is in 1/192 units and includes 1/64, which is one and a half
MIDI clocks. `[PUB]` A machine with an internal divider follows a sub-clock
division perfectly well; a slave counting raw pulses cannot. The table has to
be finer than the wire.

| division | ticks (192/qn) | MIDI clocks |
|---|---|---|
| 32 bar | 24576 | 3072 |
| 16 bar | 12288 | 1536 |
| 8 bar | 6144 | 768 |
| 4 bar | 3072 | 384 |
| 2 bar | 1536 | 192 |
| 1/1. | 1152 | 144 |
| 1/1 (one 4/4 bar) | 768 | 96 |
| 1/2. | 576 | 72 |
| 1/1T | 512 | 64 |
| 1/2 | 384 | 48 |
| 1/4. | 288 | 36 |
| 1/2T | 256 | 32 |
| 1/4 | 192 | 24 |
| 1/8. | 144 | 18 |
| 1/4T | 128 | 16 |
| 1/8 | 96 | 12 |
| 1/16. | 72 | 9 |
| 1/8T | 64 | 8 |
| 1/16 | 48 | 6 |
| 1/32 | 24 | 3 |
| 1/16T | 32 | 4 |
| 1/32T | 16 | 2 |
| 1/64 | 12 | **1.5** |

Ten divisions is not enough for any real machine. A survey of eighteen found
every one of them needed more, and mostly LONGER: bars and measures, not finer
subdivisions. The JP-8000 counts in MEASURES up to 8; the Nord Lead 3 goes to
32 bars. Make the list append-only, since a unit stores the index, and sort it
separately for a menu.

Machines name these differently and a user follows their manual, not ours. The
Virus writes a dotted eighth as 3/16 and a triplet as 1/6; the H3000 counts in
n/24; Lexicon uses N:M ratios over a settable beat value; the Nord Lead 2's
display shows a bare 1 to 7. Carry the machine's own vocabulary per
destination.

## 4. Pre-MIDI sync, and the factor of two

A machine with no MIDI socket can still be slaved. The pre-MIDI boxes that
needed to run in time already had a standard.

| machine or standard | rate | provenance |
|---|---|---|
| MIDI clock | 24 PPQN, fixed | `[MIDI]` |
| Roland DIN sync (Sync24) | 24 PPQN | `[SCH]` TB-303, TEMPO 8 ms +/- 1 at 300 BPM against 200/24 = 8.333 |
| Korg analogue sync | **48 PPQN** | `[PUB]` |
| Linn LM-1 / LinnDrum | 48 PPQN | `[PUB]` |
| Oberheim DX / DMX | 48 PPQN | `[PUB]` (same Z80 sample-playback lineage as the Linn) |
| SCI DrumTraks | **switchable 24 / 48 / 96**, and no DIN sync jack at all | `[PUB]` |
| Yamaha RX11 | **switchable 24 / 48 / 96**, out through the TAPE OUT jack, explicitly to match "Roland or Korg" format | `[MAN]` RX11 owner's manual p28 |
| Korg Polysix, Mono/Poly | **no PPQN at all** - ARPEGGIO TRIG IN is one trigger, one step; a footswitch is a listed source | `[MAN]` rear panel and arpeggiator chapter |
| Roland TR-909 | 24 out on the wire, **48 internally** | `[SVC]` tape sync: the output changes state "at every half-period of T which is 1/24 of the time required for most of Roland products to process a quarter note" |

**The difference is a factor of two and it bites.** Plug a TB-303 into a Korg
DDM-110 and the 303 runs at double speed. `[PUB]`

**But check the SOCKET before you apply a rate, because sometimes there is no
rate at all.** I asserted here that our Polysix and Mono/Poly would need Korg's
48 because they are Korg machines with arpeggiator clock inputs. That was
wrong, and the machines' own manuals overruled it: **neither has a DIN sync jack
at all.** What they have is ARPEGGIO TRIG IN, and it is not a PPQN clock -
**one trigger advances the arpeggiator by ONE STEP**. The Mono/Poly manual
settles it by listing the sources: *"footswitches (momentary, normally
open-type such as Korg PS-1, S-1, etc.), sequencers, rhythmers"* `[MAN]`, and no
footswitch sends 48 pulses to a quarter note. Korg's 48 belongs to the DIN
sockets on its sequencers and rhythm boxes; these two synths have none.

So there are two different things behind a sync jack and they need different
models: a **pulse count** (a rate, where N pulses make a quarter) and a **step
trigger** (one edge, one step). Read the jack's own documentation before
assuming which. The test differs too: a PPQN model is proved by counting pulses
per quarter, a step model by halving the division and requiring exactly twice
the notes.

**But do not treat the rate as a property of the brand.** The RX11 and the
DrumTraks both SWITCH between 24, 48 and 96, and the RX11's manual names Roland
and Korg as the formats it is matching, which tells you the incompatibility was
well enough known that Yamaha shipped a fix for it. So the rate is a property of
the MACHINE, sometimes user-selectable, and the manual settles it. Look it up
per unit; the brand is a hint, not an answer.

Note also that a machine can support a rate and still have no way to receive it:
the DrumTraks handles all three PPQN rates over MIDI and has no DIN sync jack,
so it cannot be slaved by a Roland at all. Check the JACK as well as the rate.

96 PPQN is 4x MIDI clock and 192nds divide it exactly, so the shared division
table covers 24, 48 and 96 without special cases.

**And a machine can carry two rates at once.** The TR-909's internal counter is
**48** ticks per quarter while every clock it exchanges with the outside is
**24**, one event every second tick. Confusing those two is the same factor of
two seen from the inside, and it is the easier mistake because both numbers are
correct and documented.

Same signature as duplicate clock: an exact integer multiple of the right tempo
means suspect the RATE, not the divisions. But see the meter traps in section 9
first - filter resonance puts two level peaks in every LFO cycle, so a period
reads exactly half and looks precisely like a wrong rate while being nothing of
the kind.

So the prior: **if a machine has anything that runs in time, assume it syncs,
and hold a "no" to a high standard.** "The firmware discards every real-time
byte" answers the MIDI question and says nothing about a Sync24 jack, a tape
sync input or a trigger input.

## 5. Sync is a MODE, and OFF is a sound

Not a parameter, and not a checkbox. On the hardware, sync is the box's clock
SOURCE, and while it is slaved everything with a time base follows, each at its
own division.

| state | what it means |
|---|---|
| **OFF** | nothing follows anything. Every time and rate is the stored value, and modulators drift against each other the way analogue hardware does. A legitimate sound somebody chose, not a degraded version of being synced |
| **INT** | everything follows one clock generated in the machine, so an LFO on 1/4 and a delay on 1/8 hold a fixed relationship forever. This mutual coherence is the musical point, and it holds with no cable anywhere near the unit |
| **EXT** | everything follows a master outside. With none sending, nothing moves |

**Synths get three states; most effects get two.** An effect's timing is always
something, since a delay has a delay time whether or not it follows a clock, so
its panel offers only the source. Let the machine declare which shape it has.

**Asking for OFF on a machine that has none is silently granted as INTERNAL,
and it has cost more than any other single line in this area.** `setSyncMode
(syncOff)` cannot fail - the shell resolves it, because an effect must be on
some clock - so the caller gets a machine that is still synced and never hears
about it. Once, three of four effects units had red clock probes from
exactly this, and all three ENGINES were correct:

| unit | asked for | actually measured | what it looked like |
|---|---|---|---|
| pcm80 | `setSyncMode(syncOff)` for an "unsynced" reverb-core baseline | 504 ms - the 4 ms core plus a quarter at the internal 120 | every later reading 500 ms low; nine false MISMATCHes and two false "INTERNAL FOLLOWED THE HOST" |
| h3000 | `setSyncMode(syncOff)` before checking a stored 180 ms delay | 250 ms - a 1/8 at the internal 120 | a value fault in the raw-to-ms law, which is where the note sent the next reader |
| h3500 | `setSyncEnabled(true)` before measuring against a transport | a quarter at the internal 120, at every transport tempo | a delay frozen at 500 ms |

So: **say which clock you mean.** `setSyncMode (syncExternal)` when a transport
is what you are measuring, and `setAllSyncDivisionsOff()` when nothing should be
following. Never `setSyncMode (syncOff)` on an effect, and never
`setSyncEnabled`, which resolves to EXTERNAL or INTERNAL depending on whether a
transport happens to be playing at that instant - h3500's section 3 passed and
section 2 failed on nothing but the order they ran in.

Per-destination OFF is not a workaround for the missing state, it IS the
hardware's off: Lexicon carries an Absolute-or-Tempo bit per PARAMETER `[MAN]`.
One call that turns every division off works on both shapes, so a probe need
not ask what shape the machine is first.

Two levels, and collapsing them is a real bug that made a standalone go silent:

1. **Where OUR clock comes from** (our BPM field, a DAW playhead, `0xF8` on a
   cable). One pulse stream that never stops. The master does not need
   permission to run.
2. **Whether the UNIT is slaved to it.** This is where "external disables
   internal" applies, and what it disables is the unit's OWN timing: its preset
   delay time, its rate knobs, which the synced values override while it is on.

## 6. Every unit follows an external clock

The law, and the one most easily got wrong by asking the wrong question.

"Did this 1988 machine have a MIDI clock facility" is the MIMICRY question. It
decides what gets tagged `[EAR]`. It is NOT the question of what our plugin
should do. Every unit runs as a VST inside a host, and **a host transport is
always the master when there is one**. A unit dropped into a session follows
the session with no user action, or its delays are not in time with the track.

So a machine with no OFF position resolves to EXTERNAL while a transport runs
and to its own clock otherwise. The Virus ships exactly that as a real setting
(Disable / Auto / Send) `[MAN]`, so it is hardware precedent rather than an
invention.

**What stays off by default is each DESTINATION's division.** A division
OVERRIDES the stored value, and a Lexicon preset's 247 ms delay must not
silently become 500 ms because the project is at 120 BPM. Slaved and ready,
overriding nothing until asked.

## 7. What belongs where

The hardware splits this and so do we.

- The **switch** is a system setting. It belongs to the installation, not the
  sound, and survives a program change.
- The **divisions** are musical content and live in the program. The Virus
  keeps LFO Clock in the patch; Lexicon keeps the rhythmic value in the preset.
  `[MAN]`

And the divisions belong on the UNIT's panel, never on the transport bar. A
master clock sends pulses; it has no business choosing what a slave does with
them, any more than a DAW's transport picks your delay's note value. The PCM 91
is the clearest case: it chooses which parameters follow tempo PER PARAMETER,
each with its own Flags bit. `[FW]`

**A destination must declare its range.** The Reverb 4000's pre-delay tops out
at 300 ms, so a quarter at 120 BPM (500 ms) silently clamps: the panel reads
1/4 while the box sits at its ceiling. Show what cannot be reached, greyed,
rather than pretending.

**And `lo` and `hi` are a MINIMUM and a MAXIMUM, not a bottom byte and a top
byte.** On a machine whose law counts downward those are opposite things: the
JX-8P family's LFO byte indexes the shared time table with its COMPLEMENT, so a
bigger byte is FASTER, and writing the two ends in byte order declared lo
24.375 Hz against hi 0.011. Take `std::min` and `std::max` of the two extremes and
the direction of the law stops mattering. A byte value that means STOPPED is not
the bottom of a rate range either - the OB-8's increment table entry 0 is zero and
the Pulse's speed 0 is the sample-and-hold trigger, so both ranges start at 1.

**Where a machine's destination list is dynamic, key stored divisions to the
destination's NAME, not its index.** The H3000 declares its destinations from
the current algorithm's own parameter objects, so index 0 means a different
delay after an algorithm change and would silently inherit the previous
setting. Same class of bug as renumbering an enum.

## 8. Naming: the MASTER trap

Every manufacturer named the same idea differently, and a user follows their
machine's manual.

| vocabulary | seen on |
|---|---|
| INT / EXT | Nord Lead 3 Master Clock menu, and the most common pair |
| MASTER / SLAVE | various |
| Internal / MIDI Clock | Lexicon PCM 91 Tempo Source |
| MIDI CLK | small displays |
| SOURCE | the parameter's name rather than its values |
| Disable / Auto / Send | Virus, which folds clock OUT into the same parameter |
| HOST | plugins, for a DAW transport |

**"MASTER" appears on BOTH sides of this.** Some panels label the source they
follow as the master ("sync to master"); others label the machine's own role.
Read which one a manual means before copying the word, or a unit ends up
printing MASTER while it is the slave.

**Our transport bar is ALWAYS the master.** It may itself be following a DAW or
a cable, but the unit is never our master.

## 9. How to verify, and every trap we hit

**Measure the AUDIO, not the arithmetic.** Push an impulse through the real
processor and measure the gap between echoes; for a rate destination, measure
the modulation period. A test of the division maths passes while the clock
never reaches the engine, which is exactly how nine units shipped.

**The check that catches a dead clock is a TEMPO change, never a division
change.** The TC 2290 had 1/4, 1/8, 1/16, 1/8. and 1/8T all measuring exactly
right, and read 500 ms at 120 BPM and still 500 ms at 90. Every division test
passed the whole time.

| tempo | 1/4 | 1/8 | 1/16 |
|---|---|---|---|
| 120 BPM | 500.00 ms | 250.00 ms | 125.00 ms |
| 90 BPM | 666.67 ms | 333.33 ms | 166.67 ms |
| 140 BPM | 428.57 ms | 214.29 ms | 107.14 ms |

**Test the raw-pulse path separately.** No playhead, just `0xF8` at 24 per
quarter. Tempo reads back, and Stop releases the lock.

**Never write the resolved tempo back into the unit's own BPM field.** The
subtlest failure here, found in three units at once. A processor doing
`bpm.store(tempo)` each block writes the resolved tempo, which while a DAW
plays is the DAW's, into the field that IS the machine's internal clock. SYNC
INTERNAL then quietly becomes the host's tempo. It looks perfect under every
external measurement, because the write-back is what makes external work. Test
it as: field at 120 against a host playing 90 must still measure 500 ms.

**Use two tempo pairs on that check, never one.** With only 120-against-90, a
unit whose internal tempo happens to BE 90 passes while reading the host. Add
the mirror at 150.

**A spacing measurement cannot see a phase error.** Measure a synced
modulator's rate by the gap between peaks and a constant offset cancels out of
the arithmetic entirely, so every test passes while the modulator sits a full
block early on every beat. The D-50's LFOs were exactly that. Spacing tests
rate; only an absolute beat-alignment assertion tests phase.

**Give a stub playhead an ADVANCING ppq.** A frozen position pins the clock.
Invisible to a delay, which wants a length; obvious to anything wanting a
position. It presents as "the modulation is broken and the delay is fine".

**Three meter faults that all present as engine faults**, from measuring four
rhythm boxes in one night:
- An RMS window shorter than the oscillator's period reads the WAVEFORM rather
  than the envelope.
- A single-threshold null detector chatters and reports a third of the period.
- **Filter resonance puts two level peaks in every LFO cycle**, so the period
  reads exactly half. That is an exact integer multiple, which is the classic
  wrong-clock-rate signature, and it was nothing of the kind. Rule out the meter
  before believing a factor of two.

**Peak-picking an envelope reads about 2% fast at every tempo.** It looks
exactly like an engine bug and it is the meter. Use RMS over whole periods. A
meter wrong by a consistent percentage survives every cross-check that compares
measurements to each other; only an absolute expected value exposes it.

**Verify a check can FAIL, and clean up immediately.** Inject the bug the check
exists to catch, run it, revert from a saved copy, and never leave the process
between those two steps. A session that dies in the middle leaves an injected
bug that looks identical to a real failure. That happened, and cost a
diagnosis.

**Gate it in ctest.** A shared conformance check fails a build when a unit
declares no destinations, reports a value while sync is off, uses a division off
the grid, lies about a range, or does not follow a tempo change. It cannot see
the write-back, because it never calls `processBlock`, so that check belongs in
each unit's own audio probe.

**Test the gate itself.** A shared check that is not itself checked is a shared
bug. Ours silently inverted into passing nothing and failing eleven healthy
units. Run it against a known-good host AND a known-bad one.

## 9a. Choosing the observable

Measuring the audio is the rule; WHICH audio decides what the measurement can
prove. Fourteen machines were put on the clock, and this was the whole of the
difficulty. The ladder, best first:

| rung | route | why | measured |
|---|---|---|---|
| 1 | a pure GAIN - AMD, a matrix to VCA or VOLUME, a VCA CV | two renders differ by a scalar, so `sum(a*b)/sum(b*b)` is EXACT and frame alignment is irrelevant | TX81Z within 0.01 ms on every division |
| 2 | PULSE WIDTH | a memory-free null: width does not touch phase and there is no filter state to converge | OB-8 read 719 ms through pitch, 666.78 through PWM |
| 3 | a stereo difference with a hard zero | the MN3009 reads `base +/- dep*tri`, so L-R is exactly zero at the sweep's zero | JX-8P beat alignment -0.474 ms |
| 4 | PITCH, via the accumulated-phase null | two renders differ by the INTEGRAL of the frequency deviation; a sine's returns to zero once a cycle, ON the beat | Mirage every division within 10 ms - but see the caveat |
| 5 | a FILTER | memory smears the null AND the energy is a soft asymmetric function of cutoff, so the sweep's lowest point is not its vertex | JX-8P read the modulation 70 ms early while the rate was exact |
| 6 | a COMB's energy | measures the rate; CANNOT measure the phase, because the energy depends on where a notch lands among the harmonics | PSR-730, -352 ms of offset that belongs to the voice |

**The pitch caveat, which cost three attempts.** The pitch law is exponential, so
the frequency deviation `2^v - 1` has a POSITIVE mean, second order in the depth,
and it ACCUMULATES in the phase error. At a quarter of the mod wheel the Mirage
read a 1/4 at 140 BPM as 521 ms instead of 428; at three hundredths, 429.07. Keep
the depth tiny and the baseline short, and on a SAMPLER take the MEDIAN of
consecutive gaps rather than a long baseline - a recorded wave's slope is not
constant, so one null in eight lands a fraction of a cycle out.

**Two renders must be BIT-IDENTICAL apart from the thing under test.** On five of
fourteen machines they were not: `prepareToPlay` left oscillator phases, LFO
phases, delay counters and noise seeds wherever the last run stopped. Free-running
against the KEYBOARD is the analogue behaviour and stays; carrying a phase across
a `prepareToPlay` is not that. On the Jupiter-8 it read as 92 ms of LFO drift.

**When the observable cannot see the phase, say so.** The TS-22 and the PSR-730
both have a constant offset their probes cannot attribute. Neither got a wide
tolerance to hide it: both assert that the offset does not MOVE across half a
minute - which is what a modulator come loose from the clock would break - and
both log the open item.

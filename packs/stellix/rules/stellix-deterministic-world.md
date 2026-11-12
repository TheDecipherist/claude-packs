---
# concepts: world, audio, painter, ui, tests
paths:
  - "placeholder"
---

# Same playing from the same state gives the same sound and the same picture

From spec §0 rule 4, §6.1, §6.3, §7.3.

<constraints>
Always do:
- Work out every path, bounce, impact and shatter by formula from what was played, where it hits, and the world's settings.
- Use the world's one seeded generator as the only randomness (RANDOM, opt-in, off in INIT and every factory patch). It may reach modulation and effects only, never pitch, wave, tone, level, filter type or a SOUND choice. Under FOLLOW THE SONG its seed restarts with the song position.
- Run the world at a fixed 240 Hz tick, independent of buffer size and sample rate. Solve crossings and touches inside the tick and place each event at its exact sample.
- Keep looking separate from sound: hovering, zooming and moving the camera never change the sound (unless FROM VIEW is on, where the camera becomes patch data).

Never do:
- Call any random source other than the seeded generator. `.claude/checks/one-seeded-random.json` blocks it.
- Let the frame rate, the window being open, or the host buffer size change what is heard.
- Let a control take keyboard focus. QWERTY always plays (`no-keyboard-focus.json`).
</constraints>

## Check
Gates, each proven red by a planted fault:
- **Bounce repeat:** the same MIDI from INIT renders bit-identical twice, at buffer sizes 64, 512 and 2048 and at 44.1, 48 and 96 kHz.
- **View:** with FROM VIEW off, a camera move or a hover leaves the render bit-identical.
- **Four tempos:** HITS and BEATS notes land on their exact samples.
- **Settle:** after a hard passage the world comes to rest once playing stops.
Lesson checks for this rule: `no-keyboard-focus`, `one-seeded-random`.

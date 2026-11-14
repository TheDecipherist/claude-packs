---
# concepts: cpp, js, python, tooling
paths:
  - "placeholder"
---

# Sync is a mode, and OFF is a sound

<constraints>
Always do:
- Give a synth three states: OFF, INT, EXT. Most effects get two, since a delay always has a time.
- Say which clock you mean. A setter that resolves OFF to INT cannot fail, so the caller never hears.
- Follow the host's transport when there is one: a unit in a session follows the session.
- Keep the sync switch a system setting, and the divisions in the program.
- Open standalone as the hardware did, sync off, until the user turns sync on.
- Open as a plugin in a DAW with the master clock following the host. Delays are synced by default; LFOs and envelopes start free and can be synced. Each time destination declares its default by what it is (delay, LFO, envelope), never one blanket default.
- Load a patch that stores its sync state as stored: a stored 247 ms never becomes 500 ms. The defaults are for a new or INIT patch only.
- Give every RHYTHM time a sync option, and a rebuild offers it on every rhythm time its hardware could slave to a clock.
- Keep TIMBRE times (chorus or doubler pre-delay, diffuser, comb, short slapback) off tempo for ever.
- List FREE first on a control used both ways.
- Record clock OUT (an output jack, a "Send" setting, a DLY/CLK switch) as its own setting beside the three receiving states: it is what the unit sends, not what it follows.
- Declare each destination's minimum and maximum, by value and not by byte order, and show what cannot be reached.
- Key stored divisions to a destination's name when its list is dynamic.
- Record a tempo that the machine offers as a source to any parameter, with no division list, as its own shape beside OFF, INT and EXT, and say how the rebuild offers it.
- Keep the division grid's floor: a 1/128 is 31 ms at 60 BPM and 10 ms at 180, so reach a timbre-length time through FREE, not by extending the grid downward.

Never do:
- Open a delay unsynced as a plugin in a DAW, or let an open-time default replace the sync state a patch stored.
- Collapse "where our clock comes from" and "whether this unit is slaved to it".
- Put divisions on the transport bar: a master clock has no say in what a slave does with its pulses.
</constraints>

## Check
The `clock-probe` skill measures the default at open, untouched, at 120 and 90 BPM, standalone and as a plugin, with `.claude/tools/open-default-probe.mjs`.


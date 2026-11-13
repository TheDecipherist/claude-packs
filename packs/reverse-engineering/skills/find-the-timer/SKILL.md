---
name: find-the-timer
description: Use when a stored time, rate, delay or LFO speed must be given a unit, when a crystal, timer reload, counter chip or interrupt vector is found in firmware, or before any time law is fitted.
---

# Find the timer (one job: derive the tick and the control rate from firmware, before any stored time is read)

Every stored time is a count of some tick. Fit a law before the tick is known and the fit looks fine and is wrong by a constant.

<constraints>
Always do:
1. Read which interrupt vectors are live: a branch-to-self stub is dead, and a dead serial vector means MIDI is polled. Read the timer handler's rearm constant.
2. Write the chain as arithmetic, tagged `[FW]`: crystal, CPU clock (the baud divisor), timer reload, tick, control rate.
3. Read a counter chip's MODE before its count: an 8254 in mode 3 interrupts at the half period.
4. Pin the clock from three or more independent readings (baud, pitch table at 440, autotune targets, tempo table, a second crystal) and count them in `laws.md`.
5. Derive the tick from a count range against a printed time range.
6. Check the top of the fastest dependent range is musical: a 188 Hz LFO means a missing divisor, and a 16-voice scheduler scales every time by 16.
7. Bound a hardware tick that lies outside the image from the firmware around it.
8. Where a machine may do no voice allocation (divide-down), ask what the CPU drives before looking for a scheduler.

Never do:
- Read a stored time before the tick is derived.
- Pin a clock from one reading.
</constraints>

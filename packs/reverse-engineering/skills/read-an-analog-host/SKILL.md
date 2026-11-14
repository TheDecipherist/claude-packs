---
name: read-an-analog-host
description: Use when the firmware belongs to an analog-voice synth whose CPU (Z80 class) only streams control voltages to a DAC, and the sound's laws are not in any DSP code.
---

# Read an analog host (one job: find the laws in the code that streams control voltages)

On an analog-voice machine the CPU makes no sound: a timer interrupt writes control-voltage bytes to a time-multiplexed DAC latch. The laws are in the tables and routines that fill those bytes.

<constraints>
Always do:
1. Find the timer interrupt routine (`find-the-timer`) and the DAC latch rows it writes (`map-the-io`): which latch address selects which voice and which control.
2. List the CV-table writers: pitch, unison spread, envelope curves, autotune and the panel-to-DAC map. Tag each law read from them `[FW]` with its address.
3. Tag the voice-chip laws (filter, VCA, oscillator core) `[SCH]` or `[DS]`, with a tolerance model: the host fixes the control voltage, never the analog response.
4. Say which laws cannot be `[FW]` here: what the analog part does after the DAC.

Never do:
- Tag an analog response `[FW]` because the CPU sets its input.
- Read a CV byte as a value in Hz or seconds before the DAC's scale is found.
</constraints>

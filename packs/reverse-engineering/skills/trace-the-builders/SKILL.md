---
name: trace-the-builders
description: Use when a record's fields have to become engine coefficients, when a parameter's law, slot or scaling is unknown, or when the factory restore, builders or task table must be found.
---

# Trace the builders (one job: read every routine that turns a record field into an engine coefficient)

A law fitted to outputs alone is a guess about a routine nobody read. The routine says which field, which slot and which scaling, and the anchors it must reproduce fall out unfitted when it is right. Compiled-C idioms are in `c-idioms.md` beside this file.

<constraints>
Always do:
1. Enumerate every coefficient-send call site with its record read and slot: `body[n] -> slot -> scaling`. The check is that known anchors come out without a fit.
2. Find the shared helpers first: the mapper divisor, the fixed-point converter, the multiply-then-divide fingerprint and the domain converters (0xAAAB is a division by 3, so 2/3).
3. Find every indexed table at once by the stride-multiply idiom: per CPU family, how a table is indexed, with a data-side scan where the CPU has no MUL.
4. Find the builders by the tables' own addresses as immediates, and follow a staging byte to its writers.
5. Trace the factory RESTORE path: source, length, record size and count sit in one routine.
6. Locate rate code by rate constants and their products as immediates, and fix the sample rate before fitting any time law.
7. Look for the generator (a seed, a recurrence) before the table, and scan for the data a compiled-out builder draws from (mutually prime lengths).
8. Find a downloaded program by the hardware it writes, not by a diagnostics preamble. Read what the host writes to learn the topology: shared slots mean shared state.
9. In an RTOS image, read the task table first: it is the map.
10. Match the channels that take a firmware calibration offset to the service manual's calibration procedure to name individual CV channels.
11. For each field, write what it is (rate, time, attenuation, complement) and which way it grows, read from the combining instruction; test that a rate table speeds up as its value rises, and never unify two tables that look alike.
12. Where the load routine runs a compiler that emits threaded code, the stored record is not what runs: read each compiler's block start as a second source.

Never do:
- Fit a coefficient law to measured output while its builder is unread.
- Name a slot or scaling without its call site (`two-sources-before-naming`).
</constraints>

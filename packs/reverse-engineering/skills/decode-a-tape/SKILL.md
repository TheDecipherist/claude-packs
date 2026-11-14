---
name: decode-a-tape
description: Use when a factory bank or program exists only as cassette audio (a digitised tape, a WAV of a tape dump), before any byte of it is read.
---

# Decode a tape dump (one job: turn a digitised cassette into the bank's bytes)

A tape is two tones and a framing the machine's own ROM defines. A decode that guesses the framing reads plausible bytes that never verify, and two machines of one maker can differ.

<constraints>
Always do:
1. Measure the two bit tones and their widths by a run-length histogram of the zero crossings, and tie each to a divisor of the machine's crystal. Measure per machine: a sibling's tones prove nothing.
2. Read the framing from the ROM's save routine (`trace-the-builders`): leader, sync, start and stop bits, nibble or byte order, record length and checksum. The save routine, not the load routine's tolerance, defines the format.
3. Decode, and gate on every record's checksum verifying, counted n of n. A decode with one record failing is not a bank.
4. Prove the decode with names the manual prints: the preset names must read (`names-first`).
5. Record the sample rate, the tone measurements and the framing beside the result, tagged `[FW]` with the save routine's address.

Never do:
- Take the framing from another machine of the same maker.
- Report a bank decoded while a record fails its checksum.
</constraints>

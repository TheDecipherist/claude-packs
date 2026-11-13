---
name: midi-from-firmware
description: Use when a machine's MIDI manual or chart is missing or doubted and its firmware is open, to find which MIDI messages it honours from its receive handler.
---

# Read the MIDI a machine honours (one job: its receive handler, byte by byte)

A MIDI chart says what the maker documented. The receive handler says what the machine does, and the two disagree more often than a manual admits.

<constraints>
Always do:
1. Find the MIDI input routine: the interrupt or poll that reads the UART, and the buffer it fills.
2. Find the status-byte dispatch: a compare against `0xF8` and above first (real-time bytes come out before any channel test), then the channel nibble, then the message type.
3. List one row per status byte: honoured, ignored, or passed through, with the address of its branch.
4. For a controller or NRPN message, follow the data bytes to the parameter they write, and record the range the handler accepts.
5. Check each row against the chart. Where they differ, the firmware wins, and the row says so.
6. Treat a compare against `F8` that is followed by a range check as a test on a range, not a clock handler, until the branch is read.

Never do:
- Claim a message is ignored from its absence in a manual.
- Stop at the first handler: a second port or a second routine may take other messages.
</constraints>

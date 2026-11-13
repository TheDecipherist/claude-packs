---
name: vendor-sysex
description: Use when a machine's sysex dump, patch file or request message is read, written or sent, or a checksum, address or nibble-split value does not decode.
---

# Recognise a vendor's sysex (one job: the frame and the record conventions of one machine's sysex)

A sysex frame is the vendor's own. A decoder written from the general shape reads the header and gets every value wrong.

<constraints>
Always do:
1. Read the frame first: `F0`, manufacturer id, device id, model id (note its width, one byte or more), command, address, data, checksum, `F7`.
2. For a Roland-style frame: command 11 (RQ1) asks, command 12 (DT1) sends. The checksum is `(128 - sum) & 0x7F` over address and data (address and size for a request). Prove it by adding everything with the checksum: the low 7 bits are zero.
3. Do address arithmetic in 7-bit digits: a carry goes at 128, never 256. A radix-128 address is read digit by digit.
4. Keep a message to 256 data bytes and leave about 40 ms between messages. Find the trigger addresses (a write that makes the machine act) and mark them.
5. Where the address map steps by 2, the value is split in nibbles. Test the split: a value must read back from its two nibbles, and an odd address is a fraction of the value, not a parameter.
6. Know the 1997 to 2000 conventions: the name sits at offset 0, a bipolar value is stored with an offset of 64, a sync flag sits beside its division. Korg packs bits across bytes.
7. Put the machine in the mode that makes it transmit, log the wire, and request each address in turn.
8. Open a dump as text first: names, and the count of messages, tell the layout before any decode.
9. Number names from 1 where the panel does, and say where a digit starts at 0.

Never do:
- Assume the checksum covers the header.
- Take a model id's width from another model of the same maker.
- Prove a decode on one message: prove it over every message of a bank.
</constraints>

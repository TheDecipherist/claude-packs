---
name: triage-the-dump
description: Use when a .bin, EPROM dump, flash image, OS update or sample ROM is opened for the first time, before any name search or disassembly, or when an image repeats or is half blank.
---

# Triage the dump (one job: say what each image is and whether it is whole, before anything is read from it)

A bad dump reads as plausible fiction. A 2732 read as 64 KB repeats its 4 KB sixteen times, a stuck address line copies one half of every block over the other, and an encrypted or compressed image has no names to find. Every one of them costs a phase when found late, so the image is measured first, and what it is gets written down.

<constraints>
Always do:
1. Run `node .claude/tools/dump-triage.mjs <image>` on every image, each half of an interleaved pair on its own. Read the whole report, the census included.
2. Read the entropy. Flat 8.000 is encrypted; 7.98 to 7.999 is compressed. Compression magics found are counted against what random bytes give (the report prints both): a handful in a megabyte is chance, not a compressed stream.
3. Read the period of each half. A half that repeats every N bytes is an over-read dump: it is evidence for N bytes only, and nothing is fitted past it. A blank half is a wrong part size or a dump taken twice.
4. Read the stuck address lines. `b[i] == b[i^(1<<k)]` for near 100 % of the pairs of a line, where a healthy image gives 40 to 50 %, is a line that never moved: re-dump or fix the wiring before decoding. A healthy random image reports none.
5. Read the 4 KB windows with no 0x00 byte: not plain 8-bit code (16-bit words, packed or text).
6. Divide the image size by every printed count (programs, variations). An exact quotient is a block per variation; a remainder means the data lives elsewhere. Where the family has a checksum convention (sum mod 256 equals the slot), it accepts or rejects each dump. After an exact quotient, diff block against block: few bytes differing inside a group is the time control, many every Nth block is the algorithm axis, a near-identical half is a binary switch whose bytes sit at the same offsets in every block.
7. Open every file with the container reader, whatever its extension: an extension is a claim, and a power-of-two file with none is a dump. Carve embedded standard files (a MIDI demo song) out before any stride scan.
8. Census the whole image until it sums to 100 % into code, tables, erased, samples and unknown, and say whether the dump is the program or the waves. Say where the product's own code ends: a shared-platform flash can hold a second machine above it. Leave erased runs out of every identical-region count. Class an image of 256 bytes or less as a small PROM, a lookup or state table: find its IC number from its file name or label and read it from the schematic by what it is wired to.
9. Write one line per image (what it is, whole or not, why) where the next step reads it, before `names-first` starts.
10. Test for a lane or pin permutation (vectors and strings read only after one). Before two dumps are called revisions, apply the documented permutation and prove it by rebuilding a held assembled image byte for byte, and descramble before `diff-the-revisions`; the same position with different content may be a bad dump.
11. When the container checksum is unknown, try a plain truncated sum first, name the serial or disk chip from the parts list, derive the bit order and frame from its datasheet, grid-search polynomial, init, xorout, reflect and endianness, and accept only the one that verifies on every record (n of n).
12. Profile each block's lag-1 autocorrelation in a disk or sampler image: audio reads about 0.9 to 0.997, code and parameters near 0. One number validates a sector walk; `dump-triage` does not print it, so compute it by hand.

Never do:
- Search names in, or fit a law to, an image whose triage is unread.
- Treat a printable run as text before ruling out a BCD counting table.
- Call an image whole because the file size is a power of two.
</constraints>

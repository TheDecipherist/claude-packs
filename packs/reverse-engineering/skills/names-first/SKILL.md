---
name: names-first
description: Use when starting on a firmware image, an OS update or a sysex dump, before any disassembly, or when a table or a record has no name yet.
---

# Map the machine by its own names (one job: names found, tables located, before reading any code)

A machine has to print what it calls things, so its names sit in the image as text. A name found is a table found, and a table leads to the record and the code. On one machine the descriptors found this way named every byte of the patch and carried the factory CC numbers, which matched the manual's chart 40 for 40.

<constraints>
Always do:
1. Write the names file from the manual first, one name per line with its group: patch and preset names, arp patterns, delay and reverb programs, effect types, menus and pages, parameters, value lists, messages. Add the factory bank's names from any dump. Keep the manual's order: order is evidence.
2. Run `node .claude/tools/names-sweep.mjs <image> --names names.txt`, with `--pair` for two EPROMs and `--base` for a known load address. It searches each name as printed, squeezed and cut to a display column (`Decay Time` is `Decaytime`, `Filter Balance` is `FilterBalanc`).
3. Read the wrapping it reports. Text is rarely encrypted but often wrapped: an interleaved pair, scrambled address lines, 7-bit packing and its bit order, nibbles, swapped or reversed words, one header per sysex message, a custom character set. Many names reading finds the unwrapping; one or two prove nothing, because chance does that. Names are not the last word: an unpacker that lost two bytes per file still read names while 63% of the image was wrong. Where an EPROM exists, compare the decoded update with it byte for byte. The header length reported is an alignment, so check it against the message format.
4. Read each group as a map:
   - stride between patch names: the record size and the name's place in it. ROM presets are often the internal record, smaller than the sysex one; compare value distributions to tie the two;
   - order held: the parameter order, and the table index of every entry;
   - stride between parameter names: a fixed-width table; look beside each name for its range, its control id, its CC;
   - pointers: follow what reads them to the code that draws the page or handles the value.
5. Read a pool whole. A display is built from name pools: page names for the top line, long and short parameter names for the bottom. A value list is a blob of N fields of W characters with no separators, and W is the column the LCD reserves. Split a pool on its terminator, never by stride: a name that fills its field has no terminator.
6. Complete the manual from the firmware. A manual cuts a long list with `..`; the firmware holds all of it, in the machine's own order. Keep that order, however odd, and move the row's tag to `[FW]`.
7. Use the count. A list's item count says which parameter owns it: two menus of 14 and 18 items were swapped until the counts were read. A list of N names beside a table of N numbers pairs one for one, and that pairing gives the unit: 22 clock names against a 22-word table fixed a unit that had been wrong by a factor of two.
8. Search a sysex dump the same way. A factory patch's name gives the record's start and length, and the packing that makes it read.
9. Scan for what the manual does not list: the entries after the last hit, compiled-out debug strings, format strings. A compiler emits string literals in source order, so a block of them is a struct's order.
10. Check an abrupt name: look at the byte after it. A table may be dictionary-compressed, a high byte standing for another string.
11. Prove a table across images: the same blob byte-identical in other OS versions and sibling machines.
12. Write each located table into the research record with its address, stride, count and the names that proved it, then map the menus (`menu-map`).

Never do:
- Start disassembling while the names search has not run.
- Call an image empty of text because a plain `strings` found nothing. Say which wrappings were tried.
- Assign names by the order of the manual's prose. It put five right names in the wrong five slots and invented a sixth. Use the address table, the range and the item count.
- Trust a table built by walking the manual's names: it inherits the manual's errors and has no row for a slot the manual never lists. Read the machine's own slot table too.
- Name a reserved byte from its position. Unnamed stays unnamed.
- Look for storage offsets in a panel or menu table. It holds names, control ids and range pointers, and two sessions went into proving that. Offsets come from the code that reads the record.
- Take a name as a law. It says what a value is called, never its unit or curve.
</constraints>

Where the ROM and the manual disagree, the ROM says what the machine has, and the disagreement is a finding: a manual's "Undefined" rows were named by the ROM's display strings, and a printed MIDI chart had two waveforms transposed.

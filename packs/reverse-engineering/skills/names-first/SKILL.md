---
name: names-first
description: Use when starting on a firmware image, an OS update or a sysex dump, before any disassembly, or when a table or a record has no name yet.
---

# Map the machine by its own names (one job: names found, tables located, before reading any code)

A machine has to print what it calls things, so its names sit in the image as text. A name found is a table found, and a table leads to the record and the code. On one machine the descriptors found this way named every byte of the patch and carried the factory CC numbers, which matched the manual's chart 40 for 40.

<constraints>
Always do:
1. Write the names file from the manual first, one name per line with its group: patch and preset names, arp patterns, delay and reverb programs, effect types, menus and pages, parameters, display abbreviations, messages. Add the factory bank's names from any dump. Keep the manual's order: order is evidence.
2. Run `node .claude/tools/names-sweep.mjs <image> --names names.txt`, with `--pair` for two EPROMs and `--base` for a known load address.
3. Read the wrapping it reports. Text is rarely encrypted but often wrapped: an interleaved pair, scrambled address lines, 7-bit packing, nibbles, swapped or reversed words, a custom character set. A name that reads proves the unwrapping, so use a name as the test of every unpacking you try.
4. Read each group as a map:
   - stride between patch names: the record size, and the name's place in the record;
   - order held: the parameter order, and the table index of every entry;
   - stride between parameter names: a fixed-width table; look beside each name for its range, its control id, its CC;
   - pointers: follow what reads them to the code that draws the page or handles the value.
5. Search a sysex dump the same way. A factory patch's name gives the record's start and length, and the packing that makes it read.
6. Scan for what the manual does not list: the entries after the last hit, compiled-out debug strings, format strings. A compiler emits string literals in source order, so a block of them is a struct's order.
7. Check an abrupt name: look at the byte after it. A table may be dictionary-compressed, a high byte standing for another string.
8. Write each located table into the research record with its address, stride, count and the names that proved it.

Never do:
- Start disassembling while the names search has not run.
- Call an image empty of text because a plain `strings` found nothing. Say which wrappings were tried.
- Look for storage offsets in a panel or menu table. It holds names, control ids and range pointers, and two sessions went into proving that. Offsets come from the code that reads the record.
- Take a name as a law. It says what a value is called, never its unit or curve.
</constraints>

Where the ROM and the manual disagree, the ROM says what the machine has, and the disagreement is a finding: a manual's "Undefined" rows were named by the ROM's display strings, and a printed MIDI chart had two waveforms transposed.

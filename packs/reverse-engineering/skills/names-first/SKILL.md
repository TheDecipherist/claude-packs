---
name: names-first
description: Use when starting on a firmware image, an OS update or a sysex dump, before any disassembly, or when a table or a record has no name yet.
---

# Map the machine by its own names (one job: names found, tables located, before reading any code)

A machine has to print what it calls things, so its names sit in the image as text. A name found is usually a table found, and a table usually leads to the record and the code; offsets come from the code that reads the record. Not always: compiled-out debug strings have nothing pointing at them, far pointers and `push seg; push off` pairs need their own scan, and one string led to the wrong table. On one machine the descriptors found this way named every byte of the patch and carried the factory CC numbers, which matched the manual's chart 40 for 40.

<constraints>
Always do:
1. Write the names file from the manual first, one name per line with its group: patch and preset names, arp patterns, delay and reverb programs, effect types, menus and pages, parameters, value lists, messages. Add the factory bank's names from any dump. Keep the manual's order: order is evidence. Fold curly apostrophes and trailing spaces, and count what joins. Check for a text layer, and render any table that is a picture: OCR dropped noteheads and shuffled a parameter table, and cost one repo two wrong conclusions.
2. Run `node .claude/tools/names-sweep.mjs <image> --names names.txt`, with `--pair` for two EPROMs, `--base` for a known load address, and `--banked` when the ROM is larger than the CPU's address space. It searches each name as printed, squeezed and cut to a display column (`Decay Time` is `Decaytime`, `Filter Balance` is `FilterBalanc`), then tries the misses with vowels dropped (`BrickWll`, `ARP SWNG`). When nothing reads and entropy is high and flat, read what loads the image; if nothing does, record that the text is not in these files and stop.
3. Read the wrapping it reports. Text is rarely encrypted but often wrapped: an interleaved pair, scrambled address lines, 7-bit packing and its bit order, nibbles, swapped or reversed words, one header per sysex message, three bytes per word, a header in each bank, a ZIP, a custom character set. Many names reading finds the unwrapping; one or two prove nothing, because chance does that. Names are not the last word: an unpacker that lost two bytes per file still read names while 63% of the image was wrong. Where an EPROM exists, compare the decoded update with it byte for byte. The header length reported is an alignment, so check it against the message format.
4. Read each group as a map:
   - stride between patch names: the record size and the name's place in it, when most gaps agree. Records can be variable, so find them by their marker over the whole image. ROM presets are often the internal record, smaller than the sysex one; compare value distributions to tie the two;
   - order held: the parameter order, and the table index of every entry;
   - stride between parameter names: a fixed-width table; look beside each name for its range, its control id, its CC. A field can change meaning partway down a table, so re-derive it per block;
   - pointers: follow what reads them to the code that draws the page or handles the value.
5. Read a pool whole. A display is built from name pools: page names for the top line, long and short parameter names for the bottom. A value list is a blob of N fields of W characters with no separators, and W is the column the LCD reserves. Split a pool on its terminator, never by stride: a name that fills its field has no terminator.
6. Complete the manual from the firmware. A manual cuts a long list with `..`; the firmware holds all of it, in the machine's own order. Keep that order, however odd, and move the row's tag to `[FW]`.
7. Use the count. A list's item count says which parameter owns it: two menus of 14 and 18 items were swapped until the counts were read. A list of N names beside a table of N numbers pairs one for one, and that pairing gives the unit: 22 clock names against a 22-word table fixed a unit that had been wrong by a factor of two.
8. Search a sysex dump the same way. A factory patch's name gives the record's start and length, and the packing that makes it read.
9. Scan for what the manual does not list: the entries after the last hit, compiled-out debug strings, format strings. A compiler emits string literals in source order, so a block of them is a struct's order.
10. Check an abrupt name: look at the byte after it. A table may be dictionary-compressed, a high byte standing for another string.
11. Prove a table across images: the same blob byte-identical in other OS versions and sibling machines.
12. Write each located table into the research record with its address and which space it is in, its stride, count and the names that proved it, then map the menus (`menu-map`).
13. Before counting a named byte as done, find what reads it. A name in a patch map is not a consumer: one named byte nothing read was wrong on 48% of a bank.
14. Score a name-to-index claim against controls. `names-sweep.mjs <image> --names <file> --index AT,STRIDE,WIDTH` compares the table with the names index for index, and scores the table shifted one and two records, the stride off by one and two bytes, and the names shuffled. The table is located only when the true alignment beats every control.
15. Read a missing string against the panel. A parameter is text in the ROM only if the display shows it: a legend printed beside an LED is on the plate, and values drawn as symbols are bitmaps. Names painted at transmit (`BNK b:nn`) are not stored; ask what a generated name field really is before writing a name parser.
16. When the manual names nothing, or the sweep finds few runs, read `sweeps.md` beside this file: packed tables that count themselves, the keyword and units net, the word stream, a character table, a suffixed repeat, the vocabulary of the effect's kind, and the loader's own messages after unpacking. `further-reads.md` holds the project's own tables, display geometry, a SysEx packing check, name marks, screen descriptors and a base-address trap.

Never do:
- Start disassembling while the names search has not run.
- Call an image empty of text because a plain `strings` found nothing. Say which wrappings were tried.
- Assign names by the order of the manual's prose. It put five right names in the wrong five slots and invented a sixth. Use the address table, the range and the item count.
- Trust a table built by walking the manual's names: it inherits the manual's errors and has no row for a slot the manual never lists. Read the machine's own slot table too.
- Name a reserved byte from its position. Unnamed stays unnamed.
- Assume what a panel or menu table's columns hold. It usually holds names, ids and range pointers: read what each column is before assuming it holds storage offsets, or that it does not. The DX7's panel table held the max and the offset of every stored byte.
- Take a name as a law. It says what a value is called, never its unit or curve.
- Trust a printed range over a firmware clamp. The corpus decides, and a range too small is data loss: a manual printed 0..19, the firmware clamps at 21, and real patches use 20 and 21.
</constraints>

Where the ROM and the manual disagree, the machine's own ROM says what it has (a sibling's ROM does not), and the disagreement is a finding: a manual's "Undefined" rows were named by the ROM's display strings, and a printed MIDI chart had two waveforms transposed.

# The machine's own names come first: the manual, then the strings, then the code

<constraints>
Always do:
- Before any disassembly, list every name the manual prints (patches, arp patterns, delay and reverb programs, effect types, menus, parameters) and search the image and the dumps for them (`names-first`, `names-sweep`).
- Treat a manual's name as the test of an unpacking: when it reads, the unwrapping is right.
- Take the stride between names as a record size and their order as the parameter order, then prove both.
- Complete a manual's cut lists from the firmware, and map the menus (`menu-map`): what the panel reaches and no dump holds is a finding.

Never do:
- Open a disassembler on an image whose names have not been searched for.
- Read "no strings" as "no text". The image is still wrapped until known names read, and one or two reading is chance.
- Assign names by the order of the manual's prose: use the address table, the range and the item count.
- Name a parameter from a string alone when it is a law: a name says what a value is called, never how it behaves.
</constraints>

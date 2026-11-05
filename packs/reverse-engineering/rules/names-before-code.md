# The machine's own names come first: the manual, then the strings, then the code

<constraints>
Always do:
- Before any disassembly, list every name the manual prints (patches, arp patterns, delay and reverb programs, effect types, menus, parameters) and search the image and the dumps for them (`names-first`, `names-sweep`).
- Treat a manual's name as the test of an unpacking: when it reads, the unwrapping is right.
- Take the stride between names as a record size and their order as the parameter order, then prove both.

Never do:
- Open a disassembler on an image whose names have not been searched for.
- Read "no strings" as "no text". The image is still wrapped until a known name reads.
- Name a parameter from a string alone when it is a law: a name says what a value is called, never how it behaves.
</constraints>

---
name: chip-search
description: Use when a chip, a processor, a part number, a data sheet or a manual comes up, before reading or converting one, or when asked what a part does, where it is used, or which parts are like it.
---

# Look in the reference library first (one job: never find, read or convert what the library already holds)

The reference library holds the pages the kit's skills made from datasheets, service manuals and owner's manuals: a part used by ten instruments is converted and checked once. `chip-search` asks it. It searches Atlas when the library has a `MONGODB_URI` (its environment or its `.env`) and the cluster answers within 4 seconds, and its own files otherwise; every answer starts with `from: atlas` or `from: files`.

<constraints>
Always do:
1. Before reading a datasheet or a manual, or planning a conversion, look the part or the machine up:
   - a part: `node .claude/tools/chip-search.mjs --part CEM3374` (aliases work: `--part MC6809` finds the 68B09);
   - a question: `node .claude/tools/chip-search.mjs "4-pole OTA lowpass with resonance"`, narrowed with `--kind`, `--maker`, `--brand`, `--model`, `--type owners-manual|service-document|datasheet|circuit-page`;
   - parts like one you have: `node .claude/tools/chip-search.mjs --similar TL072`.
2. Read the page it names (`chips/MAKER/PART/PART.md`, its `datasheets/`, the machine's `service-manuals/` and `manuals/`) before anything else, and cite it by that path.
3. Convert only what it does not have, into the library's own place for it (`pdf-to-md`), and say so: "not in the library (chip-search, from: atlas)".
4. Treat `--similar` as a lead: confirm a substitute against both pages (pinout, supply, the figures a model must hold) before relying on it.

Never do:
- Convert or re-read a source the library already holds because it was quicker to open the PDF.
- Report a part as missing when the answer came `from: files` and Atlas would have searched the manuals' text too: say which source answered.
- Copy the library's pages into the project: point at them.
- Keep a conversion, a data sheet page or a circuit report in the project: it goes into the library when it is made.
</constraints>

Exit 4 means there is no library on this machine: the message says how to clone it. Exit 1 means the part or machine is not there.

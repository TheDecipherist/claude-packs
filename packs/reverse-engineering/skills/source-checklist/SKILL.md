---
name: source-checklist
description: Use when starting to rebuild a machine, when new source material arrives, before calling a step or the sound finished, or when asked whether everything has been read.
---

# Keep a ledger of every source, ticked only when it is read (one job: nothing on hand goes unread)

A rebuild is only as good as what was read. A manual's graphs dropped by a conversion, a service manual that is scanned sheets and came out nearly empty, a chip whose data sheet nobody fetched: each looks finished until a fault traces back to it. The ledger lists every file on hand, and the tool refuses to call it done while anything is left.

<constraints>
Always do:
1. Write `docs/sources-checklist.md` before the first law is written, and add a row the moment material arrives. One row a file:
   `| [ ] | <path to the file> | <what it is, its pages, sheets or images> | <evidence> |`
   List the folders it covers at the top. Paths are relative to the checklist's folder.
2. List everything: firmware dumps, every manual, every service sheet and page image, every data sheet, the sysex document, banks, recordings, photos. A folder of images is one row an image.
3. Add a row for each chip on the schematics as soon as it is found, for its data sheet, and one row for each test every analog stage needs, such as a netlist simulated against the code.
4. Tick a row only when it is read in full and its facts are written down: the PDF converted with its images (`pdf-to-md`), each schematic image reported (`read-a-circuit-diagram`), each data sheet's report written. Put the reports in the evidence column. A ticked row with no evidence is not done.
5. Run the check after every change and before any claim that a step, the filter or the sound is finished:
   `node .claude/tools/source-ledger.mjs docs/sources-checklist.md <each sources folder>`
   It lists every file not on the ledger, every row not done, every tick without evidence, and every converted PDF still holding image placeholders. Exit 0 is the only state in which everything has been read.
6. Report what is still open, from the tool's own list, every time a step ends. A source that cannot be fetched stays on the ledger, unticked, with what refused it and what it would have settled.

Never do:
- Call a source read from its OCR, from its text without its images, or from a summary.
- Tick a row for a file opened and skimmed, or because another source covers the same ground.
- Leave a file off the ledger because it looks unimportant: the tool counts the folder, not your judgement.
- Call the sound, a stage or a step finished while the tool exits 1 on any source that stage rests on.
</constraints>

A ledger, in the form the tool reads:

```markdown
Covers: `../archives/Machine docs/Service Manual`, `../archives/Machine docs/datasheets`

| Done | File | What it is | Evidence |
|---|---|---|---|
| [x] | `../archives/Machine docs/Service Manual/sheet-03.png` | Voice board sheet 3 of 4 | `circuits/03-voice-vco-vcf-vca.md`, `circuits/netlists/03-filter.cir` |
| [ ] | `../archives/Machine docs/datasheets/cem3372.pdf` | Filter chip data sheet | |
```

---
# concepts: cpp, js, notes, tooling
paths:
  - "placeholder"
---

# A negative result names what was scanned, and a positive one its noise floor

<constraints>
Always do:
- List every segment and base searched before writing "not found", and record the search so nobody repeats it.
- Check an extracted count against an outside statement. A walk that stops early gives a clean, wrong number and no error.
- Measure the noise floor of any scoring test: random bytes must fail it. Strip erased space first.
- Fix the origin and descramble before comparing. A stride gives spacing, not an origin.
- Read filenames, READMEs and part numbers first. A "blocked" note is a claim.
- Quote a ratio, never "works".
- Search a printed table as plain bytes, BCD, scaled and signed values, at every stride, in every encoding tried, before asking where else the data lives. Zero hits then means it is stored elsewhere (battery RAM, loaded at the factory), and the bank is lost with the battery.
- After the same absence on three images, stop and change the question: look for what builds the mapping, not for a static table.
- Print the layout a tool assumes with every empty result: a tool built for one layout reads another's data as absence.
- Test the analogy under a "blocked" note before its fact: a machine shelved because its sibling was blocked turned out to be mostly analogue, with its sample data public.
- Close an item as "no design constant" when the schematic sheet shows a per-unit trimmer for it, and record the trimmer and the sheet.
- Before a blank extraction row fails, search the neighbouring bank and the sibling algorithm for a twin split across them; then fail loudly with the layout assumed.
- Where a doc and the code disagree, say so and let the code win; give file and line for each answer, and "NOT FOUND" with where it looked.

Never do:
- Ship "no table exists" as an `[EAR]` law because one search missed it.
- Close an item as "does not exist" when the truth is "not yet read".
</constraints>

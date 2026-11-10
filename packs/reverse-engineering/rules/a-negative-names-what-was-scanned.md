---
# concepts: cpp, js, notes, tooling
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

Never do:
- Ship "no table exists" as an `[EAR]` law because one search missed it.
- Close an item as "does not exist" when the truth is "not yet read".
</constraints>

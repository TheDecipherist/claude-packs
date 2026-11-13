---
# concepts: cpp, js, notes, tooling
paths:
  - "placeholder"
---

# A computed value is a sum: account for every term

One missing term was 2.3 octaves, and it had no parameter to find.

<constraints>
Always do:
- Read what reaches the accumulator in the routine that writes the coefficient, not the parameter handlers, and name each term's source. The terms missed have no stored byte.
- Prove slope and anchor separately. Anchors come from calibration procedures and autotune targets.
- After a load, compare every field of every program with the engine's copy, and report the count.
- Take ranges from the source's arithmetic, not a manual's rounded print.
- Decide from the record's field, never from words in a description.
- Write the value as named term fields in code, and tag an empty one `[TODO/FW]`: an unaccounted term is then a visible gap, and a zero is a claim.
- Add and clamp in the firmware's own domain: the rate index, the 13-bit word, not seconds or hertz.
- Model a route as computed: it may be a two-input VCA, `dest += (src x pct + offset) x (control x pct)`, and a plain `src x depth` is wrong on a large part of a bank.

Never do:
- Hide a missing term behind a fudge factor: fix the term, then re-anchor.
- Let a value the loader distrusts fall back to a default in silence. Hundreds of presets sounded fine while being the wrong sound.
</constraints>

## Check
`no-default-on-distrust` refuses a distrusted value that falls back to a default in silence; `prose-never-decides` refuses a description substring that decides a mechanism.

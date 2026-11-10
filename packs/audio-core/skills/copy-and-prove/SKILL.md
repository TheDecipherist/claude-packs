---
name: copy-and-prove
description: Use when code is taken from another house synth (an engine, an effect, any part) into this one, when a fresh copy must be measured against its source, or when a ported part sounds different from where it came from. Also /copy-and-prove.
---

# Copy a part, prove it, then make it yours

The canonical text is the target synth's `CLAUDE.md` (its sharing rule: which synth parts come from, and from which
branch) and its `docs/licences.md`. This file is the operating summary; the repo wins.

The rule: global components are LINKED (`synthcore`, `dspblocks`, `synthkit`, and the components
in `synthkit/components`). Everything else that comes from another synth is COPIED and becomes the new synth's own. The
source synth is not touched and nothing is shared with it. A project that links no global component copies those too,
with a licence row, like any other part.

Why the proof comes first: on MegaSynth, regrouping one multiply in a copied engine moved all 907 programs. Nobody could
say whether the copy or the tidy-up did it, because the copy had never been measured by itself.

## 0. Is it a copy at all?

- Already a global component, or a block in `dspblocks`? Link it. This skill does not apply.
- In `~/projects/synthcatalog`? Check before writing or copying a sound component.
- Finished and wanted by more than one synth? It may be time to make it a global component.

## 1. The licence row, before the first file moves

Write the row in the target's `docs/licences.md`: what it is, where it came from (repo, path, commit hash), its licence,
where it will be used. Read "the user's rulings" at the top of that file first; they say what is already allowed.

What never comes across, whatever the source:

- hardware, brand or machine names in program names, labels or strings that reach the product. Every preset and program
  name is our own;
- factory preset bodies, sample data, ROM bytes, vendor artwork;
- anything from `~/firmware`.

Tables and numbers derived from a hardware unit but written as our own code come across only where the user has ruled so in
`docs/licences.md`. For any other such table, ask the user and record the answer.

Search the part and everything it includes before copying:
`grep -rniE "factory|firmware|korg|roland|lexicon|eventide|yamaha|\btc\b|re-201|h910|pcm ?[0-9]" <files>`

## 2. Render the source first

Build the SOURCE synth (its current trunk, read through git at a named commit) and render the part alone through its
probe: one fixed setting, a fresh processor, a fixed seed, at least two notes away from middle C, long enough to hold the
whole tail of an effect. Keep the WAV, its hash and the exact settings in the target's evidence folder. This is the
baseline. Build it before theorising about anything.

First assertion: render the source twice. If the two differ, find the un-reset state (grep for `static`, seeds, phases)
before going on. Nothing can be compared with a source that does not match itself.

## 3. Copy, changing nothing

Copy every file the part needs (follow its includes; an envelope may be two files) into a COPY TREE: a folder declared in
`.claude/layout.json` with `"kind": "copy"`, read-only from then on (`protect-vendor` refuses edits; only the project's
copy tools in `guards.copy.tools` write there). Change only what is needed to compile: namespace, include paths. No
renames, no tidying, no regrouped arithmetic. Give every file its origin (repo, path, commit, SHA-256, licence row). Save
it as its own commit: "copy of <part> from <repo>@<hash>, unchanged".

## 4. Prove it

Render the copy in the new synth with the same settings and compare:

```
python3 tools/null_compare.py source.wav copy.wav
```

- `IDENTICAL` is the only pass. The tool prints the first sample that differs, the size of the difference and any level
  change.
- It refuses two silences. A control behind a closed switch is correctly silent: open the switch.
- A clean 6 dB level change is nearly always a default hidden inside the module or a weight missing from a normaliser,
  not the algorithm.
- A difference only in the tail is un-reset state or a different block size.
- `--allow-db` is for a difference the user has accepted, with the reason written in `docs/licences.md`. It is not for making
  a red result green.

Show the gate can fail: change one coefficient in the copy, see `DIFFERENT`, put it back.

If it will not come out identical after an honest try, log it in `bugs.md` with both renders' numbers and ask. Do not
start reworking a copy that has not matched.

## 5. Only now, change it

A file that measured identical is promoted out of the copy tree into the project's own code (a folder of kind `"own"`)
with its origin record kept; only then is it changed. Rework in small saved commits (one parameter set per oscillator,
the synth's own rate ladder for a time grid, our own program names). After each, measure what was meant to change and
confirm what was not meant to change is still bit-identical. A time grid moved onto the synth's ladder is checked at 90,
120 and 140 BPM against absolute times, changing the tempo, not only the division.

Every module ships off, including every default inside it, and off is bit-identical to absent.

## 6. Record

- `docs/licences.md`: the row now says "measured identical on <date>, commit <hash>".
- The synth's tempo audit, if the part has a time in it.
- A lesson that would help the next synth: `~/projects/eproms/synth-design.md`.
- If this is a step in `build.md`, it is on that step's branch: finish it with `build-step`.

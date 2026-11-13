# kwb215: making-check judges only what a turn added (KWB-215)

## Made
- `addedCode(path, text, before)` in `packs/base/hooks/lib/making-concepts.mts`: the lines of a written text that HEAD's copy did not hold
  (as a multiset), taken from the text blanked by the file's language row (`languageOf(ext).blank`). `making-check-turn.mts` feeds
  `conceptsIn` with it (HEAD text from `git show`), so a concept word in a comment (a) or in lines a whole-file rewrite kept (b) is not "written".
- `unknownConcepts` reads an item of a `concepts:` list only when it is one word, or a word and `one`/`many`; a phrase such as "never a bare literal" is prose (c).

## Plants (selftest, `node packs/base/hooks/making-check.mjs --selftest`)
Red: `build/evidence/KWB-215/red.txt` (3 of 4 new cases failed, got 2 wanted 0; the fourth, "added mixer still found", held before and after). Green: `build/evidence/KWB-215/green.txt` (selftest exit 0, test file 8 of 8).
- concept named only in a comment: 0. A file written whole with one function added, making line naming the added concept: 0. The same naming only slot: 2. "never" in a making line: 0.
- The old KWB-122 case "put in and kept" now plants the word in code (`mixerCode`), since a comment no longer counts.
- Unit test in `test/hooks/base/making-check.test.mts`.

## Open
- A multi-word item (`lfo (many 6) and envelope as sources`) no longer has its first word checked against the manifest, so a typo'd concept followed by prose is not reported as unknown. Written concepts are still checked against the making line.
- Gate result: `build/kwb215-gate.txt`.

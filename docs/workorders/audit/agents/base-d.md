# base-d (W2, 3 items)

| id | new or extend | pack and file | one thing | proof |
|---|---|---|---|---|
| E19 | extend | base `skills/analyse-reference-look` (+ `grade-the-reference.md`, `controls-in-artwork.md`) | grade the reference first; gap recorded with nobody there; rack table, close-ups, remote, printed groupings, clock-face, ranking, controls by shape | pressure test |
| E20 | extend | base `rules/page-matches-reference-look.md` | aspect, overlap, titled sections (reworded), offset render, replica paths | paths |
| E21 | extend | base `skills/pdf-to-md` (+ `reading-a-pdf.md`) | C7 backup read when found broken, user told; C15 `governed` slot helper in place of the polling loop; scan, thin-conversion, OCR language, page offset, page images | pressure test |

Not added: E19.5 (C8). Rule: loads under the `skill-first` hook (all files).
Faults: `repo-lint` gates 1 and 5 fail under quiet-test (`(r.stdout + r.stderr).trim is not a function`), unrelated; `npm run check` is green directly. The word "panel" was refused by the base synth-word test; reworded to "front".

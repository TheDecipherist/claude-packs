# W3 L3 shape: report

Branch `work/2.0.0-ts-w3-l3-shape`.

## Files

| before | after |
| --- | --- |
| `shape.mjs` 274 lines | `shape.mts` 93 (finder, messages, re-exports), `shape-model.mts` 139 (the manifest: read, compile, validate), `shape-lines.mts` 87 (what a line says: example, selector, constant, concept of a name or expression, aliases), `shape-hits.mts` 100 (the literals one line holds, in three functions by number, by name, by use) |
| `shape-lists.mjs` 31 | `shape-lists.mts` 40 |

Every export name importers use is kept: `shape.mts` does `export *` from `shape-model` and `shape-lines`, so `lib/shape.mjs`, `shape-cli`, `once-only-report`, `shape-code`, `shape-prose` and the four hooks need no change. This also removes the `shape` <-> `shape-lists` import cycle (shape-lists now imports shape-lines and shape-model). `shape-lines` additionally exports `isCountish`, `conceptOfExpr`, `aliasesOf` (needed by shape-hits and shape.mts).

## Copies removed
- `esc` regex escape: now `escapeRegExp` exported from `glob.mts` (one owner; glob.mts's own private `escape` is a different set of characters and stays). Left for their slices: `git-guard` and `git-auth` each still hold a copy of `esc`; point them at `escapeRegExp`.
- Raw `readFileSync` + `JSON.parse` in `readShape` now `readText` (files.mts) + `parseJson` (json.mts).

## Signatures
Typed only; behaviour kept. Types defined beside the code (exported): `ShapeConceptData`, `LoadedShape`, `ShapeRowData` (shape-model), `LineClass`, `ConceptsOf`, `Aliases` (shape-lines), `LineHit` (shape-hits), `InstanceFinding` (shape-lists), `FindMode`, `FormattedFinding` (shape).

## Faults / behaviour notes
- `readShape` for a manifest that does not parse: the message was `design/shape.json does not parse: <JSON.parse message>`; `parseJson` never throws and loses the parser's message, so it is now `design/shape.json does not parse`. doctor's test matches only the prefix. If the detail matters the lead can decide a `parseJsonError` in json.mts.
- Normalising is slightly stricter on malformed rows (non-string entries of `exclude`, `arrays`, `names` are dropped rather than kept). Valid manifests are identical.
- Original code reads `row.constants[x].reason` and `.instance` unguarded in places; now guarded.

## Proposal for `types.d.mts`
`ShapeConcept` / `ShapeManifest` do not describe the normalised shape the hooks use (compiled `words`, `plural`, `single`, `patterns`, `names`, `selectors: string[]`, `quotes`, `count: number|null`; plus `values`, `json`, `error`). I used `ShapeConceptData` / `LoadedShape` from `shape-model.mts`; the lead may move them to types.d.mts and rename. `ShapeManifest` (the raw file) is not used by this slice.

## Proofs
- `npm run build`, `npm run check`: exit 0.
- Selftests: shape-law 58 cases OK, brief-guard 23 OK, making 10 OK, making-check 39 OK.
- Tests: shape 5/5, instances 6/6, symmetry 8/8, example-line 2/2, file-size 1/1, repo-lint 6/6, kf-refusals 26 pass 1 fail (KF-21, known on the base branch).
- New unit test `test/unit/hooks-lib/shape.test.mts`: 6/6 (number/ordinal/index/compare hits, example/selector/constant excuses, hand list, unparsable and invalid manifest handled, addedFindings, quoteRow, escapeRegExp).
- `test:changed -- --base work/2.0.0-typescript`: see the result line appended below.

## test:changed result
The full `test:changed` run was starved by other sessions on the machine and had not finished when this report was written. Of its 9 picked files I ran by hand: shape (5), unit shape (6), unit scanners (8), example-line (2), kf-refusals (26 pass, KF-21 known), readme (6), site (4): all green. Not run to the end: noop (expected red until the lead adds the new installed files `lib/shape-model.mjs`, `lib/shape-lines.mjs`, `lib/shape-hits.mjs` and the glob change to its lists), hook-timing, house (two known reds).

Note for the lead: the three new emitted files `shape-model.mjs`, `shape-lines.mjs`, `shape-hits.mjs` show as untracked in git (not ignored); `.gitignore` is not mine to edit. The new installed files also need `packs/base/pack.json` / lock fixtures if those list lib files by name.

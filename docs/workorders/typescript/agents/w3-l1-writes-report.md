# W3 layer 1, slice w3-l1-writes: report

Branch `work/2.0.0-ts-w3-l1-writes`, one commit (pushed).

## Per file (lines before -> after)
- `program-writes`: 177 -> 232 (types, a typed `ProgramWrite`/`Program`/`Handle`, comments). Behaviour unchanged. Signature:
  `programWrites(program, at, readText, home?)`; `programOf` unchanged. Importer `shell-writes.mjs` passes its `HOME` (read once there:
  `process.env.HOME ?? ''`; an empty home and an undefined one both make `Path.home()` unresolved, so no result differs).
  `lib/global.mjs` FILES still names `program-writes.mjs` (the build emits it); its names and exports are kept.
- `languages`: 69 -> 98. `Language` interface exported. `exts` come from `source-exts` `EXTS_OF` where the row is a language of it:
  js row = `js` + `ts`, python = `python` + `.pyi`, shell = `shell` + `.zsh .ksh`, go, rust, java = `java` + `csharp` + `.scala .dart`,
  kotlin = `kotlin` + `.kts` + `swift`. The `c` row keeps its own list (`.c .cc .cpp .cxx .h .hh .hpp .mm`): `EXTS_OF.c + cpp + objc`
  would add `.hxx .inc .inl .ipp .tpp .m`, a behaviour change; left for the lead (proposal: decide whether those read as C).
  `languageOf`, `languageNamed`, `ALL_CODE`, every row unchanged.
- `content`: 14 -> 17. `isContent(rel, layout: Partial<Layout>)`; `guards.content` is read as `unknown` and narrowed to strings.

## Copies removed
None needed: no file read/JSON/hash copies were in these three.

## Faults found (not fixed, behaviour kept)
- `program-writes` `add()` returns `out.at(-1)` even when the path was unresolved (nothing pushed): `site` is then the previous
  record (or undefined), and `site.content = ...` / the handle record then edits that earlier write. Input:
  `open('a.txt','w').write('x'); open(dyn + '.txt','w').write('y')` clears or replaces the first write's content. Needs a KWB.
- `programWrites` `.read` of a perl `open` with 3+ args and an unknown mode: unchanged (`modeOp(undefined)` was null; kept as `''`).

## Types proposed for `types.d.mts`
`Language` (languages.mts) and `ProgramWrite`/`Program` (program-writes.mts) are shared by their `.mjs` importers; to move when those convert.
`WriteOp` is the existing one from `types.d.mts`.

## Proofs
- `npm run build` ok; `npm run check` exit 0.
- `test/repo-lint.test.mts`, `routes`, `every-language`, `content-sites`, `global`: 64 pass, 0 fail.
- Selftests: once-only 19, template-law 26, code-shape 19, secrets-guard 16, folder-law 16, placement-law 9, lesson-checks 4 checks,
  shape-law 58, making-check 39: all OK.
- Unit test `test/unit/hooks-lib/program-writes.test.mts`: 4 pass (programOf, a literal write, a read, home as parameter, planted
  unresolved path, languages, content).
- `test:changed --base work/2.0.0-typescript`: 137 tests, 133 pass, 4 fail. Known base reds: no-personal-name, kf-refusals KF-21.
  Two are caused by this slice and sit in tests I may not edit:
  - `json-ratchet`: "530 raw calls left, fewer than 539: lower RAW_CALLS_LEFT to 530" (the ratchet constant is the lead's to lower).
  - `noop` full-stack: "only the listed files changed" shows `.claude/hooks/lib/content.mjs` and `languages.mjs`; they go in the
    test's changed-files list (the converted `.mjs` are emitted, hash-different from the old installed copy).

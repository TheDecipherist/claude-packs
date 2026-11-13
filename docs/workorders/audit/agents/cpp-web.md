# cpp-web (W6)

| id | new or extend | pack and file | its one thing | proof |
|---|---|---|---|---|
| U70 | new | cpp/rules/cpp-no-pointer-into-growing-container.md | no pointer or c_str() into a container that can grow | paths |
| U70 split | new | audio-core/rules/editor-gate-runs-in-a-fresh-process.md | each editor gate case runs in a fresh process | paths |
| U71 | new | shell/rules/kill-only-your-own.md | a script stops only processes it started | paths |
| E75 | extend | cpp/skills/build-preflight (step 7) | re-configure after adding a globbed source | pack-content |
| E76 | extend | shell/rules/shell-strict-and-quoted.md | verify by artefact and exit code; grep literals after sed rename | pack-content |
| E77 x14 | extend | page-critique (9, 17), interface-copy, type-space-colour, page-holds-its-frame, no-generated-look, redesign-page, build-from-reference, web client-boundaries, web-performance, styles-live-in-stylesheets, ui-primitives-one-module, web preflight-build (step 7), check ui-no-furniture-text (Scroll down, Stage 1), start-from-a-workorder | one line each | pack-content |
| E79 | extend | ui-craft/rules/apps-are-not-pages.md | panel is not bound by page rules | pack-content |

Rules and what they govern:
- cpp-no-pointer-into-growing-container: C++ source and headers.
- editor-gate-runs-in-a-fresh-process: C++ editor gate test files (concepts audio, ui).
- kill-only-your-own: shell scripts.

Faults: ui-no-furniture-text now has `strings: true`, a longer `good` (conformance C5/C6); a pre-existing "perhaps" in type-space-colour reworded (R7).
Ratchet asks: C5 29 to 28, C6 99 to 98, R7 19 to 18.

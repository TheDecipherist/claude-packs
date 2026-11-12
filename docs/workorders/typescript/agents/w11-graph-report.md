# w11-graph report: W11 item 4, the README's performance graph

## Made
- `docs/workorders/typescript/numbers.json`: 7 measures `{id, label, unit, before, after, evidence, provisional}`; before from `build/evidence/W0/baseline.md` and `replay-g.md`, after from W8's summary, `build/session2/doctor2.txt` and progress.md's W9 line (all paths in the main checkout). Every after is `"provisional": true`; W11.1 removes the flag.
- `scripts/counts-graph.mts`: `svgOf` (light, dark), `measureTable`, `graphBlock` (picture element + table). Wired into `scripts/counts-render.mts` (`GENERATED` gains `docs/perf-light.svg`, `docs/perf-dark.svg`; README block `performance`) and `counts.mts` (`documentsOf` takes optional measures for the plant).
- README: marker pair `generated:performance` at the end of the opening section, before "Getting started". No other README text.
- Colours: dataviz palette slots orange (1.9) and blue (2.0), validated both modes with `validate_palette.js` (all PASS; a gray "before" failed the chroma floor, so not used).
- Test (`test/counts.test.mts`): a changed number turns README, light and dark SVG red; an edited table cell and an edited bar are red. Red first: with the render unwired the test fails (`build/evidence/w11-graph/red.txt`); green `green.txt` (9 of 9).

## Choices (recorded, overturnable)
- Files in `docs/` (no new folder).
- Each row is on its own scale (before = full bar), as units differ; stated in the legend.
- "Wait per turn" is not measured by the baseline as one number: defined as Stop p50 + UserPromptSubmit p50 (279+47 = 326 ms before; 64+47 = 111 after, the prompt's 47 carried, not remeasured). Weakest row; W11.1 should replace it with the replay's mean per prompt.
- Gate after = 14 s (top of W9's "8 to 14 s"), release after = the one-hook 22.8 s on a local registry.
- Not looked at in a browser; geometry checked by arithmetic only.

## Gate
`npm run check` 0; `counts --check` green; `build/w11-graph-gate.txt` (first run 113 of 117): my two faults fixed (interface `Look` clashed with a shared shape, gate 4; emitted .mjs stale, gate 5; both now pass). The other two reds are not mine: "no file names a person" and "bare npx claude-packs" both point at `agents/kwb208-210-report.md` (an earlier agent's report).

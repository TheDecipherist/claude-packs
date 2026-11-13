# is-a, W6, instrument-shell (12 items)

| id | new or extend | file | one thing | proof |
|---|---|---|---|---|
| U60 | new | packs/instrument-shell/rules/build-stamp-on-the-panel.md | build shown on the panel | paths |
| U62 | new | .../patch-inspector.md | stored/live/previous values; opens on a button or chord, never a bare key | paths |
| U63 | new | .../effects-have-an-audition-source.md | an effect can be heard with no DAW | paths |
| U64 | new | .../a-scope-is-honest.md | fixed scale, engine trigger | paths |
| U65 | new | .../selection-never-dangles.md | selection clears with its item | paths |
| U66 | new | .../one-owner-of-the-notes.md | note exclusion in the state | paths |
| U67 | new | .../caps-are-one-limit.md | cap, grid, counter type one number | paths |
| U68 | new | .../window-opens-from-the-display.md | opening size from the display, one function | paths |
| E70.3 | extend | packs/audio-core/skills/copy-and-prove/SKILL.md (step 2) | A/B both sides at the same moment, baseline under .claude/worktrees | pressure test |
| E71, E72.2, E73 | extend | session-blob-append-only, render-the-extremes, fold-keeps-every-route, quiet-announces-itself | lines added; four rules converted from raw globs to `# concepts: cpp, js, python, tooling` (same files as before) | pack-content |
| E74.1, E74.2 | extend | skills/gates-from-commit-one steps 9-10 | RMS probe + inspector first; kit ships no skeleton | pressure test |
| E78.1-5 | extend | skills/hit-the-painted-control steps 6-10 | | pressure test |

Dropped: U69, E70.1, E70.2, E70.4, E72.1 (shell, obsolete). session-blob-append-only gained a `## Check` naming no-raw-struct-blob (R6).

Files governed: U60, U62, U64, U65, U68 concepts ui, painter (panel/editor code); U63 audio, dsp, tests; U66 audio, ui; U67 audio, params.
Ratchet: lower R1 59 to 55 and R6 13 to 12 (before other agents' merges). No refusals.

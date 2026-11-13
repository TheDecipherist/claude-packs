# sd-b report (W4, sound-design)

| id | new or extend | file (packs/sound-design) | one thing | proof |
|---|---|---|---|---|
| U42 | new | rules/counter-oscillators-quantise.md | counter oscillator's integer divisor is modelled | paths |
| U43 | new | rules/gate-both-faults.md | a detector fix is gated against the opposite fault | paths |
| U46 | new | rules/seeds-are-hashed.md | generator seeds hash (run seed, index); states it is never the signal | paths |
| U44 | new | skills/categorise-a-factory-bank | file decoded programs, print Other share | pressure test |
| U45 | new | skills/generate-a-recipe | new recipe from real statistics; no tool (method only, nothing small and testable) | pressure test |
| E37.1-9 | extend | skills/measure-a-law | steps 6-14 | pressure test |
| E38.1-7 | extend | skills/bounce-a-plugin | steps 10-16; .2 only source before sink; .7 reworded | pressure test |
| E39.1-6 | extend | skills/compare-to-the-machine | steps 12-17 | pressure test |
| E40.1-5 | extend | skills/measure-reverb | steps 6-10 | pressure test |
| E41.1-2 | extend | skills/spread-probe | steps 6-7 | pressure test |
| E42.1-5 | extend | skills/choose-observable | steps 6-10 | pressure test |
| E43, E44.1-2, E45, E46.1-4, E47.1-3, E48 | extend | rules/{test-off-the-easy-point,meter-before-engine,neutral-is-exact,algorithms-are-data,waveforms-and-octaves,presets-are-named-and-neutral}.md | bullets under Always do | paths |
| E49.1-2 | extend | skills/design-a-preset/references/effects-and-banks.md (linked from SKILL.md) | effects, bank tiers, bass, envelope and LFO checklists | pressure test |

Rules: all load for `cpp, js, python, tooling` (the old raw globs); gate-both-faults, seeds-are-hashed, test-off, meter add `tests`. Old raw `paths:` globs on six extended rules became concepts (same files). Missing `## Check` sections were added (R6), skill "you" and one 220-char description fixed (S7, S8), as the gate demanded.

## Scenarios
categorise-a-factory-bank: fire: a decoded 128-program bank has a category byte and 40% land in Other. Near miss: naming a new preset (presets-are-named-and-neutral). A run would freeze the machine's list, file by last name token, then byte, then shape, print the Other share, record which pass filed each program.
generate-a-recipe: fire: "make 20 new pad recipes from the hardware statistics". Near miss: tuning one preset by hand (design-a-preset). A run would use one kind of unit, pick an anchor and a neighbour, take choice sets whole, vary within p10-p90, hash seeds, keep a farthest-point ledger.

## Faults
No hook refusals. `test/fixtures/pack-content-ratchet.json` lowered locally to R1 66, R6 13, S7 6, S8 9 for green, NOT committed; the lead sets it on merge.

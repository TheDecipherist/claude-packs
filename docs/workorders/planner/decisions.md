# planner: decisions

Each choice the run made, so the user can overturn it. The first five were taken in `workorder.md` before the run.

- **d-1** Templates are chosen by `--template`, never by configuration. Options: infer from the configuration; a flag. Chosen: the flag, because a rebuild and a new synth share `synth-creator`.
- **d-2** No `start-from-a-workorder` skill in the planner: the start is `Run docs/workorders/<name>/PROMPT.md`. Options: name the skill in the planner; name the sentence. Chosen: the sentence. Note from the run: base has carried a `start-from-a-workorder` skill since 1.5.0 (written before this order ran). The planner never names it; it stays in base, since removing an installed skill is a change to every project and this order does not name it (easiest to reverse).
- **d-3** No generated index of what every skill proves: `workorder check` is the structural check instead.
- **d-4** The UI is never prototyped in HTML; both synth templates say so in their Never list, with the reason from the research.
- **d-5** `planner/` lives in this repo, not its own, so nothing is copied or pinned.
- **d-6** The release is 1.6.0, not the 1.5.0 `workorder.md` names. research-gaps published 1.5.0 first (npm shows 1.5.0). Given in PROMPT.md.
- **d-7** W0.1: doctor --strict was red on the branch because the kit's own install carried the pre-KWB-130 `agents-held`, whose selftest fails under an unattended run. Options: hand-edit `.claude/hooks`; run the kit's own `update` from this checkout. Chosen: `node bin/claude-packs.mjs update`, the kit's sanctioned path (a fix comes with update); it also brought `lib/audience.mjs`, the brief-guard and shape-law changes and `"chart": []` from 1.5.0.
- **d-8** Evidence lives in `docs/workorders/planner/evidence/W<n>/`, not `build/evidence/` (the public repo leaves `build/evidence/` out). Given in PROMPT.md. Home paths in evidence are masked as `~`.

# Brief for an audit agent: write units into the kit

You are one agent of the audit work order (`docs/workorders/audit/workorder.md`). Your own part (which units, which worktree, which branch) is in the message that started you. Nobody is there to answer: take the recommended choice, write it in your report, and go on.

## Where you work

- Only in your own worktree, `.claude/worktrees/<name>` under the audit worktree, on your own branch. Never `cd` or write anywhere else; never touch the main checkout `~/projects/claude-packs`.
- First: `npm ci && npm run build` in your worktree (the emitted `.mjs` are not in git). Run the kit as `node bin/claude-packs.mjs ...`, never `npx`.
- Run every test through `node .claude/tools/quiet-test.mjs <command>`.

## Read first

1. `CLAUDE.md` of the repo, the section "Authoring pack content" above all.
2. `docs/workorders/audit/workorder.md`, its `<constraints>`.
3. `docs/workorders/audit/sources/DECIDED.md`, whole. It overrides everything.
4. `docs/workorders/audit/sources/SORTED.md`: the rows for your units (CHANGES rows are taken in their reworded form; "drop" means drop).
5. `docs/workorders/audit/sources/DECISIONS.md`: the section for your units. Each unit's bullets are its content. Where a bullet's one line is not enough, read the source row it cites in `sources/reports/` (`re-2#14` is row 14 of `re-2.md`; prefixes are listed at the top of DECISIONS.md).
6. The existing units of the pack you write into: they are the model for form, length and voice.

## How to write a unit

- One thing per unit, named in its title and stated in one line. Anything that would give a unit a second job is a new unit.
- **Rule** (`packs/<pack>/rules/<name>.md`): frontmatter `---\n# concepts: a, b\n---` (concepts the pack's other rules use; `paths:` is generated, never write it), a one-line `#` title stating the law, one or two sentences of why (a real failure from the sources, if there is one, with no person's name), then `<constraints>` with `Always do:` and `Never do:` bullets. Optional `## Check` naming a hook or check that holds it.
- **Skill** (`packs/<pack>/skills/<name>/SKILL.md`): frontmatter `name:` and `description:` that starts "Use when" and names the moments it is for (this line decides whether it fires: make it concrete); a `#` title "Verb the thing (one job: ...)"; a short why; numbered steps inside `<constraints>` with `Always do:` / `Never do:`. Under 8,000 characters; longer material goes to a reference file beside it.
- **Extension** of an existing unit: add the method as a step or a bullet of the job the unit already does, in its voice. Never reword, remove or narrow an existing line unless DECIDED.md or SORTED.md says exactly that change. Keep every file under 300 lines.
- **Tool** (`packs/<pack>/tools/<name>.mts`, strict TypeScript, model: `packs/reverse-engineering/tools/source-ledger.mts`): a header comment with its usage and exit codes, exported functions, `isMain` at the end. Its test in `test/tools/<pack>/<name>.test.mts` (model: `test/tools/reverse-engineering/source-ledger.test.mts`), registered in the pack's `pack.json` `tests`. A test that plants a fault must go red when the plant is removed: show it once (remove the plant, run, see red, put it back) and say so in your report.
- **Check or hook**: as CLAUDE.md says, with `bad` and `good` (check) or a selftest with a planted fault seen red (hook), the hook's worktree case, and its test named in `pack.json`.
- Plain imperative style, the kit's own words. Never copy a global skill's or a source document's text in bulk. No file names a person: write "the user", and they/them.
- Leave out everything the sources mark obsolete: the synth shell (its tabs, arp, chain, worktree, sibling layout), sprites and image assets, HTML-first panels, ported third-party code. No firmware image, PDF, photo or disassembly listing is committed; a test builds its planted image in a temp folder.
- Cite documents by anchor or symbol name, never by line number.

## Before you commit

- `npm run build`, `npm run check`, then `node scripts/counts.mts` (so the counts test passes locally), then run the tests of the files you wrote or changed (`node .claude/tools/quiet-test.mjs node --import ./test/fresh-tmp.mts --test <files>`), plus `test/repo-lint.test.mts` and `test/counts.test.mts`. The lead runs `test:changed` on the merged step (decisions.md d-4). Fix what is red. The whole suite is never run.
- Commit ONLY your unit files under `packs/`, their tests under `test/`, and your report. Do NOT commit what `counts.mts` regenerates (`README.md`, `site/`, `docs/rules-without-checks.md`, `docs/versions.md`, `packs/manifest-*.json`, planner files): the lead regenerates them after merging. Do NOT edit `build.md`, `units.md`, `progress.md`, `decisions.md`, `status.json` or `workflow-bugs.md`.
- Stage by name: `git add <paths>`, then `git commit -m "..." -- <paths>`. Push your branch: `git push -u origin <branch>`. Never rebase, amend or force.

## Your report

Keep `docs/workorders/audit/agents/<name>.json` current after every unit: `{ "name", "step", "items", "done", "now": "<one line>", "updated" }`. At the end write `docs/workorders/audit/agents/<name>.md` and commit it:

1. One row per unit and per extension line: `| id | new or extend | pack and file | its one thing (one line) | proof (test file, or "pressure test" for a skill, or "paths" for a rule) |`. An item you dropped or could not do: say which and why (the DECIDED.md or SORTED.md line).
2. For every NEW skill: two scenarios of two or three sentences each for the lead's pressure test: one where the skill must fire and be followed (a realistic moment in a build, with the detail that the skill's steps act on), and one near miss where it must stay silent (a nearby task that another unit owns). Plus the 3 to 5 things a run that FOLLOWED the skill would do in the first scenario.
3. For every new rule: the kind of file it governs (so its `paths:` can be checked) or why it loads everywhere.
4. Faults: any hook refusal (its exact message, and whether it was right), any red test you could not explain, any tool that misbehaved. Mark each refusal with `node bin/claude-packs.mjs logs mark <id> right|wrong "<why>"`. Never route around a hook: if one blocks correct work and no honest way exists, leave that unit undone and report it.

Reply to the lead in under 150 words: units written, tests run and their result, anything left undone.

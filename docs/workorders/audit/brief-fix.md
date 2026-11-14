# Brief for a W9 fixer: fix what the review found

The W9 review read the branch and wrote its findings in `docs/workorders/audit/review/`. Your file is named in the message that started you. Your method for writing is `docs/workorders/audit/brief-units.md` (read it: worktree, build, conformance, commit by name, what not to commit). Nobody is there to answer.

## For every finding in your file

- `wrong` and `risky`: fix it. A finding about code (a hook, a tool, a lib): write the test that fails for it first, see it red, fix, see it green (`bug-fix-starts-red`). A finding about a rule or skill: correct the text so it is true and says one thing, in the unit's voice.
- `style`: fix it when the fix is a line or two; otherwise say why it is left.
- A fix that would change how the kit already works beyond what `docs/workorders/audit/sources/DECIDED.md` and `SORTED.md` record (a reworded or narrowed existing line that predates this branch, a changed default, a new refusal): do not make it; write it in your report as FOR THE USER.
- A finding that is wrong itself (the reviewer misread): say so, with the evidence, and change nothing.
- A rule whose `# concepts:` now covers fewer kinds of files than the raw globs it had before this branch: give it the concepts that cover them again (look up which concepts exist: the `concepts` of every `pack.json` and `configurations/*/config.json`).

Run the tests of every file you change, `test/pack-content.test.mts` (the conformance gate) and `test/repo-lint.test.mts`. Do not edit the ratchet file; report the counts it asks for.

## Your report

`docs/workorders/audit/agents/<name>.md`: one row per finding, `| # | fixed (commit) / left (why) / reviewer wrong (evidence) / FOR THE USER (what it would change) |`. Commit it with your changes and push your branch. Reply in under 120 words: fixed, left, wrong, for the user, and any red test.

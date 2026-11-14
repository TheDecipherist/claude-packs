# Brief for a W9 reviewer: read the branch as a senior engineer

The audit work order put about 900 units and extension lines into the kit on `work/2.0.0-audit` (made from `work/2.0.0-typescript`). Before it is called finished, read your part of the branch as a senior engineer would. Your part is in the message that started you. Nobody is there to answer.

## Read first

- `CLAUDE.md` (the kit's architecture and "Authoring pack content").
- `docs/workorders/audit/workorder.md`, its constraints: no change to how the kit already works beyond what `sources/DECIDED.md` and `sources/SORTED.md` record; one thing per unit; nothing obsolete (the synth shell, sprites, HTML-first panels, ported third-party code).
- `docs/workorders/audit/sources/DECIDED.md`, whole.
- `docs/workorders/audit/decisions.md` (d-1 to d-7: what the lead decided during the run).

## What to judge

See the diff with `git diff work/2.0.0-typescript...HEAD -- <paths>` (new files with `git show HEAD:<path>`).
- A new unit: does it do exactly one thing, named in its title? Is it correct (a technique that would mislead a build is worse than none)? Does it contradict another unit?
- A changed existing unit: is every change an addition, or a change DECIDED.md or SORTED.md records (quote the line)? A reworded, removed or narrowed line, a changed default, or a new refusal with no such line is a finding.
- A hook or tool: correctness, the cases its test misses, its cost per call against doctor's budget (500 ms median per hook; hooks run on every matching tool call, so anything that walks the tree or spawns a process on every call is a finding).

## What to write

`docs/workorders/audit/review/<part>.md`: a table `| # | file | finding (one line) | severity: wrong / risky / style | the fix (one sentence) |`, only real findings, most severe first; then one line: how many files you read. Write nothing else and change no other file. Commit that file and push your branch. Reply in under 100 words: the count per severity and the three worst.

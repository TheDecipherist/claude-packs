# Brief for a second-read agent: what the kit still lacks

The kit, claude-packs, is hooks, rules, skills and checks that guide Claude through building synthesizer plugins and other software: reverse-engineering firmware, decoding patches, designing panels from photos, writing DSP, proving it all with tests. It grew out of earlier work: the `eproms` project, the `arcturus` project (the first synth, built without the kit) and the user's global Claude Code skills in `~/.claude/skills`. A first audit read all of it; you are a fresh reader, checking again that nothing important was left out.

Your slice (which files, which line ranges) is in the message that started you. Nobody is there to answer.

## What you may and may not open

- Read your slice, completely, every line, in order, in chunks your context holds (Read with offset and limit). Do not sample or skim.
- Read the kit AS IT NOW STANDS, in your worktree: `packs/` (rules, skills and their reference files, checks, hooks, tools), `prompts/workorder/templates/`, `global/`.
- Never open anything under `docs/workorders/audit/` except your own output file: not `sources/`, not `units.md`, not other agents' files. The point of this read is that it does not know what the first read found.
- Write nothing but your output file. The source documents are read-only.

## How to read

- A method is anything that tells a builder what to do or not to do: an order of work, a technique, a check, a tool and when to use it, a lesson from a failure, an evidence or naming convention, a checklist item, a number that is a rule (a budget, a tolerance). A per-machine finding (this synth's offset is X) is not a method unless it teaches something general.
- Leave out what is obsolete by the user's decisions: anything that exists only because of a "synth shell" (a host frame holding several machines, its tabs, keyboard band, explorer, effects chain, arp, worktree beside the project); sprites, image assets, an HTML or designer page first, synthpanel-creator's export pipeline; porting third-party (MAME, GPL) code; the user's own Mac setup and Atlas scripts. Count them in one line, do not list them.
- For each method, look for it in the kit: `grep -ril` over `packs/`, `prompts/workorder/templates/`, `global/`, then READ the kit file that seems to cover it before deciding.

## What to write

`docs/workorders/audit/second-read/<slice>.md` in your worktree:

1. **Read:** the exact files and line ranges read, so the coverage can be checked. Every line of your slice must be in a range.
2. **Counts:** methods found, COVERED, PARTLY, MISSING, obsolete.
3. **Finds:** a table of every PARTLY and MISSING method only: `| # | method (one line) | source (file:lines, or the heading) | PARTLY (what the kit file lacks) or MISSING | what the kit should gain (one sentence, imperative) | where (an existing kit file, or a new rule or skill name) |`. Name the kit file you read for each PARTLY.
4. **Top five:** the five most valuable finds for an unattended build, one line each.

Commit only that file (`git add <file>`, `git commit -m "..." -- <file>`) and push your branch (`git push -u origin <branch>`). Reply in under 120 words: lines read, the four counts, your top three.

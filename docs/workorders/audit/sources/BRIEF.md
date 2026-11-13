# Brief: what the kit is missing from where it started (one slice of a full audit)

The user's kit, claude-packs (`~/projects/claude-packs`), is hooks, rules, skills and checks that guide Claude through building synthesizer plugins: reverse-engineering hardware firmware, decoding patches, designing panels from photos, writing DSP, proving it all with tests. It grew out of earlier work: the `eproms` project (where most firmware disassembly was done), the `arcturus` project (the first synth, a Novation Supernova II, built without the kit), and the user's global Claude Code skills in `~/.claude/skills`. The user's concern, in their words: "the kit was made from those ... but we could have missed something", and if a global skill on this Mac still helps the builds, other users of the kit will not get the same results.

Your job: read YOUR SLICE (below) completely, every line, and find every piece of method, lesson, rule, tool or checklist in it that would help a build, then say whether the kit already holds it.

## Your slice

SLICE_BLOCK

## How to read

- Read every line of your slice, in order, in chunks your context can hold (use offset and limit on large files). Do not sample or skim. At the end, state the exact line ranges or files you read, so the coverage can be checked.
- A "method" is anything that tells a builder what to do or not to do: an order of work, a technique, a check, a tool and when to use it, a lesson from a failure ("we got this wrong because..."), a naming or evidence convention, a checklist item, a number that is a rule (a budget, a tolerance). Per-machine findings (this synth's offset is X) are NOT methods, unless they teach something general.
- For each method, look for it in the kit: `grep -ril` over `~/projects/claude-packs/packs/` (rules, skills and their reference files, checks, hooks), `~/projects/claude-packs/prompts/workorder/templates/`, and `~/projects/claude-packs/docs/`. Read the kit file that seems to cover it before deciding.

## What to write

`/private/tmp/claude-502/-Users-tim-clausen-projects-bandwarp/e9034e6a-ff37-4f31-992c-cedfc531a016/scratchpad/kit-audit/SLICE_NAME.md`, with:

1. **Read:** the exact files and line ranges read.
2. **Methods:** a table, one row per method: `| # | method (one line) | source (file, and a short quote or the heading it is under) | kit coverage: COVERED (kit file) / PARTLY (what is lacking) / MISSING | what the kit should gain (one sentence, in the kit's plain imperative style) | where it belongs (an existing kit file, or a new skill or rule name) |`.
3. **Top gaps:** the ten most valuable PARTLY or MISSING rows for an unattended build of a synth from its firmware and its photos, ranked, one line each.

Never change any file outside that output file: read only. Report back in under 200 words: lines read, methods found, counts of COVERED, PARTLY and MISSING, and your top five gaps.

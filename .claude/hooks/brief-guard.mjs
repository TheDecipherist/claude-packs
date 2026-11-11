// PreToolUse (Agent|Task, and Write|Edit|MultiEdit|NotebookEdit|Bash): a brief, a spec or a recipe names an instance of a
// concept only as the example. KWB-1: one spec sentence ("PIANO in slot 1 and PAD in slot 2") and the recipes' "Slot 1 /
// Slot 2" headings went into nine agent briefs, and every brief got work built and proved on slot 2 alone.
// Judged: an agent's prompt, and what a write ADDS to docs/** or inbox/** (by every write route, lib/writes.mjs). An
// instance of a concept in design/shape.json (lib/shape.mjs: a number, an ordinal, a role name before a concept word, a
// pattern, an array index) is allowed only on a "seen in:" or "example:" line, or as a declared constant read by name (the
// number rule's third form; KWB-4); a selector does not excuse
// it here (a brief says "initSlot", not "slot 1"). The refusal quotes the manifest row and the fix: name the shape and
// the generator; the instance is the example. `--selftest`.
// A judge on the hook contract (W4): it writes nothing. The count of each refused concept in .claude/usage.log, which this hook
// once wrote as it refused, is the recorder brief-guard-count's (both read an event through lib/brief-findings.mts).
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SAMPLE_SHAPE, briefCase, briefFindings, briefMessage } from './lib/brief-findings.mjs';
import { isMain, runAsHook } from './lib/hook-log.mjs';
import { bashOf, runHook, scratchProject, snapshot, verdicts, writeOf, writtenSince } from './lib/selftest.mjs';
import { pass, refuse } from './lib/verdict.mjs';
export const hook = (event, ctx) => {
    const found = briefFindings(event, ctx);
    return found ? refuse(briefMessage(found)) : pass;
};
/** A brief written in the worktree is judged by the worktree's own manifest. */
export const worktreeCase = briefCase(2);
export function selftest() {
    const hookFile = fileURLToPath(import.meta.url);
    const dir = scratchProject({ 'design/shape.json': JSON.stringify(SAMPLE_SHAPE), 'docs/recipes.md': '# Recipes\nPLACE\n' });
    const bare = scratchProject({});
    const before = snapshot(dir); // the project as the judge finds it: the rows below must leave it as it is
    const agent = (prompt, at = dir) => runHook(hookFile, at, { tool_name: 'Agent', tool_input: { description: 'build', prompt } }).status;
    const doc = (rel, text) => runHook(hookFile, dir, writeOf(join(dir, rel), text)).status;
    return verdicts('brief-guard', [
        ['agent: "drive slot 2"', agent('Build the delay. Drive slot 2 and check it works.'), 2],
        ['agent: "the PAD slot"', agent('Give the PAD slot its reverb.'), 2],
        ['agent: "the second slot"', agent('Wire the second slot.'), 2],
        ['agent: a declared constant read by name passes (the number rule\'s third form)', agent('Start in slot 1 (initSlot).'), 0],
        ['doc: the INIT line naming its declared constant passes', doc('docs/recipes.md', '**INIT** (the declared constant initSlot): one saw in slot 1.\n'), 0],
        ['agent: a selector is still no excuse in a brief', agent('Use selectedSlot: drive slot 2.'), 2],
        ['agent: "seen in: slot 2, build for all slots"', agent('Fix the missing delay.\nseen in: slot 2, build for all slots'), 0],
        ['agent: quotes the manifest row (its reason names slot 1)', agent('The slot row: INIT plays one saw in slot 1. Build for every slot with slotId(i, field).'), 0],
        ['agent: names the shape and the generator', agent('Every slot (many(4), slotId(i, field)) gets the delay; loop over all slots.'), 0],
        ['agent: no design/shape.json', agent('Drive slot 2.', bare), 0],
        ['recipe heading "Slot 1, the lead"', doc('docs/recipes.md', '# Recipes\n## Slot 1, the lead\n'), 2],
        ['recipe heading "Layer lead"', doc('docs/recipes.md', '# Recipes\n## Layer lead\n'), 0],
        ['inbox brief "drive slot 2"', doc('inbox/brief-7.md', 'Drive slot 2 until it works.\n'), 2],
        ['inbox brief "example: slot 2"', doc('inbox/brief-7.md', 'Build the swap for all slots.\nexample: slot 2 lost its delay\n'), 0],
        ['bash heredoc into docs/', runHook(hookFile, dir, bashOf("cat >> docs/recipes.md <<'EOF'\n## Slot 2, the pad\nEOF", dir)).status, 2],
        ['not a brief: src/ is shape-law\'s', doc('src/world/x.md', 'slot 2\n'), 0],
        ['agent: files named for the machine\'s pages are paths, not instances (KWB-117)', agent('Check these reports: docs/screens/om-112-slot2-formant.md, om-113-slot3-pitch.md and screens/slot4.png.'), 0],
        ['agent: a path beside it never excuses an instruction (KWB-117)', agent('Read docs/notes.md, then drive slot 2.'), 2],
        ['doc: addressed outside, marker in the first lines (KWB-127)', doc('docs/sample-request.md', '<!-- audience: outside -->\n# Recording\nRoute LFO 1 to VCO1 FREQ; drive slot 2 triangle.\n'), 0],
        ['doc: the same text with no marker is still refused (KWB-127)', doc('docs/sample-request.md', '# Recording\nDrive slot 2 triangle.\n'), 2],
        ['doc: a marker below the first 5 lines exempts nothing (KWB-127)', doc('docs/sample-request.md', '# Recording\n\n\n\n\n<!-- audience: outside -->\nDrive slot 2.\n'), 2],
        ['inbox brief: the marker exempts a .md brief too, by its declared audience (KWB-127)', doc('inbox/brief-8.md', '<!-- audience: outside -->\nDrive slot 2.\n'), 0],
        ['a judge writes no file (the write trap)', writtenSince(dir, before).join(','), ''],
    ]);
}
if (isMain(import.meta.url))
    await runAsHook(import.meta.url, 'brief-guard', hook, selftest);

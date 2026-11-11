// What brief-guard finds in one event: an agent's brief, or what a write adds to docs/** or inbox/**, that names an instance of a
// concept of design/shape.json outside a "seen in:" or "example:" line. The judge (brief-guard) refuses on it and the recorder
// (brief-guard-count) counts it per concept in .claude/usage.log, so the one reading is here and neither hook repeats it (W4:
// a hook that judges and records is split in two).
import { addressedOutside } from './audience.mjs';
import { checkoutRoot, insideProject, relInCheckout } from './project.mjs';
import { ASK, addedFindings, findInstanceLiterals, isExcluded, quoteRow, readShape } from './shape.mjs';
import { writesOf } from './writes.mjs';
const BRIEFS = /^(docs|inbox)\//;
const find = (shape) => (text) => findInstanceLiterals(text, 'brief.md', shape, { only: 'brief' });
/** The manifest the judge's and the recorder's selftests share: two many concepts, one with a selector and a declared constant. */
export const SAMPLE_SHAPE = {
    concepts: {
        slot: { shape: 'many', count: 4, generator: 'slotId(i, field)', words: ['slot', 'slots'], selectors: { selectedSlot: 'the slot the player has open' }, constants: { initSlot: { instance: 1, reason: 'INIT plays one saw in slot 1' } } },
        layer: { shape: 'many', generator: 'layerId(i)', words: ['layer', 'layers'] },
    },
    exclude: [],
};
const LANE_SHAPE = JSON.stringify({ concepts: { lane: { shape: 'many', count: 8, generator: 'laneId(i)', words: ['lane', 'lanes'] } }, exclude: [] });
/** The worktree case both hooks export: a brief written in the worktree is read against the worktree's own manifest. `refused` is
 *  the exit code for a brief naming lane 3 (2 for the judge, 0 for the recorder, which counts it and refuses nothing). */
export function briefCase(refused) {
    const brief = (content) => ({ tool_name: 'Write', tool_input: { file_path: '{wt}/docs/brief.md', content } });
    return {
        files: { '{wt}/design/shape.json': LANE_SHAPE },
        steps: [
            { label: 'a brief naming lane 3, in the worktree', event: brief('Drive lane 3.\n'), want: refused },
            { label: 'the same instance on a "seen in:" line', event: brief('seen in: lane 3; build for every lane\n'), want: 0 },
        ],
    };
}
/** The first place the event names an instance of a concept, or null. */
export function briefFindings(event, ctx) {
    const tool = event.tool_name;
    if (tool === 'Agent' || tool === 'Task') {
        const shape = readShape(ctx.projectDir);
        if (!shape || shape.error)
            return null;
        const text = [event.tool_input?.description, event.tool_input?.prompt].filter((t) => typeof t === 'string').join('\n');
        const findings = find(shape)(text);
        return findings.length ? { where: 'the agent brief', findings, shape } : null;
    }
    for (const w of writesOf(event, event.cwd ?? ctx.cwd, ctx.env)) {
        if (w.after === null || w.op === 'delete' || !insideProject(ctx.projectDir, w.path, ctx.cwd))
            continue;
        const rel = relInCheckout(ctx.projectDir, w.path, ctx.cwd);
        if (!BRIEFS.test(rel))
            continue;
        const shape = readShape(checkoutRoot(ctx.projectDir, w.path, ctx.cwd)) ?? readShape(ctx.projectDir);
        if (!shape || shape.error || isExcluded(rel, shape) || addressedOutside(rel, w.after))
            continue;
        const findings = addedFindings(w.before, w.after, find(shape));
        if (findings.length)
            return { where: rel, findings, shape };
    }
    return null;
}
/** The refusal's words: each instance found, the manifest row it breaks and the fix. */
export function briefMessage({ where, findings, shape }) {
    const lines = findings.slice(0, 8).map((f) => `  ${where}:${f.line}: "${f.text.length > 140 ? `${f.text.slice(0, 137)}...` : f.text}" names ${f.concept} instance ${f.instance} (${f.why})`);
    const rows = [...new Set(findings.map((f) => f.concept))].map((c) => {
        const k = shape.concepts[c];
        const how = k ? (k.shape === 'many' ? `many${k.count ? `(${k.count})` : ''}, made by ${String(k.row['generator'])}` : `one, id ${String(k.id)}`) : 'declared';
        return `  ${quoteRow(c, shape)}\n    fix: name the shape and the generator (every ${c}: ${how}); the instance is the example, on its own "seen in:" or "example:" line`;
    });
    return `BLOCKED by brief-guard: ${where} names one instance of a concept outside a "seen in:" or "example:" line — ${ASK}\n${lines.join('\n')}${findings.length > 8 ? `\n  ... and ${findings.length - 8} more` : ''}\n${rows.join('\n')}\n` +
        'A page for a person outside the project, about the real machine\'s own named controls (never a spec, brief or recipe), says so in its first 5 lines: <!-- audience: outside --> (.md or .txt only).\n';
}

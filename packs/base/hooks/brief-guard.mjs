#!/usr/bin/env node
// PreToolUse (Agent|Task, and Write|Edit|MultiEdit|NotebookEdit|Bash): a brief, a spec or a recipe names an instance of a
// concept only as the example. KWB-1: one spec sentence ("PIANO in slot 1 and PAD in slot 2") and the recipes' "Slot 1 /
// Slot 2" headings went into nine agent briefs, and every brief got work built and proved on slot 2 alone.
// Judged: an agent's prompt, and what a write ADDS to docs/** or inbox/** (by every write route, lib/writes.mjs). An
// instance of a concept in design/shape.json (lib/shape.mjs: a number, an ordinal, a role name before a concept word, a
// pattern, an array index) is allowed only on a "seen in:" or "example:" line, or as a declared constant read by name (the
// number rule's third form; KWB-4); a selector does not excuse
// it here (a brief says "initSlot", not "slot 1"). The refusal quotes the manifest row and the fix: name the shape and
// the generator; the instance is the example. Every refusal is counted per concept in .claude/usage.log. `--selftest`.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkoutRoot, insideProject, relInCheckout } from './lib/project.mjs';
import { addedFindings, ASK, findInstanceLiterals, isExcluded, logRefusal, quoteRow, readShape } from './lib/shape.mjs';
import { addressedOutside } from './lib/audience.mjs';
import { bashOf, runHook, scratchProject, verdicts, writeOf } from './lib/selftest.mjs';
import { writesOf } from './lib/writes.mjs';
import { asHook, isMain } from './lib/hook-log.mjs';

const ROOT = resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());

const BRIEFS = /^(docs|inbox)\//;
const find = (shape) => (t) => findInstanceLiterals(t, 'brief.md', shape, { only: 'brief' });

function refuse(where, findings, shape) {
  const lines = findings.slice(0, 8).map((f) => `  ${where}:${f.line}: "${f.text.length > 140 ? `${f.text.slice(0, 137)}...` : f.text}" names ${f.concept} instance ${f.instance} (${f.why})`);
  const rows = [...new Set(findings.map((f) => f.concept))].map((c) => {
    const k = shape.concepts[c];
    const how = k.shape === 'many' ? `many${k.count ? `(${k.count})` : ''}, made by ${k.row.generator}` : `one, id ${k.id}`;
    return `  ${quoteRow(c, shape)}\n    fix: name the shape and the generator (every ${c}: ${how}); the instance is the example, on its own "seen in:" or "example:" line`;
  });
  logRefusal(ROOT, 'brief-guard', findings.map((f) => f.concept));
  process.stderr.write(`BLOCKED by brief-guard: ${where} names one instance of a concept outside a "seen in:" or "example:" line — ${ASK}\n${lines.join('\n')}${findings.length > 8 ? `\n  ... and ${findings.length - 8} more` : ''}\n${rows.join('\n')}\n` +
    'A page for a person outside the project, about the real machine\'s own named controls (never a spec, brief or recipe), says so in its first 5 lines: <!-- audience: outside --> (.md or .txt only).\n');
  return 2;
}

function main(text) {
  let payload;
  try { payload = JSON.parse(text); } catch { return 0; }
  const tool = payload.tool_name;
  if (tool === 'Agent' || tool === 'Task') {
    const shape = readShape(ROOT);
    if (!shape || shape.error) return 0;
    const text = [payload.tool_input?.description, payload.tool_input?.prompt].filter((t) => typeof t === 'string').join('\n');
    const hits = find(shape)(text);
    return hits.length ? refuse('the agent brief', hits, shape) : 0;
  }
  for (const w of writesOf(payload, payload.cwd ?? process.cwd())) {
    if (w.after === null || w.op === 'delete' || !insideProject(ROOT, w.path, process.cwd())) continue;
    const rel = relInCheckout(ROOT, w.path, process.cwd());
    if (!BRIEFS.test(rel)) continue;
    const shape = readShape(checkoutRoot(ROOT, w.path, process.cwd())) ?? readShape(ROOT);
    if (!shape || shape.error || isExcluded(rel, shape) || addressedOutside(rel, w.after)) continue;
    const hits = addedFindings(w.before, w.after, find(shape));
    if (hits.length) return refuse(rel, hits, shape);
  }
  return 0;
}

const SHAPE = {
  concepts: {
    slot: { shape: 'many', count: 4, generator: 'slotId(i, field)', words: ['slot', 'slots'], selectors: { selectedSlot: 'the slot the player has open' }, constants: { initSlot: { instance: 1, reason: 'INIT plays one saw in slot 1' } } },
    layer: { shape: 'many', generator: 'layerId(i)', words: ['layer', 'layers'] },
  },
  exclude: [],
};

function selftest() {
  const hook = fileURLToPath(import.meta.url);
  const dir = scratchProject({ 'design/shape.json': JSON.stringify(SHAPE), 'docs/recipes.md': '# Recipes\nPLACE\n' });
  const bare = scratchProject({});
  const agent = (prompt, at = dir) => runHook(hook, at, { tool_name: 'Agent', tool_input: { description: 'build', prompt } }).status;
  const doc = (rel, text) => runHook(hook, dir, writeOf(join(dir, rel), text)).status;
  const n = () => { try { return readFileSync(join(dir, '.claude/usage.log'), 'utf8').split('\n').filter((l) => /\tbrief-guard\tslot$/.test(l)).length; } catch { return 0; } };
  const cases = [
    ['agent: "drive slot 2"', agent('Build the delay. Drive slot 2 and check it works.'), 2],
    ['agent: "the PAD slot"', agent('Give the PAD slot its reverb.'), 2],
    ['agent: "the second slot"', agent('Wire the second slot.'), 2],
    ['agent: a declared constant read by name passes (the number rule\'s third form)', agent('Start in slot 1 (initSlot).'), 0],
    ['doc: the INIT line naming its declared constant passes', doc('docs/recipes.md', '**INIT** (the declared constant initSlot): one saw in slot 1.\n'), 0],
    ['agent: a selector is still no excuse in a brief', agent('Use selectedSlot: drive slot 2.'), 2],
    ['agent: "seen in: slot 2, build for all slots"', agent('Fix the missing delay.\nseen in: slot 2, build for all slots'), 0],
    ['agent: quotes the manifest row (its reason names slot 1)', agent(`The slot row: INIT plays one saw in slot 1. Build for every slot with slotId(i, field).`), 0],
    ['agent: names the shape and the generator', agent('Every slot (many(4), slotId(i, field)) gets the delay; loop over all slots.'), 0],
    ['agent: no design/shape.json', agent('Drive slot 2.', bare), 0],
    ['recipe heading "Slot 1, the lead"', doc('docs/recipes.md', '# Recipes\n## Slot 1, the lead\n'), 2],
    ['recipe heading "Layer lead"', doc('docs/recipes.md', '# Recipes\n## Layer lead\n'), 0],
    ['inbox brief "drive slot 2"', doc('inbox/brief-7.md', 'Drive slot 2 until it works.\n'), 2],
    ['inbox brief "example: slot 2"', doc('inbox/brief-7.md', 'Build the swap for all slots.\nexample: slot 2 lost its delay\n'), 0],
    ['bash heredoc into docs/', runHook(hook, dir, bashOf("cat >> docs/recipes.md <<'EOF'\n## Slot 2, the pad\nEOF", dir)).status, 2],
    ['not a brief: src/ is shape-law\'s', doc('src/world/x.md', 'slot 2\n'), 0],
    ['agent: files named for the machine\'s pages are paths, not instances (KWB-117)', agent('Check these reports: docs/screens/om-112-slot2-formant.md, om-113-slot3-pitch.md and screens/slot4.png.'), 0],
    ['agent: a path beside it never excuses an instruction (KWB-117)', agent('Read docs/notes.md, then drive slot 2.'), 2],
  ];
  cases.push(['doc: addressed outside, marker in the first lines (KWB-127)', doc('docs/sample-request.md', '<!-- audience: outside -->\n# Recording\nRoute LFO 1 to VCO1 FREQ; drive slot 2 triangle.\n'), 0]);
  cases.push(['doc: the same text with no marker is still refused (KWB-127)', doc('docs/sample-request.md', '# Recording\nDrive slot 2 triangle.\n'), 2]);
  cases.push(['doc: a marker below the first 5 lines exempts nothing (KWB-127)', doc('docs/sample-request.md', '# Recording\n\n\n\n\n<!-- audience: outside -->\nDrive slot 2.\n'), 2]);
  cases.push(['inbox brief: the marker exempts a .md brief too, by its declared audience (KWB-127)', doc('inbox/brief-8.md', '<!-- audience: outside -->\nDrive slot 2.\n'), 0]);
  cases.push(['usage.log counts each refusal per concept', n(), 10]);
  return verdicts('brief-guard', cases);
}

export const hook = main; // run-hooks.mjs calls it with the event's text (KWB-24)
if (isMain(import.meta.url)) process.exit(process.argv.includes('--selftest') ? selftest() : await asHook('brief-guard', main));

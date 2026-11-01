#!/usr/bin/env node
// making: before anything is built, what is being made and the shape of every concept it touches (Tim, claude-packs 0.9.0
// item 6; KWB-1). A UserPromptSubmit hook: the same short text goes in front of every prompt, under 80 words, exactly
// Tim's content: what are you making; each concept you touch and its shape from design/shape.json; a new concept gets its
// row first; a brief naming an instance is wrong by definition; used more than once, one function, parameterized, and
// where it lives. The answer is a `making:` line in the step's In progress entry in build.md (making-check reads it).
// When the prompt itself names an instance of a many concept, one line more: "you named X: building for all <shape>, X
// is the reproduction". Nothing else is added.
//   node making.mjs --cost       the text's size per turn (doctor prints it)
//   node making.mjs --selftest
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { checkoutRoot, ROOT } from './lib/project.mjs';
import { scratchProject } from './lib/selftest.mjs';
import { findInstanceLiterals, readShape } from './lib/shape.mjs';

export const TEXT = "making: before the first write, answer in build.md's In progress entry for this step, one line: " +
  '`making: <what you are making>; concepts: <each you touch, its shape from design/shape.json>; reuse: <function, where it lives>`. ' +
  'A new concept gets its shape.json row first. A brief naming an instance is wrong by definition. Used more than once? ' +
  'One function, parameterized; cite where it lives.';
export const MAX_WORDS = 80;

export const words = (t) => t.split(/\s+/).filter(Boolean).length;

// A token estimate, stated as one: word pieces of up to 6 letters, each digit run of up to 3 and each mark one token
// each (English in a BPE tokenizer runs about 1.3 tokens a word); never the model's own count.
export function tokens(t) {
  let n = 0;
  for (const p of t.match(/[A-Za-z]+|\d+|[^\sA-Za-z\d]/g) ?? []) n += /^[A-Za-z]/.test(p) ? Math.ceil(p.length / 6) : /^\d/.test(p) ? Math.ceil(p.length / 3) : 1;
  return n;
}

const plural = (c, name) => (c?.plural instanceof Set && c.plural.size ? [...c.plural][0] : (c?.words ?? []).find((w) => w === `${name}s` || w === `${name}es`)) ?? `${name}s`;

// The echo line, or '' when the prompt names no instance of a many concept. One line, whatever the prompt holds.
export function echo(prompt, shape) {
  if (!shape || !prompt) return '';
  const named = [];
  const seen = new Set();
  for (const f of findInstanceLiterals(prompt, 'prompt.md', shape)) {
    const c = shape.concepts?.[f.concept];
    if ((c?.shape ?? c?.row?.shape) !== 'many' || seen.has(f.concept) || f.instance === 'each') continue;
    seen.add(f.concept);
    const x = /^\d+$/.test(f.instance) ? `${f.concept} ${f.instance}` : `${f.instance} ${f.concept}`;
    const n = c.count ?? c.row?.count;
    named.push(`${x}: building for all ${plural(c, f.concept)} (many${n ? `, ${n}` : ''}), ${x} is the reproduction`);
  }
  return named.length ? `you named ${named.slice(0, 2).join('; ')}` : '';
}

export function inject(prompt, shape) {
  const line = echo(prompt, shape);
  return line && words(`${TEXT} ${line}`) <= MAX_WORDS ? `${TEXT}\n${line}` : line ? `${TEXT}\n${line.split('; ')[0]}` : TEXT;
}

export const cost = () => {
  const one = `${TEXT}\nyou named slot 2: building for all slots (many, 4), slot 2 is the reproduction`;
  return `making: ${words(TEXT)} words, about ${tokens(TEXT)} tokens added to every prompt (${words(one)} words, about ${tokens(one)} tokens when it echoes a named instance); ` +
    'an estimate (word pieces of up to 6 letters, each mark one token), not the model\'s tokenizer';
};

function selftest() {
  const dir = scratchProject({ 'design/shape.json': JSON.stringify({
    concepts: {
      slot: { shape: 'many', count: 4, generator: 'slotId(i, field)', words: ['slot', 'slots'], selectors: { selectedSlot: 'the slot the player has open' }, constants: { initSlot: { instance: 1, reason: 'INIT plays one saw' } } },
      mixer: { shape: 'one', id: 'mixer', words: ['mixer'] },
    },
    exclude: [],
  }) });
  const shape = readShape(dir);
  rmSync(dir, { recursive: true, force: true });
  const cases = [
    ['the text is under 80 words', words(TEXT) < MAX_WORDS],
    ['the text with one echo line is still under 80 words', words(inject('drive slot 2 louder', shape)) <= MAX_WORDS],
    ['the text asks every item of the order', ['making:', 'concept', 'shape', 'design/shape.json', 'row first', 'brief naming an instance', 'wrong by definition', 'more than once', 'one function', 'parameterized', 'where it lives', 'In progress', 'build.md'].every((k) => TEXT.toLowerCase().includes(k.toLowerCase()))],
    ['a prompt naming slot 2 gets the echo', inject('the PAD in slot 2 is too quiet, fix it', shape).endsWith('you named slot 2: building for all slots (many, 4), slot 2 is the reproduction')],
    ['a prompt naming no instance gets the text alone', inject('make the reverb darker on every slot', shape) === TEXT],
    ['an example line is not an echo', inject('seen in: slot 3, build it for all slots', shape) === TEXT],
    ['a selector is not an echo', inject('the selectedSlot loses its sound after a load', shape) === TEXT],
    ['a one concept is never echoed as many', inject('the mixer 1 meter', shape).split('\n').length <= 2 && !inject('the mixer 1 meter', shape).includes('all mixers')],
    ['no manifest: the text alone', inject('drive slot 2', null) === TEXT],
    ['the cost is measured and stated as an estimate', /\d+ words, about \d+ tokens/.test(cost()) && cost().includes('estimate')],
  ];
  for (const [name, ok] of cases) if (!ok) console.error(`making selftest FAILED: ${name}`);
  const bad = cases.filter(([, ok]) => !ok).length;
  if (!bad) console.log(`making selftest: OK (${cases.length} cases)`);
  return bad ? 1 : 0;
}

function main() {
  if (process.argv.includes('--selftest')) return selftest();
  if (process.argv.includes('--cost')) { console.log(cost()); return 0; }
  let event = {};
  try { event = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { /* the text still goes */ }
  if (event.hook_event_name && event.hook_event_name !== 'UserPromptSubmit') return 0;
  const root = event.cwd ? checkoutRoot(join(event.cwd, 'prompt')) : ROOT;
  let shape = null;
  try { shape = readShape(root) ?? readShape(ROOT); } catch { /* the text still goes */ }
  process.stdout.write(`${inject(event.prompt ?? '', shape)}\n`);
  return 0;
}

process.exit(main());

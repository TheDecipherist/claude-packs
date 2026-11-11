// making: before anything is built, what is being made and the shape of every concept it touches (claude-packs 0.9.0
// item 6; KWB-1). A UserPromptSubmit hook: the same short text goes in front of every prompt, under 80 words, exactly
// The user's content: what are you making; each concept you touch and its shape from design/shape.json; a new concept gets its
// row first; a brief naming an instance is wrong by definition; used more than once, one function, parameterized, and
// where it lives. The answer is a `making:` line in the step's In progress entry in build.md (making-check reads it).
// When the prompt itself names an instance of a many concept, one line more: "you named X: building for all <shape>, X
// is the reproduction". Nothing else is added.
// A judge on the hook contract (typescript order W4): it says its text and writes nothing.
//   node making.mjs --cost       the text's size per turn (doctor prints it)
//   node making.mjs --selftest
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain, runAsHook } from './lib/hook-log.mjs';
import { checkoutRoot } from './lib/project.mjs';
import { runHook, scratchProject, snapshot, verdicts, writtenSince } from './lib/selftest.mjs';
import { findInstanceLiterals, readShape } from './lib/shape.mjs';
import { pass, say } from './lib/verdict.mjs';
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
    for (const p of t.match(/[A-Za-z]+|\d+|[^\sA-Za-z\d]/g) ?? [])
        n += /^[A-Za-z]/.test(p) ? Math.ceil(p.length / 6) : /^\d/.test(p) ? Math.ceil(p.length / 3) : 1;
    return n;
}
const plural = (c, name) => {
    const first = c?.plural instanceof Set && c.plural.size ? [...c.plural][0] : undefined;
    return first ?? (c?.words ?? []).find((w) => w === `${name}s` || w === `${name}es`) ?? `${name}s`;
};
// The echo line, or '' when the prompt names no instance of a many concept. One line, whatever the prompt holds.
export function echo(prompt, shape) {
    if (!shape || !prompt)
        return '';
    const named = [];
    const seen = new Set();
    for (const f of findInstanceLiterals(prompt, 'prompt.md', shape)) {
        const c = shape.concepts[f.concept];
        if (!c || c.shape !== 'many' || seen.has(f.concept) || f.instance === 'each')
            continue;
        seen.add(f.concept);
        const x = /^\d+$/.test(f.instance) ? `${f.concept} ${f.instance}` : `${f.instance} ${f.concept}`;
        const n = c.count;
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
export const hook = (event, ctx) => {
    if (event.hook_event_name && event.hook_event_name !== 'UserPromptSubmit')
        return pass;
    const root = event.cwd ? checkoutRoot(ctx.projectDir, join(event.cwd, 'prompt'), ctx.cwd) : ctx.projectDir;
    let shape = null;
    try {
        shape = readShape(root) ?? readShape(ctx.projectDir);
    }
    catch { /* the text still goes */ }
    return say(`${inject(event.prompt ?? '', shape)}\n`);
};
export function selftest() {
    const hookFile = fileURLToPath(import.meta.url);
    const manifest = {
        concepts: {
            slot: { shape: 'many', count: 4, generator: 'slotId(i, field)', words: ['slot', 'slots'], selectors: { selectedSlot: 'the slot the player has open' }, constants: { initSlot: { instance: 1, reason: 'INIT plays one saw' } } },
            mixer: { shape: 'one', id: 'mixer', words: ['mixer'] },
        },
        exclude: [],
    };
    const dir = scratchProject({ 'design/shape.json': JSON.stringify(manifest) });
    const shape = readShape(dir);
    const before = snapshot(dir); // the project as the judge finds it: the rows below must leave it as it is
    const said = (prompt) => runHook(hookFile, dir, { hook_event_name: 'UserPromptSubmit', prompt, cwd: dir }).stdout;
    const asks = ['making:', 'concept', 'shape', 'design/shape.json', 'row first', 'brief naming an instance', 'wrong by definition', 'more than once', 'one function', 'parameterized', 'where it lives', 'In progress', 'build.md'];
    const cases = [
        ['the text is under 80 words', words(TEXT) < MAX_WORDS],
        ['the text with one echo line is still under 80 words', words(inject('drive slot 2 louder', shape)) <= MAX_WORDS],
        ['the text asks every item of the order', asks.every((k) => TEXT.toLowerCase().includes(k.toLowerCase()))],
        ['a prompt naming slot 2 gets the echo', inject('the PAD in slot 2 is too quiet, fix it', shape).endsWith('you named slot 2: building for all slots (many, 4), slot 2 is the reproduction')],
        ['a prompt naming no instance gets the text alone', inject('make the reverb darker on every slot', shape) === TEXT],
        ['an example line is not an echo', inject('seen in: slot 3, build it for all slots', shape) === TEXT],
        ['a selector is not an echo', inject('the selectedSlot loses its state after a load', shape) === TEXT],
        ['a one concept is never echoed as many', inject('the mixer 1 meter', shape).split('\n').length <= 2 && !inject('the mixer 1 meter', shape).includes('all mixers')],
        ['no manifest: the text alone', inject('drive slot 2', null) === TEXT],
        ['the cost is measured and stated as an estimate', /\d+ words, about \d+ tokens/.test(cost()) && cost().includes('estimate')],
        ['through the runner: the prompt naming slot 2 gets the echo', said('drive slot 2 louder').includes('you named slot 2: building for all slots')],
        ['through the runner: another event says nothing', runHook(hookFile, dir, { hook_event_name: 'Stop', cwd: dir }).stdout === ''],
    ];
    return verdicts('making', [
        ...cases.map(([label, ok]) => [label, ok, true]),
        ['a judge writes no file (the write trap)', writtenSince(dir, before).join(','), ''],
    ]);
}
if (isMain(import.meta.url))
    await runAsHook(import.meta.url, 'making', hook, selftest, { flags: { '--cost': () => { console.log(cost()); return 0; } } });

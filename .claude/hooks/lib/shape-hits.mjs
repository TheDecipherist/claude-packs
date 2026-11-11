// shape-hits: the instance literals one line holds for one concept (split out of shape.mts at its line limit).
//   lineHits(line, c, shape, aliases, inSwitch, file) -> [{ instance, why, call? }]
import { escapeRegExp } from './glob.mjs';
import { blankMessages, isFirstMatch, isKnownName, isLibraryCall, isLongerName, isSourceRole, isSum } from './shape-prose.mjs';
import { conceptOfExpr, isCountish } from './shape-lines.mjs';
import { parts } from './shape-model.mjs';
const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);
const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
const NOT_ROLES = new Set([
    'ALL', 'EACH', 'EVERY', 'ANY', 'ONE', 'NEW', 'THE', 'NO', 'THIS', 'THAT', 'SAME', 'OTHER', 'OWN', 'NEXT', 'MANY', 'NOT', 'AND', 'OR',
    'TODO', 'NOTE', 'FIXME', 'IN', 'ON', 'OF', 'TO', 'A', 'AN', 'EMPTY', 'SELECTED', 'OPEN', 'CURRENT',
    // a gate's verdict before the word ("FAIL slot 2"; KWB-15)
    'PASS', 'FAIL', 'FAILED', 'RED', 'GREEN', 'OK', 'SKIP', 'WARN', 'ERROR',
]);
const EXPR = '[A-Za-z_]\\w*(?:(?:\\.|->|::)[A-Za-z_]\\w*|\\(\\)|\\[\\w*\\])*';
// A multi-word all-caps label ("AIM EFFECTS", "NOTES MONO") names a control, not an instance (KWB-22): the caps word before it.
const labelBefore = (line, at) => { const w = /([A-Z][A-Z0-9]+)\s+$/.exec(line.slice(0, at)); return w !== null && !NOT_ROLES.has(w[1] ?? ''); };
// "slot 2", "slot #2", "slot2", "slots 1-3": a number after the concept's word.
function byNumber(line, words, c, add) {
    const W = c.words.map(escapeRegExp).sort((a, b) => b.length - a.length).join('|');
    const num = new RegExp(`(?<![A-Za-z0-9])(${W})(?:[ _#-]|\\s+(?:no\\.?|number|#)\\s*)?(\\d+)(?![\\dxX])((?:\\s*(?:-|–|\\.\\.|to|through)\\s*)(\\d+))?`, 'gi'); // 0x18000 is an address (KF-13)
    for (const m of words.matchAll(num)) {
        const [whole = '', word = '', first = '', range, last = ''] = m;
        if (isSourceRole(line, m))
            continue; // KF-28
        if (c.count !== null && !range && Number(first) > c.count)
            continue; // past the count: a value, not an instance (KWB-22)
        if (word === word.toUpperCase() && labelBefore(line, m.index))
            continue; // AIM EFFECTS 100: a control's value
        if (range && c.count !== null) {
            const [a, b] = [Number(first), Number(last)];
            if ((a === 0 && b === c.count - 1) || (a === 1 && b === c.count))
                continue; // the whole range: every instance
        }
        add(first, `names it by number ("${whole.trim()}")`);
    }
    const camel = new RegExp(`(?<=[a-z0-9_])(${c.words.map((w) => escapeRegExp(cap(w))).join('|')})_?(\\d+)(?!\\d)`, 'g');
    for (const m of line.matchAll(camel))
        add(m[2] ?? '', `names it by number in an identifier ("${m[0]}")`);
}
// "the second slot", "3rd slot", and the role names ("the PAD slot").
function byName(line, words, c, shape, add) {
    const S = c.single.map(escapeRegExp).join('|');
    const ord = new RegExp(`(?<![A-Za-z0-9])(${ORDINALS.join('|')}|\\d+(?:st|nd|rd|th))[\\s_-]*(${S})(?![a-z])`, 'gi');
    for (const m of words.matchAll(ord)) {
        if (isFirstMatch(words, m))
            continue; // KF-17
        const o = (m[1] ?? '').toLowerCase();
        add(ORDINALS.includes(o) ? ORDINALS.indexOf(o) + 1 : parseInt(o, 10), `names it by ordinal ("${m[0].trim()}")`);
    }
    if (c.shape !== 'many')
        return;
    const role = new RegExp(`(?<![A-Za-z0-9_])([A-Z][A-Z0-9]+)\\s+(${c.single.flatMap((w) => [escapeRegExp(w), escapeRegExp(cap(w))]).join('|')})(?![A-Za-z0-9_])`, 'g');
    const notARole = (m) => {
        const [whole = '', first = '', word = ''] = m;
        const at = m.index ?? 0;
        return NOT_ROLES.has(first) || c.words.includes(first.toLowerCase()) || c.names.has(first) || labelBefore(line, at) || isKnownName(first, word, shape) || isLongerName(words, at + whole.length);
    };
    for (const m of words.matchAll(role))
        if (!notARole(m))
            add(m[1] ?? '', `names it by a role ("${m[0]}"): the instance is a job or a value, not a ${c.name}`);
}
// An array indexed by a number, a comparison with a number, a case, and a call that drives one instance by number.
function byUse(line, c, shape, aliases, inSwitch, add) {
    for (const m of line.matchAll(/([A-Za-z_]\w*)\s*(?:\[\s*(\d+)\s*\]|\.at\(\s*(\d+)\s*\))/g)) {
        const lead = line.slice(0, m.index).trimEnd();
        if (/[\w*&>]$/.test(lead) && !/(?:\b(?:return|case|else|do|in|of|throw|yield|await|and|or|not)|>>)$/.test(lead))
            continue; // a declaration's size: Slot slots[4]
        const name = m[1] ?? '';
        const ps = parts(name);
        if (c.arrays.includes(name) || (ps.some((p) => c.words.includes(p)) && !ps.some(isCountish)))
            add(m[2] ?? m[3] ?? '', `indexes a per-${c.name} array with a number ("${m[0]}")`);
    }
    for (const m of line.matchAll(new RegExp(`(${EXPR})\\s*(?:===?|!==?)\\s*(\\d+)(?![\\w.])`, 'g'))) {
        if (conceptOfExpr(m[1] ?? '', shape, aliases) === c.name)
            add(m[2] ?? '', `compares a ${c.name} with a number ("${m[0]}")`);
    }
    for (const m of line.matchAll(new RegExp(`(?<![\\w.])(\\d+)\\s*(?:===?|!==?)\\s*(${EXPR})`, 'g'))) {
        if (conceptOfExpr(m[2] ?? '', shape, aliases) === c.name && !isSum(line.slice(0, m.index)))
            add(m[1] ?? '', `compares a ${c.name} with a number ("${m[0]}")`);
    }
    if (inSwitch === c.name)
        for (const m of line.matchAll(/\bcase\s+(\d+)\s*:/g))
            add(m[1] ?? '', `a case for one ${c.name} ("${m[0]}")`);
    for (const m of line.matchAll(/(?<![\w])([A-Za-z_]\w*)\s*\(\s*(\d+)\s*[,)]/g)) {
        const fn = m[1] ?? '';
        const ps = parts(fn);
        if (isLibraryCall(line, m.index, shape))
            continue; // KF-20
        if (ps.some((p) => c.single.includes(p)) && !ps.some((p) => c.plural.has(p) || isCountish(p)))
            add(m[2] ?? '', `drives one ${c.name} by number ("${m[0].replace(/[,)]$/, '')}")`, fn);
    }
}
export function lineHits(line, c, shape, aliases, inSwitch, file) {
    const hits = [];
    const add = (instance, why, call) => hits.push(call === undefined ? { instance: String(instance), why } : { instance: String(instance), why, call });
    const words = blankMessages(line, file); // what is read as words: a sentence in a string is text (KF-17)
    for (const re of c.patterns)
        for (const m of line.matchAll(re))
            add(m[1] ?? m[0], `matches the pattern ${re.source}`);
    byNumber(line, words, c, add);
    byName(line, words, c, shape, add);
    byUse(line, c, shape, aliases, inSwitch, add);
    return hits;
}

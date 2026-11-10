// shape-lists: consecutive lines (or ;/, separated pieces of one line) that differ only in one number running over every instance: a hand-listed set, one line
// per instance. Split out of shape.mjs at its line limit.
//   handLists(lines, c, out, seen): adds a finding to out for each such set of the concept c
import { classify, isExampleLine, named, parts } from './shape.mjs';

const templatesOf = (t) => [...t.matchAll(/(?<![\w.])\d+(?![\w.])/g)].map((m) => ({ tpl: t.slice(0, m.index) + '#' + t.slice(m.index + m[0].length), v: Number(m[0]) }));

export function handLists(lines, c, out, seen) {
  if (!c.count || c.count < 2 || c.shape !== 'many') return;
  const mentions = (t) => parts(t).some((p) => c.words.includes(p)) || c.arrays.some((a) => named(t, a));
  const runOver = (pieces, at, whole = null) => {
    for (let i = 0; i + c.count <= pieces.length; i += 1) {
      for (const first of templatesOf(pieces[i].trim())) {
        if (first.v > 1 || !mentions(whole ?? first.tpl)) continue;
        let ok = true;
        for (let k = 1; k < c.count && ok; k += 1) ok = templatesOf(pieces[i + k].trim()).some((t) => t.tpl === first.tpl && t.v === first.v + k);
        if (ok) return at(i);
      }
    }
    return null;
  };
  const lineNo = runOver(lines, (i) => i);
  if (lineNo !== null && !isExampleLine(lines[lineNo]) && !seen.has(`${lineNo}|${c.name}`)) {
    out.push({ line: lineNo + 1, text: lines[lineNo].trim(), concept: c.name, instance: 'each', why: `a hand-listed set, one line per ${c.name}: write one loop over every ${c.name}, or the generator` });
  }
  lines.forEach((l, i) => {
    if (seen.has(`${i}|${c.name}`) || isExampleLine(l) || classify(l, c, null)) return;
    const pieces = l.split(/[;,]/);
    if (pieces.length >= c.count && runOver(pieces, () => true, l)) out.push({ line: i + 1, text: l.trim(), concept: c.name, instance: 'each', why: `a hand-listed set, one piece per ${c.name}: write one loop over every ${c.name}, or the generator` });
  });
}

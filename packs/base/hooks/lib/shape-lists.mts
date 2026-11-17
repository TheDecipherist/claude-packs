// shape-lists: consecutive lines (or ;/, separated pieces of one line) that differ only in one number running over every instance: a hand-listed set, one line
// per instance. Split out of shape.mjs at its line limit.
//   handLists(lines, c, out, seen): adds a finding to out for each such set of the concept c
import { classify, isExampleLine, named } from './shape-lines.mts';
import { parts } from './shape-model.mts';
import type { ShapeConceptData } from './shape-model.mts';

/** One instance literal found in a text: where, what, which concept and instance, and why. */
export interface InstanceFinding { line: number; text: string; concept: string; instance: string; why: string; call?: string }

interface Template { tpl: string; v: number }

/** A line's sentences: each ends at . ! or ? followed by a space (`a.b` in code is no end). A line with none is one sentence. */
const SENTENCES = (line: string): string[] => line.split(/(?<=[.!?])\s+/);

const templatesOf = (t: string): Template[] => [...t.matchAll(/(?<![\w.])\d+(?![\w.])/g)].map((m) => ({ tpl: t.slice(0, m.index) + '#' + t.slice(m.index + m[0].length), v: Number(m[0]) }));

export function handLists(lines: readonly string[], c: ShapeConceptData, out: InstanceFinding[], seen: Set<string>): void {
  const count = c.count;
  if (!count || count < 2 || c.shape !== 'many') return;
  const mentions = (t: string): boolean => parts(t).some((p) => c.words.includes(p)) || c.arrays.some((a) => named(t, a));
  // The index where `count` pieces in a row run over one template from 0 or 1, or null.
  const runOver = (pieces: readonly string[], whole: string | null = null): number | null => {
    for (let i = 0; i + count <= pieces.length; i += 1) {
      for (const first of templatesOf((pieces[i] ?? '').trim())) {
        if (first.v > 1 || !mentions(whole ?? first.tpl)) continue;
        let ok = true;
        for (let k = 1; k < count && ok; k += 1) ok = templatesOf((pieces[i + k] ?? '').trim()).some((t) => t.tpl === first.tpl && t.v === first.v + k);
        if (ok) return i;
      }
    }
    return null;
  };
  const lineNo = runOver(lines);
  if (lineNo !== null && !isExampleLine(lines[lineNo] ?? '') && !seen.has(`${lineNo}|${c.name}`)) {
    out.push({ line: lineNo + 1, text: (lines[lineNo] ?? '').trim(), concept: c.name, instance: 'each', why: `a hand-listed set, one line per ${c.name}: write one loop over every ${c.name}, or the generator` });
  }
  lines.forEach((l, i) => {
    if (seen.has(`${i}|${c.name}`) || isExampleLine(l) || classify(l, c, null)) return;
    // the pieces and the concept's mention are read in one sentence: a line of code is one statement, a line of prose a paragraph,
    // and an lfo named in one sentence made a list of measured boxes in another one piece per lfo (supernova2_monitor, KWB-next)
    const run = SENTENCES(l).some((sentence) => {
      const pieces = sentence.split(/[;,]/);
      return pieces.length >= count && runOver(pieces, sentence) !== null;
    });
    if (run) out.push({ line: i + 1, text: l.trim(), concept: c.name, instance: 'each', why: `a hand-listed set, one piece per ${c.name}: write one loop over every ${c.name}, or the generator` });
  });
}

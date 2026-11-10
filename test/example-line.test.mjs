// 0.9.3 (KWB-6): the "seen in:" / "example:" test is linear in the line's length; the forms it excuses are unchanged.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isExampleLine } from '../packs/base/hooks/lib/shape.mjs';

test('a long row of dashes is judged at once, not in exponential time', () => {
  for (const line of ['# ' + '-'.repeat(200), '// ' + '-'.repeat(500), '- '.repeat(300), '-- '.repeat(300) + 'x']) {
    const a = Date.now(); assert.equal(isExampleLine(line), false); assert.ok(Date.now() - a < 50, `${line.length} chars took ${Date.now() - a} ms`);
  }
});
test('the excused forms still pass, the others still do not', () => {
  for (const ok of ['seen in: slot 2', 'example: slot 2', '- seen in: slot 2', '// example: x', '/* seen in: y', '# Seen in: z', '> example: q',
    '1. seen in: a', '| a | seen in: b |', '<!-- example: c', '-- seen in: d', ';; example: e', '  * - seen in: f']) assert.equal(isExampleLine(ok), true, ok);
  for (const no of ['drive slot 2', 'the seen in: later', 'x // seen in: y', '- slot 2, seen in: x', 'examples: a']) assert.equal(isExampleLine(no), false, no);
});

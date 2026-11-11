// prose.mts: what a reader reads as prose in markdown; the rest is blanked, line for line, same length.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { blankProse } from '../../../packs/base/hooks/lib/prose.mts';

test('frontmatter, fences, comments, inline code, link targets and URLs are blanked, prose stays', () => {
  const text = '---\ntitle: a -- b\n---\nUse `npm test -- x` now.\n```sh\nrm -- y\n```\n<!-- a -- b -->\nSee [docs](https://x.y/--z) and https://q.r/--s end.\n';
  const out = blankProse(text);
  assert.doesNotMatch(out, /--/, 'no double dash is left for a check to read');
  assert.match(out, /Use\s+now\./);
  assert.match(out, /See \[docs\s+and\s+end\./);
});

test('the length and the line count never change', () => {
  const text = '---\na: 1\n---\n~~~\ncode\n~~~\n`x` y\n';
  const out = blankProse(text);
  assert.equal(out.length, text.length);
  assert.equal(out.split('\n').length, text.split('\n').length);
});

test('a planted unclosed fence or empty text is handled without a throw', () => {
  assert.equal(blankProse(''), '');
  const open = '```\nnever closed -- here\n';
  assert.match(blankProse(open), /never closed -- here/, 'an unclosed fence blanks no block');
  assert.equal(blankProse(open).length, open.length);
});

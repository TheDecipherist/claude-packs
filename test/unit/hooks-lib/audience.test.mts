// audience.mts: the one marker that says a document is addressed outside the project (KWB-127), honoured only in .md and .txt.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AUDIENCE_MARKER, addressedOutside } from '../../../packs/base/hooks/lib/audience.mts';

test('the marker in a document\'s first five lines marks it; on line six it does not', () => {
  assert.equal(addressedOutside('docs/record.md', `${AUDIENCE_MARKER}\nSet LFO 1`), true);
  assert.equal(addressedOutside('docs/record.txt', `# title\n\n${AUDIENCE_MARKER}\n`), true);
  assert.equal(addressedOutside('docs/record.md', `<!--  Audience:  OUTSIDE  -->\nx`), true, 'spacing and case are free');
  assert.equal(addressedOutside('docs/record.md', `1\n2\n3\n4\n5\n${AUDIENCE_MARKER}`), false);
});

test('a marker in source exempts nothing, and a marker inside a line of prose is not the marker', () => {
  assert.equal(addressedOutside('src/a.cpp', `${AUDIENCE_MARKER}\n`), false);
  assert.equal(addressedOutside('docs/a.md', `see ${AUDIENCE_MARKER} here\n`), false);
});

test('a text that is not a string (outside data) is never marked', () => {
  assert.equal(addressedOutside('docs/a.md', null), false);
  assert.equal(addressedOutside('docs/a.md', 42), false);
  assert.equal(addressedOutside('docs/a.md', undefined), false);
});

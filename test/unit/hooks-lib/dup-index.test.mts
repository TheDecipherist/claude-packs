// dup-index.mts: once-only's index of a checkout's copies (KWB-24), kept in the temp folder (W3 layer 2).
import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { test } from 'node:test';
import { join } from 'node:path';
import { clonesIn, loadIndex, tokenize, WINDOW, windows } from '../../../packs/base/hooks/lib/dup-index.mts';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';

const BODY = Array.from({ length: 12 }, (_, i) => `  total = total + values[${i}] * weights[${i}] - offset${i};`).join('\n');
const fn = (name: string): string => `function ${name}(values, weights, total) {\n${BODY}\n  return total;\n}\n`;

test('tokenize leaves comments out and keeps each token\'s line', () => {
  const { t, l } = tokenize('a // gone\n/* gone\ntoo */ b', 'x.js');
  assert.deepEqual(t, ['a', 'b']);
  assert.deepEqual(l, [1, 3]);
  assert.deepEqual(tokenize('# gone\nx', 'x.py').t, ['x']);
});

test('windows: one hash per start, none for fewer tokens than a window', () => {
  assert.equal(windows(['a', 'b']).length, 0);
  assert.equal(windows(Array.from({ length: WINDOW + 2 }, () => 'a')).length, 3);
});

test('an index is built, read again unchanged, and a copy of a function in it is found; a planted unrelated text is not', () => {
  const root = scratchDir('dup-index-test-');
  try {
    put(join(root, 'src/a.js'), fn('first'));
    const built = loadIndex(root);
    assert.equal(built.built, true);
    assert.equal(built.read, 1);
    const again = loadIndex(root);
    assert.equal(again.built, false);
    assert.equal(again.read, 0);
    const lines = fn('second').split('\n').length;
    const found = clonesIn(again, [{ path: join(root, 'src/b.js'), after: fn('second'), range: [1, lines] }]);
    assert.equal(found.length, 1);
    assert.ok(found[0]?.other.file.endsWith('src/a.js'));
    assert.deepEqual(clonesIn(again, [{ path: join(root, 'src/c.js'), after: 'const x = 1;\n', range: [1, 1] }]), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// trunk-lag.mts: the main checkout a landing left behind; judged only where there is a main checkout with a trunk to compare.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mainCheckout, trunkLag } from '../../../packs/base/hooks/lib/trunk-lag.mts';
import { scratchDir } from '../../../packs/base/hooks/lib/files.mts';

test('a folder that is no repo has no main checkout and no lag', () => {
  const dir = scratchDir('lag-');
  assert.equal(mainCheckout(dir, {}), null);
  assert.equal(trunkLag(dir, {}, {}), null);
});

test('a planted trunk name that does not exist anywhere is not judged', () => {
  assert.equal(trunkLag(scratchDir('lag-'), {}, { trunks: ['no-such-trunk'] }), null);
});

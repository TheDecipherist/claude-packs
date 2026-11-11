// identifier-runs.mts: an identifier's parts plus each run of two or three joined (KWB-93).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { withRuns } from '../../../packs/base/hooks/lib/identifier-runs.mts';

test('the parts come first, then every run of two and of three', () => {
  assert.deepEqual(withRuns(['pattern', 'slot', 'card']), ['pattern', 'slot', 'card', 'patternslot', 'patternslotcard', 'slotcard']);
});

test('one part has no run, two have one, none have nothing, and four stop at three', () => {
  assert.deepEqual(withRuns(['slot']), ['slot']);
  assert.deepEqual(withRuns(['a', 'b']), ['a', 'b', 'ab']);
  assert.deepEqual(withRuns([]), []);
  assert.deepEqual(withRuns(['a', 'b', 'c', 'd']).filter((r) => r.length > 2), ['abc', 'bcd'], 'no run of four');
});

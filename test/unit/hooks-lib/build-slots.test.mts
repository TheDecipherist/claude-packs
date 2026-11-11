// build-slots.mts: the machine-wide build queue's slots: a folder holding its owner's pid, read by the status check.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { buildSlots, isLive, ownerOf, slotAt, slotOwners } from '../../../packs/base/hooks/lib/build-slots.mts';

test('the slots live where BUILDQ_DIR says, else in the temp folder, two of them unless BUILDQ_SLOTS says', () => {
  assert.deepEqual(buildSlots({}, '/tmp/x'), { dir: join('/tmp/x', 'claude-packs-buildq'), slots: 2 });
  assert.deepEqual(buildSlots({ BUILDQ_DIR: '/q', BUILDQ_SLOTS: '5' }, '/tmp/x'), { dir: '/q', slots: 5 });
  assert.equal(slotAt('/q', 1), join('/q', 'slot-1'));
});

test('a slot\'s owner is its pid file; a slot with none, or a missing one, has no owner and is not live', () => {
  const dir = scratchDir('slots-');
  put(join(slotAt(dir, 1), 'pid'), `${process.pid}\n`);
  assert.equal(ownerOf(slotAt(dir, 1)), process.pid);
  assert.equal(isLive(slotAt(dir, 1)), true);
  assert.equal(ownerOf(slotAt(dir, 2)), null);
  assert.equal(isLive(slotAt(dir, 2)), false);
});

test('a slot whose owner is gone is not live: a planted dead pid', () => {
  const dir = scratchDir('slots-');
  put(join(slotAt(dir, 1), 'pid'), '2147483646');
  assert.equal(isLive(slotAt(dir, 1)), false);
});

test('slotOwners lists the pids that hold slots now, and is empty for a folder that is not there', () => {
  const dir = scratchDir('slots-');
  put(join(slotAt(dir, 1), 'pid'), '111');
  put(join(slotAt(dir, 2), 'pid'), '222');
  put(join(dir, 'other', 'pid'), '333');
  assert.deepEqual([...slotOwners(dir)].sort(), [111, 222]);
  assert.equal(slotOwners(join(dir, 'missing')).size, 0);
});

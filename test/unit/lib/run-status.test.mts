// lib/run-status.mts: the runs' reader lives with the hooks; this file only hands it to the kit's commands. A planted wrong
// export: each name must be the hooks' own function, not a copy.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as kit from '../../../lib/run-status.mts';
import { runnersIn, runningOrders, workIn } from '../../../packs/base/hooks/lib/run-discovery.mts';
import * as hooks from '../../../packs/base/hooks/lib/run-status.mts';
import { projectGroups, runTree } from '../../../packs/base/hooks/lib/run-tree.mts';

test('everything the hooks\' run-status exports is exported here, as the same function', () => {
  for (const [name, value] of Object.entries(hooks)) assert.equal((kit as Record<string, unknown>)[name], value, name);
});

test('the discovery and tree readers the status command needs come with it', () => {
  assert.equal(kit.runnersIn, runnersIn);
  assert.equal(kit.runningOrders, runningOrders);
  assert.equal(kit.workIn, workIn);
  assert.equal(kit.projectGroups, projectGroups);
  assert.equal(kit.runTree, runTree);
});

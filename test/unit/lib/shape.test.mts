// lib/shape.mts: the shape law's reader lives with the hooks; the kit's commands read it through this file.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as kit from '../../../lib/shape.mts';
import * as hooks from '../../../packs/base/hooks/lib/shape.mts';
import { findSelectorDefs, findUnknownTypes } from '../../../packs/base/hooks/lib/shape-code.mts';

test('everything the hooks\' shape exports is exported here, as the same function', () => {
  for (const [name, value] of Object.entries(hooks)) assert.equal((kit as Record<string, unknown>)[name], value, name);
});

test('the code readers doctor and `shape scan` need come with it', () => {
  assert.equal(kit.findSelectorDefs, findSelectorDefs);
  assert.equal(kit.findUnknownTypes, findUnknownTypes);
});

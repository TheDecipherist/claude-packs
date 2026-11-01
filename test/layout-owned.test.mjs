// 0.7.3: every project-owned layout key survives a rebuild of the layout (an update); buildOutput was dropped in 0.7.2.
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { buildLayout } from '../lib/layout.mjs';

test('an update keeps buildOutput, and adds none where the project set none', () => {
  const dir = mkdtempSync(join(tmpdir(), 'layout-owned-'));
  writeFileSync(join(dir, 'layout.json'), JSON.stringify({ folders: {}, concepts: {}, buildOutput: ['out/**'], protected: ['design/**'] }));
  const kept = buildLayout(dir, []);
  assert.deepEqual(kept.buildOutput, ['out/**']);
  assert.deepEqual(kept.protected, ['design/**']);
  const bare = mkdtempSync(join(tmpdir(), 'layout-owned-'));
  writeFileSync(join(bare, 'layout.json'), JSON.stringify({ folders: {}, concepts: {} }));
  assert.equal(buildLayout(bare, []).buildOutput, undefined);
});

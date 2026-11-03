// 0.7.3: every project-owned layout key survives a rebuild of the layout (an update); buildOutput was dropped in 0.7.2.
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { buildLayout } from '../lib/layout.mjs';

test('an update keeps buildOutput, and adds none where the project set none', () => {
  const dir = mkdtempSync(join(tmpdir(), 'layout-owned-'));
  writeFileSync(join(dir, 'layout.json'), JSON.stringify({ folders: {}, concepts: {}, buildOutput: ['out/**'], keepWorktrees: ['night'], protected: ['design/**'], writeOnce: ['build/evidence/**'] }));
  const kept = buildLayout(dir, []);
  assert.deepEqual(kept.buildOutput, ['out/**']);
  assert.deepEqual(kept.protected, ['design/**']);
  assert.deepEqual(kept.keepWorktrees, ['night']);   // 0.9.1: build-sweep's kept worktrees survive an update
  assert.deepEqual(kept.writeOnce, ['build/evidence/**']);   // 0.9.8 (KWB-21)
  const bare = mkdtempSync(join(tmpdir(), 'layout-owned-'));
  writeFileSync(join(bare, 'layout.json'), JSON.stringify({ folders: {}, concepts: {} }));
  assert.equal(buildLayout(bare, []).buildOutput, undefined);
  assert.equal(buildLayout(bare, []).keepWorktrees, undefined);
});

// 0.9.1: a layout key a hook or tool reads, and that the layout builder does not write, must be project-owned (OWNED), or the
// first `update` drops it (0.7.2 dropped buildOutput, 0.9.0 dropped keepWorktrees).
import { readdirSync, readFileSync as readText, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
test('every layout key the kit reads survives an update', () => {
  const kit = fileURLToPath(new URL('..', import.meta.url));
  const files = [];
  const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) { if (f !== 'node_modules' && f !== '.claude') walk(p); } else if (p.endsWith('.mjs')) files.push(p); } };
  walk(join(kit, 'packs')); walk(join(kit, 'lib'));
  const read = new Set();
  for (const f of files) {
    const t = readText(f, 'utf8');
    for (const m of t.matchAll(/\blayout\??\.([a-zA-Z_]+)\b/g)) read.add(m[1]);
    for (const m of t.matchAll(/layout\.json'\), 'utf8'\)\)\.([a-zA-Z_]+)/g)) read.add(m[1]);
  }
  const builder = readText(join(kit, 'lib/layout.mjs'), 'utf8');
  const owned = JSON.parse(builder.match(/const OWNED = (\[[^\]]*\])/)[1].replace(/'/g, '"'));
  const built = ['folders', 'concepts', 'kinds', 'complete', '_comment', 'configuration', 'json', 'mjs'];   // written by the builder (json/mjs: file names; configuration: 0.10.0)
  const lost = [...read].filter((k) => !owned.includes(k) && !built.includes(k));
  assert.deepEqual(lost, [], `layout keys read by the kit but dropped by update: ${lost.join(', ')}`);
});

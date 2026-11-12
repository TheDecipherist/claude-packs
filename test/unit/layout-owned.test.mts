// 0.7.3: every project-owned layout key survives a rebuild of the layout (an update); buildOutput was dropped in 0.7.2.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { OWNED, buildLayout } from '../../lib/layout.mts';
import { scratchDir } from '../../packs/base/hooks/lib/files.mts';

test('an update keeps buildOutput, and adds none where the project set none', () => {
  const dir = scratchDir('layout-owned-');
  writeFileSync(join(dir, 'layout.json'), JSON.stringify({ folders: {}, concepts: {}, buildOutput: ['out/**'], keepWorktrees: ['night'], protected: ['design/**'], writeOnce: ['build/evidence/**'], looks: [{ name: 'home', reference: 'design/reference/home.webp', code: ['src/app/home/**'] }] }));
  const kept = buildLayout(dir, []);
  assert.deepEqual(kept.buildOutput, ['out/**']);
  assert.deepEqual(kept.protected, ['design/**']);
  assert.deepEqual(kept.keepWorktrees, ['night']);   // 0.9.1: build-sweep's kept worktrees survive an update
  assert.deepEqual(kept.writeOnce, ['build/evidence/**']);   // 0.9.8 (KWB-21)
  assert.deepEqual(kept.looks, [{ name: 'home', reference: 'design/reference/home.webp', code: ['src/app/home/**'] }]);   // 1.3.2 (KWB-92): look-gate's pages
  const bare = scratchDir('layout-owned-');
  writeFileSync(join(bare, 'layout.json'), JSON.stringify({ folders: {}, concepts: {} }));
  assert.equal(buildLayout(bare, []).buildOutput, undefined);
  assert.equal(buildLayout(bare, []).keepWorktrees, undefined);
  assert.equal(buildLayout(bare, []).looks, undefined);
  // KWB-136: an empty chart list means no chart can be found; with none set, chart-first takes its default glob
  assert.equal(buildLayout(bare, []).chart, undefined);
});

// 0.9.1: a layout key a hook or tool reads, and that the layout builder does not write, must be project-owned (OWNED), or the
// first `update` drops it (0.7.2 dropped buildOutput, 0.9.0 dropped keepWorktrees).
test('every layout key the kit reads survives an update', () => {
  const kit = fileURLToPath(new URL('../..', import.meta.url));
  const files: string[] = [];
  const walk = (d: string): void => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) { if (f !== 'node_modules' && f !== '.claude') walk(p); } else if (p.endsWith('.mts') && !p.endsWith('.d.mts')) files.push(p);
    }
  };
  walk(join(kit, 'packs')); walk(join(kit, 'lib'));
  const read = new Set<string>();
  for (const f of files) {
    // KWB-193: config-merge reads `layout.own` of a configuration's delta (configurations/<name>/config.json), which is no project's
    // layout.json: a project never holds it, so update has nothing to keep.
    // Only that one key is left out of config-merge (W10 review 7): any other key it reads is still checked.
    const t = readFileSync(f, 'utf8');
    const merging = f.endsWith('/lib/config-merge.mts');
    for (const m of t.matchAll(/\blayout\??\.([a-zA-Z_]+)\b/g)) if (!(merging && m[1] === 'own')) read.add(m[1] ?? '');
    for (const m of t.matchAll(/layout\.json'\), 'utf8'\)\)\.([a-zA-Z_]+)/g)) read.add(m[1] ?? '');
    // KWB-92: a key read straight off the hooks' reader, readLayout(claudeRoot(join(root, 'x'))).looks, two calls deep
    for (const m of t.matchAll(/\breadLayout\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\)\??\.([a-zA-Z_]+)/g)) read.add(m[1] ?? '');
  }
  read.delete('');
  const built = ['folders', 'concepts', 'kinds', 'complete', '_comment', 'configuration', 'json', 'mjs', 'mts'];   // written by the builder (json/mjs/mts: file names; configuration: 0.10.0)
  const lost = [...read].filter((k) => !OWNED.includes(k) && !built.includes(k));
  assert.deepEqual(lost, [], `layout keys read by the kit but dropped by update: ${lost.join(', ')}`);
});

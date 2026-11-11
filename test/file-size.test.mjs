// 0.9.11: a hook file the kit installs past 300 lines is refused by the projects' own line limit (Stellix's pre-commit refused
// 0.9.10's lib/shape.mjs at 301), so every installed .mjs/.py/.sh in the packs fits, and every TypeScript source they are built
// from (W2.7 gate 10), by the kit's own layout.maxFileLines (300 when it names none).
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { readJson } from '../packs/base/hooks/lib/json.mjs';

const KIT = fileURLToPath(new URL('..', import.meta.url));
const LIMIT = readJson(join(KIT, '.claude/layout.json'), {})?.maxFileLines ?? 300;

test('every installed hook, check and tool file fits in the line limit, and every .mts it is built from', () => {
  const over = [];
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(mjs|js|py|sh|mts|cts)$/.test(f) && readFileSync(p, 'utf8').split('\n').length - 1 > LIMIT) over.push(p);
    }
  };
  walk(join(KIT, 'packs'));
  assert.deepEqual(over, []);
});

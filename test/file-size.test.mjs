// 0.9.11: a hook file the kit installs past 300 lines is refused by the projects' own line limit (Stellix's pre-commit refused
// 0.9.10's lib/shape.mjs at 301), so every installed .mjs/.py/.sh in the packs fits.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

test('every installed hook, check and tool file fits in 300 lines', () => {
  const packs = fileURLToPath(new URL('../packs', import.meta.url));
  const over = [];
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(mjs|js|py|sh)$/.test(f) && readFileSync(p, 'utf8').split('\n').length - 1 > 300) over.push(p);
    }
  };
  walk(packs);
  assert.deepEqual(over, []);
});

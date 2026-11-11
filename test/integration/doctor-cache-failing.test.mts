// 0.13.0 (KWB-41): a failing selftest is never remembered, and `doctor --fresh` runs them all. (The cache itself: doctor-cache.test.mts.)
import { assert, join, readFileSync, test, writeFileSync } from '../kit-cli.mts';
import { doctor, install, unchanged } from './doctor-cache-rig.mts';

test('a failing selftest is never remembered, and --fresh runs them all', () => {
  const { dir, cache } = install();
  const hook = join(dir, '.claude/hooks/folder-law.mjs');
  writeFileSync(hook, readFileSync(hook, 'utf8').replace('\n', '\nif (process.argv.includes("--selftest")) process.exit(1);\n'));
  for (let i = 0; i < 2; i += 1) {
    const r = doctor(dir, cache);
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, /folder-law\.mjs fails its selftest/);
  }
  assert.equal(unchanged(doctor(dir, cache, '--fresh').stdout), 0, '--fresh runs every selftest');
});

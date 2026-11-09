// KWB-121: two branches that each ran the look gate on a page they did not change must merge with no conflict in its report.
// The report names the drawing code it judged by a key (`look-gate.mjs --key`), not by the commit it was made at, so on an
// unchanged page both branches write the same bytes.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { test } from 'node:test';
import { git, put, scratchProject } from '../packs/base/hooks/lib/selftest.mjs';

const HOOK = new URL('../packs/base/hooks/look-gate.mjs', import.meta.url).pathname;
const LOOKS = { looks: [{ name: 'home', reference: 'design/reference/home.webp', code: ['src/ui/**'] }] };
const REPORT = 'build/evidence/looks/home.json';

function twoBranches(writeReport) {
  const dir = scratchProject({ 'src/ui/Card.cpp': 'v1\n', 'src/core/Engine.cpp': 'e1\n', 'design/reference/home.webp': 'x' }, LOOKS);
  const commit = (msg) => { git(dir, 'add', '-A'); git(dir, 'commit', '-qm', msg); };
  git(dir, 'init', '-q', '-b', 'main'); commit('base');
  const head = () => spawnSync('git', ['-C', dir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
  const key = () => spawnSync(process.execPath, [HOOK, '--key', 'home'], { cwd: dir, encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: dir } }).stdout.trim();
  for (const name of ['a', 'b']) {
    git(dir, 'switch', '-q', '-c', `work/${name}`, 'main');
    put(join(dir, `src/core/Engine${name}.cpp`), `${name}\n`); // each branch changes only the engine, never the page
    put(join(dir, REPORT), writeReport({ key: key(), head: head() }));
    commit(`${name}: engine change, look gate run on home`);
  }
  git(dir, 'switch', '-q', 'work/a');
  return spawnSync('git', ['-C', dir, 'merge', '--no-edit', 'work/b'], { encoding: 'utf8' });
}

const json = (o) => `${JSON.stringify({ reference: 'design/reference/home.webp', ...o, verdict: 'pass' }, null, 2)}\n`;

test('the look report of an unchanged page does not conflict between two branches (KWB-121)', () => {
  const merged = twoBranches(({ key }) => json({ code: key }));
  assert.equal(merged.status, 0, merged.stdout + merged.stderr);
});

test('a report that names the commit it judged conflicts at every merge, the fault this holds (KWB-121)', () => {
  const merged = twoBranches(({ head }) => json({ commit: head }));
  assert.notEqual(merged.status, 0);
});

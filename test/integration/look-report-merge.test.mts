// KWB-121: two branches that each ran the look gate on a page they did not change must merge with no conflict in its report.
// The report names the drawing code it judged by a key (`look-gate.mjs --key`), not by the commit it was made at, so on an
// unchanged page both branches write the same bytes.
import { fileURLToPath } from 'node:url';
import { assert, join, put, spawnSync, test } from '../kit-cli.mts';
import type { Spawned } from '../kit-cli.mts';
import { gitOut } from '../../packs/base/hooks/lib/git-run.mts';
import { git, scratchProject } from '../../packs/base/hooks/lib/selftest.mts';

const HOOK = fileURLToPath(new URL('../../packs/base/hooks/look-gate.mjs', import.meta.url));
const LOOKS = { looks: [{ name: 'home', reference: 'design/reference/home.webp', code: ['src/ui/**'] }] };
const REPORT = 'build/evidence/looks/home.json';

interface Marks { key: string; head: string }

function twoBranches(writeReport: (marks: Marks) => string): Spawned {
  const dir = scratchProject({ 'src/ui/Card.cpp': 'v1\n', 'src/core/Engine.cpp': 'e1\n', 'design/reference/home.webp': 'x' }, LOOKS);
  const commit = (msg: string): void => { git(dir, 'add', '-A'); git(dir, 'commit', '-qm', msg); };
  git(dir, 'init', '-q', '-b', 'main'); commit('base');
  const head = (): string => gitOut(['rev-parse', 'HEAD'], { cwd: dir, env: process.env }) ?? '';
  const key = (): string => spawnSync(process.execPath, [HOOK, '--key', 'home'], { cwd: dir, encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: dir } }).stdout.trim();
  for (const name of ['a', 'b']) {
    git(dir, 'switch', '-q', '-c', `work/${name}`, 'main');
    put(join(dir, `src/core/Engine${name}.cpp`), `${name}\n`); // each branch changes only the engine, never the page
    commit(`${name}: engine change`);
    put(join(dir, REPORT), writeReport({ key: key(), head: head() }));
    commit(`${name}: look gate run on home`);
  }
  git(dir, 'switch', '-q', 'work/a');
  return spawnSync('git', ['-C', dir, 'merge', '--no-edit', 'work/b'], { encoding: 'utf8' });
}

const json = (o: Record<string, string>): string => `${JSON.stringify({ reference: 'design/reference/home.webp', ...o, verdict: 'pass' }, null, 2)}\n`;

test('the look report of an unchanged page does not conflict between two branches (KWB-121)', () => {
  const merged = twoBranches(({ key }) => json({ code: key }));
  assert.equal(merged.status, 0, merged.stdout + merged.stderr);
});

test('a report that names the commit it judged conflicts at every merge, the fault this holds (KWB-121)', () => {
  const merged = twoBranches(({ head }) => json({ commit: head }));
  assert.notEqual(merged.status, 0);
});

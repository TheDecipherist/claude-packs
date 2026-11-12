// 0.13.0 (KWB-41): `sync` takes 0.1 s and doctor 7.4 s, all of it hooks proving a law they already proved. A selftest that passed is
// not run again while the hook, its libs, node and the project's guards are the same; a changed hook is proved again; a failure is
// never remembered (doctor-cache-failing.test.mts); `doctor --fresh` runs them all.
import { CLI, appendFileSync, assert, join, spawnSync, test } from '../kit-cli.mts';
import { fixture } from '../fixtures/installs.mts';
import { doctor, install, unchanged } from './doctor-cache-rig.mts';
import { readdirSync } from 'node:fs';
import { importsOf } from '../../lib/selftest-cache.mts';

/** A lib of the install that some of its hooks import, the runner does not, and not every hook does. */
function libSomeHooksImport(dir: string): string {
  const hooks = join(dir, '.claude/hooks');
  const runner = new Set(importsOf(join(hooks, 'run-hooks.mjs')));
  const sets = readdirSync(hooks).filter((f) => f.endsWith('.mjs') && f !== 'run-hooks.mjs').map((f) => new Set(importsOf(join(hooks, f))));
  const libs = [...new Set(sets.flatMap((s) => [...s]))].filter((l) => !runner.has(l) && l.includes('/lib/'));
  const found = libs.find((l) => sets.some((s) => !s.has(l)));
  if (found === undefined) throw new Error(`no lib some hooks import and the runner does not, in ${hooks}`);
  return found;
}

test('a second doctor runs no selftest whose hook has not changed, and a changed hook is proved again', () => {
  const { dir, cache } = install();
  const second = doctor(dir, cache);
  assert.equal(second.status, 0, second.stdout);
  const all = unchanged(second.stdout);
  assert.ok(all > 5, `unchanged hooks are not run again: ${second.stdout}`);
  appendFileSync(join(dir, '.claude/hooks/folder-law.mjs'), '\n// changed\n');
  assert.equal(unchanged(doctor(dir, cache).stdout), all - 1, 'the changed hook runs again, the others do not');
  assert.equal(unchanged(doctor(dir, cache).stdout), all, 'and once it passed, it is remembered too');
  // d-7: a lib some hooks import reruns those hooks, not all of them; the lib is read from the install's own imports, since which
  // libs the runner reaches moves with the runner (glob.mjs joined its imports at W8.1 and stopped being an example, KWB-199)
  const lib = libSomeHooksImport(dir);
  appendFileSync(lib, '\n// changed\n');
  const afterLib = unchanged(doctor(dir, cache).stdout);
  assert.ok(afterLib < all && afterLib > 0, `${lib}, a lib some hooks import, changed: those are proved again, not every hook (${afterLib} of ${all} unchanged)`);
  // a lib the runner imports is what every selftest runs on (KWB-193)
  appendFileSync(join(dir, '.claude/hooks/lib/json.mjs'), '\n// changed\n');
  assert.equal(unchanged(doctor(dir, cache).stdout), 0, 'a lib the runner imports changed: every hook is proved again');
});

test('under the kit\'s default test env doctor takes every selftest as proved by the gate and runs none', () => {
  const dir = fixture('base');
  const r = spawnSync('node', [CLI, 'doctor', '--dir', dir], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout);
  assert.equal(process.env.CLAUDE_PACKS_SELFTESTS, 'gate', 'the test run is under the gate');
  assert.match(r.stdout, /taken as proved by the gate/);
});

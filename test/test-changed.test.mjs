// 0.9.0, Tim: "the kit's test suite should only test things that have changed?" `npm run test:changed` maps the files changed since
// the base (git diff plus untracked) to the tests that cover them (imports, names, the packs table), always with the fresh-tmp
// preload, and says the full `npm test` is the release gate.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { choose, graph } from '../scripts/test-changed.mjs';

const SCRIPT = fileURLToPath(new URL('../scripts/test-changed.mjs', import.meta.url));
const KIT = fileURLToPath(new URL('..', import.meta.url));
const git = (cwd, ...a) => execFileSync('git', ['-c', 'user.email=t@local', '-c', 'user.name=t', ...a], { cwd, stdio: 'pipe' });

function scratchRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'cps-changed-'));
  mkdirSync(join(dir, 'lib'));
  mkdirSync(join(dir, 'test'));
  copyFileSync(join(KIT, 'test/fresh-tmp.mjs'), join(dir, 'test/fresh-tmp.mjs'));
  writeFileSync(join(dir, 'lib/a.mjs'), 'export const a = 1;\n');
  writeFileSync(join(dir, 'lib/b.mjs'), 'export const b = 2;\n');
  writeFileSync(join(dir, 'lib/via.mjs'), "export { a } from './a.mjs';\n");
  writeFileSync(join(dir, 'test/a.test.mjs'), "import { test } from 'node:test'; import { a } from '../lib/via.mjs'; test('a', () => { if (a !== 1) throw new Error('a'); });\n");
  // b's test fails whenever it runs: it must run only when b changed.
  writeFileSync(join(dir, 'test/b.test.mjs'), "import { test } from 'node:test'; import '../lib/b.mjs'; test('b', () => { throw new Error('b ran'); });\n");
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'add', 'lib', 'test');
  git(dir, 'commit', '-q', '-m', 'start');
  return dir;
}

test('a planted change runs only the tests that reach it, an untracked test runs, the release gate is named', () => {
  const dir = scratchRepo();
  writeFileSync(join(dir, 'lib/a.mjs'), 'export const a = 1; // planted change\n');
  writeFileSync(join(dir, 'test/c.test.mjs'), "import { test } from 'node:test'; test('c', () => {});\n");
  const r = spawnSync('node', [SCRIPT, '--root', dir], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /chose 2 of 3 test files/);
  assert.match(r.stdout, /test\/a\.test\.mjs\n {4}reaches lib\/a\.mjs through lib\/via\.mjs/);
  assert.match(r.stdout, /test\/c\.test\.mjs\n {4}changed/);
  assert.doesNotMatch(r.stdout, /b\.test\.mjs/);
  assert.match(r.stdout, /running: node --import \.\/test\/fresh-tmp\.mjs --test /);
  assert.match(r.stdout, /The release gate is the full `npm test`/);
});

test('a change the failing test covers runs it, and the run fails; --dry-run only prints', () => {
  const dir = scratchRepo();
  writeFileSync(join(dir, 'lib/b.mjs'), 'export const b = 3;\n');
  assert.notEqual(spawnSync('node', [SCRIPT, '--root', dir], { encoding: 'utf8' }).status, 0);
  const dry = spawnSync('node', [SCRIPT, '--root', dir, '--dry-run'], { encoding: 'utf8' });
  assert.equal(dry.status, 0);
  assert.match(dry.stdout, /test\/b\.test\.mjs\n {4}reaches lib\/b\.mjs/);
  assert.doesNotMatch(dry.stdout, /running:/);
  git(dir, 'commit', '-q', '-am', 'b');
  // committed on main: nothing differs from the base (HEAD), so nothing runs
  assert.match(spawnSync('node', [SCRIPT, '--root', dir], { encoding: 'utf8' }).stdout, /chose 0 of 2/);
});

test('the kit\'s own map: imports, names, the packs table, the preload', () => {
  const g = graph(KIT);
  const pick = (...changed) => [...choose(KIT, changed, g).chosen.keys()];
  const sym = pick('packs/base/tools/shape-symmetry.mjs');
  assert.ok(sym.includes('test/symmetry.test.mjs'));
  const rule = pick('packs/base/rules/instances-by-index-identities-by-id.md');
  assert.ok(rule.includes('test/install.test.mjs') && rule.includes('test/worktrees.test.mjs'), 'a pack file: the tests that install packs (the table)');
  assert.ok(!rule.includes('test/kit-lock.test.mjs') && !rule.includes('test/frame-bench.test.mjs'));
  assert.ok(!sym.includes('test/kit-lock.test.mjs') && !sym.includes('test/frame-bench.test.mjs'));
  assert.deepEqual(pick('packs/gpu-painter/skills/gpu-frame-bench/SKILL.md').includes('test/frame-bench.test.mjs'), true);
  const lock = pick('.claude/hooks/kit-lock.mjs');
  assert.ok(lock.includes('test/kit-lock.test.mjs') && !lock.includes('test/install.test.mjs'), lock.join(' '));
  assert.ok(pick('lib/sync.mjs').includes('test/new.test.mjs'), 'lib/ reaches every test that runs the CLI');
  assert.deepEqual(pick('scripts/test-changed.mjs'), ['test/test-changed.test.mjs']);
  assert.equal(pick('test/fresh-tmp.mjs').length, choose(KIT, [], g).tests.length, 'the preload: every test');
  assert.deepEqual(choose(KIT, ['CHANGELOG.md'], g).uncovered, ['CHANGELOG.md']);
});

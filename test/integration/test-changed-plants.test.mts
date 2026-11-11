// W6 (d-7): the picker's plants, each seen red before its fix. A fault planted in a hook lib turns the picked set red; a changed
// transitive import of a hook misses the selftest cache; a change under docs/ picks the repo lint (KWB-131); and the path function
// puts a hook change on its own test, its split parts, its selftest and noop, and nothing else.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { importsOf, proved, remember, selftestKey, sharedHash } from '../../lib/selftest-cache.mts';
import { choose, graph } from '../../scripts/test-changed.mts';
import { pathTests } from '../../scripts/test-changed-paths.mts';
import { git } from '../kit-cli.mts';

const SCRIPT = fileURLToPath(new URL('../../scripts/test-changed.mjs', import.meta.url));
const KIT = fileURLToPath(new URL('../..', import.meta.url));
const FRESH_TMP = join(KIT, 'test/fresh-tmp.mts');

const write = (dir: string, rel: string, text: string): void => {
  mkdirSync(dirname(join(dir, rel)), { recursive: true });
  writeFileSync(join(dir, rel), text);
};

/** A repo of one hook, the lib it imports, and its test: the test spawns the hook by a path it builds, so only the tier's path
 *  (test/hooks/base/h) says it covers the lib. */
function hookRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'cps-plant-'));
  cpSync(FRESH_TMP, join(dir, 'test/fresh-tmp.mts'));
  write(dir, 'packs/base/hooks/lib/m.mjs', 'export const ok = true;\n');
  write(dir, 'packs/base/hooks/h.mjs', "import { ok } from './lib/m.mjs';\nif (process.argv.includes('--selftest')) process.exit(0);\nprocess.exit(ok ? 0 : 1);\n");
  write(dir, 'test/hooks/base/h.test.mjs',
    "import { spawnSync } from 'node:child_process';\nimport { join } from 'node:path';\nimport { test } from 'node:test';\n"
    + "const hook = join(import.meta.dirname, '../../..', 'packs/base/hooks', ['h', 'mjs'].join('.'));\n"
    + "test('the hook passes', () => { if (spawnSync(process.execPath, [hook]).status !== 0) throw new Error('hook failed'); });\n");
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'add', 'packs', 'test');
  git(dir, 'commit', '-q', '-m', 'start');
  return dir;
}

test('a fault planted in a hook lib turns the picked set red, through the hook test of the tier (d-7)', () => {
  const dir = hookRepo();
  write(dir, 'packs/base/hooks/lib/m.mjs', 'export const ok = false;\n');
  const dry = spawnSync(process.execPath, [SCRIPT, '--dry-run', '--base', 'HEAD', '--root', dir], { encoding: 'utf8' });
  assert.match(dry.stdout, /test\/hooks\/base\/h\.test\.mjs\n {4}path: hook h imports packs\/base\/hooks\/lib\/m\.mjs/, dry.stdout);
  const r = spawnSync(process.execPath, [SCRIPT, '--base', 'HEAD', '--root', dir], { encoding: 'utf8' });
  assert.notEqual(r.status, 0, 'the planted fault is red\n' + r.stdout + r.stderr);
  assert.match(r.stdout + r.stderr, /hook failed/);
});

test('a changed transitive import of a hook misses the selftest cache, and a lib it does not import leaves the key alone', () => {
  const claude = join(mkdtempSync(join(tmpdir(), 'cps-cache-')), '.claude');
  cpSync(join(KIT, 'packs/base/hooks'), join(claude, 'hooks'), { recursive: true });
  const env = { CLAUDE_PACKS_SELFTEST_CACHE: join(dirname(claude), 'memory') };
  const hook = join(claude, 'hooks/no-find.mjs');
  const imported = importsOf(hook).filter((f) => f !== hook);
  assert.ok(imported.length > 1, 'no-find reaches more than one lib');
  const outside = join(claude, 'hooks/lib', readdirSync(join(claude, 'hooks/lib')).find((n) => !imported.includes(join(claude, 'hooks/lib', n)) && n.endsWith('.mjs')) ?? '');
  const readText = (f: string): string => readFileSync(f, 'utf8');
  const key = (): string => selftestKey(hook, sharedHash(claude, {}, env));
  remember(key(), env);
  assert.equal(proved(key(), env), true);
  const deepest = imported[imported.length - 1] ?? '';
  writeFileSync(outside, `${readText(outside)}\n// a lib this hook never imports\n`);
  assert.equal(proved(key(), env), true, 'a lib the hook does not import keeps the memory');
  writeFileSync(deepest, `${readText(deepest)}\n// a changed transitive import\n`);
  assert.equal(proved(key(), env), false, `${basename(deepest)} is an import of no-find, and it counts`);
});

test('a change under docs/ picks the repo lint (KWB-131)', () => {
  const picked = [...choose(KIT, ['docs/versions.md'], graph(KIT)).chosen.keys()];
  assert.ok(picked.includes('test/repo-lint.test.mts'), picked.join(' '));
});

test('a change to a document at the root picks the repo lint, which reads each of them (KWB-190)', () => {
  for (const doc of ['README.md', 'CLAUDE.md', 'CHANGELOG.md']) {
    const picked = [...choose(KIT, [doc], graph(KIT)).chosen.keys()];
    assert.ok(picked.includes('test/repo-lint.test.mts'), `${doc}: ${picked.join(' ')}`);
  }
});

test('a hook change picks its own test and split parts, and the noop test: nothing else besides its selftest', () => {
  const g = graph(KIT);
  const picked = [...choose(KIT, ['packs/base/hooks/git-guard.mts'], g, { 'packs/base/hooks/git-guard.mts': 'M' }, { 'packs/base/hooks/git-guard.mts': new Set(['hook']) }).chosen.keys()];
  assert.deepEqual(picked.sort(), ['test/hooks/base/git-guard.test.mts', 'test/integration/noop.test.mts']);
});

test('the path function: a lib, a hook lib, a tool and the integration helpers each reach their own tier', () => {
  const files = [
    'test/unit/lib/layout.test.mts', 'test/unit/lib/layout-owned.test.mts', 'test/unit/hooks-lib/json.test.mts', 'test/hooks/base/h.test.mts', 'test/hooks/base/h-parts.test.mts',
    'test/hooks/base/other.test.mts', 'test/tools/base/t.test.mts', 'test/integration/noop.test.mts', 'test/integration/install.test.mts',
    'packs/base/hooks/lib/json.mts', 'packs/base/hooks/h.mts', 'packs/base/pack.json',
  ];
  const names = (changed: string, reach: ReadonlySet<string> = new Set()): string[] => pathTests(KIT, changed, files, () => reach).map(([t]) => t).sort();
  assert.deepEqual(names('lib/layout.mts'), ['test/unit/lib/layout-owned.test.mts', 'test/unit/lib/layout.test.mts']);
  assert.deepEqual(names('packs/base/hooks/h.mts'), ['test/hooks/base/h-parts.test.mts', 'test/hooks/base/h.test.mts']);
  assert.deepEqual(names('packs/base/hooks/lib/json.mts', new Set(['packs/base/hooks/h.mts'])),
    ['test/hooks/base/h-parts.test.mts', 'test/hooks/base/h.test.mts', 'test/unit/hooks-lib/json.test.mts']);
  assert.deepEqual(names('packs/base/tools/t.mts'), ['test/tools/base/t.test.mts']);
  assert.deepEqual(names('test/kit-cli.mts'), ['test/integration/install.test.mts', 'test/integration/noop.test.mts']);
  assert.deepEqual(names('test/fixtures/installs.mts'), ['test/integration/install.test.mts', 'test/integration/noop.test.mts']);
});

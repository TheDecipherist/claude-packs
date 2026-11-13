// 0.9.0, The owner: "the kit's test suite should only test things that have changed?" `npm run test:changed` maps the files changed since
// the base (git diff plus untracked) to the tests that cover them (imports, names, the packs table), always with the fresh-tmp
// preload, and says that against the trunk it is the gate, and the full `npm test` runs only when the user asks.
// The kit's own map is read by a test's name, not its tier folder, so a test moving between tiers never turns this one red.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { cpus, tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { coreBudget } from '../../packs/base/hooks/lib/core-budget.mts';
import { choose, graph } from '../../scripts/test-changed.mts';
import { git } from '../kit-cli.mts';

const SCRIPT = fileURLToPath(new URL('../../scripts/test-changed.mjs', import.meta.url));
const KIT = fileURLToPath(new URL('../..', import.meta.url));

function scratchRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'cps-changed-'));
  mkdirSync(join(dir, 'lib'));
  mkdirSync(join(dir, 'test'));
  copyFileSync(join(KIT, 'test/fresh-tmp.mts'), join(dir, 'test/fresh-tmp.mts'));
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

/** The tests the kit's own map chooses for these changed files, by name: `noop` for test/integration/noop.test.mts. */
const g = graph(KIT);
const pick = (...changed: string[]): string[] => [...choose(KIT, changed, g).chosen.keys()].map((t) => basename(t).replace(/\.test\.m[jt]s$/, ''));
const added = (file: string): string[] => [...choose(KIT, [file], g, { [file]: 'A' }).chosen.keys()].map((t) => basename(t).replace(/\.test\.m[jt]s$/, ''));

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
  assert.match(r.stdout, /running: node --import \.\/test\/fresh-tmp\.mts --test /);
  assert.match(r.stdout, /With --base origin\/<trunk> this is the gate before landing and before a release; the full `npm test` runs only when the user asks/);
});

// 5d2e436: a session set BUILDQ_CORES=16 for builds and the gate ran every test file at once (load 20 to 25). The tests take a
// third of the cores whatever the build queue's number says.
test('a planted BUILDQ_CORES=16 does not raise the tests past a third of the cores', () => {
  const dir = scratchRepo();
  writeFileSync(join(dir, 'lib/a.mjs'), 'export const a = 1; // planted change\n');
  const r = spawnSync('node', [SCRIPT, '--root', dir], { encoding: 'utf8', env: { ...process.env, BUILDQ_CORES: '16', CLAUDE_PACKS_TEST_CORES: '' } });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const third = coreBudget({}, {});
  assert.match(r.stdout, new RegExp(`--test-concurrency=${third}\\b`));
  if (cpus().length === 18) assert.equal(third, 6);
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
  const sym = pick('packs/base/tools/shape-symmetry.mjs');
  assert.ok(sym.includes('symmetry') || sym.includes('shape-symmetry'), sym.join(' '));
  // W2.6: a TypeScript source picks the test that imports it, and the tests of the .mjs that import its emitted file
  const ts = pick('packs/base/hooks/lib/source-exts.mts');
  assert.ok(ts.includes('source-exts'), ts.join(' '));
  assert.ok(pick('packs/base/hooks/lib/files.mts').includes('packs'), 'through lib/packs.mjs importing files.mjs');
  // KWB-131: a change under docs/ reaches the test that reads every file the repo keeps
  assert.ok(pick('docs/versions.md').some((t) => t === 'no-personal-name' || t === 'repo-lint'));
  // KWB-166: a pack file's content picks noop (every changed installed file listed) and what names it, never every install
  const rule = pick('packs/base/rules/instances-by-index-identities-by-id.md');
  assert.ok(rule.includes('noop') && !rule.includes('install') && !rule.includes('worktrees'), rule.join(' '));
  assert.ok(!rule.includes('kit-lock') && !rule.includes('frame-bench'));
  // 1.3.0: a new rule changed the counts on the README and the page, and a changed-only run missed the page's test
  const counted = added('packs/reverse-engineering/rules/circuits-through-the-skill.md');
  assert.ok(counted.includes('counts'), `a rule ADDED changes the counts on the front pages, which counts --check holds (d-8): ${counted.join(' ')}`);
  assert.ok(!pick('packs/reverse-engineering/rules/circuits-through-the-skill.md').includes('site'), 'an edited one does not');
  assert.ok(added('packs/base/hooks/no-find.mjs').includes('worktrees'), 'a hook added needs its worktree case');
  assert.ok(!sym.includes('kit-lock') && !sym.includes('frame-bench'));
  assert.ok(pick('packs/gpu-painter/skills/gpu-frame-bench/SKILL.md').some((t) => t === 'frame-bench' || t === 'repo-lint'));
  const lock = pick('.claude/hooks/kit-lock.mjs');
  assert.ok(lock.includes('kit-lock') && !lock.includes('install'), lock.join(' '));
  const doctor = pick('lib/doctor.mts');
  assert.ok(doctor.some((t) => t.startsWith('doctor')) && !doctor.includes('install'), `a CLI module: the tests about it, not every test that runs the CLI: ${doctor.join(' ')}`);
  assert.deepEqual(pick('scripts/test-changed.mjs').sort(), ['test-changed', 'test-changed-plants']);
  // W6 (d-7): the preload reaches its own test and the integration tier (what builds on it), never the unit or hook tiers
  const preload = [...choose(KIT, ['test/fresh-tmp.mts'], g).chosen.keys()];
  assert.ok(preload.includes('test/unit/fresh-tmp.test.mts'), 'the preload: its own test');
  assert.deepEqual(preload.filter((t) => !t.startsWith('test/integration/') && !/^test\/(?:unit\/fresh-tmp|repo-lint-suite)\.test\.mts$/.test(t)), [], 'the preload: no test outside the integration tier, its own and the repo lint');
  // KWB-190: the repo lint reads every file the repo keeps, the CHANGELOG with them, so a change to it is covered
  assert.deepEqual(choose(KIT, ['CHANGELOG.md'], g).uncovered, []);
  // KWB-next (the audit run): a pack's rule, skill or check picks the conformance gate that reads every one of them
  assert.ok(pick('packs/reverse-engineering/rules/two-sources-before-naming.md').includes('pack-content'), 'a rule: the pack-content gate');
  assert.ok(pick('packs/reverse-engineering/skills/names-first/SKILL.md').includes('pack-content'), 'a skill: the pack-content gate');
  // KWB-141: the planner test reads every planner file through join(KIT, 'planner'), which no import or path literal shows
  assert.ok(pick('planner/ui-mockup/SKILL.md').includes('planner'), 'a planner skill: the planner test');
});

test('a pack that is not base: an edit picks what checks it, an added file the counts (KWB-41, KWB-166)', () => {
  const all = choose(KIT, [], g).tests.length;
  // KWB-166: an edited rule of a pack noop does not install is checked by what names it; a test that installs nginx through a
  // preset uses the rule and does not check it. A rule added changes the counts.
  const nginx = pick('packs/nginx/rules/nginx-production.md');
  assert.ok(!nginx.includes('lookup') && !nginx.includes('configurations'), nginx.join(' '));
  assert.ok(!nginx.includes('install') && !nginx.includes('noop'), nginx.join(' '));
  assert.ok(added('packs/nginx/rules/nginx-production.md').includes('counts'), 'added: the counts, which counts --check holds (d-8)');
  // the rule, not a count (a count moves with every test that is moved or added): an edit picks some tests, never every one
  assert.ok(nginx.length > 0 && nginx.length < all, `${nginx.length} of ${all}`);  const synth = pick('packs/synth-creator/rules/debug-by-measurement.md');
  assert.ok(synth.includes('noop') && !synth.includes('install'), 'noop installs the synth-creator pack; no install test checks the rule');
  const base = pick('packs/base/rules/skill-writing.md');
  assert.ok(base.length > 0 && base.length < all && !base.includes('install'), 'base: what checks the file, not every test that installs (KWB-166)');
});

test('a version bump alone chooses no test; any other package.json change still chooses them all (KWB-41)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tc-ver-'));
  mkdirSync(join(dir, 'test'));
  writeFileSync(join(dir, 'test/a.test.mjs'), "import { test } from 'node:test'; test('a', () => {});\n");
  writeFileSync(join(dir, 'package.json'), '{\n  "name": "x",\n  "version": "1.0.0",\n  "license": "MIT"\n}\n');
  git(dir, 'init', '-q');
  git(dir, 'add', 'test', 'package.json');
  git(dir, 'commit', '-qm', 'x');
  const dry = (): string => spawnSync('node', [SCRIPT, '--root', dir, '--base', 'HEAD', '--dry-run'], { encoding: 'utf8' }).stdout;
  writeFileSync(join(dir, 'package.json'), '{\n  "name": "x",\n  "version": "1.0.1",\n  "license": "MIT"\n}\n');
  assert.match(dry(), /chose 0 of/);
  assert.match(dry(), /version bump only: package\.json/);
  writeFileSync(join(dir, 'package.json'), '{\n  "name": "x",\n  "version": "1.0.1",\n  "license": "ISC"\n}\n');
  assert.doesNotMatch(dry(), /version bump only/);
});

// KWB-166: a JS module picks the tests that call or import a function the diff touched, never every importer of the module
test('a changed function picks the tests that use it; a change to imports or comments only picks none', () => {
  const dir = scratchRepo();
  writeFileSync(join(dir, 'lib/two.mjs'), 'export function one() { return 1; }\n\nexport function two() { return 2; }\n');
  writeFileSync(join(dir, 'test/one.test.mjs'), "import { test } from 'node:test'; import { one } from '../lib/two.mjs'; test('one', () => { if (one() !== 1) throw new Error('one'); });\n");
  writeFileSync(join(dir, 'test/two.test.mjs'), "import { test } from 'node:test'; import { two } from '../lib/two.mjs'; test('two', () => { if (two() !== 2) throw new Error('two'); });\n");
  git(dir, 'add', 'lib', 'test');
  git(dir, 'commit', '-q', '-m', 'two');
  writeFileSync(join(dir, 'lib/two.mjs'), 'export function one() { return 1; }\n\nexport function two(scale = 1) { return 2 * scale; }\n');
  const r = spawnSync(process.execPath, [SCRIPT, '--dry-run', '--base', 'HEAD', '--root', dir], { encoding: 'utf8' });
  assert.match(r.stdout, /test\/two\.test\.mjs/, r.stdout);
  assert.doesNotMatch(r.stdout, /test\/one\.test\.mjs/, 'a test of the function that did not change is not picked');
  writeFileSync(join(dir, 'lib/two.mjs'), '// a header comment\nexport function one() { return 1; }\n\nexport function two() { return 2; }\n');
  const c = spawnSync(process.execPath, [SCRIPT, '--dry-run', '--base', 'HEAD', '--root', dir], { encoding: 'utf8' });
  assert.match(c.stdout, /chose 0 of/, c.stdout);
});

// W9, KWB-166: a folder a helper builds a path from (hook-rig's `new URL('../../packs', ...)`) reaches the modules under it and no data, so
// the regenerated manifest and README of a one-hook change pick the tests that hold them, not the ninety that run a hook.
test('a regenerated manifest picks the tests that read it, never every hook test through a folder a helper names (W9)', () => {
  const manifest = pick('packs/manifest-2.0.0.json');
  assert.ok(manifest.includes('noop'), manifest.join(' '));
  assert.ok(!manifest.includes('no-find') && !manifest.includes('git-guard') && manifest.length < 15, `${manifest.length} tests: ${manifest.join(' ')}`);
  const rule = pick('packs/base/rules/agents-held.md');
  assert.ok(rule.includes('noop') && !rule.includes('git-guard') && rule.length < 15, `${rule.length} tests: ${rule.join(' ')}`);
});

// KWB-169: the gate proves a changed hook's selftest in a temp folder, where no node_modules lies above it; jscpd (once-only's
// detector) must be the kit's own, or every gate that touches once-only or making-check is refused before a test runs.
test('the gate proves once-only in its temp folder with the kit\'s jscpd, with no CLAUDE_PACKS_JSCPD set (KWB-169)', () => {
  const env = { ...process.env };
  delete env.CLAUDE_PACKS_JSCPD;
  const prove = `import { proveHooks } from '${pathToFileURL(SCRIPT).href}';
const [r] = await proveHooks(process.argv[1], ['packs/base/hooks/once-only.mjs'], 1);
console.log(r.code, r.out.split('\\n').pop());`;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', prove, KIT], { cwd: tmpdir(), env, encoding: 'utf8' });
  assert.match(r.stdout, /^0 once-only selftest: OK/, r.stdout + r.stderr);
});

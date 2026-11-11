// 0.9.0, the shape law, item 5: the generated gate shape_symmetry. From design/shape.json, one test per many concept, generated at
// configure time (CMake add_test lines, or plain lines for other build systems): every instance has the same members, every pair
// swaps the same. Red on a planted missing member and a planted swap difference. It replaces the engine-scoped swap check (KWB-1).
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../bin/claude-packs.mjs', import.meta.url));
const TOOL = fileURLToPath(new URL('../packs/base/tools/shape-symmetry.mjs', import.meta.url));
const NODE = JSON.stringify(process.execPath);

// A fake project: its members and swap commands are what a synth's probe would be; the env plants the faults.
const FAKE = `const [what, i, j] = process.argv.slice(2);
if (what === 'members') for (const m of ['p.gain', 'p.cutoff', 'fx.reverb', 'fx.delay']) { if (!(m === 'fx.delay' && process.env.PLANT_MISSING === i)) console.log(m); }
else process.exit(process.env.PLANT_SWAP === i + ',' + j ? 1 : 0);
`;
function fakeProject(concepts) {
  const dir = mkdtempSync(join(tmpdir(), 'cps-sym-'));
  mkdirSync(join(dir, 'design'));
  writeFileSync(join(dir, 'design/shape.json'), JSON.stringify({ concepts }));
  writeFileSync(join(dir, 'fake.mjs'), FAKE);
  return dir;
}
const SYM = { members: `${NODE} fake.mjs members {i}`, swap: `${NODE} fake.mjs swap {i} {j}` };
const cli = (dir, args, env = {}) => spawnSync('node', [CLI, 'symmetry', ...args, '--dir', dir], { encoding: 'utf8', env: { ...process.env, ...env } });

test('symmetry run: green on identical instances, every pair printed (6 for N = 4)', () => {
  const dir = fakeProject({ slot: { shape: 'many', count: 4, symmetry: SYM } });
  const r = cli(dir, ['run', 'slot']);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  for (const pair of ['0<->1', '0<->2', '0<->3', '1<->2', '1<->3', '2<->3']) assert.match(r.stdout, new RegExp(`swap ${pair}: same`));
  assert.match(r.stdout, /6 pairs checked/);
});

test('symmetry run: a planted missing member is red and named by instance', () => {
  const dir = fakeProject({ slot: { shape: 'many', count: 4, symmetry: SYM } });
  const r = cli(dir, ['run', 'slot'], { PLANT_MISSING: '3' });
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /instance 0 has fx\.delay that instance 3 lacks/);
});

test('symmetry run: a planted swap difference is red, the pair named, every other pair still checked', () => {
  const dir = fakeProject({ voice: { shape: 'many', count: 4, symmetry: SYM } });
  const r = cli(dir, ['run', 'voice'], { PLANT_SWAP: '0,2' });
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /swap 0<->2: DIFFERS/);
  assert.match(r.stdout, /6 pairs checked .* 1 differ/);
});

test('a many concept with no symmetry block gets a test that is red until it has one; a one concept gets none', () => {
  const dir = fakeProject({ lane: { shape: 'many', count: 3 }, mixer: { shape: 'one', id: 'mixer' } });
  const r = cli(dir, ['run', 'lane']);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /no symmetry block/);
  const list = cli(dir, ['gen', '--list']);
  assert.equal(list.status, 0, list.stderr);
  assert.deepEqual(list.stdout.trim().split('\n').map((l) => l.split('\t')[0]), ['shape_symmetry.lane']);
});

test('symmetry gen --cmake: add_test per many concept, the manifest a configure dependency; no manifest is an error', () => {
  const dir = fakeProject({ slot: { shape: 'many', count: 4, symmetry: SYM }, band: { shape: 'many', count: 8, symmetry: SYM }, mixer: { shape: 'one', id: 'mixer' } });
  const out = join(dir, 'out', 'shape_symmetry.cmake');
  assert.equal(cli(dir, ['gen', '--cmake', out]).status, 0);
  const text = readFileSync(out, 'utf8');
  assert.match(text, /^add_test\(NAME shape_symmetry\.slot COMMAND .* "run" "slot" "--dir" /m);
  assert.match(text, /^add_test\(NAME shape_symmetry\.band /m);
  assert.doesNotMatch(text, /mixer/);
  assert.match(text, /CMAKE_CONFIGURE_DEPENDS .*design\/shape\.json/);
  const none = mkdtempSync(join(tmpdir(), 'cps-sym-none-'));
  const r = cli(none, ['gen', '--list']);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /no design\/shape\.json/);
});

test('the selftest plants a missing member and a swap difference and sees both red', () => {
  const r = spawnSync('node', [TOOL, '--selftest'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /shape-symmetry selftest: OK/);
});

const hasCmake = spawnSync('cmake', ['--version']).status === 0;
test('configure time, for real: CMake generates the tests from the manifest, ctest runs them, red on a plant', { skip: !hasCmake && 'no cmake' }, () => {
  const dir = fakeProject({ slot: { shape: 'many', count: 4, symmetry: SYM } });
  writeFileSync(join(dir, 'CMakeLists.txt'), `cmake_minimum_required(VERSION 3.20)
project(fake NONE)
enable_testing()
execute_process(COMMAND ${NODE} "${TOOL}" gen --dir \${CMAKE_SOURCE_DIR} --cmake \${CMAKE_BINARY_DIR}/shape_symmetry.cmake COMMAND_ERROR_IS_FATAL ANY)
include(\${CMAKE_BINARY_DIR}/shape_symmetry.cmake)
`);
  execFileSync('cmake', ['-S', dir, '-B', join(dir, 'out')], { stdio: 'pipe' });
  const ctest = (env = {}) => spawnSync('ctest', ['--test-dir', join(dir, 'out'), '--output-on-failure', '-R', 'shape_symmetry'], { encoding: 'utf8', env: { ...process.env, ...env } });
  const green = ctest();
  assert.equal(green.status, 0, green.stdout);
  assert.match(green.stdout, /shape_symmetry\.slot .*Passed/);
  const red = ctest({ PLANT_MISSING: '1' });
  assert.notEqual(red.status, 0, red.stdout);
  assert.match(red.stdout, /instance 0 has fx\.delay that instance 1 lacks/);
  // A new many concept in the manifest: the next build re-runs configure and its test appears, nobody writes it.
  writeFileSync(join(dir, 'design/shape.json'), JSON.stringify({ concepts: { slot: { shape: 'many', count: 4, symmetry: SYM }, lane: { shape: 'many', count: 2, symmetry: SYM } } }));
  execFileSync('cmake', ['--build', join(dir, 'out')], { stdio: 'pipe' });
  assert.match(execFileSync('ctest', ['--test-dir', join(dir, 'out'), '-N'], { encoding: 'utf8' }), /shape_symmetry\.lane/);
});

test('the skill points at shape_symmetry, the rule takes its scope from shape.json, init installs the tool and doctor proves it', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cps-sym-init-'));
  mkdirSync(join(dir, '.git'));
  execFileSync('node', [CLI, 'init', 'audio-core', '--dir', dir], { encoding: 'utf8' });
  assert.ok(existsSync(join(dir, '.claude/tools/shape-symmetry.mjs')));
  const skill = readFileSync(join(dir, '.claude/skills/prove-instances-identical/SKILL.md'), 'utf8');
  assert.match(skill, /shape_symmetry/);
  assert.match(skill, /symmetry gen/);
  const rule = readFileSync(join(dir, '.claude/rules/instances-by-index-identities-by-id.md'), 'utf8');
  assert.match(rule, /scope from `design\/shape\.json`, never from a folder list/);
  // doctor runs the tool's selftest: a broken copy is a problem
  writeFileSync(join(dir, '.claude/tools/shape-symmetry.mjs'), readFileSync(join(dir, '.claude/tools/shape-symmetry.mjs'), 'utf8').replace(/if \(diffs\)\s+red \+= 1;/, 'if (false) red += 1;'));   // the emitted code breaks the line, so match across it
  const doc = spawnSync('node', [CLI, 'doctor', '--dir', dir], { encoding: 'utf8' });
  assert.match(doc.stdout, /shape-symmetry\.mjs fails its selftest/);
});

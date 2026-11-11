// test/fixtures/installs.mts: an install built once however many processes ask, a copy that leaves out what a used install holds,
// a copy that names no absolute path (W1.4), and the small helpers beside it.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { FIXTURES, bash, buildOnce, copyInstall, fixture, git, lockOf, strayPaths, transcript, withLayout, write } from '../../fixtures/installs.mts';
import { cli, profile } from '../../kit-cli.mts';

const INSTALLS = fileURLToPath(new URL('../../fixtures/installs.mts', import.meta.url));
const countLines = (file: string): number => (existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean).length : 0);

test('an install is built once: the second ask gets the first one\'s folder and builds nothing', () => {
  const root = scratchDir('installs-root-');
  const count = join(root, 'builds.txt');
  const build = (into: string): void => { writeFileSync(count, 'x\n', { flag: 'a' }); put(join(into, 'a.txt'), 'built'); };
  const first = buildOnce(root, 'cfg', build);
  const second = buildOnce(root, 'cfg', build);
  assert.equal(first, second);
  assert.equal(readFileSync(join(first, 'a.txt'), 'utf8'), 'built');
  assert.equal(countLines(count), 1);
  assert.equal(existsSync(join(root, 'cfg.lock')), false, 'the lock is released');
});

test('three processes asking at once build it once, and all three get it', async () => {
  const root = scratchDir('installs-race-');
  const script = `import { buildOnce } from ${JSON.stringify(INSTALLS)}; import { appendFileSync, writeFileSync } from 'node:fs';
    const dir = buildOnce(process.argv[1], 'cfg', (into) => { appendFileSync(process.argv[1] + '/builds.txt', 'x\\n'); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 400); writeFileSync(into + '/a.txt', 'ok'); });
    process.stdout.write(dir);`;
  const asks = [1, 2, 3].map(() => new Promise<string>((resolve, reject) => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', script, root], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (d: Buffer) => { out += String(d); });
    child.stderr.on('data', (d: Buffer) => { err += String(d); });
    child.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(err))));
  }));
  const dirs = await Promise.all(asks);
  assert.deepEqual(new Set(dirs), new Set([join(root, 'cfg')]));
  assert.equal(countLines(join(root, 'builds.txt')), 1, 'one build, not three');
});

test('a lock whose builder is gone is taken over, and a failed build leaves no lock and no half install', () => {
  const root = scratchDir('installs-stale-');
  mkdirSync(join(root, 'cfg.lock'));
  writeFileSync(join(root, 'cfg.lock/pid'), '2147483646');   // no such process
  assert.equal(buildOnce(root, 'cfg', (into) => put(join(into, 'a.txt'), 'x')), join(root, 'cfg'));
  assert.throws(() => buildOnce(root, 'bad', () => { throw new Error('init failed'); }), /init failed/);
  assert.equal(existsSync(join(root, 'bad.lock')), false);
  assert.equal(existsSync(join(root, 'bad')), false, 'a failed build is not offered to the next test');
});

test('a copy leaves out the logs, the hooks log and the state of a used install, and keeps the rest', () => {
  const source = scratchDir('installs-src-');
  for (const rel of ['.claude/settings.json', '.claude/hooks/a.mjs', '.claude/logs/events.jsonl', '.claude/hooks.log', '.claude/state/duplicates.json', 'src/logs/keep.txt']) put(join(source, rel), 'x');
  const copy = copyInstall(source, scratchDir('installs-copy-'));
  assert.ok(existsSync(join(copy, '.claude/settings.json')) && existsSync(join(copy, '.claude/hooks/a.mjs')));
  assert.ok(existsSync(join(copy, 'src/logs/keep.txt')), 'only the install\'s own logs go, not any folder called logs');
  for (const gone of ['.claude/logs', '.claude/hooks.log', '.claude/state']) assert.equal(existsSync(join(copy, gone)), false, gone);
});

test('a copy that names the folder it came from is found (W1.4\'s planted stale path)', () => {
  const source = scratchDir('installs-stray-');
  put(join(source, '.claude/layout.json'), '{}');
  const copy = copyInstall(source, scratchDir('installs-stray-copy-'));
  assert.deepEqual(strayPaths(copy, source), []);
  put(join(copy, '.claude/settings.json'), `{"command":"node ${source}/.claude/hooks/a.mjs"}`);
  assert.deepEqual(strayPaths(copy, source), ['.claude/settings.json']);
});

test('fixture(base): a copy of the one install, every fixture named has its arguments, and a copy changed does not change the next', () => {
  assert.ok(Object.keys(FIXTURES).length >= 13);
  const a = fixture('base');
  const b = fixture('base');
  assert.notEqual(a, b);
  assert.equal(typeof lockOf(a).kit, 'string', 'the install\'s lock is in the copy');
  assert.equal(existsSync(join(a, '.claude/logs')), false);
  assert.ok(existsSync(join(a, '.claude/settings.json')));
  put(join(a, '.claude/hooks/planted.mjs'), 'x');
  assert.equal(existsSync(join(b, '.claude/hooks/planted.mjs')), false);
  const built = process.env.CLAUDE_PACKS_FIXTURES ?? '';
  assert.deepEqual(strayPaths(b, join(built, 'base')), [], 'a clean install names no absolute path');
  const doctor = cli(b, 'doctor', '--strict');
  assert.equal(doctor.status, 0, doctor.stdout + doctor.stderr);
});

test('withLayout merges key by key (an object, or a function of the layout), lockOf reads the lock, transcript writes one line a turn', () => {
  const dir = fixture('base');
  const before = JSON.parse(readFileSync(join(dir, '.claude/layout.json'), 'utf8')) as Record<string, unknown>;
  withLayout(dir, { chart: 'CLAUDE.md' });
  withLayout(dir, (layout) => ({ seen: Object.keys(layout).length }));
  const after = JSON.parse(readFileSync(join(dir, '.claude/layout.json'), 'utf8')) as Record<string, unknown>;
  assert.equal(after.chart, 'CLAUDE.md');
  assert.equal(after.seen, Object.keys(before).length + 1, 'the function saw the layout with the first patch in it');
  assert.deepEqual(after.folders, before.folders, 'the project\'s own keys stay');
  assert.ok(typeof lockOf(dir).kit === 'string');
  assert.deepEqual(lockOf(scratchDir('installs-nolock-')), {}, 'no lock reads as empty');
  const file = transcript(dir, [{ type: 'user' }, { type: 'assistant', n: 2 }]);
  assert.deepEqual(readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)), [{ type: 'user' }, { type: 'assistant', n: 2 }]);
});

test('fixture(all-packs): the checks of the node and the synth-creator packs are in one install, and a copy names no stray path (W5.4)', () => {
  const copy = fixture('all-packs');
  for (const check of ['rust-unwrap-in-library.json', 'dsp-without-apvts.json']) assert.ok(existsSync(join(copy, '.claude/checks', check)), check);
  assert.equal(existsSync(join(copy, '.claude/checks/fetch-needs-timeout.json')), false, 'the one check a case of another pack meets is left out');
  assert.deepEqual(strayPaths(copy, join(process.env.CLAUDE_PACKS_FIXTURES ?? '', 'all-packs')), []);
});

test('--profile takes the path of a layout file, and the two profiles are fixtures (W5.4)', () => {
  const dir = scratchDir('installs-profile-');
  assert.equal(cli(dir, 'init', 'audio-core', '--profile', profile('sub37')).status, 0);
  assert.notEqual(cli(scratchDir('installs-profile-missing-'), 'init', 'audio-core', '--profile', 'sub37').status, 0, 'a bare name is no longer a profile');
});

test('git commits as the one identity and throws with git\'s own words on a failure; write and bash build the payloads', () => {
  const dir = scratchDir('installs-git-');
  git(dir, 'init', '-q');
  put(join(dir, 'a.txt'), 'a');
  git(dir, 'add', 'a.txt');
  git(dir, 'commit', '-qm', 'first');
  assert.equal(git(dir, 'log', '-1', '--format=%an <%ae>'), 't <t@t>');
  assert.throws(() => git(dir, 'checkout', 'no-such-branch'), /no-such-branch/);
  assert.deepEqual(write('/p/a.cpp', 'x'), { tool_name: 'Write', tool_input: { file_path: '/p/a.cpp', content: 'x' } });
  assert.deepEqual(bash('ls', '/p'), { tool_name: 'Bash', tool_input: { command: 'ls' }, cwd: '/p' });
});

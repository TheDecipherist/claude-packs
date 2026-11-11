// freeze (synth-creator's tool): the files that define "fixed" are frozen before the code that must satisfy them changes, and the
// frozen-files hook refuses edits to them. First test for it (W5). The tool runs from an install, as a project runs it: it
// imports base's hook lib beside it.
import { assert, existsSync, hookRun, join, readFileSync, spawnSync, test } from '../../kit-cli.mts';
import { fixture, write } from '../../fixtures/installs.mts';

const dir = fixture('synth-creator');
const FROZEN = join(dir, '.claude/state/frozen.json');
const freeze = (...args: string[]) => spawnSync('node', [join(dir, '.claude/tools/freeze.mjs'), ...args], { encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: dir } });
const listed = (): { reason: string; files: string[]; since: string } => JSON.parse(readFileSync(FROZEN, 'utf8')) as { reason: string; files: string[]; since: string };

test('on freezes the files with the reason and the time, a second on adds to the list, and off clears it', () => {
  assert.equal(freeze('on', 'bug 7', 'tests/a.cpp', 'golden/*.wav').status, 0);
  assert.equal(listed().reason, 'bug 7');
  assert.deepEqual(listed().files, ['tests/a.cpp', 'golden/*.wav']);
  assert.ok(!Number.isNaN(Date.parse(listed().since)), 'the time it began');
  assert.equal(freeze('on', 'bug 7', 'tests/b.cpp', 'tests/a.cpp').status, 0);
  assert.deepEqual(listed().files, ['tests/a.cpp', 'golden/*.wav', 'tests/b.cpp'], 'added once, in order');
  assert.equal(freeze('off').status, 0);
  assert.equal(existsSync(FROZEN), false);
});

test('on without a reason or a file, and an unknown command, say how to use it and exit 2', () => {
  assert.equal(freeze('on', 'why').status, 2);
  assert.equal(freeze('on').status, 2);
  const unknown = freeze('thaw');
  assert.equal(unknown.status, 2);
  assert.match(unknown.stderr, /usage: freeze\.mjs/);
  assert.equal(existsSync(FROZEN), false, 'a refused call froze nothing');
});

test('status says what is frozen, and the frozen-files hook refuses an edit to it until freeze off', () => {
  const target = join(dir, 'tests/golden.txt');
  assert.match(freeze('status').stdout, /nothing frozen/);
  assert.equal(freeze('on', 'bug 9', 'tests/golden.txt').status, 0);
  assert.match(freeze('status').stdout, /tests\/golden\.txt/);
  assert.equal(hookRun(dir, 'frozen-files.mjs', write(target, 'changed')).status, 2, 'the edit to a frozen file is refused');
  assert.equal(freeze('off').status, 0);
  assert.equal(hookRun(dir, 'frozen-files.mjs', write(target, 'changed')).status, 0, 'once thawed the same edit passes');
});

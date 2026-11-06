// 1.1.0: a project can build itself, and a reader can find out how. The templates come from two whole builds run with nobody there. KWB-84: `new` used to
// install a synth's laws on any project.
import { CLI, KIT, assert, cli, execFileSync, existsSync, fresh, join, readFileSync, spawnSync, statSync, test, writeFileSync } from './kit-cli.mjs';

const FOLDER = 'docs/workorders/billing';
const README = readFileSync(join(KIT, 'README.md'), 'utf8');

test('workorder writes the steps, the prompt and the runner, with its name in them', () => {
  const dir = fresh('wo-');
  const r = cli(dir, 'workorder', 'billing');
  assert.equal(r.status, 0, r.stderr);
  for (const file of ['workorder.md', 'PROMPT.md', 'run.sh']) {
    const text = readFileSync(join(dir, FOLDER, file), 'utf8');
    assert.doesNotMatch(text, /\{\{/, file);
    assert.match(text, /billing/, file);
  }
  assert.ok(statSync(join(dir, FOLDER, 'run.sh')).mode & 0o100, 'the runner can be run');
  execFileSync('bash', ['-n', join(dir, FOLDER, 'run.sh')]);
});

test('workorder never writes over a work order that exists', () => {
  const dir = fresh('wo-');
  cli(dir, 'workorder', 'billing');
  writeFileSync(join(dir, FOLDER, 'workorder.md'), 'my steps\n');
  const again = cli(dir, 'workorder', 'billing');
  assert.equal(again.status, 2);
  assert.match(again.stderr, /already exists: nothing was written/);
  assert.equal(readFileSync(join(dir, FOLDER, 'workorder.md'), 'utf8'), 'my steps\n');
});

test('a work order needs a plain name', () => {
  const dir = fresh('wo-');
  assert.equal(cli(dir, 'workorder').status, 2);
  assert.equal(cli(dir, 'workorder', '../out').status, 2);
  assert.ok(!existsSync(join(dir, '..', 'out')));
});

test('the prompt holds what two builds taught: nobody asked, decisions recorded, only a traced order obeyed, and an end on a DONE file', () => {
  const dir = fresh('wo-');
  cli(dir, 'workorder', 'billing');
  const prompt = readFileSync(join(dir, FOLDER, 'PROMPT.md'), 'utf8');
  for (const law of [/Never stop, never ask/, /decisions\.md/, /progress\.md/, /cannot trace/, /BLOCKED BY KIT/, /DONE/]) assert.match(prompt, law);
});

test('the runner says what it switches off, and stops when nothing moves', () => {
  const run = readFileSync(join(KIT, 'prompts/workorder/run.sh'), 'utf8');
  assert.match(run, /permission prompts off/);
  assert.match(run, /three sessions moved nothing/);
  assert.match(README, /It runs Claude with permission prompts off/);
});

test('a new project with no packs named takes base alone, never a synth pack (KWB-84)', () => {
  const parent = fresh('new-');
  const r = spawnSync('node', [CLI, 'new', 'shop', '--dir', parent], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual(JSON.parse(readFileSync(join(parent, 'shop/.claude/claude-packs.lock.json'), 'utf8')).packs, ['base']);
});

test('a new reader meets the benefits first, and every file the page says a project keeps is one the kit names', () => {
  assert.ok(README.indexOf('https://www.npmjs.com/package/@thedecipherist/claude-packs') < README.indexOf('## Getting started'), 'the npm link is at the top');
  assert.ok(README.indexOf('## Getting started') < README.indexOf('## See it work'));
  for (const heading of ['## What a project keeps', '## How it is tested', '## Let it build on its own']) assert.ok(README.includes(heading), heading);
  const made = readFileSync(join(KIT, 'lib/new.mjs'), 'utf8');
  for (const file of ['CLAUDE.md', 'build.md', 'bugs.md', 'workflow-bugs.md', 'docs/versions.md']) assert.ok(made.includes(file), file);
  const logged = readFileSync(join(KIT, 'packs/base/hooks/lib/event-log.mjs'), 'utf8') + readFileSync(join(KIT, 'packs/base/hooks/lib/hook-log.mjs'), 'utf8');
  for (const file of ['events.jsonl', 'refusals.jsonl', 'crashes.jsonl', 'hooks.log']) assert.ok(logged.includes(file), file);
});

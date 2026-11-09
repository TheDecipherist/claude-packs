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
  // KWB-124: its sessions say nobody is there, so agents-held keeps their agents in the foreground
  assert.match(run, /^export CLAUDE_PACKS_UNATTENDED=1$/m);
  assert.match(README, /It runs Claude with permission prompts off/);
});

test('the runner dates its log with a format BSD and GNU date both take (KWB-95)', () => {
  // The user starts run.sh from their own terminal, which on a Mac has the BSD tools: GNU-only flags leave the log undated
  const run = readFileSync(join(KIT, 'prompts/workorder/run.sh'), 'utf8');
  for (const call of run.match(/\bdate\b[^)"|]*/g) ?? []) assert.doesNotMatch(call, /\s-(I|-iso|d\b|-date|R\b|-rfc)/, `GNU-only: ${call}`);
  assert.match(run, /date \+%Y-%m-%dT%H:%M:%S%z/);
});

// KWB-98: each session's transcript holds the user's paths and name, so the runner's logs never reach git. The runner is run with
// a stand-in `claude` on PATH that writes the session's lines and the DONE file, and git sees nothing of logs/.
test('the runner keeps its session logs out of git (KWB-98)', () => {
  const dir = fresh('wo-logs-');
  execFileSync('git', ['init', '-q'], { cwd: dir });
  assert.equal(cli(dir, 'workorder', 'billing').status, 0);
  const bin = join(dir, '.bin');
  execFileSync('mkdir', ['-p', bin]);
  writeFileSync(join(bin, 'claude'), `#!/usr/bin/env bash\necho '{"type":"system","cwd":"/home/someone"}'\ntouch "${join(dir, FOLDER, 'DONE')}"\n`, { mode: 0o755 });
  const run = spawnSync('bash', [join(dir, FOLDER, 'run.sh')], { cwd: dir, encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } });
  assert.equal(run.status, 0, run.stdout + run.stderr);
  // KWB-100: the first session starts before progress.md exists, and the runner says nothing about it
  assert.equal(run.stderr, '', run.stderr);
  assert.ok(existsSync(join(dir, FOLDER, 'logs/session-1.jsonl')), 'the session was logged');
  const seen = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: dir, encoding: 'utf8' });
  assert.doesNotMatch(seen, /logs\//, seen);
});

// KWB-122: a session refused for the account's usage limit moved nothing because it could not run, not because the work is stuck.
// The stand-in `claude` is refused four times, more than the three still sessions that stop a run, then finishes the order.
test('the runner waits out a usage limit and carries on, never counting it as a still session (KWB-122)', () => {
  const dir = fresh('wo-limit-');
  execFileSync('git', ['init', '-q'], { cwd: dir });
  assert.equal(cli(dir, 'workorder', 'billing').status, 0);
  const bin = join(dir, '.bin');
  execFileSync('mkdir', ['-p', bin]);
  const calls = join(dir, '.calls');
  const refused = `{"type":"result","is_error":true,"api_error_status":429,"api_error":"usage_limit_reached","result":"You have hit your weekly limit"}`;
  writeFileSync(join(bin, 'claude'), `#!/usr/bin/env bash\necho x >> "${calls}"\nif [ "$(wc -l < "${calls}")" -le 4 ]; then echo '${refused}'; exit 1; fi\ntouch "${join(dir, FOLDER, 'DONE')}"\n`, { mode: 0o755 });
  const run = spawnSync('bash', [join(dir, FOLDER, 'run.sh')], { cwd: dir, encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, LIMIT_WAIT: '0' } });
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.ok(existsSync(join(dir, FOLDER, 'DONE')), 'the order finished after the limit');
  const log = readFileSync(join(dir, FOLDER, 'logs/runner.log'), 'utf8');
  assert.equal(log.match(/usage limit/g)?.length, 4, log);
  assert.ok(existsSync(join(dir, FOLDER, 'logs/session-1.jsonl')), 'the session that ran is logged under its own number');
  assert.ok(!existsSync(join(dir, FOLDER, 'logs/session-2.jsonl')), 'a refused try is not a session');
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

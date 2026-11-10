// 1.1.0: a project can build itself, and a reader can find out how. The templates come from two whole builds run with nobody there. KWB-84: `new` used to
// install a synth's laws on any project.
import { CLI, KIT, assert, cli, execFileSync, existsSync, fresh, join, readdirSync, readFileSync, spawnSync, statSync, test, writeFileSync } from './kit-cli.mjs';

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

// KWB-125: a session refused for the account's usage limit moved nothing because it could not run, not because the work is stuck.
// The stand-in `claude` is refused four times, more than the three still sessions that stop a run, then finishes the order.
test('the runner waits out a usage limit and carries on, never counting it as a still session (KWB-125)', () => {
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

// 1.5.11: a rebuild of a hardware instrument starts from the steps four rebuilds taught, not a blank order.
test('workorder --template rebuild writes the rebuild steps; an unknown template writes nothing', () => {
  const dir = fresh('wo-rebuild-');
  assert.equal(cli(dir, 'workorder', 'rebuild', '--template', 'rebuild').status, 0);
  const order = readFileSync(join(dir, 'docs/workorders/rebuild/workorder.md'), 'utf8');
  assert.match(order, /^# Work order: the <maker> <machine>, rebuilt/);
  assert.match(order, /## W5\. The oracle/);
  assert.doesNotMatch(order, /\{\{(name|date)\}\}/, 'the name and the date are filled in');
  assert.ok(existsSync(join(dir, 'docs/workorders/rebuild/PROMPT.md')) && existsSync(join(dir, 'docs/workorders/rebuild/run.sh')));
  const plain = fresh('wo-plain-');
  assert.equal(cli(plain, 'workorder', 'billing').status, 0);
  assert.match(readFileSync(join(plain, FOLDER, 'workorder.md'), 'utf8'), /^# Work order: billing/, 'the plain form keeps the blank steps');
  const bad = fresh('wo-bad-');
  const r = cli(bad, 'workorder', 'x', '--template', 'nope');
  assert.notEqual(r.status, 0);
  assert.match(r.stderr + r.stdout, /rebuild/, 'the refusal names the templates there are');
  assert.ok(!existsSync(join(bad, 'docs/workorders/x')), 'nothing was written');
});

// Every skill, rule and tool the rebuild template names is one the kit has, so a run never looks for one that is not there.
test('the rebuild template names only skills, rules and tools the kit has', () => {
  const text = readFileSync(join(KIT, 'prompts/workorder/workorder-rebuild.md'), 'utf8');
  // **The foundation** lists them as "its skills `a`, `b`; its tool `c`; and its rules `d` and `e`."
  const named = (kind) => [...text.matchAll(new RegExp(`its ${kind} ([^;.]*)`, 'g'))].flatMap((m) => [...m[1].matchAll(/`([\w-]+)`/g)].map((n) => n[1]));
  const have = (kind, name) => readdirSync(join(KIT, 'packs')).some((p) => existsSync(join(KIT, 'packs', p, kind, name)));
  const skills = named('skills');
  assert.ok(skills.length >= 10, `the foundation names its skills: ${skills}`);
  for (const s of skills) assert.ok(have('skills', s), `skill ${s}`);
  for (const r of [...named('rules'), 'test-the-template-once']) assert.ok(have('rules', `${r}.md`), `rule ${r}`);
  for (const t of named('tool')) assert.ok(have('tools', `${t}.mjs`), `tool ${t}`);
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

// 0.29.0: until a project knows which hooks work, it needs all of its history, with as much detail as it can keep. Nothing is cleared, and every refusal can be judged.
import { assert, cli, execFileSync, existsSync, fresh, hookRun, join, mkdirSync, readFileSync, readdirSync, spawnSync, test, writeFileSync } from './kit-cli.mjs';
import { maskSecrets } from '../packs/base/hooks/lib/secret-patterns.mjs';
import { headOf } from '../packs/base/hooks/lib/event-log.mjs';

const lines = (dir, f) => readFileSync(join(dir, '.claude/logs', f), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const key = ['ghp', 'a1B2'.repeat(10)].join('_');

// A project whose runner refuses: the event goes through run-hooks, as Claude Code runs it.
function project() {
  const dir = fresh('log-');
  execFileSync('git', ['init', '-q', '--initial-branch', 'work/x'], { cwd: dir });
  assert.equal(cli(dir, 'init', '--config', 'base').status, 0);
  return dir;
}
const fire = (dir, event) => spawnSync('node', [join(dir, '.claude/hooks/run-hooks.mjs'), '.claude/hooks/secrets-guard.mjs', '.claude/hooks/file-size-guard.mjs'], { input: JSON.stringify(event), encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, cwd: dir });

test('every call is logged with what it tried; a refusal keeps its reason and where it happened', () => {
  const dir = project();
  const base = { hook_event_name: 'PreToolUse', session_id: 's1', cwd: dir, tool_name: 'Write' };
  assert.equal(fire(dir, { ...base, tool_input: { file_path: join(dir, 'src/ok.js'), content: 'const a = 1;\n' } }).status, 0);
  assert.equal(fire(dir, { ...base, tool_input: { file_path: join(dir, 'src/a.js'), content: `const k = '${key}';\n` } }).status, 2);
  const events = lines(dir, 'events.jsonl');
  assert.equal(events.length, 2);
  assert.equal(events[0].session, 's1');
  assert.equal(events[0].file, join(dir, 'src/ok.js'));
  assert.equal(events[0].bytes, 13);
  assert.deepEqual(events[0].hooks.map((h) => h.hook), ['secrets-guard', 'file-size-guard']);
  const [r] = lines(dir, 'refusals.jsonl');
  assert.equal(r.hook, 'secrets-guard');
  assert.match(r.reason, /BLOCKED by secrets-guard/);
  assert.equal(r.file, join(dir, 'src/a.js'));
  assert.equal(r.branch, 'work/x');
  assert.match(r.kit, /^\d+\.\d+\.\d+$/);
  assert.match(r.hookHash, /^[0-9a-f]{12}$/);
  assert.doesNotMatch(readFileSync(join(dir, '.claude/logs/refusals.jsonl'), 'utf8'), new RegExp(key), 'the written secret is never logged');
});

test('a command is logged with its secrets masked, and file contents are never kept', () => {
  const dir = project();
  fire(dir, { hook_event_name: 'PreToolUse', session_id: 's1', cwd: dir, tool_name: 'Bash', tool_input: { command: `curl -H "Authorization: ${key}" https://x.dev` } });
  fire(dir, { hook_event_name: 'PreToolUse', session_id: 's1', cwd: dir, tool_name: 'Write', tool_input: { file_path: join(dir, 'a.js'), content: 'const marker = 1;\n' } });
  const text = readFileSync(join(dir, '.claude/logs/events.jsonl'), 'utf8');
  assert.doesNotMatch(text, new RegExp(key));
  assert.match(text, /a GitHub token/);
  assert.doesNotMatch(text, /const marker/);
  assert.equal(maskSecrets('password=hunter22 ok'), 'password=[masked] ok');
});

test('logs: every hook, over rotated files too, and a verdict is added without rewriting anything', () => {
  const dir = project();
  const base = { hook_event_name: 'PreToolUse', session_id: 's1', cwd: dir, tool_name: 'Write' };
  fire(dir, { ...base, tool_input: { file_path: join(dir, 'a.js'), content: `const k = '${key}';\n` } });
  fire(dir, { ...base, tool_input: { file_path: join(dir, 'a.js'), content: 'const k = env.KEY;\n' } });
  const logs = join(dir, '.claude/logs');
  writeFileSync(join(logs, 'events-20260101-000000.jsonl'), `${JSON.stringify({ t: '2026-01-01T00:00:00Z', hooks: [{ hook: 'secrets-guard', ms: 3, code: 0 }] })}\n`);
  const summary = cli(dir, 'logs').stdout;
  assert.match(summary, /3 calls/);
  assert.match(summary, /secrets-guard +3 +1 +0 +0 +1 +1/, 'three calls, one refusal, open, and the file passed afterwards');
  const [r] = lines(dir, 'refusals.jsonl');
  assert.match(cli(dir, 'logs', 'refusals', '--open').stdout, new RegExp(r.id));
  assert.equal(cli(dir, 'logs', 'mark', r.id, 'right', 'a', 'real', 'key').status, 0);
  assert.match(cli(dir, 'logs').stdout, /secrets-guard +3 +1 +1 +0 +0/);
  assert.match(cli(dir, 'logs', 'refusals', '--open').stdout, /^0 refusal/m);
  assert.notEqual(cli(dir, 'logs', 'mark', 'nope', 'right', 'x').status, 0);
  assert.equal(lines(dir, 'verdicts.jsonl')[0].why, 'a real key');
});

test('a project sets its own rotation size, and every rotated file stays', () => {
  const dir = project();
  const file = join(dir, '.claude/layout.json');
  const layout = JSON.parse(readFileSync(file, 'utf8'));
  writeFileSync(file, JSON.stringify({ ...layout, guards: { ...layout.guards, logs: { maxKb: 1 } } }));
  for (let i = 0; i < 12; i += 1) fire(dir, { hook_event_name: 'PreToolUse', session_id: `s${i}`, cwd: dir, tool_name: 'Bash', tool_input: { command: `echo ${'x'.repeat(300)}` } });
  const names = readdirSync(join(dir, '.claude/logs')).filter((f) => f.startsWith('events'));
  assert.ok(names.length >= 3, names.join());
  assert.equal(cli(dir, 'logs').stdout.match(/^(\d+) calls/m)?.[1], '12', 'no line is lost');
});

test('the logs stay out of git, and a hook is never stopped by its log', () => {
  const dir = project();
  assert.match(readFileSync(join(dir, '.gitignore'), 'utf8'), /\.claude\/logs\//);
  mkdirSync(join(dir, '.claude/logs/events.jsonl'), { recursive: true });
  assert.equal(hookRun(dir, 'secrets-guard.mjs', { tool_name: 'Write', tool_input: { file_path: join(dir, 'a.js'), content: 'x\n' } }).status, 0);
  assert.ok(existsSync(join(dir, '.claude/hooks.log')));
});

test('the branch and commit are read from the checkout, a worktree too', () => {
  const dir = project();
  assert.equal(headOf(dir).branch, 'work/x');
  assert.deepEqual(headOf(join(dir, 'nowhere')), {});
});

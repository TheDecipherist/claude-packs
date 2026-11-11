// run-hooks: the runner settings.json runs one entry's node hooks through, in one process (KWB-24). It exports no worktreeCase: the
// case is the one test/worktrees.test.mjs kept as a function. The hook's contract, then its refusals.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, utimesSync } from 'node:fs';
import { join } from 'node:path';
import { scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { checkoutHead } from '../../../packs/base/hooks/lib/event-log.mts';
import { parseJson, toJson } from '../../../packs/base/hooks/lib/json.mts';
import { maskSecrets } from '../../../packs/base/hooks/lib/secret-patterns.mts';
import { writesOf } from '../../../packs/base/hooks/lib/writes.mts';
import { withLayout } from '../../fixtures/installs.mts';
import { assert, cli, hookRun, put, test } from '../../kit-cli.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';
import { logLines, runner, workProject } from '../work-project.mts';
import type { Checkouts } from '../hook-rig.mts';

const entry = (project: string, file: string, content = '// new\n') => ({ hook_event_name: 'PreToolUse', tool_name: 'Write', tool_input: { file_path: file, content }, cwd: project });
const HOOKS = ['.claude/hooks/folder-law.mjs', '.claude/hooks/file-size-guard.mjs'];

holdsTheContract({
  hook: 'run-hooks.mjs',
  dir: () => fixture('audio-core'),
  same: (project) => ({ payload: entry(project, join(project, 'stray/Svf.cpp')), status: 0 }),
  worktree: ({ here, wt }: Checkouts) => {
    // the hooks it names judge a worktree file against the worktree; the timing lines go to the main checkout's log
    const rows: readonly (readonly [string, string, number])[] = [
      ['src/core/Svf.cpp', '// new\n', 0], ['stray/Svf.cpp', '// new\n', 2], ['src/core/Huge.cpp', 'x\n'.repeat(400), 2],
    ];
    for (const [rel, content, want] of rows) {
      const r = spawnSync('node', [join(here, '.claude/hooks/run-hooks.mjs'), ...HOOKS],
        { input: JSON.stringify(entry(here, join(wt, rel), content)), env: { ...process.env, CLAUDE_PROJECT_DIR: here }, encoding: 'utf8' });
      assert.equal(r.status, want, rel);
    }
    assert.match(readFileSync(join(here, '.claude/hooks.log'), 'utf8'), /\tfolder-law\t\d+\t2\tWrite/);
  },
});

// 1.1.0, group 1 (KF-40, KF-18): the faults of the MPX 500 build that failed silently or failed open. Each was seen red before its fix.
const bashEvent = (dir: string, command: string) => ({ hook_event_name: 'PreToolUse', session_id: 's1', cwd: dir, tool_name: 'Bash', tool_input: { command } });
const plantCrash = (dir: string): string => {
  const file = join(dir, '.claude/hooks/planted.mjs');
  put(file, "export function hook() { throw new TypeError('planted crash'); }\n");
  return file;
};

// The two forms of the real edit that crashed sixteen hooks (KF-40): a local helper whose path is its own parameter.
const HELPER_EDIT = `python3 - <<'E'
from pathlib import Path
def sub(f,a,b,c=1):
    p=Path(f);s=p.read_text();assert s.count(a)>=1,(f,a);p.write_text(s.replace(a,b) if c==0 else s.replace(a,b,c))
sub('tests/panel_drawn.cpp',"old","new")
sub('src/app/panel/PanelShading.h',"old","new")
E`;

test('KF-40: an inline edit through a local helper is read, not crashed on, and names the files it writes', () => {
  const dir = scratchDir('kf40-');
  const ws = writesOf({ tool_name: 'Bash', cwd: dir, tool_input: { command: HELPER_EDIT } }, dir, process.env);
  assert.deepEqual(ws.map((w) => w.path).sort(), [join(dir, 'src/app/panel/PanelShading.h'), join(dir, 'tests/panel_drawn.cpp')]);
  assert.ok(ws.every((w) => w.after === null), 'what it writes is not known');
});

test('KF-40: the same edit passes through every base hook with no crash logged', () => {
  const dir = workProject();
  const hooks = ['lesson-checks', 'once-only', 'code-shape', 'shape-law', 'making-check'].map((h) => `.claude/hooks/${h}.mjs`);
  const r = runner(dir, bashEvent(dir, HELPER_EDIT), ...hooks);
  assert.doesNotMatch(r.stderr, /failed|TypeError/);
  assert.equal(logLines(dir, 'crashes.jsonl').length, 0);
});

test('KF-40: a write whose text no hook could read says so where the author sees it', () => {
  const dir = workProject();
  const r = runner(dir, bashEvent(dir, HELPER_EDIT), '.claude/hooks/lesson-checks.mjs');
  assert.equal(r.status, 0);
  const said = parseJson<{ hookSpecificOutput: { additionalContext: string }; systemMessage: string }>(r.stdout);
  assert.match(said?.hookSpecificOutput.additionalContext ?? '', /tests\/panel_drawn\.cpp/);
  assert.match(said?.hookSpecificOutput.additionalContext ?? '', /could not read/);
  assert.match(said?.systemMessage ?? '', /not judged/);
});

test('KF-40: a command that writes what the hooks can read adds nothing', () => {
  const dir = workProject();
  const r = runner(dir, bashEvent(dir, "printf 'x\\n' > note.txt"), '.claude/hooks/lesson-checks.mjs');
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
});

test('KF-18: a crash on a tool call refuses once and says so; the same call again goes through, logged', () => {
  const dir = workProject();
  const planted = plantCrash(dir);
  const event = bashEvent(dir, 'echo one');
  const first = runner(dir, event, planted);
  assert.equal(first.status, 2);
  assert.match(first.stderr, /planted crashed/);
  assert.match(first.stderr, /not judged/);
  assert.match(first.stderr, /same call again/);
  const second = runner(dir, event, planted);
  assert.equal(second.status, 0);
  assert.match(parseJson<{ systemMessage: string }>(second.stdout)?.systemMessage ?? '', /planted crashed/);
  assert.equal(runner(dir, bashEvent(dir, 'echo two'), planted).status, 2, 'another call is refused in its turn');
});

test('KF-40: a crash is its own kind of entry, not a refusal', () => {
  const dir = workProject();
  const planted = plantCrash(dir);
  runner(dir, bashEvent(dir, 'echo one'), planted);
  assert.equal(logLines(dir, 'refusals.jsonl').length, 0);
  const [crash] = logLines(dir, 'crashes.jsonl');
  assert.equal(crash?.['hook'], 'planted');
  assert.equal(crash?.['command'], 'echo one');
  assert.match(String(crash?.['reason']), /planted crash/);
  assert.match(cli(dir, 'logs', 'crashes').stdout, /planted/);
  assert.match(cli(dir, 'logs', 'refusals').stdout, /^0 refusal/m);
});

test('KF-18: a crash at Stop or at a prompt refuses nothing, and tells the author', () => {
  const dir = workProject();
  const planted = plantCrash(dir);
  for (const hook_event_name of ['Stop', 'UserPromptSubmit']) {
    const r = runner(dir, { hook_event_name, session_id: 's1', cwd: dir }, planted);
    assert.equal(r.status, 0);
    assert.match(parseJson<{ systemMessage: string }>(r.stdout)?.systemMessage ?? '', /planted crashed/);
  }
});

test('KF-18: a crash left in the old form, in refusals.jsonl, reads as a crash', () => {
  const dir = workProject();
  put(join(dir, '.claude/logs/refusals.jsonl'), `${toJson({ id: 'aaaa1111', t: '2026-11-05T12:00:00.000Z', hook: 'lesson-checks', code: 1, reason: 'run-hooks: lesson-checks failed: TypeError' })}\n`);
  assert.match(cli(dir, 'logs', 'refusals').stdout, /^0 refusal/m);
  assert.match(cli(dir, 'logs', 'crashes').stdout, /lesson-checks/);
});

// (A crash cleared by hand, and a crash older than a lib file: run-hooks-crashes.test.mts, split so no file sums over a minute.)

// 0.29.0 (logging): until a project knows which hooks work, it needs all of its history, with as much detail as it can keep. Nothing is
// cleared, and every refusal can be judged. The event goes through run-hooks, as Claude Code runs it.
const key = ['ghp', 'a1B2'.repeat(10)].join('_');
const logged = (dir: string, event: unknown) => runner(dir, event, '.claude/hooks/secrets-guard.mjs', '.claude/hooks/file-size-guard.mjs');

test('every call is logged with what it tried; a refusal keeps its reason and where it happened', () => {
  const dir = workProject();
  const base = { hook_event_name: 'PreToolUse', session_id: 's1', cwd: dir, tool_name: 'Write' };
  assert.equal(logged(dir, { ...base, tool_input: { file_path: join(dir, 'src/ok.js'), content: 'const a = 1;\n' } }).status, 0);
  assert.equal(logged(dir, { ...base, tool_input: { file_path: join(dir, 'src/a.js'), content: `const k = '${key}';\n` } }).status, 2);
  const events = logLines(dir, 'events.jsonl');
  assert.equal(events.length, 2);
  assert.equal(events[0]?.['session'], 's1');
  assert.equal(events[0]?.['file'], join(dir, 'src/ok.js'));
  assert.equal(events[0]?.['bytes'], 13);
  assert.deepEqual((events[0]?.['hooks'] as { hook: string }[]).map((h) => h.hook), ['secrets-guard', 'file-size-guard']);
  const [r] = logLines(dir, 'refusals.jsonl');
  assert.equal(r?.['hook'], 'secrets-guard');
  assert.match(String(r?.['reason']), /BLOCKED by secrets-guard/);
  assert.equal(r?.['file'], join(dir, 'src/a.js'));
  assert.equal(r?.['branch'], 'work/x');
  assert.match(String(r?.['kit']), /^\d+\.\d+\.\d+$/);
  assert.match(String(r?.['hookHash']), /^[0-9a-f]{12}$/);
  assert.doesNotMatch(readFileSync(join(dir, '.claude/logs/refusals.jsonl'), 'utf8'), new RegExp(key), 'the written secret is never logged');
});

test('a command is logged with its secrets masked, and file contents are never kept', () => {
  const dir = workProject();
  logged(dir, bashEvent(dir, `curl -H "Authorization: ${key}" https://x.dev`));
  logged(dir, { hook_event_name: 'PreToolUse', session_id: 's1', cwd: dir, tool_name: 'Write', tool_input: { file_path: join(dir, 'a.js'), content: 'const marker = 1;\n' } });
  const text = readFileSync(join(dir, '.claude/logs/events.jsonl'), 'utf8');
  assert.doesNotMatch(text, new RegExp(key));
  assert.match(text, /a GitHub token/);
  assert.doesNotMatch(text, /const marker/);
  assert.equal(maskSecrets('password=hunter22 ok'), 'password=[masked] ok');
});

test('logs: every hook, over rotated files too, and a verdict is added without rewriting anything', () => {
  const dir = workProject();
  const base = { hook_event_name: 'PreToolUse', session_id: 's1', cwd: dir, tool_name: 'Write' };
  logged(dir, { ...base, tool_input: { file_path: join(dir, 'a.js'), content: `const k = '${key}';\n` } });
  logged(dir, { ...base, tool_input: { file_path: join(dir, 'a.js'), content: 'const k = env.KEY;\n' } });
  put(join(dir, '.claude/logs/events-20260101-000000.jsonl'), `${toJson({ t: '2026-01-01T00:00:00Z', hooks: [{ hook: 'secrets-guard', ms: 3, code: 0 }] })}\n`);
  const summary = cli(dir, 'logs').stdout;
  assert.match(summary, /3 calls/);
  assert.match(summary, /secrets-guard +3 +1 +0 +0 +1 +1/, 'three calls, one refusal, open, and the file passed afterwards');
  const [r] = logLines(dir, 'refusals.jsonl');
  const id = String(r?.['id']);
  assert.match(cli(dir, 'logs', 'refusals', '--open').stdout, new RegExp(id));
  assert.equal(cli(dir, 'logs', 'mark', id, 'right', 'a', 'real', 'key').status, 0);
  assert.match(cli(dir, 'logs').stdout, /secrets-guard +3 +1 +1 +0 +0/);
  assert.match(cli(dir, 'logs', 'refusals', '--open').stdout, /^0 refusal/m);
  assert.notEqual(cli(dir, 'logs', 'mark', 'nope', 'right', 'x').status, 0);
  assert.equal(logLines(dir, 'verdicts.jsonl')[0]?.['why'], 'a real key');
});

test('a project sets its own rotation size, and every rotated file stays', () => {
  const dir = workProject();
  withLayout(dir, (layout) => ({ guards: { ...(layout['guards'] as Record<string, unknown>), logs: { maxKb: 1 } } }));
  for (let i = 0; i < 12; i += 1) logged(dir, { ...bashEvent(dir, `echo ${'x'.repeat(300)}`), session_id: `s${i}` });
  const names = readdirSync(join(dir, '.claude/logs')).filter((f) => f.startsWith('events'));
  assert.ok(names.length >= 3, names.join());
  assert.equal(/^(\d+) calls/m.exec(cli(dir, 'logs').stdout)?.[1], '12', 'no line is lost');
});

test('the logs stay out of git, and a hook is never stopped by its log', () => {
  const dir = workProject();
  assert.match(readFileSync(join(dir, '.gitignore'), 'utf8'), /\.claude\/logs\//);
  mkdirSync(join(dir, '.claude/logs/events.jsonl'), { recursive: true });
  assert.equal(hookRun(dir, 'secrets-guard.mjs', { tool_name: 'Write', tool_input: { file_path: join(dir, 'a.js'), content: 'x\n' } }).status, 0);
  assert.ok(existsSync(join(dir, '.claude/hooks.log')));
});

test('the branch and commit are read from the checkout, a worktree too', () => {
  const dir = workProject();
  assert.equal(checkoutHead(dir).branch, 'work/x');
  assert.deepEqual(checkoutHead(join(dir, 'nowhere')), {});
});

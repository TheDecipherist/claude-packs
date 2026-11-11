// 1.1.0, group 1: the faults of the MPX 500 build that failed silently or failed open (KF-40, KF-18, KF-15, KF-23, KF-8, KF-12).
// KF-31 is in rule-tests.test.mjs. Each test was seen red before its fix (docs/1.1-progress.md).
import { assert, cli, execFileSync, existsSync, fresh, hookRun, join, mkdirSync, readFileSync, run, spawnSync, statSync, test, writeFileSync } from './kit-cli.mjs';
import { writesOf } from '../packs/base/hooks/lib/writes.mjs';

const installed = (...packs) => {
  const dir = fresh('kf-');
  execFileSync('git', ['init', '-q', '--initial-branch', 'work/x'], { cwd: dir });
  assert.equal(cli(dir, 'init', ...(packs.length ? packs : ['--config', 'base'])).status, 0);
  return dir;
};
const runner = (dir, event, ...hooks) => spawnSync('node', [join(dir, '.claude/hooks/run-hooks.mjs'), ...hooks], { input: JSON.stringify(event), encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, cwd: dir });
const lines = (dir, f) => { try { return readFileSync(join(dir, '.claude/logs', f), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; } };
const plantCrash = (dir) => { const f = join(dir, '.claude/hooks/planted.mjs'); writeFileSync(f, "export function hook() { throw new TypeError('planted crash'); }\n"); return f; };
const bash = (dir, command) => ({ hook_event_name: 'PreToolUse', session_id: 's1', cwd: dir, tool_name: 'Bash', tool_input: { command } });

// The two forms of the real edit that crashed sixteen hooks (KF-40): a local helper whose path is its own parameter.
const HELPER_EDIT = `python3 - <<'E'
from pathlib import Path
def sub(f,a,b,c=1):
    p=Path(f);s=p.read_text();assert s.count(a)>=1,(f,a);p.write_text(s.replace(a,b) if c==0 else s.replace(a,b,c))
sub('tests/panel_drawn.cpp',"old","new")
sub('src/app/panel/PanelShading.h',"old","new")
E`;

test('KF-40: an inline edit through a local helper is read, not crashed on, and names the files it writes', () => {
  const dir = fresh('kf40-');
  const ws = writesOf({ tool_name: 'Bash', cwd: dir, tool_input: { command: HELPER_EDIT } }, dir, process.env);
  assert.deepEqual(ws.map((w) => w.path).sort(), [join(dir, 'src/app/panel/PanelShading.h'), join(dir, 'tests/panel_drawn.cpp')]);
  assert.ok(ws.every((w) => w.after === null), 'what it writes is not known');
});

test('KF-40: the same edit passes through every base hook with no crash logged', () => {
  const dir = installed();
  const hooks = ['lesson-checks', 'once-only', 'code-shape', 'shape-law', 'making-check'].map((h) => `.claude/hooks/${h}.mjs`);
  const r = runner(dir, bash(dir, HELPER_EDIT), ...hooks);
  assert.doesNotMatch(r.stderr, /failed|TypeError/);
  assert.equal(lines(dir, 'crashes.jsonl').length, 0);
});

test('KF-40: a write whose text no hook could read says so where the author sees it', () => {
  const dir = installed();
  const r = runner(dir, bash(dir, HELPER_EDIT), '.claude/hooks/lesson-checks.mjs');
  assert.equal(r.status, 0);
  const said = JSON.parse(r.stdout);
  assert.match(said.hookSpecificOutput.additionalContext, /tests\/panel_drawn\.cpp/);
  assert.match(said.hookSpecificOutput.additionalContext, /could not read/);
  assert.match(said.systemMessage, /not judged/);
});

test('KF-40: a command that writes what the hooks can read adds nothing', () => {
  const dir = installed();
  const r = runner(dir, bash(dir, "printf 'x\\n' > note.txt"), '.claude/hooks/lesson-checks.mjs');
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
});

test('KF-18: a crash on a tool call refuses once and says so; the same call again goes through, logged', () => {
  const dir = installed();
  const planted = plantCrash(dir);
  const event = bash(dir, 'echo one');
  const first = runner(dir, event, planted);
  assert.equal(first.status, 2);
  assert.match(first.stderr, /planted crashed/);
  assert.match(first.stderr, /not judged/);
  assert.match(first.stderr, /same call again/);
  const second = runner(dir, event, planted);
  assert.equal(second.status, 0);
  assert.match(JSON.parse(second.stdout).systemMessage, /planted crashed/);
  assert.equal(runner(dir, bash(dir, 'echo two'), planted).status, 2, 'another call is refused in its turn');
});

test('KF-40: a crash is its own kind of entry, not a refusal', () => {
  const dir = installed();
  const planted = plantCrash(dir);
  runner(dir, bash(dir, 'echo one'), planted);
  assert.equal(lines(dir, 'refusals.jsonl').length, 0);
  const [c] = lines(dir, 'crashes.jsonl');
  assert.equal(c.hook, 'planted');
  assert.equal(c.command, 'echo one');
  assert.match(c.reason, /planted crash/);
  assert.match(cli(dir, 'logs', 'crashes').stdout, /planted/);
  assert.match(cli(dir, 'logs', 'refusals').stdout, /^0 refusal/m);
});

test('KF-18: a crash at Stop or at a prompt refuses nothing, and tells the author', () => {
  const dir = installed();
  const planted = plantCrash(dir);
  for (const hook_event_name of ['Stop', 'UserPromptSubmit']) {
    const r = runner(dir, { hook_event_name, session_id: 's1', cwd: dir }, planted);
    assert.equal(r.status, 0);
    assert.match(JSON.parse(r.stdout).systemMessage, /planted crashed/);
  }
});

test('KF-18: a crash left in the old form, in refusals.jsonl, reads as a crash', () => {
  const dir = installed();
  mkdirSync(join(dir, '.claude/logs'), { recursive: true });
  writeFileSync(join(dir, '.claude/logs/refusals.jsonl'), `${JSON.stringify({ id: 'aaaa1111', t: '2026-11-05T12:00:00.000Z', hook: 'lesson-checks', code: 1, reason: 'run-hooks: lesson-checks failed: TypeError' })}\n`);
  assert.match(cli(dir, 'logs', 'refusals').stdout, /^0 refusal/m);
  assert.match(cli(dir, 'logs', 'crashes').stdout, /lesson-checks/);
});

const crashLine = (ms) => `${new Date(Date.now() + ms).toISOString()}\tPreToolUse\tfolder-law\t3\t1\tWrite\n`;

test('KF-18: a crash fixed by hand clears with a stated reason, and a later crash is red again', () => {
  const dir = installed();
  const log = join(dir, '.claude/hooks.log');
  writeFileSync(log, crashLine(-1000 + 60_000));
  assert.equal(cli(dir, 'doctor').status, 1);
  assert.notEqual(cli(dir, 'logs', 'clear', 'folder-law', 'fixed').status, 0, 'a reason is required');
  assert.notEqual(cli(dir, 'logs', 'clear', 'folder-law', 'gone', 'x').status, 0, 'only fixed or superseded');
  assert.notEqual(cli(dir, 'logs', 'clear', 'secrets-guard', 'fixed', 'nothing to clear').status, 0, 'a hook with no crash has nothing to clear');
  const clear = cli(dir, 'logs', 'clear', 'folder-law', 'fixed', 'the', 'config', 'regex', 'was', 'mine');
  assert.equal(clear.status, 0, clear.stdout + clear.stderr);
  // the clear is stamped now and the crash line a minute ahead, so move the line back before the clear, as it really was
  writeFileSync(log, crashLine(-60_000));
  assert.equal(cli(dir, 'doctor').status, 0);
  writeFileSync(log, crashLine(-60_000) + crashLine(120_000));
  const r = cli(dir, 'doctor');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /folder-law\.mjs crashed on 1 call/);
  assert.match(readFileSync(join(dir, '.claude/logs/verdicts.jsonl'), 'utf8'), /the config regex was mine/);
});

test('KF-18: a crash older than a file in hooks/lib is history: an update that fixes a shared lib clears it', () => {
  const dir = installed();
  const hookTime = statSync(join(dir, '.claude/hooks/folder-law.mjs')).mtimeMs;
  writeFileSync(join(dir, '.claude/hooks.log'), `${new Date(hookTime + 5_000).toISOString()}\tPreToolUse\tfolder-law\t3\t1\tWrite\n`);
  assert.equal(cli(dir, 'doctor').status, 1);
  const lib = join(dir, '.claude/hooks/lib/selftest.mjs');
  const later = new Date(hookTime + 10_000);
  execFileSync('touch', ['-d', later.toISOString(), lib]);
  assert.equal(cli(dir, 'doctor').status, 0);
});

test('KF-18: a config regex param-id-lock cannot compile is reported by name, and is no crash', () => {
  const dir = installed('audio-core');
  writeFileSync(join(dir, '.claude/param-ids.config.json'), JSON.stringify({ patterns: ['(?m)^([a-z]+)$'] }));
  const file = join(dir, 'src/params/Ids.h');
  mkdirSync(join(dir, 'src/params'), { recursive: true });
  writeFileSync(file, '// ids\n');
  const r = runner(dir, { hook_event_name: 'PostToolUse', session_id: 's1', cwd: dir, tool_name: 'Write', tool_input: { file_path: file, content: '// ids\n' } }, '.claude/hooks/param-id-lock.mjs');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /param-ids\.config\.json/);
  assert.match(r.stderr, /\(\?m\)/);
  assert.equal(lines(dir, 'crashes.jsonl').length, 0);
});

const juceParam = (id) => `auto p_${id} = juce::ParameterID { "${id}", 1 };\n`;
const paramWrite = (dir, rel, id) => {
  const file = join(dir, rel);
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, juceParam(id));
  return { hook_event_name: 'PostToolUse', cwd: dir, tool_name: 'Write', tool_input: { file_path: file, content: juceParam(id) } };
};

test('KF-15: param-id-lock protects from the first id it sees, with no --init', () => {
  const dir = installed('audio-core');
  assert.equal(hookRun(dir, 'param-id-lock.mjs', paramWrite(dir, 'src/params/Ids.h', 'cutoff')).status, 0);
  assert.deepEqual(JSON.parse(readFileSync(join(dir, '.claude/param-ids.lock.json'), 'utf8')), ['cutoff']);
  assert.equal(hookRun(dir, 'param-id-lock.mjs', paramWrite(dir, 'src/params/Ids.h', 'renamed')).status, 2);
});

test('KF-15: ids under the build output are not the unit\'s, whatever the folder is called', () => {
  const dir = installed('audio-core');
  const layoutFile = join(dir, '.claude/layout.json');
  writeFileSync(layoutFile, JSON.stringify({ ...JSON.parse(readFileSync(layoutFile, 'utf8')), buildOutput: ['elsewhere/**'] }));
  for (const rel of ['elsewhere/_deps/juce/Param.h', 'out/_deps/juce/Param.h']) { mkdirSync(join(dir, rel, '..'), { recursive: true }); writeFileSync(join(dir, rel), juceParam('juceProgramParameter')); }
  assert.equal(hookRun(dir, 'param-id-lock.mjs', paramWrite(dir, 'src/params/Ids.h', 'cutoff')).status, 0);
  assert.deepEqual(JSON.parse(readFileSync(join(dir, '.claude/param-ids.lock.json'), 'utf8')), ['cutoff']);
});

test('KF-15: doctor is red for a unit with parameters the lock cannot see', () => {
  const dir = installed('audio-core');
  mkdirSync(join(dir, 'src/params'), { recursive: true });
  writeFileSync(join(dir, 'src/params/Table.cpp'), 'for (auto& row : rows) layout.add (std::make_unique<juce::AudioParameterFloat> (row.id, row.name, row.range, row.init));\n');
  const r = cli(dir, 'doctor');
  assert.match(r.stdout, /param-id-lock.*no ids/s);
  writeFileSync(join(dir, '.claude/param-ids.lock.json'), '["cutoff"]\n');
  assert.doesNotMatch(cli(dir, 'doctor').stdout, /param-id-lock.*no ids/s);
});

test('KF-23: suite-once sees the whole suite through the project\'s own wrapper', () => {
  const dir = installed();
  const layoutFile = join(dir, '.claude/layout.json');
  writeFileSync(layoutFile, JSON.stringify({ ...JSON.parse(readFileSync(layoutFile, 'utf8')), commands: { test: 'tools/build.sh test' } }));
  writeFileSync(join(dir, 'a.txt'), 'one\n');
  execFileSync('git', ['-c', 'user.email=t@l', '-c', 'user.name=t', 'add', 'a.txt'], { cwd: dir });
  execFileSync('git', ['-c', 'user.email=t@l', '-c', 'user.name=t', 'commit', '-qm', 'x', '--', 'a.txt'], { cwd: dir });
  writeFileSync(join(dir, 'a.txt'), 'two\n');
  const status = (command) => hookRun(dir, 'suite-once.mjs', bash(dir, command)).status;
  for (const command of ['tools/build.sh test --full-gate', 'tools/build.sh test', 'bash tools/build.sh test --full-gate', './tools/build.sh test', 'tools/build.sh test --full-gate > /tmp/log 2>&1 &', 'nohup tools/build.sh test --full-gate &']) assert.equal(status(command), 2, command);
  for (const command of ['tools/build.sh test control_input', 'tools/build.sh build', "echo 'tools/build.sh test'"]) assert.equal(status(command), 0, command);
});

const push = (dir, command) => hookRun(dir, 'git-guard.mjs', bash(dir, command));

test('KF-8: a new install has the house laws: a force push is refused on its first day', () => {
  const dir = installed();
  const { guards } = JSON.parse(readFileSync(join(dir, '.claude/layout.json'), 'utf8'));
  assert.equal(guards.git.house, true);
  assert.equal(guards.git.ghAuth, 'cli');
  assert.equal(push(dir, 'git push --force origin work/x').status, 2);
});

test('KF-8: an update never switches them on; `enable` does', () => {
  const dir = installed();
  const layoutFile = join(dir, '.claude/layout.json');
  const { guards, ...old } = JSON.parse(readFileSync(layoutFile, 'utf8'));
  writeFileSync(layoutFile, JSON.stringify(old));
  run(dir, 'update');
  assert.equal(JSON.parse(readFileSync(layoutFile, 'utf8')).guards, undefined);
  assert.equal(push(dir, 'git push --force origin work/x').status, 0, 'an existing project is unchanged');
  writeFileSync(layoutFile, JSON.stringify({ ...JSON.parse(readFileSync(layoutFile, 'utf8')), enable: ['guards/git-house'] }));
  assert.equal(push(dir, 'git push --force origin work/x').status, 2);
});

test('KF-8: a re-init of an installed project leaves its guards alone', () => {
  const dir = installed();
  const layoutFile = join(dir, '.claude/layout.json');
  const { guards, ...old } = JSON.parse(readFileSync(layoutFile, 'utf8'));
  writeFileSync(layoutFile, JSON.stringify(old));
  run(dir, 'init', '--config', 'base');
  assert.equal(JSON.parse(readFileSync(layoutFile, 'utf8')).guards, undefined);
});

const withGit = (dir, git) => {
  const layoutFile = join(dir, '.claude/layout.json');
  writeFileSync(layoutFile, JSON.stringify({ ...JSON.parse(readFileSync(layoutFile, 'utf8')), guards: { git } }));
};

test('KF-12: with no owner, a push over SSH or through git\'s own login is not refused for naming no token', () => {
  const dir = installed();
  execFileSync('git', ['remote', 'add', 'origin', 'git@github.com:some-org/app.git'], { cwd: dir });
  assert.equal(push(dir, 'git push origin work/x').status, 0);
  withGit(dir, { house: true, ghAuth: 'cli' });
  execFileSync('git', ['remote', 'set-url', 'origin', 'https://github.com/some-org/app.git'], { cwd: dir });
  assert.equal(push(dir, 'git push origin work/x').status, 0);
});

test('KF-12: GH_TOKEN naming a variable nothing sets is refused, and the refusal names the way out', () => {
  const dir = installed();
  withGit(dir, { house: true, ghAuth: 'token', tokenVar: 'KF_TOKEN_NOT_SET' });
  const r = push(dir, 'GH_TOKEN=$KF_TOKEN_NOT_SET gh pr list');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /KF_TOKEN_NOT_SET is not set/);
  assert.match(r.stderr, /"ghAuth": "cli"/);
  assert.equal(push(dir, 'source ~/.env && GH_TOKEN=$KF_TOKEN_NOT_SET gh pr list').status, 0, 'a command that loads it may set it');
  assert.match(push(dir, 'gh pr list').stderr, /"ghAuth": "cli"/, 'the setting is named where it is needed');
  assert.ok(existsSync(join(dir, '.claude/layout.json')));
});

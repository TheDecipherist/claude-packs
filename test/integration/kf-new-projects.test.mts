// 1.1.0, group 3: what a new project met on the MPX 500 build (KF-1, 3, 4, 5, 6, 7, 9, 11, 16, 29, 37, 38, 41). Each test was seen red first (docs/1.1-progress.md).
import { KIT, assert, cli, existsSync, fresh, hookRun, join, readFileSync, spawnSync, test } from '../kit-cli.mts';
import { plantGovernorJob } from '../governor-plant.mts';
import type { Spawned } from '../kit-cli.mts';
import { lockOf } from '../fixtures/installs.mts';
import { putIn, unit } from './new-project-rig.mts';

const pack = (rel: string): string => readFileSync(join(KIT, 'packs', rel), 'utf8');
const bash = (dir: string, command: string): Spawned => hookRun(dir, 'build-guard.mjs', { hook_event_name: 'PreToolUse', cwd: dir, tool_name: 'Bash', tool_input: { command } });

test('KF-1: the kit ships the queue build-guard sends you to', () => {
  const dir = unit();
  const tool = join(dir, '.claude/tools/buildq.mjs');
  assert.ok(existsSync(tool));
  const r = bash(dir, 'cmake --build build --target x');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /\.claude\/tools\/buildq\.mjs/);
  assert.doesNotMatch(r.stderr, /~\/\.claude\/bin\/buildq/);
  assert.equal(bash(dir, 'node .claude/tools/buildq.mjs cmake --build build --target x').status, 0);
});

test('KF-1, KF-37: the queue runs the command and ends with its status, never a later one', () => {
  const dir = unit();
  const tool = join(dir, '.claude/tools/buildq.mjs');
  const governor = join(dir, 'governor');   // W8.8: the queue's slots are the governor's
  const env = { ...process.env, CLAUDE_PACKS_GOVERNOR_DIR: governor, CLAUDE_PACKS_GOVERNOR_CORES: '4', CLAUDE_PACKS_GOVERNOR_LOAD: '0' };
  assert.equal(spawnSync('node', [tool, 'bash', '-c', 'exit 7'], { env, encoding: 'utf8' }).status, 7);
  assert.equal(spawnSync('node', [tool, 'true'], { env, encoding: 'utf8' }).status, 0);
  assert.match(spawnSync('node', [tool, '--status'], { env, encoding: 'utf8' }).stdout, /0 of 2 slots/);
  plantGovernorJob(governor, 999999999, 2);
  assert.equal(spawnSync('node', [tool, 'true'], { env, encoding: 'utf8', timeout: 20000 }).status, 0, 'a dead holder frees its slot');
});

test('KF-3: a project at its start is read from its notes, and is told it was', () => {
  const dir = fresh('kf3-');
  putIn(dir, 'PROMPT.md', 'Rebuild the unit as a JUCE plugin in C++. It has a front panel, a reverb, MIDI, and tools in Python.\n');
  const r = cli(dir, 'suggest');
  assert.match(r.stdout, /configuration: synth-creator/);
  for (const name of ['audio-core', 'cpp', 'midi', 'sound-design', 'instrument-shell', 'python']) assert.match(r.stdout, new RegExp(`^  ${name} +.*notes`, 'm'), name);
  assert.match(r.stdout, /no source yet/);
  assert.doesNotMatch(r.stdout, /left out, nothing here needs them/);
  assert.match(r.stdout, /not named yet/);
});

test('KF-3: source decides once it exists: a word in the notes adds nothing', () => {
  const dir = fresh('kf3b-');
  putIn(dir, 'README.md', 'Maybe JUCE one day.\n');
  putIn(dir, 'src/a.py', 'print(1)\n');
  const r = cli(dir, 'suggest');
  assert.doesNotMatch(r.stdout, /audio-core +/);
  assert.doesNotMatch(r.stdout, /no source yet/);
});

test('KF-4: the lock records every pack installed', () => {
  const dir = unit();
  const lock = lockOf(dir) as { installed: string[]; packs: string[] };
  for (const name of ['base', 'audio-core', 'synth-creator', 'writing', 'hook-proof']) assert.ok(lock.installed.includes(name), name);
  assert.ok(!lock.packs.includes('synth-creator'), 'packs stays what was asked for');
});

test('KF-5: one first line of processBlock, in both rules', () => {
  const denormals = pack('audio-core/rules/scoped-no-denormals.md');
  const timing = pack('synth-creator/rules/timing-from-synthcore.md');
  assert.match(denormals, /readTransport/);
  assert.match(timing, /second line of `processBlock`/);
  assert.doesNotMatch(timing, /the first line of `processBlock`/);
});

test('KF-6: artwork: an original never copies it, and a reproduction may when the brief says so', () => {
  for (const rel of ['reverse-engineering/rules/reproduction-or-original.md', 'instrument-shell/rules/render-the-extremes.md']) {
    const text = pack(rel);
    assert.match(text, /"artwork": "verbatim"/, rel);
    assert.doesNotMatch(text, /^- Copy the (?:machine's )?artwork[.:]/m, rel);
  }
});

test('KF-7: an unattended run has a law, in every install', () => {
  const dir = unit();
  const rule = readFileSync(join(dir, '.claude/rules/unattended-runs.md'), 'utf8');
  assert.match(rule, /takes the recommended choice/);
  assert.match(rule, /decisions/);
});

test('straight-on-and-aligned loads where the analysis happens', () => {
  const dir = unit();
  const rule = readFileSync(join(dir, '.claude/rules/straight-on-and-aligned.md'), 'utf8');
  assert.match(rule, /design\/\*\*/);
  assert.match(rule, /tools\/\*panel\*/);
  assert.match(rule, /src\/app/);
});

test('KF-11: gather-sources says what to do with a source that cannot be fetched', () => {
  const text = pack('reverse-engineering/skills/gather-sources/SKILL.md');
  assert.match(text, /cannot be fetched/);
  assert.match(text, /what it would have settled/);
});

test('KF-16: a rising run may be pointers', () => {
  const text = pack('reverse-engineering/rules/addresses-name-their-space.md');
  assert.match(text, /rising/);
  assert.match(text, /pointer table/);
});

test('KF-29: the worst-block rule can be met on a shared machine, and lists a program load', () => {
  const text = pack('audio-core/rules/cpu-worst-case-per-block.md');
  assert.match(text, /least time per block/);
  assert.match(text, /control/);
  assert.match(text, /program load/);
});

test('KF-37: the queue skill says a background job\'s status is its last command\'s', () => {
  assert.match(pack('synth-creator/skills/build-through-the-queue/SKILL.md'), /last command/);
});

test('KF-38: a licence is read before a source is chosen', () => {
  assert.match(pack('base/rules/plan-and-logs.md'), /before choosing/);
});

test('KF-41: one cheap pass of every instance is asked for, kept apart from the behaviour walks', () => {
  const template = pack('base/rules/test-the-template-once.md');
  assert.match(template, /one cheap pass/);
  assert.match(pack('audio-core/rules/house-control-behaviours.md'), /one cheap pass/);
  const check = JSON.parse(pack('base/checks/one-walk-per-template.json')) as { why: string };
  assert.match(check.why, /every-instance pass/);
});

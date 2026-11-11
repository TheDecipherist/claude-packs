// 1.1.0, group 3: what a new project met on the MPX 500 build (KF-1, 3, 4, 5, 6, 7, 9, 11, 16, 29, 37, 38, 41). Each test was seen red first (docs/1.1-progress.md).
import { KIT, assert, cli, execFileSync, existsSync, fresh, hookRun, join, mkdirSync, readFileSync, rmSync, spawnSync, test, writeFileSync } from './kit-cli.mts';

const put = (dir, rel, text) => { mkdirSync(join(dir, rel, '..'), { recursive: true }); writeFileSync(join(dir, rel), text); };
const pack = (rel) => readFileSync(join(KIT, 'packs', rel), 'utf8');
function unit(...args) {
  const dir = fresh('kfn-');
  execFileSync('git', ['init', '-q', '--initial-branch', 'work/x'], { cwd: dir });
  assert.equal(cli(dir, 'init', ...(args.length ? args : ['audio-core'])).status, 0);
  return dir;
}
const withLayout = (dir, extra) => { const f = join(dir, '.claude/layout.json'); writeFileSync(f, JSON.stringify({ ...JSON.parse(readFileSync(f, 'utf8')), ...extra })); };
const bash = (dir, command) => hookRun(dir, 'build-guard.mjs', { hook_event_name: 'PreToolUse', cwd: dir, tool_name: 'Bash', tool_input: { command } });

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
  const env = { ...process.env, BUILDQ_DIR: join(dir, 'slots') };
  assert.equal(spawnSync('node', [tool, 'bash', '-c', 'exit 7'], { env, encoding: 'utf8' }).status, 7);
  assert.equal(spawnSync('node', [tool, 'true'], { env, encoding: 'utf8' }).status, 0);
  assert.match(spawnSync('node', [tool, '--status'], { env, encoding: 'utf8' }).stdout, /0 of 2 slots/);
  mkdirSync(join(env.BUILDQ_DIR, 'slot-0'), { recursive: true });
  writeFileSync(join(env.BUILDQ_DIR, 'slot-0/pid'), '999999999\n');
  assert.equal(spawnSync('node', [tool, 'true'], { env, encoding: 'utf8', timeout: 20000 }).status, 0, 'a dead holder frees its slot');
});

test('KF-1: doctor is red when the queue is gone, and for a wrapper that queues nothing', () => {
  const dir = unit();
  const says = () => cli(dir, 'doctor').stdout;
  assert.doesNotMatch(says(), /queue/i);
  withLayout(dir, { commands: { build: 'tools/build.sh build' } });
  put(dir, 'tools/build.sh', '#!/bin/sh\ncmake --build out\n');
  assert.match(says(), /tools\/build\.sh does not call the queue/);
  put(dir, 'tools/build.sh', '#!/bin/sh\nnode .claude/tools/buildq.mjs cmake --build out\n');
  assert.doesNotMatch(says(), /does not call the queue/);
  put(dir, 'tools/build.sh', '#!/bin/sh\ncmake --build out\n');
  withLayout(dir, { guards: { build: { queue: 'none: it holds two slots itself, through flock' } } });
  assert.doesNotMatch(says(), /does not call the queue/);
  rmSync(join(dir, '.claude/tools/buildq.mjs'));
  assert.match(says(), /build-guard sends every build to \.claude\/tools\/buildq\.mjs, which is missing/);
});

test('KF-3: a project at its start is read from its notes, and is told it was', () => {
  const dir = fresh('kf3-');
  put(dir, 'PROMPT.md', 'Rebuild the unit as a JUCE plugin in C++. It has a front panel, a reverb, MIDI, and tools in Python.\n');
  const r = cli(dir, 'suggest');
  assert.match(r.stdout, /configuration: synth-creator/);
  for (const name of ['audio-core', 'cpp', 'midi', 'sound-design', 'instrument-shell', 'python']) assert.match(r.stdout, new RegExp(`^  ${name} +.*notes`, 'm'), name);
  assert.match(r.stdout, /no source yet/);
  assert.doesNotMatch(r.stdout, /left out, nothing here needs them/);
  assert.match(r.stdout, /not named yet/);
});

test('KF-3: source decides once it exists: a word in the notes adds nothing', () => {
  const dir = fresh('kf3b-');
  put(dir, 'README.md', 'Maybe JUCE one day.\n');
  put(dir, 'src/a.py', 'print(1)\n');
  const r = cli(dir, 'suggest');
  assert.doesNotMatch(r.stdout, /audio-core +/);
  assert.doesNotMatch(r.stdout, /no source yet/);
});

test('KF-4: the lock records every pack installed', () => {
  const dir = unit();
  const lock = JSON.parse(readFileSync(join(dir, '.claude/claude-packs.lock.json'), 'utf8'));
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

test('KF-9: doctor --strict passes on a new project, with no code and with its first file', () => {
  const dir = unit();
  assert.equal(cli(dir, 'doctor', '--strict').status, 0);
  put(dir, 'src/dsp/Filter.cpp', 'float gain = 1.0f;\n');
  const named = [...cli(dir, 'doctor').stdout.match(/answers to: ([^\n]*)/)[1].split(', ')];
  withLayout(dir, { ruleTests: Object.fromEntries(named.map((r) => [r, 'none: the first file; its tests come with the next step'])) });
  const strict = cli(dir, 'doctor', '--strict');
  assert.equal(strict.status, 0, strict.stdout);
  assert.match(strict.stdout, /wait for their first file/);
});

test('KF-9: a rule whose folder holds files and none it matches is still dead', () => {
  const dir = unit();
  const f = join(dir, '.claude/rules/my-rule.md');
  writeFileSync(f, '---\npaths:\n  - "src/dsp/**/*.wgsl"\n---\n\n# x\n');
  put(dir, 'src/dsp/Filter.cpp', 'float gain = 1.0f;\n');
  assert.match(cli(dir, 'doctor', '--strict').stdout, /match no file yet, so they never fire: [^\n]*my-rule\.md/);
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
  const check = JSON.parse(pack('base/checks/one-walk-per-template.json'));
  assert.match(check.why, /every-instance pass/);
});

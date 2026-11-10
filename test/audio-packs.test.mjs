// 0.28.0: packs from the playbook of rebuilding classic machines from firmware. Their laws come from failures that passed every test: nine units deaf to the
// transport, 272 of 625 presets on defaults, one DSP path behind 15 algorithms. The checks here are mostly guards against those coming back.
import { KIT, assert, cli, execFileSync, existsSync, fresh, holdsEachCase, hookRun, join, mkdirSync, readFileSync, test, writeFileSync } from './kit-cli.mjs';

holdsEachCase([
  ['midi', 'src/in.cpp', 'int k = b & 0xF0;\n', 'if (b >= 0xF8) { rt (b); return; }\nint k = b & 0xF0;\n'],
  ['midi', 'src/rt.cpp', 'if (b >= 0xF8) ++pulses;\n', 'if (b == 0xF8) ++pulses;\n'],
  ['midi', 'src/host.cpp', 'bpm.store (tempo);\n', 'resolveTempo (bpm.load(), transport);\n'],
  ['midi', 'src/load.cpp', 'loadPatch (m.getSysExData(), n);\n', 'sysexInbox.push (m);\n'],
  ['sound-design', 'src/noise.cpp', 'std::mt19937 rng{std::random_device{}()};\n', 'std::mt19937 rng{kNoiseSeed};\n'],
  ['sound-design', 'src/voice.cpp', 'cut += kt * (note - 60) / 12.0;\n', 'cut += kt * (note - kKeyAnchor) / 12.0;\n'],
  ['sound-design', 'src/fx.cpp', 'out = wet * mix;\n', 'out = dry * c + wet * s;\n'],
  ['reverse-engineering', 'src/law.cpp', 'kDrive = 1.7f; // sounds right\n', 'kDrive = 1.7f; // [EAR] ledger row 12\n'],
  ['reverse-engineering', 'src/rom.cpp', `const uint8_t curve[] = {${Array.from({ length: 40 }, (_, i) => i).join(', ')}};\n`, 'const int steps[] = {1, 2, 4, 8};\n'],
  ['instrument-shell', 'src/state.cpp', 'sm.append (&s, sizeof (State));\n', 'writeBlob (sm, s);\n'],
  ['cpp', 'src/a.h', 'inline constexpr Preset kFactory[] = {};\n', 'inline constexpr Preset kFactory[] = { Preset {} };\n'],
  ['cpp', 'src/b.cpp', 'const double w = 2.0 * M_PI * f;\n', 'const double w = 2.0 * std::numbers::pi * f;\n'],
], '--config', 'synth-creator');

test('the full law of the clock travels with its skill, in neutral words', () => {
  const law = readFileSync(join(KIT, 'packs/midi/skills/clock-probe/clock-law.md'), 'utf8');
  assert.match(law, /There is no tempo message/);
  assert.match(law, /Never write the resolved tempo back/);
  assert.doesNotMatch(law, /ShellHost|synthshell/);
});

test('firmware stays out of git, a named fixture may stay in', () => {
  const dir = fresh('ap-fw-');
  execFileSync('git', ['init', '-q'], { cwd: dir });
  assert.equal(cli(dir, 'init', 'reverse-engineering', '--config', 'cpp').status, 0);
  mkdirSync(join(dir, 'roms'));
  mkdirSync(join(dir, 'tests/fixtures'), { recursive: true });
  writeFileSync(join(dir, 'roms/os.bin'), 'x');
  writeFileSync(join(dir, 'tests/fixtures/one.syx'), 'x');
  const add = (p) => hookRun(dir, 'firmware-out-of-git.mjs', { tool_name: 'Bash', tool_input: { command: `git add ${p}` }, cwd: dir }).status;
  assert.equal(add('roms/os.bin'), 2);
  assert.equal(add('tests/fixtures/one.syx'), 2);
  const file = join(dir, '.claude/layout.json');
  writeFileSync(file, JSON.stringify({ ...JSON.parse(readFileSync(file, 'utf8')), guards: { firmware: { fixtures: ['tests/fixtures/**'] } } }));
  assert.equal(add('tests/fixtures/one.syx'), 0);
});

test('a download marker that breaks a Windows checkout is refused', () => {
  const dir = fresh('ap-zone-');
  execFileSync('git', ['init', '-q'], { cwd: dir });
  assert.equal(cli(dir, 'init', '--config', 'base').status, 0);
  writeFileSync(join(dir, 'book.pdf:Zone.Identifier'), 'x');
  assert.equal(hookRun(dir, 'repo-litter.mjs', { tool_name: 'Bash', tool_input: { command: 'git add book.pdf:Zone.Identifier' }, cwd: dir }).status, 2);
});

test('the synth-rebuild preset takes all four, and suggest finds them from a project', () => {
  const dir = fresh('ap-preset-');
  cli(dir, 'init', 'synth-rebuild');   // a synth's doctor also asks for design/shape.json, which is not this test's
  for (const f of ['rules/two-sources-before-naming.md', 'rules/sysex-is-a-record.md', 'rules/neutral-is-exact.md', 'rules/session-blob-append-only.md', 'skills/clock-probe/clock-law.md']) assert.ok(existsSync(join(dir, '.claude', f)), f);
  const app = fresh('ap-suggest-');
  mkdirSync(join(app, 'src'));
  for (const f of ['src/Voice.cpp', 'src/PluginEditor.cpp', 'src/SysexIO.cpp', 'src/PluginProcessor.cpp']) writeFileSync(join(app, f), '// x\n');
  const said = cli(app, 'suggest').stdout;
  for (const p of ['midi', 'sound-design', 'instrument-shell']) assert.match(said, new RegExp(`^ +${p} `, 'm'), p);
});

test('reproduction or original decides the aliasing law', () => {
  const rule = readFileSync(join(KIT, 'packs/audio-core/rules/oscillators-bandlimited.md'), 'utf8');
  assert.match(rule, /guards\.instrument\.kind/);
  assert.match(readFileSync(join(KIT, 'packs/reverse-engineering/rules/reproduction-or-original.md'), 'utf8'), /"kind": "reproduction"/);
});

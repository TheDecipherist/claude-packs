// 0.10.0 (STEP 3 item 1): a configuration is data. configurations/<name>/config.json names its packs, its layout
// template, its hook order and the house-rules preamble of its CLAUDE.md block. `init --config <name>` stores the choice in
// layout.json "configuration", `update` applies that one, `config <name>` switches and lists what changes, `configs` lists
// them and doctor prints the one installed (KWB-31).
import { assert, cli, existsSync, fresh, join, readFileSync, run, test, writeFileSync } from './kit-cli.mjs';

const project = () => fresh('cfg-');
const layoutOf = (dir) => JSON.parse(readFileSync(join(dir, '.claude/layout.json'), 'utf8'));
const lockOf = (dir) => JSON.parse(readFileSync(join(dir, '.claude/claude-packs.lock.json'), 'utf8'));
const SYNTH_LINE = 'Put drawing code in audio or world folders';

test('configs lists every configuration with what it installs', () => {
  const out = run(project(), 'configs');
  for (const name of ['base', 'synth-creator']) assert.match(out, new RegExp(`^${name}\\b`, 'm'), name);
  assert.match(out, /synth-creator[\s\S]*packs: base, synth-creator, writing, hook-proof \(always\); cpp, audio-core, gpu-painter, stellix, python, shell, ci \(to choose\)/);
  assert.match(out, /rules \d+, hooks \d+, checks \d+, skills \d+/);
});

test('init --config stores the configuration, update applies it, doctor prints it', () => {
  const dir = project();
  run(dir, 'init', 'audio-core', '--config', 'synth-creator');
  assert.equal(layoutOf(dir).configuration, 'synth-creator');
  assert.match(readFileSync(join(dir, 'CLAUDE.md'), 'utf8'), new RegExp(SYNTH_LINE));
  assert.match(run(dir, 'doctor'), /configuration: synth-creator/);
  assert.match(run(dir, 'update'), /configuration: synth-creator/);
  assert.equal(layoutOf(dir).configuration, 'synth-creator');
});

test('init --config base: base alone, its own preamble, no synth folders or lines', () => {
  const dir = project();
  const out = run(dir, 'init', '--config', 'base');
  assert.match(out, /OK: base/);
  assert.deepEqual(lockOf(dir).packs, ['base']);
  assert.equal(layoutOf(dir).configuration, 'base');
  const md = readFileSync(join(dir, 'CLAUDE.md'), 'utf8');
  assert.doesNotMatch(md, new RegExp(SYNTH_LINE));
  assert.doesNotMatch(md, /used to build synths/);
  assert.match(md, /Route around a block/);
});

test('a pack outside the configuration is refused, naming the ones it takes', () => {
  const dir = project();
  const r = cli(dir, 'init', 'audio-core', '--config', 'base');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /audio-core is not in configuration base/);
  assert.ok(!existsSync(join(dir, '.claude/layout.json')), 'nothing was installed');
  assert.match(cli(dir, 'init', '--config', 'nope').stderr, /unknown configuration "nope" \(available: .*base.*synth-creator/);
});

test('init without --config takes the configuration its packs belong to', () => {
  const synth = project();
  run(synth, 'init', 'audio-core', 'gpu-painter');
  assert.equal(layoutOf(synth).configuration, 'synth-creator');
});

test('a layout without the key (an install before 0.10.0) gets the configuration of its packs on update', () => {
  const dir = project();
  run(dir, 'init', 'audio-core');
  const layout = layoutOf(dir);
  delete layout.configuration;
  writeFileSync(join(dir, '.claude/layout.json'), JSON.stringify(layout, null, 2));
  assert.match(run(dir, 'update'), /configuration: synth-creator \(from its packs: base, audio-core\)/);
  assert.equal(layoutOf(dir).configuration, 'synth-creator');
});

test('config <name> lists what changes and switches; --dry-run changes nothing', () => {
  const dir = project();
  run(dir, 'init', 'audio-core');
  const dry = run(dir, 'config', 'base', '--dry-run');
  assert.match(dry, /synth-creator -> base/);
  assert.match(dry, /packs dropped: audio-core/);
  assert.match(dry, /rules removed \(\d+\):.*math-domain-guards\.md/);
  assert.match(dry, /hooks removed \(\d+\):.*realtime-guard\.mjs/);
  assert.match(dry, /CLAUDE\.md preamble: changes/);
  assert.match(dry, /dry run: nothing changed/);
  assert.equal(layoutOf(dir).configuration, 'synth-creator');
  assert.ok(existsSync(join(dir, '.claude/rules/math-domain-guards.md')));

  run(dir, 'config', 'base');
  assert.equal(layoutOf(dir).configuration, 'base');
  assert.deepEqual(lockOf(dir).packs, ['base']);
  assert.ok(!existsSync(join(dir, '.claude/rules/math-domain-guards.md')), 'the synth rules went');
  assert.doesNotMatch(readFileSync(join(dir, 'CLAUDE.md'), 'utf8'), new RegExp(SYNTH_LINE));
  assert.match(run(dir, 'config', 'base'), /no change/);
});

test('doctor fails on a configuration the kit does not have, and on a pack outside it', () => {
  const dir = project();
  run(dir, 'init', 'audio-core');
  const lf = join(dir, '.claude/layout.json');
  writeFileSync(lf, JSON.stringify({ ...layoutOf(dir), configuration: 'gone' }, null, 2));
  assert.match(cli(dir, 'doctor').stdout, /PROBLEM: layout\.json names configuration "gone"/);
  writeFileSync(lf, JSON.stringify({ ...layoutOf(dir), configuration: 'base' }, null, 2));
  assert.match(cli(dir, 'doctor').stdout, /PROBLEM: pack audio-core is installed but configuration base does not take it/);
});

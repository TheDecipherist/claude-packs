// 1.1.0: the offline VST3 renderer, from a project where it had been run on JE8086 and Osirus. It reaches a project through sound-design. Compiling it
// needs a JUCE checkout, which this suite does not have, so what a real plugin did is measured by hand and recorded in the CHANGELOG.
import { KIT, assert, cli, execFileSync, existsSync, fresh, join, mkdirSync, readFileSync, spawnSync, test } from './kit-cli.mts';

const TOOL = join(KIT, 'packs/sound-design/tools/vst3host');
const FILES = ['build.sh', 'host_events.h', 'options.h', 'render.cpp', 'session.h'];

test('sound-design installs the renderer and its skill', () => {
  const dir = fresh('vst3-');
  execFileSync('git', ['init', '-q'], { cwd: dir });
  cli(dir, 'init', 'synth-rebuild', '--config', 'synth-creator'); // a new synth's doctor is red until design/shape.json is written, which is not this test
  for (const f of FILES) assert.ok(existsSync(join(dir, '.claude/tools/vst3host', f)), f);
  assert.ok(existsSync(join(dir, '.claude/skills/bounce-a-plugin/SKILL.md')));
});

test('the plugin is an argument: no machine is built in', () => {
  for (const f of FILES) assert.doesNotMatch(readFileSync(join(TOOL, f), 'utf8'), /JE8086|Osirus|JP-8000|Library\/Audio/i, f);
  assert.match(readFileSync(join(TOOL, 'options.h'), 'utf8'), /name the plugin: --vst3 <path>/);
});

test('it links no JUCE: that is why it can load what a JUCE host cannot', () => {
  for (const f of FILES.filter((x) => x !== 'build.sh')) assert.doesNotMatch(readFileSync(join(TOOL, f), 'utf8'), /#include\s+[<"](?:juce|JuceHeader)/i, f);
});

test('a host that hands a plugin fewer buses than it declares gets silence: every output bus has a buffer', () => {
  const session = readFileSync(join(TOOL, 'session.h'), 'utf8');
  assert.match(session, /activateBus \(Vst::kAudio, Vst::kOutput, bus, true\)/);
  assert.match(session, /data\.numOutputs = \(int32\) outputs/);
  assert.match(session, /data\.outputParameterChanges = &outChanges/);
});

test('build.sh says what is missing when no SDK can be found, and takes VST3_SDK', () => {
  const dir = fresh('nosdk-');
  const none = spawnSync('bash', [join(TOOL, 'build.sh')], { cwd: dir, encoding: 'utf8' });
  assert.equal(none.status, 1);
  assert.match(none.stderr, /no VST3 SDK found/);
  mkdirSync(join(dir, 'out/dev/_deps/juce-src/modules/juce_audio_processors_headless/format_types/VST3_SDK/public.sdk'), { recursive: true });
  const found = spawnSync('bash', [join(TOOL, 'build.sh'), join(dir, 'bin')], { cwd: dir, encoding: 'utf8' });
  assert.doesNotMatch(found.stderr, /no VST3 SDK found/, 'the JUCE 9 path is read');
});

test('comparing with the machine: a patch is matched by name, a recording stays out of git, and nothing claims a percentage', () => {
  const skill = readFileSync(join(KIT, 'packs/sound-design/skills/compare-to-the-machine/SKILL.md'), 'utf8');
  assert.ok(skill.length < 8000);
  assert.match(skill, /^description: Use when/m);
  for (const lesson of [/Match by \*\*name\*\*, never by number alone/, /A multi or combination's name is not the sound's/, /planted fault/, /give a percentage/, /Commit a recording/]) assert.match(skill, lesson);
});

test('the skill carries what it took to learn', () => {
  const skill = readFileSync(join(KIT, 'packs/sound-design/skills/bounce-a-plugin/SKILL.md'), 'utf8');
  assert.ok(skill.length < 8000);
  for (const lesson of [/--boot 12/, /--dump-params/, /returns silence, not an error/, /id, never the row number/, /cracked or unlicensed/]) assert.match(skill, lesson);
});

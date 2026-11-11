// planner W6: the claude.ai skills that plan a build. They must agree with the kit to the letter, so they are held here: their size and
// trigger form, no placeholder left, no command, flag or skill the kit lacks, one skill per intent, and the bundle claude.ai takes.
// Python's zipfile reads the bundle back, so the zip is judged by another reader than the code that wrote it.
import { CLI, KIT, assert, cli, execFileSync, existsSync, fresh, join, readdirSync, readFileSync, spawnSync, test, writeFileSync } from './kit-cli.mts';
import { CLAUDE_AI_SKILLS, claudeAiDescriptions, claudeAiSkillFiles, skillFor } from '../lib/planner.mjs';

const PLANNER = join(KIT, 'planner');
const SKILLS = readdirSync(PLANNER, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
const filesOf = (skill) => readdirSync(join(PLANNER, skill)).filter((f) => f.endsWith('.md')).map((f) => join(skill, f));
const text = (rel) => readFileSync(join(PLANNER, rel), 'utf8');
const unfenced = (t) => t.replace(/^(```+|~~~+)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, '');

test('every planner SKILL.md is under 8,000 characters and its description starts "Use when"', () => {
  assert.deepEqual(SKILLS.sort(), ['start-a-build', 'ui-mockup', 'workorder-writer']);
  for (const s of SKILLS) {
    const skill = text(join(s, 'SKILL.md'));
    assert.ok(skill.length < 8000, `${s}: ${skill.length} characters`);
    assert.match(skill, /^---\nname: [a-z0-9-]+\ndescription: Use when /, s);
  }
});

test('no planner skill file leaves an angle-bracket placeholder outside a code fence', () => {
  const left = SKILLS.flatMap(filesOf).flatMap((f) => [...unfenced(text(f)).matchAll(/<[^<>\n]+>/g)]
    .map((m) => m[0]).filter((p) => !/^<\/?constraints>$/.test(p)).map((p) => `${f}: ${p}`));
  assert.deepEqual(left, []);
});

// The kit's usage text is the list of what exists: a command is a word at the start of a usage line, a flag any --word in it.
const HELP = execFileSync('node', [CLI], { encoding: 'utf8' });
const COMMANDS = new Set([...HELP.matchAll(/^ {2}([a-z][\w-]*)/gm)].map((m) => m[1]));
const FLAGS = new Set(HELP.match(/--[a-z][\w-]*/g));

test('every command and flag start-a-build prints exists in the kit', () => {
  const said = filesOf('start-a-build').map(text).join('\n');
  const calls = [...said.matchAll(/@thedecipherist\/claude-packs ([a-z][\w-]*)([^\n`]*)/g)];
  assert.ok(calls.length >= 3, `the hand-over prints its commands: ${calls.length}`);
  const missing = calls.flatMap(([, command, rest]) => [
    ...(COMMANDS.has(command) ? [] : [`command ${command}`]),
    ...(rest.match(/--[a-z][\w-]*/g) ?? []).filter((f) => !FLAGS.has(f)).map((f) => `${command} ${f}`)]);
  assert.deepEqual(missing, []);
});

// A skill a planner file names ("the `x` skill", "run `x`", "`x`'s") is one the kit or the planner has.
test('every skill a planner file names exists in the kit or the planner', () => {
  const have = new Set([...SKILLS, ...readdirSync(join(KIT, 'packs')).flatMap((p) => (existsSync(join(KIT, 'packs', p, 'skills')) ? readdirSync(join(KIT, 'packs', p, 'skills')) : []))]);
  const named = SKILLS.flatMap(filesOf).flatMap((f) => [...text(f).matchAll(/`([a-z0-9]+(?:-[a-z0-9]+)+)`(?: skill|'s)|(?:skill|Run|run) `([a-z0-9]+(?:-[a-z0-9]+)+)`/g)]
    .map((m) => [f, m[1] ?? m[2]]));
  assert.ok(named.length >= 5, `the planner names the skills it calls: ${named.length}`);
  assert.deepEqual(named.filter(([, s]) => !have.has(s)).map(([f, s]) => `${f}: ${s}`), []);
});

// What a person types in claude.ai, and the one skill that should start. The kit's trigger-word match (`skillFor`) decides.
const INTENTS = {
  'I want to build a synth': 'workorder-writer',
  'I want to build an effect': 'workorder-writer',
  'How do I start making a plugin?': 'workorder-writer',
  'Write the work order for my effect': 'workorder-writer',
  'Plan this build with me': 'workorder-writer',
  'I want a replica of my old hardware synth': 'workorder-writer',
  'Add a part to my instrument': 'workorder-writer',
  'How do I set up the project for my work order?': 'start-a-build',
  'Install claude-packs for this build': 'start-a-build',
  'Where do I put the order and the design?': 'start-a-build',
  'What do I do next to start the build?': 'start-a-build',
  'How do I set up WSL on Windows for the build?': 'start-a-build',
  'Mock up my panel': 'ui-mockup',
  'Render the UI for my synth\'s screen': 'ui-mockup',
  'Is this render good enough to build from?': 'ui-mockup',
  'How do I make a pad sound?': 'design-a-preset',
  'Review this preset bank': 'design-a-preset',
  'What does my synth need to make bells?': 'design-a-preset',
  'Is 96 voices too heavy?': 'synth-cost',
  'Can a laptop run this many voices?': 'synth-cost',
  'Should effects be per oscillator or global?': 'synth-cost',
};

test('each sentence of the intent table starts exactly one skill, the right one', () => {
  assert.ok(Object.keys(INTENTS).length >= 15);
  const descriptions = claudeAiDescriptions();
  assert.deepEqual(Object.keys(descriptions).sort(), Object.keys(CLAUDE_AI_SKILLS).sort());
  const wrong = Object.entries(INTENTS).map(([s, want]) => [s, want, skillFor(s, descriptions)]).filter(([, want, got]) => got !== want);
  assert.deepEqual(wrong.map(([s, want, got]) => `"${s}": wants ${want}, got ${got}`), []);
});

const unzip = (zip, script) => spawnSync('python3', ['-I', '-c', `import zipfile,sys,json\nz=zipfile.ZipFile(sys.argv[1])\n${script}`, zip], { encoding: 'utf8' });

test('planner-skills --zip writes exactly five zips, each its SKILL.md and its references, as another reader sees them', () => {
  const dir = fresh('planner-zip-');
  const r = cli(dir, 'planner-skills', '--zip', join(dir, 'dist'));
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(readdirSync(join(dir, 'dist')).sort(), Object.keys(CLAUDE_AI_SKILLS).map((n) => `${n}.zip`).sort());
  for (const name of Object.keys(CLAUDE_AI_SKILLS)) {
    const read = unzip(join(dir, 'dist', `${name}.zip`), 'print(json.dumps({"bad": z.testzip(), "names": z.namelist()}))');
    assert.equal(read.status, 0, read.stderr);
    const { bad, names } = JSON.parse(read.stdout);
    assert.equal(bad, null, `${name}: every entry reads back with its checksum`);
    assert.ok(names.includes(`${name}/SKILL.md`), name);
    // what the folder on disk holds (and the templates, for the interview), read here and not by the code that zips
    const { dir: source, also } = CLAUDE_AI_SKILLS[name];
    const onDisk = (folder, to = '') => readdirSync(join(KIT, folder), { recursive: true, withFileTypes: true }).filter((e) => e.isFile())
      .map((e) => `${name}/${to}${join(e.parentPath, e.name).slice(join(KIT, folder).length + 1)}`);
    assert.deepEqual(names.sort(), [...onDisk(source), ...(also ? onDisk(also.from, `${also.to}/`) : [])].sort(), `${name}: its folder and nothing else`);
  }
  // a planted fault: one changed byte in the stored data is seen by the other reader
  const zip = join(dir, 'dist', 'synth-cost.zip');
  const bytes = readFileSync(zip);
  bytes[bytes.indexOf('# What a synth design costs')] ^= 1;
  writeFileSync(join(dir, 'planted.zip'), bytes);
  assert.notEqual(JSON.parse(unzip(join(dir, 'planted.zip'), 'print(json.dumps(z.testzip()))').stdout), null, 'the planted change is caught');
});

test('the README tells how to install the skills in claude.ai, naming every one', () => {
  const readme = readFileSync(join(KIT, 'README.md'), 'utf8');
  const section = readme.slice(readme.indexOf('## Installing the skills in claude.ai'), readme.indexOf('## Questions'));
  assert.match(section, /planner-skills --zip/);
  const page = readme.slice(readme.indexOf('### From an idea to a finished app'), readme.indexOf('## See it work'));
  for (const name of Object.keys(CLAUDE_AI_SKILLS)) assert.ok(page.includes(`\`${name}\``), name);
});

test('the pack skills ride as they are: no planner file is a copy of a pack skill, and no pack holds a planner skill', () => {
  for (const pack of readdirSync(join(KIT, 'packs'))) for (const s of SKILLS) assert.ok(!existsSync(join(KIT, 'packs', pack, 'skills', s)), `${pack}/${s}`);
  for (const s of ['design-a-preset', 'synth-cost']) assert.ok(!existsSync(join(PLANNER, s)), s);
  assert.equal(claudeAiSkillFiles('synth-cost')['synth-cost/SKILL.md'], readFileSync(join(KIT, 'packs/audio-core/skills/synth-cost/SKILL.md'), 'utf8'));
});

test('every place that writes an image prompt puts the words to be drawn in double quotes, and says only quoted text is drawn', () => {
  // 1.6.1: a mock-up whose labels were left unquoted came back with knobs labelled "MIDTIT" and "KERV" that no order named.
  const places = {
    'planner/ui-mockup/SKILL.md': [/every word that must be drawn exactly in double quotes/, /only text in the picture is the text in double quotes/, /misspelled is not a reason to render again/],
    'planner/workorder-writer/questions.md': [/every word to be drawn exactly in double quotes/],
    'planner/ui-mockup/analyse-a-mockup.md': [/a spelling is never a reason to render again/],
    'packs/base/skills/start-from-a-workorder/SKILL.md': [/goes in double quotes/, /only text in the picture is the quoted text/],
  };
  for (const [file, laws] of Object.entries(places)) {
    const body = readFileSync(join(KIT, file), 'utf8');
    for (const law of laws) assert.match(body, law, `${file} lacks ${law}`);
  }
});

test('ui-mockup gives every plugin its settings layer: tabs along the top, scrolling, the standard audio and MIDI rows', () => {
  // 1.7.0: a plugin's own settings own the devices, so the mock-up shows them, and the standalone no Options button
  const law = readFileSync(join(KIT, 'planner/ui-mockup/SKILL.md'), 'utf8');
  for (const part of [/settings layer as a screen of its own/, /tabs along the top, never a menu down the side/, /scrolling/, /"Enable QWERTY"/, /the MIDI inputs as check boxes/, /settings-layer-owns-the-devices/]) assert.match(law, part);
  assert.ok(existsSync(join(KIT, 'packs/audio-core/rules/settings-layer-owns-the-devices.md')), 'the rule it names exists');
});

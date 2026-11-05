// 0.32.0: six real repos read wrongly. A kit rule file taken for reverse-engineering notes, firmware findings not seen at all, a named configuration overruled, control names
// reported as 11,410 secrets, and 1,663 tracked build files read as source.
import { assert, cli, execFileSync, fresh, join, mkdirSync, readFileSync, test, writeFileSync } from './kit-cli.mjs';
import { buildFolders } from '../lib/repo-weight.mjs';
import { SECRETS, maskSecrets } from '../packs/base/hooks/lib/secret-patterns.mjs';

function project(files) {
  const dir = fresh('find-');
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(join(dir, rel, '..'), { recursive: true });
    writeFileSync(join(dir, rel), text);
  }
  return dir;
}
const suggested = (dir) => cli(dir, 'suggest').stdout;
const packLine = (pack) => new RegExp(`^ +${pack} `, 'm');
const SYNTH = { 'src/PluginProcessor.cpp': 'void P::processBlock () {}\n', 'src/PluginEditor.cpp': '// x\n' };

test('the kit\'s own files in a project are no evidence about it', () => {
  const said = suggested(project({ ...SYNTH, '.claude/rules/audio-thread-realtime-safe.md': '# x\n', '.claude/hooks/x.py': '# x\n' }));
  assert.doesNotMatch(said, packLine('reverse-engineering'));
  assert.doesNotMatch(said, packLine('python'));
});

for (const [why, files] of [
  ['firmware findings in its research', { 'docs/research.md': '# Research\n\nThe table is at 0x6A3B4 [FW].\n' }],
  ['a disassembler in its tools', { 'tools/re/x86dis.py': '# x\n' }],
  ['notes named for a machine', { 'docs/lexicon-pcm81-re.md': '# x\n' }],
]) {
  test(`a reverse-engineering project is known by ${why}`, () => {
    assert.match(suggested(project({ ...SYNTH, ...files })), packLine('reverse-engineering'));
  });
}

test('MIDI is known by what the code does, not only by a file name', () => {
  const dir = project({ ...SYNTH, 'src/Engine.cpp': 'if (m.isNoteOn()) start (m);\n' });
  assert.match(suggested(dir), packLine('midi'));
  assert.doesNotMatch(suggested(project(SYNTH)), packLine('midi'));
});

test('a project that names its configuration is read as that', () => {
  const dir = project({ 'lib/app.cpp': '// x\n', '.claude/layout.json': JSON.stringify({ configuration: 'synth-creator' }) });
  assert.match(suggested(dir), /configuration: synth-creator \(named in its layout\.json\)/);
});

test('a long identifier is no secret, and a real key still is', () => {
  const found = (text) => SECRETS.some(([, re]) => { re.lastIndex = 0; return re.test(text); });
  const control = (...parts) => parts.join('_');
  for (const name of [control('cap', 'Filter', 'Env', 'Attack', '2', 'Lower', 'Panel'), control('knob', 'Osc1', 'Fine', 'Tune', 'Upper', 'Row', '3')]) assert.equal(found(`"name": "${name}"`), false, name);
  const key = ['whsec', 'aB3dE6gH9jK2mN5pQ8sT1vW4yZ7cF0'].join('_');
  assert.equal(found(`const k = "${key}";`), true);
  assert.doesNotMatch(maskSecrets(`const k = "${key}";`), new RegExp(key));
});

test('a build folder is known by what the build leaves, and scan neither reads it nor hides it', () => {
  const files = ['src/a.cpp', 'build-reso/CMakeCache.txt', 'build-reso/CMakeFiles/x.make', 'build-reso/sub/CMakeFiles/y.make', 'build-reso/juce/BinaryData1.cpp', 'tools/CMakeLists.txt'];
  assert.deepEqual(buildFolders(files), ['build-reso/']);
  const table = `const int t[] = {${Array.from({ length: 40 }, (_, i) => i).join(', ')}};\n`;
  const dir = project({ 'src/a.cpp': 'int a;\n', 'build-reso/CMakeCache.txt': 'x\n', 'build-reso/gen/data.cpp': table, 'tools/re/x.py': '# x\n' });
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['add', '-f', '.'], { cwd: dir });
  const said = cli(dir, 'scan');
  assert.equal(said.status, 0, said.stderr);
  const text = readFileSync(said.stdout.match(/Report: (\S+)/)[1], 'utf8');
  assert.match(text, /build output held in git: build-reso\/ \(2 of 4 files\)/);
  assert.doesNotMatch(text, /no-rom-table-literal/);
});

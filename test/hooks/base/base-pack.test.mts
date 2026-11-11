// What base and the kit's reading of a project hold, with no hook of their own: what `suggest` and `scan` find in a project (0.25.0,
// 0.32.0: six real repos read wrongly), the packs `init --auto` then installs, and the rules and skills every install carries.
// The hooks' own refusals are in the file of each hook.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { buildFolders } from '../../../lib/repo-weight.mts';
import { lockOf } from '../../fixtures/installs.mts';
import { KIT, cli, git, projectWith } from '../../kit-cli.mts';
import { extraFixture, fixture } from '../hook-rig.mts';

const project = (files: Readonly<Record<string, string>>): string => projectWith(files);
const suggested = (dir: string): string => cli(dir, 'suggest').stdout;
const packLine = (pack: string): RegExp => new RegExp(`^ +${pack} `, 'm');
const SYNTH = { 'src/PluginProcessor.cpp': 'void P::processBlock () {}\n', 'src/PluginEditor.cpp': '// x\n' };

test('suggest reads the project and init --auto installs exactly that', () => {
  const dir = projectWith({ 'src/a.py': 'print(1)\n', 'src/b.py': 'print(2)\n', 'src/run.sh': '#!/usr/bin/env bash\nset -euo pipefail\n', 'Dockerfile': 'FROM x\n' }, 'auto-');
  const said = cli(dir, 'suggest');
  assert.equal(said.status, 0, said.stderr);
  assert.match(said.stdout, /configuration: python/);
  assert.match(said.stdout, /python +Python source: src\/a\.py/);
  assert.match(said.stdout, /shell +shell script: src\/run\.sh/);
  assert.match(said.stdout, /docker +file: Dockerfile/);
  assert.ok(!existsSync(join(dir, '.claude')), 'suggest writes nothing');
  const r = cli(dir, 'init', '--auto');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const packs = lockOf(dir).packs ?? [];
  for (const p of ['python', 'shell', 'docker']) assert.ok(packs.includes(p), p);
  assert.ok(!packs.includes('mongo'));
});

test('the kit\'s own files in a project are no evidence about it', () => {
  const said = suggested(project({ ...SYNTH, '.claude/rules/audio-thread-realtime-safe.md': '# x\n', '.claude/hooks/x.py': '# x\n' }));
  assert.doesNotMatch(said, packLine('reverse-engineering'));
  assert.doesNotMatch(said, packLine('python'));
});

const RE_EVIDENCE: ReadonlyArray<readonly [why: string, files: Readonly<Record<string, string>>]> = [
  ['firmware findings in its research', { 'docs/research.md': '# Research\n\nThe table is at 0x6A3B4 [FW].\n' }],
  ['a disassembler in its tools', { 'tools/re/x86dis.py': '# x\n' }],
  ['notes named for a machine', { 'docs/lexicon-pcm81-re.md': '# x\n' }],
];
for (const [why, files] of RE_EVIDENCE) {
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

test('a build folder is known by what the build leaves, and scan neither reads it nor hides it', () => {
  const files = ['src/a.cpp', 'build-reso/CMakeCache.txt', 'build-reso/CMakeFiles/x.make', 'build-reso/sub/CMakeFiles/y.make', 'build-reso/juce/BinaryData1.cpp', 'tools/CMakeLists.txt'];
  assert.deepEqual(buildFolders(files), ['build-reso/']);
  const table = `const int t[] = {${Array.from({ length: 40 }, (_, i) => i).join(', ')}};\n`;
  const dir = project({ 'src/a.cpp': 'int a;\n', 'build-reso/CMakeCache.txt': 'x\n', 'build-reso/gen/data.cpp': table, 'tools/re/x.py': '# x\n' });
  git(dir, 'init', '-q');
  git(dir, 'add', '-f', '.');
  const said = cli(dir, 'scan');
  assert.equal(said.status, 0, said.stderr);
  const report = /Report: (\S+)/.exec(said.stdout)?.[1];
  assert.ok(report, said.stdout);
  const text = readFileSync(report, 'utf8');
  assert.match(text, /build output held in git: build-reso\/ \(2 of 4 files\)/);
  assert.doesNotMatch(text, /no-rom-table-literal/);
});

test('a new reverse-engineering project with no code yet gets the pack, from its notes alone', () => {
  const dir = project({ 'docs/research.md': '# Research\n\nThe reset vector is at 0x0000 [FW].\n' });
  assert.match(suggested(dir), packLine('reverse-engineering'));
  assert.equal(cli(dir, 'init', '--auto').status, 0);
  assert.ok(existsSync(join(dir, '.claude/skills/names-first/SKILL.md')));
  assert.ok(existsSync(join(dir, '.claude/tools/names-sweep.mjs')));
});

test('installed dependencies are no evidence about a project, even before it has a .gitignore', () => {
  const dir = project({ 'docs/research.md': '# Research\n\nThe reset vector is at 0x0000 [FW].\n', 'node_modules/kit/bin/x.mjs': '// x\n', 'node_modules/kit/hooks/h.mjs': '// x\n', 'node_modules/kit/a.py': '# x\n' });
  git(dir, 'init', '-q');
  const said = suggested(dir);
  assert.doesNotMatch(said, /node_modules/);
  assert.doesNotMatch(said, /configuration: node/);
  assert.match(said, packLine('reverse-engineering'));
});

test('full-stack is a composition: the stack choice is its own pack, and the rest is packs any project can take', () => {
  const dir = extraFixture('http-api-zod-node', ['http-api', 'zod', '--config', 'node']);
  for (const f of ['rules/routes-are-thin.md', 'rules/one-error-contract.md', 'rules/apis-are-versioned.md', 'rules/zod-4-schemas.md', 'hooks/schemas-only.mjs']) assert.ok(existsSync(join(dir, '.claude', f)), f);
  assert.ok(!existsSync(join(dir, '.claude/hooks/stack-guard.mjs')), 'the stack choice stays with full-stack');
  const stack = fixture('full-stack');
  for (const f of ['hooks/stack-guard.mjs', 'hooks/schemas-only.mjs', 'rules/tests-use-inject.md', 'rules/dockerfile-multistage.md', 'rules/pointer-feedback.md', 'rules/three-layers.md']) assert.ok(existsSync(join(stack, '.claude', f)), f);
});

test('finished work lands: the rule and the skill come with git-guard, in every install', () => {
  const dir = fixture('base');
  assert.match(readFileSync(join(dir, '.claude/rules/finished-work-lands.md'), 'utf8'), /merged into the trunk and pushed/);
  assert.match(readFileSync(join(dir, '.claude/skills/land-branch/SKILL.md'), 'utf8'), /^---\nname: land-branch\ndescription: Use when /);
  assert.equal(cli(dir, 'doctor', '--strict').status, 0);
});

test('a PDF is read with its pictures: figures exported, every page rendered, never a placeholder', () => {
  const skill = readFileSync(join(KIT, 'packs/base/skills/pdf-to-md/SKILL.md'), 'utf8');
  assert.ok(skill.length < 8000);
  assert.match(skill, /^description: Use when/m);
  for (const law of [/--image-export-mode referenced/, /Render every page to an image/, /Never do:[\s\S]*--image-export-mode placeholder/, /Count `<!-- image -->`/]) assert.match(skill, law);
});

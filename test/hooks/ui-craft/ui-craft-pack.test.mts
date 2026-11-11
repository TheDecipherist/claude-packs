// The ui-craft pack's install, with no hook of its own (0.17.0, 0.22.0): the presets bring it, every check names a rule that is there,
// one template is tested once, and the laws the sources agreed on are in the rules and skills. The pack's checks:
// lesson-checks.test.mts; its doctor gate: ui-craft-gate.test.mts; the page-measure tool: page-measure.test.mts.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { toJson } from '../../../packs/base/hooks/lib/json.mts';
import { KIT, cli } from '../../kit-cli.mts';
import { fixture } from '../hook-rig.mts';
import { uiChecks } from './checks.mts';

const readPack = (rel: string): string => readFileSync(join(KIT, 'packs', rel), 'utf8');

test('the UI presets and full-stack bring the pack; every check names a rule that is there, and every rule names checks that are', () => {
  const dir = fixture('next-app');
  assert.ok(existsSync(join(dir, '.claude/rules/no-generated-look.md')));
  const checks = uiChecks();
  for (const c of checks) assert.ok(existsSync(join(KIT, 'packs/ui-craft', c.rule.replace('.claude/', ''))), c.id);
  for (const r of readdirSync(join(KIT, 'packs/ui-craft/rules'))) {
    for (const [, id] of readPack(`ui-craft/rules/${r}`).matchAll(/`(ui-[a-z-]+)`/g)) assert.ok(checks.some((c) => c.id === id), `${r} names ${id}`);
  }
});

test('one template: a thousand instances cost one read and a handful of swaps, not half a million', () => {
  const dir = fixture('base');
  put(join(dir, 'design/shape.json'), toJson({ concepts: { control: { shape: 'many', count: 1000, generator: 'controlId(i)', symmetry: { members: 'echo same', swap: 'true' } } }, exclude: [] }));
  const r = cli(dir, 'symmetry', 'run', 'control');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const n = Number(/swap: (\d+) pairs checked \(a spread of N = 1000\)/.exec(r.stdout)?.[1]);
  assert.ok(n > 0 && n < 20, `${n} swaps`);
});

test('no law still asks to walk every instance: one per template, the rest by a read', () => {
  for (const rel of ['audio-core/rules/house-control-behaviours.md', 'audio-core/skills/prove-control/SKILL.md', 'gpu-painter/skills/painter-hover-state/SKILL.md', 'ui-craft/skills/hover-state/SKILL.md']) {
    assert.match(readPack(rel), /one (?:control|item|element) of (?:this|each) (?:template|component)/, rel);
    assert.doesNotMatch(readPack(rel), /walk every control|for every interactive element|on every slot it appears/, rel);
  }
});

test('an on-screen keyboard lights what sounds and has KB OCT, a kind is one size, and a window test stays off the desktop', () => {
  const house = readPack('audio-core/rules/house-control-behaviours.md');
  for (const law of [/whatever played it: MIDI, QWERTY/, /KB OCT header above the keyboard/, /reading 0, -12, \+12/, /never MIDI or a host's notes/, /Size every control of a kind the same/, /narrower than the tightest row/, /DOUBLE and TRIPLE beside KB OCT/, /a whole voice an octave up/, /a whole voice an octave down/, /note-off stops every voice its key started/]) assert.match(house, law);
  assert.match(readPack('audio-core/rules/a-control-is-proved-through-its-input.md'), /xvfb-run -a/);
});

test('scan names elements built by hand more than once, html and c++', () => {
  const dir = scratchDir('uid-scan-');
  const card = (t: string): string => `<div class="card"><h3 class="t">${t}</h3><p>${t}</p><a href="/">more</a></div>\n`;
  const knob = (n: string): string => `  ${n}.setRange (0.0, 1.0);\n  ${n}.setValue (0.5);\n  ${n}.setStyle (Rotary);\n`;
  mkdirSync(join(dir, 'src'));
  put(join(dir, 'src/a.html'), card('A'));
  put(join(dir, 'src/b.html'), card('B'));
  put(join(dir, 'src/c.cpp'), `void f() {\n${knob('cutoff')}\n  int gap;\n${knob('drive')}}\n`);
  const r = cli(dir, 'scan');
  const report = /Report: (\S+)/.exec(r.stdout)?.[1];
  assert.ok(report, r.stdout + r.stderr);
  const text = readFileSync(report, 'utf8');
  assert.match(text, /2 repeat\(s\) written by hand/);
  assert.match(text, /2x <div>: src\/a\.html:1, src\/b\.html:1\. Make it one component/);
  assert.match(text, /2x cutoff: src\/c\.cpp:2, src\/c\.cpp:7\. Make it one factory/);
});

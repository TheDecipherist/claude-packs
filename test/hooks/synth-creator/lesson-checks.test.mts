// The synth-creator configuration's checks, fired through the base lesson-checks hook (0.32.0, 1.5.0): a unit cannot write a second clock,
// and a project that draws in code cannot add an image. The configuration's rules and skills: synth-creator-pack.test.mts.
import assert from 'node:assert/strict';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { put } from '../../../packs/base/hooks/lib/files.mts';
import { lockOf, withLayout } from '../../fixtures/installs.mts';
import { cli } from '../../kit-cli.mts';
import { fixture } from '../hook-rig.mts';
import { lintWrite } from '../lesson-cases.mts';

test('a unit cannot write a second clock, and a project that draws in code cannot add an image', () => {
  const dir = fixture('synth-creator');
  const write = (content: string): number | null => lintWrite(dir, 'src/Processor.cpp', content).status;
  assert.equal(write('const auto pos = getPlayHead()->getPosition();\n'), 2);
  assert.equal(write('if (m.isMidiClock()) ++pulses;\n'), 2);
  assert.equal(write('if (b == 0xF8) ++pulses;\n'), 0, 'a raw byte compare is the midi pack\'s own correct form: this law is about a second clock, not a byte');
  assert.equal(write('host.readTransport (getPlayHead(), midi, n);\n'), 0);
  const image = 'g.drawImageAt (knob, 0, 0);\n';
  assert.equal(write(image), 2, 'on in a new synth-creator install (1.5.0)');
  assert.equal(write('g.fillEllipse (bounds);\n'), 0);
  // a project installed before 1.5.0 never had it: update holds it back, and only "enable" switches it on
  const lock = lockOf(dir);
  delete lock.files?.['.claude/checks/ui-drawn-in-code.json'];
  put(join(dir, '.claude/claude-packs.lock.json'), `${JSON.stringify(lock, null, 2)}\n`);
  rmSync(join(dir, '.claude/checks/ui-drawn-in-code.json'));
  assert.equal(cli(dir, 'update').status, 0);
  assert.equal(write(image), 0, 'held back in a project that had the configuration already');
  withLayout(dir, { enable: ['checks/ui-drawn-in-code.json'] });
  assert.equal(cli(dir, 'update').status, 0);
  assert.equal(write(image), 2);
  assert.equal(write('g.fillEllipse (bounds);\n'), 0);
});

test('a UI is drawn straight on and aligned, and the image skill separates the object from the photograph', () => {
  const dir = fixture('synth-creator');
  const rule = readFileSync(join(dir, '.claude/rules/straight-on-and-aligned.md'), 'utf8');
  assert.match(rule, /^paths:/m, 'it loads on UI code, not at every launch');
  assert.match(rule, /src\/app/);
  assert.match(rule, /whatever looks grouped as a group/);
  const skill = readFileSync(join(dir, '.claude/skills/analyse-reference-look/SKILL.md'), 'utf8');
  assert.match(skill, /separate the object from the photograph/);
  assert.match(skill, /find the grid/);
});

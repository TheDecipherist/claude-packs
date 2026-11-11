// The midi pack's install and the synth-rebuild preset, with no hook of its own (0.28.0): the clock's law travels with its skill, and the
// preset takes all four packs, which `suggest` finds from a project. The pack's checks: lesson-checks.test.mts.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { KIT, cli, projectWith } from '../../kit-cli.mts';

test('the full law of the clock travels with its skill, in neutral words', () => {
  const law = readFileSync(join(KIT, 'packs/midi/skills/clock-probe/clock-law.md'), 'utf8');
  assert.match(law, /There is no tempo message/);
  assert.match(law, /Never write the resolved tempo back/);
  assert.doesNotMatch(law, /ShellHost|synthshell/);
});

test('the synth-rebuild preset takes all four, and suggest finds them from a project', () => {
  const dir = scratchDir('ap-preset-');
  cli(dir, 'init', 'synth-rebuild');   // the preset is what is installed here; a synth's doctor also asks for design/shape.json, which is not this test's
  for (const f of ['rules/two-sources-before-naming.md', 'rules/sysex-is-a-record.md', 'rules/neutral-is-exact.md', 'rules/session-blob-append-only.md', 'skills/clock-probe/clock-law.md']) assert.ok(existsSync(join(dir, '.claude', f)), f);
  const app = projectWith(Object.fromEntries(['src/Voice.cpp', 'src/PluginEditor.cpp', 'src/SysexIO.cpp', 'src/PluginProcessor.cpp'].map((f) => [f, '// x\n'])), 'ap-suggest-');
  const said = cli(app, 'suggest').stdout;
  for (const p of ['midi', 'sound-design', 'instrument-shell']) assert.match(said, new RegExp(`^ +${p} `, 'm'), p);
});

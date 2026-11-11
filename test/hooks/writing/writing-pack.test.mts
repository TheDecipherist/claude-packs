// The writing pack's install, with no hook of its own (0.15.0): every configuration brings it, each skill has one job and fits, and the
// measured data came across. The pack's checks: lesson-checks.test.mts.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { KIT, cli } from '../../kit-cli.mts';
import { extraFixture, fixture } from '../hook-rig.mts';

const skills = readdirSync(join(KIT, 'packs/writing/skills'));
const readSkill = (s: string): string => readFileSync(join(KIT, 'packs/writing/skills', s, 'SKILL.md'), 'utf8');

// The run's install of each configuration (the fixtures name most; the rest are built once under their own name).
const INSTALLS: Readonly<Record<string, () => string>> = {
  'base': () => fixture('base'),
  'cpp': () => fixture('cpp'),
  'full-stack': () => fixture('full-stack'),
  'go': () => fixture('go+multi-tenant'),
  'node': () => extraFixture('node', ['--config', 'node']),
  'python': () => fixture('python+shell'),
  'rust': () => fixture('rust'),
  'synth-creator': () => fixture('synth-creator'),
};

test('every configuration brings the pack; nothing of it is named in the lock, and doctor --strict passes', () => {
  const configurations = readdirSync(join(KIT, 'configurations'));
  assert.deepEqual([...configurations].sort(), Object.keys(INSTALLS).sort(), 'a configuration with no install here');
  for (const config of configurations) {
    const dir = INSTALLS[config]?.() ?? '';
    assert.ok(readFileSync(join(dir, '.claude/rules/cut-the-padding.md'), 'utf8').includes('README*'), config);
    assert.equal(cli(dir, 'doctor', '--strict').status, 0, config);
  }
});

test('each skill has one job and fits: Use when, under 8,000 characters', () => {
  assert.ok(skills.length >= 10);
  for (const s of skills) {
    const text = readSkill(s);
    assert.match(text, /^---\nname: [\w-]+\ndescription: Use when /, s);
    assert.ok(text.length < 8000, `${s}: ${text.length}`);
  }
});

test('the measured data came across: the sub table, the templates and the registers', () => {
  assert.match(readSkill('pick-subreddit'), /\| ExperiencedDevs \| watercooler \| 71 \| 69 \| 2 \|/);
  assert.match(readSkill('reddit-post'), /\*\*E\. Argument post/);
  assert.match(readSkill('post-voice'), /Narrates in the order it happened/);
  assert.match(readSkill('reply-moves'), /Hooks are the only thing that can cover you/);
});

// The writing pack's skills, with no hook of its own (0.15.0): each skill has one job and fits, and the measured data came across. The
// pack in every configuration: writing-configurations.test.mts. The pack's checks: lesson-checks.test.mts.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { KIT } from '../../kit-cli.mts';

const skills = readdirSync(join(KIT, 'packs/writing/skills'));
const readSkill = (s: string): string => readFileSync(join(KIT, 'packs/writing/skills', s, 'SKILL.md'), 'utf8');

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

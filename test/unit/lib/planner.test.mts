// lib/planner.mts: the project-layout skill per configuration, the claude.ai skill bundles, and the trigger-word match.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { CLAUDE_AI_SKILLS, claudeAiSkillFiles, contentWords, plannerSkill, plannerSkills, skillFor, writeClaudeAiZips } from '../../../lib/planner.mts';

test('contentWords folds plurals and leaves out the filler; skillFor needs two shared words and a clear winner', () => {
  assert.deepEqual([...contentWords('The synths are built')].sort(), ['build', 'synth']);
  const descriptions = { a: 'Use when planning a synth build', b: 'Use when writing a reddit post' };
  assert.equal(skillFor('I want to build a synth', descriptions), 'a');
  assert.equal(skillFor('write a reddit post', descriptions), 'b');
  assert.equal(skillFor('hello there', descriptions), null, 'no description is close');
  assert.equal(skillFor('plan a synth', { x: 'plan synth', y: 'plan synth' }), null, 'a tie is a misfire');
  assert.equal(skillFor('anything at all', {}), null, 'no skills at all is a misfire, not a crash');
});

test('plannerSkill: a configuration\'s layout skill has its folders, its packs and its house rules, and starts "Use when"', () => {
  const body = plannerSkill('base');
  assert.match(body, /^---\nname: project-layout\ndescription: Use when planning/);
  for (const part of ['# Project layout: base', '## Folders', '## What it installs', '## House rules', '<constraints>', 'Never do:']) assert.ok(body.includes(part), part);
  assert.throws(() => plannerSkill('nonesuch'), /unknown configuration/);
});

test('claudeAiSkillFiles: a skill folder keyed by skill, the work order templates riding with workorder-writer with their fill-ins left', () => {
  for (const name of Object.keys(CLAUDE_AI_SKILLS)) assert.ok(claudeAiSkillFiles(name)[`${name}/SKILL.md`], `${name} has a SKILL.md`);
  const writer = Object.keys(claudeAiSkillFiles('workorder-writer'));
  assert.ok(writer.some((f) => f.startsWith('workorder-writer/templates/')));
  assert.ok(!Object.values(claudeAiSkillFiles('workorder-writer')).some((t) => t.includes('{{name}}')));
  assert.throws(() => claudeAiSkillFiles('nonesuch'), /unknown claude\.ai skill/);
});

test('writeClaudeAiZips writes one zip per named skill; plannerSkills writes one SKILL.md per configuration', () => {
  const out = scratchDir('planner-');
  const said: string[] = [];
  assert.equal(writeClaudeAiZips(join(out, 'zips'), ['ui-mockup'], (l) => said.push(l)), 0);
  assert.ok(existsSync(join(out, 'zips', 'ui-mockup.zip')));
  assert.equal(said.length, 2);
  plannerSkills(join(out, 'skills'), () => undefined);
  assert.ok(existsSync(join(out, 'skills', 'base', 'project-layout', 'SKILL.md')));
});

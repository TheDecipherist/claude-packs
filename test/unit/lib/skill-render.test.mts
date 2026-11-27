// skill-render: "skillInvocation": "user" installs every skill user-invocable only; "modelSkills" names the ones the model may load
// itself, installed as shipped. supernova2_monitor, 2026-11-27: the user decided the supervisor draws the edit layer itself
// (HANDOFF {#ui-by-the-supervisor}), but skill-first refuses a reference picture until analyse-reference-look is loaded, and the
// supervisor could never load it (KWB-253).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderSkill } from '../../../lib/skill-render.mts';

const skill = (name: string): string => `---\nname: ${name}\ndescription: Use when x.\n---\n\n# body\n`;

test('a skill the layout names in modelSkills installs as shipped; the others stay user-invocable only (KWB-253)', () => {
  const layout = { skillInvocation: 'user' as const, modelSkills: ['analyse-reference-look'] };
  assert.equal(renderSkill(skill('analyse-reference-look'), layout), null, 'named: installed as the pack ships it');
  assert.match(renderSkill(skill('chip-search'), layout) ?? '', /\ndisable-model-invocation: true\nuser-invocable: true\n---\n/);
});

test('with no modelSkills every skill is user-invocable only, as before', () => {
  assert.match(renderSkill(skill('analyse-reference-look'), { skillInvocation: 'user' }) ?? '', /disable-model-invocation: true/);
});

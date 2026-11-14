// workorder compile (the user, 2026-11-14): one task of an order, its skills' Always do and Never do lines compiled into ONE
// <constraints> block after the task's text, so nothing has to be invoked; and the skillInvocation key that installs every skill
// user-invocable only.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { readText } from '../../../packs/base/hooks/lib/files.mts';
import { compileTask, stepSkills, taskText } from '../../../lib/workorder-compile.mts';
import { renderSkill } from '../../../lib/skill-render.mts';

const skill = (name: string, always: string, never: string): string =>
  `---\nname: ${name}\ndescription: Use when x.\n---\n\n# ${name}\n\n## 2. The ${name} procedure\n\nThe ${name} body text.\n\n<constraints>\nAlways do:\n1. ${always}\n   a continuation line\n\nNever do:\n- ${never}\n</constraints>\n`;
const ORDER = '# Work order: demo\n\nIntro.\n\n<constraints>\nAlways do:\n- the order\'s own always\n\nNever do:\n- the order\'s own never\n</constraints>\n\n---\n\n'
  + '## W0. Set up\n\n**Skills:** `one`, `two`.\n\n1. first item\n2. second item, the one we take\n   with its second line\n\n**Done when:** measured.\n\n## W1. Next\n\n**Skills:** `missing`.\n\n1. x\n\n**Done when:** y.\n';

function project(): string {
  const dir = scratchDir('compile-');
  put(join(dir, 'docs/workorders/demo/workorder.md'), ORDER);
  put(join(dir, '.claude/skills/one/SKILL.md'), skill('one', 'one always', 'one never'));
  put(join(dir, '.claude/skills/two/SKILL.md'), skill('two', 'two always, see `two-side.md` and `three/far.md`', 'two never'));
  put(join(dir, '.claude/skills/two/two-side.md'), '# two side\n\nThe two side file.\n');
  put(join(dir, '.claude/skills/three/SKILL.md'), skill('three', 'three always', 'three never'));
  put(join(dir, '.claude/skills/three/far.md'), 'The far file of three.\n');
  put(join(dir, '.claude/skills/three/unnamed.md'), 'Never named.\n');
  return dir;
}

test('a task is its step\'s lead, the one item and the Done when; the skills come from its Skills line', () => {
  const t = taskText(ORDER, 'W0.2');
  assert.match(t, /^## W0\. Set up/);
  assert.match(t, /2\. second item, the one we take\n {3}with its second line/);
  assert.doesNotMatch(t, /first item/);
  assert.match(t, /\*\*Done when:\*\* measured\./);
  assert.deepEqual(stepSkills(t), ['one', 'two']);
  assert.match(taskText(ORDER, 'W0'), /first item[\s\S]*second item/, 'a step with no item number is the whole step');
});

test('the prompt is the task first, then ONE constraints block with the order\'s and every skill\'s lines; the compile is logged', () => {
  const dir = project();
  const { prompt, skills } = compileTask(dir, 'demo', 'W0.2');
  assert.deepEqual(skills, ['one', 'two']);
  assert.equal((prompt.match(/<constraints>/g) ?? []).length, 1);
  assert.ok(prompt.indexOf('second item') < prompt.indexOf('<constraints>'));
  const block = prompt.slice(prompt.indexOf('<constraints>'));
  assert.ok(block.split('Never do:')[0]?.includes("the order's own always"));
  assert.ok(block.split('Never do:')[1]?.includes("the order's own never"));
  for (const line of ['one always', 'two always', 'a continuation line', 'one never', 'two never']) assert.ok(block.includes(line), line);
  assert.ok(block.indexOf('## The skill `one`') < block.indexOf('## The skill `two`'), 'the skills in the order of the Skills line');
  assert.match(readText(join(dir, '.claude/logs/compiled.jsonl')) ?? '', /"task":"W0\.2","skills":\["one","two"\]/);
});

test('each skill comes in WHOLE: its body outside the constraints, its side files, and a side file of another skill it names (no pointer left dangling)', () => {
  const { prompt } = compileTask(project(), 'demo', 'W0.2');
  for (const text of ['The one body text.', '## 2. The two procedure', 'The two side file.', 'The far file of three.']) assert.ok(prompt.includes(text), text);
  assert.doesNotMatch(prompt, /Never named\.|three always/, 'a skill not on the line comes in only as far as it is named');
  assert.doesNotMatch(prompt, /^name: one$/m, 'no frontmatter');
  assert.equal((prompt.match(/<constraints>/g) ?? []).length, 1, 'one block');
  assert.equal((prompt.match(/<\/constraints>/g) ?? []).length, 1);
});

test('a skill the step names that is not installed stops the compile, naming it', () => {
  assert.throws(() => compileTask(project(), 'demo', 'W1.1'), /`missing`/);
  assert.throws(() => compileTask(project(), 'demo', 'W9'), /no step W9/);
});

test('skillInvocation user installs a skill with both keys set, once; without it the skill is as shipped', () => {
  const src = skill('one', 'a', 'b');
  const out = renderSkill(src, { skillInvocation: 'user' }) ?? '';
  assert.match(out, /^---\nname: one\ndescription: Use when x\.\ndisable-model-invocation: true\nuser-invocable: true\n---\n/);
  assert.equal(renderSkill(out, { skillInvocation: 'user' }), out, 'rendering twice changes nothing');
  assert.equal(renderSkill(src, {}), null);
});

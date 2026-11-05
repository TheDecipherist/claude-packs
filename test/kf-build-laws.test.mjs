// 1.1.0, group 4: what the MPX 500 build taught, as laws. A control is proved through its own input path, and a look gate checks geometry exactly. Each test was seen
// red first (docs/1.1-progress.md).
import { KIT, assert, cli, fresh, join, readFileSync, test } from './kit-cli.mjs';
import { namesATest } from '../lib/rule-tests.mjs';

const pack = (rel) => readFileSync(join(KIT, 'packs', rel), 'utf8');
const RULE = 'audio-core/rules/a-control-is-proved-through-its-input.md';

test('the rule: a gate that writes the parameter proves nothing about the control', () => {
  const text = pack(RULE);
  assert.match(text, /through its own input path/);
  assert.match(text, /writes the parameter/);
  assert.match(text, /five real bugs/);
  assert.match(text, /planted/);
  assert.equal(namesATest(text), true, 'its Check names a test, so doctor asks for it');
});

test('the rule installs with audio-core and loads on UI code', () => {
  const dir = fresh('kfl-');
  assert.equal(cli(dir, 'init', 'audio-core').status, 0);
  const text = readFileSync(join(dir, '.claude/rules/a-control-is-proved-through-its-input.md'), 'utf8');
  assert.match(text, /^paths:/m);
  assert.match(text, /src\/app/);
});

test('prove-control starts from the input path, and goes red with the hook taken out', () => {
  const text = pack('audio-core/skills/prove-control/SKILL.md');
  assert.match(text, /a-control-is-proved-through-its-input/);
  assert.match(text, /real input path/);
  assert.match(text, /compiled out/);
  assert.ok(text.indexOf('real input path') < text.indexOf('**Host:**'), 'before the surfaces it does not prove');
});

const LOOK = 'audio-core/skills/analyse-reference-look/SKILL.md';
for (const [what, words] of [
  ['a control and a confidence per measure', /a control and a confidence/i],
  ['seed boxes for a dark part on a dark panel', /seed box/i],
  ['rectify against a known anchor', /known anchor/i],
  ['how to rank sources that disagree', /sources disagree/i],
  ['typeface as a scored choice', /scored choice/i],
  ['planted faults diffed against the unplanted result', /unplanted result/i],
  ['the render measured by the code that measured the target', /same code/i],
  ['geometry exact, and a whole-picture score never a pass', /never a pass/i],
]) test(`analyse-reference-look asks for ${what}`, () => assert.match(pack(LOOK), words));

test('the skill stays under the limit and names the rule as required reading', () => {
  const text = pack(LOOK);
  assert.ok(text.length < 8000, `${text.length} characters`);
  assert.match(text, /Read `straight-on-and-aligned` first/);
});

test('ui-matches-reference-look: a look gate checks geometry exactly, and a whole-picture score is never a pass', () => {
  const text = pack('audio-core/rules/ui-matches-reference-look.md');
  assert.match(text, /geometry exactly/);
  assert.match(text, /whole-picture score/);
  assert.match(text, /unplanted/);
});

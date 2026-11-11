// 1.1.0, group 4: what the MPX 500 build taught, as laws. A control is proved through its own input path, and a look gate checks
// geometry exactly. Each test was seen red first (docs/1.1-progress.md). No hook owns these: rules and skills of audio-core and base.
// They sat in kf-build-laws.test.mjs.
import { join } from 'node:path';
import { namesATest } from '../../../lib/rule-tests.mts';
import { KIT, assert, readFileSync, test } from '../../kit-cli.mts';
import { fixture } from '../hook-rig.mts';

const pack = (rel: string): string => readFileSync(join(KIT, 'packs', rel), 'utf8');
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
  const dir = fixture('audio-core');
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

const LOOK = 'base/skills/analyse-reference-look/SKILL.md';   // 1.4.0 (admiral-fleet W4): moved from audio-core, for any page drawn from a picture
const LOOK_ASKS: readonly (readonly [what: string, words: RegExp])[] = [
  ['depth: each element\'s shadow, bevel and edge light, measured against the reference', /\*\*shadow:\*\*[\s\S]*\*\*bevel:\*\*[\s\S]*\*\*edge light:\*\*/],
  ['a control and a confidence per measure', /a control and a confidence/i],
  ['seed boxes for a dark part on a dark panel', /seed box/i],
  ['rectify against a known anchor', /known anchor/i],
  ['how to rank sources that disagree', /sources disagree/i],
  ['typeface as a scored choice', /scored choice/i],
  ['planted faults diffed against the unplanted result', /unplanted result/i],
  ['the render measured by the code that measured the target', /same code/i],
  ['geometry exact, and a whole-picture score never a pass', /never a pass/i],
];
for (const [what, words] of LOOK_ASKS) test(`analyse-reference-look asks for ${what}`, () => assert.match(pack(LOOK), words));

test('the skill stays under the limit and names the rule as required reading where the project has it (admiral-fleet d-1)', () => {
  const text = pack(LOOK);
  assert.ok(text.length < 8000, `${text.length} characters`);
  assert.match(text, /Where the project has the rule `straight-on-and-aligned`[^.]*, read it first/);
});

test('ui-matches-reference-look: a look gate checks geometry exactly, and a whole-picture score is never a pass', () => {
  const text = pack('base/rules/page-matches-reference-look.md');   // W7 (a): folded into the page rule, in base
  assert.match(text, /geometry exactly/);
  assert.match(text, /whole-picture score/);
  assert.match(text, /unplanted/);
});

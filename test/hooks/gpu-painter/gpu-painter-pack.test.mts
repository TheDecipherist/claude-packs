// 0.10.1 (the kit half of Stellix B-261): every element the pointer can act on has a cursor naming its interaction and a small visible
// effect on the hovered thing itself. The law is a rule (gpu-painter for synths, full-stack for the web app), the how is the skill
// hover-state, and doctor goes red when a project has UI code and declares no hover gate (layout.json "gates": {"hover": "<command>"}).
// No hook owns these: rules, a skill, doctor and the profile. They sat in hover.test.mjs. (What doctor says: gpu-painter-pack-hover and
// gpu-painter-pack-declined, split so no file sums over a minute.)
import { join } from 'node:path';
import { readJson } from '../../../packs/base/hooks/lib/json.mts';
import { withLayout } from '../../fixtures/installs.mts';
import { KIT, assert, cli, existsSync, profile, readFileSync, test } from '../../kit-cli.mts';
import { fixture } from '../hook-rig.mts';
import { synthInstall, synthWithUi } from './gpu-painter-rig.mts';

test('gpu-painter and ui-craft carry the hover rule, scoped to UI code, naming the cursor, the effect and the one hit test', () => {
  for (const [pack, rule] of [['gpu-painter', 'hover-every-pressable.md'], ['ui-craft', 'pointer-feedback.md']]) {
    const text = readFileSync(join(KIT, 'packs', pack ?? '', 'rules', rule ?? ''), 'utf8');
    assert.match(text, /# concepts: ui\b/, rule);
    assert.match(text, /cursor/i, rule);
    assert.match(text, /hit test/i, rule);
    assert.match(text, /disabled/i, rule);
    assert.match(text, /hover-state/, `${rule} names its skill`);
  }
});

test('the skill hover-state: "Use when", under 8,000 characters, names the hover walk and the worked example', () => {
  for (const pack of ['gpu-painter', 'ui-craft']) {
    const text = readFileSync(join(KIT, 'packs', pack, 'skills/hover-state/SKILL.md'), 'utf8');
    assert.match(text, /^---\nname: hover-state\ndescription: Use when /);
    assert.ok(text.length < 8000, `${pack}: ${text.length}`);
    assert.match(text, /hover walk/i);
  }
  assert.match(readFileSync(join(KIT, 'packs/gpu-painter/skills/hover-state/SKILL.md'), 'utf8'), /tools\/gates\/hover_gate\.sh[\s\S]*editor_hoverwalk_read\.h/);
});

test('an installed synth gets the rule and the skill; full-stack gets its rule loaded on the web app', () => {
  const synth = synthInstall();
  assert.ok(existsSync(join(synth, '.claude/rules/hover-every-pressable.md')));
  assert.ok(existsSync(join(synth, 'src/painter/.claude/skills/hover-state/SKILL.md')));
  const web = fixture('full-stack');
  assert.ok(existsSync(join(web, '.claude/rules/pointer-feedback.md')));
  assert.ok(existsSync(join(web, '.claude/skills/hover-state/SKILL.md')));
});

test('the Stellix profile declares its hover gate', () => {
  const p = readJson<{ gates?: { hover?: string } }>(profile('stellix'), {});
  assert.equal(p?.gates?.hover, 'bash tools/gates/hover_gate.sh');
});

test('layout.json "gates" is the project\'s own: an update keeps it', () => {
  const dir = synthWithUi();
  withLayout(dir, { gates: { hover: 'none: kept across an update' } });
  const r = cli(dir, 'update');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual(readJson<{ gates?: unknown }>(join(dir, '.claude/layout.json'), {})?.gates, { hover: 'none: kept across an update' });
});

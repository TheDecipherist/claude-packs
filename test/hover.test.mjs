// 0.10.1 (the kit half of Stellix B-261): every element the pointer can act on has a cursor naming its interaction and a
// small visible effect on the hovered thing itself. The law is a rule (gpu-painter for synths, full-stack for the web app), the how is the
// skill hover-state, and doctor goes red when a project has UI code and declares no hover gate (layout.json "gates": {"hover": "<command>"}).
import { KIT, assert, cli, execFileSync, existsSync, fresh, join, mkdirSync, readFileSync, test, writeFileSync } from './kit-cli.mjs';

const init = (args, prefix) => {
  const dir = fresh(prefix);
  execFileSync('git', ['init', '-q'], { cwd: dir });
  const r = cli(dir, 'init', ...args);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  return dir;
};
const layoutOf = (dir) => JSON.parse(readFileSync(join(dir, '.claude/layout.json'), 'utf8'));
const setLayout = (dir, patch) => writeFileSync(join(dir, '.claude/layout.json'), JSON.stringify({ ...layoutOf(dir), ...patch }, null, 2));
const synthWithUi = () => {
  const dir = init(['gpu-painter', '--config', 'synth-creator'], 'hov-synth-');
  mkdirSync(join(dir, 'src/ui'), { recursive: true });
  writeFileSync(join(dir, 'src/ui/Knob.cpp'), 'int knob() { return 1; }\n');
  return dir;
};

test('gpu-painter and ui-craft carry the hover rule, scoped to UI code, naming the cursor, the effect and the one hit test', () => {
  for (const [pack, rule] of [['gpu-painter', 'hover-every-pressable.md'], ['ui-craft', 'pointer-feedback.md']]) {
    const text = readFileSync(join(KIT, 'packs', pack, 'rules', rule), 'utf8');
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
  const synth = init(['gpu-painter', '--config', 'synth-creator'], 'hov-i1-');
  assert.ok(existsSync(join(synth, '.claude/rules/hover-every-pressable.md')));
  assert.ok(existsSync(join(synth, 'src/painter/.claude/skills/hover-state/SKILL.md')));
  const web = init(['--config', 'full-stack'], 'hov-i2-');
  assert.ok(existsSync(join(web, '.claude/rules/pointer-feedback.md')));
  assert.ok(existsSync(join(web, '.claude/skills/hover-state/SKILL.md')));
});

test('doctor: UI code and no hover gate is a PROBLEM; the gate named (and its file there) is OK; a fresh project with no UI code is not', () => {
  const dir = synthWithUi();
  const red = cli(dir, 'doctor');
  assert.equal(red.status, 1, red.stdout);
  assert.match(red.stdout, /PROBLEM: .*hover gate/);
  setLayout(dir, { gates: { hover: 'bash tools/gates/hover_gate.sh' } });
  const missing = cli(dir, 'doctor');
  assert.equal(missing.status, 1, 'the command names a file that is not there');
  assert.match(missing.stdout, /PROBLEM: .*tools\/gates\/hover_gate\.sh/);
  mkdirSync(join(dir, 'tools/gates'), { recursive: true });
  writeFileSync(join(dir, 'tools/gates/hover_gate.sh'), '#!/usr/bin/env bash\nexit 0\n');
  const green = cli(dir, 'doctor');
  assert.equal(green.status, 0, green.stdout);
  assert.doesNotMatch(green.stdout, /hover gate/);
  setLayout(dir, { gates: { hover: 'none: a library with no pointer' } });
  assert.equal(cli(dir, 'doctor').status, 0, 'an explicit decline with its reason');
  setLayout(dir, { gates: { hover: 'none:' } });
  assert.equal(cli(dir, 'doctor').status, 1, 'a decline with no reason is not one');
  const fresh1 = init(['gpu-painter', '--config', 'synth-creator'], 'hov-fresh-');
  assert.equal(cli(fresh1, 'doctor', '--strict').status, 0, 'no UI code yet');
});

test('doctor: the web app (packages/web) with a page and no hover gate is a PROBLEM too', () => {
  const dir = init(['--config', 'full-stack'], 'hov-web-');
  writeFileSync(join(dir, 'packages/web/app/page.tsx'), 'export default function P() { return null; }\n');
  const red = cli(dir, 'doctor');
  assert.equal(red.status, 1, red.stdout);
  assert.match(red.stdout, /PROBLEM: .*hover gate/);
});

test('doctor: a node web project with UI code and no hover gate is a PROBLEM too (ui-craft)', () => {
  const dir = init(['next-app'], 'hov-node-');
  mkdirSync(join(dir, 'src/ui'), { recursive: true });
  writeFileSync(join(dir, 'src/ui/Page.tsx'), 'export const Page = () => <main />;\n');
  const red = cli(dir, 'doctor');
  assert.equal(red.status, 1, red.stdout);
  assert.match(red.stdout, /PROBLEM: no hover gate declared/);
  assert.match(red.stdout, /hover-state skill/);
});

test('the Stellix profile declares its hover gate', () => {
  const p = JSON.parse(readFileSync(join(KIT, 'profiles/stellix.layout.json'), 'utf8'));
  assert.equal(p.gates?.hover, 'bash tools/gates/hover_gate.sh');
});

test('layout.json "gates" is the project\'s own: an update keeps it', () => {
  const dir = synthWithUi();
  setLayout(dir, { gates: { hover: 'none: kept across an update' } });
  const r = cli(dir, 'update');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual(layoutOf(dir).gates, { hover: 'none: kept across an update' });
});
